"use strict";

/**
 * Protocol adapter normalisation.
 *
 * SCOPE NOTE: these tests feed each adapter a realistic subgraph response and
 * assert the normalisation is right. They do NOT prove the GraphQL query shapes
 * match the live subgraphs - that needs THE_GRAPH_API_KEY, since the hosted
 * service is shut down and the decentralised gateway is key-gated. What is
 * locked down here is the part most likely to be silently wrong: token decimal
 * rescaling, basis-point conversion, share-to-asset conversion, and which legs
 * are allowed to count as collateral.
 *
 * Every one of those errors would produce a plausible-looking but wrong health
 * factor, which is worse than an obvious failure.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { createAaveAdapter } = require("../src/sources/aave");
const { createCompoundAdapter } = require("../src/sources/compound");
const { createMorphoAdapter, sharesToAssets } = require("../src/sources/morpho");
const { createLogger } = require("../src/lib/logger");
const { formatUnits } = require("../src/lib/units");

const logger = createLogger("test", { level: "error" });
const CHAIN_ID = 11155111;
const USER = "0xAAaA0000000000000000000000000000000000Aa";

/** A GraphClient stand-in that returns a canned response. */
function fakeGraph(response) {
  const captured = {};
  return {
    client: {
      has: () => true,
      query: async (protocol, chainId, query, variables) => {
        captured.protocol = protocol;
        captured.chainId = chainId;
        captured.query = query;
        captured.variables = variables;
        return response;
      },
    },
    captured,
  };
}

const wad = (leg) => formatUnits(leg.amountWad, 18);

// --- Aave v3 ----------------------------------------------------------------

test("aave: rescales token decimals to 18dp and basis points to WAD", async () => {
  const { client } = fakeGraph({
    userReserves: [
      {
        // 1.5 WETH supplied (18dp), used as collateral, 82.5% threshold.
        currentATokenBalance: "1500000000000000000",
        currentTotalDebt: "0",
        usageAsCollateralEnabledOnUser: true,
        reserve: {
          symbol: "WETH",
          decimals: 18,
          underlyingAsset: "0xweth",
          reserveLiquidationThreshold: "8250",
          usageAsCollateralEnabled: true,
          isActive: true,
        },
      },
      {
        // 2,500 USDC borrowed - USDC is 6dp, the classic rescaling trap.
        currentATokenBalance: "0",
        currentTotalDebt: "2500000000",
        usageAsCollateralEnabledOnUser: false,
        reserve: {
          symbol: "USDC",
          decimals: 6,
          underlyingAsset: "0xusdc",
          reserveLiquidationThreshold: "8500",
          usageAsCollateralEnabled: true,
          isActive: true,
        },
      },
    ],
  });

  const position = await createAaveAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);

  assert.equal(position.collateral.length, 1);
  assert.equal(wad(position.collateral[0]), "1.5");
  // 8250 bps -> 0.825e18
  assert.equal(formatUnits(position.collateral[0].liquidationThresholdWad, 18), "0.825");

  assert.equal(position.debt.length, 1);
  // 2500000000 at 6dp must become 2500, not 2.5e9.
  assert.equal(wad(position.debt[0]), "2500");
});

test("aave: lowercases the address in the query variables", async () => {
  const { client, captured } = fakeGraph({ userReserves: [] });
  await createAaveAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);
  assert.equal(captured.variables.user, USER.toLowerCase());
});

test("aave: excludes supply the user has not enabled as collateral", async () => {
  const { client } = fakeGraph({
    userReserves: [
      {
        currentATokenBalance: "1000000000000000000",
        currentTotalDebt: "0",
        // The user switched collateral off for this reserve.
        usageAsCollateralEnabledOnUser: false,
        reserve: {
          symbol: "WETH",
          decimals: 18,
          reserveLiquidationThreshold: "8250",
          usageAsCollateralEnabled: true,
          isActive: true,
        },
      },
    ],
  });

  const position = await createAaveAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);
  // Supply that cannot back a loan must not inflate the health factor.
  assert.equal(position, null);
});

