"use strict";

/**
 * Compound v3 (Comet) adapter.
 *
 * Comet's risk model differs from Aave's: each market has ONE borrowable base
 * asset, and every other asset is collateral-only. Borrow capacity per
 * collateral is governed by `liquidateCollateralFactor` (the point at which the
 * position becomes seizable), which is the direct analogue of Aave's
 * liquidation threshold - so normalising to that keeps core/health.js protocol
 * agnostic.
 *
 * Note Comet stores factors as 18-decimal fixed point already, not basis
 * points, so no bps conversion here.
 */

const { PROTOCOL } = require("./protocols");

const POSITION_QUERY = `
  query CometPosition($accountId: String!) {
    positions(where: { account: $accountId }) {
      market {
        id
        baseAsset { symbol decimals address }
        collateralTokens {
          token { symbol decimals address }
          liquidateCollateralFactor
        }
      }
      basePrincipal
      baseBalance
      collateralBalances {
        token { symbol decimals address }
        balance
      }
    }
  }
`;

function createCompoundAdapter({ graph, logger }) {
  const log = logger.child({ module: "compound-v3" });

  return {
    protocol: PROTOCOL.COMPOUND_V3,

    supports(chainId) {
      return graph.has(PROTOCOL.COMPOUND_V3, chainId);
    },

    async fetchPosition(user, chainId) {
      const data = await graph.query(PROTOCOL.COMPOUND_V3, chainId, POSITION_QUERY, {
        accountId: user.toLowerCase(),
      });

      const positions = data.positions ?? [];
      if (positions.length === 0) return null;

      const collateral = [];
      const debt = [];

      for (const position of positions) {
        const market = position.market ?? {};

        // Collateral factors live on the market, keyed by token address.
        const factorByToken = new Map();
        for (const ct of market.collateralTokens ?? []) {
          const address = String(ct.token?.address ?? "").toLowerCase();
          factorByToken.set(address, toWad(ct.liquidateCollateralFactor));
        }

        for (const balance of position.collateralBalances ?? []) {
          const token = balance.token ?? {};
          const amountWad = rescale(balance.balance, Number(token.decimals ?? 18));
          if (amountWad <= 0n) continue;
          const address = String(token.address ?? "").toLowerCase();
          collateral.push({
            symbol: String(token.symbol ?? "").toUpperCase(),
            address: token.address,
            amountWad,
            liquidationThresholdWad: factorByToken.get(address) ?? 0n,
          });
        }

        // A negative base balance is a borrow; positive is a supply of the base
        // asset, which in Comet earns yield but does not back other borrows.
        const baseAsset = market.baseAsset ?? {};
        const baseDecimals = Number(baseAsset.decimals ?? 18);
        const baseBalanceWad = rescale(position.baseBalance ?? position.basePrincipal, baseDecimals);
        if (baseBalanceWad < 0n) {
          debt.push({
            symbol: String(baseAsset.symbol ?? "").toUpperCase(),
            address: baseAsset.address,
            amountWad: -baseBalanceWad,
          });
        }
      }

      if (collateral.length === 0 && debt.length === 0) return null;

      log.debug("position fetched", {
        user,
        chainId,
        collateralLegs: collateral.length,
        debtLegs: debt.length,
      });

      return { protocol: PROTOCOL.COMPOUND_V3, chainId, collateral, debt };
    },
  };
}

/** Signed integer string in `decimals` dp -> BigInt in 18dp. */
function rescale(raw, decimals) {
  const str = String(raw ?? "0").split(".")[0] || "0";
  const value = BigInt(str);
  if (decimals === 18) return value;
  return decimals < 18 ? value * 10n ** BigInt(18 - decimals) : value / 10n ** BigInt(decimals - 18);
}

/** Comet factors are already 18dp fixed point, but may arrive as decimals. */
function toWad(raw) {
  const str = String(raw ?? "0");
  if (str.includes(".")) {
    const [whole, fraction = ""] = str.split(".");
    return BigInt(whole || "0") * 10n ** 18n + BigInt(fraction.padEnd(18, "0").slice(0, 18));
  }
  return BigInt(str || "0");
}

module.exports = { createCompoundAdapter, POSITION_QUERY, rescale, toWad };
