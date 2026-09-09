"use strict";

/**
 * LiquidationShieldASC client - the worker's write path to the chain.
 *
 * Submission sequence, and why each step exists:
 *
 *   1. staticCall  - simulate. Reverts here are free; reverts on-chain are not.
 *                    This is where "Position safe" and proof-verification
 *                    failures surface, with a decoded reason string.
 *   2. estimateGas - and refuse anything implausibly large, which means we are
 *                    talking to the wrong contract.
 *   3. send        - with an explicit gas limit derived from the estimate.
 *   4. wait        - then parse Settlement's PositionProtected out of the logs,
 *                    which is the actual proof that protection executed rather
 *                    than merely that the transaction succeeded.
 */

const { Contract, Interface } = require("ethers");

const ASC_ABI = require("../../abi/LiquidationShieldASC.json");
const SETTLEMENT_ABI = require("../../abi/LiquidationShieldSettlement.json");

class AscClient {
  /**
   * @param {object} deps
   * @param {object} deps.config
   * @param {object} deps.logger
   * @param {import("./creditcoin").CreditcoinClient} deps.creditcoin
   */
  constructor({ config, logger, creditcoin }) {
    this.config = config;
    this.logger = logger.child({ module: "asc" });
    this.creditcoin = creditcoin;

    this.address = config.contracts.asc;
    this.settlementInterface = new Interface(SETTLEMENT_ABI);

    // Read-only handle always available; the writable one needs a signer.
    this.readContract = this.address
      ? new Contract(this.address, ASC_ABI, creditcoin.provider)
      : null;
    this.writeContract =
      this.address && creditcoin.wallet
        ? new Contract(this.address, ASC_ABI, creditcoin.wallet)
        : null;
  }

  /** Confirm there is actually a contract deployed at the configured address. */
  async assertDeployed() {
    if (!this.address) throw new Error("ASC_CONTRACT_ADDRESS is not set");
    const code = await this.creditcoin.provider.getCode(this.address);
    if (!code || code === "0x") {
      throw new Error(
        `No contract deployed at ASC_CONTRACT_ADDRESS ${this.address} on chain ` +
          `${this.config.creditcoin.chainId}. Run contracts/scripts/deploy.js and update .env.`,
      );
    }
    this.logger.info("ASC contract found", { address: this.address, codeSize: (code.length - 2) / 2 });
    return true;
  }

