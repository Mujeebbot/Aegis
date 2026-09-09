"use strict";

/**
 * oracle-worker configuration.
 *
 * Fails fast at boot. The worker signs transactions and spends real testnet
 * gas, so a misconfiguration here is more expensive than in ai-monitor - the
 * validation below is correspondingly stricter.
 */

const path = require("node:path");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "..", "..", ".env") });

function num(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) throw new Error(`${name} must be a number, got ${JSON.stringify(raw)}`);
  return value;
}

function bool(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function str(name, fallback) {
  const raw = process.env[name];
  return raw === undefined || raw === "" ? fallback : raw;
}

function load({ requireSigner = false } = {}) {
  const config = {
    creditcoin: {
      rpcUrl: str("CREDITCOIN_RPC_URL", "https://rpc.cc3-testnet.creditcoin.network"),
      proofBuilderUrl: str(
        "CREDITCOIN_PROOF_BUILDER_URL",
        "https://prover.cc3-testnet.creditcoin.network",
      ),
      chainId: num("CREDITCOIN_CHAIN_ID", 102031),
    },

    contracts: {
      asc: str("ASC_CONTRACT_ADDRESS", ""),
      settlement: str("SETTLEMENT_CONTRACT_ADDRESS", ""),
    },

    signer: {
      privateKey: str("DEPLOYER_PRIVATE_KEY", ""),
      /**
       * Hard ceiling per submission. The ASC call is a fixed shape, so a wildly
       * higher estimate means something is wrong (wrong address, proxy loop) and
       * we would rather fail than drain the hot wallet.
       */
      maxGasLimit: BigInt(str("ORACLE_MAX_GAS_LIMIT", "3000000")),
      /** Refuse to submit below this balance, in wei. Default 0.01 tCTC. */
      minBalanceWei: BigInt(str("ORACLE_MIN_BALANCE_WEI", "10000000000000000")),
      confirmations: num("ORACLE_CONFIRMATIONS", 1),
    },

    server: {
      port: num("ORACLE_WORKER_PORT", 4002),
      host: str("ORACLE_WORKER_HOST", "0.0.0.0"),
      /** Must match ai-monitor's ORACLE_WORKER_API_KEY. */
      apiKey: str("ORACLE_WORKER_API_KEY", ""),
    },

    proofs: {
      /** Poll interval while waiting for a source block to be attested. */
      attestationPollIntervalMs: num("ORACLE_ATTESTATION_POLL_INTERVAL_MS", 15_000),
      /** Give up waiting for attestation after this long. */
      attestationTimeoutMs: num("ORACLE_ATTESTATION_TIMEOUT_MS", 900_000),
      /** Extra settle time after attestation, for proof-builder load balancing. */
      attestationExtraDelayMs: num("ORACLE_ATTESTATION_EXTRA_DELAY_MS", 15_000),
      builderTimeoutMs: num("ORACLE_PROOF_BUILDER_TIMEOUT_MS", 60_000),
      /**
       * Dry-run the proof against the Block Prover precompile (a free eth_call)
       * before spending gas on the ASC submission. Strongly recommended.
       */
      preflight: bool("ORACLE_PREFLIGHT_VERIFY", true),
    },

    queue: {
      concurrency: num("ORACLE_QUEUE_CONCURRENCY", 2),
      maxAttempts: num("ORACLE_QUEUE_MAX_ATTEMPTS", 4),
      baseBackoffMs: num("ORACLE_QUEUE_BACKOFF_MS", 5_000),
      maxBackoffMs: num("ORACLE_QUEUE_MAX_BACKOFF_MS", 120_000),
      /** How long a completed alertId is remembered for de-duplication. */
      dedupeTtlMs: num("ORACLE_DEDUPE_TTL_MS", 3_600_000),
    },

    monitor: {
      /** Used to re-check risk before submitting, and to resolve a source tx. */
      baseUrl: str("AI_MONITOR_BASE_URL", "http://127.0.0.1:4001"),
      apiKey: str("AI_MONITOR_API_KEY", ""),
      timeoutMs: num("AI_MONITOR_TIMEOUT_MS", 10_000),
      /**
       * Re-query ai-monitor immediately before submitting. Proof generation can
       * take minutes; if the position recovered in the meantime, the ASC call
       * would revert in Settlement ("Position safe") and waste gas.
       */
      recheckBeforeSubmit: bool("ORACLE_RECHECK_BEFORE_SUBMIT", true),
    },

    sourceChains: {
      rpcUrls: {
        11155111: str("SOURCE_CHAIN_RPC_ETHEREUM_SEPOLIA", ""),
        1: str("SOURCE_CHAIN_RPC_ETHEREUM", ""),
      },
      /**
       * Fallback transaction to prove when an alert carries no sourceTxHash.
       * Set this for the demo so a fixture alert still produces a real proof.
       */
      defaultTxHash: str("SOURCE_CHAIN_TXN_HASH", ""),
      defaultChainId: num("SOURCE_CHAIN_DEFAULT_CHAIN_ID", 11155111),
    },

    /**
     * When true the worker runs the full pipeline but stops short of sending
     * the transaction. Everything else - proof generation, encoding, preflight
     * verification - still happens, so it is a genuine rehearsal.
     */
    dryRun: bool("ORACLE_DRY_RUN", false),
  };

  validate(config, { requireSigner });
  return config;
}

function validate(config, { requireSigner }) {
  const errors = [];

  if (!config.creditcoin.rpcUrl) errors.push("CREDITCOIN_RPC_URL is required");
  if (!config.creditcoin.proofBuilderUrl) errors.push("CREDITCOIN_PROOF_BUILDER_URL is required");

  if (config.contracts.asc && !isAddress(config.contracts.asc)) {
    errors.push(`ASC_CONTRACT_ADDRESS is not a valid address: ${config.contracts.asc}`);
  }
  if (config.contracts.settlement && !isAddress(config.contracts.settlement)) {
    errors.push(`SETTLEMENT_CONTRACT_ADDRESS is not a valid address: ${config.contracts.settlement}`);
  }

  if (requireSigner) {
    if (!config.signer.privateKey) errors.push("DEPLOYER_PRIVATE_KEY is required to submit proofs");
    if (!config.contracts.asc) errors.push("ASC_CONTRACT_ADDRESS is required to submit proofs");
  }

  if (config.signer.privateKey && !/^(0x)?[0-9a-fA-F]{64}$/.test(config.signer.privateKey)) {
    errors.push("DEPLOYER_PRIVATE_KEY must be a 32-byte hex private key");
  }

  if (config.queue.maxAttempts < 1) errors.push("ORACLE_QUEUE_MAX_ATTEMPTS must be >= 1");
  if (config.queue.concurrency < 1) errors.push("ORACLE_QUEUE_CONCURRENCY must be >= 1");

  if (config.sourceChains.defaultTxHash && !isTxHash(config.sourceChains.defaultTxHash)) {
    errors.push(`SOURCE_CHAIN_TXN_HASH is not a 32-byte hash: ${config.sourceChains.defaultTxHash}`);
  }

  if (errors.length) {
    throw new Error(`Invalid oracle-worker configuration:\n  - ${errors.join("\n  - ")}`);
  }
}

const isAddress = (v) => /^0x[0-9a-fA-F]{40}$/.test(v);
const isTxHash = (v) => /^0x[0-9a-fA-F]{64}$/.test(v);

module.exports = { load, isAddress, isTxHash };
