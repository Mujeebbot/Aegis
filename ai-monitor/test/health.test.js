"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const { computeHealthFactor, aggregatePositions } = require("../src/core/health");
const { parseUnits, formatUnits, MAX_HEALTH_FACTOR_WAD, wadToNumber } = require("../src/lib/units");

const leg = (symbol, amount, price, threshold) => ({
  symbol,
  amountWad: parseUnits(amount),
  priceWad: parseUnits(price),
  ...(threshold === undefined ? {} : { liquidationThresholdWad: parseUnits(threshold) }),
});

test("computes the textbook Aave health factor", () => {
  // 10 ETH @ $2000 with an 82.5% threshold backing $15,000 of debt.
  // (10 * 2000 * 0.825) / 15000 = 1.1
  const result = computeHealthFactor({
    collateral: [leg("WETH", "10", "2000", "0.825")],
    debt: [leg("USDC", "15000", "1")],
  });
  assert.equal(result.healthFactor, 1.1);
  assert.equal(formatUnits(result.collateralUsdWad, 18), "20000");
  assert.equal(formatUnits(result.riskAdjustedCollateralUsdWad, 18), "16500");
  assert.equal(formatUnits(result.debtUsdWad, 18), "15000");
});

test("treats a position with no debt as un-liquidatable", () => {
  const result = computeHealthFactor({
    collateral: [leg("WETH", "5", "2000", "0.825")],
    debt: [],
  });
  assert.equal(result.healthFactorWad, MAX_HEALTH_FACTOR_WAD);
  // Serialises as null, not Infinity, so it survives JSON.
  assert.equal(result.healthFactor, null);
});

test("collateral with no liquidation threshold cannot back a loan", () => {
  const result = computeHealthFactor({
    collateral: [leg("SHIB", "1000000", "1")], // no threshold configured
    debt: [leg("USDC", "100", "1")],
  });
  assert.equal(result.healthFactor, 0);
});

test("an unpriced debt leg does not silently inflate the health factor", () => {
  // A leg priced at 0 contributes nothing; the caller flags this as degraded.
  const result = computeHealthFactor({
    collateral: [leg("WETH", "10", "2000", "0.825")],
    debt: [{ symbol: "UNKNOWN", amountWad: parseUnits("5000"), priceWad: 0n }],
  });
  assert.equal(result.healthFactorWad, MAX_HEALTH_FACTOR_WAD);
});

test("computes the liquidation price for a single-collateral position", () => {
  const result = computeHealthFactor({
    collateral: [leg("WETH", "10", "2000", "0.825")],
    debt: [leg("USDC", "15000", "1")],
  });
  // HF = 1 when 10 * P * 0.825 = 15000  ->  P = 1818.18...
  assert.equal(Math.round(Number(formatUnits(result.liquidationPriceHintWad, 18))), 1818);
});

test("does not guess a liquidation price for multi-collateral positions", () => {
  const result = computeHealthFactor({
    collateral: [leg("WETH", "10", "2000", "0.825"), leg("WBTC", "1", "40000", "0.7")],
    debt: [leg("USDC", "15000", "1")],
  });
  assert.equal(result.liquidationPriceHintWad, null);
});

test("aggregate reports the weakest market, not just the average", () => {
  const healthy = {
    protocol: "aave-v3",
    collateral: [leg("WETH", "100", "2000", "0.825")],
    debt: [leg("USDC", "10000", "1")],
  };
  const doomed = {
    protocol: "morpho-blue",
    collateral: [leg("WETH", "1", "2000", "0.8")],
    debt: [leg("USDC", "1590", "1")],
  };

  const { aggregate, weakest, byProtocol } = aggregatePositions([healthy, doomed]);

  assert.equal(byProtocol.length, 2);
  assert.equal(weakest.protocol, "morpho-blue");
  // The doomed market is liquidatable...
  assert.ok(wadToNumber(weakest.healthFactorWad) < 1.05);
  // ...even though the blended aggregate looks perfectly healthy.
  assert.ok(wadToNumber(aggregate.healthFactorWad) > 5);
});