  /**
   * Submit a verified position proof.
   *
   * @param {object} params
   * @param {number} params.chainKey
   * @param {number} params.blockHeight
   * @param {string} params.encodedTx
   * @param {string} params.merkleProofBytes
   * @param {string} params.continuityProofBytes
   * @param {string} params.user
   * @param {object} [opts]
   * @param {boolean} [opts.dryRun] simulate and estimate, but do not send
   * @returns {Promise<object>} submission result
   */
  async verifyPosition(params, opts = {}) {
    const { chainKey, blockHeight, encodedTx, merkleProofBytes, continuityProofBytes, user } = params;
    const dryRun = opts.dryRun ?? this.config.dryRun;

    // Missing configuration is permanent: retrying cannot conjure an address
    // or a key, and a retry loop would only bury the real message in noise.
    if (!this.writeContract && !dryRun) {
      throw Object.assign(
        new Error("Cannot submit: no signer or no ASC_CONTRACT_ADDRESS configured"),
        { retriable: false },
      );
    }
    const contract = this.writeContract ?? this.readContract;
    if (!contract) {
      throw Object.assign(
        new Error(
          "ASC_CONTRACT_ADDRESS is not set. Deploy with contracts/scripts/deploy.js, " +
            "then set ASC_CONTRACT_ADDRESS in .env.",
        ),
        { retriable: false },
      );
    }

    const args = [chainKey, blockHeight, encodedTx, merkleProofBytes, continuityProofBytes, user];
    const log = this.logger.child({ user, chainKey, blockHeight });

    // 1. Simulate.
    let simulated;
    try {
      simulated = await contract.verifyPosition.staticCall(...args);
    } catch (err) {
      const reason = decodeRevert(err);
      log.error("verifyPosition simulation reverted", { reason, error: err.shortMessage ?? err.message });
      throw Object.assign(new Error(`ASC.verifyPosition would revert: ${reason}`), {
        cause: err,
        reason,
        // A safe position is a legitimate outcome, not a transient fault - the
        // queue must not retry it.
        retriable: !isPermanentRevert(reason),
      });
    }

    if (simulated === false) {
      throw Object.assign(new Error("ASC.verifyPosition returned false (proof rejected)"), {
        retriable: false,
      });
    }

    // 2. Estimate gas.
    const gasEstimate = await contract.verifyPosition.estimateGas(...args);
    if (gasEstimate > this.config.signer.maxGasLimit) {
      throw Object.assign(
        new Error(
          `Gas estimate ${gasEstimate} exceeds ORACLE_MAX_GAS_LIMIT ` +
            `${this.config.signer.maxGasLimit}. Refusing to submit.`,
        ),
        { retriable: false },
      );
    }
    // 25% headroom: state can shift between estimate and inclusion.
    const gasLimit = (gasEstimate * 125n) / 100n;

    if (dryRun) {
      log.warn("DRY RUN - not sending transaction", { gasEstimate: gasEstimate.toString() });
      return {
        submitted: false,
        dryRun: true,
        simulatedResult: simulated,
        gasEstimate: gasEstimate.toString(),
      };
    }

    await this.creditcoin.assertCanSubmit();

    // 3. Send.
    log.info("submitting verifyPosition", {
      asc: this.address,
      gasLimit: gasLimit.toString(),
    });
    const tx = await this.writeContract.verifyPosition(...args, { gasLimit });
    log.info("transaction sent", { txHash: tx.hash });

    // 4. Wait and interpret.
    const receipt = await tx.wait(this.config.signer.confirmations);
    const protection = this.parseProtectionEvent(receipt);

    const result = {
      submitted: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString(),
      status: receipt.status,
      protection,
    };

    if (receipt.status !== 1) {
      throw Object.assign(new Error(`verifyPosition transaction reverted (tx ${tx.hash})`), {
        result,
        retriable: false,
      });
    }

    // A successful tx that emitted no PositionProtected means the ASC verified
    // the proof but never reached Settlement - worth surfacing loudly, since
    // the user is not actually protected.
    if (!protection) {
      log.warn("transaction succeeded but no PositionProtected event was emitted", {
        txHash: tx.hash,
        hint: "check that ASC forwards to Settlement.protectPosition",
      });
    } else {
      log.info("position protected", { txHash: tx.hash, ...protection });
    }

    return result;
  }

  /** Pull Settlement's PositionProtected event out of the receipt logs. */
  parseProtectionEvent(receipt) {
    const ACTIONS = ["None", "StopLoss", "Rebalance", "Close"];
    for (const entry of receipt.logs ?? []) {
      try {
        const parsed = this.settlementInterface.parseLog({
          topics: [...entry.topics],
          data: entry.data,
        });
        if (parsed?.name === "PositionProtected") {
          const action = Number(parsed.args.action);
          return {
            user: parsed.args.user,
            healthFactorWad: parsed.args.healthFactor.toString(),
            action: ACTIONS[action] ?? `Unknown(${action})`,
            emittedBy: entry.address,
          };
        }
      } catch {
        // Logs from other contracts will not parse against this ABI; skip them.
      }
    }
    return null;
  }
}

/** Best-effort revert-reason extraction across ethers v6 error shapes. */
function decodeRevert(err) {
  return (
    err?.revert?.args?.[0] ??
    err?.reason ??
    err?.info?.error?.message ??
    err?.shortMessage ??
    err?.message ??
    "unknown reason"
  );
}

/**
 * Reverts that will never succeed on retry. Retrying these wastes gas and,
 * for "Position safe", would be retrying a correct rejection.
 */
function isPermanentRevert(reason) {
  const text = String(reason).toLowerCase();
  return (
    text.includes("position safe") ||
    text.includes("only asc") ||
    text.includes("invalid proof") ||
    text.includes("proof verification failed")
  );
}

module.exports = { AscClient, decodeRevert, isPermanentRevert };
