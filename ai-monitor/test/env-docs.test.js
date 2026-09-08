"use strict";

/**
 * Documentation drift guard for environment variables.
 *
 * `.env.example` is declared the single source of truth in the repo README, and
 * env vars are the most common cause of "it works on my machine". An undocumented
 * variable is invisible to everyone who did not write it, so this fails the
 * build the moment code reads something `.env.example` does not explain.
 *
 * Scans both backend services, since one shared `.env` drives them together.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..", "..");

/** Vars that are intentionally documented but deliberately not read. */
const DOCUMENTED_BUT_UNUSED = new Set([
  // Placeholder: Solana is not an attested source chain on CC3, so no proof can
  // be generated for it. Commented out in .env.example with an explanation.
  "SOURCE_CHAIN_RPC_SOLANA_DEVNET",
]);

/** Remove block and line comments so only real code is inspected. */
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

function sourceFiles() {
  return [
    path.join(REPO_ROOT, "ai-monitor", "src"),
    path.join(REPO_ROOT, "oracle-worker", "src"),
    path.join(REPO_ROOT, "oracle-worker", "scripts"),
  ].flatMap((dir) => walk(dir));
}

/** Every env var the backend actually reads. */
function varsReadByCode() {
  const used = new Map();
  const record = (name, file) => {
    if (!used.has(name)) used.set(name, new Set());
    used.get(name).add(path.relative(REPO_ROOT, file));
  };

  for (const file of sourceFiles()) {
    const src = fs.readFileSync(file, "utf8");
    for (const m of src.matchAll(/process\.env\.([A-Z0-9_]+)/g)) record(m[1], file);
    // The str()/num()/bool()/csv() config helpers. \s* so a call wrapped across
    // lines by the formatter is still matched.
    for (const m of src.matchAll(/\b(?:str|num|bool|csv)\(\s*"([A-Z0-9_]+)"/g)) record(m[1], file);
  }
  return used;
}

/** Every env var `.env.example` mentions, set or commented out. */
function varsDocumented() {
  const text = fs.readFileSync(path.join(REPO_ROOT, ".env.example"), "utf8");
  const documented = new Set();
  for (const m of text.matchAll(/^\s*#?\s*([A-Z0-9_]+)=/gm)) documented.add(m[1]);
  return documented;
}

test("every env var the backend reads is documented in .env.example", () => {
  const used = varsReadByCode();
  const documented = varsDocumented();

  const undocumented = [...used.keys()]
    .filter((name) => !documented.has(name))
    .map((name) => `${name} (read by ${[...used.get(name)].join(", ")})`)
    .sort();

  assert.deepEqual(
    undocumented,
    [],
    `Undocumented environment variables. Add them to .env.example:\n  ${undocumented.join("\n  ")}`,
  );
});

test(".env.example does not document variables nothing reads", () => {
  const used = varsReadByCode();
  const documented = varsDocumented();

  const stale = [...documented]
    .filter((name) => !used.has(name) && !DOCUMENTED_BUT_UNUSED.has(name))
    .sort();

  assert.deepEqual(
    stale,
    [],
    `.env.example documents variables no code reads. Remove them, or add them to ` +
      `DOCUMENTED_BUT_UNUSED with a reason:\n  ${stale.join("\n  ")}`,
  );
});

test("the config helpers are the only place either service reads process.env", () => {
  // config.js validates and documents every variable in one pass; a stray read
  // elsewhere bypasses that and silently ignores a typo. logger.js is the one
  // allowed exception - it must work before config has been loaded.
  const allowed = new Set([
    path.join("ai-monitor", "src", "config.js"),
    path.join("oracle-worker", "src", "config.js"),
    path.join("ai-monitor", "src", "lib", "logger.js"),
    path.join("oracle-worker", "src", "lib", "logger.js"),
  ]);

  const offenders = [];
  for (const file of sourceFiles()) {
    const rel = path.relative(REPO_ROOT, file);
    if (allowed.has(rel)) continue;
    // Comments discussing process.env are fine - only real reads count.
    if (/process\.env/.test(stripComments(fs.readFileSync(file, "utf8")))) offenders.push(rel);
  }

  assert.deepEqual(offenders, [], `These files read process.env directly:\n  ${offenders.join("\n  ")}`);
});
