# AI Risk Monitor (off-chain)

Owner: AI/ML Engineer

## Responsibility
Continuously monitor user positions across chains/protocols, detect when
health factor drops below a safe threshold, and hand off a risk alert to
`oracle-worker`.

## Data sources (per project doc)
- The Graph subgraphs for Aave, Compound, Morpho
- CoinGecko / Chainlink price feeds
- User position health factors (HF) and collateral/debt ratios

## Interface this component must expose (see /shared/interfaces.md)
```
getPositionHealth(user, chainId) → healthFactor
checkLiquidationRisk(user, chainId) → (isAtRisk, threshold)
```

## Output contract to oracle-worker
```json
{ "user": "0x...", "chainId": 1, "healthFactor": 1.03, "isAtRisk": true }
```

## First integration milestone
Poll one hardcoded test position on Sepolia every 30s and log the health
factor — before wiring in real risk prediction.
