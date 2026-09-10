import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { ScrollReveal } from '../ui/TechnicalPanel'

// ─── CTASection ───────────────────────────────────────────────────────────────
// Luxury terminal launcher & high-end dark green footer
// ─────────────────────────────────────────────────────────────────────────────

export function CTASection() {
  const navigate = useNavigate()

  return (
    <section className="relative section-padding overflow-hidden" aria-label="Final call to action">
      {/* Volumetric Emerald Core Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[500px] pointer-events-none opacity-25 blur-[140px]"
        style={{
          background: 'radial-gradient(ellipse at center, #a8e063 0%, #0c2014 50%, transparent 80%)',
        }}
      />

      <div className="max-w-5xl mx-auto px-5 md:px-8 text-center relative z-10">
        <ScrollReveal>
          <div className="inline-flex items-center gap-2 font-mono text-[11px] tracking-widest text-aegis-lime uppercase mb-8 px-3.5 py-1.5 rounded-full bg-[#0b1b11] border border-aegis-border-emerald shadow-[0_0_15px_rgba(168,224,99,0.15)]">
            <span className="w-2 h-2 rounded-full bg-aegis-lime animate-pulse" />
            <span>Autonomous Protocol Ready</span>
          </div>

          <h2 className="font-display text-display-xl font-bold text-white mb-6 leading-tight tracking-tight">
            Protect your capital.
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-aegis-lime via-[#c5f57a] to-emerald-400">
              Before liquidation strikes.
            </span>
          </h2>

          <p className="text-aegis-muted text-lg leading-relaxed mb-10 max-w-2xl mx-auto">
            Launch the Aegis terminal to inspect your active collateral loans across Aave V3 and Morpho, simulate protection policies, and activate non-custodial execution on Creditcoin CC3.
          </p>

          <div className="flex flex-wrap justify-center items-center gap-4 mb-16">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/app')}
              id="cta-launch-terminal"
              className="shadow-[0_0_30px_rgba(168,224,99,0.35)]"
            >
              Launch Aegis Terminal →
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const el = document.querySelector('#architecture')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              Inspect Architecture
            </Button>
          </div>

          {/* Luxury Infrastructure Metric Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-10 border-t border-white/[0.08]">
            {[
              { label: 'Creditcoin CC3', sub: 'Chain ID 102031' },
              { label: 'Attestcoin ASC', sub: 'Merkle Trie Prover' },
              { label: 'The Graph', sub: '30s Position Telemetry' },
              { label: 'Ethereum Sepolia', sub: 'Non-Custodial Source' },
            ].map(item => (
              <div key={item.label} className="p-4 rounded-xl bg-[#07130a]/60 border border-white/[0.05]">
                <div className="font-mono text-xs font-bold text-white mb-1">{item.label}</div>
                <div className="font-mono text-[11px] text-aegis-muted">{item.sub}</div>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

export function Footer() {
  return (
    <footer
      className="border-t border-white/[0.06] bg-[#040805] py-12 relative z-10"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-aegis-lime/10 border border-aegis-lime/40 flex items-center justify-center font-mono font-bold text-aegis-lime text-xs">
            AE
          </div>
          <span className="font-display text-base font-bold text-white tracking-wider">AEGIS</span>
          <span className="text-white/20">|</span>
          <span className="font-mono text-[11px] text-aegis-muted uppercase tracking-widest">
            AI-Powered DeFi Defense
          </span>
        </div>
        <div className="font-mono text-[11px] text-aegis-muted tracking-wide text-center md:text-right space-y-1">
          <div>Built for BUIDL CTC 2026 Fall Hackathon · Powered by Creditcoin CC3</div>
          <div className="text-white/30 text-[10px]">
            Testnet only · Non-custodial smart contracts · Zero simulated liquidation risk
          </div>
        </div>
      </div>
    </footer>
  )
}
