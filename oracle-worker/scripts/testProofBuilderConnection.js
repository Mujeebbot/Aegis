"use strict";

/**
 * Step 0: prove the CC3 proof pipeline is reachable before trusting any of it.
 *
 * Run: npm run test-connection
 *
 * Checks, in order (each independent, all reported even if an earlier one fails):
 *   1. CC3 RPC responds and reports the expected chainId
 *   2. The ChainInfo precompile lists its attested source chains
 *      -> this is the authoritative chainKey <-> chainId mapping
 *   3. Our static src/chains.js table agrees with the precompile
 *   4. The proof builder service is reachable and reports an attested height
 *   5. The Block Prover precompile has code at the expected address
 *   6. (optional) If SOURCE_CHAIN_TXN_HASH is set, build a real proof for it
 *      and verify it against the precompile end to end
 *
 * Exit code is non-zero if any REQUIRED check fails, so this works in CI.
 */

const { JsonRpcProvider } = require("ethers");
const { chainInfo, blockProver, proofProvider } = require("@gluwa/usc-sdk");

const { load } = require("../src/config");
const { createLogger } = require("../src/lib/logger");
const { requestJson } = require("../src/lib/http");
const { getChainByChainKey, listChains } = require("../src/chains");
const { encodeProofs } = require("../src/proofs/encode");

const results = [];

function record(name, ok, detail, { required = true } = {}) {
  results.push({ name, ok, detail, required });
  const mark = ok ? "PASS" : required ? "FAIL" : "WARN";
  process.stdout.write(`  [${mark}] ${name}\n`);
  if (detail) process.stdout.write(`         ${detail}\n`);
}

