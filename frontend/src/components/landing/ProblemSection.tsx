import React, { useState, useEffect } from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'

// ─── ProblemSection ───────────────────────────────────────────────────────────
// Premium Non-Boxy Liquidation Risk Visualizer
// Replaces generic rectangular cards with an organic Risk Radar, fluid Waveform Horizon,
// and kinetic telemetry nodes.
// ─────────────────────────────────────────────────────────────────────────────

interface ProblemPillar {
  id: string
  number: string
  title: string
  subtitle: string
  description: string
  metricLabel: string
  metricVal: string
  metricColor: string
  icon: React.ReactNode
}

const PROBLEM_PILLARS: ProblemPillar[] = [
  {
    id: 'monitoring',
    number: '01',
    title: '24/7 Volatility Blindspots',
    subtitle: 'Markets Never Sleep',
    description: 'DeFi lending markets operate uninterrupted. Flash crashes, oracle lag, and liquidity drains happen in seconds while positions sit unmonitored.',
    metricLabel: 'Unmonitored Risk Window',
    metricVal: '8+ Hours / Day',
    metricColor: '#ef4444',
    icon: <RadarIcon className="w-5 h-5 text-[#a8e063]" />,
  },
  {
    id: 'speed',
    number: '02',
    title: 'The Human Latency Penalty',
    subtitle: 'Manual Response is Too Slow',
    description: 'By the time an alert reaches your phone, gas spikes and MEV bot liquidation cascades have already liquidated your collateral at a 10% penalty.',
    metricLabel: 'Human vs Bot Gap',
    metricVal: '45 min vs 15 sec',
    metricColor: '#e8a040',
    icon: <ClockIcon className="w-5 h-5 text-[#a8e063]" />,
  },
  {
    id: 'whales',
    number: '03',
    title: 'Whale-Exclusive Tooling',
    subtitle: 'Asymmetric Infrastructure',
    description: 'Institutional trading desks build custom MEV rescue bots. Everyday DeFi participants are left exposed to market downturns with zero automated defense.',
    metricLabel: 'Retail Liquidation Loss',
    metricVal: '$1.4B+ in 2025',
    metricColor: '#ef4444',
    icon: <ShieldCrossIcon className="w-5 h-5 text-[#a8e063]" />,
  },
  {
    id: 'crosschain',
    number: '04',
    title: 'Cross-Chain Fragmentation',
    subtitle: 'Invisible Multi-Chain Risk',
    description: 'Managing collateral on Ethereum while borrowing on L2s creates disconnected risk silos. One chain plunges while another remains blind.',
    metricLabel: 'Cross-Chain Blindspots',
    metricVal: '100% Disconnected',
    metricColor: '#e8a040',
    icon: <NetworkIcon className="w-5 h-5 text-[#a8e063]" />,
  },
]