test("aave: excludes reserves the protocol has disabled or deactivated", async () => {
  const base = {
    currentATokenBalance: "1000000000000000000",
    currentTotalDebt: "0",
    usageAsCollateralEnabledOnUser: true,
  };
  const cases = [
    { ...base, reserve: { symbol: "A", decimals: 18, reserveLiquidationThreshold: "8250", usageAsCollateralEnabled: false, isActive: true } },
    { ...base, reserve: { symbol: "B", decimals: 18, reserveLiquidationThreshold: "8250", usageAsCollateralEnabled: true, isActive: false } },
  ];

  for (const entry of cases) {
    const { client } = fakeGraph({ userReserves: [entry] });
    const position = await createAaveAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);
    assert.equal(position, null, `reserve ${entry.reserve.symbol} should not count`);
  }
});

test("aave: a reserve can be both collateral and debt", async () => {
  const { client } = fakeGraph({
    userReserves: [
      {
        currentATokenBalance: "5000000000000000000",
        currentTotalDebt: "1000000000000000000",
        usageAsCollateralEnabledOnUser: true,
        reserve: {
          symbol: "WETH",
          decimals: 18,
          reserveLiquidationThreshold: "8250",
          usageAsCollateralEnabled: true,
          isActive: true,
        },
      },
    ],
  });

  const position = await createAaveAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);
  assert.equal(wad(position.collateral[0]), "5");
  assert.equal(wad(position.debt[0]), "1");
});

test("aave: AAVE keeps its symbol (regression - must not be stripped to AVE)", async () => {
  const { client } = fakeGraph({
    userReserves: [
      {
        currentATokenBalance: "1000000000000000000",
        currentTotalDebt: "0",
        usageAsCollateralEnabledOnUser: true,
        reserve: {
          symbol: "AAVE",
          decimals: 18,
          reserveLiquidationThreshold: "6500",
          usageAsCollateralEnabled: true,
          isActive: true,
        },
      },
    ],
  });

  const position = await createAaveAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);
  // A "strip the aToken prefix" rule would mangle this into AVE and the price
  // lookup would silently fail.
  assert.equal(position.collateral[0].symbol, "AAVE");
});

test("aave: returns null when the user has no reserves", async () => {
  const { client } = fakeGraph({ userReserves: [] });
  assert.equal(await createAaveAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID), null);
});

// --- Compound v3 ------------------------------------------------------------

test("compound: a negative base balance is debt, and factors map by token address", async () => {
  const { client } = fakeGraph({
    positions: [
      {
        market: {
          id: "0xcomet",
          baseAsset: { symbol: "USDC", decimals: 6, address: "0xUSDC" },
          collateralTokens: [
            {
              token: { symbol: "WETH", decimals: 18, address: "0xWETH" },
              // Comet stores factors as 18dp fixed point already.
              liquidateCollateralFactor: "825000000000000000",
            },
          ],
        },
        baseBalance: "-1200000000", // owes 1,200 USDC
        collateralBalances: [
          { token: { symbol: "WETH", decimals: 18, address: "0xWETH" }, balance: "2000000000000000000" },
        ],
      },
    ],
  });

  const position = await createCompoundAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);

  assert.equal(wad(position.collateral[0]), "2");
  assert.equal(formatUnits(position.collateral[0].liquidationThresholdWad, 18), "0.825");
  assert.equal(position.debt.length, 1);
  // Debt is reported as a positive magnitude.
  assert.equal(wad(position.debt[0]), "1200");
});

test("compound: a positive base balance is a supply, not a debt", async () => {
  const { client } = fakeGraph({
    positions: [
      {
        market: { id: "0xcomet", baseAsset: { symbol: "USDC", decimals: 6, address: "0xUSDC" }, collateralTokens: [] },
        baseBalance: "5000000000", // supplied 5,000 USDC
        collateralBalances: [],
      },
    ],
  });

  const position = await createCompoundAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);
  // Supplying the base asset earns yield but backs nothing, and is certainly
  // not debt - a sign error here would invert the health factor.
  assert.equal(position, null);
});

test("compound: collateral with no configured factor cannot back a loan", async () => {
  const { client } = fakeGraph({
    positions: [
      {
        market: {
          id: "0xcomet",
          baseAsset: { symbol: "USDC", decimals: 6, address: "0xUSDC" },
          // Token is held but the market lists no factor for it.
          collateralTokens: [],
        },
        baseBalance: "-1000000",
        collateralBalances: [
          { token: { symbol: "WETH", decimals: 18, address: "0xWETH" }, balance: "1000000000000000000" },
        ],
      },
    ],
  });

  const position = await createCompoundAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);
  assert.equal(position.collateral[0].liquidationThresholdWad, 0n);
});

