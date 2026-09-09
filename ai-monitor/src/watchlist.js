"use strict";

/**
 * Registry of positions under active monitoring.
 *
 * Entries arrive from three places:
 *   - AI_MONITOR_WATCHLIST env seed (the brief's "one hardcoded test position")
 *   - POST /watchlist from the frontend when a user enables protection
 *   - the PositionProtected / setProtectionMode flow, once wired
 *
 * Storage is in-memory with an optional JSON file for durability across
 * restarts. That is the right trade for a hackathon: no database to stand up,
 * but a demo survives a process restart. Swap `persistence` for a real store
 * behind the same interface if this outlives the hackathon.
 */

const fs = require("node:fs");
const path = require("node:path");

const { parseUnits, wadToNumber } = require("./lib/units");
const { isSupportedChainId } = require("./chains");

class Watchlist {
  /**
   * @param {object} deps
   * @param {object} deps.logger
   * @param {object} deps.config
   * @param {string} [deps.filePath] JSON file for persistence; null disables
   */
  constructor({ logger, config, filePath }) {
    this.logger = logger.child({ module: "watchlist" });
    this.config = config;
    this.filePath =
      filePath === null
        ? null
        : filePath || path.resolve(__dirname, "..", "data", "watchlist.json");
    /** key -> entry */
    this.entries = new Map();
  }

  static key(user, chainId) {
    return `${String(user).toLowerCase()}:${Number(chainId)}`;
  }

  /** Load persisted entries, then apply the env seed on top. */
  init() {
    this.loadFromDisk();
    this.seedFromConfig();
    this.logger.info("watchlist ready", { entries: this.entries.size });
    return this;
  }

  loadFromDisk() {
    if (!this.filePath) return;
    try {
      if (!fs.existsSync(this.filePath)) return;
      const raw = JSON.parse(fs.readFileSync(this.filePath, "utf8"));
      for (const item of raw.entries ?? []) {
        const entry = {
          ...item,
          thresholdWad: BigInt(item.thresholdWad ?? this.config.risk.defaultThresholdWad),
        };
        this.entries.set(Watchlist.key(entry.user, entry.chainId), entry);
      }
      this.logger.info("watchlist restored from disk", { count: this.entries.size });
    } catch (err) {
      // A corrupt file must not stop the monitor from booting.
      this.logger.warn("could not restore watchlist; starting empty", { error: err.message });
    }
  }

  saveToDisk() {
    if (!this.filePath) return;
    try {
      fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
      const payload = {
        savedAt: new Date().toISOString(),
        entries: [...this.entries.values()].map((e) => ({
          ...e,
          thresholdWad: e.thresholdWad.toString(),
        })),
      };
      fs.writeFileSync(this.filePath, JSON.stringify(payload, null, 2));
    } catch (err) {
      this.logger.warn("could not persist watchlist", { error: err.message });
    }
  }

  /** Parse "chainId:address[:protocol]" seeds from config. */
  seedFromConfig() {
    for (const raw of this.config.watchlist) {
      const [chainIdRaw, address, protocol] = raw.split(":");
      const chainId = Number(chainIdRaw);
      if (!address || !isSupportedChainId(chainId)) {
        this.logger.warn("skipping malformed AI_MONITOR_WATCHLIST entry", { entry: raw });
        continue;
      }
      try {
        this.add({ user: address, chainId, protocol, source: "env" });
      } catch (err) {
        this.logger.warn("skipping invalid AI_MONITOR_WATCHLIST entry", {
          entry: raw,
          error: err.message,
        });
      }
    }
  }

