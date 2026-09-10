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

          {/* Right — Luxury Live Telemetry Command Panel */}
          <ScrollReveal delay={150}>
            <div
              className="relative rounded-2xl overflow-hidden glass-panel-luxury border border-[rgba(168,224,99,0.16)] shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
            >
              {/* Luminous Scanning line animation across the panel */}
              <div
                className="absolute inset-x-0 h-0.5 pointer-events-none z-20"
                style={{
                  background: 'linear-gradient(to right, transparent, rgba(168,224,99,0.65), transparent)',
                  top: scanPulse ? '100%' : '0%',
                  transition: scanPulse ? 'top 0.7s ease' : 'none',
                  opacity: scanPulse ? 1 : 0,
                  boxShadow: '0 0 12px rgba(168,224,99,0.5)',
                }}
              />

              {/* Console Header */}
              <div className="px-6 py-4 border-b border-[rgba(168,224,99,0.1)] bg-[rgba(13,29,19,0.5)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-aegis-lime shadow-[0_0_8px_#a8e063]" />
                    <div className="absolute w-4 h-4 rounded-full bg-aegis-lime animate-ping-slow opacity-30" />
                  </div>
                  <span className="font-mono text-xs font-bold text-aegis-white tracking-widest uppercase">
                    AI RISK ENGINE
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[9px] px-2 py-0.5 rounded-full bg-aegis-lime/10 border border-aegis-lime/30 text-aegis-lime font-semibold uppercase tracking-wider">
                    MONITORING
                  </span>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Primary Telemetry Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-[rgba(7,16,11,0.7)] border border-[rgba(168,224,99,0.08)]">
                    <span className="text-[9px] font-mono tracking-widest text-aegis-muted uppercase block mb-1">HEALTH FACTOR</span>
                    <span className="font-display text-2xl font-bold text-aegis-lime tabular-nums tracking-tight">1.82</span>
                    <span className="text-[9px] font-mono text-[#589e24] block mt-0.5">● SAFE BUFFER</span>
                  </div>
                  <div className="p-3.5 rounded-xl bg-[rgba(7,16,11,0.7)] border border-[rgba(168,224,99,0.08)]">
                    <span className="text-[9px] font-mono tracking-widest text-aegis-muted uppercase block mb-1">LAST SCAN</span>
                    <span className="font-mono text-2xl font-bold text-aegis-white tabular-nums tracking-tight">{scanSeconds}s</span>
                    <span className="text-[9px] font-mono text-aegis-off block mt-0.5">30s CADENCE</span>
                  </div>
                </div>

                {/* Primary Monitored Target */}
                <div className="p-4 rounded-xl bg-[rgba(13,29,19,0.4)] border border-[rgba(168,224,99,0.12)] flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-aegis-muted tracking-widest uppercase block mb-0.5">PRIMARY MONITORED POSITION</span>
                    <span className="font-display text-sm font-semibold text-aegis-white">Aave V3 / Ethereum Sepolia</span>
                    <span className="text-[10px] font-mono text-aegis-off block mt-0.5">Collateral: 2.50 wETH · Debt: 3,400 USDC</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-mono text-aegis-lime border border-aegis-lime/30 bg-aegis-lime/10 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                      AEGIS ARMED
                    </span>
                  </div>
                </div>

                {/* Monitored positions table */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[9px] font-mono text-aegis-muted tracking-widest uppercase px-1">
                    <span>PORTFOLIO POSITIONS</span>
                    <span>HEALTH RATIO</span>
                  </div>
                  {[
                    { id: 'demo-pos-001', label: 'Aave V3', chain: 'Sepolia', hf: 1.82, state: 'SAFE' },
                    { id: 'demo-pos-002', label: 'Compound V3', chain: 'Sepolia', hf: 1.42, state: 'WARNING' },
                    { id: 'demo-pos-003', label: 'Morpho Blue', chain: 'Sepolia', hf: 1.19, state: 'AT_RISK' },
                  ].map(pos => (
                    <div
                      key={pos.id}
                      className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[rgba(7,16,11,0.5)] border border-[rgba(168,224,99,0.06)] hover:border-[rgba(168,224,99,0.18)] transition-all"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{
                          background: pos.state === 'SAFE' ? '#a8e063' : pos.state === 'WARNING' ? '#e8a040' : '#e05050'
                        }} />
                        <span className="font-mono text-xs text-aegis-white font-medium">{pos.label}</span>
                        <span className="text-[9px] font-mono text-aegis-muted">({pos.chain})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold tabular-nums" style={{
                          color: pos.state === 'SAFE' ? '#a8e063' : pos.state === 'WARNING' ? '#e8a040' : '#e05050'
                        }}>
                          HF {pos.hf.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Demo Notice Bar */}
              <div className="px-6 py-3 border-t border-[rgba(168,224,99,0.08)] bg-[rgba(5,8,6,0.6)] text-center">
                <span className="font-mono text-[9px] text-aegis-muted tracking-widest uppercase">
                  DEMO VISUALIZATION · LIVE TELEMETRY SIMULATION
                </span>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  )
}
