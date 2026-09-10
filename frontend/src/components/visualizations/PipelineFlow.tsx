import React from 'react'

// ─── PipelineFlow ─────────────────────────────────────────────────────────────
// Scroll-driven 5-step pipeline — the core Aegis narrative visual.
// Each step activates as user scrolls to it.
// ─────────────────────────────────────────────────────────────────────────────

const PIPELINE_STEPS = [
  {
    id: 'position',
    index: '01',
    title: 'Cross-Chain Position',
    description: 'Your collateralized position exists on Ethereum Sepolia — monitored in real time.',
    tech: 'The Graph · Aave V3 · Compound V3 · Morpho Blue',
    color: '#a8e063',
  },
  {
    id: 'monitor',
    index: '02',
    title: 'AI Risk Monitor',
    description: 'The AI engine queries position health every 30 seconds. When risk is detected, an alert is triggered.',
    tech: 'Health Factor · Collateral/Debt Ratios · Trend Projection',
    color: '#a8e063',
  },
  {
    id: 'attest',
    index: '03',
    title: 'Attestcoin Verification',
    description: 'A Merkle + continuity proof of the source-chain state is generated and submitted to the Attestcoin smart contract.',
    tech: '@gluwa/usc-sdk · Oracle Worker · Block Prover',
    color: '#5be4c8',
  },
  {
    id: 'settle',
    index: '04',
    title: 'Creditcoin Settlement',
    description: 'The proof is verified on-chain on CC3. The Settlement Contract executes the configured protection action.',
    tech: 'CC3 Testnet · Settlement Contract · ~15s Verification',
    color: '#5be4c8',
  },
  {
    id: 'protect',
    index: '05',
    title: 'Protection Executed',
    description: 'Debt repaid or position rebalanced before liquidation. Your capital is protected.',
    tech: 'Aave Repayment · Compound Repayment · Health Factor Restored',
    color: '#a8e063',
  },
]

interface PipelineFlowProps {
  className?: string
}

export function PipelineFlow({ className }: PipelineFlowProps) {
  const [activeSteps, setActiveSteps] = React.useState<Set<number>>(new Set())
  const stepRefs = React.useRef<(HTMLDivElement | null)[]>([])

  React.useEffect(() => {
    const observers: IntersectionObserver[] = []

    stepRefs.current.forEach((el, i) => {
      if (!el) return
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSteps(prev => new Set([...prev, i]))
          }
        },
        { threshold: 0.5, rootMargin: '0px 0px -80px 0px' }
      )
      obs.observe(el)
      observers.push(obs)
    })

    return () => observers.forEach(o => o.disconnect())
  }, [])

  return (
    <div className={['relative', className ?? ''].join(' ')}>
      {/* Vertical luminous conduit line */}
      <div
        className="absolute left-[24px] md:left-1/2 top-10 bottom-10 w-0.5 -translate-x-1/2"
        style={{
          background: 'linear-gradient(to bottom, transparent, #a8e063 15%, #5be4c8 60%, #a8e063 85%, transparent)',
          opacity: 0.35,
          boxShadow: '0 0 15px rgba(168,224,99,0.3)',
        }}
      />

      <div className="space-y-6">
        {PIPELINE_STEPS.map((step, i) => {
          const isActive = activeSteps.has(i)
          const isEven = i % 2 === 0

          return (
            <div
              key={step.id}
              ref={el => { stepRefs.current[i] = el }}
              className={[
                'relative flex md:items-center gap-6 md:gap-14 py-8 md:py-10',
                'md:flex-row',
                !isEven ? 'md:flex-row-reverse' : '',
                'transition-all duration-700',
              ].join(' ')}
              style={{
                opacity: isActive ? 1 : 0.25,
                transform: isActive ? 'none' : `translateY(16px)`,
              }}
            >
              {/* Step Central Node */}
              <div className="relative flex-shrink-0 flex items-center justify-center">
                {/* Outer pulse */}
                {isActive && (
                  <div
                    className="absolute w-16 h-16 rounded-full animate-ping-slow"
                    style={{ background: `${step.color}20` }}
                  />
                )}

                {/* Node circle */}
                <div
                  className="relative w-12 h-12 rounded-full flex items-center justify-center z-10 backdrop-blur-md"
                  style={{
                    background: isActive ? `radial-gradient(circle, ${step.color}25 0%, #07100b 90%)` : '#07100b',
                    border: `1px solid ${isActive ? step.color : 'rgba(168,224,99,0.15)'}`,
                    boxShadow: isActive ? `0 0 25px ${step.color}40` : 'none',
                    transition: 'all 0.6s ease',
                  }}
                >
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: isActive ? step.color : '#4d6955' }}
                  >
                    {step.index}
                  </span>
                </div>
              </div>

              {/* Content Panel */}
              <div className={['flex-1 max-w-lg', !isEven ? 'md:text-right' : ''].join(' ')}>
                <div
                  className="p-6 rounded-2xl glass-panel-luxury border transition-all duration-500"
                  style={{
                    borderColor: isActive ? `${step.color}40` : 'rgba(168,224,99,0.1)',
                    boxShadow: isActive ? `0 12px 35px -10px rgba(0,0,0,0.8), 0 0 20px ${step.color}15` : 'none',
                  }}
                >
                  <div
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[9px] font-mono tracking-widest uppercase mb-3"
                    style={{
                      color: isActive ? step.color : '#799280',
                      borderColor: isActive ? `${step.color}35` : 'rgba(255,255,255,0.06)',
                      background: isActive ? `${step.color}10` : 'transparent',
                    }}
                  >
                    <span className="w-1 h-1 rounded-full" style={{ background: step.color }} />
                    PHASE {step.index}
                  </div>

                  <h3
                    className="font-display text-xl md:text-2xl font-bold mb-2.5 tracking-tight"
                    style={{ color: isActive ? '#f5f8f5' : '#b2c6b7', transition: 'color 0.6s ease' }}
                  >
                    {step.title}
                  </h3>

                  <p
                    className="text-sm leading-relaxed mb-4"
                    style={{ color: isActive ? '#b2c6b7' : '#799280', transition: 'color 0.6s ease' }}
                  >
                    {step.description}
                  </p>

                  <div
                    className="pt-3 border-t border-[rgba(168,224,99,0.08)] text-[10px] font-mono tracking-wide"
                    style={{ color: isActive ? '#a8e063' : '#4d6955', transition: 'color 0.6s ease' }}
                  >
                    {step.tech}
                  </div>
                </div>
              </div>

              {/* Spacer for balanced alternating layout */}
              <div className="hidden md:block flex-1 max-w-lg" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
