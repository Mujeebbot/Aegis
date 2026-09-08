# Aegis — AI-Powered Cross-Chain DeFi Liquidation Protection

Built for BUIDL CTC 2026 Fall Hackathon (DeFi + AI track).
Powered by Creditcoin's Attestcoin Protocol.

## How the pieces connect

```
Cross-Chain Position → AI Risk Monitor → Attestcoin Verify → Auto-Execute Protection
```

```
ai-monitor/  →  oracle-worker/  →  contracts/ASC  →  contracts/Settlement  →  frontend/
(off-chain)     (proof gen)        (verify)           (execute)              (UI)
```

| Folder | Owns | Talks to |
|---|---|---|
| `contracts/` | ASC + Settlement contracts, deployed on Creditcoin CC3 testnet | Called by `oracle-worker`; calls itself (ASC → Settlement) |
| `ai-monitor/` | Polls position health via The Graph subgraphs every 30s | Emits risk alerts consumed by `oracle-worker` |
| `oracle-worker/` | Generates Merkle + continuity proofs via `@gluwa/usc-sdk`, submits to ASC | Reads from `ai-monitor`, writes to `contracts` |
| `frontend/` | Dashboard, protection setup, history, settings | Reads from `contracts` via wagmi, reads position data via The Graph |
| `shared/` | Contract interfaces + env schema every component builds against | Referenced by all of the above |

## Integration lead responsibilities (this repo's root-level concerns)

- Keep `shared/interfaces.md` and `.env.example` as the single source of truth — nobody should invent their own field names.
- CI (`.github/workflows/ci.yml`) runs on every push: lint + contract tests. Extend it as each component's tests come online.
- Testnet config lives in `contracts/hardhat.config.js` — CC3 testnet + Sepolia + Solana Devnet as source chains.

## Setup

1. Copy `.env.example` to `.env` in each component folder and fill in values (see `shared/interfaces.md` for what each var means).
2. Get testnet funds: tCTC via Creditcoin Discord faucet, Sepolia ETH via thirdweb/Alchemy faucet, SOL via Solana devnet faucet.
3. `cd contracts && npm install && npx hardhat compile` — confirm it compiles before anyone writes real logic.
4. Do a trivial deploy-and-call to CC3 testnet to confirm the RPC pipeline works end to end.
