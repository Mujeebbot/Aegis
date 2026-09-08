"use strict";

/**
 * Position service - the seam between raw protocol data and risk decisions.
 *
 * Implements the two functions ai-monitor owes the rest of the system
 * (see shared/interfaces.md):
 *
 *   getPositionHealth(user, chainId)     -> health factor + full breakdown
 *   checkLiquidationRisk(user, chainId)  -> (isAtRisk, threshold) + reasoning
 *
 * It fans out across every configured protocol adapter, prices all legs through
 * one oracle, folds them into an aggregate health factor, and keeps a rolling
 * history per position so the risk model has a trend to work with.
 */

const { aggregatePositions, serializeHealth } = require("./health");
const { evaluateRisk, serializeRisk } = require("./risk");
const { TtlCache } = require("../lib/cache");
const { MAX_HEALTH_FACTOR_WAD, wadToNumber, formatUnits } = require("../lib/units");
const { getChainByChainId, isSupportedChainId, toChainKey } = require("../chains");

class PositionService {
  /**
   * @param {object} deps
   * @param {object} deps.config
   * @param {object} deps.logger
   * @param {object} deps.priceService
   * @param {Array<object>} deps.adapters protocol adapters
   * @param {object} [deps.watchlist] used to read per-user thresholds
   * @param {object} [deps.predictor] optional ML forecaster
   * @param {Map<string,bigint>} [deps.priceOverrides]
   * @param {() => number} [deps.clock] injectable time source. History samples
   *        are timestamped with it, and the trend model derives its slope from
   *        the gaps between them - so a test driving simulated time must supply
   *        the same clock its data source uses, or the slope is meaningless.
   */
  constructor({
    config,
    logger,
    priceService,
    adapters,
    watchlist,
    predictor = null,
    priceOverrides,
    clock = Date.now,
  }) {
    this.config = config;
    this.logger = logger.child({ module: "positions" });
    this.priceService = priceService;
    this.adapters = adapters;
    this.watchlist = watchlist;
    this.predictor = predictor;
    this.priceOverrides = priceOverrides ?? new Map();
    this.clock = clock;

    // Short cache so a dashboard refresh and a poll tick within the same few
    // seconds do not double-query every subgraph.
    this.snapshotCache = new TtlCache({ ttlMs: 10_000, maxEntries: 500 });

    /** positionKey -> [{at, healthFactorWad}], oldest first. */
    this.history = new Map();
  }

  static key(user, chainId) {
    return `${String(user).toLowerCase()}:${chainId}`;
  }

  /**
   * Full health snapshot for a user on one chain.
   *
   * @param {string} user
   * @param {number} chainId
   * @param {{fresh?: boolean}} [opts] fresh=true bypasses the snapshot cache
   * @returns {Promise<object>} snapshot
   */
  async getPositionHealth(user, chainId, opts = {}) {
    assertAddress(user);
    if (!isSupportedChainId(chainId)) {
      throw Object.assign(new Error(`Unsupported chainId ${chainId}`), { statusCode: 400 });
    }

    const cacheKey = PositionService.key(user, chainId);
    if (opts.fresh) this.snapshotCache.delete(cacheKey);

    return this.snapshotCache.getOrLoad(cacheKey, () => this.buildSnapshot(user, chainId));
  }

