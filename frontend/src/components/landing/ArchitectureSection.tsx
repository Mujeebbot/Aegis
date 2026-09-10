import React from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'
import { ExplodedArchitecture3D, ARCH_LAYERS } from '../visualizations/ExplodedArchitecture3D'

// ─── ArchitectureSection ──────────────────────────────────────────────────────
// Luxury dark-green architecture section featuring interactive 3D Exploded Stack
// ─────────────────────────────────────────────────────────────────────────────

interface LayerDetail {
  id: string
  name: string
  layerTag: string
  color: string
  description: string
  codeSnippet?: string
  specs: { key: string; value: string }[]
  technologies: string[]
}

const LAYER_DETAILS: Record<string, LayerDetail> = {
  'ai-monitor': {
    id: 'ai-monitor',
    name: 'AI Risk Monitor',
    layerTag: 'OFF-CHAIN TELEMETRY LAYER',
    color: '#a8e063',
    description:
      'Continuous off-chain inference engine running at 30-second cadence. Ingests position health factor, collateral ratios, and debt indices via The Graph and Chainlink price oracles. Evaluates health trajectories and fires cryptographic risk triggers.',
    codeSnippet: `// 30s Polling Loop & Risk Detection
const healthFactor = await fetchPositionHealth(userAddress);
if (healthFactor < SAFE_THRESHOLD) {
  await dispatchRiskAlert({ userAddress, healthFactor, timestamp });
}`,
    specs: [
      { key: 'Polling Cadence', value: '30 seconds' },
      { key: 'Data Sources', value: 'The Graph Subgraphs, Chainlink' },
      { key: 'Trigger Threshold', value: 'HF < 1.05 (Configurable)' },
      { key: 'Inference Engine', value: 'Real-time state trajectory' },
    ],
    technologies: ['The Graph', 'Chainlink Oracles', 'TypeScript', 'USC-SDK'],
  },
  'oracle-worker': {
    id: 'oracle-worker',
    name: 'Oracle Worker',
    layerTag: 'PROOF DISPATCH LAYER',
    color: '#a8e063',
    description:
      'Receives risk events and queries the source chain block header. Generates cryptographic Merkle storage proofs and continuity proofs using @gluwa/usc-sdk. Queues and signs attestation payloads for Creditcoin CC3 verification.',
    codeSnippet: `// Cryptographic Proof Packaging via @gluwa/usc-sdk
const proof = await uscSdk.generateProof({
  sourceChainId: 11155111, // Sepolia
  account: userAddress,
  blockNumber: targetBlock
});`,
    specs: [
      { key: 'SDK Engine', value: '@gluwa/usc-sdk' },
      { key: 'Proof Primitive', value: 'Merkle Patricia Trie + Continuity' },
      { key: 'Dispatch Target', value: 'Attestcoin Smart Contract (ASC)' },
      { key: 'Attestation Queue', value: 'FIFO with nonce lock' },
    ],
    technologies: ['@gluwa/usc-sdk', 'Ethers.js', 'Merkle Patricia Prover'],
  },
  'attestcoin-asc': {
    id: 'attestcoin-asc',
    name: 'Attestcoin (ASC)',
    layerTag: 'ON-CHAIN VERIFICATION (CC3: 102031)',
    color: '#c5f57a',
    description:
      'Smart contract deployed on Creditcoin CC3 testnet. Invokes the native Block Prover precompile to cryptographically verify source-chain position proofs without trusting external multi-sig bridges.',
    codeSnippet: `// Attestcoin ASC Contract Execution on CC3
function verifyPosition(
  bytes calldata proofData,
  uint256 blockNumber
) external returns (bool verified) {
  verified = BLOCK_PROVER.verifyBlock(proofData, blockNumber);
  if (verified) settlementContract.executeProtection(msg.sender);
}`,
    specs: [
      { key: 'Contract', value: 'Attestcoin.sol' },
      { key: 'Chain ID', value: '102031 (Creditcoin CC3)' },
      { key: 'Precompile Call', value: 'Block Prover (Native)' },
      { key: 'Proof Validation', value: 'Zero Trust Proof Match' },
    ],
    technologies: ['Solidity 0.8.24', 'CC3 Substrate EVM', 'Block Prover Precompile'],
  },
  'block-prover': {
    id: 'block-prover',
    name: 'Block Prover Precompile',
    layerTag: 'SUBSTRATE STATE ATTESTATION',
    color: '#5be4c8',
    description:
      'Native Creditcoin CC3 precompile that cryptographically validates foreign chain headers. Directly attests Ethereum Sepolia (chainKey 1) and Ethereum Mainnet (chainKey 3) within CC3 consensus.',
    codeSnippet: `// Precompile Foreign Chain Attestation
// chainKey 1 = Ethereum Sepolia
// chainKey 3 = Ethereum Mainnet
IBlockProver(0x...Precompile).verifySourceHeader(chainKey, headerHash);`,
    specs: [
      { key: 'Sepolia Key', value: 'chainKey: 1' },
      { key: 'Mainnet Key', value: 'chainKey: 3' },
      { key: 'Execution Cost', value: 'Substrate native gas rate' },
      { key: 'Finality Check', value: 'Deterministic block attestation' },
    ],
    technologies: ['Creditcoin Substrate Core', 'ChainInfo Precompile', 'Consensus Hooks'],
  },
  'settlement-contract': {
    id: 'settlement-contract',
    name: 'Settlement Contract',
    layerTag: 'AUTONOMOUS DISPATCH LAYER',
    color: '#5be4c8',
    description:
      'The on-chain coordinator that authorizes protection actions once ASC verifies the state proof. Dispatches repayment or rebalancing calls back to the source chain within strictly bounded non-custodial permissions.',
    codeSnippet: `// Settlement Protection Dispatch
function protectPosition(
  address user,
  ProtectionMode mode,
  uint256 amount
) external onlyAttestcoin {
  require(healthFactor < SAFE_THRESHOLD, "Position Safe");
  emit PositionProtected(user, mode, amount);
}`,
    specs: [
      { key: 'Safety Guard', value: 'SAFE_THRESHOLD = 1.05' },
      { key: 'Access Boundary', value: 'onlyAttestcoin modifier' },
      { key: 'Auditability', value: 'Immutable PositionProtected events' },
      { key: 'Custody Level', value: 'Non-Custodial (Delegated Action Only)' },
    ],
    technologies: ['Settlement.sol', 'EIP-712 Meta-Transactions', 'Creditcoin EVM'],
  },
  'source-protocols': {
    id: 'source-protocols',
    name: 'DeFi Protocols',
    layerTag: 'SOURCE LENDING ECOSYSTEM',
    color: '#4e6e58',
    description:
      'The decentralized lending markets on Ethereum Sepolia where user collateral and debt positions reside. Debt is repaid or collateral rebalanced to restore health factors above liquidation thresholds.',
    codeSnippet: `// Source Protocol Repay Execution
IPool(AAVE_V3_POOL).repay(
  borrowedAsset,
  repayAmount,
  INTEREST_RATE_MODE,
  userAddress
);`,
    specs: [
      { key: 'Active Protocols', value: 'Aave V3 · Morpho Blue · Compound V3' },
      { key: 'Collateral Assets', value: 'WETH, wstETH, WBTC' },
      { key: 'Borrow Assets', value: 'USDC, USDT, DAI' },
      { key: 'Source Chain', value: 'Ethereum Sepolia (Chain ID: 11155111)' },
    ],
    technologies: ['Aave V3 Pool', 'Morpho Blue Core', 'Compound Comet'],
  },
}

