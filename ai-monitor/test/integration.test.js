"use strict";

/**
 * End-to-end tests over the assembled service: real Watchlist, PositionService,
 * Poller, AlertDispatcher and Express app, with only the network faked.
 *
 * This is the test that would actually catch a broken hand-off between
 * ai-monitor and oracle-worker.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { buildApp } = require("../src/index");
const { createLogger } = require("../src/lib/logger");
const { parseUnits } = require("../src/lib/units");
const { PROTOCOL } = require("../src/sources/protocols");

const USER = "0xaaaa0000000000000000000000000000000000aa";
const CHAIN_ID = 11155111;

/** Silent logger so test output stays readable. */
const silentLogger = createLogger("test", { level: "error" });

function testConfig(overrides = {}) {
  return {
    dataMode: "fixture",
    server: { port: 0, host: "127.0.0.1", apiKey: "" },
    poller: { enabled: false, intervalMs: 30_000, concurrency: 5 },
    risk: {
      defaultThresholdWad: parseUnits("1.05"),
      criticalThresholdWad: parseUnits("1.01"),
      forecastHorizonSec: 900,
      historySize: 40,
      alertCooldownMs: 300_000,
    },
    graph: { apiKey: "", gatewayUrl: "", timeoutMs: 1000, subgraphs: {} },
    prices: { ttlMs: 1000, timeoutMs: 1000, coingeckoBaseUrl: "", coingeckoApiKey: "", chainlinkFeedAddress: "" },
    protocols: [],
    alerts: { webhookUrl: "http://worker.test/alerts", apiKey: "", enabled: true, timeoutMs: 1000, retries: 0 },
    watchlist: [],
    ...overrides,
  };
}

/** An adapter returning a health factor we control directly. */
function stubAdapter(healthFactorTarget) {
  return {
    protocol: PROTOCOL.AAVE_V3,
    supports: () => true,
    async fetchPosition(user, chainId) {
      // 10 ETH @ $2000 with 0.825 LT -> risk-adjusted collateral of $16,500.
      // Choose debt so that 16500 / debt == target.
      const debt = 16500 / healthFactorTarget;
      return {
        protocol: PROTOCOL.AAVE_V3,
        chainId,
        collateral: [
          {
            symbol: "TEST-ETH",
            amountWad: parseUnits("10"),
            liquidationThresholdWad: parseUnits("0.825"),
          },
        ],
        debt: [{ symbol: "TEST-USD", amountWad: parseUnits(debt.toFixed(6)) }],
      };
    },
  };
}

const stubPrices = new Map([
  ["TEST-ETH", parseUnits("2000")],
  ["TEST-USD", parseUnits("1")],
]);

/** Build the app with an in-memory watchlist and a capturing alert dispatcher. */
function harness({ healthFactor = 2.0, config = {} } = {}) {
  const delivered = [];

  const cfg = testConfig(config);
  const context = buildApp({
    config: cfg,
    logger: silentLogger,
    adapters: [stubAdapter(healthFactor)],
    priceOverrides: stubPrices,
    // No disk persistence in tests.
    watchlist: new (require("../src/watchlist").Watchlist)({
      logger: silentLogger,
      config: cfg,
      filePath: null,
    }).init(),
  });

  // Intercept dispatch at the HTTP boundary so the payload builder, the
  // cooldown logic and the poller are all exercised for real.
  context.alertDispatcher.fetchJson = async (url, options) => {
    delivered.push({ url, body: JSON.parse(options.body) });
    return { jobId: "job_test" };
  };

  return { ...context, delivered };
}

