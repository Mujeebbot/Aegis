"use strict";

/**
 * Risk alert dispatch: ai-monitor -> oracle-worker.
 *
 * The wire payload is the contract defined in shared/interfaces.md:
 *
 *   { user, chainId, healthFactor, isAtRisk }
 *
 * Those four fields are guaranteed and are all the worker strictly needs.
 * Everything else below them is additive context the worker uses to avoid
 * re-deriving work ai-monitor has already done - chainKey (so it does not have
 * to redo the chainId -> chainKey mapping), healthFactorWad (so it never has to
 * float-parse a value destined for a uint256), and the risk breakdown for logs.
 *
 * Delivery is at-least-once with retries. Every alert carries a stable
 * `alertId`, and the worker de-duplicates on it - see oracle-worker/src/queue.js.
 */

const crypto = require("node:crypto");

const { requestJson } = require("./lib/http");
const { wadToNumber } = require("./lib/units");
const { serializeRisk } = require("./core/risk");

class AlertDispatcher {
  /**
   * @param {object} deps
   * @param {object} deps.config config.alerts
   * @param {object} deps.logger
   * @param {Function} [deps.fetchJson]
   */
  constructor({ config, logger, fetchJson = requestJson }) {
    this.config = config;
    this.logger = logger.child({ module: "alerts" });
    this.fetchJson = fetchJson;
    this.stats = { sent: 0, failed: 0, skipped: 0 };
    /** Recent alerts, newest first, for GET /alerts and the demo UI. */
    this.recent = [];
  }

  /**
   * Build the wire payload from a snapshot + risk assessment.
   *
   * @param {object} snapshot
   * @param {object} risk
   * @param {bigint} governingHealthFactorWad
   * @param {object} [entry] the watchlist entry, when the alert came from the
   *        poller. It carries `sourceTxHash` - the transaction oracle-worker
   *        should prove. Sending it here lets the worker take its most
   *        authoritative resolution path instead of calling back to
   *        /watchlist, and stops a failed callback silently degrading to the
   *        SOURCE_CHAIN_TXN_HASH default, which would prove the wrong
   *        transaction for this user.
   */
  buildPayload(snapshot, risk, governingHealthFactorWad, entry = null) {
    const healthFactorWad = governingHealthFactorWad ?? snapshot.health.healthFactorWad;

    return {
      // --- the four fields shared/interfaces.md guarantees ---
      user: snapshot.user,
      chainId: snapshot.chainId,
      healthFactor: wadToNumber(healthFactorWad),
      isAtRisk: risk.isAtRisk,

      // --- additive context ---
      alertId: buildAlertId(snapshot, risk),
      healthFactorWad: healthFactorWad.toString(),
      chainKey: snapshot.chainKey,
      observedAt: snapshot.observedAt,
      emittedAt: new Date().toISOString(),
      degraded: snapshot.degraded,
      protocol: snapshot.weakest?.protocol ?? null,
      // Omitted entirely rather than sent as null, so the worker's
      // isTxHash() guard sees an absent field rather than a falsy one.
      ...(entry?.sourceTxHash ? { sourceTxHash: entry.sourceTxHash } : {}),
      risk: serializeRisk(risk),
    };
  }

  /**
   * POST an alert to the worker. Returns a result object rather than throwing:
   * a failed dispatch must not abort the poll tick for other positions.
   */
  async dispatch(payload) {
    this.remember(payload);

    if (!this.config.enabled || !this.config.webhookUrl) {
      this.stats.skipped += 1;
      this.logger.debug("alert dispatch disabled; not sending", { alertId: payload.alertId });
      return { delivered: false, skipped: true };
    }

    const headers = { "content-type": "application/json" };
    if (this.config.apiKey) headers.authorization = `Bearer ${this.config.apiKey}`;

    try {
      const response = await this.fetchJson(this.config.webhookUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        timeoutMs: this.config.timeoutMs,
        retries: this.config.retries,
        onRetry: (attempt, err) =>
          this.logger.warn("alert dispatch retry", {
            alertId: payload.alertId,
            attempt,
            error: err.message,
          }),
      });

      this.stats.sent += 1;
      this.logger.info("alert delivered", {
        alertId: payload.alertId,
        user: payload.user,
        chainId: payload.chainId,
        healthFactor: payload.healthFactor,
        riskLevel: payload.risk.level,
        jobId: response?.jobId,
      });
      return { delivered: true, response };
    } catch (err) {
      this.stats.failed += 1;
      this.logger.error("alert dispatch failed", {
        alertId: payload.alertId,
        user: payload.user,
        chainId: payload.chainId,
        webhookUrl: this.config.webhookUrl,
        error: err.message,
      });
      return { delivered: false, error: err.message };
    }
  }

  remember(payload) {
    this.recent.unshift({ ...payload, recordedAt: new Date().toISOString() });
    if (this.recent.length > 100) this.recent.length = 100;
  }

  getRecent(limit = 25) {
    return this.recent.slice(0, limit);
  }
}

/**
 * Stable id for one alert.
 *
 * Deliberately NOT time-based: it is derived from the position, the risk band
 * and the observation timestamp, so a retry of the same observation produces
 * the same id and the worker can drop the duplicate. A genuinely new
 * observation (later timestamp) or an escalation (different level) produces a
 * new id and is processed.
 */
function buildAlertId(snapshot, risk) {
  const material = [snapshot.user, snapshot.chainId, risk.level, snapshot.observedAt].join("|");
  return `alert_${crypto.createHash("sha256").update(material).digest("hex").slice(0, 32)}`;
}

module.exports = { AlertDispatcher, buildAlertId };
