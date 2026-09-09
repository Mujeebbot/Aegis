import { defineChain } from 'viem'

// ─── Creditcoin CC3 Testnet ───────────────────────────────────────────────────
// This is the settlement and coordination layer for Aegis.
// Chain ID: 102031
// Source: Aegis project documentation
// ─────────────────────────────────────────────────────────────────────────────

export const creditcoinCC3Testnet = defineChain({
  id: 102031,
  name: 'Creditcoin CC3 Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'tCTC',
    symbol: 'tCTC',
  },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_CREDITCOIN_RPC_URL ?? 'https://rpc.cc3-testnet.creditcoin.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Creditcoin Explorer',
      url: 'https://explorer.cc3-testnet.creditcoin.network',
    },
  },
  testnet: true,
})

// ─── Chain Metadata for UI ────────────────────────────────────────────────────

export const CHAIN_META: Record<number, {
  name: string
  shortName: string
  color: string
  isSource: boolean
  isSettlement: boolean
}> = {
  11155111: {
    name: 'Ethereum Sepolia',
    shortName: 'ETH',
    color: '#a8e063',
    isSource: true,
    isSettlement: false,
  },
  1: {
    name: 'Ethereum',
    shortName: 'ETH',
    color: '#a8e063',
    isSource: true,
    isSettlement: false,
  },
  102031: {
    name: 'Creditcoin CC3',
    shortName: 'CTC',
    color: '#5be4c8',
    isSource: false,
    isSettlement: true,
  },
}

// NOTE: Solana is shown in the UI as a conceptual future chain.
// The CC3 testnet ChainInfo precompile currently attests only Sepolia (chainKey 1)
// and Ethereum mainnet (chainKey 3). Solana is not an attested source chain.
export const CONCEPTUAL_CHAINS = [
  { name: 'Solana', shortName: 'SOL', note: 'Planned — not yet attested by CC3' },
]
