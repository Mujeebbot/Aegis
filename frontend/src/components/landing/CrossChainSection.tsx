import React from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'
import { useReducedMotion } from '../background/AmbientBackground'

// ─── CrossChainSection ────────────────────────────────────────────────────────
// Luxury dark-green cross-chain infrastructure visualizer
// Source Chains (Ethereum Sepolia) → Oracle Worker → Attestcoin (CC3) → Creditcoin Settlement
// ─────────────────────────────────────────────────────────────────────────────

interface ChainNode {
  id: string
  name: string
  short: string
  badge: string
  color: string
  status: 'active' | 'planned'
  type: 'source' | 'verification' | 'settlement'
  specs: { label: string; val: string }[]
  metrics: string
}

const CHAIN_NODES: ChainNode[] = [
  {
    id: 'eth-sepolia',
    name: 'Ethereum Sepolia',
    short: 'ETH',
    badge: 'chainKey: 1',
    color: '#a8e063',
    status: 'active',
    type: 'source',
    specs: [
      { label: 'Protocols', val: 'Aave V3 · Morpho' },
      { label: 'Cadence', val: '30s Polling' },
      { label: 'Attestation', val: 'Block Prover CC3' },
    ],
    metrics: 'Active Monitoring · 0x71C8...3F9A',
  },
  {
    id: 'attestcoin',
    name: 'Attestcoin ASC',
    short: 'ASC',
    badge: 'Creditcoin CC3',
    color: '#c5f57a',
    status: 'active',
    type: 'verification',
    specs: [
      { label: 'Proof Engine', val: '@gluwa/usc-sdk' },
      { label: 'Verification', val: 'Merkle + Continuity' },
      { label: 'Settlement Time', val: '~15s Finality' },
    ],
    metrics: 'Chain ID 102031 · 100% Cryptographic',
  },
  {
    id: 'creditcoin-cc3',
    name: 'Creditcoin CC3',
    short: 'CC3',
    badge: 'Settlement Engine',
    color: '#5be4c8',
    status: 'active',
    type: 'settlement',
    specs: [
      { label: 'Threshold', val: 'SAFE_THRESHOLD 1.05' },
      { label: 'Execution', val: 'Autonomous Settlement' },
      { label: 'Non-Custodial', val: 'Permission Boundary' },
    ],
    metrics: 'Substrate EVM · Autonomous Dispatch',
  },
  {
    id: 'solana',
    name: 'Solana Ecosystem',
    short: 'SOL',
    badge: 'Pending Attestation',
    color: '#4e6e58',
    status: 'planned',
    type: 'source',
    specs: [
      { label: 'Status', val: 'Roadmap Milestone' },
      { label: 'Target', val: 'Kamino · MarginFi' },
      { label: 'Requirements', val: 'CC3 State Proof' },
    ],
    metrics: 'Future Expansion Node',
  },
]

