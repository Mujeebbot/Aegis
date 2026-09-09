import React from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'
import { PROTECTION_MODE_DESCRIPTIONS } from '../../types/protection'

// ─── ProtectionModesSection ───────────────────────────────────────────────────
// "CHOOSE YOUR DEFENSE." — 3 interactive mode cards
// ─────────────────────────────────────────────────────────────────────────────

const MODES = [
  {
    key: 'STOP_LOSS',
    icon: StopLossIcon,
    ...PROTECTION_MODE_DESCRIPTIONS.STOP_LOSS,
    tech: 'Health factor threshold · Auto debt repayment',
    color: '#a8e063',
  },
  {
    key: 'TAKE_PROFIT',
    icon: TakeProfitIcon,
    ...PROTECTION_MODE_DESCRIPTIONS.TAKE_PROFIT,
    tech: 'Target collateral value · Automated exit',
    color: '#a8e063',
  },
  {
    key: 'LEVERAGE_REBALANCE',
    icon: RebalanceIcon,
    ...PROTECTION_MODE_DESCRIPTIONS.LEVERAGE_REBALANCE,
    tech: 'Continuous HF monitoring · Incremental rebalancing',
    color: '#5be4c8',
  },
]

export function ProtectionModesSection() {
  const [hoveredMode, setHoveredMode] = React.useState<string | null>(null)

  return (
    <section
      id="protection"
      className="relative section-padding"
      aria-label="Protection modes"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <ScrollReveal>
          <SectionLabel className="mb-6">Protection Modes</SectionLabel>
          <h2 className="font-display text-display-lg font-bold text-aegis-white mb-4">
            Choose your defense.
          </h2>
          <p className="text-aegis-off text-base max-w-xl leading-relaxed mb-16">
            Configure exactly how Aegis should respond when risk is detected.
            Three modes for three different strategies.
          </p>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-4">
          {MODES.map((mode, i) => {
            const isHovered = hoveredMode === mode.key
            const Icon = mode.icon

            return (
              <ScrollReveal key={mode.key} delay={i * 80}>
                <div
                  className="relative flex flex-col h-full rounded-lg cursor-default overflow-hidden transition-all duration-300"
                  style={{
                    background: '#0d0d0a',
                    border: `1px solid ${isHovered ? `${mode.color}50` : '#242420'}`,
                    boxShadow: isHovered ? `0 0 32px ${mode.color}0A, 0 0 0 1px ${mode.color}20` : 'none',
                    transform: isHovered ? 'translateY(-2px)' : 'none',
                  }}
                  onMouseEnter={() => setHoveredMode(mode.key)}
                  onMouseLeave={() => setHoveredMode(null)}
                  onFocus={() => setHoveredMode(mode.key)}
                  onBlur={() => setHoveredMode(null)}
                >
                  {/* Mode diagram — top visual */}
                  <div
                    className="h-32 flex items-center justify-center relative overflow-hidden"
                    style={{ background: isHovered ? `${mode.color}06` : '#111110' }}
                  >
                    {/* Background glow */}
                    <div
                      className="absolute inset-0 transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(ellipse 60% 80% at 50% 100%, ${mode.color}12 0%, transparent 70%)`,
                        opacity: isHovered ? 1 : 0,
                      }}
                    />
                    <Icon
                      color={mode.color}
                      animated={isHovered}
                      className="w-16 h-16 relative z-10"
                    />
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-5">
                    <div
                      className="font-mono text-label-xs tracking-widest uppercase mb-3 transition-colors duration-300"
                      style={{ color: isHovered ? mode.color : '#5a5a50' }}
                    >
                      {mode.key.replace('_', ' ')}
                    </div>

                    <h3 className="font-display text-lg font-bold text-aegis-white mb-3">
                      {mode.title}
                    </h3>

                    <p className="text-sm text-aegis-dim leading-relaxed mb-4">
                      {mode.description}
                    </p>

                    {isHovered && (
                      <p className="text-xs text-aegis-off leading-relaxed mb-4 border-t border-aegis-border/40 pt-4">
                        {mode.detail}
                      </p>
                    )}

                    <div className="mt-auto pt-3 border-t border-aegis-border/30">
                      <span className="font-mono text-label-xs text-aegis-muted tracking-wide">
                        {mode.tech}
                      </span>
                    </div>
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

// ─── Mode Icons (SVG) ─────────────────────────────────────────────────────────

interface IconProps {
  color: string
  animated?: boolean
  className?: string
}

function StopLossIcon({ color, animated, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="24" stroke={color} strokeWidth="1" opacity="0.2" />
      <circle cx="32" cy="32" r="16" stroke={color} strokeWidth="1.5" opacity="0.5" />
      {/* Falling line */}
      <polyline
        points="12,20 22,28 32,24 38,38"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Stop threshold */}
      <line x1="8" y1="44" x2="56" y2="44" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
      {/* Shield at threshold */}
      <path d="M32 38 L38 41 L38 46 L32 49 L26 46 L26 41 Z" stroke={color} strokeWidth="1.5" fill="none" opacity={animated ? 1 : 0.5} />
      <text x="32" y="18" textAnchor="middle" fill={color} fontSize="7" fontFamily="JetBrains Mono" opacity="0.7">STOP</text>
    </svg>
  )
}

function TakeProfitIcon({ color, animated, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="24" stroke={color} strokeWidth="1" opacity="0.2" />
      {/* Rising line */}
      <polyline
        points="12,44 22,36 32,40 44,24"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Target threshold */}
      <line x1="8" y1="24" x2="56" y2="24" stroke={color} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
      {/* Target diamond */}
      <path d="M44 24 L49 19 L54 24 L49 29 Z" stroke={color} strokeWidth="1.5" fill="none" opacity={animated ? 1 : 0.5} />
      <text x="32" y="54" textAnchor="middle" fill={color} fontSize="7" fontFamily="JetBrains Mono" opacity="0.7">TARGET</text>
    </svg>
  )
}

function RebalanceIcon({ color, animated, className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="32" cy="32" r="24" stroke={color} strokeWidth="1" opacity="0.2" />
      <circle cx="32" cy="32" r="12" stroke={color} strokeWidth="1.5" opacity="0.4" strokeDasharray="3 4" />
      {/* Oscillating line within band */}
      <polyline
        points="12,32 18,26 24,36 30,28 36,34 42,27 52,32"
        stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      {/* Band lines */}
      <line x1="8" y1="24" x2="56" y2="24" stroke={color} strokeWidth="0.75" opacity="0.35" />
      <line x1="8" y1="40" x2="56" y2="40" stroke={color} strokeWidth="0.75" opacity="0.35" />
      <text x="32" y="18" textAnchor="middle" fill={color} fontSize="7" fontFamily="JetBrains Mono" opacity="0.7">SAFE ZONE</text>
    </svg>
  )
}
