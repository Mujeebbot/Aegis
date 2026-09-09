"use strict";

/**
 * The fixture data source is what makes the alert -> proof pipeline demoable
 * without waiting for a real position to approach liquidation, so its timeline
 * needs to be as reliable as any other production path.
 *
 * These tests drive it with a controlled clock and assert that the decaying
 * position actually walks down through the risk bands.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { createFixtureAdapter, FIXTURE_USERS, FIXTURE_PRICES } = require("../src/sources/fixtures");
const { createLogger } = require("../src/lib/logger");
const { PositionService } = require("../src/core/positions");
const { Watchlist } = require("../src/watchlist");
const { parseUnits, wadToNumber } = require("../src/lib/units");
const { RiskLevel, RISK_ORDER } = require("../src/core/risk");

const logger = createLogger("test", { level: "error" });
const CHAIN_ID = 11155111;

function testConfig() {
  return {
    risk: {
      defaultThresholdWad: parseUnits("1.05"),
      criticalThresholdWad: parseUnits("1.01"),
      forecastHorizonSec: 900,
      historySize: 40,
      alertCooldownMs: 300_000,
    },
    watchlist: [],
  };
}

/** A PositionService backed by the fixture adapter on a clock we control. */
function harness() {
  const startedAt = 1_000_000;
  let now = startedAt;
  const clock = () => now;

  const fixture = createFixtureAdapter({ logger, clock, startedAt });
  const config = testConfig();

  const service = new PositionService({
    config,
    logger,
    // History timestamps must come from the same clock the fixture prices move
    // on, otherwise the trend model sees a large HF change across zero seconds.
    clock,
    priceService: {
      getPrices: async () => {
        throw new Error("fixture mode must not reach the price service");
      },
    },
    adapters: [fixture],
    watchlist: new Watchlist({ logger, config, filePath: null }),
    // Mirrors the DynamicPriceOverrides wiring in src/index.js.
    priceOverrides: {
      get(symbol) {
        const dynamic = fixture.priceOverrides();
        return dynamic.has(symbol) ? dynamic.get(symbol) : FIXTURE_PRICES.get(symbol);
      },
    },
  });

  return {
    service,
    advanceSeconds(seconds) {
      now += seconds * 1000;
      // Snapshots are cached for 10s; a time jump must not serve stale data.
      service.snapshotCache.clear();
    },
  };
}

test("fixture mode resolves prices locally and never calls the price service", async () => {
  const { service } = harness();
  // The stub price service throws if reached, so this passing proves isolation.
  const snapshot = await service.getPositionHealth(FIXTURE_USERS.DECAYING, CHAIN_ID);
  assert.equal(snapshot.hasPosition, true);
  assert.equal(snapshot.degraded, false);
});

test("the decaying fixture starts healthy", async () => {
  const { service } = harness();
  const { risk, governingHealthFactorWad } = await service.checkLiquidationRisk(
    FIXTURE_USERS.DECAYING,
    CHAIN_ID,
  );
  // 10 ETH @ $2000 * 0.825 / $13,000 debt = 1.269
  assert.ok(Math.abs(wadToNumber(governingHealthFactorWad) - 1.269) < 0.01);
  assert.equal(risk.isAtRisk, false);
  assert.equal(risk.level, RiskLevel.SAFE);
});

test("the decaying fixture walks down through the risk bands", async () => {
  const { service, advanceSeconds } = harness();
  const seen = [];

  // 20 minutes at the 30s poll cadence.
  for (let tick = 0; tick < 40; tick += 1) {
    const { risk, governingHealthFactorWad } = await service.checkLiquidationRisk(
      FIXTURE_USERS.DECAYING,
      CHAIN_ID,
    );
    seen.push({ tick, hf: wadToNumber(governingHealthFactorWad), level: risk.level });
    advanceSeconds(30);
  }

  const levels = seen.map((s) => s.level);
  assert.ok(levels.includes(RiskLevel.SAFE), "should start SAFE");
  assert.ok(levels.includes(RiskLevel.AT_RISK), "should reach AT_RISK");
  assert.ok(levels.includes(RiskLevel.CRITICAL), "should reach CRITICAL");

  // Health factor must fall monotonically - a demo that bounces is confusing.
  for (let i = 1; i < seen.length; i += 1) {
    assert.ok(seen[i].hf <= seen[i - 1].hf, `HF rose at tick ${i}: ${seen[i - 1].hf} -> ${seen[i].hf}`);
  }

  // Bands must only ever escalate, never flip back and forth.
  let highest = 0;
  for (const { level } of seen) {
    const rank = RISK_ORDER.indexOf(level);
    assert.ok(rank >= highest, `risk band went backwards to ${level}`);
    highest = rank;
  }
});

test("the healthy fixture never alerts", async () => {
  const { service, advanceSeconds } = harness();
  for (let tick = 0; tick < 40; tick += 1) {
    const { risk } = await service.checkLiquidationRisk(FIXTURE_USERS.HEALTHY, CHAIN_ID);
    assert.equal(risk.isAtRisk, false, `alerted at tick ${tick}`);
    advanceSeconds(30);
  }
});

test("the critical fixture is at risk on the very first tick", async () => {
  const { service } = harness();
  const { risk } = await service.checkLiquidationRisk(FIXTURE_USERS.CRITICAL, CHAIN_ID);
  assert.equal(risk.isAtRisk, true);
  assert.equal(risk.level, RiskLevel.CRITICAL);
});

test("the no-debt fixture reports an infinite health factor and never alerts", async () => {
  const { service } = harness();
  const { snapshot, risk } = await service.checkLiquidationRisk(FIXTURE_USERS.NO_DEBT, CHAIN_ID);
  assert.equal(snapshot.hasPosition, true);
  // Infinite HF serialises as null, not Infinity.
  assert.equal(snapshot.health.healthFactor, null);
  assert.equal(risk.isAtRisk, false);
});

test("an unknown address reports no position rather than an error", async () => {
  const { service } = harness();
  const snapshot = await service.getPositionHealth(`0x${"99".repeat(20)}`, CHAIN_ID);
  assert.equal(snapshot.hasPosition, false);
  // "no position" is not a failure - degraded must stay false.
  assert.equal(snapshot.degraded, false);
});
