import React, { useState, useEffect } from 'react'

// ─── PipelineFlow ─────────────────────────────────────────────────────────────
// Fluid Cybernetic Flow Pipeline
// Replaces stacked rectangular cards with an interconnected continuous holographic circuit,
// orbiting photon streams, and organic stage portals.
// ─────────────────────────────────────────────────────────────────────────────

interface PipelinePhase {
  id: string
  phaseNum: string
  title: string
  category: string
  badge: string
  description: string
  latency: string
  proofType: string
  specs: { label: string; val: string }[]
  color: string
}

const PHASES: PipelinePhase[] = [
  {
    id: 'ingestion',
    phaseNum: '01',
    title: 'Cross-Chain Ingestion',
    category: 'SOURCE TELEMETRY',
    badge: 'Ethereum Sepolia',
    description: 'Aegis continuously ingests position collateral, borrow debt, and price oracle feeds from Aave V3, Compound V3, and Morpho Blue.',
    latency: 'Sub-second Data Feeds',
    proofType: 'The Graph Subgraphs + Chainlink',
    specs: [
      { label: 'Source Chain', val: 'Sepolia (ChainKey 1)' },
      { label: 'Monitored Assets', val: 'wETH, WBTC, USDC' },
      { label: 'Oracle Feeds', val: 'Decentralized Price Oracles' },
    ],
    color: '#a8e063',
  },
  {
    id: 'inference',
    phaseNum: '02',
    title: 'AI Hazard Trajectory',
    category: 'PREDICTIVE INFERENCE',
    badge: '30s Polling Loop',
    description: 'The off-chain AI monitoring engine analyzes market depth, price volatility vectors, and health factor decay trajectories in real time.',
    latency: '30s Continuous Inference',
    proofType: 'Health Factor Decay Model',
    specs: [
      { label: 'Scan Interval', val: '30 Seconds' },
      { label: 'Risk Threshold', val: 'HF < 1.05 Trigger' },
      { label: 'Trigger Type', val: 'Automated Event Dispatch' },
    ],
    color: '#c5f57a',
  },
  {
    id: 'verification',
    phaseNum: '03',
    title: 'Attestcoin ZK Proof',
    category: 'CREDITCOIN CC3 CONSENSUS',
    badge: 'Merkle Trie Prover',
    description: 'The Oracle Worker generates cryptographic Merkle storage and continuity proofs via @gluwa/usc-sdk. Attestcoin ASC validates the proof on-chain.',
    latency: '~15s Cryptographic Finality',
    proofType: 'Merkle Patricia + Block Prover',
    specs: [
      { label: 'Verifier Contract', val: 'Attestcoin.sol (CC3)' },
      { label: 'Precompile', val: 'Block Prover (Native)' },
      { label: 'Trust Model', val: '100% Cryptographic Truth' },
    ],
    color: '#5be4c8',
  },
  {
    id: 'settlement',
    phaseNum: '04',
    title: 'Autonomous Settlement',
    category: 'NON-CUSTODIAL EXECUTION',
    badge: 'CC3 Settlement Engine',
    description: 'Upon proof verification, the Settlement Contract coordinates loan repayment or collateral rebalancing directly on the source chain.',
    latency: '< 15s Autonomous Execution',
    proofType: 'SAFE_THRESHOLD 1.05 Invariant',
    specs: [
      { label: 'Execution Mode', val: 'Non-Custodial Dispatch' },
      { label: 'Capital Custody', val: 'Zero Protocol Custody' },
      { label: 'Saved Fee', val: 'Saves 10% Liquidation Penalty' },
    ],
    color: '#a8e063',
  },
]

