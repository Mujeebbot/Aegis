"use strict";

/**
 * Chainlink price feeds, read over raw JSON-RPC.
 *
 * Deliberately no ethers dependency here: two eth_calls with hand-rolled ABI
 * encoding is less code than pulling a web3 library into the monitor, and it
 * keeps ai-monitor installable without native build steps.
 *
 * Feeds matter because Aave and Compound price collateral with Chainlink. Using
 * the same oracle means our computed HF matches the protocol's own view, so we
 * do not alert on a discrepancy that only exists in CoinGecko's mid price.
 *
 * Configure with CHAINLINK_FEEDS, e.g.
 *   CHAINLINK_FEEDS=11155111:ETH=0x694AA…,11155111:BTC=0x1b44F…
 * CHAINLINK_FEED_ADDRESS (from the original .env.example) is honoured as the
 * single-feed shorthand for ETH on the default source chain.
 */

const { requestJson } = require("../lib/http");

// keccak("latestRoundData()")[0:4] and keccak("decimals()")[0:4]
const SELECTOR_LATEST_ROUND_DATA = "0xfeaf968c";
const SELECTOR_DECIMALS = "0x313ce567";

/** Symbols that share a feed (a wrapper tracks its underlying 1:1 for pricing). */
const FEED_ALIASES = {
  WETH: "ETH",
  STETH: "ETH",
  WSTETH: "ETH",
  CBETH: "ETH",
  RETH: "ETH",
  WBTC: "BTC",
};

class ChainlinkSource {
  /**
   * @param {object} deps
   * @param {Record<string,string>} deps.feeds  key `${chainId}:${SYMBOL}` -> feed address
   * @param {Record<number,string>} deps.rpcUrls chainId -> RPC url
   * @param {object} deps.logger
   * @param {number} [deps.timeoutMs]
   * @param {Function} [deps.fetchJson]
   */
  constructor({ feeds, rpcUrls, logger, timeoutMs = 8000, fetchJson = requestJson }) {
    this.feeds = feeds;
    this.rpcUrls = rpcUrls;
    this.logger = logger;
    this.timeoutMs = timeoutMs;
    this.fetchJson = fetchJson;
    this.decimalsCache = new Map();
  }

  resolveSymbol(symbol) {
    const upper = String(symbol).toUpperCase();
    return FEED_ALIASES[upper] || upper;
  }

  feedKey(symbol, chainId) {
    return `${chainId}:${this.resolveSymbol(symbol)}`;
  }

  isConfiguredFor(symbol, chainId) {
    if (chainId === undefined || chainId === null) return false;
    const address = this.feeds[this.feedKey(symbol, chainId)];
    return Boolean(address) && Boolean(this.rpcUrls[Number(chainId)]);
  }

  /** @returns {Promise<bigint>} USD price in WAD */
  async getPriceWad(symbol, { chainId } = {}) {
    const key = this.feedKey(symbol, chainId);
    const feedAddress = this.feeds[key];
    const rpcUrl = this.rpcUrls[Number(chainId)];
    if (!feedAddress) throw new Error(`No Chainlink feed configured for ${key}`);
    if (!rpcUrl) throw new Error(`No RPC url configured for chainId ${chainId}`);

    const decimals = await this.getDecimals(feedAddress, rpcUrl);
    const raw = await this.ethCall(rpcUrl, feedAddress, SELECTOR_LATEST_ROUND_DATA);

    // latestRoundData() -> (uint80 roundId, int256 answer, uint256 startedAt,
    //                       uint256 updatedAt, uint80 answeredInRound)
    // Each word is 32 bytes; `answer` is word 1, `updatedAt` is word 3.
    const words = splitWords(raw);
    if (words.length < 5) throw new Error(`Malformed latestRoundData response from ${feedAddress}`);

    const answer = toSignedBigInt(words[1]);
    const updatedAt = BigInt(`0x${words[3]}`);
    if (answer <= 0n) throw new Error(`Chainlink feed ${feedAddress} returned non-positive answer`);

    // A feed that has not updated in over an hour is stale enough that we would
    // rather fall through to CoinGecko than compute an HF from it.
    const ageSec = Math.floor(Date.now() / 1000) - Number(updatedAt);
    if (ageSec > 3600) {
      throw new Error(`Chainlink feed ${feedAddress} is stale (${ageSec}s since update)`);
    }

    // Scale the feed's own decimals up to WAD.
    return decimals >= 18
      ? answer / 10n ** BigInt(decimals - 18)
      : answer * 10n ** BigInt(18 - decimals);
  }

  async getDecimals(feedAddress, rpcUrl) {
    const cached = this.decimalsCache.get(feedAddress);
    if (cached !== undefined) return cached;
    const raw = await this.ethCall(rpcUrl, feedAddress, SELECTOR_DECIMALS);
    const decimals = Number(BigInt(raw));
    if (!Number.isInteger(decimals) || decimals < 0 || decimals > 36) {
      throw new Error(`Feed ${feedAddress} reported implausible decimals: ${decimals}`);
    }
    this.decimalsCache.set(feedAddress, decimals);
    return decimals;
  }

  async ethCall(rpcUrl, to, data) {
    const body = await this.fetchJson(rpcUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
      timeoutMs: this.timeoutMs,
      retries: 1,
    });
    if (body?.error) throw new Error(`eth_call failed: ${body.error.message}`);
    if (!body?.result || body.result === "0x") {
      throw new Error(`eth_call to ${to} returned empty result`);
    }
    return body.result;
  }
}

/** "0x" + n*64 hex chars -> array of 64-char words. */
function splitWords(hex) {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const words = [];
  for (let i = 0; i + 64 <= clean.length; i += 64) words.push(clean.slice(i, i + 64));
  return words;
}

/** Interpret a 32-byte word as int256 (two's complement). */
function toSignedBigInt(word) {
  const value = BigInt(`0x${word}`);
  const limit = 1n << 255n;
  return value >= limit ? value - (1n << 256n) : value;
}

/** Parse "11155111:ETH=0xabc,1:BTC=0xdef" into a lookup map. */
function parseFeedConfig(raw) {
  const out = {};
  for (const pair of String(raw || "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const eq = pair.indexOf("=");
    if (eq === -1) throw new Error(`CHAINLINK_FEEDS entry must be chainId:SYMBOL=address, got ${pair}`);
    const key = pair.slice(0, eq).trim().toUpperCase();
    const address = pair.slice(eq + 1).trim();
    if (!/^\d+:[A-Z0-9]+$/.test(key)) {
      throw new Error(`CHAINLINK_FEEDS key must be chainId:SYMBOL, got ${key}`);
    }
    if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new Error(`CHAINLINK_FEEDS address is not a 20-byte hex address: ${address}`);
    }
    out[key] = address;
  }
  return out;
}

/**
 * Build a source from already-resolved configuration.
 *
 * Deliberately reads nothing from process.env: config.js is the single place
 * this service touches the environment, so every var is validated and
 * documented in one pass. Returns an object that answers `isConfiguredFor`
 * false when nothing is mapped, so the price service simply skips Chainlink
 * rather than branching on null.
 */
function createChainlinkSource({ config, logger }) {
  return new ChainlinkSource({
    feeds: config.chainlinkFeeds ?? {},
    rpcUrls: config.sourceRpcUrls ?? {},
    logger,
    timeoutMs: config.timeoutMs,
  });
}

module.exports = { ChainlinkSource, createChainlinkSource, parseFeedConfig, FEED_ALIASES };