  /**
   * @param {object} input
   * @param {string} input.user
   * @param {number} input.chainId
   * @param {number|string} [input.threshold] human health factor, e.g. 1.08
   * @param {string} [input.protocol]
   * @param {string} [input.sourceTxHash] the tx oracle-worker should prove
   * @param {string} [input.source]
   */
  add(input) {
    const user = String(input.user || "").toLowerCase();
    const chainId = Number(input.chainId);

    if (!/^0x[0-9a-fA-F]{40}$/.test(user)) {
      throw Object.assign(new Error(`Invalid EVM address: ${input.user}`), { statusCode: 400 });
    }
    if (!isSupportedChainId(chainId)) {
      throw Object.assign(new Error(`Unsupported chainId ${input.chainId}`), { statusCode: 400 });
    }

    const thresholdWad =
      input.threshold === undefined || input.threshold === null || input.threshold === ""
        ? this.config.risk.defaultThresholdWad
        : parseUnits(String(input.threshold));

    // Alerting above the contract's SAFE_THRESHOLD guarantees a revert in
    // Settlement.protectPosition, so reject it at the edge with a clear message
    // instead of burning gas discovering it on-chain.
    if (thresholdWad > this.config.risk.defaultThresholdWad) {
      throw Object.assign(
        new Error(
          `threshold ${wadToNumber(thresholdWad)} exceeds the protocol maximum ` +
            `${wadToNumber(this.config.risk.defaultThresholdWad)}; ` +
            "Settlement.protectPosition rejects positions at or above SAFE_THRESHOLD",
        ),
        { statusCode: 400 },
      );
    }

    const key = Watchlist.key(user, chainId);
    const existing = this.entries.get(key);
    const entry = {
      user,
      chainId,
      thresholdWad,
      protocol: input.protocol || existing?.protocol,
      sourceTxHash: input.sourceTxHash || existing?.sourceTxHash,
      source: input.source || existing?.source || "api",
      addedAt: existing?.addedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastAlertAt: existing?.lastAlertAt ?? null,
      lastRiskLevel: existing?.lastRiskLevel ?? null,
    };

    this.entries.set(key, entry);
    this.saveToDisk();
    this.logger.info("watchlist entry upserted", {
      user,
      chainId,
      threshold: wadToNumber(thresholdWad),
      source: entry.source,
    });
    return entry;
  }

  get(user, chainId) {
    return this.entries.get(Watchlist.key(user, chainId)) ?? null;
  }

  remove(user, chainId) {
    const key = Watchlist.key(user, chainId);
    const existed = this.entries.delete(key);
    if (existed) {
      this.saveToDisk();
      this.logger.info("watchlist entry removed", { user, chainId });
    }
    return existed;
  }

  list() {
    return [...this.entries.values()];
  }

  get size() {
    return this.entries.size;
  }

  /** Record that an alert fired, for cooldown bookkeeping. */
  markAlerted(user, chainId, riskLevel) {
    const entry = this.get(user, chainId);
    if (!entry) return;
    entry.lastAlertAt = Date.now();
    entry.lastRiskLevel = riskLevel;
    this.saveToDisk();
  }

  /**
   * Cooldown gate. Re-alerting the same position every 30s would spam the
   * oracle-worker with duplicate proof requests for one incident. An escalation
   * in severity always passes, because a CRITICAL position deserves a fresh
   * attempt even mid-cooldown.
   */
  shouldAlert(user, chainId, riskLevel, now = Date.now()) {
    const entry = this.get(user, chainId);
    if (!entry || !entry.lastAlertAt) return true;
    if (entry.lastRiskLevel && riskLevel !== entry.lastRiskLevel) return true;
    return now - entry.lastAlertAt >= this.config.risk.alertCooldownMs;
  }

  serialize(entry) {
    return {
      user: entry.user,
      chainId: entry.chainId,
      threshold: wadToNumber(entry.thresholdWad),
      thresholdWad: entry.thresholdWad.toString(),
      protocol: entry.protocol ?? null,
      sourceTxHash: entry.sourceTxHash ?? null,
      source: entry.source,
      addedAt: entry.addedAt,
      updatedAt: entry.updatedAt,
      lastAlertAt: entry.lastAlertAt ? new Date(entry.lastAlertAt).toISOString() : null,
      lastRiskLevel: entry.lastRiskLevel,
    };
  }
}

module.exports = { Watchlist };
