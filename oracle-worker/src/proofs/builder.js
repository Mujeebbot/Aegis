"use strict";

/**
 * Merkle + continuity proof generation via @gluwa/usc-sdk.
 *
 * The ordering constraint that governs this whole module: a proof can only be
 * built for a source block that Creditcoin has already ATTESTED and that the
 * proof builder has INGESTED. Asking too early fails with a retriable error, so
 * the sequence is always:
 *
 *   1. read the source tx receipt -> learn its block height
 *   2. waitUntilHeightAttested(chainKey, height)
 *   3. getProof(txHash)
 *   4. (optional) verify the proof against the Block Prover precompile via a
 *      free eth_call, before spending gas submitting it to the ASC
 *
 * Step 1 needs a source-chain RPC. Without one we skip straight to step 3 and
 * lean on the queue's retry policy, which works but is slower and noisier.
 */

const { proofProvider, blockProver, chainInfo } = require("@gluwa/usc-sdk");
const { JsonRpcProvider } = require("ethers");

const { getChainByChainKey } = require("../chains");

class ProofService {
  /**
   * @param {object} deps
   * @param {object} deps.config
   * @param {object} deps.logger
   * @param {import("../chain/creditcoin").CreditcoinClient} deps.creditcoin
   */
  constructor({ config, logger, creditcoin }) {
    this.config = config;
    this.logger = logger.child({ module: "proofs" });
    this.creditcoin = creditcoin;

    /** chainKey -> ProofBuilder. The SDK binds one builder per source chain. */
    this.builders = new Map();
    /** chainId -> JsonRpcProvider for source chains. */
    this.sourceProviders = new Map();

    this.blockProver = new blockProver.PrecompileBlockProver(creditcoin.provider);
    this.chainInfo = new chainInfo.PrecompileChainInfoProvider(creditcoin.provider);
  }

  builderFor(chainKey) {
    let builder = this.builders.get(chainKey);
    if (!builder) {
      builder = new proofProvider.service.ProofBuilder(
        chainKey,
        this.config.creditcoin.proofBuilderUrl,
        this.config.proofs.builderTimeoutMs,
      );
      this.builders.set(chainKey, builder);
    }
    return builder;
  }

  sourceProviderFor(chainId) {
    const url = this.config.sourceChains.rpcUrls[chainId];
    if (!url) return null;
    let provider = this.sourceProviders.get(chainId);
    if (!provider) {
      provider = new JsonRpcProvider(url, undefined, { staticNetwork: true });
      this.sourceProviders.set(chainId, provider);
    }
    return provider;
  }

  /**
   * Cross-check our static chainKey table against the live precompile.
   *
   * chainKey/chainId confusion produces proofs that verify against the wrong
   * chain, so this is worth one call at boot.
   */
  async verifyChainRegistry() {
    const supported = await this.chainInfo.getSupportedChains();
    const live = supported.map((c) => ({ chainKey: Number(c.chainKey), chainId: Number(c.chainId) }));

    for (const entry of live) {
      const known = getChainByChainKey(entry.chainKey);
      if (known && known.chainId !== entry.chainId) {
        this.logger.error("chainKey mapping drift - src/chains.js disagrees with the precompile", {
          chainKey: entry.chainKey,
          expectedChainId: known.chainId,
          actualChainId: entry.chainId,
          action: "trust the precompile and update src/chains.js",
        });
      }
    }

    this.logger.info("attested source chains", { chains: live });
    return live;
  }

  /**
   * Look up which block a source transaction landed in.
   * @returns {Promise<{blockNumber:number, confirmations:number}|null>}
   */
  async getSourceTxBlock(chainId, txHash) {
    const provider = this.sourceProviderFor(chainId);
    if (!provider) {
      this.logger.debug("no source RPC configured; cannot pre-resolve block height", { chainId });
      return null;
    }
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return null;
    const head = await provider.getBlockNumber();
    return { blockNumber: receipt.blockNumber, confirmations: head - receipt.blockNumber + 1 };
  }

