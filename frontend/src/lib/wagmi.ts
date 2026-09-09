import { http, createConfig } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'
import { creditcoinCC3Testnet } from './chains'

// ─── Wagmi + RainbowKit Config ────────────────────────────────────────────────
// Configured for Aegis supported chains.
// CC3 testnet is the settlement layer; Sepolia is the source chain.
// ─────────────────────────────────────────────────────────────────────────────

export const wagmiConfig = getDefaultConfig({
  appName: 'Aegis DeFi Protection',
  projectId: import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID ?? 'aegis-demo',
  chains: [sepolia, mainnet, creditcoinCC3Testnet],
  transports: {
    [sepolia.id]:              http(import.meta.env.VITE_RPC_ETHEREUM_SEPOLIA ?? 'https://ethereum-sepolia-rpc.publicnode.com'),
    [mainnet.id]:              http(),
    [creditcoinCC3Testnet.id]: http(import.meta.env.VITE_CREDITCOIN_RPC_URL ?? 'https://rpc.cc3-testnet.creditcoin.network'),
  },
  ssr: false,
})
