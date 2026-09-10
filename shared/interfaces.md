# Shared Interfaces & Env Schema

Single source of truth. If you need a new field or function signature, add it
here first, then implement — don't invent divergent versions in your own
component.

## Deployed addresses (Creditcoin CC3 testnet)

Redeployed 2026-09-10 with real (non-stub) contract logic:

- `SETTLEMENT_CONTRACT_ADDRESS`: `0x982801936870B5f5A8C542991C3B7B4778F69A44`
- `ASC_CONTRACT_ADDRESS`: `0xdb516C062E85408515eE359A18582703C35DBc52`

**What's real now:** `Settlement.setProtectionMode` stores per-user mode/threshold
with real access control (only the position owner can set their own mode);
`Settlement.protectPosition` routes to a real action based on the stored mode
(`onlyASC`-gated); `ASC.verifyPosition` calls the real Block Prover Precompile
(`0x0FD2`) with the correct struct-typed signature (see `IBlockProver.sol`,
sourced from the usc-sdk package's own ABI — the earlier draft's raw
`staticcall` with a hand-guessed `bytes`-only signature would have reverted on
every call) and has replay protection.

**What's still blocked:** `ASC.decodePositionData()` always reverts —
extracting `healthFactor`/`collateral`/`debt` from `encodedTx` depends on an
unresolved design decision (which source-chain event actually carries live
position health, vs. today's `positionTx.js` which only proves the position's
original deposit/borrow tx exists). Needs a decision with the backend engineer
before it can be implemented. Actual repay/rebalance/close calls into a
lending protocol are separate, not-yet-started work after that.

