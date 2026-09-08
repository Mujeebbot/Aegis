# AI Risk Monitor (off-chain)

Watches cross-chain lending positions, computes health factors, and hands a
risk alert to `oracle-worker` when a position is heading for liquidation.

```
subgraphs + price feeds  ->  health factor  ->  risk model  ->  alert -> oracle-worker
                                                     |
                                              HTTP API -> frontend dashboard
```

## Run it

```bash
npm install                 # from the repo root
npm start --workspace=aegis-ai-monitor
```

With no API keys configured it starts in **fixture mode** and serves scripted
positions, so the whole alert pipeline is demoable immediately:

```bash
AI_MONITOR_WATCHLIST="11155111:0x3333333333333333333333333333333333333333" \
  npm start --workspace=aegis-ai-monitor
```

| Fixture address | Behaviour |
|---|---|
| `0x1111…1111` | Health factor decays from boot: SAFE → WATCH at ~1min → AT_RISK at ~2min → CRITICAL at ~2.5min |
| `0x2222…2222` | Comfortably healthy, never alerts |
| `0x3333…3333` | Already liquidatable — fires a CRITICAL alert on the first tick |
| `0x4444…4444` | Supply only, no debt — exercises the infinite-HF path |

For real data set `THE_GRAPH_API_KEY` and `THE_GRAPH_SUBGRAPH_IDS`
(`AI_MONITOR_DATA_MODE` then resolves to `live`).

```bash
npm test --workspace=aegis-ai-monitor
```

**Test coverage note:** the health-factor maths, risk model, price sources,
adapter normalisation and HTTP surface are all covered. What is *not* covered is
whether the GraphQL queries in `src/sources/*.js` match the live subgraph
schemas — that needs `THE_GRAPH_API_KEY`, since The Graph's hosted service is
shut down and the decentralised gateway is key-gated. The adapter tests feed
realistic responses and lock down the normalisation (decimal rescaling,
basis-point conversion, share-to-asset rounding, collateral eligibility); the
query shapes themselves are the one untested seam.

## The interface it owes the rest of the system

Per `shared/interfaces.md`, exposed over HTTP:

| Interface function | Route |
|---|---|
| `getPositionHealth(user, chainId) -> healthFactor` | `GET /positions/:user/:chainId` |
| `checkLiquidationRisk(user, chainId) -> (isAtRisk, threshold)` | `GET /risk/:user/:chainId` |

`GET /risk` hoists `isAtRisk` and `threshold` to the top level so callers never
have to dig for them:

```jsonc
{
  "isAtRisk": true,
  "threshold": 1.05,
  "healthFactor": 0.97,
  "healthFactorWad": "970588235294117647",
  "chainId": 11155111,
  "chainKey": 1,
  "risk": {
    "level": "CRITICAL",
    "riskScore": 1,
    "forecastHealthFactor": 0.97,
    "secondsToLiquidation": 0,
    "reason": "health factor below critical threshold; liquidation imminent"
  }
}
```

