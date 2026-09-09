"use strict";

/**
 * HTTP API for ai-monitor.
 *
 * This is the concrete form of the IAiMonitor interface in shared/interfaces.md.
 * Two consumers:
 *   - oracle-worker, deciding whether a proof is worth generating
 *   - frontend, rendering the dashboard
 *
 * Read routes are open (the data is public chain state). Mutating routes are
 * behind AI_MONITOR_API_KEY when one is configured.
 *
 * Routes
 *   GET  /healthz                       liveness
 *   GET  /readyz                        readiness (config + poller state)
 *   GET  /metrics                       counters for the demo dashboard
 *   GET  /chains                        supported chains + chainKey mapping
 *   GET  /positions/:user/:chainId      IAiMonitor.getPositionHealth
 *   GET  /risk/:user/:chainId           IAiMonitor.checkLiquidationRisk
 *   GET  /watchlist                     list monitored positions
 *   POST /watchlist                     add/update a monitored position
 *   DELETE /watchlist/:user/:chainId    stop monitoring
 *   GET  /alerts                        recently emitted alerts
 *   POST /poll                          force a poll tick (demo/debug)
 */

const crypto = require("node:crypto");

const express = require("express");

const { serializeSnapshot } = require("../core/positions");
const { serializeRisk } = require("../core/risk");
const { listChains } = require("../chains");
const { wadToNumber, parseUnits } = require("../lib/units");