export function ProblemSection() {
  const [activePillar, setActivePillar] = useState<number>(0)
  const [simHealthFactor, setSimHealthFactor] = useState<number>(1.82)
  const [simPhase, setSimPhase] = useState<'normal' | 'dropping' | 'danger' | 'saved'>('normal')

  // Autonomous simulation loop
  useEffect(() => {
    const cycle = () => {
      // 1. Normal state
      setSimPhase('normal')
      setSimHealthFactor(1.82)

      // 2. Price drop starts
      const t1 = setTimeout(() => {
        setSimPhase('dropping')
        setSimHealthFactor(1.35)
      }, 2500)

      // 3. Danger zone
      const t2 = setTimeout(() => {
        setSimPhase('danger')
        setSimHealthFactor(1.08)
      }, 5000)

      // 4. Aegis Intervention
      const t3 = setTimeout(() => {
        setSimPhase('saved')
        setSimHealthFactor(1.65)
      }, 7200)

      // Next loop
      const t4 = setTimeout(cycle, 10500)

      return () => {
        clearTimeout(t1)
        clearTimeout(t2)
        clearTimeout(t3)
        clearTimeout(t4)
      }
    }

    const cleanup = cycle()
    return () => cleanup && cleanup()
  }, [])

  return (
    <section
      id="problem"
      className="relative section-padding bg-[#050806] overflow-hidden"
      aria-label="The Problem"
    >
      {/* Dynamic Background Shockwave Rays */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none rounded-full blur-[140px] transition-opacity duration-1000"
        style={{
          background:
            simPhase === 'danger'
              ? 'radial-gradient(circle, rgba(239,68,68,0.15) 0%, rgba(13,29,19,0.4) 60%, transparent 80%)'
              : simPhase === 'saved'
              ? 'radial-gradient(circle, rgba(168,224,99,0.2) 0%, rgba(91,228,200,0.15) 50%, transparent 80%)'
              : 'radial-gradient(circle, rgba(168,224,99,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 md:px-10 relative z-10">
        {/* Section Header */}
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <SectionLabel className="mb-4">The Liquidation Threat</SectionLabel>
              <h2 className="font-display text-display-xl font-bold text-white tracking-tight">
                Liquidation doesn't wait.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-amber-300 to-[#a8e063]">
                  Neither should your defense.
                </span>
              </h2>
            </div>
            <p className="text-white/60 text-sm md:text-base max-w-md leading-relaxed">
              In decentralized lending, market cascades wipe out leveraged positions in minutes. Manual intervention is too slow. Aegis bridges the gap.
            </p>
          </div>
        </ScrollReveal>

        {/* Central Arena: Interactive Horizon Waveform & Organic Pillar Constellation */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">

          {/* Left Column: Fluid Pillar Navigators (No Boxy Cards) */}
          <div className="lg:col-span-6 space-y-4">
            {PROBLEM_PILLARS.map((pillar, idx) => {
              const isSelected = activePillar === idx
              return (
                <div
                  key={pillar.id}
                  onClick={() => setActivePillar(idx)}
                  className={`relative p-5 rounded-2xl cursor-pointer transition-all duration-300 flex items-start gap-4 border ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#0b1d12]/90 to-[#07130a]/70 border-[#a8e063] shadow-[0_0_25px_rgba(168,224,99,0.15)] translate-x-1'
                      : 'bg-[#060e08]/50 border-white/[0.05] hover:border-white/[0.15] hover:bg-[#08150d]'
                  }`}
                >
                  {/* Floating Number Bubble */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-mono text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#a8e063] text-black shadow-[0_0_12px_#a8e063]'
                        : 'bg-white/[0.05] text-white/40 border border-white/[0.08]'
                    }`}
                  >
                    {pillar.number}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className={`font-display text-base font-bold transition-colors ${
                        isSelected ? 'text-white' : 'text-white/80'
                      }`}>
                        {pillar.title}
                      </h3>
                      <span className="font-mono text-[10px] tracking-wider uppercase font-semibold text-[#a8e063]">
                        {pillar.subtitle}
                      </span>
                    </div>

                    <p className="text-xs text-white/60 leading-relaxed mb-3">
                      {pillar.description}
                    </p>

                    {/* Metric Chip */}
                    <div className="flex items-center gap-3 pt-2 border-t border-white/[0.05] text-[11px] font-mono">
                      <span className="text-white/40">{pillar.metricLabel}:</span>
                      <span
                        className="font-bold px-2 py-0.5 rounded-full"
                        style={{
                          color: pillar.metricColor,
                          backgroundColor: `${pillar.metricColor}15`,
                          border: `1px solid ${pillar.metricColor}30`,
                        }}
                      >
                        {pillar.metricVal}
                      </span>
                    </div>
                  </div>

                  {/* Active Indicator Pulse */}
                  {isSelected && (
                    <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-2 h-8 rounded-r-full bg-[#a8e063] shadow-[0_0_10px_#a8e063]" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Right Column: Holographic Shockwave Radar & Liquidation Wave Arena */}
          <div className="lg:col-span-6 relative flex flex-col items-center">
            {/* The Organic Radar Orb Container */}
            <div className="relative w-full max-w-[480px] aspect-square rounded-full p-8 flex items-center justify-center border border-[rgba(168,224,99,0.15)] bg-gradient-to-b from-[#07130a]/80 via-[#050906]/95 to-[#040805] shadow-[0_20px_70px_rgba(0,0,0,0.8)]">

              {/* Concentric Radar Rings */}
              <div className="absolute inset-4 rounded-full border border-[rgba(168,224,99,0.08)] pointer-events-none" />
              <div className="absolute inset-16 rounded-full border border-[rgba(168,224,99,0.12)] pointer-events-none" />
              <div className="absolute inset-28 rounded-full border border-dashed border-[rgba(168,224,99,0.18)] pointer-events-none animate-spin-slow" />

              {/* Radar Crosshairs */}
              <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gradient-to-b from-transparent via-[#a8e063]/20 to-transparent pointer-events-none" />
              <div className="absolute left-0 right-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[#a8e063]/20 to-transparent pointer-events-none" />

              {/* Rotating Laser Beam Scanner */}
              <div
                className="absolute inset-0 rounded-full pointer-events-none animate-spin-slow opacity-40"
                style={{
                  background: 'conic-gradient(from 0deg, rgba(168,224,99,0.4) 0deg, transparent 60deg, transparent 360deg)',
                }}
              />

              {/* Central Dynamic Health Instrument */}
              <div className="relative z-10 text-center flex flex-col items-center">
                {/* State Tag */}
                <div
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full font-mono text-[10px] font-bold uppercase tracking-wider mb-2 border transition-all duration-500"
                  style={{
                    color:
                      simPhase === 'danger' ? '#ef4444' : simPhase === 'saved' ? '#a8e063' : simPhase === 'dropping' ? '#e8a040' : '#a8e063',
                    borderColor:
                      simPhase === 'danger' ? 'rgba(239,68,68,0.4)' : simPhase === 'saved' ? 'rgba(168,224,99,0.4)' : 'rgba(232,160,64,0.4)',
                    backgroundColor:
                      simPhase === 'danger' ? 'rgba(239,68,68,0.15)' : simPhase === 'saved' ? 'rgba(168,224,99,0.15)' : 'rgba(232,160,64,0.15)',
                    boxShadow:
                      simPhase === 'danger' ? '0 0 15px rgba(239,68,68,0.3)' : '0 0 15px rgba(168,224,99,0.3)',
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full animate-pulse bg-current" />
                  {simPhase === 'normal' && 'MONITORING SAFE'}
                  {simPhase === 'dropping' && 'VOLATILITY DETECTED'}
                  {simPhase === 'danger' && 'LIQUIDATION HORIZON'}
                  {simPhase === 'saved' && 'AEGIS DEFENSE RESTORED'}
                </div>

                {/* Big Health Factor Value */}
                <div
                  className="font-display font-extrabold text-5xl md:text-6xl tabular-nums tracking-tight transition-colors duration-500 my-1"
                  style={{
                    color:
                      simPhase === 'danger' ? '#ef4444' : simPhase === 'saved' ? '#a8e063' : simPhase === 'dropping' ? '#e8a040' : '#a8e063',
                    filter: `drop-shadow(0 0 20px ${
                      simPhase === 'danger' ? 'rgba(239,68,68,0.5)' : 'rgba(168,224,99,0.5)'
                    })`,
                  }}
                >
                  {simHealthFactor.toFixed(2)}
                </div>
                <div className="font-mono text-[11px] text-white/40 uppercase tracking-widest mb-3">
                  Aave V3 · Collateral HF
                </div>

                {/* Dynamic Waveform Graph */}
                <div className="w-48 h-12 relative flex items-center justify-center">
                  <svg className="w-full h-full" viewBox="0 0 200 60" fill="none">
                    {/* Liquidation Threshold Line */}
                    <line x1="0" y1="48" x2="200" y2="48" stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
                    {/* Dynamic Path */}
                    <path
                      d={
                        simPhase === 'normal'
                          ? 'M 0 15 Q 50 12, 100 18 T 200 14'
                          : simPhase === 'dropping'
                          ? 'M 0 15 Q 60 25, 120 38 T 200 40'
                          : simPhase === 'danger'
                          ? 'M 0 15 Q 70 35, 140 47 T 200 47'
                          : 'M 0 15 Q 60 45, 120 46 Q 150 48, 170 20 T 200 18'
                      }
                      stroke={simPhase === 'danger' ? '#ef4444' : '#a8e063'}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      fill="none"
                      style={{ transition: 'd 0.8s ease, stroke 0.5s ease' }}
                    />
                  </svg>
                </div>

                {/* Real-Time Status Notification */}
                <div className="mt-2 font-mono text-[10px] text-white/60">
                  {simPhase === 'danger' ? (
                    <span className="text-red-400 font-bold animate-pulse">
                      ⚠ CRITICAL: Auto-Repay Proof Submitting to CC3
                    </span>
                  ) : simPhase === 'saved' ? (
                    <span className="text-[#a8e063] font-bold">
                      ✓ DEBT REPAID · Collateral Preserved
                    </span>
                  ) : (
                    <span>Polling Cadence: 30s · Zero Gas Drag</span>
                  )}
                </div>
              </div>

              {/* Floating Orbiting Satellite Nodes */}
              <div className="absolute -top-3 right-8 px-3 py-1 rounded-full bg-[#08150d] border border-white/[0.08] font-mono text-[9px] text-[#a8e063] shadow-[0_0_10px_rgba(168,224,99,0.15)]">
                ETH Sepolia
              </div>
              <div className="absolute -bottom-2 left-8 px-3 py-1 rounded-full bg-[#08150d] border border-white/[0.08] font-mono text-[9px] text-[#5be4c8] shadow-[0_0_10px_rgba(91,228,200,0.15)]">
                Attestcoin ASC
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Lightweight SVG Icons ───────────────────────────────────────────────────

function RadarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <path d="M12 3v9l6 3" strokeLinecap="round" />
    </svg>
  )
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12,6 12,12 16,14" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ShieldCrossIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2L4 6v6c0 5.5 3.5 10 8 11 4.5-1 8-5.5 8-11V6l-8-4z" />
      <path d="M9 12h6M12 9v6" strokeLinecap="round" />
    </svg>
  )
}

function NetworkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="5" r="3" />
      <circle cx="5" cy="19" r="3" />
      <circle cx="19" cy="19" r="3" />
      <path d="M12 8v4M7.5 17.5l3-4M16.5 17.5l-3-4" />
    </svg>
  )
}
