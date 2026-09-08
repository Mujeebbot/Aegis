"use strict";

/**
 * Price service.
 *
 * Resolution order per token, first success wins:
 *   1. Chainlink on-chain feed  (authoritative, matches what the lending
 *      protocol itself uses to decide liquidation, so HF here matches HF there)
 *   2. CoinGecko                (broad coverage, used when no feed is mapped)
 *   3. Stablecoin par fallback  (USDC/USDT/DAI -> $1, only if both above fail)
 *
 * Prices are cached with a short TTL and single-flighted, because one poll tick
 * asks for the same handful of tokens once per watched position.
 */

const { TtlCache } = require("../lib/cache");
const { requestJson } = require("../lib/http");
const { parseUnits, WAD } = require("../lib/units");
const { createChainlinkSource } = require("./chainlink");

/** CoinGecko ids for the assets these lending markets actually use. */
const COINGECKO_IDS = {
  ETH: "ethereum",
  WETH: "weth",
  WSTETH: "wrapped-steth",
  STETH: "staked-ether",
  CBETH: "coinbase-wrapped-staked-eth",
  RETH: "rocket-pool-eth",
  WBTC: "wrapped-bitcoin",
  BTC: "bitcoin",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  LUSD: "liquity-usd",
  FRAX: "frax",
  AAVE: "aave",
  LINK: "chainlink",
  UNI: "uniswap",
  MATIC: "matic-network",
  ARB: "arbitrum",
  OP: "optimism",
  CRV: "curve-dao-token",
  SOL: "solana",
};

/** Assets we are willing to assume trade at par if every source is down. */
const PAR_STABLES = new Set(["USDC", "USDT", "DAI", "LUSD", "FRAX", "USDS", "GUSD"]);

class PriceService {
  /**
   * @param {object} deps
   * @param {object} deps.config  config.prices
   * @param {object} deps.logger
   * @param {object} [deps.chainlink] injectable Chainlink source (tests)
   * @param {Function} [deps.fetchJson] injectable HTTP (tests)
   */
  constructor({ config, logger, chainlink, fetchJson = requestJson }) {
    this.config = config;
    this.logger = logger.child({ module: "prices" });
    this.fetchJson = fetchJson;
    this.cache = new TtlCache({ ttlMs: config.ttlMs, maxEntries: 500 });
    this.chainlink = chainlink ?? createChainlinkSource({ config, logger: this.logger });
    /** Last known good price per symbol, used when every live source fails. */
    this.lastKnownGood = new Map();
  }

  /**
   * USD price for one token, in WAD.
   * @param {string} symbol
   * @param {object} [opts]
   * @param {number} [opts.chainId]
   * @param {string} [opts.address]
   * @returns {Promise<{priceWad: bigint, source: string, stale: boolean}>}
   */
  async getPrice(symbol, opts = {}) {
    const key = String(symbol || "").toUpperCase();
    if (!key) throw new Error("getPrice requires a token symbol");

    return this.cache.getOrLoad(`price:${key}`, async () => {
      const attempts = [];

      // 1. Chainlink
      if (this.chainlink?.isConfiguredFor(key, opts.chainId)) {
        try {
          const priceWad = await this.chainlink.getPriceWad(key, opts);
          if (priceWad > 0n) return this.remember(key, priceWad, "chainlink");
        } catch (err) {
          attempts.push(`chainlink: ${err.message}`);
        }
      }

      // 2. CoinGecko
      const geckoId = COINGECKO_IDS[key];
      if (geckoId) {
        try {
          const priceWad = await this.fetchCoingecko(geckoId);
          if (priceWad > 0n) return this.remember(key, priceWad, "coingecko");
        } catch (err) {
          attempts.push(`coingecko: ${err.message}`);
        }
      } else {
        attempts.push("coingecko: no id mapping for symbol");
      }

      // 3. Last known good, then par.
      const remembered = this.lastKnownGood.get(key);
      if (remembered) {
        this.logger.warn("all price sources failed; serving last known good", {
          symbol: key,
          ageMs: Date.now() - remembered.at,
          attempts,
        });
        return { priceWad: remembered.priceWad, source: `${remembered.source}:stale`, stale: true };
      }

      if (PAR_STABLES.has(key)) {
        this.logger.warn("all price sources failed; assuming par for stablecoin", {
          symbol: key,
          attempts,
        });
        return { priceWad: WAD, source: "par-fallback", stale: true };
      }

      throw new Error(`No price available for ${key}. Tried -> ${attempts.join("; ")}`);
    });
  }

  /**
   * Batch lookup. Failures are isolated: one unpriceable token does not sink
   * the whole position refresh, it just comes back as an error entry so the
   * caller can decide whether the resulting HF is trustworthy.
   * @returns {Promise<Map<string, {priceWad: bigint, source: string, stale: boolean, error?: string}>>}
   */
  async getPrices(symbols, opts = {}) {
    const unique = [...new Set(symbols.map((s) => String(s).toUpperCase()))];
    const results = await Promise.allSettled(unique.map((s) => this.getPrice(s, opts)));
    const out = new Map();
    unique.forEach((symbol, i) => {
      const settled = results[i];
      if (settled.status === "fulfilled") out.set(symbol, settled.value);
      else out.set(symbol, { priceWad: 0n, source: "unavailable", stale: true, error: settled.reason.message });
    });
    return out;
  }

  async fetchCoingecko(geckoId) {
    // The configured base URL already carries the /api/v3 prefix.
    const endpoint = `${this.config.coingeckoBaseUrl.replace(/\/$/, "")}/simple/price?ids=${encodeURIComponent(
      geckoId,
    )}&vs_currencies=usd`;

    const headers = { accept: "application/json" };
    if (this.config.coingeckoApiKey) {
      // Demo keys use a different header than Pro keys; send whichever matches
      // the configured base URL.
      const header = this.config.coingeckoBaseUrl.includes("pro-api")
        ? "x-cg-pro-api-key"
        : "x-cg-demo-api-key";
      headers[header] = this.config.coingeckoApiKey;
    }

    const body = await this.fetchJson(endpoint, {
      headers,
      timeoutMs: this.config.timeoutMs,
      retries: 2,
      onRetry: (attempt, err) =>
        this.logger.debug("coingecko retry", { geckoId, attempt, error: err.message }),
    });

    const usd = body?.[geckoId]?.usd;
    if (usd === undefined || usd === null) {
      throw new Error(`coingecko returned no usd price for ${geckoId}`);
    }
    return parseUnits(String(usd));
  }

  remember(symbol, priceWad, source) {
    this.lastKnownGood.set(symbol, { priceWad, source, at: Date.now() });
    return { priceWad, source, stale: false };
  }
}

module.exports = { PriceService, COINGECKO_IDS, PAR_STABLES };
