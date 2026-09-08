"use strict";

/**
 * Env loading + validation. Fails fast and loudly at boot rather than throwing
 * an obscure `undefined` five minutes into a demo.
 *
 * Every var here is documented in the repo-root .env.example. Nothing in this
 * service reads process.env outside this file.
 */

const path = require("node:path");
const { parseUnits } = require("./lib/units");
const { ALL_PROTOCOLS } = require("./sources/protocols");
const { parseFeedConfig } = require("./prices/chainlink");
const { getChainByChainId } = require("./chains");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
// Fall back to the repo-root .env so a single file can drive the whole stack.
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });

function num(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number, got ${JSON.stringify(raw)}`);
  return value;
}

function bool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function str(name, fallback) {
  const raw = process.env[name];
  return raw === undefined || raw === "" ? fallback : raw;
}

function csv(name, fallback = []) {
  const raw = str(name);
  if (!raw) return fallback;
  return raw.split(",").map((s) => s.trim()).filter(Boolean);
}

/**
 * Data source mode:
 *   live    — query The Graph + CoinGecko. Needs THE_GRAPH_API_KEY.
 *   fixture — serve deterministic scripted positions from fixtures.js.
 *             Used by tests, by CI, and for demoing the full alert -> proof
 *             pipeline without waiting for a real position to go unhealthy.
 *   auto    — live if THE_GRAPH_API_KEY is set, else fixture (default).
 */
function resolveDataMode() {
  const mode = str("AI_MONITOR_DATA_MODE", "auto").toLowerCase();
  if (!["live", "fixture", "auto"].includes(mode)) {
    throw new Error(`AI_MONITOR_DATA_MODE must be live|fixture|auto, got ${mode}`);
  }
  if (mode !== "auto") return mode;
  return process.env.THE_GRAPH_API_KEY ? "live" : "fixture";
}

function load() {
  const dataMode = resolveDataMode();

  const config = {
    dataMode,

    server: {
      port: num("AI_MONITOR_PORT", 4001),
      host: str("AI_MONITOR_HOST", "0.0.0.0"),
      // Shared secret required on mutating routes. Empty = open (dev only).
      apiKey: str("AI_MONITOR_API_KEY", ""),
    },

    poller: {
      enabled: bool("AI_MONITOR_POLL_ENABLED", true),
      // 30s cadence is the figure in the project brief.
      intervalMs: num("AI_MONITOR_POLL_INTERVAL_MS", 30_000),
      // Cap on positions evaluated in parallel per tick, to stay inside
      // subgraph and price-API rate limits.
      concurrency: num("AI_MONITOR_POLL_CONCURRENCY", 5),
    },

    risk: {
      /**
       * Default alert threshold, in WAD. Must stay >= the Settlement contract's
       * SAFE_THRESHOLD (1.05e18) — the contract rejects protectPosition for any
       * position at or above it, so alerting above the contract's line would
       * produce guaranteed-to-revert proof submissions.
       */
      defaultThresholdWad: parseUnits(str("AI_MONITOR_DEFAULT_THRESHOLD", "1.05")),
      /** Below this we treat liquidation as imminent regardless of trend. */
      criticalThresholdWad: parseUnits(str("AI_MONITOR_CRITICAL_THRESHOLD", "1.01")),
      /** Look-ahead used by the trend model when projecting HF forward. */
      forecastHorizonSec: num("AI_MONITOR_FORECAST_HORIZON_SEC", 900),
      /** Samples retained per position for trend/velocity estimation. */
      historySize: num("AI_MONITOR_HISTORY_SIZE", 40),
      /** Re-alerting the same position is suppressed for this long. */
      alertCooldownMs: num("AI_MONITOR_ALERT_COOLDOWN_MS", 300_000),
    },

    graph: {
      apiKey: str("THE_GRAPH_API_KEY", ""),
      gatewayUrl: str("THE_GRAPH_GATEWAY_URL", "https://gateway.thegraph.com/api"),
      timeoutMs: num("THE_GRAPH_TIMEOUT_MS", 10_000),
      /** Subgraph deployment ids, keyed `${protocol}:${chainId}`. */
      subgraphs: parseSubgraphIds(str("THE_GRAPH_SUBGRAPH_IDS", "")),
    },

    prices: {
      coingeckoApiKey: str("COINGECKO_API_KEY", ""),
      coingeckoBaseUrl: str(
        "COINGECKO_BASE_URL",
        process.env.COINGECKO_API_KEY
          ? "https://pro-api.coingecko.com/api/v3"
          : "https://api.coingecko.com/api/v3",
      ),
      chainlinkFeedAddress: str("CHAINLINK_FEED_ADDRESS", ""),
      /** chainId:SYMBOL -> feed address, resolved below. */
      chainlinkFeeds: resolveChainlinkFeeds(),
      /** chainId -> RPC url, for reading those feeds. */
      sourceRpcUrls: resolveSourceRpcUrls(),
      ttlMs: num("PRICE_CACHE_TTL_MS", 30_000),
      timeoutMs: num("PRICE_TIMEOUT_MS", 8_000),
    },

    protocols: csv("AI_MONITOR_PROTOCOLS", [...ALL_PROTOCOLS]),

    alerts: {
      /** oracle-worker intake. Empty disables dispatch (monitor-only mode). */
      webhookUrl: str("ORACLE_WORKER_WEBHOOK_URL", "http://127.0.0.1:4002/alerts"),
      /** Must match ORACLE_WORKER_API_KEY on the worker side. */
      apiKey: str("ORACLE_WORKER_API_KEY", ""),
      enabled: bool("AI_MONITOR_ALERTS_ENABLED", true),
      timeoutMs: num("AI_MONITOR_ALERT_TIMEOUT_MS", 10_000),
      retries: num("AI_MONITOR_ALERT_RETRIES", 3),
    },

    /**
     * Seed watchlist: "chainId:address[:protocol]" entries, comma separated.
     * The brief's first milestone — one hardcoded Sepolia position — is just
     * AI_MONITOR_WATCHLIST=11155111:0xYourTestPosition.
     */
    watchlist: csv("AI_MONITOR_WATCHLIST", []),
  };

  validate(config);
  return config;
}

/** "aave-v3:11155111=Qm…,compound-v3:1=Qm…" -> { "aave-v3:11155111": "Qm…" } */
function parseSubgraphIds(raw) {
  const out = {};
  for (const pair of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const eq = pair.indexOf("=");
    if (eq === -1) throw new Error(`THE_GRAPH_SUBGRAPH_IDS entry must be key=id, got ${pair}`);
    out[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
  return out;
}

/**
 * Chainlink feed map. CHAINLINK_FEEDS is the general form; the single
 * CHAINLINK_FEED_ADDRESS var is kept as shorthand for ETH/USD on the default
 * source chain, which is what the original .env.example shipped with.
 */
function resolveChainlinkFeeds() {
  const feeds = parseFeedConfig(str("CHAINLINK_FEEDS", ""));
  const single = str("CHAINLINK_FEED_ADDRESS", "");
  if (single && Object.keys(feeds).length === 0) {
    feeds[`${num("SOURCE_CHAIN_DEFAULT_CHAIN_ID", 11155111)}:ETH`] = single;
  }
  return feeds;
}

/** chainId -> RPC url, read via each chain's documented env var name. */
function resolveSourceRpcUrls() {
  const urls = {};
  for (const chainId of [11155111, 1]) {
    const meta = getChainByChainId(chainId);
    const url = meta ? str(meta.rpcEnvVar, "") : "";
    if (url) urls[chainId] = url;
  }
  return urls;
}

function validate(config) {
  const errors = [];

  if (config.poller.intervalMs < 1_000) {
    errors.push("AI_MONITOR_POLL_INTERVAL_MS below 1000ms will hammer upstream APIs");
  }
  if (config.poller.concurrency < 1) {
    errors.push("AI_MONITOR_POLL_CONCURRENCY must be >= 1");
  }
  if (config.risk.criticalThresholdWad > config.risk.defaultThresholdWad) {
    errors.push("AI_MONITOR_CRITICAL_THRESHOLD must be <= AI_MONITOR_DEFAULT_THRESHOLD");
  }
  if (config.dataMode === "live" && !config.graph.apiKey) {
    errors.push("AI_MONITOR_DATA_MODE=live requires THE_GRAPH_API_KEY");
  }

  // A typo here used to be a startup warning and a silently ignored protocol,
  // which reads as "that market is healthy" rather than "that market is not
  // being watched". Fail at boot instead.
  const unknownProtocols = config.protocols.filter((p) => !ALL_PROTOCOLS.includes(p));
  if (unknownProtocols.length > 0) {
    errors.push(
      `AI_MONITOR_PROTOCOLS contains unknown protocol(s): ${unknownProtocols.join(", ")}. ` +
        `Supported: ${ALL_PROTOCOLS.join(", ")}`,
    );
  }
  if (config.dataMode === "live" && config.protocols.length === 0) {
    errors.push("AI_MONITOR_PROTOCOLS is empty; nothing would be monitored");
  }
  if (config.alerts.enabled && config.alerts.webhookUrl) {
    try {
      new URL(config.alerts.webhookUrl);
    } catch {
      errors.push(`ORACLE_WORKER_WEBHOOK_URL is not a valid URL: ${config.alerts.webhookUrl}`);
    }
  }

  if (errors.length) {
    throw new Error(`Invalid ai-monitor configuration:\n  - ${errors.join("\n  - ")}`);
  }
}

module.exports = { load, parseSubgraphIds };
