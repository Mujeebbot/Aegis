"use strict";

/**
 * The Graph gateway client.
 *
 * Subgraph deployment ids are configuration, not code: markets get redeployed
 * and ids rotate, and the decentralised gateway needs an API key per query.
 * Adapters ask for a subgraph by logical name (`aave-v3:11155111`) and this
 * module resolves it to a URL.
 */

const { requestJson } = require("../lib/http");

class GraphClient {
  /**
   * @param {object} deps
   * @param {object} deps.config config.graph
   * @param {object} deps.logger
   * @param {Function} [deps.fetchJson]
   */
  constructor({ config, logger, fetchJson = requestJson }) {
    this.config = config;
    this.logger = logger.child({ module: "graph" });
    this.fetchJson = fetchJson;
  }

  /** Is a subgraph configured for this protocol/chain pair? */
  has(protocol, chainId) {
    return Boolean(this.config.subgraphs[`${protocol}:${chainId}`]);
  }

  endpointFor(protocol, chainId) {
    const key = `${protocol}:${chainId}`;
    const id = this.config.subgraphs[key];
    if (!id) {
      throw new Error(
        `No subgraph configured for ${key}. Set THE_GRAPH_SUBGRAPH_IDS="${key}=<deployment-id>".`,
      );
    }
    // A full URL in the config wins, so self-hosted//studio endpoints work too.
    if (/^https?:\/\//.test(id)) return id;
    if (!this.config.apiKey) {
      throw new Error(`THE_GRAPH_API_KEY is required to query gateway subgraph ${key}`);
    }
    return `${this.config.gatewayUrl.replace(/\/$/, "")}/${this.config.apiKey}/subgraphs/id/${id}`;
  }

  /**
   * Execute a GraphQL query.
   * @param {string} protocol
   * @param {number} chainId
   * @param {string} query
   * @param {object} [variables]
   */
  async query(protocol, chainId, query, variables = {}) {
    const endpoint = this.endpointFor(protocol, chainId);
    const started = Date.now();

    const body = await this.fetchJson(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
      timeoutMs: this.config.timeoutMs,
      retries: 2,
      onRetry: (attempt, err) =>
        this.logger.debug("subgraph retry", { protocol, chainId, attempt, error: err.message }),
    });

    // GraphQL reports failures inside a 200 response, so this has to be checked
    // explicitly - requestJson only sees a successful HTTP status.
    if (body?.errors?.length) {
      const message = body.errors.map((e) => e.message).join("; ");
      throw new Error(`Subgraph ${protocol}:${chainId} returned errors: ${message}`);
    }

    this.logger.debug("subgraph query ok", {
      protocol,
      chainId,
      durationMs: Date.now() - started,
    });
    return body?.data ?? {};
  }
}

module.exports = { GraphClient };