  async buildSnapshot(user, chainId) {
    const startedAt = Date.now();
    const chain = getChainByChainId(chainId);

    // 1. Fan out across protocols. One failing subgraph must not blank the
    //    whole position - it is recorded and the rest still produce an HF.
    const usable = this.adapters.filter((a) => a.supports(chainId));
    const settled = await Promise.allSettled(
      usable.map((adapter) => adapter.fetchPosition(user, chainId)),
    );

    const positions = [];
    const sourceErrors = [];
    settled.forEach((result, i) => {
      const adapter = usable[i];
      if (result.status === "rejected") {
        sourceErrors.push({ protocol: adapter.protocol, error: result.reason.message });
        this.logger.warn("protocol adapter failed", {
          protocol: adapter.protocol,
          user,
          chainId,
          error: result.reason.message,
        });
        return;
      }
      if (!result.value) return;
      // Morpho returns one entry per isolated market.
      if (Array.isArray(result.value)) positions.push(...result.value);
      else positions.push(result.value);
    });

    if (positions.length === 0) {
      return this.emptySnapshot({ user, chainId, chain, sourceErrors, startedAt });
    }

    // 2. Price every distinct symbol once.
    const symbols = new Set();
    for (const p of positions) {
      for (const leg of [...(p.collateral ?? []), ...(p.debt ?? [])]) symbols.add(leg.symbol);
    }
    const priced = await this.resolvePrices([...symbols], chainId);

    // 3. Attach prices to legs.
    const priceIssues = [];
    for (const p of positions) {
      for (const leg of [...(p.collateral ?? []), ...(p.debt ?? [])]) {
        const entry = priced.get(leg.symbol);
        leg.priceWad = entry?.priceWad ?? 0n;
        leg.priceSource = entry?.source ?? "unavailable";
        if (entry?.error) priceIssues.push({ symbol: leg.symbol, error: entry.error });
      }
    }

    // 4. Fold into health factors.
    const { aggregate, byProtocol, weakest } = aggregatePositions(positions);

    // A debt leg we could not price makes the HF an overstatement - the
    // dangerous direction. Flag the snapshot as degraded so the poller does not
    // silently treat it as healthy.
    const unpricedDebt = positions.some((p) =>
      (p.debt ?? []).some((leg) => leg.priceWad === 0n),
    );
    const degraded = unpricedDebt || sourceErrors.length > 0;

    const snapshot = {
      user: String(user).toLowerCase(),
      chainId,
      chainKey: toChainKey(chainId),
      chainName: chain?.name ?? String(chainId),
      observedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      health: aggregate,
      byProtocol,
      weakest,
      positions,
      degraded,
      sourceErrors,
      priceIssues,
      hasPosition: true,
    };

    this.recordHistory(snapshot);
    return snapshot;
  }

  emptySnapshot({ user, chainId, chain, sourceErrors, startedAt }) {
    const empty = {
      healthFactorWad: MAX_HEALTH_FACTOR_WAD,
      healthFactor: null,
      collateralUsdWad: 0n,
      riskAdjustedCollateralUsdWad: 0n,
      debtUsdWad: 0n,
      currentLtvWad: 0n,
      liquidationPriceHintWad: null,
    };
    return {
      user: String(user).toLowerCase(),
      chainId,
      chainKey: toChainKey(chainId),
      chainName: chain?.name ?? String(chainId),
      observedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      health: empty,
      byProtocol: [],
      weakest: null,
      positions: [],
      degraded: sourceErrors.length > 0,
      sourceErrors,
      priceIssues: [],
      hasPosition: false,
    };
  }

  /** Fixture symbols resolve locally; everything else hits the price service. */
  async resolvePrices(symbols, chainId) {
    const out = new Map();
    const remote = [];
    for (const symbol of symbols) {
      const override = this.priceOverrides.get(symbol);
      if (override !== undefined) out.set(symbol, { priceWad: override, source: "fixture", stale: false });
      else remote.push(symbol);
    }
    if (remote.length > 0) {
      const fetched = await this.priceService.getPrices(remote, { chainId });
      for (const [symbol, entry] of fetched) out.set(symbol, entry);
    }
    return out;
  }

  /**
   * Risk assessment for a user on one chain.
   *
   * The threshold used is, in order: an explicit per-call override, the user's
   * configured watchlist threshold, then the service default.
   *
   * @param {string} user
   * @param {number} chainId
   * @param {{thresholdWad?: bigint, fresh?: boolean}} [opts]
   */
  async checkLiquidationRisk(user, chainId, opts = {}) {
    const snapshot = await this.getPositionHealth(user, chainId, opts);
    const thresholdWad = this.resolveThreshold(user, chainId, opts.thresholdWad);

    // Liquidation happens per market, so risk is judged on the weakest market
    // rather than the flattering cross-protocol aggregate.
    const governingHealthFactorWad = snapshot.weakest
      ? snapshot.weakest.healthFactorWad
      : snapshot.health.healthFactorWad;

    const risk = evaluateRisk({
      healthFactorWad: governingHealthFactorWad,
      thresholdWad,
      criticalThresholdWad: this.config.risk.criticalThresholdWad,
      history: this.getHistory(user, chainId),
      forecastHorizonSec: this.config.risk.forecastHorizonSec,
      predictor: this.predictor,
    });

    return { snapshot, risk, governingHealthFactorWad };
  }