  /**
   * Wait for a source block height to become provable.
   * No-op when the height is unknown (no source RPC).
   */
  async waitForAttestation(chainKey, blockHeight, log = this.logger) {
    if (!blockHeight) return { waited: false, reason: "block height unknown" };

    log.info("waiting for source block attestation", { chainKey, blockHeight });
    const startedAt = Date.now();

    await this.builderFor(chainKey).waitUntilHeightAttested(
      chainKey,
      blockHeight,
      this.config.proofs.attestationPollIntervalMs,
      this.config.proofs.attestationTimeoutMs,
      this.config.proofs.attestationExtraDelayMs,
    );

    const waitedMs = Date.now() - startedAt;
    log.info("source block attested", { chainKey, blockHeight, waitedMs });
    return { waited: true, waitedMs };
  }

  /**
   * Build a proof for one source transaction.
   *
   * @param {object} params
   * @param {number} params.chainKey
   * @param {number} params.chainId
   * @param {string} params.txHash
   * @param {object} [params.log]
   * @returns {Promise<object>} proof data from the builder
   */
  async buildProof({ chainKey, chainId, txHash, log = this.logger }) {
    // 1. Resolve the block height when we can, so the attestation wait is
    //    targeted rather than a blind retry loop.
    const located = await this.getSourceTxBlock(chainId, txHash).catch((err) => {
      log.warn("could not read source tx receipt; proceeding without it", {
        chainId,
        txHash,
        error: err.message,
      });
      return null;
    });

    if (located) {
      log.info("source transaction located", {
        chainId,
        txHash,
        blockNumber: located.blockNumber,
        confirmations: located.confirmations,
      });
      await this.waitForAttestation(chainKey, located.blockNumber, log);
    }

    // 2. Ask the proof builder.
    log.info("requesting proof", { chainKey, txHash });
    const startedAt = Date.now();
    const result = await this.builderFor(chainKey).getProof(txHash);

    if (!result?.success || !result.data) {
      const message = result?.error || "proof builder returned no data";
      throw Object.assign(new Error(`Proof generation failed for ${txHash}: ${message}`), {
        // The builder's own "not yet attested/indexed" errors are transient.
        retriable: isRetriableProofError(message),
      });
    }

    const data = result.data;
    log.info("proof generated", {
      chainKey: data.chainKey,
      headerNumber: data.headerNumber,
      txIndex: data.txIndex,
      merkleSiblings: data.merkleProof?.siblings?.length,
      continuityRoots: data.continuityProof?.roots?.length,
      cached: data.cached,
      durationMs: Date.now() - startedAt,
    });

    return data;
  }

  /**
   * Free on-chain dry run against the Block Prover precompile.
   *
   * This is the single highest-value check in the pipeline: it answers "would
   * this proof verify?" for the cost of an eth_call, before the ASC submission
   * spends gas discovering the same answer.
   */
  async preflightVerify(proofData, log = this.logger) {
    if (!this.config.proofs.preflight) return { skipped: true };

    try {
      const verified = await this.blockProver.verifySingle(
        proofData.chainKey,
        proofData.headerNumber,
        proofData.txBytes,
        proofData.merkleProof,
        proofData.continuityProof,
      );

      if (!verified) {
        throw Object.assign(new Error("Block Prover precompile rejected the proof"), {
          retriable: false,
        });
      }

      log.info("preflight verification passed", {
        chainKey: proofData.chainKey,
        height: proofData.headerNumber,
      });
      return { verified: true };
    } catch (err) {
      if (err.retriable === false) throw err;
      // A failure to *run* the check (RPC hiccup) should not block submission;
      // a failure of the check itself is rethrown above.
      log.warn("preflight verification could not be completed; continuing", {
        error: err.shortMessage ?? err.message,
      });
      return { verified: false, error: err.message };
    }
  }

  /** Transaction index within its block, per the precompile. */
  async computeTxIndex(merkleProof) {
    return this.blockProver.computeTransactionIndex(merkleProof);
  }
}

/**
 * Proof-builder errors that are worth retrying: the block is attested but not
 * yet indexed, the service is briefly overloaded, etc.
 */
function isRetriableProofError(message) {
  const text = String(message).toLowerCase();
  if (text.includes("not attested") || text.includes("not yet")) return true;
  if (text.includes("timeout") || text.includes("timed out")) return true;
  if (text.includes("503") || text.includes("502") || text.includes("429")) return true;
  if (text.includes("retriable")) return true;
  // An unknown transaction hash will never resolve by retrying.
  if (text.includes("not found") || text.includes("invalidchainkey")) return false;
  return false;
}

module.exports = { ProofService, isRetriableProofError };
