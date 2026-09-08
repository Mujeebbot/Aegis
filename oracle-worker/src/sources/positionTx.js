"use strict";

/**
 * Resolving WHICH source-chain transaction to prove.
 *
 * The Attestcoin flow proves that a specific transaction was included in a
 * specific block on a source chain. So before any proof can be built, the
 * worker has to answer: which transaction evidences this user's position?
 *
 * Resolution order, most authoritative first:
 *
 *   1. `sourceTxHash` on the alert itself - ai-monitor knew it (because the
 *      frontend recorded it when the user enabled protection).
 *   2. ai-monitor's watchlist entry for this user/chain.
 *   3. SOURCE_CHAIN_TXN_HASH from env - the demo/testing fallback.
 *
 * If none resolve, that is a configuration gap, not a transient fault: the job
 * fails permanently rather than retrying forever against a missing input.
 */

const { requestJson } = require("../lib/http");
const { isTxHash } = require("../config");

class PositionTxResolver {
  /**
   * @param {object} deps
   * @param {object} deps.config
   * @param {object} deps.logger
   * @param {Function} [deps.fetchJson]
   */
  constructor({ config, logger, fetchJson = requestJson }) {
    this.config = config;
    this.logger = logger.child({ module: "position-tx" });
    this.fetchJson = fetchJson;
  }

  /**
   * @param {object} alert the incoming risk alert
   * @returns {Promise<{txHash: string, source: string}>}
   */
  async resolve(alert) {
    // 1. On the alert.
    if (isTxHash(alert.sourceTxHash || "")) {
      return { txHash: alert.sourceTxHash, source: "alert" };
    }

    // 2. From ai-monitor's watchlist.
    const fromWatchlist = await this.lookupWatchlist(alert.user, alert.chainId);
    if (fromWatchlist) return { txHash: fromWatchlist, source: "ai-monitor-watchlist" };

    // 3. Env fallback.
    if (isTxHash(this.config.sourceChains.defaultTxHash || "")) {
      this.logger.warn("using SOURCE_CHAIN_TXN_HASH fallback; proof will not be user specific", {
        user: alert.user,
        chainId: alert.chainId,
      });
      return { txHash: this.config.sourceChains.defaultTxHash, source: "env-default" };
    }

    throw Object.assign(
      new Error(
        `No source transaction to prove for ${alert.user} on chain ${alert.chainId}. ` +
          "Provide sourceTxHash on the alert, set it on the ai-monitor watchlist entry, " +
          "or configure SOURCE_CHAIN_TXN_HASH.",
      ),
      { retriable: false },
    );
  }

  /** Ask ai-monitor whether it has a source tx recorded for this position. */
  async lookupWatchlist(user, chainId) {
    if (!this.config.monitor.baseUrl) return null;
    try {
      const headers = {};
      if (this.config.monitor.apiKey) {
        headers.authorization = `Bearer ${this.config.monitor.apiKey}`;
      }
      const body = await this.fetchJson(`${this.config.monitor.baseUrl.replace(/\/$/, "")}/watchlist`, {
        headers,
        timeoutMs: this.config.monitor.timeoutMs,
        retries: 1,
      });
      const match = (body?.entries ?? []).find(
        (e) => e.user?.toLowerCase() === String(user).toLowerCase() && Number(e.chainId) === Number(chainId),
      );
      return isTxHash(match?.sourceTxHash || "") ? match.sourceTxHash : null;
    } catch (err) {
      this.logger.warn("could not read ai-monitor watchlist", { error: err.message });
      return null;
    }
  }

  /**
   * Re-check risk with ai-monitor immediately before submitting.
   *
   * Proof generation can take minutes. If the position recovered in that time,
   * Settlement.protectPosition would revert with "Position safe" - correctly,
   * but only after the gas is spent. This turns that into a free HTTP call.
   *
   * Returns null when the check cannot be performed, which the caller treats as
   * "proceed" rather than "abort" - a monitor outage must not block protection.
   */
  async recheckRisk(user, chainId) {
    if (!this.config.monitor.recheckBeforeSubmit || !this.config.monitor.baseUrl) return null;
    try {
      const url = `${this.config.monitor.baseUrl.replace(/\/$/, "")}/risk/${user}/${chainId}?fresh=1`;
      const body = await this.fetchJson(url, {
        timeoutMs: this.config.monitor.timeoutMs,
        retries: 1,
      });
      return {
        isAtRisk: Boolean(body?.isAtRisk),
        healthFactor: body?.healthFactor ?? null,
        healthFactorWad: body?.healthFactorWad ?? null,
        level: body?.risk?.level ?? null,
      };
    } catch (err) {
      this.logger.warn("pre-submit risk re-check failed; proceeding on the original alert", {
        user,
        chainId,
        error: err.message,
      });
      return null;
    }
  }
}

module.exports = { PositionTxResolver };
