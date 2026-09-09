# Oracle Worker (proof generation + submission)

Consumes risk alerts from `ai-monitor`, builds Merkle + continuity proofs with
`@gluwa/usc-sdk`, and submits them to `LiquidationShieldASC` on Creditcoin CC3.

```
alert -> resolve source tx -> wait for attestation -> build proof
      -> preflight verify (free) -> ABI-encode -> ASC.verifyPosition
```

## Verify the pipeline before trusting it

```bash
npm run test-connection --workspace=aegis-oracle-worker
```

Checks the CC3 RPC, the ChainInfo precompile, the chainKey table, the proof
builder service, and the Block Prover precompile. Set `SOURCE_CHAIN_TXN_HASH`
to a real source-chain transaction and it additionally builds a proof for it and
verifies it on-chain end to end. Non-zero exit on failure, so it works in CI.

Current output against live CC3 testnet:

```
[PASS] CC3 RPC reachable                  chainId 102031, head block 5452225
[PASS] ChainInfo precompile responds      chainKey 3 -> chainId 1, chainKey 1 -> chainId 11155111
[PASS] src/chains.js matches the precompile
[PASS] Proof builder reachable            chainKey 3 attested up to block 25932870
[PASS] Block Prover precompile callable   calculateTxIndex -> 1 (expected 1)
```

## Run it

```bash
npm start --workspace=aegis-oracle-worker
npm test  --workspace=aegis-oracle-worker
```

The test suite covers the submission path (simulate before sending, gas ceiling,
permanent vs retriable revert classification, `PositionProtected` decoding),
proof ABI encoding, the queue's de-duplication and retry semantics, source-tx
resolution precedence, the alert intake surface, and config validation. The
chain and the proof builder are faked; `npm run test-connection` is what
exercises them for real.

Submit one position by hand, without ai-monitor:

```bash
npm run submit --workspace=aegis-oracle-worker -- \
  --user 0xAbc... --chain 11155111 --tx 0xdef... --dry-run
```

`ORACLE_DRY_RUN=true` runs the entire pipeline — proof generation, on-chain
preflight verification, encoding — and stops before sending the transaction. It
is a genuine rehearsal, not a mock.

## Routes

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/alerts` | Alert intake. This is `ORACLE_WORKER_WEBHOOK_URL` |
| `GET` | `/jobs` | Recent jobs |
| `GET` | `/jobs/:jobId` | One job with its full step history |
| `GET` | `/healthz` `/readyz` `/metrics` | Operational |

`POST /alerts` returns `202` with a `jobId` as soon as the job is queued rather
than holding the connection — proof generation can take minutes, far longer than
ai-monitor's HTTP timeout.

## The proof encoding contract

This is the part to get right when the ASC contract is implemented.

The SDK returns proofs as **structs**; `ILiquidationShieldASC.verifyPosition`
declares them as **`bytes`**. So `src/proofs/encode.js` ABI-encodes each struct,
and the ASC must `abi.decode` them back into the same shapes before forwarding
to the Block Prover precompile:

```solidity
struct MerkleProofEntry { bytes32 hash; bool isLeft; }
struct MerkleProof      { bytes32 root; MerkleProofEntry[] siblings; }
struct ContinuityProof  { bytes32 lowerEndpointDigest; bytes32[] roots; }

(bytes32 root, MerkleProofEntry[] memory siblings) =
    abi.decode(merkleProof, (bytes32, MerkleProofEntry[]));
(bytes32 lowerEndpointDigest, bytes32[] memory roots) =
    abi.decode(continuityProof, (bytes32, bytes32[]));
```

The tuple type strings are transcribed from the precompile ABI shipped inside
the SDK (`dist/block-prover/block_prover.json`), not guessed, and every encode
is round-tripped through a decode before submission so a malformed proof fails
locally rather than on-chain.

**Block Prover precompile:** `0x0000000000000000000000000000000000000FD2`
**ChainInfo precompile:** `0x0000000000000000000000000000000000000FD3`

Note these are native runtime precompiles: `eth_getCode` returns `0x` for them
even though they are callable. Probe behaviour, not bytecode.

## Which transaction gets proved

Attestcoin proves that a *specific transaction* was included in a *specific
block*. Resolution order, most authoritative first:

1. `sourceTxHash` on the alert
2. the ai-monitor watchlist entry for that user/chain
3. `SOURCE_CHAIN_TXN_HASH` from env (demo fallback)

If none resolve, the job fails **permanently** — it is a configuration gap, not
a transient fault, and retrying cannot fix it.

## Why gas is not wasted

Two free checks run before any transaction is signed:

- **Risk re-check** against ai-monitor. Proof generation takes minutes; if the
  position recovered meanwhile, `Settlement.protectPosition` would revert with
  `"Position safe"` *after* the gas was spent. Disable with
  `ORACLE_RECHECK_BEFORE_SUBMIT=false`.
- **Preflight verification** via `PrecompileBlockProver.verifySingle`, an
  `eth_call` that answers "would this proof verify?" for free.

Then `staticCall` simulates the ASC call and decodes the revert reason, gas is
estimated and capped at `ORACLE_MAX_GAS_LIMIT`, and the signer balance is
checked against `ORACLE_MIN_BALANCE_WEI`.

## Queue semantics

Alert delivery is at-least-once; proof submission costs gas and is
irreversible. The queue is what makes the former safe:

- **De-duplication** by `alertId` for `ORACLE_DEDUPE_TTL_MS`. A redelivered
  alert returns the original job instead of submitting twice.
- **Per-position serialisation.** Two alerts for the same `user:chainId` never
  submit concurrently.
- **Retry only what is retriable.** Errors carry `retriable`; a `"Position
  safe"` revert, a malformed alert, or missing config are permanent and are
  never retried. Transient errors back off exponentially with jitter.

The queue is in-memory — jobs do not survive a restart. That is a deliberate
hackathon trade-off; the seam for Redis/BullMQ is the two Maps in `src/queue.js`.

## chainKey vs chainId

Not the same number, and easy to confuse:

| chainKey | chainId | Chain |
|---|---|---|
| 1 | 11155111 | Sepolia |
| 3 | 1 | Ethereum mainnet |

The pipeline refuses an alert whose `chainKey` contradicts its `chainId` —
proving against the wrong chain would attest someone else's transaction. The
mapping lives in `src/chains.js` and is cross-checked against the live
precompile at boot.

## Layout

```
src/
  index.js              composition root + startup checks
  config.js             env loading and validation
  chains.js             chainId <-> chainKey registry
  server.js             HTTP intake and job introspection
  queue.js              dedupe, concurrency, retry
  pipeline.js           the 7-step alert -> protection job
  chain/creditcoin.js   provider, signer, balance and chain checks
  chain/asc.js          ASC submission: simulate, estimate, send, parse events
  proofs/builder.js     @gluwa/usc-sdk proof generation + preflight verify
  proofs/encode.js      struct -> bytes ABI encoding (the contract boundary)
  sources/positionTx.js which transaction to prove; pre-submit risk re-check
scripts/
  testProofBuilderConnection.js   connectivity + end-to-end proof check
  submitProof.js                  manual single-position submission
abi/                              ASC + Settlement ABIs
```
