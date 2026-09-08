"use strict";

/**
 * Pipeline + queue behaviour, with the chain and the proof builder faked.
 *
 * The properties under test are the ones that cost real money if wrong:
 * de-duplication, not retrying permanent failures, and not submitting when the
 * position has already recovered.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { Pipeline, validateAlert } = require("../src/pipeline");
const { JobQueue, JobState, deriveAlertId } = require("../src/queue");
const { createLogger } = require("../src/lib/logger");

const logger = createLogger("test", { level: "error" });

const USER = "0xaaaa0000000000000000000000000000000000aa";
const CHAIN_ID = 11155111;
const CHAIN_KEY = 1;
const TX = `0x${"ab".repeat(32)}`;
const h = (n) => `0x${String(n).padStart(64, "0")}`;

function baseAlert(overrides = {}) {
  return {
    alertId: "alert_test_0001",
    user: USER,
    chainId: CHAIN_ID,
    chainKey: CHAIN_KEY,
    healthFactor: 1.01,
    healthFactorWad: "1010000000000000000",
    isAtRisk: true,
    observedAt: new Date().toISOString(),
    risk: { level: "AT_RISK" },
    ...overrides,
  };
}

const proofData = {
  chainKey: CHAIN_KEY,
  headerNumber: 11660790,
  txIndex: 0,
  txHash: TX,
  txBytes: "0xdeadbeef",
  merkleProof: { root: h(1), siblings: [{ hash: h(2), isLeft: true }] },
  continuityProof: { lowerEndpointDigest: h(3), roots: [h(4), h(5)] },
  cached: false,
};

/** Assemble a pipeline over controllable fakes. */
function makePipeline({
  buildProof = async () => proofData,
  verifyPosition = async () => ({ submitted: true, txHash: "0xtx", protection: null }),
  resolve = async () => ({ txHash: TX, source: "alert" }),
  recheckRisk = async () => null,
  preflightVerify = async () => ({ verified: true }),
} = {}) {
  const calls = { buildProof: 0, verifyPosition: 0, preflight: 0, submissions: [] };

  const pipeline = new Pipeline({
    config: { dryRun: false },
    logger,
    proofService: {
      buildProof: async (...args) => {
        calls.buildProof += 1;
        return buildProof(...args);
      },
      preflightVerify: async (...args) => {
        calls.preflight += 1;
        return preflightVerify(...args);
      },
    },
    ascClient: {
      verifyPosition: async (params) => {
        calls.verifyPosition += 1;
        calls.submissions.push(params);
        return verifyPosition(params);
      },
    },
    txResolver: { resolve, recheckRisk },
  });

  return { pipeline, calls };
}

const job = (alert) => ({ id: "job_1", alertId: alert.alertId, alert });

// --- alert validation -------------------------------------------------------

test("accepts a well-formed alert", () => {
  assert.doesNotThrow(() => validateAlert(baseAlert()));
});

test("rejects malformed alerts permanently, so the queue will not retry them", () => {
  const cases = [
    [{ user: "nope" }, /valid EVM address/],
    [{ chainId: "abc" }, /chainId must be an integer/],
    [{ isAtRisk: false }, /isAtRisk must be true/],
    [{ healthFactor: undefined, healthFactorWad: undefined }, /healthFactor/],
    [{ sourceTxHash: "0x1234" }, /32-byte hash/],
  ];
  for (const [override, pattern] of cases) {
    const err = (() => {
      try {
        validateAlert(baseAlert(override));
        return null;
      } catch (e) {
        return e;
      }
    })();
    assert.ok(err, `expected a throw for ${JSON.stringify(override)}`);
    assert.match(err.message, pattern);
    assert.equal(err.retriable, false, "validation errors must never be retried");
  }
});

// --- pipeline ---------------------------------------------------------------

