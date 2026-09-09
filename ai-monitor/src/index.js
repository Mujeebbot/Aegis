"use strict";

/**
 * ai-monitor entrypoint.
 *
 * Composition root: builds every collaborator, wires them together, starts the
 * API and the poll loop, and shuts both down cleanly. All dependency choices
 * happen here so the individual modules stay unit-testable in isolation.
 */

const { load } = require("./config");
const { createLogger } = require("./lib/logger");
const { GraphClient } = require("./sources/graph");
const { createAaveAdapter } = require("./sources/aave");
const { createCompoundAdapter } = require("./sources/compound");
const { createMorphoAdapter } = require("./sources/morpho");
const { createFixtureAdapter, FIXTURE_PRICES, FIXTURE_USERS } = require("./sources/fixtures");
const { PROTOCOL } = require("./sources/protocols");
const { PriceService } = require("./prices");
const { PositionService } = require("./core/positions");
const { Watchlist } = require("./watchlist");
const { AlertDispatcher } = require("./alerts");
const { Poller } = require("./poller");
const { createServer } = require("./api/server");

/**
 * Build the whole object graph without starting anything. Exported so tests can
 * assemble a real service against injected fakes.
 * @param {object} [overrides]
 */
function buildApp(overrides = {}) {
  const config = overrides.config ?? load();
  const logger = overrides.logger ?? createLogger("ai-monitor");

  const watchlist = overrides.watchlist ?? new Watchlist({ logger, config }).init();

  const priceService =
    overrides.priceService ?? new PriceService({ config: config.prices, logger });

  const { adapters, priceOverrides } = buildAdapters({ config, logger, overrides });

  const positionService =
    overrides.positionService ??
    new PositionService({
      config,
      logger,
      priceService,
      adapters,
      watchlist,
      predictor: overrides.predictor ?? null,
      priceOverrides,
    });

  const alertDispatcher =
    overrides.alertDispatcher ?? new AlertDispatcher({ config: config.alerts, logger });

  const poller =
    overrides.poller ??
    new Poller({ config, logger, positionService, watchlist, alertDispatcher });

  const app = createServer({
    config,
    logger,
    positionService,
    watchlist,
    poller,
    alertDispatcher,
  });

  return { config, logger, app, poller, watchlist, positionService, alertDispatcher, priceService };
}

/**
 * Choose data sources. In fixture mode the fixture adapter fully replaces the
 * subgraph adapters, so the service runs with no external dependencies at all.
 */
function buildAdapters({ config, logger, overrides }) {
  if (overrides.adapters) {
    return { adapters: overrides.adapters, priceOverrides: overrides.priceOverrides ?? new Map() };
  }

  if (config.dataMode === "fixture") {
    logger.warn("running in FIXTURE mode - positions are simulated, not real chain state", {
      hint: "set THE_GRAPH_API_KEY and AI_MONITOR_DATA_MODE=live for real data",
      fixtureUsers: FIXTURE_USERS,
    });
    const fixture = createFixtureAdapter({ logger });
    const priceOverrides = new Map([...FIXTURE_PRICES]);
    // The decaying fixture's price moves every tick, so it is re-read on each
    // snapshot rather than captured once here.
    return {
      adapters: [fixture],
      priceOverrides: new DynamicPriceOverrides(priceOverrides, fixture),
    };
  }

  const graph = new GraphClient({ config: config.graph, logger });
  const registry = {
    [PROTOCOL.AAVE_V3]: () => createAaveAdapter({ graph, logger }),
    [PROTOCOL.COMPOUND_V3]: () => createCompoundAdapter({ graph, logger }),
    [PROTOCOL.MORPHO_BLUE]: () => createMorphoAdapter({ graph, logger }),
  };

  // config.validate() has already rejected any unknown protocol name, so every
  // entry here is guaranteed to have a factory.
  const adapters = config.protocols.map((name) => registry[name]());

  if (adapters.length === 0) {
    throw new Error("No protocol adapters enabled. Check AI_MONITOR_PROTOCOLS.");
  }

  return { adapters, priceOverrides: new Map() };
}

/**
 * Map-shaped view over fixture prices where one entry is recomputed on every
 * read. PositionService only ever calls `.get()`, so this satisfies it without
 * leaking fixture concerns into the service.
 */
class DynamicPriceOverrides {
  constructor(staticPrices, fixture) {
    this.staticPrices = staticPrices;
    this.fixture = fixture;
  }

  get(symbol) {
    const dynamic = this.fixture.priceOverrides?.();
    if (dynamic?.has(symbol)) return dynamic.get(symbol);
    return this.staticPrices.get(symbol);
  }
}

async function main() {
  let context;
  try {
    context = buildApp();
  } catch (err) {
    // Config errors are the most common startup failure; print them plainly
    // rather than as a stack trace nobody reads.
    process.stderr.write(`ai-monitor failed to start: ${err.message}\n`);
    process.exit(1);
    return;
  }

  const { config, logger, app, poller, watchlist } = context;

  const server = app.listen(config.server.port, config.server.host, () => {
    logger.info("ai-monitor listening", {
      host: config.server.host,
      port: config.server.port,
      dataMode: config.dataMode,
      watched: watchlist.size,
      alertsTo: config.alerts.enabled ? config.alerts.webhookUrl : "disabled",
    });
    if (watchlist.size === 0) {
      logger.warn("watchlist is empty - nothing will be monitored", {
        hint: 'seed with AI_MONITOR_WATCHLIST="11155111:0xYourAddress" or POST /watchlist',
      });
    }
  });

  if (config.poller.enabled) poller.start();

  const shutdown = (signal) => {
    logger.info("shutting down", { signal });
    poller.stop();
    server.close(() => process.exit(0));
    // Do not hang forever on a wedged connection.
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("unhandledRejection", (reason) => {
    logger.error("unhandled rejection", { error: reason instanceof Error ? reason : String(reason) });
  });
}

if (require.main === module) main();

module.exports = { buildApp, buildAdapters };