  resolveThreshold(user, chainId, override) {
    if (override !== undefined && override !== null) return override;
    const entry = this.watchlist?.get?.(user, chainId);
    if (entry?.thresholdWad) return entry.thresholdWad;
    return this.config.risk.defaultThresholdWad;
  }

  /** Append to the rolling per-position HF history used for trend estimation. */
  recordHistory(snapshot) {
    const key = PositionService.key(snapshot.user, snapshot.chainId);
    const healthFactorWad = snapshot.weakest
      ? snapshot.weakest.healthFactorWad
      : snapshot.health.healthFactorWad;

    const series = this.history.get(key) ?? [];
    series.push({ at: this.clock(), healthFactorWad });
    // Bounded ring: keep only the most recent N samples.
    while (series.length > this.config.risk.historySize) series.shift();
    this.history.set(key, series);
  }

  getHistory(user, chainId) {
    return this.history.get(PositionService.key(user, chainId)) ?? [];
  }

  clearHistory(user, chainId) {
    this.history.delete(PositionService.key(user, chainId));
  }
}

/**
 * JSON view of a snapshot + risk pair. This is the exact shape the frontend
 * dashboard and oracle-worker both read, so it is defined once here.
 */
function serializeSnapshot(snapshot, risk) {
  return {
    user: snapshot.user,
    chainId: snapshot.chainId,
    chainKey: snapshot.chainKey,
    chainName: snapshot.chainName,
    observedAt: snapshot.observedAt,
    hasPosition: snapshot.hasPosition,
    degraded: snapshot.degraded,
    ...serializeHealth(snapshot.health),
    weakestProtocol: snapshot.weakest
      ? {
          protocol: snapshot.weakest.protocol,
          healthFactor: wadToNumber(snapshot.weakest.healthFactorWad),
          healthFactorWad: snapshot.weakest.healthFactorWad.toString(),
        }
      : null,
    byProtocol: snapshot.byProtocol.map((p) => ({
      protocol: p.protocol,
      healthFactor: wadToNumber(p.healthFactorWad),
      healthFactorWad: p.healthFactorWad.toString(),
      collateralUsd: Number(formatUnits(p.collateralUsdWad, 18)),
      debtUsd: Number(formatUnits(p.debtUsdWad, 18)),
    })),
    positions: snapshot.positions.map(serializePosition),
    risk: risk ? serializeRisk(risk) : undefined,
    sourceErrors: snapshot.sourceErrors,
    priceIssues: snapshot.priceIssues,
  };
}

function serializePosition(position) {
  return {
    protocol: position.protocol,
    chainId: position.chainId,
    marketId: position.marketId,
    collateral: (position.collateral ?? []).map(serializeLeg),
    debt: (position.debt ?? []).map(serializeLeg),
  };
}

function serializeLeg(leg) {
  return {
    symbol: leg.symbol,
    address: leg.address,
    amount: Number(formatUnits(leg.amountWad ?? 0n, 18)),
    price: leg.priceWad === undefined ? null : Number(formatUnits(leg.priceWad, 18)),
    priceSource: leg.priceSource,
    liquidationThreshold:
      leg.liquidationThresholdWad === undefined
        ? undefined
        : Number(formatUnits(leg.liquidationThresholdWad, 18)),
  };
}

function assertAddress(user) {
  if (!/^0x[0-9a-fA-F]{40}$/.test(String(user || ""))) {
    throw Object.assign(new Error(`Invalid EVM address: ${user}`), { statusCode: 400 });
  }
}

module.exports = { PositionService, serializeSnapshot, serializePosition, assertAddress };
