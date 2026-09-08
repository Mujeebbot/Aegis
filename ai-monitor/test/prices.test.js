"use strict";

/**
 * Price sources.
 *
 * The Chainlink path decodes raw eth_call return data by hand (no ethers in
 * ai-monitor), so word offsets, int256 two's complement and feed decimals are
 * all places a silent wrong number could come from. A wrong price produces a
 * wrong health factor, which produces either a missed liquidation or a wasted
 * on-chain submission.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { ChainlinkSource, parseFeedConfig } = require("../src/prices/chainlink");
const { PriceService } = require("../src/prices");
const { createLogger } = require("../src/lib/logger");
const { formatUnits, parseUnits, WAD } = require("../src/lib/units");

const logger = createLogger("test", { level: "error" });
const FEED = "0x694AA1769357215DE4FAC081bf1f309aDC325306";
const CHAIN_ID = 11155111;

/** Encode a value as a 32-byte hex word. */
const word = (value) => {
  const v = BigInt(value);
  const unsigned = v < 0n ? (1n << 256n) + v : v;
  return unsigned.toString(16).padStart(64, "0");
};

/** Build a latestRoundData() return blob: (roundId, answer, startedAt, updatedAt, answeredInRound). */
function roundData({ answer, updatedAt = Math.floor(Date.now() / 1000) }) {
  return `0x${word(1)}${word(answer)}${word(updatedAt)}${word(updatedAt)}${word(1)}`;
}

/** A ChainlinkSource wired to a scripted JSON-RPC. */
function chainlink({ decimals = 8, answer = 200000000000n, updatedAt, feeds, rpcUrls } = {}) {
  const calls = [];
  const source = new ChainlinkSource({
    feeds: feeds ?? { [`${CHAIN_ID}:ETH`]: FEED },
    rpcUrls: rpcUrls ?? { [CHAIN_ID]: "http://rpc.test" },
    logger,
    fetchJson: async (url, options) => {
      const body = JSON.parse(options.body);
      calls.push(body.params[0].data);
      // 0x313ce567 = decimals(), 0xfeaf968c = latestRoundData()
      if (body.params[0].data === "0x313ce567") {
        return { result: `0x${word(decimals)}` };
      }
      return { result: roundData({ answer, updatedAt }) };
    },
  });
  return { source, calls };
}

// --- Chainlink decoding -----------------------------------------------------

test("chainlink: scales an 8-decimal feed answer up to WAD", async () => {
  // $2000.00 on an 8dp feed.
  const { source } = chainlink({ decimals: 8, answer: 200000000000n });
  const price = await source.getPriceWad("ETH", { chainId: CHAIN_ID });
  assert.equal(formatUnits(price, 18), "2000");
});

test("chainlink: scales an 18-decimal feed without change", async () => {
  const { source } = chainlink({ decimals: 18, answer: parseUnits("1234.5") });
  const price = await source.getPriceWad("ETH", { chainId: CHAIN_ID });
  assert.equal(formatUnits(price, 18), "1234.5");
});

test("chainlink: scales a higher-than-WAD feed down", async () => {
  // A 20dp feed reporting $50.
  const { source } = chainlink({ decimals: 20, answer: 50n * 10n ** 20n });
  const price = await source.getPriceWad("ETH", { chainId: CHAIN_ID });
  assert.equal(formatUnits(price, 18), "50");
});

test("chainlink: reads the answer from the correct ABI word", async () => {
  // If the decoder took word 0 (roundId) or word 2 (startedAt) instead of
  // word 1, this would come back as 1 or as the timestamp.
  const { source } = chainlink({ decimals: 8, answer: 314159265358n });
  const price = await source.getPriceWad("ETH", { chainId: CHAIN_ID });
  assert.equal(formatUnits(price, 18), "3141.59265358");
});

test("chainlink: rejects a negative answer instead of returning a bogus price", async () => {
  // int256 is signed; a naive unsigned read would turn -1 into ~1.16e77.
  const { source } = chainlink({ answer: -100000000n });
  await assert.rejects(
    () => source.getPriceWad("ETH", { chainId: CHAIN_ID }),
    /non-positive answer/,
  );
});