export function ArchitectureSection() {
  const [selectedLayerId, setSelectedLayerId] = React.useState<string>('attestcoin-asc')
  const activeDetail = LAYER_DETAILS[selectedLayerId] || LAYER_DETAILS['attestcoin-asc']

  return (
    <section
      id="architecture"
      className="relative section-padding overflow-hidden"
      aria-label="Architecture"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div>
              <SectionLabel className="mb-4">System Architecture</SectionLabel>
              <h2 className="font-display text-display-lg font-bold text-white tracking-tight">
                Architected for zero trust.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-aegis-lime via-[#c5f57a] to-emerald-400">
                  Exploded 3D infrastructure.
                </span>
              </h2>
            </div>
            <p className="text-aegis-muted text-sm max-w-md leading-relaxed">
              Explore each layer of the Aegis stack in 3D. From off-chain AI monitoring to native Substrate precompile verification on Creditcoin CC3.
            </p>
          </div>
        </ScrollReveal>

        {/* 3D Exploded Architecture + Inspector Grid */}
        <ScrollReveal delay={100}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left: 3D Exploded Model Canvas */}
            <div className="lg:col-span-7">
              <ExplodedArchitecture3D
                selectedLayerId={selectedLayerId}
                onSelectLayer={setSelectedLayerId}
              />
              <div className="flex items-center justify-between mt-3 px-2 text-[11px] font-mono text-aegis-muted">
                <span>Hover or drag in 3D space to isolate layers</span>
                <span className="text-aegis-lime">USC Attestation Verified</span>
              </div>
            </div>

            {/* Right: Layer Technical Inspector */}
            <div className="lg:col-span-5 space-y-4">
              <div className="glass-panel-luxury p-6 rounded-2xl border border-aegis-border-emerald">
                {/* Header Tag */}
                <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{
                        backgroundColor: activeDetail.color,
                        boxShadow: `0 0 10px ${activeDetail.color}`,
                      }}
                    />
                    <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                      {activeDetail.name}
                    </span>
                  </div>
                  <span
                    className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: `${activeDetail.color}15`,
                      color: activeDetail.color,
                      border: `1px solid ${activeDetail.color}30`,
                    }}
                  >
                    {activeDetail.layerTag}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-aegis-muted leading-relaxed mb-6">
                  {activeDetail.description}
                </p>

                {/* Technical Specifications */}
                <div className="space-y-2 mb-6 p-4 rounded-xl bg-[#061009] border border-white/[0.06]">
                  <div className="text-[10px] font-mono text-aegis-lime tracking-widest uppercase mb-2 font-semibold">
                    COMPONENT SPECIFICATIONS
                  </div>
                  {activeDetail.specs.map(s => (
                    <div key={s.key} className="flex justify-between text-xs font-mono">
                      <span className="text-white/40">{s.key}:</span>
                      <span className="text-white/90 text-right">{s.value}</span>
                    </div>
                  ))}
                </div>

                {/* Code Snippet Box */}
                {activeDetail.codeSnippet && (
                  <div className="p-4 rounded-xl bg-black/70 border border-white/[0.08] font-mono text-xs overflow-x-auto text-aegis-lime/90 mb-4">
                    <div className="text-[10px] text-white/30 tracking-widest uppercase mb-1">
                      IMPLEMENTATION INTERACTION
                    </div>
                    <pre className="text-[11px] leading-relaxed">
                      {activeDetail.codeSnippet}
                    </pre>
                  </div>
                )}

                {/* Tech Stack Chips */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {activeDetail.technologies.map(tech => (
                    <span
                      key={tech}
                      className="font-mono text-[10px] px-2.5 py-1 rounded-md bg-[#0a180e] border border-white/[0.08] text-white/70"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
