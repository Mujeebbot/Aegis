"use strict";

/**
 * Structured JSON logger. One line per event so the hackathon demo can be
 * tailed with `jq`, and so oracle-worker/ai-monitor logs interleave readably.
 *
 * LOG_LEVEL=debug|info|warn|error (default info). LOG_PRETTY=1 for humans.
 */

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

/** Keys the logger owns; caller fields using these are re-homed under `fields.`. */
const RESERVED = new Set(["ts", "level", "msg"]);

function createLogger(component, options = {}) {
  const level = LEVELS[options.level || process.env.LOG_LEVEL || "info"] ?? LEVELS.info;
  const pretty = options.pretty ?? process.env.LOG_PRETTY === "1";
  const base = { component, ...(options.base || {}) };

  function emit(levelName, message, fields) {
    if (LEVELS[levelName] < level) return;
    // Reserved keys are written LAST so a caller field named `level` or `msg`
    // cannot shadow them - a risk level of "CRITICAL" must not turn an info
    // line into a fake CRITICAL log level. Colliding caller fields are kept
    // under a `fields.` prefix rather than silently dropped.
    const provided = normalize(fields);
    const record = { ts: null, level: null, ...base, msg: null };
    for (const [key, value] of Object.entries(provided)) {
      record[RESERVED.has(key) ? `fields.${key}` : key] = value;
    }
    record.ts = new Date().toISOString();
    record.level = levelName;
    record.msg = message;
    const line = pretty ? prettyFormat(record) : JSON.stringify(record);
    // stderr for warn/error keeps `node src/index.js > events.log` clean.
    if (LEVELS[levelName] >= LEVELS.warn) process.stderr.write(`${line}\n`);
    else process.stdout.write(`${line}\n`);
  }

  return {
    debug: (msg, fields) => emit("debug", msg, fields),
    info: (msg, fields) => emit("info", msg, fields),
    warn: (msg, fields) => emit("warn", msg, fields),
    error: (msg, fields) => emit("error", msg, fields),
    /** Derive a logger that stamps extra fields on every line (e.g. a jobId). */
    child: (fields) => createLogger(component, { ...options, base: { ...base, ...fields } }),
  };
}

/** BigInt and Error are not JSON-serialisable by default; make them so. */
function normalize(fields) {
  if (!fields) return {};
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "bigint") out[key] = value.toString();
    else if (value instanceof Error) out[key] = { name: value.name, message: value.message, stack: value.stack };
    else out[key] = value;
  }
  return out;
}

function prettyFormat(record) {
  const { ts, level, component, msg, ...rest } = record;
  const extras = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : "";
  return `${ts} ${level.toUpperCase().padEnd(5)} [${component}] ${msg}${extras}`;
}

module.exports = { createLogger };
