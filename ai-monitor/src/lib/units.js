"use strict";

/**
 * Fixed-point helpers.
 *
 * Unit contract for the whole Aegis backend (agreed in shared/interfaces.md):
 *
 *   - Anything crossing an HTTP/JSON boundary carries BOTH forms:
 *       healthFactor     -> JS number, human readable (1.03)
 *       healthFactorWad  -> decimal string, 1e18 fixed point ("1030000000000000000")
 *   - Anything crossing the chain boundary uses WAD only. Solidity's
 *     SAFE_THRESHOLD = 1.05e18 lives in the same units.
 *
 * Never do fixed-point maths in floats. Every function here is BigInt-based;
 * `toNumber` exists purely for display and for the JSON mirror field.
 */

const WAD = 10n ** 18n;

/** Health factor we report when a position has no debt: effectively infinite. */
const MAX_HEALTH_FACTOR_WAD = (1n << 255n) - 1n;

/**
 * Parse a decimal string/number into a BigInt scaled by 10**decimals.
 *
 * Truncates (never rounds up) any digits beyond `decimals` — we would rather
 * understate a health factor than overstate it.
 *
 * ABSENT MEANS ZERO: null, undefined and an empty/whitespace string all parse
 * to 0n. They are the same condition — a field the upstream source did not
 * populate — and treating them differently produced a genuine inconsistency
 * where `null` returned 0 but `""` threw. A caller that needs to distinguish
 * "absent" from "genuinely zero" must check before calling.
 *
 * Actual malformed input ("abc", "1.2.3") still throws, loudly.
 */
function parseUnits(value, decimals = 18) {
  if (typeof value === "bigint") return value;
  const str = String(value ?? "").trim();
  if (str === "") return 0n;
  if (str === "." || !/^-?\d*\.?\d*(e-?\d+)?$/i.test(str)) {
    throw new TypeError(`parseUnits: not a decimal number: ${JSON.stringify(value)}`);
  }
  // Subgraphs occasionally hand back exponent notation for tiny/huge balances.
  const normalized = /e/i.test(str) ? expandExponential(str) : str;
  const negative = normalized.startsWith("-");
  const unsigned = negative ? normalized.slice(1) : normalized;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  const result = BigInt(`${whole || "0"}${paddedFraction || ""}` || "0");
  return negative ? -result : result;
}

function expandExponential(str) {
  const [mantissa, exponentPart] = str.toLowerCase().split("e");
  const exponent = Number(exponentPart);
  const negative = mantissa.startsWith("-");
  const unsigned = negative ? mantissa.slice(1) : mantissa;
  const [whole = "0", fraction = ""] = unsigned.split(".");
  const digits = `${whole}${fraction}`;
  const pointIndex = whole.length + exponent;
  let out;
  if (pointIndex <= 0) {
    out = `0.${"0".repeat(-pointIndex)}${digits}`;
  } else if (pointIndex >= digits.length) {
    out = `${digits}${"0".repeat(pointIndex - digits.length)}`;
  } else {
    out = `${digits.slice(0, pointIndex)}.${digits.slice(pointIndex)}`;
  }
  return negative ? `-${out}` : out;
}

/** Format a scaled BigInt back to a decimal string, trimming trailing zeros. */
function formatUnits(value, decimals = 18) {
  const negative = value < 0n;
  const unsigned = negative ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = unsigned / base;
  const fraction = (unsigned % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  const out = fraction ? `${whole}.${fraction}` : `${whole}`;
  return negative ? `-${out}` : out;
}

/** WAD multiply: (a * b) / 1e18. */
function wadMul(a, b) {
  return (a * b) / WAD;
}

/** WAD divide: (a * 1e18) / b. Returns MAX for a positive numerator over zero. */
function wadDiv(a, b) {
  if (b === 0n) return a === 0n ? 0n : MAX_HEALTH_FACTOR_WAD;
  return (a * WAD) / b;
}

/**
 * Lossy, display-only conversion. Caps at Number.MAX_SAFE_INTEGER-ish values so
 * an "infinite" health factor serialises as JSON `null` rather than `Infinity`
 * (which is not valid JSON and would silently become `null` anyway).
 */
function wadToNumber(value) {
  if (value >= MAX_HEALTH_FACTOR_WAD) return null;
  return Number(formatUnits(value, 18));
}

/** Basis points (Aave liquidation thresholds are 4-decimal bps) -> WAD. */
function bpsToWad(bps) {
  return (BigInt(bps) * WAD) / 10000n;
}

module.exports = {
  WAD,
  MAX_HEALTH_FACTOR_WAD,
  parseUnits,
  formatUnits,
  wadMul,
  wadDiv,
  wadToNumber,
  bpsToWad,
};
