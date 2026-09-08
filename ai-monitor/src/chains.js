"use strict";

/**
 * Source-chain registry.
 *
 * `chainId`  — the chain's own EVM id, what the frontend and users talk in.
 * `chainKey` — Creditcoin's internal id for an attested source chain, what the
 *              Block Prover precompile and the proof builder talk in.
 *
 * These are NOT the same number and are easy to mix up. The mapping below was
 * read off the live CC3 testnet ChainInfo precompile (0x…0fd3) and confirmed
 * against the proof builder's /api/v1/attested-height/{chainKey} endpoint:
 *
 *   chainKey 1 -> chainId 11155111 (Sepolia)   "Sepolia ethereum"
 *   chainKey 3 -> chainId 1        (Ethereum)  "Ethereum"
 *
 * oracle-worker re-reads this from the precompile at boot and will warn if the
 * live mapping has drifted from this table; treat the precompile as truth.
 */

const CHAINS = [
  {
    chainId: 11155111,
    chainKey: 1,
    name: "Sepolia",
    shortName: "sepolia",
    isTestnet: true,
    rpcEnvVar: "SOURCE_CHAIN_RPC_ETHEREUM_SEPOLIA",
    nativeSymbol: "ETH",
  },
  {
    chainId: 1,
    chainKey: 3,
    name: "Ethereum",
    shortName: "ethereum",
    isTestnet: false,
    rpcEnvVar: "SOURCE_CHAIN_RPC_ETHEREUM",
    nativeSymbol: "ETH",
  },
];

const BY_CHAIN_ID = new Map(CHAINS.map((c) => [c.chainId, c]));
const BY_CHAIN_KEY = new Map(CHAINS.map((c) => [c.chainKey, c]));

function getChainByChainId(chainId) {
  return BY_CHAIN_ID.get(Number(chainId)) || null;
}

function getChainByChainKey(chainKey) {
  return BY_CHAIN_KEY.get(Number(chainKey)) || null;
}

/** chainId -> chainKey, the translation oracle-worker needs before proving. */
function toChainKey(chainId) {
  const chain = getChainByChainId(chainId);
  if (!chain) {
    throw new Error(
      `Unsupported chainId ${chainId}. Attested source chains: ${CHAINS.map((c) => c.chainId).join(", ")}`,
    );
  }
  return chain.chainKey;
}

function isSupportedChainId(chainId) {
  return BY_CHAIN_ID.has(Number(chainId));
}

function listChains() {
  return CHAINS.map((c) => ({ ...c }));
}

module.exports = {
  CHAINS,
  getChainByChainId,
  getChainByChainKey,
  toChainKey,
  isSupportedChainId,
  listChains,
};
