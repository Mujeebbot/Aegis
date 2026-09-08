"use strict";

/**
 * TTL cache with single-flight de-duplication.
 *
 * The poller fans out across every watched position on the same tick, and most
 * of them want the same handful of token prices. Without single-flight we would
 * fire N identical CoinGecko calls and get rate limited; `getOrLoad` collapses
 * concurrent misses for the same key into one in-flight promise.
 */

class TtlCache {
  constructor({ ttlMs = 30_000, maxEntries = 1000, clock = Date.now } = {}) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
    this.clock = clock;
    this.entries = new Map();
    this.inFlight = new Map();
  }

  get(key) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= this.clock()) {
      this.entries.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key, value, ttlMs = this.ttlMs) {
    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      // Map preserves insertion order, so the first key is the oldest write.
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expiresAt: this.clock() + ttlMs });
    return value;
  }

  /** Cached read-through. Concurrent misses share one loader invocation. */
  async getOrLoad(key, loader, ttlMs = this.ttlMs) {
    const cached = this.get(key);
    if (cached !== undefined) return cached;

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const promise = (async () => {
      try {
        const value = await loader();
        this.set(key, value, ttlMs);
        return value;
      } finally {
        this.inFlight.delete(key);
      }
    })();
    this.inFlight.set(key, promise);
    return promise;
  }

  delete(key) {
    this.entries.delete(key);
  }

  clear() {
    this.entries.clear();
    this.inFlight.clear();
  }

  get size() {
    return this.entries.size;
  }
}

module.exports = { TtlCache };
