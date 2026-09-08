"use strict";

/**
 * Risk model.
 *
 * A pure threshold check ("HF < 1.05 -> alert") is too late: proving a position
 * cross-chain takes time (attestation wait + proof build + submission), so by
 * the time protection lands the position may already be liquidated. This model
 * therefore alerts on TWO conditions:
 *
 *   1. Level      - HF is already under the configured threshold.
 *   2. Trajectory - HF is falling fast enough to cross the threshold inside the
 *                   forecast horizon, even though it is fine right now.
 *
 * Trend is estimated by ordinary least squares over recent (t, HF) samples, so
 * a single noisy price tick does not trigger a proof submission. Everything is
 * deterministic and unit-testable.
 *
 * SWAPPING IN A REAL MODEL: evaluateRisk takes an optional `predictor`
 * implementing predict({history, healthFactorWad, ...}) -> {forecastHealthFactorWad,
 * confidence}. The AI/ML engineer can drop an ML forecaster in there without
 * touching the poller, the API, or the alert contract.
 */

const {
  WAD,
  MAX_HEALTH_FACTOR_WAD,
  wadToNumber,
  formatUnits,
} = require("../lib/units");

/** Risk bands, ordered by severity. Mirrored in the dashboard. */
const RiskLevel = Object.freeze({
  SAFE: "SAFE",
  WATCH: "WATCH",
  AT_RISK: "AT_RISK",
  CRITICAL: "CRITICAL",
});

const RISK_ORDER = [RiskLevel.SAFE, RiskLevel.WATCH, RiskLevel.AT_RISK, RiskLevel.CRITICAL];

/**
 * Least-squares slope of HF against time.
 *
 * @param {{at:number, healthFactorWad:bigint}[]} history ascending by `at` (ms)
 * @returns {{slopeWadPerSec:bigint, samples:number, spanSec:number}}
 */
function estimateTrend(history) {
  const usable = (history ?? []).filter((s) => s.healthFactorWad < MAX_HEALTH_FACTOR_WAD);
  const n = usable.length;
  if (n < 2) return { slopeWadPerSec: 0n, samples: n, spanSec: 0 };

  const t0 = usable[0].at;
  const spanSec = (usable[n - 1].at - t0) / 1000;
  if (spanSec <= 0) return { slopeWadPerSec: 0n, samples: n, spanSec: 0 };

  // The regression runs in floats and only picks a direction and magnitude;
  // the result re-enters fixed point once, below. Slopes are minuscule next to
  // WAD, so a full BigInt regression would truncate the slope to zero.
  const xs = usable.map((s) => (s.at - t0) / 1000);
  const ys = usable.map((s) => Number(formatUnits(s.healthFactorWad, 18)));

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - meanX;
    numerator += dx * (ys[i] - meanY);
    denominator += dx * dx;
  }
  if (denominator === 0) return { slopeWadPerSec: 0n, samples: n, spanSec };

  const slope = numerator / denominator; // HF units per second
  return {
    slopeWadPerSec: BigInt(Math.trunc(slope * 1e18)),
    samples: n,
    spanSec,
  };
}

/**
 * Project HF forward by horizonSec using the current trend.
 * Clamped at zero - a negative health factor is meaningless.
 */
function forecastHealthFactor(healthFactorWad, slopeWadPerSec, horizonSec) {
  if (healthFactorWad >= MAX_HEALTH_FACTOR_WAD) return MAX_HEALTH_FACTOR_WAD;
  const projected = healthFactorWad + slopeWadPerSec * BigInt(Math.max(0, Math.trunc(horizonSec)));
  return projected < 0n ? 0n : projected;
}

/**
 * Seconds until HF is projected to reach targetWad, or null if it is not
 * heading there (flat or rising trend). Zero if already at or below it.
 */
function secondsToThreshold(healthFactorWad, slopeWadPerSec, targetWad) {
  if (healthFactorWad >= MAX_HEALTH_FACTOR_WAD) return null;
  if (healthFactorWad <= targetWad) return 0;
  if (slopeWadPerSec >= 0n) return null;
  const gap = healthFactorWad - targetWad;
  return Number(gap / -slopeWadPerSec);
}

/**
 * Continuous risk score in [0,1], for dashboard sorting and for ranking which
 * position to prove first when several trip on the same tick.
 *
 * Blends how close HF sits to the liquidation line (1.0) with how fast it is
 * falling. Deliberately simple and monotonic - it ranks, it does not decide.
 */
function computeRiskScore({ healthFactorWad, forecastHealthFactorWad, thresholdWad }) {
  if (healthFactorWad >= MAX_HEALTH_FACTOR_WAD) return 0;

  const hf = Number(formatUnits(healthFactorWad, 18));
  const forecast = Number(formatUnits(forecastHealthFactorWad, 18));
  const threshold = Number(formatUnits(thresholdWad, 18));

  // Distance from liquidation, normalised over the band [1.0, threshold+0.5].
  const upper = threshold + 0.5;
  const levelRisk = clamp01((upper - hf) / (upper - 1.0));
  const forecastRisk = clamp01((upper - forecast) / (upper - 1.0));

  // Weighted toward the forecast: where the position is going matters most.
  const score = 0.55 * levelRisk + 0.45 * forecastRisk;
  return Math.round(clamp01(score) * 1000) / 1000;
}

