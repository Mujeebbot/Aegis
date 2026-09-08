"use strict";

/**
 * PositionTxResolver and the proof-error classification.
 *
 * Choosing which transaction to prove is a correctness question, not a
 * convenience one: proving the wrong transaction produces a valid proof of the
 * wrong thing. The precedence order therefore needs to be pinned down.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { PositionTxResolver } = require("../src/sources/positionTx");
const { isRetriableProofError } = require("../src/proofs/builder");
const { createLogger } = require("../src/lib/logger");

const logger = createLogger("test", { level: "error" });

const USER = `0x${"aa".repeat(20)}`;
const CHAIN_ID = 11155111;
const ALERT_TX = `0x${"11".repeat(32)}`;
const WATCHLIST_TX = `0x${"22".repeat(32)}`;
const ENV_TX = `0x${"33".repeat(32)}`;

function makeResolver({ watchlistTx, defaultTxHash = "", fetchJson, recheck = true } = {}) {
  const requests = [];
  return {
    requests,
    resolver: new PositionTxResolver({
      config: {
        sourceChains: { defaultTxHash },
        monitor: {
          baseUrl: "http://monitor.test",
          apiKey: "",
          timeoutMs: 1000,
          recheckBeforeSubmit: recheck,
        },
      },
      logger,
      fetchJson:
        fetchJson ??
        (async (url) => {
          requests.push(url);
          if (url.includes("/watchlist")) {
            return {
              entries: watchlistTx
                ? [{ user: USER, chainId: CHAIN_ID, sourceTxHash: watchlistTx }]
                : [],
            };
          }
          return { isAtRisk: true, healthFactor: 1.01, risk: { level: "AT_RISK" } };
        }),
    }),
  };
}

const alert = (overrides = {}) => ({ user: USER, chainId: CHAIN_ID, ...overrides });

// --- resolution precedence --------------------------------------------------

test("prefers the tx hash on the alert itself", async () => {
  const { resolver, requests } = makeResolver({ watchlistTx: WATCHLIST_TX, defaultTxHash: ENV_TX });
  const result = await resolver.resolve(alert({ sourceTxHash: ALERT_TX }));

  assert.equal(result.txHash, ALERT_TX);
  assert.equal(result.source, "alert");
  // The most authoritative source short-circuits the rest.
  assert.equal(requests.length, 0, "must not call ai-monitor when the alert carries the hash");
});

test("falls back to the ai-monitor watchlist entry", async () => {
  const { resolver } = makeResolver({ watchlistTx: WATCHLIST_TX, defaultTxHash: ENV_TX });
  const result = await resolver.resolve(alert());
  assert.equal(result.txHash, WATCHLIST_TX);
  assert.equal(result.source, "ai-monitor-watchlist");
});

test("falls back to the env default last", async () => {
  const { resolver } = makeResolver({ defaultTxHash: ENV_TX });
  const result = await resolver.resolve(alert());
  assert.equal(result.txHash, ENV_TX);
  assert.equal(result.source, "env-default");
});

test("fails permanently when nothing resolves", async () => {
  const { resolver } = makeResolver({});
  await assert.rejects(
    () => resolver.resolve(alert()),
    (err) => {
      assert.match(err.message, /No source transaction to prove/);
      // A missing input is a configuration gap; retrying cannot fix it.
      assert.equal(err.retriable, false);
      return true;
    },
  );
});

test("ignores a malformed tx hash on the alert and keeps looking", async () => {
  const { resolver } = makeResolver({ watchlistTx: WATCHLIST_TX });
  const result = await resolver.resolve(alert({ sourceTxHash: "0xnotahash" }));
  assert.equal(result.txHash, WATCHLIST_TX);
});

test("matches the watchlist entry case-insensitively", async () => {
  const { resolver } = makeResolver({ watchlistTx: WATCHLIST_TX });
  const result = await resolver.resolve(alert({ user: USER.toUpperCase() }));
  assert.equal(result.txHash, WATCHLIST_TX);
});

test("ignores a watchlist entry for a different chain", async () => {
  const { resolver } = makeResolver({
    defaultTxHash: ENV_TX,
    fetchJson: async () => ({
      entries: [{ user: USER, chainId: 1, sourceTxHash: WATCHLIST_TX }],
    }),
  });
  const result = await resolver.resolve(alert());
  assert.equal(result.source, "env-default");
});

test("survives an ai-monitor outage while resolving", async () => {
  const { resolver } = makeResolver({
    defaultTxHash: ENV_TX,
    fetchJson: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  const result = await resolver.resolve(alert());
  assert.equal(result.source, "env-default");
});

// --- pre-submit risk re-check ----------------------------------------------

test("recheckRisk reports a recovered position", async () => {
  const { resolver } = makeResolver({
    fetchJson: async () => ({ isAtRisk: false, healthFactor: 1.42, risk: { level: "SAFE" } }),
  });
  const result = await resolver.recheckRisk(USER, CHAIN_ID);
  assert.equal(result.isAtRisk, false);
  assert.equal(result.healthFactor, 1.42);
  assert.equal(result.level, "SAFE");
});

test("recheckRisk requests a fresh reading, not a cached one", async () => {
  const { resolver, requests } = makeResolver({});
  await resolver.recheckRisk(USER, CHAIN_ID);
  // A cached snapshot could be from before the position recovered.
  assert.ok(requests[0].includes("fresh=1"), `expected fresh=1 in ${requests[0]}`);
});

test("recheckRisk returns null when the monitor is unreachable", async () => {
  const { resolver } = makeResolver({
    fetchJson: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  // null means "could not check"; the caller proceeds rather than blocking
  // protection on a monitor outage.
  assert.equal(await resolver.recheckRisk(USER, CHAIN_ID), null);
});

test("recheckRisk is skipped when disabled", async () => {
  const { resolver, requests } = makeResolver({ recheck: false });
  assert.equal(await resolver.recheckRisk(USER, CHAIN_ID), null);
  assert.equal(requests.length, 0);
});

// --- proof error classification --------------------------------------------

test("proof-builder errors are classified so only transients are retried", () => {
  // Worth retrying: the block is attested but not yet indexed, or the service
  // is briefly unhappy.
  for (const message of [
    "block not attested yet",
    "height not yet available",
    "request timed out",
    "503 Service Unavailable",
    "429 Too Many Requests",
    "retriable error",
  ]) {
    assert.equal(isRetriableProofError(message), true, `"${message}" should retry`);
  }

  // Never worth retrying: the input itself is wrong.
  for (const message of [
    "transaction not found",
    "InvalidChainKey: chain key not configured",
    "malformed request",
  ]) {
    assert.equal(isRetriableProofError(message), false, `"${message}" should not retry`);
  }
});