async function main() {
  const logger = createLogger("connection-test", { pretty: true, level: "warn" });
  let config;
  try {
    config = load();
  } catch (err) {
    process.stderr.write(`Configuration error:\n${err.message}\n`);
    process.exit(1);
    return;
  }

  process.stdout.write("\nAegis oracle-worker :: proof pipeline connectivity check\n");
  process.stdout.write(`  RPC:           ${config.creditcoin.rpcUrl}\n`);
  process.stdout.write(`  Proof builder: ${config.creditcoin.proofBuilderUrl}\n\n`);

  const provider = new JsonRpcProvider(config.creditcoin.rpcUrl, undefined, {
    staticNetwork: true,
  });

  // --- 1. RPC ---------------------------------------------------------------
  let connected = false;
  try {
    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    const actual = Number(network.chainId);
    connected = actual === config.creditcoin.chainId;
    record(
      "CC3 RPC reachable",
      connected,
      connected
        ? `chainId ${actual}, head block ${blockNumber}`
        : `expected chainId ${config.creditcoin.chainId}, got ${actual}`,
    );
  } catch (err) {
    record("CC3 RPC reachable", false, err.message);
  }

  // --- 2 & 3. ChainInfo precompile + our static table -----------------------
  let liveChains = [];
  if (connected) {
    try {
      const infoProvider = new chainInfo.PrecompileChainInfoProvider(provider);
      const supported = await infoProvider.getSupportedChains();
      liveChains = supported.map((c) => ({
        chainKey: Number(c.chainKey),
        chainId: Number(c.chainId),
        encoding: Number(c.chainEncoding),
      }));
      record(
        "ChainInfo precompile responds",
        liveChains.length > 0,
        liveChains.map((c) => `chainKey ${c.chainKey} -> chainId ${c.chainId}`).join(", "),
      );

      const drift = [];
      for (const live of liveChains) {
        const known = getChainByChainKey(live.chainKey);
        if (known && known.chainId !== live.chainId) {
          drift.push(
            `chainKey ${live.chainKey}: table says chainId ${known.chainId}, chain says ${live.chainId}`,
          );
        }
      }
      record(
        "src/chains.js matches the precompile",
        drift.length === 0,
        drift.length === 0
          ? `${listChains().length} chains in the local table, no drift`
          : drift.join("; "),
      );
    } catch (err) {
      record("ChainInfo precompile responds", false, err.message);
    }
  }

  // --- 4. Proof builder service --------------------------------------------
  const chainKey = liveChains[0]?.chainKey ?? 1;
  try {
    const base = config.creditcoin.proofBuilderUrl.replace(/\/$/, "");
    const body = await requestJson(`${base}/api/v1/attested-height/${chainKey}`, {
      timeoutMs: 15_000,
      retries: 1,
    });
    const height = body?.attestedHeight;
    record(
      "Proof builder reachable",
      Number.isFinite(Number(height)),
      `chainKey ${chainKey} attested up to block ${height}`,
    );
  } catch (err) {
    record("Proof builder reachable", false, err.message);
  }

  // --- 5. Block Prover precompile ------------------------------------------
  if (connected) {
    try {
      // NOT a getCode check: Creditcoin's precompiles are native runtime code,
      // so eth_getCode returns "0x" for them even though they are callable.
      // Probing behaviour is the only meaningful test. calculateTxIndex reads
      // the sibling flags as the bits of the index, so a left-then-right proof
      // must come back as index 1.
      const prover = new blockProver.PrecompileBlockProver(provider);
      const index = await prover.computeTransactionIndex({
        root: `0x${"0".repeat(64)}`,
        siblings: [
          { hash: `0x${"0".repeat(64)}`, isLeft: true },
          { hash: `0x${"0".repeat(64)}`, isLeft: false },
        ],
      });
      record(
        "Block Prover precompile callable",
        Number(index) === 1,
        `${blockProver.BLOCK_PROVER_PRECOMPILE_ADDRESS} calculateTxIndex -> ${index} (expected 1)`,
      );
    } catch (err) {
      record("Block Prover precompile callable", false, err.shortMessage ?? err.message);
    }
  }

  // --- 6. Optional end-to-end proof ----------------------------------------
  const txHash = config.sourceChains.defaultTxHash;
  if (!txHash) {
    record(
      "End-to-end proof generation",
      true,
      "skipped - set SOURCE_CHAIN_TXN_HASH to a real source-chain tx to exercise this",
      { required: false },
    );
  } else {
    try {
      const builder = new proofProvider.service.ProofBuilder(
        chainKey,
        config.creditcoin.proofBuilderUrl,
        config.proofs.builderTimeoutMs,
      );
      const proof = await builder.getProof(txHash);
      if (!proof?.success || !proof.data) {
        record("End-to-end proof generation", false, proof?.error || "builder returned no data");
      } else {
        const data = proof.data;
        record(
          "End-to-end proof generation",
          true,
          `block ${data.headerNumber}, txIndex ${data.txIndex}, ` +
            `${data.merkleProof.siblings.length} merkle siblings, ` +
            `${data.continuityProof.roots.length} continuity roots`,
        );

        // Encoding must survive the round-trip the ASC will perform.
        try {
          const encoded = encodeProofs(data);
          record(
            "Proof ABI encoding",
            true,
            `merkleProof ${encoded.merkleProofBytes.length} chars, ` +
              `continuityProof ${encoded.continuityProofBytes.length} chars`,
          );
        } catch (err) {
          record("Proof ABI encoding", false, err.message);
        }

        // And the proof itself must verify on-chain.
        if (connected) {
          try {
            const prover = new blockProver.PrecompileBlockProver(provider);
            const verified = await prover.verifySingle(
              data.chainKey,
              data.headerNumber,
              data.txBytes,
              data.merkleProof,
              data.continuityProof,
            );
            record("Proof verifies against precompile", verified === true, `verifySingle -> ${verified}`);
          } catch (err) {
            record("Proof verifies against precompile", false, err.shortMessage ?? err.message);
          }
        }
      }
    } catch (err) {
      record("End-to-end proof generation", false, err.message);
    }
  }

  void logger;

  // --- summary --------------------------------------------------------------
  const failures = results.filter((r) => !r.ok && r.required);
  const warnings = results.filter((r) => !r.ok && !r.required);

  process.stdout.write(
    `\n${results.length - failures.length - warnings.length}/${results.length} checks passed` +
      `${warnings.length ? `, ${warnings.length} warning(s)` : ""}\n`,
  );

  if (failures.length > 0) {
    process.stdout.write("\nFailed checks:\n");
    for (const failure of failures) process.stdout.write(`  - ${failure.name}: ${failure.detail}\n`);
    process.stdout.write(
      "\nThe proof pipeline is NOT ready. Fix the above before submitting proofs.\n\n",
    );
    process.exit(1);
  }

  process.stdout.write("\nProof pipeline is reachable and consistent.\n\n");
}

main().catch((err) => {
  process.stderr.write(`\nUnexpected error: ${err.stack || err.message}\n`);
  process.exit(1);
});