### All routes

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/positions/:user/:chainId` | Full health snapshot with per-protocol breakdown |
| `GET` | `/risk/:user/:chainId` | Risk assessment. `?threshold=1.03` overrides per call |
| `GET` | `/watchlist` | Positions under monitoring |
| `POST` | `/watchlist` | Start monitoring `{user, chainId, threshold?, sourceTxHash?}` |
| `DELETE` | `/watchlist/:user/:chainId` | Stop monitoring |
| `GET` | `/alerts` | Recently emitted alerts |
| `POST` | `/poll` | Force a poll tick (demo/debug) |
| `GET` | `/chains` | Supported chains and their chainKey mapping |
| `GET` | `/healthz` `/readyz` `/metrics` | Operational |

Reads are open; mutating routes require `AI_MONITOR_API_KEY` when it is set.

## How the risk model works

A plain threshold check (`HF < 1.05 -> alert`) fires **too late**. Proving a
position cross-chain takes time — attestation wait, proof build, submission —
so a position can be liquidated before protection lands. The model therefore
alerts on two conditions:

1. **Level** — HF is already under the threshold.
2. **Trajectory** — HF is falling fast enough to cross the threshold within
   `AI_MONITOR_FORECAST_HORIZON_SEC`, even though it is fine right now.

Trend comes from ordinary least squares over recent `(t, HF)` samples. A
trajectory alert additionally requires at least 3 samples and a genuinely
negative slope, so one noisy price tick cannot trigger a gas-spending
submission.

| Band | Meaning |
|---|---|
| `SAFE` | Above threshold, not trending into it |
| `WATCH` | Above threshold but projected to breach it |
| `AT_RISK` | Below `AI_MONITOR_DEFAULT_THRESHOLD` |
| `CRITICAL` | Below `AI_MONITOR_CRITICAL_THRESHOLD` — liquidation imminent |

**Plugging in a real ML model:** `evaluateRisk` accepts a `predictor` with
`predict({history, healthFactorWad, trend, forecastHorizonSec})` returning
`{forecastHealthFactorWad, confidence, source}`. Pass it via
`buildApp({ predictor })` in `src/index.js`. A predictor that throws is caught
and the linear trend is used instead, so a flaky model server cannot take the
monitor down.

## Health factor

```
HF = Σ(collateral × price × liquidationThreshold) / Σ(debt × price)
```

The Aave v3 definition; Compound and Morpho are normalised onto it by mapping
`liquidateCollateralFactor` / `lltv` to `liquidationThreshold`.

Two details worth knowing:

- **Risk is judged on the weakest market, not the aggregate.** Liquidation
  happens per protocol, so a healthy blended HF can hide one doomed market.
  Alerts use `weakest`; the dashboard shows both.
- **Prices come from one oracle for all protocols** — Chainlink first (it is
  what the lending protocols themselves use, so our HF matches theirs), then
  CoinGecko, then last-known-good, then par for stablecoins.

## Units

Everything crossing a JSON boundary carries both forms:

| Field | Type | Use |
|---|---|---|
| `healthFactor` | number, e.g. `1.03` | display |
| `healthFactorWad` | decimal string, 1e18 | anything heading for a `uint256` |

All internal maths is BigInt. `healthFactor` is `null` when a position has no
debt (infinite HF) — `Infinity` is not valid JSON.

## Guardrails

- **Threshold ceiling.** `POST /watchlist` rejects a threshold above
  `AI_MONITOR_DEFAULT_THRESHOLD`, because `Settlement.protectPosition` requires
  `healthFactor < SAFE_THRESHOLD` and would revert.
- **Degraded snapshots do not alert.** If a subgraph failed or a debt leg could
  not be priced, HF is unreliable — alerts are suppressed unless CRITICAL.
- **Cooldown.** One incident does not re-alert every 30s
  (`AI_MONITOR_ALERT_COOLDOWN_MS`); an escalation in band always breaks through.
- **Non-overlapping ticks.** A slow tick delays the next rather than stacking.
- **Isolated failures.** One dead subgraph or unpriceable token does not stop
  the other watched positions being evaluated.

## Layout

```
src/
  index.js          composition root: wires everything, starts API + poller
  config.js         env loading and validation (the only place reading process.env)
  chains.js         chainId <-> chainKey registry (verified against the precompile)
  poller.js         the 30s loop
  watchlist.js      which positions are monitored
  alerts.js         alert payload + dispatch to oracle-worker
  api/server.js     HTTP routes
  core/health.js    health factor maths
  core/risk.js      risk model and forecasting
  core/positions.js orchestration; getPositionHealth / checkLiquidationRisk
  sources/          The Graph client + Aave / Compound / Morpho adapters, fixtures
  prices/           Chainlink + CoinGecko with caching and fallback
  lib/              units, logger, http retry, TTL cache
```
