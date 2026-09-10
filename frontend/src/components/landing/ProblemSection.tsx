import React from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'

// ─── ProblemSection ───────────────────────────────────────────────────────────
// "LIQUIDATION DOESN'T WAIT." — Dramatic problem framing with risk visualization
// ─────────────────────────────────────────────────────────────────────────────

const PROBLEMS = [
  {
    title: '24/7 monitoring required',
    body: 'DeFi positions face liquidation risk around the clock. Price volatility doesn\'t observe business hours.',
  },
  {
    title: 'Manual response is too slow',
    body: 'By the time you notice a position approaching liquidation, it may already be too late to act effectively.',
  },
  {
    title: 'Existing solutions favor whales',
    body: 'Most protection infrastructure is built for large capital. Smaller positions are left exposed to market swings.',
  },
  {
    title: 'Cross-chain risk is invisible',
    body: 'Positions across multiple chains create blind spots. There is no unified protection layer for cross-chain DeFi portfolios.',
  },
]

export function ProblemSection() {
  const [hfValue, setHfValue] = React.useState(2.1)
  const [phase, setPhase] = React.useState<'safe' | 'warning' | 'risk' | 'aegis'>('safe')

  // Animate health factor dropping
  React.useEffect(() => {
    const sequence = [
      { delay: 0, hf: 2.1, phase: 'safe' as const },
      { delay: 2000, hf: 1.65, phase: 'safe' as const },
      { delay: 3500, hf: 1.28, phase: 'warning' as const },
      { delay: 5000, hf: 1.09, phase: 'risk' as const },
      { delay: 7000, hf: 1.09, phase: 'aegis' as const },
      { delay: 10000, hf: 2.1, phase: 'safe' as const },
    ]

    const timers: ReturnType<typeof setTimeout>[] = []
    const run = () => {
      sequence.forEach(({ delay, hf, phase: p }) => {
        timers.push(setTimeout(() => {
          setHfValue(hf)
          setPhase(p)
        }, delay))
      })
      timers.push(setTimeout(run, 11000))
    }
    run()
    return () => timers.forEach(clearTimeout)
  }, [])

  const hfColor = phase === 'safe' ? '#a8e063' : phase === 'warning' ? '#e8a040' : phase === 'risk' ? '#e05050' : '#a8e063'
  const hfLabel = phase === 'safe' ? 'SAFE' : phase === 'warning' ? 'WARNING' : phase === 'risk' ? 'AT RISK' : 'PROTECTED'

  return (
    <section
      id="product"
      className="relative section-padding overflow-hidden"
      aria-label="Problem section"
    >
      {/* Intense red ambient for risk atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-[3000ms]"
        style={{
          background: phase === 'risk'
            ? 'radial-gradient(ellipse 60% 40% at 50% 60%, rgba(224,80,80,0.08) 0%, transparent 70%)'
            : 'none',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 md:px-8">

        {/* Header */}
        <ScrollReveal>
          <SectionLabel className="mb-6" color="dim">The Problem</SectionLabel>
          <h2 className="font-display text-display-xl font-bold text-aegis-white mb-4 max-w-2xl">
            Liquidation doesn't wait.
          </h2>
          <p className="text-aegis-off text-lg max-w-xl leading-relaxed mb-16">
            Cross-chain DeFi positions require constant vigilance. Without automated protection,
            a single price move can cascade into liquidation loss.
          </p>
        </ScrollReveal>

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">

          {/* Left — Problems */}
          <div className="space-y-4">
            {PROBLEMS.map((problem, i) => (
              <ScrollReveal key={problem.title} delay={i * 100}>
                <div className="p-5 rounded-xl glass-panel-luxury border border-[rgba(168,224,99,0.1)] hover:border-[rgba(168,224,99,0.25)] transition-all duration-300 flex items-start gap-4 group">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-full bg-[rgba(168,224,99,0.08)] border border-[rgba(168,224,99,0.25)] flex items-center justify-center group-hover:border-aegis-lime/60 group-hover:shadow-[0_0_12px_rgba(168,224,99,0.3)] transition-all">
                      <span className="font-mono text-xs text-aegis-lime font-bold">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-display text-base font-semibold text-aegis-white mb-1.5 group-hover:text-aegis-lime transition-colors">
                      {problem.title}
                    </h3>
                    <p className="text-sm text-aegis-off leading-relaxed">{problem.body}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>

          {/* Right — Animated Risk Visualization Instrument */}
          <ScrollReveal delay={200}>
            <div
              className="relative rounded-2xl overflow-hidden glass-panel-luxury p-1"
              style={{
                borderColor: phase === 'risk' ? '#e05050' : phase === 'warning' ? '#e8a040' : 'rgba(168,224,99,0.16)',
                boxShadow: phase === 'risk' ? '0 0 50px rgba(224,80,80,0.18)' : '0 16px 40px -12px rgba(0,0,0,0.8)',
                transition: 'border-color 1s ease, box-shadow 1s ease',
              }}
            >
              {/* Panel header */}
              <div className="px-5 py-3.5 border-b border-[rgba(168,224,99,0.1)] bg-[rgba(13,29,19,0.4)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-2 h-2 rounded-full animate-pulse"
                    style={{ background: hfColor, boxShadow: `0 0 8px ${hfColor}` }}
                  />
                  <span className="font-mono text-[10px] text-aegis-white font-semibold tracking-widest uppercase">
                    POSITION TELEMETRY
                  </span>
                </div>
                <span
                  className="font-mono text-[10px] font-bold tracking-widest uppercase px-2.5 py-0.5 rounded-full border"
                  style={{
                    color: hfColor,
                    borderColor: `${hfColor}40`,
                    background: `${hfColor}15`,
                    transition: 'all 1s ease',
                  }}
                >
                  {hfLabel}
                </span>
              </div>

              <div className="p-6">
                {/* Protocol info */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-label-xs font-mono text-aegis-dim tracking-widest uppercase mb-1">Position</div>
                    <div className="font-display text-base font-semibold text-aegis-white">Aave V3 / ETH Sepolia</div>
                    <div className="font-mono text-xs text-aegis-subtle mt-0.5">wETH collateral · USDC debt</div>
                  </div>
                  <div className="text-right">
                    <div className="text-label-xs font-mono text-aegis-dim tracking-widest uppercase mb-1">Protection</div>
                    <div
                      className="font-mono text-xs"
                      style={{ color: phase === 'aegis' ? '#a8e063' : '#5a5a50' }}
                    >
                      {phase === 'aegis' ? '✓ AEGIS ACTIVE' : 'NOT CONFIGURED'}
                    </div>
                  </div>
                </div>

                {/* Health Factor large display */}
                <div className="text-center py-6 relative">
                  <div className="text-label-xs font-mono tracking-widest text-aegis-dim uppercase mb-2">Health Factor</div>
                  <div
                    className="font-display font-bold mb-2"
                    style={{
                      fontSize: '4rem',
                      lineHeight: 1,
                      color: hfColor,
                      filter: `drop-shadow(0 0 20px ${hfColor}40)`,
                      transition: 'color 1s ease, filter 1s ease',
                    }}
                  >
                    {hfValue.toFixed(2)}
                  </div>

                  {/* Progress bar */}
                  <div className="relative h-2 bg-aegis-raised rounded-full mx-4 mb-1 overflow-visible">
                    <div
                      className="h-full rounded-full transition-all duration-[2000ms]"
                      style={{
                        width: `${Math.min(((hfValue - 1.0) / 2.0) * 100, 100)}%`,
                        backgroundColor: hfColor,
                        boxShadow: `0 0 8px ${hfColor}60`,
                      }}
                    />
                    {/* Liquidation threshold line */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-4"
                      style={{ left: '2.5%', background: '#e05050', borderRadius: '1px' }}
                    />
                    {/* Warning threshold */}
                    <div
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-0.5 h-3"
                      style={{ left: '27%', background: '#e8a040', borderRadius: '1px' }}
                    />
                  </div>
                  <div className="flex justify-between px-4 text-label-xs font-mono text-aegis-muted">
                    <span>1.05 LIQD</span>
                    <span>1.50 WARN</span>
                    <span>3.00 MAX</span>
                  </div>

                  {/* Aegis intervention overlay */}
                  {phase === 'aegis' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-aegis-black/70 rounded">
                      <div className="text-center">
                        <div
                          className="font-mono text-label-sm tracking-widest text-aegis-lime mb-1"
                          style={{ filter: 'drop-shadow(0 0 8px rgba(168,224,99,0.6))' }}
                        >
                          ◉ AEGIS DETECTED RISK
                        </div>
                        <div className="font-mono text-xs text-aegis-lime-dim">
                          Protection triggered · Proof generating
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Demo label */}
                <div className="text-center mt-2">
                  <span className="font-mono text-label-xs text-aegis-muted tracking-widest uppercase">
                    Demo visualization · Not live data
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
