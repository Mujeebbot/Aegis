"use strict";

/**
 * AscClient - the only code in the repo that spends money.
 *
 * The behaviours under test are the ones that decide whether gas is burned:
 * simulating before sending, refusing an implausible gas estimate, classifying
 * a revert as permanent or retriable, and correctly reading back whether the
 * user actually ended up protected.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { Interface } = require("ethers");

const { AscClient, decodeRevert, isPermanentRevert } = require("../src/chain/asc");
const SETTLEMENT_ABI = require("../abi/LiquidationShieldSettlement.json");
const { createLogger } = require("../src/lib/logger");

const logger = createLogger("test", { level: "error" });

const ASC_ADDRESS = `0x${"11".repeat(20)}`;
const SETTLEMENT_ADDRESS = `0x${"22".repeat(20)}`;
const USER = `0x${"aa".repeat(20)}`;

const baseParams = () => ({
  chainKey: 1,
  blockHeight: 11660790,
  encodedTx: "0xdeadbeef",
  merkleProofBytes: "0x00",
  continuityProofBytes: "0x00",
  user: USER,
});

function makeConfig(overrides = {}) {
  return {
    contracts: { asc: ASC_ADDRESS },
    creditcoin: { chainId: 102031 },
    signer: { maxGasLimit: 3_000_000n, confirmations: 1 },
    dryRun: false,
    ...overrides,
  };
}

/**
 * Build an AscClient whose contract handle is a controllable fake.
 * The real constructor needs an ethers provider, so it is stubbed and the
 * resulting contract properties are replaced.
 */
function makeClient({
  config = makeConfig(),
  staticResult = true,
  staticError = null,
  gasEstimate = 150_000n,
  sendError = null,
  receipt = { status: 1, blockNumber: 42, gasUsed: 120_000n, logs: [] },
  canSubmit = async () => 10n ** 18n,
  hasWallet = true,
} = {}) {
  const sent = [];

  const creditcoin = {
    provider: { getCode: async () => "0x6080", getBalance: async () => 10n ** 18n },
    wallet: hasWallet ? { address: `0x${"bb".repeat(20)}` } : null,
    assertCanSubmit: canSubmit,
  };

  const client = new AscClient({ config, logger, creditcoin });

  const verifyPosition = async (...args) => {
    const overrides = args[args.length - 1];
    sent.push({ args: args.slice(0, 6), overrides });
    if (sendError) throw sendError;
    return { hash: "0xtxhash", wait: async () => receipt };
  };
  verifyPosition.staticCall = async () => {
    if (staticError) throw staticError;
    return staticResult;
  };
  verifyPosition.estimateGas = async () => gasEstimate;

  const fake = { verifyPosition };
  client.readContract = fake;
  client.writeContract = hasWallet ? fake : null;

  return { client, sent, creditcoin };
}

/** Encode a genuine PositionProtected log so the parser is tested for real. */
function protectionLog({ user = USER, healthFactorWad = 10n ** 18n, action = 1 } = {}) {
  const iface = new Interface(SETTLEMENT_ABI);
  const encoded = iface.encodeEventLog("PositionProtected", [user, healthFactorWad, action]);
  return { address: SETTLEMENT_ADDRESS, topics: encoded.topics, data: encoded.data };
}

// --- the happy path ---------------------------------------------------------

test("simulates, estimates, sends, and reports the receipt", async () => {
  const { client, sent } = makeClient({
    receipt: { status: 1, blockNumber: 42, gasUsed: 120_000n, logs: [protectionLog()] },
  });

  const result = await client.verifyPosition(baseParams());

  assert.equal(result.submitted, true);
  assert.equal(result.txHash, "0xtxhash");
  assert.equal(result.blockNumber, 42);
  assert.equal(result.gasUsed, "120000");
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].args.slice(0, 2), [1, 11660790]);
  assert.equal(sent[0].args[5], USER);
});

test("adds 25% gas headroom over the estimate", async () => {
  const { client, sent } = makeClient({ gasEstimate: 200_000n });
  await client.verifyPosition(baseParams());
  // State can shift between estimating and inclusion.
  assert.equal(sent[0].overrides.gasLimit, 250_000n);
});

test("decodes the PositionProtected event into a readable action", async () => {
  const { client } = makeClient({
    receipt: {
      status: 1,
      blockNumber: 1,
      gasUsed: 1n,
      // action 2 = Rebalance, per the ProtectionAction enum ordering.
      logs: [protectionLog({ action: 2, healthFactorWad: 1020000000000000000n })],
    },
  });

  const result = await client.verifyPosition(baseParams());
  assert.equal(result.protection.action, "Rebalance");
  assert.equal(result.protection.healthFactorWad, "1020000000000000000");
  assert.equal(result.protection.user.toLowerCase(), USER);
});

test("ignores unrelated logs when looking for PositionProtected", async () => {
  const { client } = makeClient({
    receipt: {
      status: 1,
      blockNumber: 1,
      gasUsed: 1n,
      logs: [
        // An ERC-20 Transfer from some other contract must not break parsing.
        { address: `0x${"99".repeat(20)}`, topics: [`0x${"cd".repeat(32)}`], data: "0x" },
        protectionLog({ action: 1 }),
      ],
    },
  });

  const result = await client.verifyPosition(baseParams());
  assert.equal(result.protection.action, "StopLoss");
});

test("succeeds but reports no protection when Settlement emitted nothing", async () => {
  // The ASC verified the proof but never reached Settlement: the transaction
  // succeeded while the user is NOT protected. That must be visible.
  const { client } = makeClient({ receipt: { status: 1, blockNumber: 1, gasUsed: 1n, logs: [] } });
  const result = await client.verifyPosition(baseParams());
  assert.equal(result.submitted, true);
  assert.equal(result.protection, null);
});

