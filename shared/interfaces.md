# Shared Interfaces & Env Schema

Single source of truth. If you need a new field or function signature, add it here first, then implement — don't invent divergent versions in your own component.

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

**IAiMonitor** (off-chain, exposed as an API from `ai-monitor/`, not a contract)
- `getPositionHealth(address user, uint256 chainId) → uint256 healthFactor`
- `checkLiquidationRisk(address user, uint256 chainId) → (bool isAtRisk, uint256 threshold)`
- Called by: `oracle-worker` (to decide when to generate a proof), `frontend` (dashboard display)

## Env vars

See `.env.example` at repo root. Every component reads from its own `.env` (copied from the root example) — don't hardcode RPC URLs or addresses in code.

## Data flow contract (what each handoff looks like)

1. `ai-monitor` → `oracle-worker`: risk alert payload `{ user, chainId, healthFactor, isAtRisk }`
2. `oracle-worker` → `contracts.ASC`: `verifyPosition(...)` call with generated proofs
3. `contracts.ASC` → `contracts.Settlement`: `protectPosition(...)` internal call
4. `contracts.Settlement` → chain: emits `PositionProtected(user, healthFactor, action)` event
5. `frontend` listens for `PositionProtected` events (via wagmi) to update History screen

## Protection modes (enum — keep consistent everywhere)

```
enum ProtectionMode { StopLoss, TakeProfit, LeverageRebalance }
enum ProtectionAction { None, StopLoss, Rebalance, Close }
```
