import React from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'
import { StatusBadge } from '../ui/StatusBadge'

// ─── AIMonitorSection ─────────────────────────────────────────────────────────

export function AIMonitorSection() {
  const [scanSeconds, setScanSeconds] = React.useState(12)
  const [scanPulse, setScanPulse] = React.useState(false)

  // Simulate the 30-second scan cycle
  React.useEffect(() => {
    const interval = setInterval(() => {
      setScanSeconds(s => {
        if (s <= 1) {
          setScanPulse(true)
          setTimeout(() => setScanPulse(false), 600)
          return 30
        }
        return s - 1
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative section-padding" aria-label="AI Risk Monitor">
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

          {/* Left text */}
          <ScrollReveal>
            <SectionLabel className="mb-6">AI Risk Engine</SectionLabel>
            <h2 className="font-display text-display-lg font-bold text-aegis-white mb-6">
              Always watching.
              <br />
              <span className="text-aegis-lime">Never sleeping.</span>
            </h2>
            <p className="text-aegis-off text-base leading-relaxed mb-6">
              The Aegis AI risk monitor continuously queries position data from
              The Graph subgraphs every 30 seconds, tracking health factor, collateral
              ratios, and debt levels across monitored positions.
            </p>

            <ul className="space-y-3">
              {[
                'Position health factor tracking',
                'Collateral/debt ratio monitoring',
                'Trend-based liquidation risk prediction',
                'Instant alert generation on threshold breach',
                'Oracle worker proof pipeline trigger',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-sm text-aegis-off">
                  <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-aegis-lime shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-5 border-t border-aegis-border/40">
              <span className="font-mono text-label-xs text-aegis-muted tracking-widest uppercase">
                Poll interval: 30 seconds · Data: The Graph · Protocols: Aave V3 · Compound V3 · Morpho Blue
              </span>
            </div>
          </ScrollReveal>

          {/* Right — Live-feeling monitor panel */}
          <ScrollReveal delay={150}>
            <div
              className="relative rounded-lg overflow-hidden"
              style={{ background: '#0d0d0a', border: '1px solid #242420' }}
            >
              {/* Scanning line animation */}
              <div
                className="absolute inset-x-0 h-px pointer-events-none z-10 transition-all duration-300"
                style={{
                  background: 'linear-gradient(to right, transparent, rgba(168,224,99,0.4), transparent)',
                  top: scanPulse ? '100%' : '0%',
                  transition: scanPulse ? 'top 0.6s ease' : 'none',
                  opacity: scanPulse ? 1 : 0,
                }}
              />

              {/* Header */}
              <div className="px-5 py-4 border-b border-aegis-border flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-aegis-lime" />
                    <div className="absolute inset-0 rounded-full bg-aegis-lime animate-ping-slow opacity-40" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-aegis-lime tracking-wider uppercase">
                    AI Risk Engine
                  </span>
                </div>
                <StatusBadge state="MONITORING" size="sm" pulse />
              </div>

              <div className="p-5 space-y-5">
                {/* Scan timer */}
                <div
                  className="flex items-center justify-between px-4 py-3 rounded-sm"
                  style={{
                    background: scanPulse ? 'rgba(168,224,99,0.05)' : '#111110',
                    border: `1px solid ${scanPulse ? 'rgba(168,224,99,0.2)' : '#1c1c19'}`,
                    transition: 'background 0.3s ease, border-color 0.3s ease',
                  }}
                >
                  <span className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase">Last scan</span>
                  <span className="font-mono text-sm font-semibold text-aegis-white tabular-nums">
                    {scanSeconds}s ago
                  </span>
                </div>

                {/* Metrics */}
                {[
                  { label: 'Positions monitored', value: '03', color: '#a8e063' },
                  { label: 'Risk state',           value: 'SAFE', color: '#a8e063' },
                  { label: 'Pending alerts',       value: '01',   color: '#e8a040' },
                  { label: 'Next scan',            value: `${30 - scanSeconds}s`, color: '#5a5a50' },
                ].map(metric => (
                  <div
                    key={metric.label}
                    className="flex items-center justify-between border-b border-aegis-border/30 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="font-mono text-xs text-aegis-dim tracking-wide">{metric.label}</span>
                    <span className="font-mono text-sm font-semibold tabular-nums" style={{ color: metric.color }}>
                      {metric.value}
                    </span>
                  </div>
                ))}

                {/* Monitored positions mini-list */}
                <div className="space-y-2 pt-1">
                  <div className="text-label-xs font-mono text-aegis-dim tracking-widest uppercase mb-3">Positions</div>
                  {[
                    { id: 'demo-pos-001', label: 'Aave V3',       hf: 1.82, state: 'SAFE' },
                    { id: 'demo-pos-002', label: 'Compound V3',   hf: 1.42, state: 'WARNING' },
                    { id: 'demo-pos-003', label: 'Morpho Blue',   hf: 1.19, state: 'AT_RISK' },
                  ].map(pos => (
                    <div
                      key={pos.id}
                      className="flex items-center justify-between px-3 py-2 rounded-sm"
                      style={{ background: '#111110', border: '1px solid #1c1c19' }}
                    >
                      <span className="font-mono text-xs text-aegis-off">{pos.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs tabular-nums" style={{
                          color: pos.state === 'SAFE' ? '#a8e063' : pos.state === 'WARNING' ? '#e8a040' : '#e05050'
                        }}>
                          HF {pos.hf.toFixed(2)}
                        </span>
                        <div
                          className="w-1.5 h-1.5 rounded-full"
                          style={{
                            background: pos.state === 'SAFE' ? '#a8e063' : pos.state === 'WARNING' ? '#e8a040' : '#e05050'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo label */}
              <div className="px-5 pb-4 text-center">
                <span className="font-mono text-label-xs text-aegis-muted tracking-widest uppercase">
                  Demo Mode · Not live data
                </span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
