"use strict";

/**
 * Deterministic fixture source (AI_MONITOR_DATA_MODE=fixture).
 *
 * Why this exists rather than being test-only scaffolding:
 *
 *  - The full value of Aegis is the pipeline (risk detected -> proof built ->
 *    protection executed). Waiting for a real Sepolia position to actually
 *    approach liquidation is not a demo you can run on stage.
 *  - CI needs the monitor to boot and serve its API without secrets.
 *  - The oracle-worker team needs a reliable way to make an alert fire.
 *
 * The "decaying" fixture drops its health factor on a fixed schedule from the
 * moment the process starts, so a fresh boot reproduces the same alert timeline
 * every run: safe -> trending down -> breach -> critical.
 */

const { parseUnits } = require("../lib/units");
const { PROTOCOL } = require("./protocols");

/** Well-known test addresses. Lowercased; lookups are case-insensitive. */
const FIXTURE_USERS = {
  /** Steadily decaying position - crosses the 1.05 threshold ~2 min after boot. */
  DECAYING: "0x1111111111111111111111111111111111111111",
  /** Comfortably healthy, never alerts. Control case for the dashboard. */
  HEALTHY: "0x2222222222222222222222222222222222222222",
  /** Already liquidatable at boot. Fires a CRITICAL alert on the first tick. */
  CRITICAL: "0x3333333333333333333333333333333333333333",
  /** Supply-only, no debt. Exercises the infinite-health-factor path. */
  NO_DEBT: "0x4444444444444444444444444444444444444444",
};

/**
 * @param {object} deps
 * @param {object} deps.logger
 * @param {() => number} [deps.clock] injectable for tests
 * @param {number} [deps.startedAt]
 */
function createFixtureAdapter({ logger, clock = Date.now, startedAt = Date.now() } = {}) {
  const log = logger.child({ module: "fixtures" });

  /** Poll cadence the decay is expressed in, matching the default poller. */
  const TICK_SECONDS = 30;
  /**
   * Price decay per tick. Chosen so the decaying position crosses the 1.05
   * alert threshold about 2 minutes after boot and goes critical about 30s
   * later - fast enough to demo live, slow enough to narrate.
   */
  const DECAY_PER_TICK = 0.95;

  /**
   * ETH price used by the decaying fixture.
   *
   * Starting at $2000 against the position below (10 ETH at 82.5% backing
   * $13,000 of debt), the timeline is:
   *
   *   tick 0  (0:00)  $2000  HF 1.269  SAFE
   *   tick 2  (1:00)  $1805  HF 1.145  WATCH    (trend projects a breach)
   *   tick 4  (2:00)  $1629  HF 1.034  AT_RISK  (below the 1.05 threshold)
   *   tick 5  (2:30)  $1548  HF 0.982  CRITICAL (below 1.01, liquidatable)
   */
  function decayingEthPrice() {
    const elapsedSec = Math.max(0, (clock() - startedAt) / 1000);
    const ticks = Math.floor(elapsedSec / TICK_SECONDS);
    const price = 2000 * DECAY_PER_TICK ** ticks;
    return parseUnits(price.toFixed(6));
  }

  return {
    protocol: "fixture",

    supports() {
      return true;
    },

    /** Fixture prices override the price service for fixture-only symbols. */
    priceOverrides() {
      return new Map([["FIXTURE-ETH", decayingEthPrice()]]);
    },

    async fetchPosition(user, chainId) {
      const key = String(user).toLowerCase();

      if (key === FIXTURE_USERS.DECAYING) {
        // 10 ETH collateral @ 82.5% liquidation threshold against 13,000 USDC
        // of debt. See decayingEthPrice() above for the resulting timeline.
        log.debug("serving decaying fixture", { user, chainId });
        return {
          protocol: PROTOCOL.AAVE_V3,
          chainId,
          fixture: "decaying",
          collateral: [
            {
              symbol: "FIXTURE-ETH",
              address: "0x0000000000000000000000000000000000000eee",
              amountWad: parseUnits("10"),
              liquidationThresholdWad: parseUnits("0.825"),
            },
          ],
          debt: [
            {
              symbol: "FIXTURE-USD",
              address: "0x0000000000000000000000000000000000000d01",
              amountWad: parseUnits("13000"),
            },
          ],
        };
      }

      if (key === FIXTURE_USERS.HEALTHY) {
        return {
          protocol: PROTOCOL.AAVE_V3,
          chainId,
          fixture: "healthy",
          collateral: [
            {
              symbol: "FIXTURE-ETH-STABLE",
              address: "0x0000000000000000000000000000000000000eee",
              amountWad: parseUnits("50"),
              liquidationThresholdWad: parseUnits("0.825"),
            },
          ],
          debt: [
            {
              symbol: "FIXTURE-USD",
              address: "0x0000000000000000000000000000000000000d01",
              amountWad: parseUnits("10000"),
            },
          ],
        };
      }

      if (key === FIXTURE_USERS.CRITICAL) {
        // HF = 5*2000*0.825/8500 = 0.97 -> already liquidatable.
        return {
          protocol: PROTOCOL.AAVE_V3,
          chainId,
          fixture: "critical",
          collateral: [
            {
              symbol: "FIXTURE-ETH-STABLE",
              address: "0x0000000000000000000000000000000000000eee",
              amountWad: parseUnits("5"),
              liquidationThresholdWad: parseUnits("0.825"),
            },
          ],
          debt: [
            {
              symbol: "FIXTURE-USD",
              address: "0x0000000000000000000000000000000000000d01",
              amountWad: parseUnits("8500"),
            },
          ],
        };
      }

      if (key === FIXTURE_USERS.NO_DEBT) {
        return {
          protocol: PROTOCOL.AAVE_V3,
          chainId,
          fixture: "no-debt",
          collateral: [
            {
              symbol: "FIXTURE-ETH-STABLE",
              address: "0x0000000000000000000000000000000000000eee",
              amountWad: parseUnits("3"),
              liquidationThresholdWad: parseUnits("0.825"),
            },
          ],
          debt: [],
        };
      }

      // Unknown address in fixture mode: no position, not an error. Keeps the
      // API honest about the difference between "no position" and "failed".
      return null;
    },
  };
}

/**
 * Static prices for fixture-only symbols, so no network is needed at all.
 *
 * FIXTURE-ETH-STABLE is deliberately fixed: only the decaying position should
 * move, so the healthy/critical/no-debt fixtures stay true controls instead of
 * slowly drifting into the alert band alongside it.
 */
const FIXTURE_PRICES = new Map([
  ["FIXTURE-USD", parseUnits("1")],
  ["FIXTURE-ETH-STABLE", parseUnits("2000")],
]);

module.exports = { createFixtureAdapter, FIXTURE_USERS, FIXTURE_PRICES };
