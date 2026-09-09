"use strict";

/**
 * Health factor computation.
 *
 *   HF = Σ(collateral_i × price_i × liquidationThreshold_i) / Σ(debt_j × price_j)
 *
 * This is the Aave v3 definition and the one Compound/Morpho reduce to once
 * their own risk parameters are normalised into `liquidationThreshold` (WAD).
 * A position is liquidatable when HF < 1.0.
 *
 * All arithmetic is BigInt/WAD. See lib/units.js for why.
 */

const {
  WAD,
  MAX_HEALTH_FACTOR_WAD,
  wadMul,
  wadDiv,
  wadToNumber,
  formatUnits,
} = require("../lib/units");

/**
 * @typedef {object} Leg
 * @property {string} symbol            token symbol, e.g. "WETH"
 * @property {string} [address]         token contract address
 * @property {bigint} amountWad         token amount, normalised to 18dp
 * @property {bigint} priceWad          USD price per whole token, 18dp
 * @property {bigint} [liquidationThresholdWad] collateral legs only; 0.825e18 = 82.5%
 */

/**
 * @param {{collateral: Leg[], debt: Leg[]}} position
 * @returns {{
 *   healthFactorWad: bigint,
 *   healthFactor: number|null,
 *   collateralUsdWad: bigint,
 *   riskAdjustedCollateralUsdWad: bigint,
 *   debtUsdWad: bigint,
 *   currentLtvWad: bigint,
 *   liquidationPriceHintWad: bigint|null,
 * }}
 */
function computeHealthFactor(position) {
  const collateral = position?.collateral ?? [];
  const debt = position?.debt ?? [];

  let collateralUsdWad = 0n;
  let riskAdjustedCollateralUsdWad = 0n;
  for (const leg of collateral) {
    const valueWad = wadMul(toBig(leg.amountWad), toBig(leg.priceWad));
    collateralUsdWad += valueWad;
    // A collateral asset with no configured threshold cannot back a loan.
    const thresholdWad = toBig(leg.liquidationThresholdWad ?? 0n);
    riskAdjustedCollateralUsdWad += wadMul(valueWad, thresholdWad);
  }

  let debtUsdWad = 0n;
  for (const leg of debt) {
    debtUsdWad += wadMul(toBig(leg.amountWad), toBig(leg.priceWad));
  }

  // No debt => not liquidatable. Represented as a saturating max rather than
  // Infinity so it stays a BigInt all the way to the chain boundary.
  const healthFactorWad =
    debtUsdWad === 0n ? MAX_HEALTH_FACTOR_WAD : wadDiv(riskAdjustedCollateralUsdWad, debtUsdWad);

  return {
    healthFactorWad,
    healthFactor: wadToNumber(healthFactorWad),
    collateralUsdWad,
    riskAdjustedCollateralUsdWad,
    debtUsdWad,
    currentLtvWad: collateralUsdWad === 0n ? 0n : wadDiv(debtUsdWad, collateralUsdWad),
    liquidationPriceHintWad: liquidationPriceHint(collateral, debtUsdWad),
  };
}

/**
 * For a single-collateral position, the price of that collateral at which
 * HF hits exactly 1.0. Null for multi-collateral positions, where no single
 * price determines the outcome. Surfaced to the dashboard, not used for alerts.
 */
function liquidationPriceHint(collateral, debtUsdWad) {
  if (collateral.length !== 1 || debtUsdWad === 0n) return null;
  const leg = collateral[0];
  const amountWad = toBig(leg.amountWad);
  const thresholdWad = toBig(leg.liquidationThresholdWad ?? 0n);
  const backing = wadMul(amountWad, thresholdWad);
  if (backing === 0n) return null;
  return wadDiv(debtUsdWad, backing);
}

/**
 * Merge per-protocol positions into one cross-protocol view.
 *
 * Aegis protects a *user*, not a single market, so the dashboard HF is the
 * aggregate. Per-protocol HFs are kept alongside because liquidation actually
 * happens per protocol — a healthy aggregate can still hide one doomed market.
 */
function aggregatePositions(positions) {
  const collateral = [];
  const debt = [];
  for (const p of positions) {
    collateral.push(...(p.collateral ?? []));
    debt.push(...(p.debt ?? []));
  }
  const aggregate = computeHealthFactor({ collateral, debt });

  const byProtocol = positions.map((p) => ({
    protocol: p.protocol,
    chainId: p.chainId,
    ...computeHealthFactor(p),
  }));

  // The binding constraint is the weakest individual market, not the average.
  const weakest = byProtocol.reduce(
    (min, cur) => (min === null || cur.healthFactorWad < min.healthFactorWad ? cur : min),
    null,
  );

  return { aggregate, byProtocol, weakest };
}

/** Serialise a computed health snapshot for JSON responses. */
function serializeHealth(health) {
  return {
    healthFactor: health.healthFactor,
    healthFactorWad: health.healthFactorWad.toString(),
    collateralUsd: Number(formatUnits(health.collateralUsdWad, 18)),
    riskAdjustedCollateralUsd: Number(formatUnits(health.riskAdjustedCollateralUsdWad, 18)),
    debtUsd: Number(formatUnits(health.debtUsdWad, 18)),
    currentLtv: Number(formatUnits(health.currentLtvWad, 18)),
    liquidationPriceHint:
      health.liquidationPriceHintWad === null
        ? null
        : Number(formatUnits(health.liquidationPriceHintWad, 18)),
  };
}

function toBig(value) {
  return typeof value === "bigint" ? value : BigInt(value ?? 0);
}

module.exports = {
  computeHealthFactor,
  aggregatePositions,
  serializeHealth,
  liquidationPriceHint,
  WAD,
};
