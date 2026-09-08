"use strict";

/**
 * Configuration validation and the Creditcoin connection guards.
 *
 * The worker signs transactions, so a misconfiguration is more expensive here
 * than anywhere else in the stack. Everything below is about failing loudly at
 * boot instead of quietly at submission time.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { load, isAddress, isTxHash } = require("../src/config");
const { CreditcoinClient, normalizeKey } = require("../src/chain/creditcoin");
const { createLogger } = require("../src/lib/logger");

const logger = createLogger("test", { level: "error" });

const ADDRESS = `0x${"11".repeat(20)}`;
const KEY = "a".repeat(64);

/** Run `load()` against a scratch environment, then restore the real one. */
function withEnv(vars, fn) {
  const saved = {};
  const keys = new Set([
    ...Object.keys(vars),
    "ASC_CONTRACT_ADDRESS",
    "SETTLEMENT_CONTRACT_ADDRESS",
    "DEPLOYER_PRIVATE_KEY",
    "SOURCE_CHAIN_TXN_HASH",
    "ORACLE_QUEUE_MAX_ATTEMPTS",
    "ORACLE_QUEUE_CONCURRENCY",
    "CREDITCOIN_RPC_URL",
  ]);
  for (const key of keys) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
  Object.assign(process.env, vars);
  try {
    return fn();
  } finally {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key];
      else process.env[key] = saved[key];
    }
  }
}

// --- validators -------------------------------------------------------------

test("address and tx-hash validators accept valid input only", () => {
  assert.equal(isAddress(ADDRESS), true);
  assert.equal(isAddress("0x123"), false);
  assert.equal(isAddress(`0x${"11".repeat(32)}`), false, "a tx hash is not an address");

  assert.equal(isTxHash(`0x${"ab".repeat(32)}`), true);
  assert.equal(isTxHash(ADDRESS), false, "an address is not a tx hash");
  assert.equal(isTxHash("0xabc"), false);
});

// --- config validation ------------------------------------------------------

test("loads with sensible defaults and no configuration at all", () => {
  const config = withEnv({}, () => load());
  assert.equal(config.creditcoin.chainId, 102031);
  assert.match(config.creditcoin.rpcUrl, /creditcoin/);
  assert.equal(config.dryRun, false);
  assert.equal(config.proofs.preflight, true);
  // Absent contracts are allowed at boot - the worker starts and reports it on
  // /readyz rather than refusing to run.
  assert.equal(config.contracts.asc, "");
});

test("rejects a malformed contract address", () => {
  assert.throws(
    () => withEnv({ ASC_CONTRACT_ADDRESS: "0xnope" }, () => load()),
    /ASC_CONTRACT_ADDRESS is not a valid address/,
  );
});

test("rejects a malformed private key", () => {
  assert.throws(
    () => withEnv({ DEPLOYER_PRIVATE_KEY: "tooshort" }, () => load()),
    /must be a 32-byte hex private key/,
  );
});

test("accepts a private key with or without the 0x prefix", () => {
  for (const key of [KEY, `0x${KEY}`]) {
    const config = withEnv({ DEPLOYER_PRIVATE_KEY: key }, () => load());
    assert.equal(config.signer.privateKey, key);
  }
});

test("requireSigner demands the pieces needed to actually submit", () => {
  assert.throws(
    () => withEnv({}, () => load({ requireSigner: true })),
    /DEPLOYER_PRIVATE_KEY is required/,
  );
  assert.throws(
    () => withEnv({ DEPLOYER_PRIVATE_KEY: KEY }, () => load({ requireSigner: true })),
    /ASC_CONTRACT_ADDRESS is required/,
  );

  const ok = withEnv({ DEPLOYER_PRIVATE_KEY: KEY, ASC_CONTRACT_ADDRESS: ADDRESS }, () =>
    load({ requireSigner: true }),
  );
  assert.equal(ok.contracts.asc, ADDRESS);
});

