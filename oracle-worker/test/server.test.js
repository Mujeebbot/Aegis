"use strict";

/**
 * The alert intake surface.
 *
 * This is the contract ai-monitor posts to, so the status codes matter: 202
 * means accepted, 200 means "already have this one", and neither may block
 * while the pipeline runs - proof generation takes minutes, far longer than the
 * sender's HTTP timeout.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const { createServer } = require("../src/server");
const { JobQueue } = require("../src/queue");
const { createLogger } = require("../src/lib/logger");

const logger = createLogger("test", { level: "error" });

const USER = `0x${"aa".repeat(20)}`;

function makeConfig(overrides = {}) {
  return {
    server: { port: 0, host: "127.0.0.1", apiKey: "", ...(overrides.server || {}) },
    queue: {
      concurrency: 1,
      maxAttempts: 1,
      baseBackoffMs: 1,
      maxBackoffMs: 5,
      dedupeTtlMs: 60_000,
    },
    proofs: { preflight: true },
    dryRun: false,
    ...overrides,
  };
}

function harness({ config = makeConfig(), handler, readiness } = {}) {
  const handled = [];
  const queue = new JobQueue({
    config: config.queue,
    logger,
    handler:
      handler ??
      (async (job) => {
        handled.push(job.alertId);
        return { txHash: "0xtx" };
      }),
  });

  const app = createServer({
    config,
    logger,
    queue,
    creditcoin: { address: `0x${"bb".repeat(20)}` },
    ascClient: { address: `0x${"11".repeat(20)}` },
    readiness: readiness ?? {
      chainConnected: true,
      contractDeployed: true,
      underfunded: false,
      chainRegistryChecked: true,
      bootError: null,
    },
  });

  return { app, queue, handled };
}

async function serve(app) {
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  const base = `http://127.0.0.1:${server.address().port}`;
  return {
    base,
    async post(path, body, headers = {}) {
      const res = await fetch(base + path, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: typeof body === "string" ? body : JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, body: text ? JSON.parse(text) : null };
    },
    async get(path) {
      const res = await fetch(base + path);
      return { status: res.status, body: await res.json().catch(() => null) };
    },
    close: () => new Promise((r) => server.close(r)),
  };
}

const validAlert = (overrides = {}) => ({
  alertId: "alert_test_0001",
  user: USER,
  chainId: 11155111,
  chainKey: 1,
  healthFactor: 1.01,
  healthFactorWad: "1010000000000000000",
  isAtRisk: true,
  observedAt: new Date().toISOString(),
  risk: { level: "AT_RISK" },
  ...overrides,
});

test("accepts an alert with 202 and a job id", async () => {
  const { app } = harness();
  const http = await serve(app);
  try {
    const res = await http.post("/alerts", validAlert());
    assert.equal(res.status, 202);
    assert.equal(res.body.accepted, true);
    assert.equal(res.body.duplicate, false);
    assert.match(res.body.jobId, /^job_[0-9a-f]{16}$/);
    assert.equal(res.body.alertId, "alert_test_0001");
  } finally {
    await http.close();
  }
});

test("returns immediately rather than waiting for the pipeline", async () => {
  // Proof generation can take minutes; the sender must not be held open.
  const { app } = harness({
    handler: () => new Promise((resolve) => setTimeout(() => resolve({}), 5000)),
  });
  const http = await serve(app);
  try {
    const started = Date.now();
    const res = await http.post("/alerts", validAlert());
    assert.equal(res.status, 202);
    assert.ok(Date.now() - started < 1000, "intake must not block on the pipeline");
  } finally {
    await http.close();
  }
});

test("a redelivered alert returns 200 and the original job id", async () => {
  const { app, handled } = harness();
  const http = await serve(app);
  try {
    const first = await http.post("/alerts", validAlert());
    const second = await http.post("/alerts", validAlert());

    assert.equal(first.status, 202);
    assert.equal(second.status, 200);
    assert.equal(second.body.duplicate, true);
    assert.equal(second.body.jobId, first.body.jobId);

    await new Promise((r) => setTimeout(r, 50));
    assert.equal(handled.length, 1, "at-least-once delivery must act once");
  } finally {
    await http.close();
  }
});

test("rejects a non-object body", async () => {
  const { app } = harness();
  const http = await serve(app);
  try {
    const res = await http.post("/alerts", '"just a string"');
    assert.equal(res.status, 400);
    assert.equal(res.body.error, "bad_request");
  } finally {
    await http.close();
  }
});

test("a malformed alert is accepted for queueing then fails permanently", async () => {
  // Validation lives in the pipeline so the failure is recorded against a job
  // and is visible on /jobs, rather than vanishing into a 400.
  const { app, queue } = harness({
    handler: async () => {
      throw Object.assign(new Error("Invalid risk alert: user must be a valid EVM address"), {
        retriable: false,
      });
    },
  });
  const http = await serve(app);
  try {
    const res = await http.post("/alerts", validAlert({ user: "nope" }));
    assert.equal(res.status, 202);

    await new Promise((r) => setTimeout(r, 50));
    const job = queue.get(res.body.jobId);
    assert.equal(job.state, "failed");
    assert.equal(job.attempts, 1, "a permanent failure must not be retried");
  } finally {
    await http.close();
  }
});

test("requires the API key on intake when one is configured", async () => {
  const { app } = harness({ config: makeConfig({ server: { apiKey: "s3cret" } }) });
  const http = await serve(app);
  try {
    assert.equal((await http.post("/alerts", validAlert())).status, 401);

    const authed = await http.post("/alerts", validAlert(), { authorization: "Bearer s3cret" });
    assert.equal(authed.status, 202);

    const viaHeader = await http.post("/alerts", validAlert({ alertId: "alert_2" }), {
      "x-api-key": "s3cret",
    });
    assert.equal(viaHeader.status, 202);
  } finally {
    await http.close();
  }
});

test("exposes job detail with its step history", async () => {
  const { app } = harness({
    handler: async () => ({ txHash: "0xtx", steps: [{ step: "submit" }] }),
  });
  const http = await serve(app);
  try {
    const accepted = await http.post("/alerts", validAlert());
    await new Promise((r) => setTimeout(r, 50));

    const job = await http.get(`/jobs/${accepted.body.jobId}`);
    assert.equal(job.status, 200);
    assert.equal(job.body.state, "succeeded");
    assert.equal(job.body.user, USER);
    assert.equal(job.body.result.txHash, "0xtx");
    assert.equal(job.body.history[0].ok, true);

    const list = await http.get("/jobs");
    assert.equal(list.body.jobs.length, 1);
    assert.equal(list.body.stats.succeeded, 1);
  } finally {
    await http.close();
  }
});

test("returns 404 for an unknown job", async () => {
  const { app } = harness();
  const http = await serve(app);
  try {
    assert.equal((await http.get("/jobs/job_nope")).status, 404);
    assert.equal((await http.get("/no-such-route")).status, 404);
  } finally {
    await http.close();
  }
});

test("readiness reflects the boot checks", async () => {
  const ready = harness();
  const http = await serve(ready.app);
  try {
    assert.equal((await http.get("/readyz")).status, 200);
    assert.equal((await http.get("/healthz")).status, 200);
  } finally {
    await http.close();
  }

  // An undeployed contract means the worker cannot do its job.
  const notReady = harness({
    readiness: {
      chainConnected: true,
      contractDeployed: false,
      underfunded: false,
      bootError: "ASC_CONTRACT_ADDRESS is not set",
    },
  });
  const http2 = await serve(notReady.app);
  try {
    const res = await http2.get("/readyz");
    assert.equal(res.status, 503);
    assert.equal(res.body.ready, false);
    assert.match(res.body.bootError, /ASC_CONTRACT_ADDRESS/);
  } finally {
    await http2.close();
  }
});

test("an underfunded signer is not ready", async () => {
  // It would accept alerts and then fail every submission.
  const { app } = harness({
    readiness: {
      chainConnected: true,
      contractDeployed: true,
      underfunded: true,
      bootError: null,
    },
  });
  const http = await serve(app);
  try {
    assert.equal((await http.get("/readyz")).status, 503);
  } finally {
    await http.close();
  }
});

test("metrics expose queue counters and run mode", async () => {
  const { app } = harness({ config: makeConfig({ dryRun: true }) });
  const http = await serve(app);
  try {
    await http.post("/alerts", validAlert());
    await new Promise((r) => setTimeout(r, 50));

    const res = await http.get("/metrics");
    assert.equal(res.body.service, "oracle-worker");
    assert.equal(res.body.dryRun, true);
    assert.equal(res.body.queue.enqueued, 1);
    assert.equal(res.body.queue.succeeded, 1);
  } finally {
    await http.close();
  }
});