test("chainlink: rejects a stale feed so a dead oracle cannot drive decisions", async () => {
  const twoHoursAgo = Math.floor(Date.now() / 1000) - 7200;
  const { source } = chainlink({ updatedAt: twoHoursAgo });
  await assert.rejects(() => source.getPriceWad("ETH", { chainId: CHAIN_ID }), /is stale/);
});

test("chainlink: caches the feed decimals rather than re-reading them", async () => {
  const { source, calls } = chainlink();
  await source.getPriceWad("ETH", { chainId: CHAIN_ID });
  await source.getPriceWad("ETH", { chainId: CHAIN_ID });
  const decimalsCalls = calls.filter((d) => d === "0x313ce567").length;
  assert.equal(decimalsCalls, 1);
});

test("chainlink: wrapped assets resolve to their underlying feed", async () => {
  const { source } = chainlink({ feeds: { [`${CHAIN_ID}:ETH`]: FEED } });
  // WETH/stETH/wstETH track ETH; WBTC tracks BTC.
  for (const symbol of ["WETH", "STETH", "WSTETH", "CBETH", "RETH"]) {
    assert.equal(source.isConfiguredFor(symbol, CHAIN_ID), true, `${symbol} should map to ETH`);
  }
  const price = await source.getPriceWad("WETH", { chainId: CHAIN_ID });
  assert.equal(formatUnits(price, 18), "2000");
});

test("chainlink: reports itself unconfigured rather than throwing", async () => {
  const { source } = chainlink();
  assert.equal(source.isConfiguredFor("DOGE", CHAIN_ID), false);
  assert.equal(source.isConfiguredFor("ETH", 999), false, "no RPC for that chain");
  assert.equal(source.isConfiguredFor("ETH", undefined), false);
});

test("chainlink: surfaces a JSON-RPC error rather than decoding garbage", async () => {
  const source = new ChainlinkSource({
    feeds: { [`${CHAIN_ID}:ETH`]: FEED },
    rpcUrls: { [CHAIN_ID]: "http://rpc.test" },
    logger,
    fetchJson: async () => ({ error: { message: "execution reverted" } }),
  });
  await assert.rejects(() => source.getPriceWad("ETH", { chainId: CHAIN_ID }), /execution reverted/);
});

test("chainlink: rejects an empty eth_call result", async () => {
  const source = new ChainlinkSource({
    feeds: { [`${CHAIN_ID}:ETH`]: FEED },
    rpcUrls: { [CHAIN_ID]: "http://rpc.test" },
    logger,
    fetchJson: async () => ({ result: "0x" }),
  });
  await assert.rejects(() => source.getPriceWad("ETH", { chainId: CHAIN_ID }), /empty result/);
});

// --- feed config parsing ----------------------------------------------------

test("parseFeedConfig accepts valid entries and rejects malformed ones", () => {
  const parsed = parseFeedConfig(`11155111:ETH=${FEED},1:BTC=${FEED}`);
  assert.equal(parsed["11155111:ETH"], FEED);
  assert.equal(parsed["1:BTC"], FEED);

  assert.deepEqual(parseFeedConfig(""), {});
  assert.deepEqual(parseFeedConfig(undefined), {});

  assert.throws(() => parseFeedConfig("11155111:ETH"), /chainId:SYMBOL=address/);
  assert.throws(() => parseFeedConfig("ETH=0x123"), /chainId:SYMBOL/);
  // A truncated address would produce silently wrong eth_calls.
  assert.throws(() => parseFeedConfig("1:ETH=0xdead"), /20-byte hex address/);
});

// --- PriceService resolution order -----------------------------------------

