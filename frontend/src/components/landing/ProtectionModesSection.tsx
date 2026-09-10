import React from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'
import { Link } from 'react-router-dom'

// ─── ProtectionModesSection ───────────────────────────────────────────────────
// "CHOOSE YOUR DEFENSE" — 3 Luxury Protection Mode Cards
// STOP-LOSS · TAKE-PROFIT · LEVERAGE REBALANCE
// ─────────────────────────────────────────────────────────────────────────────

interface ProtectionModeCard {
  key: string
  tag: string
  title: string
  color: string
  triggerCondition: string
  actionSummary: string
  description: string
  technicalDetails: string[]
  metrics: { label: string; value: string }
  svgDiagram: (color: string, isHovered: boolean) => React.ReactNode
}

const PROTECTION_MODES: ProtectionModeCard[] = [
  {
    key: 'STOP_LOSS',
    tag: 'EMERGENCY LIQUIDATION SHIELD',
    title: 'Stop-Loss Defense',
    color: '#a8e063',
    triggerCondition: 'Health Factor drops below threshold (e.g. 1.15)',
    actionSummary: 'Autonomous debt repayment using pre-approved collateral buffer',
    description:
      'Prevents catastrophic liquidation cascades when market collateral prices crash. Aegis detects the decaying health factor and triggers partial debt repayment to restore safety margin before third-party liquidators penalize your position.',
    technicalDetails: [
      'Configurable HF trigger: 1.05 to 1.30',
      'Auto-swap collateral or flash-repay debt',
      'Saves up to 10% liquidation penalty fees',
      'Verified on-chain via Creditcoin ASC',
    ],
    metrics: { label: 'Default Trigger', value: 'HF < 1.15' },
    svgDiagram: (color, isHovered) => (
      <svg className="w-full h-32" viewBox="0 0 280 120" fill="none">
        {/* Background Grid */}
        <line x1="0" y1="90" x2="280" y2="90" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
        <line x1="0" y1="60" x2="280" y2="60" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
        <line x1="0" y1="30" x2="280" y2="30" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />

        {/* Liquidation Threshold Line */}
        <line x1="0" y1="85" x2="280" y2="85" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.6" />
        <text x="8" y="80" fill="#ef4444" fontSize="9" fontFamily="monospace" opacity="0.8">LIQUIDATION (1.00)</text>

        {/* Protection Trigger Threshold */}
        <line x1="0" y1="60" x2="280" y2="60" stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.5" />
        <text x="8" y="55" fill={color} fontSize="9" fontFamily="monospace">AEGIS TRIGGER (1.15)</text>

        {/* Trajectory: dropping then bouncing up due to repayment */}
        <path
          d="M 10 20 C 60 25, 90 40, 130 60 C 145 68, 160 55, 200 35 C 240 20, 260 22, 275 24"
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Intervention Node Point */}
        <circle cx="130" cy="60" r="5" fill="#0b1b11" stroke={color} strokeWidth="2" />
        <circle cx="130" cy="60" r="2" fill={color} />

        {isHovered && (
          <circle cx="130" cy="60" r="10" stroke={color} strokeWidth="1" strokeOpacity="0.5" className="animate-ping" />
        )}
      </svg>
    ),
  },
  {
    key: 'TAKE_PROFIT',
    tag: 'CAPITAL PRESERVATION',
    title: 'Take-Profit Harvest',
    color: '#c5f57a',
    triggerCondition: 'Collateral reaches target appreciation (e.g. +35%)',
    actionSummary: 'Automated debt unwind & collateral profit lock into stablecoins',
    description:
      'Locks in leveraged asset upside automatically. When your collateral value hits the upside profit target, Aegis safely unwinds the borrow loop, pays off outstanding debt, and secures gains in USDC without leaving you exposed to market reversals.',
    technicalDetails: [
      'Upside profit target: +10% to +200%',
      'Unwinds looping leverage safely',
      'Swaps collateral profit to USDC / USDT',
      'Non-custodial dispatch via CC3',
    ],
    metrics: { label: 'Target Harvest', value: '+35.0% GAIN' },
    svgDiagram: (color, isHovered) => (
      <svg className="w-full h-32" viewBox="0 0 280 120" fill="none">
        {/* Background Grid */}
        <line x1="0" y1="90" x2="280" y2="90" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
        <line x1="0" y1="60" x2="280" y2="60" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />
        <line x1="0" y1="30" x2="280" y2="30" stroke="#ffffff" strokeOpacity="0.05" strokeDasharray="3 3" />

        {/* Take Profit Target Line */}
        <line x1="0" y1="35" x2="280" y2="35" stroke={color} strokeWidth="1" strokeDasharray="4 4" strokeOpacity="0.7" />
        <text x="8" y="30" fill={color} fontSize="9" fontFamily="monospace">PROFIT TARGET (+35%)</text>

        {/* Trajectory: Rising smoothly until harvest */}
        <path
          d="M 10 95 C 50 90, 80 80, 120 60 C 150 45, 170 35, 185 35 L 275 35"
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Harvest Node */}
        <circle cx="185" cy="35" r="5" fill="#0b1b11" stroke={color} strokeWidth="2" />
        <circle cx="185" cy="35" r="2" fill={color} />

        {isHovered && (
          <circle cx="185" cy="35" r="10" stroke={color} strokeWidth="1" strokeOpacity="0.5" className="animate-ping" />
        )}
      </svg>
    ),
  },
  {
    key: 'LEVERAGE_REBALANCE',
    tag: 'CONTINUOUS EQUILIBRIUM',
    title: 'Leverage Rebalance',
    color: '#5be4c8',
    triggerCondition: 'Health Factor drifts outside configured optimal band',
    actionSummary: 'Dynamic micro-adjustments maintaining optimal capital efficiency',
    description:
      'Ideal for active yield farmers and looped collateral strategies. Aegis maintains your position within a safe health corridor (e.g. 1.40 to 1.70), automatically repaying or re-borrowing in micro-increments to maximize APY while suppressing liquidation risk.',
    technicalDetails: [
      'Corridor bounds: Min 1.30 / Max 1.80',
      'Dynamic borrowing & repayment loop',
      'Prevents over-collateralized yield drag',
      'Cryptographic continuity verification',
    ],
    metrics: { label: 'Optimal Band', value: '1.40 — 1.70 HF' },
    svgDiagram: (color, isHovered) => (
      <svg className="w-full h-32" viewBox="0 0 280 120" fill="none">
        {/* Background Corridor Band */}
        <rect x="0" y="35" width="280" height="45" fill={color} fillOpacity="0.04" />
        <line x1="0" y1="35" x2="280" y2="35" stroke={color} strokeWidth="0.75" strokeDasharray="3 3" strokeOpacity="0.4" />
        <line x1="0" y1="80" x2="280" y2="80" stroke={color} strokeWidth="0.75" strokeDasharray="3 3" strokeOpacity="0.4" />
        <text x="8" y="30" fill={color} fontSize="9" fontFamily="monospace" opacity="0.8">MAX HF (1.70)</text>
        <text x="8" y="93" fill={color} fontSize="9" fontFamily="monospace" opacity="0.8">MIN HF (1.40)</text>

        {/* Oscillating trajectory kept inside the corridor */}
        <path
          d="M 10 60 C 40 40, 70 75, 100 50 C 130 70, 160 45, 190 65 C 220 50, 250 60, 275 55"
          stroke={color}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
        />

        {/* Equilibrium Nodes */}
        <circle cx="100" cy="50" r="4" fill="#0b1b11" stroke={color} strokeWidth="1.5" />
        <circle cx="190" cy="65" r="4" fill="#0b1b11" stroke={color} strokeWidth="1.5" />

        {isHovered && (
          <circle cx="190" cy="65" r="9" stroke={color} strokeWidth="1" strokeOpacity="0.5" className="animate-ping" />
        )}
      </svg>
    ),
  },
]