/**
 * The checkLiquidationRisk core, per shared/interfaces.md.
 *
 * @param {object} input
 * @param {bigint} input.healthFactorWad
 * @param {bigint} input.thresholdWad          configured alert threshold
 * @param {bigint} input.criticalThresholdWad
 * @param {{at:number, healthFactorWad:bigint}[]} [input.history]
 * @param {number} [input.forecastHorizonSec]
 * @param {{predict: Function}} [input.predictor] optional ML forecaster
 * @returns {object} risk assessment
 */
function evaluateRisk({
  healthFactorWad,
  thresholdWad,
  criticalThresholdWad,
  history = [],
  forecastHorizonSec = 900,
  predictor = null,
}) {
  const trend = estimateTrend(history);

  let forecastHealthFactorWad = forecastHealthFactor(
    healthFactorWad,
    trend.slopeWadPerSec,
    forecastHorizonSec,
  );
  let forecastSource = "linear-trend";
  let confidence = trendConfidence(trend);

  if (predictor && typeof predictor.predict === "function") {
    try {
      const prediction = predictor.predict({
        healthFactorWad,
        history,
        forecastHorizonSec,
        trend,
      });
      if (prediction && typeof prediction.forecastHealthFactorWad === "bigint") {
        forecastHealthFactorWad = prediction.forecastHealthFactorWad;
        forecastSource = prediction.source || "predictor";
        if (typeof prediction.confidence === "number") confidence = prediction.confidence;
      }
    } catch {
      // A broken predictor must never take the monitor down; the linear-trend
      // forecast computed above stands in. The caller logs predictor errors.
      forecastSource = "linear-trend:predictor-failed";
    }
  }

  const breachedNow = healthFactorWad < thresholdWad;
  const breachedForecast = forecastHealthFactorWad < thresholdWad;
  const isCritical = healthFactorWad < criticalThresholdWad;

  const secondsToThresholdBreach = secondsToThreshold(
    healthFactorWad,
    trend.slopeWadPerSec,
    thresholdWad,
  );
  const secondsToLiquidation = secondsToThreshold(healthFactorWad, trend.slopeWadPerSec, WAD);

  // Trajectory alerts require corroboration: at least 3 samples and a genuine
  // downward slope. Otherwise one bad price print would fire a proof request.
  const trajectoryQualifies = breachedForecast && trend.samples >= 3 && trend.slopeWadPerSec < 0n;

  const isAtRisk = breachedNow || trajectoryQualifies;

  let level = RiskLevel.SAFE;
  if (isCritical) level = RiskLevel.CRITICAL;
  else if (breachedNow) level = RiskLevel.AT_RISK;
  else if (trajectoryQualifies) level = RiskLevel.WATCH;

  return {
    isAtRisk,
    level,
    reason: describeReason({ breachedNow, trajectoryQualifies, isCritical }),
    thresholdWad,
    healthFactorWad,
    forecastHealthFactorWad,
    forecastHorizonSec,
    forecastSource,
    confidence,
    trendSlopeWadPerSec: trend.slopeWadPerSec,
    trendSamples: trend.samples,
    trendSpanSec: trend.spanSec,
    secondsToThresholdBreach,
    secondsToLiquidation,
    riskScore: computeRiskScore({ healthFactorWad, forecastHealthFactorWad, thresholdWad }),
  };
}

function describeReason({ breachedNow, trajectoryQualifies, isCritical }) {
  if (isCritical) return "health factor below critical threshold; liquidation imminent";
  if (breachedNow) return "health factor below configured threshold";
  if (trajectoryQualifies) return "health factor projected to breach threshold within forecast horizon";
  return "health factor above threshold and not trending into it";
}

/**
 * Confidence in the trend estimate: more samples over a longer window is more
 * trustworthy. Saturates at ~10 samples spanning >= 5 minutes.
 */
function trendConfidence(trend) {
  if (trend.samples < 2) return 0;
  const sampleFactor = clamp01(trend.samples / 10);
  const spanFactor = clamp01(trend.spanSec / 300);
  return Math.round(clamp01(0.5 * sampleFactor + 0.5 * spanFactor) * 100) / 100;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** JSON view of an assessment. */
function serializeRisk(risk) {
  return {
    isAtRisk: risk.isAtRisk,
    level: risk.level,
    reason: risk.reason,
    riskScore: risk.riskScore,
    threshold: wadToNumber(risk.thresholdWad),
    thresholdWad: risk.thresholdWad.toString(),
    forecastHealthFactor: wadToNumber(risk.forecastHealthFactorWad),
    forecastHealthFactorWad: risk.forecastHealthFactorWad.toString(),
    forecastHorizonSec: risk.forecastHorizonSec,
    forecastSource: risk.forecastSource,
    confidence: risk.confidence,
    trendSlopePerHour: Number(formatUnits(risk.trendSlopeWadPerSec * 3600n, 18)),
    trendSamples: risk.trendSamples,
    secondsToThresholdBreach: risk.secondsToThresholdBreach,
    secondsToLiquidation: risk.secondsToLiquidation,
  };
}

module.exports = {
  RiskLevel,
  RISK_ORDER,
  evaluateRisk,
  estimateTrend,
  forecastHealthFactor,
  secondsToThreshold,
  computeRiskScore,
  serializeRisk,
};
