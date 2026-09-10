import React, { useState, useEffect } from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'
import { Link } from 'react-router-dom'

// ─── Strategy Data ────────────────────────────────────────────────────────────
interface StrategyMode {
  id: string
  key: string
  number: string
  badge: string
  title: string
  tagline: string
  accentColor: string
  secondaryColor: string
  triggerFormula: string
  triggerCondition: string
  actionSummary: string
  description: string
  settlementSpeed: string
  gasSaved: string
  proofType: string
  features: string[]
  metrics: { label: string; value: string; unit?: string }[]
  simLabel: string
  defaultSimValue: number
  simUnit: string
  simMin: number
  simMax: number
}

const STRATEGIES: StrategyMode[] = [
  {
    id: 'stop-loss',
    key: 'STOP_LOSS',
    number: '01',
    badge: 'EMERGENCY LIQUIDATION SHIELD',
    title: 'Stop-Loss Defense',
    tagline: 'Autonomous Liquidation Prevention & Buffer Protection',
    accentColor: '#a8e063',
    secondaryColor: '#22c55e',
    triggerFormula: 'HF_{current} < HF_{trigger} (e.g. 1.15)',
    triggerCondition: 'Health Factor drops below configured safety floor',
    actionSummary: 'Flash-repay debt & restore healthy collateral ratio in < 15s',
    description:
      'Prevents catastrophic liquidation penalties when market prices plunge. Aegis continuously polls loan telemetry every 30 seconds. If volatility breaches your threshold, an automated Merkle continuity proof is generated and verified on Creditcoin CC3 to execute immediate debt repayment before predatory liquidators strike.',
    settlementSpeed: '~15 seconds',
    gasSaved: 'Up to 10% penalty fee saved',
    proofType: 'Merkle Root + Block Continuity (ASC)',
    features: [
      'Configurable HF trigger bounds: 1.05 to 1.35',
      'Flash-repay debt via pre-approved collateral buffer',
      'Zero custody risk: all permissions constrained to debt contract',
      'Cryptographically verified on Creditcoin CC3 testnet',
    ],
    metrics: [
      { label: 'TRIGGER THRESHOLD', value: '1.15', unit: 'HF' },
      { label: 'EXECUTION CADENCE', value: '< 15', unit: 'sec' },
      { label: 'PENALTY ELIMINATION', value: '100', unit: '%' },
    ],
    simLabel: 'Simulate Market Price Drop',
    defaultSimValue: -28,
    simUnit: '%',
    simMin: -50,
    simMax: 0,
  },
  {
    id: 'take-profit',
    key: 'TAKE_PROFIT',
    number: '02',
    badge: 'CAPITAL PRESERVATION',
    title: 'Take-Profit Harvest',
    tagline: 'Automated Collateral Upside Lock & Leverage Unwind',
    accentColor: '#c5f57a',
    secondaryColor: '#84cc16',
    triggerFormula: 'P_{collateral} \\ge P_{entry} \\times (1 + \\Delta_{target})',
    triggerCondition: 'Collateral reaches target appreciation (e.g. +35%)',
    actionSummary: 'Safely unwind borrow loop and lock net gains into USDC',
    description:
      'Locks in leveraged asset upside automatically. When your collateral hits target profit thresholds, Aegis executes an orderly leverage unwinding sequence: paying off outstanding debt, releasing locked collateral, and securing net gains directly into stablecoins without exposing your position to market reversals.',
    settlementSpeed: '~15 seconds',
    gasSaved: 'Eliminates manual slippage & timing drag',
    proofType: 'Price Oracle Attestation + CC3 Dispatch',
    features: [
      'Configurable profit targets: +15% to +250%',
      'Automated multi-step borrow loop unwinding',
      'Instant conversion to USDC / USDT stable reserves',
      'Non-custodial dispatch verified across EVM chains',
    ],
    metrics: [
      { label: 'TARGET HARVEST', value: '+35.0', unit: '%' },
      { label: 'SLIPPAGE CEILING', value: '< 0.3', unit: '%' },
      { label: 'PROFIT ROUTING', value: 'USDC', unit: 'Auto' },
    ],
    simLabel: 'Simulate Collateral Appreciation',
    defaultSimValue: 40,
    simUnit: '%',
    simMin: 0,
    simMax: 100,
  },
  {
    id: 'leverage-rebalance',
    key: 'LEVERAGE_REBALANCE',
    number: '03',
    badge: 'CONTINUOUS EQUILIBRIUM',
    title: 'Leverage Rebalance',
    tagline: 'Dynamic Health Corridor & Micro-Adjustment Engine',
    accentColor: '#34d399',
    secondaryColor: '#10b981',
    triggerFormula: 'HF \\notin [HF_{min}, HF_{max}] (e.g. [1.40, 1.70])',
    triggerCondition: 'Health Factor drifts outside configured optimal band',
    actionSummary: 'Micro-borrow or micro-repay to sustain peak capital efficiency',
    description:
      'Engineered for active yield farmers and looped collateral protocols. Aegis keeps your position inside a precision health corridor (e.g. 1.40 to 1.70), automatically repaying or re-borrowing in micro-increments to maximize APY while permanently suppressing liquidation risk.',
    settlementSpeed: '~15 seconds',
    gasSaved: 'Batch micro-rebalancing efficiency',
    proofType: 'Multi-State Continuity Proof',
    features: [
      'Corridor bounds: Min 1.30 / Max 1.80 Health Factor',
      'Continuous micro-adjustment eliminates yield drag',
      'Automated re-collateralization on high-yield spikes',
      'Zero manual monitoring required 24/7/365',
    ],
    metrics: [
      { label: 'CORRIDOR BAND', value: '1.40 — 1.70', unit: 'HF' },
      { label: 'YIELD OPTIMIZATION', value: '+4.2', unit: '% APY' },
      { label: 'SAFETY MARGIN', value: '> 40', unit: '% Buffer' },
    ],
    simLabel: 'Simulate Volatility Drift',
    defaultSimValue: 15,
    simUnit: '% Drift',
    simMin: -30,
    simMax: 30,
  },
]