test("runs the full path and submits the encoded proof", async () => {
  const { pipeline, calls } = makePipeline();
  const result = await pipeline.process(job(baseAlert()), logger);

  assert.equal(result.skipped, false);
  assert.equal(result.txHash, "0xtx");
  assert.equal(calls.buildProof, 1);
  assert.equal(calls.preflight, 1);
  assert.equal(calls.verifyPosition, 1);

  // The ASC receives the proofs as ABI-encoded bytes, not as structs.
  const submitted = calls.submissions[0];
  assert.equal(submitted.chainKey, CHAIN_KEY);
  assert.equal(submitted.blockHeight, proofData.headerNumber);
  assert.equal(submitted.user, USER);
  assert.match(submitted.merkleProofBytes, /^0x[0-9a-f]+$/);
  assert.match(submitted.continuityProofBytes, /^0x[0-9a-f]+$/);
  assert.equal(submitted.encodedTx, "0xdeadbeef");

  // Every step is recorded for the /jobs/:id view.
  assert.deepEqual(
    result.steps.map((s) => s.step),
    ["resolve-tx", "build-proof", "preflight", "encode", "submit"],
  );
});

test("skips submission when the position recovered while queued", async () => {
  // Proof generation takes minutes; submitting a recovered position would
  // revert with "Position safe" after the gas is already spent.
  const { pipeline, calls } = makePipeline({
    recheckRisk: async () => ({ isAtRisk: false, healthFactor: 1.4 }),
  });

  const result = await pipeline.process(job(baseAlert()), logger);

  assert.equal(result.skipped, true);
  assert.equal(result.reason, "position-recovered");
  assert.equal(calls.buildProof, 0, "must not even build a proof");
  assert.equal(calls.verifyPosition, 0);
});

test("proceeds when the risk re-check is unavailable", async () => {
  // An ai-monitor outage must not block protection.
  const { pipeline, calls } = makePipeline({ recheckRisk: async () => null });
  const result = await pipeline.process(job(baseAlert()), logger);
  assert.equal(result.skipped, false);
  assert.equal(calls.verifyPosition, 1);
});

test("refuses an alert whose chainKey contradicts its chainId", async () => {
  // Proving against the wrong chain would attest someone else's transaction.
  const { pipeline, calls } = makePipeline();
  await assert.rejects(
    () => pipeline.process(job(baseAlert({ chainKey: 3 })), logger),
    (err) => {
      assert.match(err.message, /does not match chainId/);
      assert.equal(err.retriable, false);
      return true;
    },
  );
  assert.equal(calls.buildProof, 0);
});

test("refuses a proof returned for the wrong chainKey", async () => {
  const { pipeline } = makePipeline({
    buildProof: async () => ({ ...proofData, chainKey: 3 }),
  });
  await assert.rejects(
    () => pipeline.process(job(baseAlert()), logger),
    /Proof builder returned chainKey 3/,
  );
});

test("a dry run reports itself and produces no transaction hash", async () => {
  const { pipeline } = makePipeline({
    verifyPosition: async () => ({ submitted: false, dryRun: true, gasEstimate: "150000" }),
  });
  const result = await pipeline.process(job(baseAlert()), logger);
  assert.equal(result.dryRun, true);
  assert.equal(result.txHash, null);
});

test("surfaces the PositionProtected event when Settlement emits one", async () => {
  const { pipeline } = makePipeline({
    verifyPosition: async () => ({
      submitted: true,
      txHash: "0xtx",
      protection: { user: USER, healthFactorWad: "1010000000000000000", action: "StopLoss" },
    }),
  });
  const result = await pipeline.process(job(baseAlert()), logger);
  assert.equal(result.protection.action, "StopLoss");
});

// --- queue ------------------------------------------------------------------

const queueConfig = {
  concurrency: 2,
  maxAttempts: 3,
  baseBackoffMs: 1,
  maxBackoffMs: 5,
  dedupeTtlMs: 60_000,
};

const settle = () => new Promise((resolve) => setTimeout(resolve, 60));

test("de-duplicates a redelivered alert instead of submitting twice", async () => {
  let handled = 0;
  const queue = new JobQueue({
    config: queueConfig,
    logger,
    handler: async () => {
      handled += 1;
      return { txHash: "0xtx" };
    },
  });

  const first = queue.enqueue(baseAlert());
  const second = queue.enqueue(baseAlert()); // identical alertId

  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.job.id, first.job.id);

  await settle();
  assert.equal(handled, 1, "an at-least-once alert must be acted on exactly once");
});

