"use strict";

/**
 * oracle-worker HTTP API.
 *
 * Primarily the alert intake ai-monitor POSTs to; the rest is operational
 * visibility, which matters when the interesting failures are minutes-long
 * attestation waits rather than immediate errors.
 *
 * Routes
 *   POST /alerts          intake (this is ORACLE_WORKER_WEBHOOK_URL)
 *   GET  /healthz         liveness
 *   GET  /readyz          readiness - chain reachable, contract deployed, funded
 *   GET  /metrics         queue + submission counters
 *   GET  /jobs            recent jobs
 *   GET  /jobs/:jobId     one job, with its full step history
 */

const crypto = require("node:crypto");

const express = require("express");

const { serializeJob } = require("./queue");

function createServer({ config, logger, queue, creditcoin, ascClient, readiness }) {
  const app = express();
  const log = logger.child({ module: "api" });

  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));

  let requestCounter = 0;
  app.use((req, res, next) => {
    req.log = log.child({ requestId: `req_${Date.now().toString(36)}_${(requestCounter += 1)}` });
    next();
  });

  function requireApiKey(req, res, next) {
    if (!config.server.apiKey) return next();
    const header = req.get("authorization") || "";
    const provided = header.startsWith("Bearer ") ? header.slice(7) : req.get("x-api-key");
    if (!safeEqual(provided, config.server.apiKey)) {
      return res.status(401).json({ error: "unauthorized", message: "Valid API key required" });
    }
    return next();
  }

  /**
   * Alert intake.
   *
   * Responds 202 as soon as the job is queued rather than holding the
   * connection for the whole pipeline - proof generation can take minutes, far
   * longer than ai-monitor's HTTP timeout.
   */
  app.post("/alerts", requireApiKey, (req, res) => {
    const alert = req.body;
    if (!alert || typeof alert !== "object") {
      return res.status(400).json({ error: "bad_request", message: "JSON alert body required" });
    }

    try {
      const { job, duplicate } = queue.enqueue(alert);
      return res.status(duplicate ? 200 : 202).json({
        accepted: true,
        duplicate,
        jobId: job.id,
        alertId: job.alertId,
        state: job.state,
      });
    } catch (err) {
      req.log.error("failed to enqueue alert", { error: err });
      return res.status(err.statusCode || 500).json({
        error: "enqueue_failed",
        message: err.message,
      });
    }
  });

  app.get("/healthz", (req, res) => {
    res.json({ status: "ok", service: "oracle-worker", uptimeSec: Math.floor(process.uptime()) });
  });

  app.get("/readyz", (req, res) => {
    // readiness is captured at boot by index.js, so this route stays cheap
    // enough to poll and does not hammer the RPC.
    const ready = readiness.chainConnected && readiness.contractDeployed && !readiness.underfunded;
    res.status(ready ? 200 : 503).json({
      ready,
      ...readiness,
      dryRun: config.dryRun,
      signer: creditcoin.address,
      asc: ascClient.address || null,
    });
  });

  app.get("/metrics", (req, res) => {
    res.json({
      service: "oracle-worker",
      uptimeSec: Math.floor(process.uptime()),
      queue: { ...queue.stats, depth: queue.depth, active: queue.activeCount },
      dryRun: config.dryRun,
      preflight: config.proofs.preflight,
      signer: creditcoin.address,
      asc: ascClient.address || null,
    });
  });

  app.get("/jobs", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    res.json({ jobs: queue.list(limit), stats: queue.stats });
  });

  app.get("/jobs/:jobId", (req, res) => {
    const job = queue.get(req.params.jobId);
    if (!job) return res.status(404).json({ error: "not_found", message: "No such job" });
    return res.json(serializeJob(job));
  });

  app.use((req, res) => {
    res.status(404).json({ error: "not_found", message: `No route for ${req.method} ${req.path}` });
  });

  app.use((err, req, res, _next) => {
    const status = err.statusCode || 500;
    if (status >= 500) req.log?.error("unhandled route error", { error: err });
    res.status(status).json({
      error: status >= 500 ? "internal_error" : "bad_request",
      message: status >= 500 ? "Internal error" : err.message,
    });
  });

  return app;
}

/**
 * Constant-time secret comparison. Hashing first gives both sides a fixed
 * width, so neither the key's content nor its length leaks through timing.
 */
function safeEqual(provided, expected) {
  if (typeof provided !== "string") return false;
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

module.exports = { createServer };