function createServer({ config, logger, positionService, watchlist, poller, alertDispatcher }) {
  const app = express();
  const log = logger.child({ module: "api" });

  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));

  // Request logging + a request id that shows up in every downstream log line.
  let requestCounter = 0;
  app.use((req, res, next) => {
    const requestId = `req_${Date.now().toString(36)}_${(requestCounter += 1)}`;
    req.log = log.child({ requestId });
    const startedAt = Date.now();
    res.on("finish", () => {
      req.log.debug("request", {
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });
    next();
  });

  /** Shared-secret guard for mutating routes. */
  function requireApiKey(req, res, next) {
    if (!config.server.apiKey) return next();
    const header = req.get("authorization") || "";
    const provided = header.startsWith("Bearer ") ? header.slice(7) : req.get("x-api-key");
    if (!safeEqual(provided, config.server.apiKey)) {
      return res.status(401).json({ error: "unauthorized", message: "Valid API key required" });
    }
    return next();
  }

  // --- health & introspection -------------------------------------------------

  app.get("/healthz", (req, res) => {
    res.json({ status: "ok", service: "ai-monitor", uptimeSec: Math.floor(process.uptime()) });
  });

  app.get("/readyz", (req, res) => {
    // Ready means: configuration resolved and, if polling is enabled, the loop
    // is actually running. A monitor that is not polling is not monitoring.
    const pollerReady = !config.poller.enabled || poller.running;
    const ready = pollerReady;
    res.status(ready ? 200 : 503).json({
      ready,
      dataMode: config.dataMode,
      pollerRunning: poller.running,
      pollerEnabled: config.poller.enabled,
      watchlistSize: watchlist.size,
      lastTickAt: poller.stats.lastTickAt,
    });
  });

  app.get("/metrics", (req, res) => {
    res.json({
      service: "ai-monitor",
      dataMode: config.dataMode,
      uptimeSec: Math.floor(process.uptime()),
      watchlistSize: watchlist.size,
      poller: poller.stats,
      alerts: alertDispatcher.stats,
      thresholds: {
        default: wadToNumber(config.risk.defaultThresholdWad),
        critical: wadToNumber(config.risk.criticalThresholdWad),
      },
    });
  });

  app.get("/chains", (req, res) => {
    res.json({
      chains: listChains().map((c) => ({
        chainId: c.chainId,
        chainKey: c.chainKey,
        name: c.name,
        isTestnet: c.isTestnet,
      })),
    });
  });

  // --- IAiMonitor ------------------------------------------------------------

  /** getPositionHealth(user, chainId) -> healthFactor (+ full breakdown) */
  app.get(
    "/positions/:user/:chainId",
    asyncRoute(async (req, res) => {
      const { user, chainId } = parseParams(req);
      const fresh = req.query.fresh === "1" || req.query.fresh === "true";
      const snapshot = await positionService.getPositionHealth(user, chainId, { fresh });
      res.json(serializeSnapshot(snapshot));
    }),
  );

  /** checkLiquidationRisk(user, chainId) -> (isAtRisk, threshold) */
  app.get(
    "/risk/:user/:chainId",
    asyncRoute(async (req, res) => {
      const { user, chainId } = parseParams(req);
      const fresh = req.query.fresh === "1" || req.query.fresh === "true";

      let thresholdWad;
      if (req.query.threshold !== undefined) {
        try {
          thresholdWad = parseUnits(String(req.query.threshold));
        } catch {
          return res
            .status(400)
            .json({ error: "bad_request", message: "threshold must be a decimal number" });
        }
      }

      const { snapshot, risk, governingHealthFactorWad } =
        await positionService.checkLiquidationRisk(user, chainId, { thresholdWad, fresh });

      // The two fields the interface promises are hoisted to the top level so
      // callers never have to dig for them; the rest is context.
      return res.json({
        isAtRisk: risk.isAtRisk,
        threshold: wadToNumber(risk.thresholdWad),
        thresholdWad: risk.thresholdWad.toString(),
        user: snapshot.user,
        chainId: snapshot.chainId,
        chainKey: snapshot.chainKey,
        healthFactor: wadToNumber(governingHealthFactorWad),
        healthFactorWad: governingHealthFactorWad.toString(),
        hasPosition: snapshot.hasPosition,
        degraded: snapshot.degraded,
        observedAt: snapshot.observedAt,
        risk: serializeRisk(risk),
      });
    }),
  );

  // --- watchlist -------------------------------------------------------------

  app.get("/watchlist", (req, res) => {
    res.json({ entries: watchlist.list().map((e) => watchlist.serialize(e)) });
  });

  app.post(
    "/watchlist",
    requireApiKey,
    asyncRoute(async (req, res) => {
      const { user, chainId, threshold, protocol, sourceTxHash } = req.body ?? {};
      if (!user || chainId === undefined) {
        return res
          .status(400)
          .json({ error: "bad_request", message: "user and chainId are required" });
      }
      const entry = watchlist.add({
        user,
        chainId,
        threshold,
        protocol,
        sourceTxHash,
        source: "api",
      });
      return res.status(201).json(watchlist.serialize(entry));
    }),
  );

  app.delete(
    "/watchlist/:user/:chainId",
    requireApiKey,
    asyncRoute(async (req, res) => {
      const { user, chainId } = parseParams(req);
      const removed = watchlist.remove(user, chainId);
      positionService.clearHistory(user, chainId);
      return res.status(removed ? 204 : 404).end();
    }),
  );

  // --- alerts & manual control ----------------------------------------------

  app.get("/alerts", (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 25, 100);
    res.json({ alerts: alertDispatcher.getRecent(limit), stats: alertDispatcher.stats });
  });

  /** Force a tick. Useful on stage and in integration tests. */
  app.post(
    "/poll",
    requireApiKey,
    asyncRoute(async (req, res) => {
      const result = await poller.tick();
      return res.json(result);
    }),
  );

  // --- error handling --------------------------------------------------------

  app.use((req, res) => {
    res.status(404).json({ error: "not_found", message: `No route for ${req.method} ${req.path}` });
  });

  app.use((err, req, res, _next) => {
    const status = err.statusCode || 500;
    if (status >= 500) req.log?.error("unhandled route error", { error: err });
    else req.log?.debug("request rejected", { status, message: err.message });
    res.status(status).json({
      error: status >= 500 ? "internal_error" : "bad_request",
      message: status >= 500 ? "Internal error" : err.message,
    });
  });

  return app;
}


/**
 * Constant-time secret comparison.
 *
 * `!==` returns as soon as two bytes differ, so response latency leaks how much
 * of the key a caller has guessed. Lengths are hashed to a fixed width first
 * because timingSafeEqual throws on a length mismatch, which would leak the
 * key length on its own.
 */
function safeEqual(provided, expected) {
  if (typeof provided !== "string") return false;
  const a = crypto.createHash("sha256").update(provided).digest();
  const b = crypto.createHash("sha256").update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Route params are strings; normalise and validate once. */
function parseParams(req) {
  const user = String(req.params.user || "");
  const chainId = Number(req.params.chainId);
  if (!Number.isInteger(chainId)) {
    throw Object.assign(new Error(`chainId must be an integer, got ${req.params.chainId}`), {
      statusCode: 400,
    });
  }
  return { user, chainId };
}

/** Express 4 does not await async handlers; forward rejections to the error mw. */
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

module.exports = { createServer };