/** PriceService with scripted Chainlink and CoinGecko behaviour. */
function priceService({ chainlinkPrice, chainlinkError, geckoPrice, geckoError } = {}) {
  const hits = { chainlink: 0, gecko: 0 };
  return new PriceService({
    config: {
      coingeckoApiKey: "",
      coingeckoBaseUrl: "https://api.coingecko.test/api/v3",
      chainlinkFeedAddress: "",
      ttlMs: 1000,
      timeoutMs: 500,
    },
    logger,
    chainlink: {
      isConfiguredFor: () => chainlinkPrice !== undefined || chainlinkError !== undefined,
      getPriceWad: async () => {
        hits.chainlink += 1;
        if (chainlinkError) throw new Error(chainlinkError);
        return chainlinkPrice;
      },
    },
    fetchJson: async () => {
      hits.gecko += 1;
      if (geckoError) throw new Error(geckoError);
      return { weth: { usd: geckoPrice } };
    },
    ...{ hits },
  });
}

test("price service prefers Chainlink over CoinGecko", async () => {
  const svc = priceService({ chainlinkPrice: parseUnits("2000"), geckoPrice: 1900 });
  const result = await svc.getPrice("WETH", { chainId: CHAIN_ID });
  assert.equal(result.source, "chainlink");
  assert.equal(formatUnits(result.priceWad, 18), "2000");
});

test("price service falls back to CoinGecko when Chainlink fails", async () => {
  const svc = priceService({ chainlinkError: "feed stale", geckoPrice: 1900 });
  const result = await svc.getPrice("WETH", { chainId: CHAIN_ID });
  assert.equal(result.source, "coingecko");
  assert.equal(formatUnits(result.priceWad, 18), "1900");
});

test("price service serves the last known good price when every source fails", async () => {
  const svc = priceService({ geckoPrice: 1900 });
  const first = await svc.getPrice("WETH", { chainId: CHAIN_ID });
  assert.equal(first.stale, false);

  // Now break CoinGecko and expire the cache.
  svc.fetchJson = async () => {
    throw new Error("coingecko down");
  };
  svc.cache.clear();

  const second = await svc.getPrice("WETH", { chainId: CHAIN_ID });
  assert.equal(second.stale, true);
  assert.match(second.source, /stale/);
  // A stale price beats no price - but it must be flagged as stale.
  assert.equal(formatUnits(second.priceWad, 18), "1900");
});

test("price service assumes par for a stablecoin only as a last resort", async () => {
  const svc = priceService({ geckoError: "coingecko down" });
  const result = await svc.getPrice("USDC", { chainId: CHAIN_ID });
  assert.equal(result.priceWad, WAD);
  assert.equal(result.source, "par-fallback");
  assert.equal(result.stale, true);
});

test("price service throws for an unpriceable non-stablecoin", async () => {
  const svc = priceService({ geckoError: "coingecko down" });
  // Silently assuming a price for a volatile asset would be far worse than
  // failing and letting the snapshot be marked degraded.
  await assert.rejects(() => svc.getPrice("WETH", { chainId: CHAIN_ID }), /No price available/);
});

test("price service caches and single-flights concurrent lookups", async () => {
  let calls = 0;
  const svc = priceService({ geckoPrice: 1900 });
  svc.fetchJson = async () => {
    calls += 1;
    await new Promise((r) => setTimeout(r, 10));
    return { weth: { usd: 1900 } };
  };

  // Ten simultaneous requests for the same token must produce one HTTP call.
  await Promise.all(Array.from({ length: 10 }, () => svc.getPrice("WETH", { chainId: CHAIN_ID })));
  assert.equal(calls, 1);
});

test("getPrices isolates a failure to the token that caused it", async () => {
  const svc = priceService({ geckoPrice: 1900 });
  const results = await svc.getPrices(["WETH", "NOT-A-REAL-TOKEN"], { chainId: CHAIN_ID });

  assert.equal(results.get("WETH").source, "coingecko");
  const bad = results.get("NOT-A-REAL-TOKEN");
  assert.equal(bad.priceWad, 0n);
  assert.equal(bad.source, "unavailable");
  assert.ok(bad.error);
});

test("getPrices normalises symbols to upper case and de-duplicates", async () => {
  let calls = 0;
  const svc = priceService({ geckoPrice: 1900 });
  svc.fetchJson = async () => {
    calls += 1;
    return { weth: { usd: 1900 } };
  };
  const results = await svc.getPrices(["weth", "WETH", "Weth"], { chainId: CHAIN_ID });
  assert.equal(results.size, 1);
  assert.equal(calls, 1);
});
