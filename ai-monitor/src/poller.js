"use strict";

/**
 * The 30s monitoring loop.
 *
 * Each tick evaluates every watchlist entry, records an HF sample for trend
 * estimation, and dispatches an alert for anything the risk model flags.
 *
 * Three properties matter here:
 *   - Ticks never overlap. A slow tick delays the next one rather than stacking
 *     concurrent subgraph queries on top of each other.
 *   - Failures are per-position. One unreachable subgraph must not stop the
 *     other watched positions from being evaluated.
 *   - Concurrency is bounded, so a 200-entry watchlist does not open 200
 *     simultaneous connections and get rate limited.
 */

const { serializeRisk } = require("./core/risk");
const { wadToNumber } = require("./lib/units");

class Poller {
  /**
   * @param {object} deps
   * @param {object} deps.config
   * @param {object} deps.logger
   * @param {object} deps.positionService
   * @param {object} deps.watchlist
   * @param {object} deps.alertDispatcher
   */
  constructor({ config, logger, positionService, watchlist, alertDispatcher }) {
    this.config = config;
    this.logger = logger.child({ module: "poller" });
    this.positionService = positionService;
    this.watchlist = watchlist;
    this.alertDispatcher = alertDispatcher;

    this.timer = null;
    this.running = false;
    this.tickInFlight = false;
    this.stats = {
      ticks: 0,
      evaluated: 0,
      alerts: 0,
      errors: 0,
      lastTickAt: null,
      lastTickDurationMs: null,
      lastError: null,
    };
  }

  start() {
    if (this.running) return this;
    this.running = true;
    this.logger.info("poller started", {
      intervalMs: this.config.poller.intervalMs,
      concurrency: this.config.poller.concurrency,
      watched: this.watchlist.size,
    });

    // Kick off immediately so a fresh boot does not sit idle for 30s, then
    // settle into the interval. unref() lets the process exit on SIGTERM even
    // if a timer is pending.
    this.tick().catch((err) => this.logger.error("initial tick failed", { error: err }));
    this.timer = setInterval(() => {
      this.tick().catch((err) => this.logger.error("tick failed", { error: err }));
    }, this.config.poller.intervalMs);
    this.timer.unref?.();
    return this;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.running = false;
    this.logger.info("poller stopped", this.stats);
    return this;
  }

  /** One full pass over the watchlist. Safe to call manually (POST /poll). */
  async tick() {
    if (this.tickInFlight) {
      this.logger.warn("skipping tick; previous tick still running", {
        intervalMs: this.config.poller.intervalMs,
      });
      return { skipped: true };
    }

    this.tickInFlight = true;
    const startedAt = Date.now();
    const entries = this.watchlist.list();
    const results = [];

    try {
      await runWithConcurrency(entries, this.config.poller.concurrency, async (entry) => {
        const result = await this.evaluate(entry);
        results.push(result);
      });

      this.stats.ticks += 1;
      this.stats.evaluated += results.length;
      this.stats.lastTickAt = new Date().toISOString();
      this.stats.lastTickDurationMs = Date.now() - startedAt;

      const alerted = results.filter((r) => r.alerted).length;
      this.logger.info("tick complete", {
        evaluated: results.length,
        alerted,
        failed: results.filter((r) => r.error).length,
        durationMs: this.stats.lastTickDurationMs,
      });

      return { evaluated: results.length, alerted, results };
    } finally {
      this.tickInFlight = false;
    }
  }

  /** Evaluate one watchlist entry and alert if warranted. */
  async evaluate(entry) {
    const log = this.logger.child({ user: entry.user, chainId: entry.chainId });

    try {
      const { snapshot, risk, governingHealthFactorWad } =
        await this.positionService.checkLiquidationRisk(entry.user, entry.chainId, {
          thresholdWad: entry.thresholdWad,
          fresh: true,
        });

      if (!snapshot.hasPosition) {
        log.debug("no position found; nothing to evaluate");
        return { user: entry.user, chainId: entry.chainId, hasPosition: false, alerted: false };
      }

      log.debug("evaluated", {
        healthFactor: wadToNumber(governingHealthFactorWad),
        riskLevel: risk.level,
        riskScore: risk.riskScore,
      });

      if (!risk.isAtRisk) {
        return {
          user: entry.user,
          chainId: entry.chainId,
          healthFactor: wadToNumber(governingHealthFactorWad),
          riskLevel: risk.level,
          alerted: false,
        };
      }

      // A degraded snapshot (missing debt price, failed subgraph) can produce a
      // spuriously low HF. Proof submission costs gas and is irreversible, so
      // hold off unless the position is genuinely critical.
      if (snapshot.degraded && risk.level !== "CRITICAL") {
        log.warn("suppressing alert from degraded snapshot", {
          riskLevel: risk.level,
          sourceErrors: snapshot.sourceErrors,
          priceIssues: snapshot.priceIssues,
        });
        return {
          user: entry.user,
          chainId: entry.chainId,
          riskLevel: risk.level,
          alerted: false,
          suppressed: "degraded-snapshot",
        };
      }

      if (!this.watchlist.shouldAlert(entry.user, entry.chainId, risk.level)) {
        log.debug("alert suppressed by cooldown", { riskLevel: risk.level });
        return {
          user: entry.user,
          chainId: entry.chainId,
          riskLevel: risk.level,
          alerted: false,
          suppressed: "cooldown",
        };
      }

      const payload = this.alertDispatcher.buildPayload(
        snapshot,
        risk,
        governingHealthFactorWad,
        entry,
      );
      const dispatch = await this.alertDispatcher.dispatch(payload);

      // Only start the cooldown once an alert actually left the building;
      // otherwise a webhook outage would silence us for the whole cooldown.
      if (dispatch.delivered) {
        this.watchlist.markAlerted(entry.user, entry.chainId, risk.level);
        this.stats.alerts += 1;
      }

      log.info("risk alert raised", {
        alertId: payload.alertId,
        riskLevel: risk.level,
        healthFactor: payload.healthFactor,
        delivered: dispatch.delivered,
      });

      return {
        user: entry.user,
        chainId: entry.chainId,
        healthFactor: payload.healthFactor,
        riskLevel: risk.level,
        alerted: true,
        delivered: dispatch.delivered,
        alertId: payload.alertId,
        risk: serializeRisk(risk),
      };
    } catch (err) {
      this.stats.errors += 1;
      this.stats.lastError = { at: new Date().toISOString(), message: err.message };
      log.error("evaluation failed", { error: err });
      return { user: entry.user, chainId: entry.chainId, alerted: false, error: err.message };
    }
  }
}

/**
 * Bounded-concurrency map. A fixed pool of workers pulls from a shared cursor,
 * so `limit` requests are in flight at any moment regardless of how uneven the
 * per-item latency is.
 */
async function runWithConcurrency(items, limit, worker) {
  const size = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;
  const workers = Array.from({ length: size }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(workers);
}

module.exports = { Poller, runWithConcurrency };