// --- refusing to spend gas --------------------------------------------------

test("a simulated revert is surfaced before anything is sent", async () => {
  const { client, sent } = makeClient({
    staticError: Object.assign(new Error("execution reverted"), { reason: "Position safe" }),
  });

  await assert.rejects(
    () => client.verifyPosition(baseParams()),
    (err) => {
      assert.match(err.message, /would revert: Position safe/);
      // "Position safe" is a correct rejection - retrying would be wrong.
      assert.equal(err.retriable, false);
      return true;
    },
  );
  assert.equal(sent.length, 0, "nothing may be sent after a failed simulation");
});

test("an unrecognised revert stays retriable", async () => {
  const { client } = makeClient({
    staticError: Object.assign(new Error("execution reverted"), { reason: "nonce too low" }),
  });
  const err = await client.verifyPosition(baseParams()).catch((e) => e);
  assert.equal(err.retriable, true);
});

test("a simulation returning false is treated as a permanent rejection", async () => {
  const { client, sent } = makeClient({ staticResult: false });
  await assert.rejects(
    () => client.verifyPosition(baseParams()),
    (err) => {
      assert.match(err.message, /returned false/);
      assert.equal(err.retriable, false);
      return true;
    },
  );
  assert.equal(sent.length, 0);
});

test("refuses a gas estimate above the configured ceiling", async () => {
  // A wildly high estimate means we are talking to the wrong contract; better
  // to fail than to drain the hot wallet finding out.
  const { client, sent } = makeClient({ gasEstimate: 9_000_000n });
  await assert.rejects(
    () => client.verifyPosition(baseParams()),
    (err) => {
      assert.match(err.message, /exceeds ORACLE_MAX_GAS_LIMIT/);
      assert.equal(err.retriable, false);
      return true;
    },
  );
  assert.equal(sent.length, 0);
});

test("refuses to submit when the signer is underfunded", async () => {
  const { client, sent } = makeClient({
    canSubmit: async () => {
      throw new Error("Signer 0xbb has 0.0 tCTC, below the 0.01 minimum");
    },
  });
  await assert.rejects(() => client.verifyPosition(baseParams()), /below the 0.01 minimum/);
  assert.equal(sent.length, 0);
});

test("a reverted receipt is reported as a failure, not a success", async () => {
  const { client } = makeClient({
    receipt: { status: 0, blockNumber: 7, gasUsed: 21_000n, logs: [] },
  });
  await assert.rejects(
    () => client.verifyPosition(baseParams()),
    (err) => {
      assert.match(err.message, /transaction reverted/);
      assert.equal(err.retriable, false);
      assert.equal(err.result.txHash, "0xtxhash");
      return true;
    },
  );
});

// --- dry run ----------------------------------------------------------------

test("a dry run simulates and estimates but never sends", async () => {
  const { client, sent } = makeClient({ config: makeConfig({ dryRun: true }) });
  const result = await client.verifyPosition(baseParams());

  assert.equal(result.submitted, false);
  assert.equal(result.dryRun, true);
  assert.equal(result.gasEstimate, "150000");
  assert.equal(sent.length, 0, "dry run must not send a transaction");
});

test("a dry run works without a signer", async () => {
  const { client } = makeClient({ hasWallet: false, config: makeConfig({ dryRun: true }) });
  const result = await client.verifyPosition(baseParams(), { dryRun: true });
  assert.equal(result.dryRun, true);
});

test("submitting without a signer fails permanently", async () => {
  const { client } = makeClient({ hasWallet: false });
  await assert.rejects(
    () => client.verifyPosition(baseParams()),
    (err) => {
      assert.match(err.message, /no signer/);
      assert.equal(err.retriable, false);
      return true;
    },
  );
});

// --- deployment check -------------------------------------------------------

test("assertDeployed rejects an address with no code", async () => {
  const client = new AscClient({
    config: makeConfig(),
    logger,
    creditcoin: { provider: { getCode: async () => "0x" }, wallet: null },
  });
  await assert.rejects(() => client.assertDeployed(), /No contract deployed at/);
});

test("assertDeployed passes when code is present", async () => {
  const client = new AscClient({
    config: makeConfig(),
    logger,
    creditcoin: { provider: { getCode: async () => "0x6080604052" }, wallet: null },
  });
  assert.equal(await client.assertDeployed(), true);
});

// --- revert classification --------------------------------------------------

test("decodeRevert reads a reason from each ethers error shape", () => {
  assert.equal(decodeRevert({ revert: { args: ["Position safe"] } }), "Position safe");
  assert.equal(decodeRevert({ reason: "Only ASC" }), "Only ASC");
  assert.equal(decodeRevert({ info: { error: { message: "rpc says no" } } }), "rpc says no");
  assert.equal(decodeRevert({ shortMessage: "short" }), "short");
  assert.equal(decodeRevert({ message: "plain" }), "plain");
  assert.equal(decodeRevert({}), "unknown reason");
});

test("isPermanentRevert distinguishes correct rejections from transient faults", () => {
  // These are the contract telling us "no" for good reason.
  for (const reason of [
    "Position safe",
    "position safe",
    "Only ASC",
    "Invalid proof",
    "Proof verification failed",
  ]) {
    assert.equal(isPermanentRevert(reason), true, `${reason} should be permanent`);
  }
  // These might succeed on a retry.
  for (const reason of ["nonce too low", "replacement underpriced", "timeout", ""]) {
    assert.equal(isPermanentRevert(reason), false, `${reason} should be retriable`);
  }
});