test("compound: matches collateral factors case-insensitively by address", async () => {
  const { client } = fakeGraph({
    positions: [
      {
        market: {
          id: "0xcomet",
          baseAsset: { symbol: "USDC", decimals: 6, address: "0xUSDC" },
          collateralTokens: [
            {
              token: { symbol: "WETH", decimals: 18, address: "0xAbCdEf" },
              liquidateCollateralFactor: "800000000000000000",
            },
          ],
        },
        baseBalance: "-1000000",
        collateralBalances: [
          // Same address, different casing - a common subgraph inconsistency.
          { token: { symbol: "WETH", decimals: 18, address: "0xABCDEF" }, balance: "1000000000000000000" },
        ],
      },
    ],
  });

  const position = await createCompoundAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);
  assert.equal(formatUnits(position.collateral[0].liquidationThresholdWad, 18), "0.8");
});

// --- Morpho Blue ------------------------------------------------------------

test("morpho: converts borrow shares to assets and keeps markets isolated", async () => {
  const { client } = fakeGraph({
    positions: [
      {
        market: {
          id: "0xmarket1",
          lltv: "860000000000000000",
          loanToken: { symbol: "USDC", decimals: 6, address: "0xUSDC" },
          collateralToken: { symbol: "WETH", decimals: 18, address: "0xWETH" },
          // Interest has accrued: 1.1 assets per share.
          totalBorrowAssets: "1100000000",
          totalBorrowShares: "1000000000",
        },
        collateral: "1000000000000000000",
        borrowShares: "100000000",
      },
      {
        market: {
          id: "0xmarket2",
          lltv: "770000000000000000",
          loanToken: { symbol: "DAI", decimals: 18, address: "0xDAI" },
          collateralToken: { symbol: "WBTC", decimals: 8, address: "0xWBTC" },
          totalBorrowAssets: "1000000000000000000000",
          totalBorrowShares: "1000000000000000000000",
        },
        collateral: "100000000", // 1 WBTC at 8dp
        borrowShares: "500000000000000000000",
      },
    ],
  });

  const positions = await createMorphoAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);

  // One entry per market: a healthy market must not mask a doomed one.
  assert.equal(Array.isArray(positions), true);
  assert.equal(positions.length, 2);
  assert.equal(positions[0].marketId, "0xmarket1");
  assert.equal(positions[1].marketId, "0xmarket2");

  // 100000000 shares * 1.1 = 110000000 (6dp) = 110 USDC
  assert.equal(wad(positions[0].debt[0]), "110");
  assert.equal(formatUnits(positions[0].collateral[0].liquidationThresholdWad, 18), "0.86");

  // 1 WBTC at 8dp must rescale to 1, not 1e-10.
  assert.equal(wad(positions[1].collateral[0]), "1");
  assert.equal(wad(positions[1].debt[0]), "500");
});

test("morpho: rounds debt UP so the user's obligation is never understated", () => {
  // 1 share against a 3-assets/2-shares ratio is 1.5 assets. Rounding down
  // would understate the debt and overstate the health factor - the dangerous
  // direction. Morpho itself rounds this up.
  assert.equal(sharesToAssets("1", "3", "2"), 2n);
  assert.equal(sharesToAssets("2", "3", "2"), 3n);
  // Exact division must not gain a spurious extra unit.
  assert.equal(sharesToAssets("2", "4", "2"), 4n);
});

test("morpho: handles a position with no borrow", () => {
  assert.equal(sharesToAssets("0", "1000", "1000"), 0n);
  // An empty market must not divide by zero.
  assert.equal(sharesToAssets("100", "0", "0"), 0n);
});

test("morpho: skips empty markets and returns null when nothing remains", async () => {
  const { client } = fakeGraph({
    positions: [
      {
        market: {
          id: "0xempty",
          lltv: "860000000000000000",
          loanToken: { symbol: "USDC", decimals: 6 },
          collateralToken: { symbol: "WETH", decimals: 18 },
          totalBorrowAssets: "0",
          totalBorrowShares: "0",
        },
        collateral: "0",
        borrowShares: "0",
      },
    ],
  });

  const positions = await createMorphoAdapter({ graph: client, logger }).fetchPosition(USER, CHAIN_ID);
  assert.equal(positions, null);
});
