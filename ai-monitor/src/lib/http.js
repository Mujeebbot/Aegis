"use strict";

/**
 * fetch with timeout, retry and exponential backoff + jitter.
 *
 * Every outbound call in this service (The Graph, CoinGecko, the oracle-worker
 * webhook) goes through here so retry behaviour is uniform and testable.
 * Node 24 ships global fetch/AbortSignal, so there is no HTTP dependency.
 */

const RETRIABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

class HttpError extends Error {
  constructor(message, { status, body, url } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.body = body;
    this.url = url;
    this.retriable = status === undefined || RETRIABLE_STATUS.has(status);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * @param {string} url
 * @param {object} [options]
 * @param {number} [options.timeoutMs=10000]
 * @param {number} [options.retries=2]   number of RETRIES (so 3 attempts total)
 * @param {number} [options.backoffMs=250]
 * @param {(attempt:number, err:Error)=>void} [options.onRetry]
 */
async function requestJson(url, options = {}) {
  const {
    timeoutMs = 10_000,
    retries = 2,
    backoffMs = 250,
    onRetry,
    ...fetchOptions
  } = options;

  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await attemptJson(url, fetchOptions, timeoutMs);
    } catch (err) {
      lastError = err;
      const retriable = !(err instanceof HttpError) || err.retriable;
      if (!retriable || attempt === retries) break;
      onRetry?.(attempt + 1, err);
      // Full jitter: backoff * 2^attempt, randomised to avoid thundering herds
      // when 50 watched positions all refresh on the same 30s tick.
      const ceiling = backoffMs * 2 ** attempt;
      await sleep(Math.random() * ceiling);
    }
  }
  throw lastError;
}

async function attemptJson(url, fetchOptions, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
    const text = await res.text();
    if (!res.ok) {
      throw new HttpError(`HTTP ${res.status} from ${url}`, {
        status: res.status,
        body: text.slice(0, 500),
        url,
      });
    }
    return text ? JSON.parse(text) : null;
  } catch (err) {
    if (err.name === "AbortError") {
      throw new HttpError(`Timed out after ${timeoutMs}ms: ${url}`, { url });
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { requestJson, HttpError, sleep, RETRIABLE_STATUS };
