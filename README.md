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

## Running the backend

Both backend services run with no API keys — `ai-monitor` falls back to fixture
mode, so the whole alert → proof pipeline is demoable immediately.

```bash
npm install                    # installs all workspaces

# Terminal 1 — proof worker (dry run until the contracts are deployed).
# SOURCE_CHAIN_TXN_HASH is the transaction the worker proves; without it the
# job stops at "no source transaction to prove". Any real Sepolia tx works.
ORACLE_DRY_RUN=true \
SOURCE_CHAIN_TXN_HASH=0x<any-sepolia-tx-hash> \
SOURCE_CHAIN_RPC_ETHEREUM_SEPOLIA=https://ethereum-sepolia-rpc.publicnode.com \
  npm run start:worker

# Terminal 2 — risk monitor, watching a fixture position that is already unhealthy
AI_MONITOR_WATCHLIST="11155111:0x3333333333333333333333333333333333333333" \
  npm run start:monitor
```

Within a second the monitor detects the position and posts an alert; the worker
then waits for the source block to be attested, builds a real Merkle +
continuity proof, and verifies it against the CC3 Block Prover precompile before
stopping at the submission step (there is no ASC deployed yet).

Watch it with `curl localhost:4002/jobs | jq` and `curl localhost:4001/metrics`.

```bash
npm run test:backend             # 60 tests across both services
npm run test:oracle-connection   # live check of the CC3 proof pipeline
```

See `ai-monitor/README.md`, `oracle-worker/README.md`, and `shared/interfaces.md`
for the API surface and the alert/proof wire contracts.

## Integration lead responsibilities (this repo's root-level concerns)

- Keep `shared/interfaces.md` and `.env.example` as the single source of truth — nobody should invent their own field names.
- CI (`.github/workflows/ci.yml`) runs on every push: backend tests, a live CC3 proof-pipeline check, and contract compilation. Extend it as each component's tests come online.
- Testnet config lives in `contracts/hardhat.config.js` — CC3 testnet + Sepolia.
  Note: Creditcoin's CC3 ChainInfo precompile currently attests only **Sepolia
  (chainKey 1)** and **Ethereum mainnet (chainKey 3)**. Solana is not an
  attested source chain, so no Attestcoin proof can be generated for it —
  positions there cannot be protected by this pipeline yet.

## Setup

1. Copy `.env.example` to `.env` in each component folder and fill in values (see `shared/interfaces.md` for what each var means).
2. Get testnet funds: tCTC via Creditcoin Discord faucet, Sepolia ETH via thirdweb/Alchemy faucet, SOL via Solana devnet faucet.
3. `cd contracts && npm install && npx hardhat compile` — confirm it compiles before anyone writes real logic.
4. Do a trivial deploy-and-call to CC3 testnet to confirm the RPC pipeline works end to end.
