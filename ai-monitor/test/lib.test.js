"use strict";

/**
 * Shared primitives: fixed-point maths, TTL cache, HTTP retry, logging.
 *
 * These are small but load-bearing - every health factor in the system is built
 * out of parseUnits, and every outbound call goes through requestJson.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  parseUnits,
  formatUnits,
  wadMul,
  wadDiv,
  wadToNumber,
  bpsToWad,
  WAD,
  MAX_HEALTH_FACTOR_WAD,
} = require("../src/lib/units");
const { TtlCache } = require("../src/lib/cache");
const { requestJson, HttpError } = require("../src/lib/http");
const { createLogger } = require("../src/lib/logger");
const { runWithConcurrency } = require("../src/poller");

// --- units ------------------------------------------------------------------

test("parseUnits handles whole numbers, decimals and custom precision", () => {
  assert.equal(parseUnits("1"), WAD);
  assert.equal(parseUnits("1.5"), 15n * 10n ** 17n);
  assert.equal(parseUnits("0.000000000000000001"), 1n);
  assert.equal(parseUnits("1000000", 6), 10n ** 12n);
});

test("parseUnits treats absent input as zero, consistently", () => {
  // null, undefined and "" are all "the source did not populate this field".
  // These used to disagree - null returned 0 while "" threw.
  assert.equal(parseUnits(null), 0n);
  assert.equal(parseUnits(undefined), 0n);
  assert.equal(parseUnits(""), 0n);
  assert.equal(parseUnits("   "), 0n);
});

test("parseUnits truncates rather than rounding up", () => {
  // Overstating a health factor is the dangerous direction, so excess precision
  // is always dropped, never rounded.
  assert.equal(parseUnits("1.9999999999999999999"), 1999999999999999999n);
  assert.equal(parseUnits("0.9999999", 6), 999999n);
});

test("parseUnits expands exponential notation from subgraphs", () => {
  // Subgraphs hand back exponent notation for very large or small balances;
  // BigInt("1e-7") throws, so this has to be normalised first.
  assert.equal(parseUnits("1e-7"), 100000000000n);
  assert.equal(parseUnits("1.5e3"), 1500n * WAD);
  assert.equal(parseUnits("2e18"), 2n * 10n ** 36n);
  assert.equal(formatUnits(parseUnits("1.23e-4"), 18), "0.000123");
});

test("parseUnits handles negative values", () => {
  // Compound reports a borrow as a negative base balance.
  assert.equal(parseUnits("-1.5"), -15n * 10n ** 17n);
  assert.equal(formatUnits(parseUnits("-0.25"), 18), "-0.25");
});

test("parseUnits rejects nonsense rather than silently returning zero", () => {
  assert.throws(() => parseUnits("abc"), /not a decimal number/);
  assert.throws(() => parseUnits("1.2.3"), /not a decimal number/);
});

test("parseUnits passes BigInt through untouched", () => {
  assert.equal(parseUnits(123n), 123n);
});

test("formatUnits round-trips and trims trailing zeros", () => {
  assert.equal(formatUnits(WAD, 18), "1");
  assert.equal(formatUnits(0n, 18), "0");
  assert.equal(formatUnits(parseUnits("1.500"), 18), "1.5");
  for (const value of ["0", "1", "1.5", "1234.5678", "0.000001"]) {
    assert.equal(formatUnits(parseUnits(value), 18), value === "0" ? "0" : value);
  }
});

test("wadMul and wadDiv keep WAD scale", () => {
  assert.equal(wadMul(parseUnits("2"), parseUnits("3")), parseUnits("6"));
  assert.equal(wadDiv(parseUnits("6"), parseUnits("3")), parseUnits("2"));
  assert.equal(wadMul(parseUnits("10"), parseUnits("0.825")), parseUnits("8.25"));
});

test("wadDiv saturates instead of dividing by zero", () => {
  // A position with no debt has an infinite health factor; it must stay a
  // BigInt all the way to the chain boundary rather than becoming Infinity.
  assert.equal(wadDiv(parseUnits("1"), 0n), MAX_HEALTH_FACTOR_WAD);
  assert.equal(wadDiv(0n, 0n), 0n);
});

test("wadToNumber returns null for a saturated health factor", () => {
  // JSON has no Infinity; null is the honest representation.
  assert.equal(wadToNumber(MAX_HEALTH_FACTOR_WAD), null);
  assert.equal(wadToNumber(parseUnits("1.05")), 1.05);
});

test("bpsToWad converts Aave basis points", () => {
  assert.equal(bpsToWad(8250), parseUnits("0.825"));
  assert.equal(bpsToWad(10000), WAD);
  assert.equal(bpsToWad(0), 0n);
});

// --- cache ------------------------------------------------------------------

test("cache expires entries after the TTL", () => {
  let now = 1000;
  const cache = new TtlCache({ ttlMs: 100, clock: () => now });
  cache.set("k", "v");
  assert.equal(cache.get("k"), "v");
  now += 101;
  assert.equal(cache.get("k"), undefined);
});

test("cache single-flights concurrent misses for the same key", async () => {
  const cache = new TtlCache({ ttlMs: 1000 });
  let loads = 0;
  const loader = async () => {
    loads += 1;
    await new Promise((r) => setTimeout(r, 10));
    return "value";
  };

  const results = await Promise.all(Array.from({ length: 5 }, () => cache.getOrLoad("k", loader)));
  assert.deepEqual(results, Array(5).fill("value"));
  assert.equal(loads, 1, "concurrent misses must share one loader call");
});

test("cache does not cache a failed load", async () => {
  const cache = new TtlCache({ ttlMs: 1000 });
  await assert.rejects(() =>
    cache.getOrLoad("k", async () => {
      throw new Error("boom");
    }),
  );
  // A later success must not be blocked by the earlier failure.
  assert.equal(await cache.getOrLoad("k", async () => "ok"), "ok");
});

test("cache evicts the oldest entry at capacity", () => {
  const cache = new TtlCache({ ttlMs: 10_000, maxEntries: 2 });
  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);
  assert.equal(cache.get("a"), undefined);
  assert.equal(cache.get("c"), 3);
  assert.equal(cache.size, 2);
});

// --- http -------------------------------------------------------------------

/** Run requestJson against a scripted sequence of responses. */
function scriptedFetch(responses) {
  let call = 0;
  const original = globalThis.fetch;
  globalThis.fetch = async () => {
    const next = responses[Math.min(call, responses.length - 1)];
    call += 1;
    if (next instanceof Error) throw next;
    return {
      ok: next.status >= 200 && next.status < 300,
      status: next.status,
      text: async () => next.body ?? "",
    };
  };
  return {
    calls: () => call,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}

test("http retries a 503 and then succeeds", async () => {
  const f = scriptedFetch([{ status: 503, body: "down" }, { status: 200, body: '{"ok":true}' }]);
  try {
    const result = await requestJson("http://test", { retries: 2, backoffMs: 1 });
    assert.deepEqual(result, { ok: true });
    assert.equal(f.calls(), 2);
  } finally {
    f.restore();
  }
});

test("http does not retry a 400", async () => {
  const f = scriptedFetch([{ status: 400, body: "bad request" }]);
  try {
    await assert.rejects(() => requestJson("http://test", { retries: 3, backoffMs: 1 }), HttpError);
    // Retrying a client error just wastes time and rate limit.
    assert.equal(f.calls(), 1);
  } finally {
    f.restore();
  }
});

test("http retries a 429 - rate limiting is transient", async () => {
  const f = scriptedFetch([{ status: 429 }, { status: 429 }, { status: 200, body: "{}" }]);
  try {
    await requestJson("http://test", { retries: 3, backoffMs: 1 });
    assert.equal(f.calls(), 3);
  } finally {
    f.restore();
  }
});

test("http gives up after the configured retries", async () => {
  const f = scriptedFetch([{ status: 500 }]);
  try {
    await assert.rejects(() => requestJson("http://test", { retries: 2, backoffMs: 1 }));
    assert.equal(f.calls(), 3, "initial attempt plus 2 retries");
  } finally {
    f.restore();
  }
});

test("http reports the failing status and url on the error", async () => {
  const f = scriptedFetch([{ status: 404, body: "nope" }]);
  try {
    const err = await requestJson("http://test/thing", { retries: 0 }).catch((e) => e);
    assert.equal(err.status, 404);
    assert.equal(err.url, "http://test/thing");
    assert.equal(err.retriable, false);
  } finally {
    f.restore();
  }
});

test("http returns null for an empty body", async () => {
  const f = scriptedFetch([{ status: 204, body: "" }]);
  try {
    assert.equal(await requestJson("http://test", { retries: 0 }), null);
  } finally {
    f.restore();
  }
});

// --- concurrency ------------------------------------------------------------

test("runWithConcurrency respects the limit and processes every item", async () => {
  let active = 0;
  let peak = 0;
  const seen = [];
  const items = Array.from({ length: 20 }, (_, i) => i);

  await runWithConcurrency(items, 3, async (item) => {
    active += 1;
    peak = Math.max(peak, active);
    await new Promise((r) => setTimeout(r, Math.random() * 5));
    seen.push(item);
    active -= 1;
  });

  assert.equal(peak, 3);
  assert.equal(seen.length, 20);
  assert.deepEqual([...seen].sort((a, b) => a - b), items);
});

test("runWithConcurrency handles an empty list", async () => {
  await runWithConcurrency([], 5, async () => {
    throw new Error("must not be called");
  });
});

// --- logger -----------------------------------------------------------------

test("logger keeps its own level when a caller passes a level field", () => {
  // Regression: a risk level of "CRITICAL" once overwrote the log level,
  // producing lines that looked like a CRITICAL severity log.
  const lines = [];
  const original = process.stdout.write;
  process.stdout.write = (chunk) => {
    lines.push(chunk);
    return true;
  };
  try {
    createLogger("test").info("risk alert", { level: "CRITICAL", msg: "shadowed" });
  } finally {
    process.stdout.write = original;
  }

  const record = JSON.parse(lines[0]);
  assert.equal(record.level, "info");
  assert.equal(record.msg, "risk alert");
  // The caller's values are preserved, just re-homed rather than dropped.
  assert.equal(record["fields.level"], "CRITICAL");
  assert.equal(record["fields.msg"], "shadowed");
});

test("logger serialises BigInt and Error fields", () => {
  const lines = [];
  const original = process.stdout.write;
  process.stdout.write = (chunk) => {
    lines.push(chunk);
    return true;
  };
  try {
    // JSON.stringify throws on a BigInt, which would take down the caller.
    createLogger("test").info("values", { amount: 10n ** 18n, err: new Error("boom") });
  } finally {
    process.stdout.write = original;
  }

  const record = JSON.parse(lines[0]);
  assert.equal(record.amount, "1000000000000000000");
  assert.equal(record.err.message, "boom");
});

test("logger child loggers inherit and extend context", () => {
  const lines = [];
  const original = process.stdout.write;
  process.stdout.write = (chunk) => {
    lines.push(chunk);
    return true;
  };
  try {
    createLogger("test").child({ module: "poller" }).child({ jobId: "j1" }).info("hi");
  } finally {
    process.stdout.write = original;
  }

  const record = JSON.parse(lines[0]);
  assert.equal(record.module, "poller");
  assert.equal(record.jobId, "j1");
});
