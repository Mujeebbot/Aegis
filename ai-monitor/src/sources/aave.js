"use strict";

/**
 * Aave v3 adapter.
 *
 * Reads the user's reserve balances from the Aave v3 subgraph and normalises
 * them into the neutral Leg shape that core/health.js consumes. Prices are NOT
 * taken from the subgraph - they come from the price service, so every protocol
 * is valued through the same oracle.
 *
 * Amounts arrive as integers in each reserve's own decimals; they are rescaled
 * to 18dp here so downstream code never has to think about token decimals.
 */

const { PROTOCOL } = require("./protocols");

const USER_RESERVES_QUERY = `
  query UserReserves($user: String!) {
    userReserves(where: { user: $user }) {
      currentATokenBalance
      currentTotalDebt
      usageAsCollateralEnabledOnUser
      reserve {
        symbol
        decimals
        underlyingAsset
        reserveLiquidationThreshold
        usageAsCollateralEnabled
        isActive
        isFrozen
      }
    }
  }
`;

/**
 * @param {object} deps
 * @param {import("./graph").GraphClient} deps.graph
 * @param {object} deps.logger
 */
function createAaveAdapter({ graph, logger }) {
  const log = logger.child({ module: "aave-v3" });

  return {
    protocol: PROTOCOL.AAVE_V3,

    supports(chainId) {
      return graph.has(PROTOCOL.AAVE_V3, chainId);
    },

    /**
     * @returns {Promise<{protocol:string, chainId:number, collateral:Leg[], debt:Leg[]}|null>}
     *          null when the user has no position in this market.
     */
    async fetchPosition(user, chainId) {
      const data = await graph.query(PROTOCOL.AAVE_V3, chainId, USER_RESERVES_QUERY, {
        user: user.toLowerCase(),
      });

      const reserves = data.userReserves ?? [];
      if (reserves.length === 0) return null;

      const collateral = [];
      const debt = [];

      for (const entry of reserves) {
        const reserve = entry.reserve ?? {};
        const decimals = Number(reserve.decimals ?? 18);
        const symbol = normalizeSymbol(reserve.symbol);

        const supplied = rescale(entry.currentATokenBalance, decimals);
        const borrowed = rescale(entry.currentTotalDebt, decimals);

        // Only supply that the user has actually enabled as collateral, in a
        // reserve Aave still counts, backs the loan. A frozen or collateral-
        // disabled reserve contributes nothing to the health factor.
        const countsAsCollateral =
          supplied > 0n &&
          entry.usageAsCollateralEnabledOnUser === true &&
          reserve.usageAsCollateralEnabled === true &&
          reserve.isActive !== false;

        if (countsAsCollateral) {
          collateral.push({
            symbol,
            address: reserve.underlyingAsset,
            amountWad: supplied,
            // Aave stores the liquidation threshold in basis points (8250 = 82.5%).
            liquidationThresholdWad: bpsToWad(reserve.reserveLiquidationThreshold),
          });
        }

        if (borrowed > 0n) {
          debt.push({ symbol, address: reserve.underlyingAsset, amountWad: borrowed });
        }
      }

      if (collateral.length === 0 && debt.length === 0) return null;

      log.debug("position fetched", {
        user,
        chainId,
        collateralLegs: collateral.length,
        debtLegs: debt.length,
      });

      return { protocol: PROTOCOL.AAVE_V3, chainId, collateral, debt };
    },
  };
}

/** Integer string in `decimals` dp -> BigInt in 18dp. */
function rescale(raw, decimals) {
  const value = BigInt(String(raw ?? "0").split(".")[0] || "0");
  if (decimals === 18) return value;
  return decimals < 18 ? value * 10n ** BigInt(18 - decimals) : value / 10n ** BigInt(decimals - 18);
}

function bpsToWad(bps) {
  return (BigInt(String(bps ?? "0")) * 10n ** 18n) / 10000n;
}

/**
 * `reserve.symbol` is already the underlying asset symbol (WETH, USDC), not the
 * aToken's, so this only needs to normalise case for the price-service lookup.
 * Resist the urge to strip a leading "a" here - it would turn AAVE into AVE.
 */
function normalizeSymbol(symbol) {
  return String(symbol || "").toUpperCase().trim();
}

module.exports = { createAaveAdapter, USER_RESERVES_QUERY, rescale, normalizeSymbol };
