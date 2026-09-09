"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  evaluateRisk,
  estimateTrend,
  secondsToThreshold,
  RiskLevel,
} = require("../src/core/risk");
const { parseUnits, MAX_HEALTH_FACTOR_WAD } = require("../src/lib/units");

const THRESHOLD = parseUnits("1.05");
const CRITICAL = parseUnits("1.01");

/** Build a descending/ascending HF history ending `now`. */
function history(values, stepMs = 30_000, now = Date.now()) {
  return values.map((v, i) => ({
    at: now - (values.length - 1 - i) * stepMs,
    healthFactorWad: parseUnits(String(v)),
  }));
}

test("flags a position already under the threshold", () => {
  const risk = evaluateRisk({
    healthFactorWad: parseUnits("1.02"),
    thresholdWad: THRESHOLD,
    criticalThresholdWad: CRITICAL,
  });
  assert.equal(risk.isAtRisk, true);
  assert.equal(risk.level, RiskLevel.AT_RISK);
});

test("escalates to CRITICAL below the critical threshold", () => {
  const risk = evaluateRisk({
    healthFactorWad: parseUnits("0.99"),
    thresholdWad: THRESHOLD,
    criticalThresholdWad: CRITICAL,
  });
  assert.equal(risk.level, RiskLevel.CRITICAL);
  assert.equal(risk.riskScore, 1);
});

test("leaves a comfortably healthy position alone", () => {
  const risk = evaluateRisk({
    healthFactorWad: parseUnits("2.5"),
    thresholdWad: THRESHOLD,
    criticalThresholdWad: CRITICAL,
    history: history([2.5, 2.5, 2.5, 2.5]),
  });
  assert.equal(risk.isAtRisk, false);
  assert.equal(risk.level, RiskLevel.SAFE);
});

test("alerts on trajectory before the threshold is actually breached", () => {
  // Currently 1.14 - above the 1.05 threshold - but falling steadily.
  // This is the whole point of the model: proving takes time, so a position
  // heading into liquidation must be caught before it arrives.
  const risk = evaluateRisk({
    healthFactorWad: parseUnits("1.14"),
    thresholdWad: THRESHOLD,
    criticalThresholdWad: CRITICAL,
    history: history([1.3, 1.26, 1.22, 1.18, 1.14], 120_000),
    forecastHorizonSec: 900,
  });

  assert.equal(risk.isAtRisk, true);
  assert.equal(risk.level, RiskLevel.WATCH);
  assert.match(risk.reason, /projected to breach/);
  assert.ok(risk.forecastHealthFactorWad < THRESHOLD);
  assert.ok(risk.secondsToThresholdBreach > 0 && risk.secondsToThresholdBreach < 900);
});

test("does not alert on a rising health factor", () => {
  const risk = evaluateRisk({
    healthFactorWad: parseUnits("1.20"),
    thresholdWad: THRESHOLD,
    criticalThresholdWad: CRITICAL,
    history: history([1.06, 1.1, 1.14, 1.18, 1.2], 120_000),
  });
  assert.equal(risk.isAtRisk, false);
  assert.ok(risk.trendSlopeWadPerSec > 0n);
  assert.equal(risk.secondsToThresholdBreach, null);
});

test("a single noisy sample is not enough to trigger a trajectory alert", () => {
  // Two samples only: not enough corroboration to justify spending gas.
  const risk = evaluateRisk({
    healthFactorWad: parseUnits("1.10"),
    thresholdWad: THRESHOLD,
    criticalThresholdWad: CRITICAL,
    history: history([1.9, 1.1], 30_000),
  });
  assert.equal(risk.isAtRisk, false, "needs >= 3 samples before trusting a trend");
});

test("a position with no debt is never at risk", () => {
  const risk = evaluateRisk({
    healthFactorWad: MAX_HEALTH_FACTOR_WAD,
    thresholdWad: THRESHOLD,
    criticalThresholdWad: CRITICAL,
  });
  assert.equal(risk.isAtRisk, false);
  assert.equal(risk.riskScore, 0);
  assert.equal(risk.forecastHealthFactorWad, MAX_HEALTH_FACTOR_WAD);
});

test("estimateTrend recovers a known slope", () => {
  // 0.01 HF lost per 30s tick = 1/3000 per second.
  const trend = estimateTrend(history([1.5, 1.49, 1.48, 1.47, 1.46], 30_000));
  const perSecond = Number(trend.slopeWadPerSec) / 1e18;
  assert.ok(Math.abs(perSecond - -1 / 3000) < 1e-6, `slope was ${perSecond}`);
  assert.equal(trend.samples, 5);
});

test("estimateTrend is well behaved with too little data", () => {
  assert.equal(estimateTrend([]).slopeWadPerSec, 0n);
  assert.equal(estimateTrend(history([1.2])).slopeWadPerSec, 0n);
  // Identical timestamps must not divide by zero.
  const now = Date.now();
  const flat = estimateTrend([
    { at: now, healthFactorWad: parseUnits("1.2") },
    { at: now, healthFactorWad: parseUnits("1.1") },
  ]);
  assert.equal(flat.slopeWadPerSec, 0n);
});

test("secondsToThreshold reports zero when already breached", () => {
  assert.equal(secondsToThreshold(parseUnits("1.0"), -1n, THRESHOLD), 0);
  // A flat or rising trend never arrives.
  assert.equal(secondsToThreshold(parseUnits("1.2"), 0n, THRESHOLD), null);
});

test("a broken predictor degrades to the linear trend instead of throwing", () => {
  const risk = evaluateRisk({
    healthFactorWad: parseUnits("1.20"),
    thresholdWad: THRESHOLD,
    criticalThresholdWad: CRITICAL,
    history: history([1.3, 1.26, 1.23, 1.2]),
    predictor: {
      predict() {
        throw new Error("model server unreachable");
      },
    },
  });
  assert.equal(risk.forecastSource, "linear-trend:predictor-failed");
  assert.ok(typeof risk.isAtRisk === "boolean");
});

test("a custom predictor overrides the linear forecast", () => {
  const risk = evaluateRisk({
    healthFactorWad: parseUnits("2.0"),
    thresholdWad: THRESHOLD,
    criticalThresholdWad: CRITICAL,
    history: history([2.0, 2.0, 2.0, 2.0]),
    predictor: {
      predict: () => ({
        forecastHealthFactorWad: parseUnits("0.9"),
        confidence: 0.9,
        source: "lstm-v1",
      }),
    },
  });
  assert.equal(risk.forecastSource, "lstm-v1");
  // The flat history means the trend slope is zero, so the trajectory rule
  // still requires a genuine downward slope - the predictor alone must not
  // manufacture an alert out of a flat series.
  assert.equal(risk.isAtRisk, false);
});