export function ProtectionModesSection() {
  const [activeIndex, setActiveIndex] = useState(0)
  const [isAutoPlaying, setIsAutoPlaying] = useState(false)
  const [simValue, setSimValue] = useState(STRATEGIES[0].defaultSimValue)

  const activeStrategy = STRATEGIES[activeIndex]

  // Reset simulation slider when switching strategies
  useEffect(() => {
    setSimValue(activeStrategy.defaultSimValue)
  }, [activeIndex, activeStrategy.defaultSimValue])

  // Optional auto-cycle
  useEffect(() => {
    if (!isAutoPlaying) return
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % STRATEGIES.length)
    }, 7000)
    return () => clearInterval(interval)
  }, [isAutoPlaying])

  return (
    <section
      id="protection"
      className="relative section-padding overflow-hidden bg-gradient-to-b from-transparent via-[#030805] to-transparent"
      aria-label="Autonomous Protection Strategies"
    >
      {/* Background Ambient Glow Orbs */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] rounded-full blur-[140px] pointer-events-none opacity-20 transition-all duration-700"
        style={{
          background: `radial-gradient(circle, ${activeStrategy.accentColor} 0%, transparent 70%)`,
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(#a8e06308_1px,transparent_1px)] [background-size:32px_32px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        {/* Header with Title and Mode Switcher */}
        <ScrollReveal>
          <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-12 gap-6">
            <div>
              <SectionLabel className="mb-4">Autonomous Defense Policies</SectionLabel>
              <h2 className="font-display text-display-lg font-bold text-white tracking-tight">
                Choose your defense.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-aegis-lime via-[#c5f57a] to-emerald-400">
                  Three mathematical strategies.
                </span>
              </h2>
            </div>
            <p className="text-aegis-muted text-sm max-w-md leading-relaxed">
              Every loan position is unique. Toggle through autonomous defense algorithms designed to preserve collateral, lock upside, or maintain dynamic equilibrium 24/7.
            </p>
          </div>
        </ScrollReveal>

        {/* Tactical Strategy Segmented Dock / Selector */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1.5 rounded-full bg-[#07130b]/90 border border-white/[0.08] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            {STRATEGIES.map((strategy, idx) => {
              const isActive = idx === activeIndex
              return (
                <button
                  key={strategy.id}
                  onClick={() => {
                    setActiveIndex(idx)
                    setIsAutoPlaying(false)
                  }}
                  className={`relative px-5 py-2.5 rounded-full text-xs font-mono transition-all duration-300 flex items-center gap-2 ${
                    isActive
                      ? 'text-black font-bold shadow-[0_0_20px_rgba(168,224,99,0.3)]'
                      : 'text-white/60 hover:text-white hover:bg-white/[0.03]'
                  }`}
                  style={{
                    backgroundColor: isActive ? strategy.accentColor : 'transparent',
                  }}
                >
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isActive ? 'bg-black/20 text-black' : 'bg-white/10 text-white/70'
                    }`}
                  >
                    {strategy.number}
                  </span>
                  <span>{strategy.title}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 3D Interactive Card Deck Experience */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: 3D Stack / Interactive Preview Deck (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="relative rounded-3xl p-6 md:p-8 bg-[#06110a]/90 border border-aegis-lime/30 backdrop-blur-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_0_rgba(255,255,255,0.1)] overflow-hidden transition-all duration-500 min-h-[460px] flex flex-col justify-between">
              {/* Corner Watermark Number */}
              <div className="absolute top-4 right-6 font-mono text-8xl font-black text-white/[0.03] select-none pointer-events-none">
                {activeStrategy.number}
              </div>

              {/* Top Bar: Category Badge & Status Beacon */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 border border-white/[0.08]">
                    <span
                      className="w-2 h-2 rounded-full animate-pulse"
                      style={{ backgroundColor: activeStrategy.accentColor }}
                    />
                    <span
                      className="font-mono text-[10px] tracking-widest font-semibold uppercase"
                      style={{ color: activeStrategy.accentColor }}
                    >
                      {activeStrategy.badge}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-white/40">ALGORITHM ACTIVE</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  </div>
                </div>

                {/* Title & Tagline */}
                <h3 className="font-display text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
                  {activeStrategy.title}
                </h3>
                <p className="font-mono text-xs text-aegis-muted mb-6 flex items-center gap-2">
                  <span className="text-white/40">TRIGGER EQUATION:</span>
                  <span
                    className="px-2 py-0.5 rounded bg-black/40 border border-white/[0.06] text-white font-mono"
                    style={{ color: activeStrategy.accentColor }}
                  >
                    {activeStrategy.triggerFormula}
                  </span>
                </p>
              </div>

              {/* Dynamic Strategy Visualizer Canvas */}
              <div className="relative my-4 p-5 rounded-2xl bg-[#030905] border border-white/[0.06] shadow-inner overflow-hidden">
                <div className="flex items-center justify-between mb-3 text-[11px] font-mono text-white/50">
                  <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-aegis-lime" />
                    LIVE TRAJECTORY SIMULATION
                  </span>
                  <span className="text-aegis-lime font-bold">CREDITCOIN CC3 READY</span>
                </div>

                {/* SVG Visualizer that responds to strategy */}
                <div className="w-full h-40 relative flex items-center justify-center">
                  {activeIndex === 0 && (
                    <svg className="w-full h-full" viewBox="0 0 500 160" fill="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="40" x2="500" y2="40" stroke="#ffffff" strokeOpacity="0.04" strokeDasharray="4 4" />
                      <line x1="0" y1="80" x2="500" y2="80" stroke="#ffffff" strokeOpacity="0.04" strokeDasharray="4 4" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="#ffffff" strokeOpacity="0.04" strokeDasharray="4 4" />

                      {/* Liquidation Threshold Bar */}
                      <line x1="0" y1="125" x2="500" y2="125" stroke="#4ade80" strokeWidth="1" strokeDasharray="6 6" strokeOpacity="0.4" />
                      <rect x="10" y="108" width="135" height="16" rx="3" fill="#07150c" stroke="#4ade80" strokeWidth="0.5" strokeOpacity="0.4" />
                      <text x="16" y="120" fill="#4ade80" fontSize="9" fontFamily="monospace" fontWeight="bold">LIQUIDATION (1.00 HF)</text>

                      {/* Aegis Trigger Band */}
                      <line x1="0" y1="90" x2="500" y2="90" stroke="#a8e063" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.4" />
                      <rect x="10" y="73" width="135" height="16" rx="3" fill="#0d1f11" stroke="#a8e063" strokeWidth="0.5" strokeOpacity="0.5" />
                      <text x="16" y="85" fill="#a8e063" fontSize="9" fontFamily="monospace" fontWeight="bold">AEGIS TRIGGER (1.15 HF)</text>

                      {/* Collateral Price Shock Wave */}
                      <path
                        d="M 10 30 C 100 35, 160 55, 220 90 C 240 100, 255 90, 310 50 C 370 20, 430 30, 490 35"
                        stroke="#a8e063"
                        strokeWidth="3.5"
                        fill="none"
                        strokeLinecap="round"
                      />

                      {/* Area under recovery */}
                      <path
                        d="M 10 30 C 100 35, 160 55, 220 90 C 240 100, 255 90, 310 50 C 370 20, 430 30, 490 35 L 490 150 L 10 150 Z"
                        fill="url(#stopLossGlow)"
                        opacity="0.25"
                      />
                      <defs>
                        <linearGradient id="stopLossGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#a8e063" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#a8e063" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* CC3 Autonomous Intervention Node */}
                      <g transform="translate(220, 90)">
                        <circle r="12" fill="#a8e063" fillOpacity="0.2" className="animate-ping" />
                        <circle r="7" fill="#07130b" stroke="#a8e063" strokeWidth="2.5" />
                        <circle r="3" fill="#a8e063" />
                      </g>
                      <rect x="235" y="80" width="150" height="20" rx="4" fill="#0b2413" stroke="#a8e063" strokeWidth="1" />
                      <text x="242" y="94" fill="#a8e063" fontSize="9" fontFamily="monospace" fontWeight="bold">✓ CC3 FLASH REPAY DEFENSE</text>
                    </svg>
                  )}

                  {activeIndex === 1 && (
                    <svg className="w-full h-full" viewBox="0 0 500 160" fill="none">
                      {/* Grid Lines */}
                      <line x1="0" y1="40" x2="500" y2="40" stroke="#ffffff" strokeOpacity="0.04" strokeDasharray="4 4" />
                      <line x1="0" y1="80" x2="500" y2="80" stroke="#ffffff" strokeOpacity="0.04" strokeDasharray="4 4" />
                      <line x1="0" y1="120" x2="500" y2="120" stroke="#ffffff" strokeOpacity="0.04" strokeDasharray="4 4" />

                      {/* Target Profit Line */}
                      <line x1="0" y1="45" x2="500" y2="45" stroke="#c5f57a" strokeWidth="1.5" strokeDasharray="6 6" strokeOpacity="0.7" />
                      <rect x="10" y="28" width="150" height="16" rx="3" fill="#13240e" stroke="#c5f57a" strokeWidth="0.5" strokeOpacity="0.5" />
                      <text x="16" y="40" fill="#c5f57a" fontSize="9" fontFamily="monospace" fontWeight="bold">PROFIT TARGET (+35.0%)</text>

                      {/* Price Trajectory climbing to target and locked */}
                      <path
                        d="M 10 130 C 80 125, 140 110, 220 75 C 270 52, 300 45, 330 45 L 490 45"
                        stroke="#c5f57a"
                        strokeWidth="3.5"
                        fill="none"
                        strokeLinecap="round"
                      />

                      {/* Glow underneath */}
                      <path
                        d="M 10 130 C 80 125, 140 110, 220 75 C 270 52, 300 45, 330 45 L 490 45 L 490 150 L 10 150 Z"
                        fill="url(#tpGlow)"
                        opacity="0.25"
                      />
                      <defs>
                        <linearGradient id="tpGlow" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#c5f57a" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#c5f57a" stopOpacity="0" />
                        </linearGradient>
                      </defs>

                      {/* Harvest Execution Beacon */}
                      <g transform="translate(330, 45)">
                        <circle r="12" fill="#c5f57a" fillOpacity="0.2" className="animate-ping" />
                        <circle r="7" fill="#07130b" stroke="#c5f57a" strokeWidth="2.5" />
                        <circle r="3" fill="#c5f57a" />
                      </g>
                      <rect x="345" y="35" width="140" height="20" rx="4" fill="#172b11" stroke="#c5f57a" strokeWidth="1" />
                      <text x="352" y="49" fill="#c5f57a" fontSize="9" fontFamily="monospace" fontWeight="bold">✓ LOCKED INTO USDC</text>
                    </svg>
                  )}

                  {activeIndex === 2 && (
                    <svg className="w-full h-full" viewBox="0 0 500 160" fill="none">
                      {/* Corridor Band Highlight */}
                      <rect x="0" y="45" width="500" height="65" fill="#34d399" fillOpacity="0.05" />
                      <line x1="0" y1="45" x2="500" y2="45" stroke="#34d399" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.5" />
                      <line x1="0" y1="110" x2="500" y2="110" stroke="#34d399" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.5" />

                      <text x="12" y="38" fill="#34d399" fontSize="9" fontFamily="monospace" fontWeight="bold">MAX HF CORRIDOR (1.70)</text>
                      <text x="12" y="123" fill="#34d399" fontSize="9" fontFamily="monospace" fontWeight="bold">MIN HF CORRIDOR (1.40)</text>

                      {/* Harmonic Equilibrium Wave */}
                      <path
                        d="M 10 75 C 60 55, 100 100, 150 65 C 200 95, 240 55, 290 85 C 340 60, 390 90, 440 70 L 490 75"
                        stroke="#34d399"
                        strokeWidth="3.5"
                        fill="none"
                        strokeLinecap="round"
                      />

                      {/* Micro rebalance nodes */}
                      <g transform="translate(150, 65)">
                        <circle r="5" fill="#07130b" stroke="#34d399" strokeWidth="2" />
                      </g>
                      <g transform="translate(290, 85)">
                        <circle r="5" fill="#07130b" stroke="#34d399" strokeWidth="2" />
                      </g>
                      <g transform="translate(440, 70)">
                        <circle r="8" fill="#34d399" fillOpacity="0.2" className="animate-ping" />
                        <circle r="5" fill="#07130b" stroke="#34d399" strokeWidth="2" />
                      </g>

                      <rect x="290" y="12" width="180" height="20" rx="4" fill="#0a2416" stroke="#34d399" strokeWidth="1" />
                      <text x="298" y="26" fill="#34d399" fontSize="9" fontFamily="monospace" fontWeight="bold">✓ PEAK YIELD OPTIMIZATION</text>
                    </svg>
                  )}
                </div>
              </div>

              {/* Bottom Interactive Simulation Controller */}
              <div className="p-4 rounded-xl bg-black/40 border border-white/[0.06] flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <span className="font-mono text-xs text-white/70 whitespace-nowrap">
                    {activeStrategy.simLabel}:
                  </span>
                  <input
                    type="range"
                    min={activeStrategy.simMin}
                    max={activeStrategy.simMax}
                    value={simValue}
                    onChange={(e) => {
                      setSimValue(Number(e.target.value))
                    }}
                    className="w-full md:w-36 accent-aegis-lime cursor-pointer"
                  />
                  <span
                    className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/60 border border-white/10"
                    style={{ color: activeStrategy.accentColor }}
                  >
                    {simValue > 0 ? `+${simValue}` : simValue}
                    {activeStrategy.simUnit}
                  </span>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="font-mono text-[10px] text-white/40">AUTO-RESPONSE:</span>
                  <span className="font-mono text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded">
                    TRIGGER ARMED
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Strategy Deep-Dive & Direct Activation (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            {/* Strategy Specs Card */}
            <div className="rounded-3xl p-6 md:p-8 bg-[#050e08]/90 border border-white/[0.08] backdrop-blur-xl flex flex-col justify-between flex-1">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.08]">
                  <span className="font-mono text-xs text-white/40 uppercase tracking-wider">
                    SPECIFICATION MATRIX
                  </span>
                  <span className="font-mono text-xs font-bold text-white">
                    MODE {activeStrategy.number} / 03
                  </span>
                </div>

                {/* Strategy Summary Description */}
                <p className="text-sm text-aegis-muted leading-relaxed mb-6">
                  {activeStrategy.description}
                </p>

                {/* 3 Metric Pills */}
                <div className="grid grid-cols-3 gap-2.5 mb-6">
                  {activeStrategy.metrics.map((metric, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-black/50 border border-white/[0.06] text-center"
                    >
                      <div className="font-mono text-[9px] text-white/40 uppercase mb-1">
                        {metric.label}
                      </div>
                      <div
                        className="font-mono text-sm font-bold tracking-tight"
                        style={{ color: activeStrategy.accentColor }}
                      >
                        {metric.value}{' '}
                        {metric.unit && (
                          <span className="text-[10px] font-normal text-white/60">
                            {metric.unit}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Technical Feature Checkpoints */}
                <div className="space-y-2.5 mb-6">
                  {activeStrategy.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs font-mono text-white/80">
                      <span
                        className="font-bold shrink-0 mt-0.5"
                        style={{ color: activeStrategy.accentColor }}
                      >
                        ✓
                      </span>
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Protocol Dispatch Footer & Direct Launch CTA */}
              <div className="pt-5 border-t border-white/[0.08] flex flex-col gap-3">
                <div className="flex items-center justify-between text-[11px] font-mono text-white/50">
                  <span>DISPATCH SPEED: <strong className="text-white">{activeStrategy.settlementSpeed}</strong></span>
                  <span>VERIFIER: <strong className="text-aegis-lime">CREDITCOIN CC3</strong></span>
                </div>

                <Link
                  to={`/app/protection?mode=${activeStrategy.key}`}
                  className="w-full py-3.5 px-6 rounded-xl font-mono text-xs font-bold text-black text-center flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_30px_rgba(168,224,99,0.25)] hover:shadow-[0_0_40px_rgba(168,224,99,0.45)] hover:brightness-110"
                  style={{ backgroundColor: activeStrategy.accentColor }}
                >
                  <span>CONFIGURE {activeStrategy.title.toUpperCase()}</span>
                  <span className="text-sm">→</span>
                </Link>
              </div>
            </div>

            {/* Quick Strategy Switch Bar */}
            <div className="grid grid-cols-3 gap-2">
              {STRATEGIES.map((strat, i) => (
                <button
                  key={strat.id}
                  onClick={() => {
                    setActiveIndex(i)
                    setIsAutoPlaying(false)
                  }}
                  className={`p-3 rounded-xl border text-left transition-all duration-300 ${
                    i === activeIndex
                      ? 'bg-[#0b1c11] border-aegis-lime shadow-[0_0_15px_rgba(168,224,99,0.15)]'
                      : 'bg-black/30 border-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <div className="font-mono text-[9px] text-white/40 mb-1">STRATEGY {strat.number}</div>
                  <div className="font-display text-xs font-bold text-white truncate">{strat.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