export function ProtectionModesSection() {
  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null)

  return (
    <section
      id="protection"
      className="relative section-padding overflow-hidden"
      aria-label="Protection modes"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 relative z-10">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
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
              Every loan position is unique. Configure autonomous defense triggers that align with your risk tolerance, borrowing rate, and leverage strategy.
            </p>
          </div>
        </ScrollReveal>

        {/* 3 Luxury Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PROTECTION_MODES.map((mode, i) => {
            const isHovered = hoveredKey === mode.key

            return (
              <ScrollReveal key={mode.key} delay={i * 90}>
                <div
                  onMouseEnter={() => setHoveredKey(mode.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`flex flex-col h-full rounded-2xl glass-panel-luxury p-6 relative overflow-hidden transition-all duration-300 border ${
                    isHovered
                      ? 'border-aegis-lime shadow-[0_0_30px_rgba(168,224,99,0.18)] translate-y-[-4px]'
                      : 'border-aegis-border-emerald hover:border-aegis-lime/40'
                  }`}
                >
                  {/* Top Badge & Metric */}
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/[0.06]">
                    <span className="font-mono text-[10px] text-aegis-lime uppercase tracking-widest font-semibold">
                      {mode.tag}
                    </span>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/50 border border-white/[0.08] text-white">
                      {mode.metrics.value}
                    </span>
                  </div>

                  {/* Title & Trigger Condition */}
                  <h3 className="font-display text-xl font-bold text-white mb-1.5">
                    {mode.title}
                  </h3>
                  <div className="font-mono text-xs text-white/50 mb-4 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: mode.color }} />
                    {mode.triggerCondition}
                  </div>

                  {/* Interactive Visual Trajectory Diagram */}
                  <div className="p-3 rounded-xl bg-[#061109] border border-white/[0.06] mb-5">
                    {mode.svgDiagram(mode.color, isHovered)}
                  </div>

                  {/* Description */}
                  <p className="text-sm text-aegis-muted leading-relaxed mb-6">
                    {mode.description}
                  </p>

                  {/* Technical Feature Checkpoints */}
                  <div className="space-y-2 mb-6 pt-4 border-t border-white/[0.06] flex-1">
                    {mode.technicalDetails.map((detail, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs font-mono text-white/80">
                        <span className="text-aegis-lime shrink-0">✓</span>
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Summary & Configure Link */}
                  <div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
                    <span className="font-mono text-[10px] text-white/40 uppercase">
                      NON-CUSTODIAL DISPATCH
                    </span>
                    <Link
                      to={`/app/protection?mode=${mode.key}`}
                      className="font-mono text-xs font-semibold text-aegis-lime hover:underline flex items-center gap-1"
                    >
                      Configure Mode →
                    </Link>
                  </div>
                </div>
              </ScrollReveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
