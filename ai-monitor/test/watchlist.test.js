"use strict";

/**
 * Watchlist registry and config validation.
 *
 * The watchlist decides what gets monitored at all, so a silently dropped entry
 * means a position nobody is watching. Persistence matters because a demo has
 * to survive a restart.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { Watchlist } = require("../src/watchlist");
const { parseSubgraphIds } = require("../src/config");
const { createLogger } = require("../src/lib/logger");
const { parseUnits, wadToNumber } = require("../src/lib/units");

const logger = createLogger("test", { level: "error" });

const USER = `0x${"aa".repeat(20)}`;
const CHAIN_ID = 11155111;

function makeConfig(overrides = {}) {
  return {
    risk: {
      defaultThresholdWad: parseUnits("1.05"),
      criticalThresholdWad: parseUnits("1.01"),
      alertCooldownMs: 300_000,
      forecastHorizonSec: 900,
      historySize: 40,
    },
    watchlist: [],
    ...overrides,
  };
}

const makeWatchlist = (config = makeConfig(), filePath = null) =>
  new Watchlist({ logger, config, filePath });

// --- add / validation -------------------------------------------------------

test("adds an entry with the default threshold", () => {
  const wl = makeWatchlist();
  const entry = wl.add({ user: USER, chainId: CHAIN_ID });
  assert.equal(entry.user, USER);
  assert.equal(wadToNumber(entry.thresholdWad), 1.05);
  assert.equal(wl.size, 1);
});

test("lowercases the address so lookups are case-insensitive", () => {
  const wl = makeWatchlist();
  wl.add({ user: USER.toUpperCase(), chainId: CHAIN_ID });
  assert.ok(wl.get(USER, CHAIN_ID));
  assert.ok(wl.get(USER.toUpperCase(), CHAIN_ID));
});

test("re-adding the same position updates rather than duplicating", () => {
  const wl = makeWatchlist();
  const first = wl.add({ user: USER, chainId: CHAIN_ID, threshold: "1.04" });
  const second = wl.add({ user: USER, chainId: CHAIN_ID, threshold: "1.02" });

  assert.equal(wl.size, 1);
  assert.equal(wadToNumber(second.thresholdWad), 1.02);
  // The original registration time is preserved across updates.
  assert.equal(second.addedAt, first.addedAt);
});

test("an update preserves fields the caller omitted", () => {
  const wl = makeWatchlist();
  const tx = `0x${"11".repeat(32)}`;
  wl.add({ user: USER, chainId: CHAIN_ID, sourceTxHash: tx, protocol: "aave-v3" });
  const updated = wl.add({ user: USER, chainId: CHAIN_ID, threshold: "1.03" });

  assert.equal(updated.sourceTxHash, tx, "must not lose the tx hash on a threshold change");
  assert.equal(updated.protocol, "aave-v3");
});

test("rejects a malformed address or unsupported chain", () => {
  const wl = makeWatchlist();
  assert.throws(() => wl.add({ user: "nope", chainId: CHAIN_ID }), /Invalid EVM address/);
  assert.throws(() => wl.add({ user: USER, chainId: 999999 }), /Unsupported chainId/);

  // Both carry a 400 so the API layer maps them to a client error.
  const err = (() => {
    try {
      wl.add({ user: "nope", chainId: CHAIN_ID });
    } catch (e) {
      return e;
    }
  })();
  assert.equal(err.statusCode, 400);
});

test("refuses a threshold above the contract's SAFE_THRESHOLD", () => {
  // Settlement.protectPosition requires healthFactor < 1.05e18, so a higher
  // alert threshold would only ever produce reverting submissions.
  const wl = makeWatchlist();
  assert.throws(() => wl.add({ user: USER, chainId: CHAIN_ID, threshold: "1.5" }), /SAFE_THRESHOLD/);
});

test("accepts a threshold at or below the ceiling", () => {
  const wl = makeWatchlist();
  assert.equal(wadToNumber(wl.add({ user: USER, chainId: CHAIN_ID, threshold: "1.05" }).thresholdWad), 1.05);
  assert.equal(wadToNumber(wl.add({ user: USER, chainId: CHAIN_ID, threshold: "1.01" }).thresholdWad), 1.01);
});

test("an empty threshold falls back to the default", () => {
  const wl = makeWatchlist();
  for (const threshold of ["", null, undefined]) {
    const entry = wl.add({ user: USER, chainId: CHAIN_ID, threshold });
    assert.equal(wadToNumber(entry.thresholdWad), 1.05);
  }
});

test("remove reports whether anything was removed", () => {
  const wl = makeWatchlist();
  wl.add({ user: USER, chainId: CHAIN_ID });
  assert.equal(wl.remove(USER, CHAIN_ID), true);
  assert.equal(wl.remove(USER, CHAIN_ID), false);
  assert.equal(wl.size, 0);
});

// --- env seeding ------------------------------------------------------------

test("seeds from the AI_MONITOR_WATCHLIST format", () => {
  const wl = makeWatchlist(
    makeConfig({ watchlist: [`${CHAIN_ID}:${USER}`, `${CHAIN_ID}:${USER.replace("aa", "bb")}:aave-v3`] }),
  );
  wl.init();
  assert.equal(wl.size, 2);
  assert.equal(wl.get(USER, CHAIN_ID).source, "env");
});

test("skips malformed seed entries instead of refusing to boot", () => {
  // One bad entry in a comma-separated list must not stop the service.
  const wl = makeWatchlist(
    makeConfig({
      watchlist: ["garbage", `999999:${USER}`, `${CHAIN_ID}:not-an-address`, `${CHAIN_ID}:${USER}`],
    }),
  );
  wl.init();
  assert.equal(wl.size, 1);
  assert.ok(wl.get(USER, CHAIN_ID));
});

// --- cooldown ---------------------------------------------------------------

test("cooldown suppresses a repeat alert at the same risk level", () => {
  const wl = makeWatchlist();
  wl.add({ user: USER, chainId: CHAIN_ID });

  assert.equal(wl.shouldAlert(USER, CHAIN_ID, "AT_RISK"), true);
  wl.markAlerted(USER, CHAIN_ID, "AT_RISK");
  assert.equal(wl.shouldAlert(USER, CHAIN_ID, "AT_RISK"), false);

  // ...but not forever.
  const later = Date.now() + 300_001;
  assert.equal(wl.shouldAlert(USER, CHAIN_ID, "AT_RISK", later), true);
});

test("an escalation breaks through the cooldown immediately", () => {
  const wl = makeWatchlist();
  wl.add({ user: USER, chainId: CHAIN_ID });
  wl.markAlerted(USER, CHAIN_ID, "AT_RISK");
  // A position that has gone critical deserves a fresh attempt right away.
  assert.equal(wl.shouldAlert(USER, CHAIN_ID, "CRITICAL"), true);
});

test("an unknown position is always allowed to alert", () => {
  assert.equal(makeWatchlist().shouldAlert(USER, CHAIN_ID, "AT_RISK"), true);
});

// --- persistence ------------------------------------------------------------

test("entries survive a restart", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aegis-wl-"));
  const file = path.join(dir, "watchlist.json");
  try {
    const first = makeWatchlist(makeConfig(), file);
    first.add({ user: USER, chainId: CHAIN_ID, threshold: "1.03" });

    const second = makeWatchlist(makeConfig(), file);
    second.init();

    const restored = second.get(USER, CHAIN_ID);
    assert.ok(restored, "entry should be restored from disk");
    // thresholdWad must come back as a BigInt, not the string it was stored as.
    assert.equal(typeof restored.thresholdWad, "bigint");
    assert.equal(wadToNumber(restored.thresholdWad), 1.03);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("a corrupt watchlist file does not stop the monitor booting", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aegis-wl-"));
  const file = path.join(dir, "watchlist.json");
  try {
    fs.writeFileSync(file, "{ this is not json");
    const wl = makeWatchlist(makeConfig(), file);
    wl.init();
    assert.equal(wl.size, 0, "should start empty rather than throw");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("serialize produces a JSON-safe view", () => {
  const wl = makeWatchlist();
  const entry = wl.add({ user: USER, chainId: CHAIN_ID, threshold: "1.04" });
  const json = wl.serialize(entry);

  // BigInt is not JSON-serialisable; both forms must be present.
  assert.equal(json.threshold, 1.04);
  assert.equal(json.thresholdWad, "1040000000000000000");
  assert.doesNotThrow(() => JSON.stringify(json));
});

// --- config helpers ---------------------------------------------------------

test("parseSubgraphIds parses the protocol:chain=id format", () => {
  const parsed = parseSubgraphIds("aave-v3:11155111=QmAbc,compound-v3:1=QmDef");
  assert.equal(parsed["aave-v3:11155111"], "QmAbc");
  assert.equal(parsed["compound-v3:1"], "QmDef");
  assert.deepEqual(parseSubgraphIds(""), {});
});

test("parseSubgraphIds accepts a full URL for self-hosted endpoints", () => {
  const parsed = parseSubgraphIds("aave-v3:11155111=https://api.example.com/subgraphs/aave");
  assert.equal(parsed["aave-v3:11155111"], "https://api.example.com/subgraphs/aave");
});

test("parseSubgraphIds rejects an entry with no id", () => {
  assert.throws(() => parseSubgraphIds("aave-v3:11155111"), /must be key=id/);
});