**Deploy ordering note:** `Settlement`'s constructor takes a placeholder ASC
address (it has to be deployed before `ASC` exists, since `ASC`'s constructor
needs `Settlement`'s address) — `scripts/deploy.js` now calls
`Settlement.setAsc(realAscAddress)` right after deploying `ASC` to fix this up.
`setAsc` is deployer-only and can run exactly once (`ascLocked`). A prior
deploy (`0x78ed...`/`0xc70f...`, now abandoned) shipped without this fixup, so
`Settlement.asc()` pointed at the deployer's own address forever — every real
`ASC → Settlement.protectPosition` call would have reverted with "Only ASC".

Redeploy and update both this file and every `.env` when more real logic
lands. Frontend reads these via the `VITE_`-prefixed copies in `.env.example`
(Vite only exposes prefixed vars to client code) — keep both pairs in sync.

## Contract interfaces (Solidity)

See `contracts/contracts/interfaces/` for the canonical `.sol` files. Summary:

**ILiquidationShieldASC** (Attestcoin Smart Contract)
- `verifyPosition(uint64 chainKey, uint64 blockHeight, bytes encodedTx, bytes merkleProof, bytes continuityProof, address user) → bool`
- Called by: `oracle-worker`
- Calls: `ILiquidationShieldSettlement.protectPosition`

**ILiquidationShieldSettlement**
- `protectPosition(address user, uint256 healthFactor, uint256 collateral, uint256 debt)` — onlyASC
- `setProtectionMode(address user, ProtectionMode mode, uint256 threshold)` — called by frontend via user's wallet
- Called by: `contracts` ASC, `frontend` (for setup)

**IAiMonitor** (off-chain, exposed as an HTTP API from `ai-monitor/`, not a contract)
- `getPositionHealth(address user, uint256 chainId) → uint256 healthFactor`
- `checkLiquidationRisk(address user, uint256 chainId) → (bool isAtRisk, uint256 threshold)`
- Called by: `oracle-worker` (to decide when to generate a proof), `frontend` (dashboard display)

## chainKey vs chainId — read this before wiring anything

These are **different numbers** and mixing them up produces proofs against the
wrong chain.

- `chainId` — the chain's own EVM id. What users, wallets and the frontend use.
- `chainKey` — Creditcoin's internal id for an attested source chain. What the
  Block Prover precompile and the proof builder use.

Verified against the live CC3 ChainInfo precompile
(`0x0000000000000000000000000000000000000FD3`):

| chainKey | chainId | Chain |
|---|---|---|
| 1 | 11155111 | Sepolia |
| 3 | 1 | Ethereum mainnet |

The mapping lives in `ai-monitor/src/chains.js` (mirrored in `oracle-worker`).
`npm run test:oracle-connection` fails if that table drifts from the precompile.
**Treat the precompile as truth**, not the table.

## Units — WAD everywhere that touches the chain

| Form | Type | Where |
|---|---|---|
| `healthFactor` | number, `1.03` | display, JSON convenience |
| `healthFactorWad` | decimal string, 1e18 fixed point | anything destined for a `uint256` |

Every backend JSON payload carries **both**. All internal maths is BigInt; never
do fixed-point arithmetic in floats. `healthFactor` is `null` when a position has
no debt (infinite HF) — `Infinity` is not valid JSON.

The Settlement contract's `SAFE_THRESHOLD = 1.05e18` is in these same units.

## Data flow contract (what each handoff looks like)

1. `ai-monitor` → `oracle-worker`: risk alert payload (see below)
2. `oracle-worker` → `contracts.ASC`: `verifyPosition(...)` call with generated proofs
3. `contracts.ASC` → `contracts.Settlement`: `protectPosition(...)` internal call
4. `contracts.Settlement` → chain: emits `PositionProtected(user, healthFactor, action)` event
5. `frontend` listens for `PositionProtected` events (via wagmi) to update History screen

### 1. The risk alert payload

`POST` to `ORACLE_WORKER_WEBHOOK_URL` (default `http://127.0.0.1:4002/alerts`),
bearer-authenticated with `ORACLE_WORKER_API_KEY` when set.

The first four fields are **guaranteed**; everything after them is additive
context so the worker does not re-derive work the monitor already did.

```jsonc
{
  "user": "0x3333333333333333333333333333333333333333",
  "chainId": 11155111,
  "healthFactor": 0.97,
  "isAtRisk": true,

  "alertId": "alert_b443e41de45d76c0751ab09e15322e51",
  "healthFactorWad": "970588235294117647",
  "chainKey": 1,
  "observedAt": "2026-09-08T13:26:46.757Z",
  "emittedAt": "2026-09-08T13:26:46.884Z",
  "degraded": false,
  "protocol": "aave-v3",
  "sourceTxHash": "0x1d31...12d",        // which tx to prove; present whenever
                                        // the watchlist entry records one
  "risk": {
    "level": "CRITICAL",                  // SAFE | WATCH | AT_RISK | CRITICAL
    "riskScore": 1,
    "reason": "health factor below critical threshold; liquidation imminent",
    "threshold": 1.05,
    "forecastHealthFactor": 0.97,
    "secondsToLiquidation": 0,
    "confidence": 0.75
  }
}
```

Response: `202 {"accepted": true, "jobId": "job_...", "duplicate": false}`.

`sourceTxHash` is the transaction oracle-worker will prove. ai-monitor includes
it whenever the watchlist entry has one, so the worker takes its most
authoritative resolution path. When it is absent the worker falls back to
querying `/watchlist` and then to `SOURCE_CHAIN_TXN_HASH` — and that last
fallback proves a transaction unrelated to the user, so record a `sourceTxHash`
on the watchlist entry for any position you actually intend to protect.

**Delivery is at-least-once.** `alertId` is derived from
`(user, chainId, riskLevel, observedAt)`, so a redelivered alert has the same id
and the worker de-duplicates it. A new observation or an escalation in risk band
produces a new id and is processed.

### 2. Proof encoding — the oracle-worker ↔ ASC boundary

`@gluwa/usc-sdk` returns proofs as **structs**, but `verifyPosition` declares
them as **`bytes`**. `oracle-worker` ABI-encodes them; the ASC must decode into
exactly these shapes before calling the Block Prover precompile:

```solidity
struct MerkleProofEntry { bytes32 hash; bool isLeft; }
struct MerkleProof      { bytes32 root; MerkleProofEntry[] siblings; }
struct ContinuityProof  { bytes32 lowerEndpointDigest; bytes32[] roots; }

(bytes32 root, MerkleProofEntry[] memory siblings) =
    abi.decode(merkleProof, (bytes32, MerkleProofEntry[]));
(bytes32 lowerEndpointDigest, bytes32[] memory roots) =
    abi.decode(continuityProof, (bytes32, bytes32[]));
```

`encodedTx` is passed through verbatim as the SDK's `txBytes` — do not re-encode
it.

Precompiles (native runtime code — `eth_getCode` returns `0x`, probe behaviour
instead):

| Precompile | Address |
|---|---|
| Block Prover | `0x0000000000000000000000000000000000000FD2` |
| ChainInfo | `0x0000000000000000000000000000000000000FD3` |

## ai-monitor HTTP API (IAiMonitor)

Base URL `AI_MONITOR_BASE_URL` (default `http://127.0.0.1:4001`).

| Method | Route | Interface function |
|---|---|---|
| `GET` | `/positions/:user/:chainId` | `getPositionHealth` |
| `GET` | `/risk/:user/:chainId` | `checkLiquidationRisk` |
| `GET` | `/watchlist` | — |
| `POST` | `/watchlist` | `{user, chainId, threshold?, protocol?, sourceTxHash?}` |
| `DELETE` | `/watchlist/:user/:chainId` | — |
| `GET` | `/alerts` | recently emitted alerts |
| `POST` | `/poll` | force a poll tick |
| `GET` | `/chains` | chainId ↔ chainKey mapping |
| `GET` | `/healthz` `/readyz` `/metrics` | operational |

`GET /risk` hoists the two interface values to the top level:

```jsonc
{ "isAtRisk": true, "threshold": 1.05, "healthFactor": 0.97, "risk": { ... } }
```

Add `?fresh=1` to bypass the 10s snapshot cache, `?threshold=1.03` to override
the threshold for one call.

**Frontend note:** `/positions/:user/:chainId` returns the per-protocol
breakdown (`byProtocol`), the collateral/debt legs with prices, and
`weakestProtocol`. Risk is judged on the *weakest* market, not the aggregate —
liquidation happens per protocol, so a healthy blended HF can hide one doomed
market.

## oracle-worker HTTP API

Base URL default `http://127.0.0.1:4002`.

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/alerts` | Alert intake |
| `GET` | `/jobs` | Recent jobs |
| `GET` | `/jobs/:jobId` | One job with full step history |
| `GET` | `/healthz` `/readyz` `/metrics` | Operational |

## Protection modes (enum — keep consistent everywhere)

```
enum ProtectionMode { StopLoss, TakeProfit, LeverageRebalance }
enum ProtectionAction { None, StopLoss, Rebalance, Close }
```

`oracle-worker` decodes `ProtectionAction` from the `PositionProtected` event
using this ordering, and reports it as a string (`"StopLoss"`) on the job
result. If the enum changes, update `oracle-worker/src/chain/asc.js`.

## Threshold ceiling

`Settlement.protectPosition` requires `healthFactor < SAFE_THRESHOLD` (1.05e18).
Alerting above that line would produce guaranteed-to-revert submissions, so
`ai-monitor` rejects any watchlist threshold above
`AI_MONITOR_DEFAULT_THRESHOLD`. **If the contract's `SAFE_THRESHOLD` changes,
change `AI_MONITOR_DEFAULT_THRESHOLD` to match.**

## Env vars

See `.env.example` at the repo root — it documents every variable both backend
services read, grouped by component. Each service reads the root `.env` first,
then its own folder `.env`, which overrides it.