/** Start the express app on an ephemeral port and return a fetch helper. */
async function serve(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    async get(path) {
      const res = await fetch(base + path);
      return { status: res.status, body: await res.json().catch(() => null) };
    },
    async send(method, path, body) {
      const res = await fetch(base + path, {
        method,
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    },
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}

test("GET /positions returns the health factor and its full breakdown", async () => {
  const { app, watchlist } = harness({ healthFactor: 1.5 });
  watchlist.add({ user: USER, chainId: CHAIN_ID });
  const http = await serve(app);
  try {
    const { status, body } = await http.get(`/positions/${USER}/${CHAIN_ID}`);
    assert.equal(status, 200);
    assert.equal(body.user, USER);
    assert.equal(body.chainId, CHAIN_ID);
    // chainKey 1 is Sepolia - the mapping the oracle-worker depends on.
    assert.equal(body.chainKey, 1);
    assert.ok(Math.abs(body.healthFactor - 1.5) < 0.001);
    assert.equal(body.healthFactorWad, String(BigInt(Math.round(1.5 * 1e6)) * 10n ** 12n));
    assert.equal(body.hasPosition, true);
    assert.equal(body.degraded, false);
  } finally {
    await http.close();
  }
});

test("GET /risk hoists isAtRisk and threshold to the top level", async () => {
  const { app } = harness({ healthFactor: 1.02 });
  const http = await serve(app);
  try {
    const { status, body } = await http.get(`/risk/${USER}/${CHAIN_ID}`);
    assert.equal(status, 200);
    // The two fields shared/interfaces.md promises.
    assert.equal(body.isAtRisk, true);
    assert.equal(body.threshold, 1.05);
    assert.equal(body.risk.level, "AT_RISK");
  } finally {
    await http.close();
  }
});

test("GET /risk honours a per-request threshold override", async () => {
  const { app } = harness({ healthFactor: 1.2 });
  const http = await serve(app);
  try {
    const relaxed = await http.get(`/risk/${USER}/${CHAIN_ID}`);
    assert.equal(relaxed.body.isAtRisk, false);

    // Ask with a threshold above the current HF and it becomes at risk.
    const strict = await http.get(`/risk/${USER}/${CHAIN_ID}?threshold=1.3`);
    assert.equal(strict.body.isAtRisk, true);
    assert.equal(strict.body.threshold, 1.3);
  } finally {
    await http.close();
  }
});

test("rejects malformed addresses and unsupported chains", async () => {
  const { app } = harness();
  const http = await serve(app);
  try {
    assert.equal((await http.get(`/positions/not-an-address/${CHAIN_ID}`)).status, 400);
    assert.equal((await http.get(`/positions/${USER}/999999`)).status, 400);
    assert.equal((await http.get("/nope")).status, 404);
  } finally {
    await http.close();
  }
});

test("watchlist add/list/delete round-trips over HTTP", async () => {
  const { app } = harness();
  const http = await serve(app);
  try {
    const created = await http.send("POST", "/watchlist", {
      user: USER,
      chainId: CHAIN_ID,
      threshold: 1.04,
    });
    assert.equal(created.status, 201);
    assert.equal(created.body.threshold, 1.04);

    const listed = await http.get("/watchlist");
    assert.equal(listed.body.entries.length, 1);

    const removed = await http.send("DELETE", `/watchlist/${USER}/${CHAIN_ID}`);
    assert.equal(removed.status, 204);
    assert.equal((await http.get("/watchlist")).body.entries.length, 0);
  } finally {
    await http.close();
  }
});

test("refuses a threshold above the contract's SAFE_THRESHOLD", async () => {
  // Settlement.protectPosition requires healthFactor < 1.05e18, so alerting
  // above that line would only ever produce reverting submissions.
  const { app } = harness();
  const http = await serve(app);
  try {
    const res = await http.send("POST", "/watchlist", {
      user: USER,
      chainId: CHAIN_ID,
      threshold: 1.5,
    });
    assert.equal(res.status, 400);
    assert.match(res.body.message, /SAFE_THRESHOLD/);
  } finally {
    await http.close();
  }
});

test("a poll tick dispatches an alert in the documented wire shape", async () => {
  const { poller, watchlist, delivered } = harness({ healthFactor: 1.0 });
  watchlist.add({ user: USER, chainId: CHAIN_ID });

  await poller.tick();

  assert.equal(delivered.length, 1);
  const alert = delivered[0].body;

  // The four fields shared/interfaces.md guarantees.
  assert.equal(alert.user, USER);
  assert.equal(alert.chainId, CHAIN_ID);
  assert.equal(typeof alert.healthFactor, "number");
  assert.equal(alert.isAtRisk, true);

  // Context the worker relies on.
  assert.equal(alert.chainKey, 1);
  assert.match(alert.alertId, /^alert_[0-9a-f]{32}$/);
  assert.equal(typeof alert.healthFactorWad, "string");
  assert.equal(alert.risk.level, "CRITICAL");
});

test("the alert carries the watchlist sourceTxHash so the worker need not ask", async () => {
  // Without this the worker falls back to calling /watchlist, and if that call
  // fails it degrades to SOURCE_CHAIN_TXN_HASH - proving a transaction that has
  // nothing to do with this user.
  const { poller, watchlist, delivered } = harness({ healthFactor: 1.0 });
  const tx = `0x${"ab".repeat(32)}`;
  watchlist.add({ user: USER, chainId: CHAIN_ID, sourceTxHash: tx });

  await poller.tick();

  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].body.sourceTxHash, tx);
});

