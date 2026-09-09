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
      {/* Vertical connector line */}
      <div
        className="absolute left-[23px] md:left-1/2 top-8 bottom-8 w-px"
        style={{
          background: 'linear-gradient(to bottom, transparent, #a8e063 10%, #5be4c8 60%, #a8e063 90%, transparent)',
          opacity: 0.2,
        }}
      />

      <div className="space-y-0">
        {PIPELINE_STEPS.map((step, i) => {
          const isActive = activeSteps.has(i)
          const isEven = i % 2 === 0

          return (
            <div
              key={step.id}
              ref={el => { stepRefs.current[i] = el }}
              className={[
                'relative flex md:items-center gap-6 md:gap-12 py-10 md:py-14',
                'md:flex-row',
                !isEven ? 'md:flex-row-reverse' : '',
                'transition-all duration-700',
              ].join(' ')}
              style={{
                opacity: isActive ? 1 : 0.2,
                transform: isActive ? 'none' : `translateX(${isEven ? '-16px' : '16px'})`,
              }}
            >
              {/* Step node */}
              <div className="relative flex-shrink-0 flex items-center justify-center">
                {/* Outer pulse */}
                {isActive && (
                  <div
                    className="absolute w-14 h-14 rounded-full animate-ping-slow"
                    style={{ background: `${step.color}15` }}
                  />
                )}

                {/* Node circle */}
                <div
                  className="relative w-12 h-12 rounded-full flex items-center justify-center z-10"
                  style={{
                    background: isActive ? `${step.color}15` : '#111110',
                    border: `1px solid ${isActive ? step.color : '#242420'}`,
                    boxShadow: isActive ? `0 0 20px ${step.color}25` : 'none',
                    transition: 'all 0.6s ease',
                  }}
                >
                  <span
                    className="font-mono text-xs font-bold"
                    style={{ color: isActive ? step.color : '#5a5a50' }}
                  >
                    {step.index}
                  </span>
                </div>
              </div>

              {/* Content */}
              <div className={['flex-1 max-w-md', !isEven ? 'md:text-right' : ''].join(' ')}>
                <div
                  className="text-label-xs font-mono tracking-widest uppercase mb-2"
                  style={{ color: isActive ? step.color : '#3a3a34' }}
                >
                  Step {step.index}
                </div>

                <h3
                  className="font-display text-xl md:text-2xl font-bold mb-3"
                  style={{ color: isActive ? '#f4f4f0' : '#5a5a50', transition: 'color 0.6s ease' }}
                >
                  {step.title}
                </h3>

                <p
                  className="text-sm leading-relaxed mb-3"
                  style={{ color: isActive ? '#a0a090' : '#3a3a34', transition: 'color 0.6s ease' }}
                >
                  {step.description}
                </p>

                <p
                  className="text-label-xs font-mono tracking-wide"
                  style={{ color: isActive ? '#5a5a50' : '#242420', transition: 'color 0.6s ease' }}
                >
                  {step.tech}
                </p>
              </div>

              {/* Empty spacer for alternate layout */}
              <div className="hidden md:block flex-1 max-w-md" />
            </div>
          )
        })}
      </div>
    </div>
  )
}
