"use strict";

/**
 * The chainKey registry, and the fact that both services carry the same copy.
 *
 * `src/chains.js` is duplicated in ai-monitor and oracle-worker so each service
 * stays independently deployable. That is a deliberate trade, but it creates a
 * drift hazard: if the monitor decides chainId 11155111 is chainKey 1 and the
 * worker disagrees, the worker proves a transaction on the wrong chain and the
 * proof is valid evidence of the wrong thing.
 *
 * Two defences, both here:
 *   1. this test fails the moment the two copies stop being byte-identical
 *   2. `npm run test-connection` checks the table against the live ChainInfo
 *      precompile, which is the actual authority
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
  CHAINS,
  getChainByChainId,
  getChainByChainKey,
  toChainKey,
  isSupportedChainId,
  listChains,
} = require("../src/chains");

test("the two services carry an identical chain registry", () => {
  const worker = path.resolve(__dirname, "..", "src", "chains.js");
  const monitor = path.resolve(__dirname, "..", "..", "ai-monitor", "src", "chains.js");

  // Skip rather than fail if the sibling service is not checked out alongside.
  if (!fs.existsSync(monitor)) return;

  assert.equal(
    fs.readFileSync(worker, "utf8"),
    fs.readFileSync(monitor, "utf8"),
    "ai-monitor/src/chains.js and oracle-worker/src/chains.js have diverged - " +
      "a chainKey disagreement makes the worker prove the wrong chain",
  );
});

test("maps chainId to chainKey the way the precompile does", () => {
  // Verified against the live CC3 ChainInfo precompile. Note these are NOT the
  // same numbers, and the obvious guess (chainKey 1 == Ethereum) is wrong.
  assert.equal(toChainKey(11155111), 1, "Sepolia is chainKey 1");
  assert.equal(toChainKey(1), 3, "Ethereum mainnet is chainKey 3");
});

test("lookups work in both directions", () => {
  assert.equal(getChainByChainId(11155111).chainKey, 1);
  assert.equal(getChainByChainKey(1).chainId, 11155111);
  assert.equal(getChainByChainId(1).chainKey, 3);
  assert.equal(getChainByChainKey(3).chainId, 1);
});

test("lookups accept numeric strings", () => {
  // Route params and env vars arrive as strings.
  assert.equal(getChainByChainId("11155111").chainKey, 1);
  assert.equal(getChainByChainKey("3").chainId, 1);
  assert.equal(toChainKey("11155111"), 1);
});

test("unknown chains are reported, not guessed", () => {
  assert.equal(getChainByChainId(999999), null);
  assert.equal(getChainByChainKey(42), null);
  assert.equal(isSupportedChainId(999999), false);
  assert.equal(isSupportedChainId(11155111), true);

  // Throwing beats defaulting: a silent fallback would prove the wrong chain.
  assert.throws(() => toChainKey(999999), /Unsupported chainId 999999/);
  assert.throws(() => toChainKey(999999), /Attested source chains: 11155111, 1/);
});

test("chainId and chainKey spaces do not collide by accident", () => {
  // chainId 1 and chainKey 1 are different chains. If someone ever passes a
  // chainId where a chainKey is expected, it must not silently resolve.
  assert.notEqual(getChainByChainId(1).chainKey, 1);
  assert.notEqual(getChainByChainKey(1).chainId, 1);
});

test("every registry entry is complete and internally consistent", () => {
  for (const chain of CHAINS) {
    assert.equal(typeof chain.chainId, "number", `${chain.name} chainId`);
    assert.equal(typeof chain.chainKey, "number", `${chain.name} chainKey`);
    assert.ok(chain.name, "every chain needs a display name");
    assert.ok(chain.rpcEnvVar, `${chain.name} needs an RPC env var name`);
    // Round-trip through both indexes.
    assert.equal(getChainByChainKey(chain.chainKey).chainId, chain.chainId);
    assert.equal(getChainByChainId(chain.chainId).chainKey, chain.chainKey);
  }

  const chainIds = CHAINS.map((c) => c.chainId);
  const chainKeys = CHAINS.map((c) => c.chainKey);
  assert.equal(new Set(chainIds).size, chainIds.length, "duplicate chainId");
  assert.equal(new Set(chainKeys).size, chainKeys.length, "duplicate chainKey");
});

test("listChains returns copies, so callers cannot mutate the registry", () => {
  const listed = listChains();
  listed[0].chainKey = 999;
  assert.notEqual(getChainByChainId(listed[0].chainId).chainKey, 999);
});