export function PipelineFlow() {
  const [activePhaseIndex, setActivePhaseIndex] = useState<number>(0)
  const [autoPlay, setAutoPlay] = useState<boolean>(true)

  // Auto-advance through the pipeline phases
  useEffect(() => {
    if (!autoPlay) return
    const interval = setInterval(() => {
      setActivePhaseIndex(prev => (prev + 1) % PHASES.length)
    }, 3800)
    return () => clearInterval(interval)
  }, [autoPlay])

  const currentPhase = PHASES[activePhaseIndex]

  return (
    <div className="relative w-full">
      {/* ── 4-Stage Continuous Flow Ribbon (No Boxy Cards) ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10 relative">

        {/* Luminous Connecting Fiber Line Behind Stages */}
        <div className="hidden md:block absolute top-1/2 left-8 right-8 h-0.5 -translate-y-1/2 bg-gradient-to-r from-[#a8e063]/30 via-[#5be4c8]/50 to-[#a8e063]/30 pointer-events-none z-0">
          {/* Animated Traveling Photon Packet */}
          <div
            className="w-8 h-1.5 rounded-full bg-[#a8e063] shadow-[0_0_15px_#a8e063] transition-all duration-700 -translate-y-[2px]"
            style={{
              marginLeft: `${(activePhaseIndex / (PHASES.length - 1)) * 95}%`,
            }}
          />
        </div>

        {PHASES.map((phase, idx) => {
          const isActive = activePhaseIndex === idx
          const isPassed = idx <= activePhaseIndex

          return (
            <button
              key={phase.id}
              onClick={() => {
                setAutoPlay(false)
                setActivePhaseIndex(idx)
              }}
              className={`relative z-10 text-left p-5 rounded-2xl transition-all duration-300 flex flex-col items-start ${
                isActive
                  ? 'bg-gradient-to-b from-[#0b1d12] to-[#061009] border border-[#a8e063] shadow-[0_0_30px_rgba(168,224,99,0.25)] translate-y-[-4px]'
                  : 'bg-[#060e08]/60 border border-white/[0.06] hover:border-white/[0.2] hover:bg-[#07130a]'
              }`}
            >
              {/* Circular Holographic Phase Portal Icon */}
              <div className="flex items-center justify-between w-full mb-4">
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center font-mono text-xs font-extrabold transition-all duration-300 ${
                    isActive
                      ? 'bg-[#a8e063] text-black shadow-[0_0_15px_#a8e063] scale-110'
                      : isPassed
                      ? 'bg-[#0e2416] text-[#a8e063] border border-[#a8e063]/40'
                      : 'bg-white/[0.04] text-white/40 border border-white/[0.08]'
                  }`}
                >
                  {phase.phaseNum}
                </div>
                <span
                  className="font-mono text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider"
                  style={{
                    backgroundColor: `${phase.color}15`,
                    color: phase.color,
                    border: `1px solid ${phase.color}35`,
                  }}
                >
                  {phase.badge}
                </span>
              </div>

              {/* Title & Category */}
              <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest mb-1">
                {phase.category}
              </div>
              <h3 className={`font-display text-base font-bold transition-colors ${
                isActive ? 'text-white' : 'text-white/70'
              }`}>
                {phase.title}
              </h3>

              {/* Active Glow Accent Bar */}
              {isActive && (
                <div className="w-full h-0.5 bg-[#a8e063] mt-4 rounded-full shadow-[0_0_8px_#a8e063]" />
              )}
            </button>
          )
        })}
      </div>

      {/* ── Interactive Phase Deep-Dive Holographic Reactor ── */}
      <div className="relative p-6 md:p-10 rounded-3xl bg-gradient-to-b from-[#08150d] via-[#050b07] to-[#030604] border border-[rgba(168,224,99,0.2)] shadow-[0_20px_60px_rgba(0,0,0,0.9)] overflow-hidden">

        {/* Ambient Glow Aura */}
        <div
          className="absolute -right-20 -top-20 w-80 h-80 rounded-full blur-[120px] pointer-events-none opacity-20"
          style={{ background: currentPhase.color }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">

          {/* Left: Phase Technical Details */}
          <div className="lg:col-span-7 space-y-5">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#a8e063]/10 border border-[#a8e063]/30 text-[#a8e063]">
                PHASE {currentPhase.phaseNum} OF 04
              </span>
              <span className="text-white/30 font-mono text-xs">•</span>
              <span className="font-mono text-xs text-white/60 uppercase tracking-wider">
                {currentPhase.category}
              </span>
            </div>

            <h3 className="font-display text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              {currentPhase.title}
            </h3>

            <p className="text-sm md:text-base text-white/70 leading-relaxed max-w-xl">
              {currentPhase.description}
            </p>

            {/* Specifications Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3">
              {currentPhase.specs.map((spec, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-[#061008] border border-white/[0.06]">
                  <div className="text-[10px] font-mono text-white/40 uppercase tracking-wider mb-1">
                    {spec.label}
                  </div>
                  <div className="font-mono text-xs font-semibold text-white truncate">
                    {spec.val}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Real-Time Flow Reactor Gauge */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-[#040805]/90 border border-white/[0.08] shadow-inner">
            <div className="relative w-40 h-40 flex items-center justify-center mb-4">
              {/* Orbiting Ring */}
              <div
                className="absolute inset-0 rounded-full border-2 border-dashed border-[#a8e063]/40 animate-spin-slow"
              />
              <div
                className="absolute inset-3 rounded-full border border-[#5be4c8]/30"
              />
              {/* Inner Core */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#a8e063]/20 to-[#0b1d12] border border-[#a8e063] flex flex-col items-center justify-center shadow-[0_0_25px_rgba(168,224,99,0.3)]">
                <span className="font-mono text-xs font-extrabold text-[#a8e063]">
                  {currentPhase.phaseNum}
                </span>
                <span className="font-mono text-[8px] text-white/60 tracking-wider">ACTIVE</span>
              </div>
            </div>

            <div className="text-center font-mono text-xs space-y-1">
              <div className="text-white font-bold">{currentPhase.proofType}</div>
              <div className="text-[#a8e063] text-[11px]">{currentPhase.latency}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