test("derives a stable id for an alert that arrives without one", () => {
  const alert = baseAlert({ alertId: undefined });
  assert.equal(deriveAlertId(alert), deriveAlertId({ ...alert }));
  assert.notEqual(deriveAlertId(alert), deriveAlertId({ ...alert, user: "0xbb" }));
});

test("retries a transient failure and then succeeds", async () => {
  let attempts = 0;
  const queue = new JobQueue({
    config: queueConfig,
    logger,
    handler: async () => {
      attempts += 1;
      if (attempts < 3) throw new Error("proof builder 503");
      return { txHash: "0xtx" };
    },
  });

  const { job: queued } = queue.enqueue(baseAlert());
  await settle();

  assert.equal(attempts, 3);
  assert.equal(queued.state, JobState.SUCCEEDED);
});

test("never retries a permanent failure", async () => {
  let attempts = 0;
  const queue = new JobQueue({
    config: queueConfig,
    logger,
    handler: async () => {
      attempts += 1;
      // "Position safe" is a correct rejection, not a transient fault.
      throw Object.assign(new Error("ASC.verifyPosition would revert: Position safe"), {
        retriable: false,
      });
    },
  });

  const { job: queued } = queue.enqueue(baseAlert());
  await settle();

  assert.equal(attempts, 1, "a permanent revert must not be retried");
  assert.equal(queued.state, JobState.FAILED);
  assert.equal(queued.error.retriable, false);
});

test("gives up after maxAttempts", async () => {
  let attempts = 0;
  const queue = new JobQueue({
    config: queueConfig,
    logger,
    handler: async () => {
      attempts += 1;
      throw new Error("always down");
    },
  });

  const { job: queued } = queue.enqueue(baseAlert());
  await settle();

  assert.equal(attempts, queueConfig.maxAttempts);
  assert.equal(queued.state, JobState.FAILED);
});

test("serialises jobs for the same position rather than racing them", async () => {
  let concurrent = 0;
  let maxConcurrent = 0;
  const queue = new JobQueue({
    config: queueConfig,
    logger,
    handler: async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 15));
      concurrent -= 1;
      return {};
    },
  });

  // Two distinct alerts, same user and chain.
  queue.enqueue(baseAlert({ alertId: "alert_a" }));
  queue.enqueue(baseAlert({ alertId: "alert_b" }));
  await settle();

  assert.equal(maxConcurrent, 1, "two submissions for one position must not overlap");
  assert.equal(queue.stats.succeeded, 2);
});

test("runs jobs for different positions concurrently", async () => {
  let concurrent = 0;
  let maxConcurrent = 0;
  const queue = new JobQueue({
    config: queueConfig,
    logger,
    handler: async () => {
      concurrent += 1;
      maxConcurrent = Math.max(maxConcurrent, concurrent);
      await new Promise((r) => setTimeout(r, 15));
      concurrent -= 1;
      return {};
    },
  });

  queue.enqueue(baseAlert({ alertId: "a", user: `0x${"11".repeat(20)}` }));
  queue.enqueue(baseAlert({ alertId: "b", user: `0x${"22".repeat(20)}` }));
  await settle();

  assert.equal(maxConcurrent, 2);
});

// --- configuration errors ---------------------------------------------------

test("missing ASC configuration fails permanently rather than retrying", async () => {
  const { AscClient } = require("../src/chain/asc");
  const client = new AscClient({
    config: { contracts: { asc: "" }, dryRun: false, signer: {} },
    logger,
    creditcoin: { provider: {}, wallet: null },
  });

  await assert.rejects(
    () => client.verifyPosition({ chainKey: 1, blockHeight: 1, user: USER }),
    (err) => {
      assert.match(err.message, /ASC_CONTRACT_ADDRESS/);
      assert.equal(err.retriable, false, "a missing address cannot be fixed by retrying");
      return true;
    },
  );
});