export function CrossChainSection() {
  const prefersReducedMotion = useReducedMotion()
  const [selectedNode, setSelectedNode] = React.useState<string>('eth-sepolia')
  const [pulseIndex, setPulseIndex] = React.useState<number>(0)

  React.useEffect(() => {
    if (prefersReducedMotion) return
    const interval = setInterval(() => {
      setPulseIndex(p => (p + 1) % 3)
    }, 2400)
    return () => clearInterval(interval)
  }, [prefersReducedMotion])

  const activeNodeData = CHAIN_NODES.find(n => n.id === selectedNode) || CHAIN_NODES[0]

  return (
    <section
      id="cross-chain"
      className="relative section-padding overflow-hidden"
      aria-label="Cross-chain architecture"
    >
      {/* Subtle radial emerald background glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] pointer-events-none opacity-20 blur-[120px]"
        style={{ background: 'radial-gradient(ellipse at center, #a8e063 0%, #0d1f14 50%, transparent 80%)' }}
      />

      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <SectionLabel className="mb-4">Cross-Chain Substrate & Proof Infrastructure</SectionLabel>
              <h2 className="font-display text-display-lg font-bold text-white tracking-tight">
                One unified defense core.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-aegis-lime via-[#c5f57a] to-emerald-400">
                  Multiple verified chains.
                </span>
              </h2>
            </div>
            <p className="text-aegis-muted text-sm max-w-md leading-relaxed">
              Aegis monitors decentralized lending protocols on source chains, builds cryptographic state proofs, and executes non-custodial protection using Creditcoin CC3.
            </p>
          </div>
        </ScrollReveal>

        {/* Interactive Cross-Chain Visualizer */}
        <ScrollReveal delay={100}>
          <div className="glass-panel-luxury p-6 md:p-10 rounded-2xl relative overflow-hidden border border-aegis-border-emerald">
            {/* Top Bar / Status */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.06] mb-8">
              <div className="flex items-center gap-3">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-aegis-lime shadow-[0_0_10px_#a8e063] animate-pulse" />
                <span className="font-mono text-xs text-white uppercase tracking-widest font-semibold">
                  CROSS-CHAIN ATTESTATION PIPELINE
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono text-aegis-muted">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-aegis-lime" /> Sepolia (Active)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> CC3 Testnet (Active)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" /> Solana (Planned)
                </span>
              </div>
            </div>

            {/* Architecture Node Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {CHAIN_NODES.map((node, idx) => {
                const isSelected = selectedNode === node.id
                const isPulsing = pulseIndex === idx

                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(node.id)}
                    className={`text-left p-5 rounded-xl transition-all duration-300 relative border ${
                      isSelected
                        ? 'bg-[#0b1b11] border-aegis-lime shadow-[0_0_24px_rgba(168,224,99,0.18)] translate-y-[-2px]'
                        : 'bg-[#08120b]/70 border-white/[0.07] hover:border-aegis-lime/40 hover:bg-[#0a170f]'
                    }`}
                  >
                    {/* Node Tag & Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded border border-white/[0.08] bg-black/40 text-aegis-muted">
                        {node.short}
                      </span>
                      <span
                        className="font-mono text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${node.color}15`,
                          color: node.color,
                          border: `1px solid ${node.color}30`,
                        }}
                      >
                        {node.badge}
                      </span>
                    </div>

                    <h3 className="font-display font-bold text-white text-base mb-1">
                      {node.name}
                    </h3>
                    <p className="font-mono text-[11px] text-aegis-muted mb-4">
                      {node.metrics}
                    </p>

                    <div className="space-y-1.5 pt-3 border-t border-white/[0.06]">
                      {node.specs.slice(0, 2).map((s, i) => (
                        <div key={i} className="flex justify-between text-[11px] font-mono">
                          <span className="text-white/40">{s.label}:</span>
                          <span className="text-white/90">{s.val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Active Selection Glow Dot */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-aegis-lime shadow-[0_0_8px_#a8e063]" />
                    )}

                    {/* Animated Conduit Wave Indicator */}
                    {isPulsing && !prefersReducedMotion && (
                      <div className="absolute inset-0 rounded-xl border border-aegis-lime/40 pointer-events-none animate-ping opacity-25" />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Pipeline Conduit Flow Visualizer */}
            <div className="p-6 rounded-xl bg-[#060e08] border border-aegis-border-emerald/60 relative">
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                {/* Node Detail Focus */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[11px] text-aegis-lime uppercase tracking-wider font-semibold">
                      SELECTED PROTOCOL LAYER
                    </span>
                    <span className="text-xs text-white/30">•</span>
                    <span className="font-mono text-xs text-white/70">{activeNodeData.name}</span>
                  </div>
                  <h4 className="font-display text-xl font-bold text-white mb-2">
                    {activeNodeData.type === 'source' && 'Source Position State Ingestion'}
                    {activeNodeData.type === 'verification' && 'Attestcoin Cryptographic Verifier'}
                    {activeNodeData.type === 'settlement' && 'Creditcoin CC3 Settlement Engine'}
                  </h4>
                  <p className="text-sm text-aegis-muted leading-relaxed max-w-xl">
                    {activeNodeData.id === 'eth-sepolia' &&
                      'Aegis polls position telemetry across Aave V3 and Morpho on Ethereum Sepolia every 30 seconds via The Graph and Chainlink price oracles. State snapshots are relayed to the Oracle Worker.'}
                    {activeNodeData.id === 'attestcoin' &&
                      'The Attestcoin Smart Contract (ASC) on Creditcoin CC3 leverages the Block Prover precompile to cryptographically verify source-chain state proofs. No off-chain entity can bypass this cryptographic verification.'}
                    {activeNodeData.id === 'creditcoin-cc3' &&
                      'Upon ASC proof verification, Creditcoin CC3 coordinates autonomous settlement actions (repaying loan debt or rebalancing collateral) within the strictly configured user permission boundary.'}
                    {activeNodeData.id === 'solana' &&
                      'Solana ecosystem support is in development. Architecture will mirror the Sepolia integration with state-attestation via Creditcoin CC3 verification bridges.'}
                  </p>
                </div>

                {/* Live Node Telemetry Chip */}
                <div className="w-full lg:w-80 p-4 rounded-lg bg-[#0a150e] border border-white/[0.08] font-mono text-xs space-y-2">
                  <div className="text-[10px] text-aegis-lime tracking-widest uppercase mb-1">
                    LIVE PROTOCOL TELEMETRY
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Status:</span>
                    <span className={activeNodeData.status === 'active' ? 'text-aegis-lime' : 'text-neutral-400'}>
                      {activeNodeData.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Security Model:</span>
                    <span className="text-white">Non-Custodial</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/40">Chain Verification:</span>
                    <span className="text-white">Merkle Continuity</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-white/40">Chain ID:</span>
                    <span className="text-aegis-lime">102031 (CC3)</span>
                  </div>
                </div>
              </div>

              {/* Data Flow Conduit Indicator Line */}
              <div className="mt-6 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[11px] font-mono text-aegis-muted">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-aegis-lime animate-pulse" />
                  Proof Generation Cadence: 30s
                </span>
                <span className="hidden sm:inline text-white/40">
                  Proof Payload: &lt;sourceBlock, stateRoot, receiptRoot, merkleProof&gt;
                </span>
                <span className="text-aegis-lime">USC-SDK v0.4.1</span>
              </div>
            </div>

            {/* Note banner */}
            <div className="mt-6 p-3.5 rounded-lg bg-[#071109] border border-white/[0.04] flex items-start gap-3">
              <span className="font-mono text-xs text-aegis-lime mt-0.5">ℹ</span>
              <p className="text-[11px] font-mono text-aegis-muted leading-relaxed">
                The CC3 testnet ChainInfo precompile currently attests Ethereum Sepolia (<code className="text-white">chainKey: 1</code>) and Ethereum Mainnet (<code className="text-white">chainKey: 3</code>). Solana is on the roadmap and will be supported upon CC3 proof engine upgrade. All live demonstrations execute in non-custodial test environments.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
