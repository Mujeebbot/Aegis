"use strict";

/**
 * Manually drive the pipeline for one position, without ai-monitor.
 *
 * Run:
 *   npm run submit -- --user 0xAbc... --chain 11155111 --tx 0xdef...
 *   npm run submit -- --user 0xAbc... --chain 11155111 --tx 0xdef... --dry-run
 *
 * Useful for: the first real submission after deploying the contracts, and for
 * reproducing a failed job outside the queue where the output is easier to read.
 */

const { buildWorker, runStartupChecks } = require("../src/index");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    if (key === "dry-run") args.dryRun = true;
    else if (key === "no-recheck") args.noRecheck = true;
    else {
      args[key] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function usage() {
  process.stdout.write(`
Submit one position proof to the ASC contract.

  --user   <address>   position owner (required)
  --chain  <chainId>   source chain id, e.g. 11155111 (required)
  --tx     <hash>      source transaction to prove
                       (falls back to SOURCE_CHAIN_TXN_HASH)
  --hf     <number>    health factor to report on the alert (default 1.0)
  --dry-run            build and verify the proof but do not submit
  --no-recheck         skip the pre-submit risk re-check against ai-monitor

`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.user || !args.chain) {
    usage();
    process.exit(1);
    return;
  }

  const context = buildWorker();
  const { config, logger, pipeline } = context;

  if (args.dryRun) config.dryRun = true;
  if (args.noRecheck) config.monitor.recheckBeforeSubmit = false;

  await runStartupChecks(context);

  if (!context.readiness.chainConnected) {
    process.stderr.write(`\nCannot proceed: ${context.readiness.bootError}\n`);
    process.exit(1);
    return;
  }
  if (!config.dryRun && !context.readiness.contractDeployed) {
    process.stderr.write(
      `\nCannot submit: ${context.readiness.bootError || "ASC contract not deployed"}\n` +
        "Use --dry-run to exercise proof generation without submitting.\n",
    );
    process.exit(1);
    return;
  }

  // A synthetic alert in exactly the shape ai-monitor would send.
  const job = {
    id: "job_manual",
    alertId: `alert_manual_${Date.now()}`,
    alert: {
      user: args.user,
      chainId: Number(args.chain),
      healthFactor: Number(args.hf ?? 1.0),
      isAtRisk: true,
      sourceTxHash: args.tx,
      risk: { level: "CRITICAL", reason: "manual submission" },
    },
  };

  try {
    const result = await pipeline.process(job, logger);
    process.stdout.write(`\n${JSON.stringify(result, null, 2)}\n\n`);
    if (result.skipped) {
      process.stdout.write(`Skipped: ${result.reason}\n\n`);
    } else if (result.dryRun) {
      process.stdout.write("Dry run complete - proof built and verified, nothing submitted.\n\n");
    } else {
      process.stdout.write(`Submitted in tx ${result.txHash}\n\n`);
    }
    process.exit(0);
  } catch (err) {
    process.stderr.write(`\nSubmission failed: ${err.message}\n`);
    if (err.retriable === false) process.stderr.write("This error is permanent; retrying will not help.\n");
    process.stderr.write("\n");
    process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(`\nUnexpected error: ${err.stack || err.message}\n`);
  process.exit(1);
});