test("rejects a malformed fallback transaction hash", () => {
  assert.throws(
    () => withEnv({ SOURCE_CHAIN_TXN_HASH: "0x1234" }, () => load()),
    /SOURCE_CHAIN_TXN_HASH is not a 32-byte hash/,
  );
});

test("rejects nonsensical queue settings", () => {
  assert.throws(
    () => withEnv({ ORACLE_QUEUE_MAX_ATTEMPTS: "0" }, () => load()),
    /ORACLE_QUEUE_MAX_ATTEMPTS must be >= 1/,
  );
  assert.throws(
    () => withEnv({ ORACLE_QUEUE_CONCURRENCY: "0" }, () => load()),
    /ORACLE_QUEUE_CONCURRENCY must be >= 1/,
  );
});

test("rejects a non-numeric numeric setting", () => {
  assert.throws(
    () => withEnv({ ORACLE_QUEUE_CONCURRENCY: "lots" }, () => load()),
    /must be a number/,
  );
});

test("reports every configuration problem at once", () => {
  // One error per boot attempt would make fixing a fresh .env tedious.
  const err = (() => {
    try {
      withEnv({ ASC_CONTRACT_ADDRESS: "0xbad", DEPLOYER_PRIVATE_KEY: "bad" }, () => load());
      return null;
    } catch (e) {
      return e;
    }
  })();
  assert.ok(err);
  assert.match(err.message, /ASC_CONTRACT_ADDRESS/);
  assert.match(err.message, /DEPLOYER_PRIVATE_KEY/);
});

// --- signer key handling ----------------------------------------------------

test("normalizeKey adds the 0x prefix ethers v6 requires", () => {
  // .env files routinely omit it, and ethers v6 rejects the bare form.
  assert.equal(normalizeKey(KEY), `0x${KEY}`);
  assert.equal(normalizeKey(`0x${KEY}`), `0x${KEY}`);
});

// --- connection guards ------------------------------------------------------

/** A CreditcoinClient with its provider replaced. */
function makeClient({ chainId = 102031, balance = 10n ** 18n, privateKey = KEY } = {}) {
  const config = {
    creditcoin: { rpcUrl: "http://rpc.test", chainId: 102031 },
    signer: { privateKey, minBalanceWei: 10n ** 16n },
  };
  const client = new CreditcoinClient({ config, logger });
  client.provider = {
    getNetwork: async () => ({ chainId: BigInt(chainId) }),
    getBlockNumber: async () => 5_000_000,
    getBalance: async () => balance,
  };
  if (client.wallet) client.wallet = { address: `0x${"bb".repeat(20)}` };
  return client;
}

test("connect refuses a wrong chain rather than proceeding", async () => {
  // Pointing at the wrong RPC would submit proofs to a chain with no ASC.
  const client = makeClient({ chainId: 1 });
  await assert.rejects(() => client.connect(), /Connected to chainId 1 but CREDITCOIN_CHAIN_ID is 102031/);
});

test("connect reports chain and signer details on success", async () => {
  const info = await makeClient().connect();
  assert.equal(info.chainId, 102031);
  assert.equal(info.blockNumber, 5_000_000);
  assert.equal(info.underfunded, undefined);
});

test("connect flags an underfunded signer without refusing to boot", async () => {
  // The worker should still start and serve /readyz so the problem is visible.
  const info = await makeClient({ balance: 0n }).connect();
  assert.equal(info.underfunded, true);
});

test("assertCanSubmit blocks a submission below the minimum balance", async () => {
  const client = makeClient({ balance: 1n });
  await assert.rejects(() => client.assertCanSubmit(), /below the/);
});

test("assertCanSubmit passes when funded", async () => {
  const client = makeClient();
  assert.equal(await client.assertCanSubmit(), 10n ** 18n);
});

test("assertCanSubmit refuses when no signer is configured", async () => {
  const client = makeClient({ privateKey: "" });
  assert.equal(client.address, null);
  await assert.rejects(() => client.assertCanSubmit(), /No signer configured/);
});
