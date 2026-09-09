import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { ScrollReveal } from '../ui/TechnicalPanel'

// ─── CTASection ───────────────────────────────────────────────────────────────

export function CTASection() {
  const navigate = useNavigate()

  return (
    <section className="relative section-padding overflow-hidden" aria-label="Final call to action">
      {/* Background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 60% at 50% 50%, rgba(168,224,99,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Orbital decoration */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <svg viewBox="0 0 800 400" className="w-full opacity-10">
          <ellipse cx="400" cy="200" rx="350" ry="160" fill="none" stroke="#a8e063" strokeWidth="0.75" strokeDasharray="4 16" />
          <ellipse cx="400" cy="200" rx="280" ry="120" fill="none" stroke="#a8e063" strokeWidth="0.5" strokeDasharray="2 24" />
        </svg>
      </div>

      <div className="max-w-4xl mx-auto px-5 md:px-8 text-center relative z-10">
        <ScrollReveal>
          <div className="inline-flex items-center gap-2 font-mono text-label-xs tracking-widest text-aegis-lime uppercase mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-aegis-lime animate-pulse" />
            System Ready
          </div>

          <h2 className="font-display text-display-xl font-bold text-aegis-white mb-6 leading-none">
            Protect your positions.
            <br />
            <span className="text-aegis-lime">Before it's too late.</span>
          </h2>

          <p className="text-aegis-off text-lg leading-relaxed mb-10 max-w-xl mx-auto">
            Launch the Aegis terminal, connect your wallet, and configure automated
            protection for your DeFi positions in minutes.
          </p>

          <div className="flex flex-wrap justify-center gap-4 mb-16">
            <Button
              variant="primary"
              size="lg"
              onClick={() => navigate('/app')}
              id="cta-launch-terminal"
            >
              Launch Aegis Terminal
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                const el = document.querySelector('#architecture')
                if (el) el.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              View Architecture
            </Button>
          </div>

          {/* Tech stack row */}
          <div className="flex flex-wrap justify-center gap-6 pt-8 border-t border-aegis-border/30">
            {[
              { label: 'Creditcoin CC3', sub: 'Settlement Layer' },
              { label: 'Attestcoin',     sub: 'Verification Protocol' },
              { label: 'The Graph',      sub: 'Position Data' },
              { label: 'Ethereum',       sub: 'Source Chain' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className="font-mono text-xs font-semibold text-aegis-off">{item.label}</div>
                <div className="font-mono text-label-xs text-aegis-muted">{item.sub}</div>
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
      className="border-t border-aegis-border/30 py-8"
      role="contentinfo"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span className="font-display text-sm font-bold text-aegis-white">AEGIS</span>
          <span className="font-mono text-label-xs text-aegis-muted ml-3 tracking-widest uppercase">
            AI-Powered DeFi Protection
          </span>
        </div>
        <div className="font-mono text-label-xs text-aegis-muted tracking-wide text-center md:text-right">
          Built for BUIDL CTC 2026 Fall Hackathon · Powered by Creditcoin
          <br />
          <span className="text-aegis-muted/60">Testnet only · Not financial advice · Demo data labeled</span>
        </div>
      </div>
    </footer>
  )
}
