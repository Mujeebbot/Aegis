"use strict";

/**
 * The end-to-end job: risk alert -> proof -> on-chain protection.
 *
 *   1. validate the alert
 *   2. resolve which source transaction proves the position
 *   3. re-check the position is still at risk (free; avoids a wasted submission)
 *   4. build the Merkle + continuity proof via the proof builder
 *   5. preflight-verify the proof against the Block Prover precompile (free)
 *   6. ABI-encode the proofs into the `bytes` the ASC expects
 *   7. submit ASC.verifyPosition and interpret the receipt
 *
 * Steps 3 and 5 are both free calls that exist purely to avoid spending gas on
 * a submission that is already known to fail.
 */

const { encodeProofs } = require("./proofs/encode");
const { toChainKey, getChainByChainId } = require("./chains");
const { isTxHash } = require("./config");

class Pipeline {
  /**
   * @param {object} deps
   * @param {object} deps.config
   * @param {object} deps.logger
   * @param {import("./proofs/builder").ProofService} deps.proofService
   * @param {import("./chain/asc").AscClient} deps.ascClient
   * @param {import("./sources/positionTx").PositionTxResolver} deps.txResolver
   */
  constructor({ config, logger, proofService, ascClient, txResolver }) {
    this.config = config;
    this.logger = logger.child({ module: "pipeline" });
    this.proofService = proofService;
    this.ascClient = ascClient;
    this.txResolver = txResolver;
  }

  /**
   * Queue handler. Throwing marks the job failed; attach `retriable: false` to
   * anything that will never succeed on a retry.
   *
   * @param {object} job
   * @param {object} log
   */
  async process(job, log = this.logger) {
    const alert = job.alert;
    const steps = [];
    const startedAt = Date.now();

    // --- 1. validate -------------------------------------------------------
    validateAlert(alert);
    const chainId = Number(alert.chainId);
    const chainKey = alert.chainKey !== undefined ? Number(alert.chainKey) : toChainKey(chainId);
    const chain = getChainByChainId(chainId);

    const jobLog = log.child({ user: alert.user, chainId, chainKey });
    jobLog.info("processing alert", {
      alertId: job.alertId,
      healthFactor: alert.healthFactor,
      riskLevel: alert.risk?.level,
      chain: chain?.name,
    });

    // Cross-check the mapping ai-monitor sent against our own table. A mismatch
    // means one side is misconfigured, and proving against the wrong chain
    // would silently produce a proof for someone else's transaction.
    const expectedChainKey = toChainKey(chainId);
    if (chainKey !== expectedChainKey) {
      throw Object.assign(
        new Error(
          `Alert chainKey ${chainKey} does not match chainId ${chainId} ` +
            `(expected chainKey ${expectedChainKey}). Refusing to prove.`,
        ),
        { retriable: false },
      );
    }

    // --- 2. resolve the source transaction ---------------------------------
    const { txHash, source: txSource } = await this.txResolver.resolve(alert);
    steps.push({ step: "resolve-tx", txHash, source: txSource });
    jobLog.info("source transaction resolved", { txHash, source: txSource });

    // --- 3. re-check risk --------------------------------------------------
    const recheck = await this.txResolver.recheckRisk(alert.user, chainId);
    if (recheck && !recheck.isAtRisk) {
      // The position recovered while we were queued. Submitting now would
      // revert in Settlement with "Position safe" - correct, but paid for.
      jobLog.info("position recovered before submission; skipping", {
        healthFactor: recheck.healthFactor,
      });
      steps.push({ step: "recheck", skipped: true, healthFactor: recheck.healthFactor });
      return {
        skipped: true,
        reason: "position-recovered",
        healthFactor: recheck.healthFactor,
        steps,
        durationMs: Date.now() - startedAt,
      };
    }
    if (recheck) {
      steps.push({ step: "recheck", isAtRisk: true, healthFactor: recheck.healthFactor });
    }

    // --- 4. build the proof ------------------------------------------------
    const proofData = await this.proofService.buildProof({
      chainKey,
      chainId,
      txHash,
      log: jobLog,
    });
    steps.push({
      step: "build-proof",
      headerNumber: proofData.headerNumber,
      txIndex: proofData.txIndex,
      cached: proofData.cached,
    });

    // The builder answers for the chainKey it was constructed with; if it comes
    // back different, something is badly wrong.
    if (Number(proofData.chainKey) !== chainKey) {
      throw Object.assign(
        new Error(
          `Proof builder returned chainKey ${proofData.chainKey}, expected ${chainKey}`,
        ),
        { retriable: false },
      );
    }

    // --- 5. preflight ------------------------------------------------------
    const preflight = await this.proofService.preflightVerify(proofData, jobLog);
    steps.push({ step: "preflight", ...preflight });

    // --- 6. encode ---------------------------------------------------------
    const { merkleProofBytes, continuityProofBytes } = encodeProofs(proofData);
    steps.push({
      step: "encode",
      merkleProofBytes: merkleProofBytes.length,
      continuityProofBytes: continuityProofBytes.length,
    });

    // --- 7. submit ---------------------------------------------------------
    const submission = await this.ascClient.verifyPosition({
      chainKey,
      blockHeight: proofData.headerNumber,
      encodedTx: proofData.txBytes,
      merkleProofBytes,
      continuityProofBytes,
      user: alert.user,
    });
    steps.push({ step: "submit", ...submission });

    const result = {
      skipped: false,
      txHash: submission.txHash ?? null,
      dryRun: Boolean(submission.dryRun),
      sourceTxHash: txHash,
      chainKey,
      blockHeight: proofData.headerNumber,
      protection: submission.protection ?? null,
      steps,
      durationMs: Date.now() - startedAt,
    };

    jobLog.info("alert processed", {
      alertId: job.alertId,
      txHash: result.txHash,
      dryRun: result.dryRun,
      durationMs: result.durationMs,
    });

    return result;
  }
}

/** Reject malformed alerts at the edge, permanently - retrying will not fix them. */
function validateAlert(alert) {
  const errors = [];

  if (!alert || typeof alert !== "object") errors.push("alert must be an object");
  else {
    if (!/^0x[0-9a-fA-F]{40}$/.test(String(alert.user || ""))) {
      errors.push(`user must be a valid EVM address, got ${JSON.stringify(alert.user)}`);
    }
    if (!Number.isInteger(Number(alert.chainId))) {
      errors.push(`chainId must be an integer, got ${JSON.stringify(alert.chainId)}`);
    }
    if (alert.isAtRisk !== true) {
      // The worker only acts on positions ai-monitor flagged. Anything else is
      // a producer bug, and submitting would revert as "Position safe" anyway.
      errors.push("isAtRisk must be true; the worker only acts on at-risk positions");
    }
    if (alert.healthFactor === undefined && alert.healthFactorWad === undefined) {
      errors.push("one of healthFactor or healthFactorWad is required");
    }
    if (alert.sourceTxHash !== undefined && alert.sourceTxHash !== null && !isTxHash(alert.sourceTxHash)) {
      errors.push(`sourceTxHash must be a 32-byte hash, got ${alert.sourceTxHash}`);
    }
  }

  if (errors.length) {
    throw Object.assign(new Error(`Invalid risk alert: ${errors.join("; ")}`), {
      retriable: false,
      statusCode: 400,
    });
  }
}

module.exports = { Pipeline, validateAlert };
