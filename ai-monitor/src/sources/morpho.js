"use strict";

/**
 * Morpho Blue adapter.
 *
 * Morpho Blue is a set of isolated markets, each a (loanToken, collateralToken,
 * lltv, oracle, irm) tuple. There is no cross-market netting: a user can be
 * healthy in one market and liquidated in another on the same block. So each
 * market is emitted as its own position rather than being merged, and
 * core/health.js reports the weakest one alongside the aggregate.
 *
 * Morpho's LLTV is a liquidation LTV in 18dp - the same role as Aave's
 * liquidation threshold, so it maps straight onto liquidationThresholdWad.
 *
 * Borrow shares are converted to assets with the market's totalBorrowAssets /
 * totalBorrowShares ratio; using shares directly would understate debt as
 * interest accrues.
 */

const { PROTOCOL } = require("./protocols");

const POSITIONS_QUERY = `
  query MorphoPositions($user: String!) {
    positions(where: { user: $user }) {
      market {
        id
        lltv
        loanToken { symbol decimals address }
        collateralToken { symbol decimals address }
        totalBorrowAssets
        totalBorrowShares
      }
      collateral
      borrowShares
    }
  }
`;

function createMorphoAdapter({ graph, logger }) {
  const log = logger.child({ module: "morpho-blue" });

  return {
    protocol: PROTOCOL.MORPHO_BLUE,

    supports(chainId) {
      return graph.has(PROTOCOL.MORPHO_BLUE, chainId);
    },

    /**
     * Morpho returns one entry PER MARKET. Callers receive an array so each
     * isolated market keeps its own health factor.
     * @returns {Promise<Array<object>|null>}
     */
    async fetchPosition(user, chainId) {
      const data = await graph.query(PROTOCOL.MORPHO_BLUE, chainId, POSITIONS_QUERY, {
        user: user.toLowerCase(),
      });

      const positions = data.positions ?? [];
      if (positions.length === 0) return null;

      const out = [];

      for (const position of positions) {
        const market = position.market ?? {};
        const loanToken = market.loanToken ?? {};
        const collateralToken = market.collateralToken ?? {};

        const collateralWad = rescale(position.collateral, Number(collateralToken.decimals ?? 18));
        const borrowAssets = sharesToAssets(
          position.borrowShares,
          market.totalBorrowAssets,
          market.totalBorrowShares,
        );
        const debtWad = rescale(borrowAssets, Number(loanToken.decimals ?? 18));

        if (collateralWad <= 0n && debtWad <= 0n) continue;

        const entry = {
          protocol: PROTOCOL.MORPHO_BLUE,
          chainId,
          marketId: market.id,
          collateral: [],
          debt: [],
        };

        if (collateralWad > 0n) {
          entry.collateral.push({
            symbol: String(collateralToken.symbol ?? "").toUpperCase(),
            address: collateralToken.address,
            amountWad: collateralWad,
            liquidationThresholdWad: BigInt(String(market.lltv ?? "0").split(".")[0] || "0"),
          });
        }
        if (debtWad > 0n) {
          entry.debt.push({
            symbol: String(loanToken.symbol ?? "").toUpperCase(),
            address: loanToken.address,
            amountWad: debtWad,
          });
        }

        out.push(entry);
      }

      if (out.length === 0) return null;

      log.debug("positions fetched", { user, chainId, markets: out.length });
      return out;
    },
  };
}

/** borrowShares -> borrowed assets, using the market's current exchange ratio. */
function sharesToAssets(shares, totalAssets, totalShares) {
  const s = BigInt(String(shares ?? "0").split(".")[0] || "0");
  const ta = BigInt(String(totalAssets ?? "0").split(".")[0] || "0");
  const ts = BigInt(String(totalShares ?? "0").split(".")[0] || "0");
  if (s === 0n || ts === 0n) return 0n;
  // Round up, matching Morpho's own conversion for debt - never understate what
  // the user owes.
  return (s * ta + ts - 1n) / ts;
}

function rescale(raw, decimals) {
  const value = BigInt(String(raw ?? "0").split(".")[0] || "0");
  if (decimals === 18) return value;
  return decimals < 18 ? value * 10n ** BigInt(18 - decimals) : value / 10n ** BigInt(decimals - 18);
}

module.exports = { createMorphoAdapter, POSITIONS_QUERY, sharesToAssets, rescale };
