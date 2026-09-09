import React from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'
import { useReducedMotion } from '../background/AmbientBackground'

// ─── CrossChainSection ────────────────────────────────────────────────────────
// Visualizes: Source Chains → AI Monitor → Attestcoin → Creditcoin
// ─────────────────────────────────────────────────────────────────────────────

const SOURCE_CHAINS = [
  { name: 'Ethereum', short: 'ETH', color: '#a8e063', status: 'active', note: 'Sepolia Testnet' },
  { name: 'Solana',   short: 'SOL', color: '#5a5a50', status: 'planned', note: 'Future — pending attestation' },
]

const PIPELINE = [
  { id: 'sources',   label: 'SOURCE CHAINS', sub: 'DeFi Positions',     color: '#a8e063', layer: 'off-chain' },
  { id: 'monitor',   label: 'AI MONITOR',    sub: 'Risk Detection',      color: '#a8e063', layer: 'off-chain' },
  { id: 'oracle',    label: 'ORACLE WORKER', sub: 'Proof Generation',    color: '#5be4c8', layer: 'off-chain' },
  { id: 'attest',    label: 'ATTESTCOIN',    sub: 'Cryptographic Verify',color: '#5be4c8', layer: 'on-chain (CC3)' },
  { id: 'settle',    label: 'CREDITCOIN',    sub: 'Settlement Layer',    color: '#5be4c8', layer: 'on-chain (CC3)' },
]

export function CrossChainSection() {
  const prefersReducedMotion = useReducedMotion()
  const [activeStep, setActiveStep] = React.useState(0)

  React.useEffect(() => {
    if (prefersReducedMotion) return
    const interval = setInterval(() => {
      setActiveStep(n => (n + 1) % PIPELINE.length)
    }, 1800)
    return () => clearInterval(interval)
  }, [prefersReducedMotion])

  return (
    <section
      id="architecture"
      className="relative section-padding"
      aria-label="Cross-chain architecture"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <ScrollReveal>
          <SectionLabel className="mb-6">Cross-Chain Architecture</SectionLabel>
          <h2 className="font-display text-display-lg font-bold text-aegis-white mb-4">
            One protection layer.
            <br />
            <span className="text-aegis-lime">Multiple chains.</span>
          </h2>
          <p className="text-aegis-off text-base max-w-xl leading-relaxed mb-16">
            Aegis monitors positions on source chains and coordinates protection through
            Creditcoin's attestation infrastructure.
          </p>
        </ScrollReveal>

        {/* Cross-chain pipeline diagram */}
        <ScrollReveal delay={100}>
          <div className="rounded-lg overflow-hidden" style={{ background: '#0a0a08', border: '1px solid #242420' }}>
            <div className="p-6 md:p-10">

              {/* Source chains row */}
              <div className="flex items-center gap-4 mb-10">
                <div className="text-label-xs font-mono text-aegis-dim tracking-widest uppercase w-20 shrink-0">
                  Source
                </div>
                <div className="flex gap-3">
                  {SOURCE_CHAINS.map(chain => (
                    <div
                      key={chain.name}
                      className="flex items-center gap-2 px-3 py-2 rounded-sm"
                      style={{
                        background: chain.status === 'active' ? '#161614' : '#0d0d0a',
                        border: `1px solid ${chain.status === 'active' ? '#242420' : '#161614'}`,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ background: chain.color }}
                      />
                      <div>
                        <div className="font-mono text-xs font-semibold" style={{ color: chain.color }}>
                          {chain.short}
                        </div>
                        <div className="font-mono text-label-xs text-aegis-muted">{chain.note}</div>
                      </div>
                      {chain.status === 'planned' && (
                        <span className="ml-1 text-label-xs font-mono text-aegis-muted uppercase tracking-wider">
                          Planned
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Vertical pipeline */}
              <div className="space-y-0">
                {PIPELINE.map((step, i) => {
                  const isActive = i === activeStep
                  const isPast = i < activeStep
                  return (
                    <div key={step.id} className="flex items-center gap-4">

                      {/* Layer label */}
                      <div className="w-20 shrink-0 text-right">
                        {(i === 0 || i === 3) && (
                          <span
                            className="text-label-xs font-mono tracking-widest uppercase"
                            style={{ color: i === 0 ? '#a8e063' : '#5be4c8', opacity: 0.6 }}
                          >
                            {i === 0 ? 'Off-Chain' : 'On-Chain'}
                          </span>
                        )}
                      </div>

                      {/* Node + connector */}
                      <div className="flex flex-col items-center w-8 shrink-0">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500"
                          style={{
                            background: isActive ? `${step.color}15` : '#111110',
                            border: `1px solid ${isActive ? step.color : isPast ? `${step.color}30` : '#242420'}`,
                            boxShadow: isActive ? `0 0 16px ${step.color}20` : 'none',
                          }}
                        >
                          <div
                            className="w-2.5 h-2.5 rounded-full transition-all duration-500"
                            style={{ background: isActive ? step.color : isPast ? `${step.color}40` : '#242420' }}
                          />
                        </div>
                        {i < PIPELINE.length - 1 && (
                          <div
                            className="w-px transition-all duration-500"
                            style={{
                              height: '2.5rem',
                              background: isPast ? step.color : '#242420',
                              opacity: isPast ? 0.4 : 0.15,
                            }}
                          />
                        )}
                      </div>

                      {/* Step content */}
                      <div
                        className="flex-1 py-2 flex items-center justify-between transition-all duration-500"
                        style={{ opacity: isActive ? 1 : isPast ? 0.5 : 0.25 }}
                      >
                        <div>
                          <div
                            className="font-mono text-xs font-semibold tracking-wider mb-0.5"
                            style={{ color: isActive ? step.color : '#5a5a50' }}
                          >
                            {step.label}
                          </div>
                          <div className="font-mono text-label-xs text-aegis-muted">{step.sub}</div>
                        </div>
                        <div
                          className="text-label-xs font-mono tracking-wider text-right hidden md:block"
                          style={{ color: isActive ? `${step.color}80` : '#3a3a34' }}
                        >
                          {step.layer}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Note on Solana */}
              <div className="mt-8 pt-6 border-t border-aegis-border/30">
                <p className="text-label-xs font-mono text-aegis-muted tracking-wide">
                  NOTE: The CC3 testnet ChainInfo precompile currently attests Ethereum Sepolia (chainKey 1)
                  and Ethereum mainnet (chainKey 3). Solana is shown as a conceptual future chain
                  and is not yet attested. · DEMO MODE
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}