test("the alert omits sourceTxHash entirely when none is recorded", async () => {
  // Absent, not null: the worker guards with isTxHash(), and an explicit null
  // would still be falsy but muddies the documented wire shape.
  const { poller, watchlist, delivered } = harness({ healthFactor: 1.0 });
  watchlist.add({ user: USER, chainId: CHAIN_ID });

  await poller.tick();

  assert.equal(delivered.length, 1);
  assert.equal("sourceTxHash" in delivered[0].body, false);
});

test("a healthy position produces no alert", async () => {
  const { poller, watchlist, delivered } = harness({ healthFactor: 3.0 });
  watchlist.add({ user: USER, chainId: CHAIN_ID });
  await poller.tick();
  assert.equal(delivered.length, 0);
});

test("the cooldown suppresses repeat alerts for one incident", async () => {
  const { poller, watchlist, delivered } = harness({ healthFactor: 1.02 });
  watchlist.add({ user: USER, chainId: CHAIN_ID });

  await poller.tick();
  assert.equal(delivered.length, 1);

  // Same position, same risk band, well inside the cooldown window.
  await poller.tick();
  assert.equal(delivered.length, 1, "second tick must not re-alert");
});

test("an escalation breaks through the cooldown", async () => {
  const { poller, watchlist, delivered, positionService } = harness({ healthFactor: 1.02 });
  watchlist.add({ user: USER, chainId: CHAIN_ID });

  await poller.tick();
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].body.risk.level, "AT_RISK");

  // The position deteriorates from AT_RISK into CRITICAL.
  positionService.adapters[0] = stubAdapter(0.98);
  positionService.snapshotCache.clear();

  await poller.tick();
  assert.equal(delivered.length, 2, "CRITICAL must not wait out the cooldown");
  assert.equal(delivered[1].body.risk.level, "CRITICAL");
});

test("a failing subgraph degrades the snapshot instead of crashing the tick", async () => {
  const { app, positionService } = harness();
  positionService.adapters = [
    {
      protocol: PROTOCOL.AAVE_V3,
      supports: () => true,
      fetchPosition: async () => {
        throw new Error("subgraph 502");
      },
    },
  ];

  const http = await serve(app);
  try {
    const { status, body } = await http.get(`/positions/${USER}/${CHAIN_ID}?fresh=1`);
    assert.equal(status, 200);
    assert.equal(body.hasPosition, false);
    assert.equal(body.degraded, true);
    assert.equal(body.sourceErrors.length, 1);
    assert.match(body.sourceErrors[0].error, /502/);
  } finally {
    await http.close();
  }
});

test("a degraded snapshot does not trigger a non-critical alert", async () => {
  // A missing price makes HF unreliable; spending gas on that would be wrong.
  const { poller, watchlist, positionService, delivered } = harness({ healthFactor: 1.02 });
  watchlist.add({ user: USER, chainId: CHAIN_ID });

  const good = positionService.adapters[0];
  positionService.adapters = [
    good,
    {
      protocol: PROTOCOL.COMPOUND_V3,
      supports: () => true,
      fetchPosition: async () => {
        throw new Error("compound subgraph down");
      },
    },
  ];

  const result = await poller.tick();
  assert.equal(delivered.length, 0);
  assert.equal(result.results[0].suppressed, "degraded-snapshot");
});

test("/metrics and /readyz expose operational state", async () => {
  const { app } = harness();
  const http = await serve(app);
  try {
    const metrics = await http.get("/metrics");
    assert.equal(metrics.status, 200);
    assert.equal(metrics.body.dataMode, "fixture");
    assert.equal(metrics.body.thresholds.default, 1.05);

    // Polling is disabled in tests, so readiness must not depend on it.
    const ready = await http.get("/readyz");
    assert.equal(ready.status, 200);
    assert.equal(ready.body.ready, true);
  } finally {
    await http.close();
  }
});

test("mutating routes require the API key when one is configured", async () => {
  const { app } = harness({ config: { server: { port: 0, host: "127.0.0.1", apiKey: "s3cret" } } });
  const http = await serve(app);
  try {
    const denied = await http.send("POST", "/watchlist", { user: USER, chainId: CHAIN_ID });
    assert.equal(denied.status, 401);

    const res = await fetch(`${http.base}/watchlist`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer s3cret" },
      body: JSON.stringify({ user: USER, chainId: CHAIN_ID }),
    });
    assert.equal(res.status, 201);

    // Reads stay open - the data is public chain state.
    assert.equal((await http.get("/watchlist")).status, 200);
  } finally {
    await http.close();
  }
});
