import React from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'

// ─── TrustSection ─────────────────────────────────────────────────────────────
// "YOUR CAPITAL. YOUR CONTROL." — Non-custodial architecture visual
// ─────────────────────────────────────────────────────────────────────────────

const CAN_DO = [
  'Protect positions at configured thresholds',
  'Repay debt to restore health factor',
  'Rebalance collateral within set parameters',
  'Execute configured protection actions only',
]

const CANNOT_DO = [
  'Take custody of your funds',
  'Act outside the configured protection scope',
  'Execute without cryptographic proof verification',
  'Override your configured permissions',
]

export function TrustSection() {
  return (
    <section className="relative section-padding" aria-label="Non-custodial architecture">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left — Text */}
          <ScrollReveal>
            <SectionLabel className="mb-6">Non-Custodial</SectionLabel>
            <h2 className="font-display text-display-lg font-bold text-aegis-white mb-6">
              Your capital.
              <br />
              <span className="text-aegis-lime">Your control.</span>
            </h2>
            <p className="text-aegis-off text-base leading-relaxed mb-8">
              Aegis operates within a defined permission boundary. You delegate limited,
              specific permissions — and Aegis never takes custody of your funds.
            </p>
            <p className="text-aegis-dim text-sm leading-relaxed">
              Every protection action is verified cryptographically through Attestcoin
              before execution. No action happens outside the scope you configure.
            </p>
          </ScrollReveal>

          {/* Right — Permission boundary visual */}
          <ScrollReveal delay={120}>
            <div className="relative">
              {/* Outer boundary — YOUR CAPITAL */}
              <div
                className="relative rounded-xl p-1 overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, rgba(168,224,99,0.08) 0%, rgba(168,224,99,0.02) 100%)',
                  border: '1px solid rgba(168,224,99,0.2)',
                  boxShadow: '0 0 60px rgba(168,224,99,0.04)',
                }}
              >
                <div className="absolute top-3 left-1/2 -translate-x-1/2">
                  <span className="font-mono text-label-xs text-aegis-lime/60 tracking-widest uppercase">
                    Your Capital
                  </span>
                </div>

                <div className="pt-8 pb-3 px-3 space-y-3">
                  {/* Inner boundary — AEGIS PERMISSION SCOPE */}
                  <div
                    className="relative rounded-lg p-4"
                    style={{
                      background: '#0d0d0a',
                      border: '1px solid #242420',
                    }}
                  >
                    <div className="text-center mb-4">
                      <span className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase">
                        Aegis Permission Scope
                      </span>
                    </div>

                    {/* CAN / CANNOT grid */}
                    <div className="grid grid-cols-2 gap-3">
                      {/* CAN */}
                      <div className="rounded-sm p-3" style={{ background: '#111110', border: '1px solid rgba(168,224,99,0.12)' }}>
                        <div className="font-mono text-label-xs text-aegis-lime tracking-widest uppercase mb-3">
                          Aegis Can
                        </div>
                        <ul className="space-y-2">
                          {CAN_DO.map(item => (
                            <li key={item} className="flex items-start gap-1.5 text-xs text-aegis-off">
                              <span className="text-aegis-lime mt-0.5 shrink-0">✓</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* CANNOT */}
                      <div className="rounded-sm p-3" style={{ background: '#111110', border: '1px solid rgba(224,80,80,0.12)' }}>
                        <div className="font-mono text-label-xs text-aegis-red/60 tracking-widest uppercase mb-3">
                          Aegis Cannot
                        </div>
                        <ul className="space-y-2">
                          {CANNOT_DO.map(item => (
                            <li key={item} className="flex items-start gap-1.5 text-xs text-aegis-dim">
                              <span className="text-aegis-red/50 mt-0.5 shrink-0">×</span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Attestcoin proof layer */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 rounded-sm"
                    style={{ background: '#0a0a08', border: '1px solid rgba(91,228,200,0.15)' }}
                  >
                    <div className="w-2 h-2 rounded-full bg-aegis-cyan shrink-0" />
                    <span className="font-mono text-xs text-aegis-cyan/70 tracking-wide">
                      All actions verified via Attestcoin cryptographic proof
                    </span>
                  </div>
                </div>
              </div>

              {/* Orbital protection rings */}
              <div className="absolute -inset-6 pointer-events-none">
                <svg className="w-full h-full" viewBox="0 0 400 350">
                  <ellipse cx="200" cy="175" rx="185" ry="160" fill="none" stroke="#a8e063" strokeWidth="0.5" strokeDasharray="4 12" opacity="0.08" />
                  <ellipse cx="200" cy="175" rx="195" ry="170" fill="none" stroke="#a8e063" strokeWidth="0.25" strokeDasharray="2 20" opacity="0.05" />
                </svg>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
