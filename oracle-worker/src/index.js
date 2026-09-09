"use strict";

/**
 * oracle-worker entrypoint.
 *
 * Boot sequence is deliberately verbose: it verifies the RPC, the chainKey
 * registry and the ASC deployment up front, so a misconfiguration shows up in
 * the first five seconds rather than on the first real alert.
 */

const { load } = require("./config");
const { createLogger } = require("./lib/logger");
const { CreditcoinClient } = require("./chain/creditcoin");
const { AscClient } = require("./chain/asc");
const { ProofService } = require("./proofs/builder");
const { PositionTxResolver } = require("./sources/positionTx");
const { Pipeline } = require("./pipeline");
const { JobQueue } = require("./queue");
const { createServer } = require("./server");

/**
 * Build the object graph without touching the network. Exported for tests.
 * @param {object} [overrides]
 */
function buildWorker(overrides = {}) {
  const config = overrides.config ?? load();
  const logger = overrides.logger ?? createLogger("oracle-worker");

  const creditcoin = overrides.creditcoin ?? new CreditcoinClient({ config, logger });
  const ascClient = overrides.ascClient ?? new AscClient({ config, logger, creditcoin });
  const proofService = overrides.proofService ?? new ProofService({ config, logger, creditcoin });
  const txResolver = overrides.txResolver ?? new PositionTxResolver({ config, logger });

  const pipeline =
    overrides.pipeline ??
    new Pipeline({ config, logger, proofService, ascClient, txResolver });

  const queue =
    overrides.queue ??
    new JobQueue({
      config: config.queue,
      logger,
      handler: (job, log) => pipeline.process(job, log),
    });

  const readiness = {
    chainConnected: false,
    contractDeployed: false,
    underfunded: false,
    chainRegistryChecked: false,
    bootError: null,
  };

  const app = createServer({ config, logger, queue, creditcoin, ascClient, readiness });

  return { config, logger, app, queue, creditcoin, ascClient, proofService, pipeline, readiness };
}

/**
 * Network-touching startup checks. Each failure degrades readiness rather than
 * killing the process, so /readyz can explain what is wrong.
 */
async function runStartupChecks({ config, logger, creditcoin, ascClient, proofService, readiness }) {
  try {
    const info = await creditcoin.connect();
    readiness.chainConnected = true;
    readiness.underfunded = Boolean(info.underfunded);
  } catch (err) {
    readiness.bootError = `chain connection failed: ${err.message}`;
    logger.error("could not connect to Creditcoin", { error: err.message });
    return readiness;
  }

  try {
    await proofService.verifyChainRegistry();
    readiness.chainRegistryChecked = true;
  } catch (err) {
    // Non-fatal: the registry cross-check is a safety net, not a dependency.
    logger.warn("could not read the chain-info precompile", { error: err.message });
  }

  if (config.contracts.asc) {
    try {
      await ascClient.assertDeployed();
      readiness.contractDeployed = true;
    } catch (err) {
      readiness.bootError = err.message;
      logger.error("ASC contract check failed", { error: err.message });
    }
  } else {
    logger.warn("ASC_CONTRACT_ADDRESS is not set - alerts will queue but cannot be submitted", {
      hint: "run contracts/scripts/deploy.js, then set ASC_CONTRACT_ADDRESS",
    });
  }

  return readiness;
}

async function main() {
  let context;
  try {
    context = buildWorker();
  } catch (err) {
    process.stderr.write(`oracle-worker failed to start: ${err.message}\n`);
    process.exit(1);
    return;
  }

  const { config, logger, app, queue } = context;

  const server = app.listen(config.server.port, config.server.host, () => {
    logger.info("oracle-worker listening", {
      host: config.server.host,
      port: config.server.port,
      intake: `POST http://${config.server.host}:${config.server.port}/alerts`,
      dryRun: config.dryRun,
    });
    if (config.dryRun) {
      logger.warn("ORACLE_DRY_RUN is on - proofs will be built and verified but never submitted");
    }
  });

  await runStartupChecks(context);

  const shutdown = (signal) => {
    logger.info("shutting down", { signal, queueDepth: queue.depth, stats: queue.stats });
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error("unhandled rejection", {
      error: reason instanceof Error ? reason : String(reason),
    });
  });
}

if (require.main === module) main();

module.exports = { buildWorker, runStartupChecks };
