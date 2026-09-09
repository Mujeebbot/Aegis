import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { SectionLabel } from '../ui/SectionLabel'
import { HeroOrbit } from '../visualizations/HeroOrbit'
import { AmbientBackground, GridOverlay, OrbitalLines } from '../background/AmbientBackground'

// ─── HeroSection ─────────────────────────────────────────────────────────────
// Cinematic hero — editorial headline + HeroOrbit visualization
// ─────────────────────────────────────────────────────────────────────────────

export function HeroSection() {
  const navigate = useNavigate()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(t)
  }, [])

  const handleAnchorClick = (e: React.MouseEvent, href: string) => {
    e.preventDefault()
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      className="relative min-h-screen flex flex-col"
      aria-label="Hero section"
    >
      {/* Background */}
      <AmbientBackground intensity="high" fixed={false} />
      <GridOverlay opacity={0.025} />
      <OrbitalLines cx={75} cy={45} />

      {/* Content */}
      <div className="relative z-10 flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-5 md:px-8 w-full pt-24 pb-16 md:pt-32 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">

            {/* Left — Text */}
            <div
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(32px)',
                transition: 'opacity 0.8s ease, transform 0.8s ease',
              }}
            >
              <SectionLabel className="mb-6" dot>
                AI-Powered Cross-Chain Protection
              </SectionLabel>

              <h1 className="font-display text-display-2xl font-bold text-aegis-white mb-6 leading-none">
                Protect your{' '}
                <span
                  className="text-aegis-lime"
                  style={{ filter: 'drop-shadow(0 0 20px rgba(168,224,99,0.4))' }}
                >
                  DeFi capital
                </span>
                <br />
                before liquidation does.
              </h1>

              <p
                className="text-base md:text-lg text-aegis-off leading-relaxed max-w-lg mb-8"
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: 'opacity 0.8s ease 0.2s',
                }}
              >
                Aegis autonomously monitors your cross-chain DeFi positions and executes
                configured protection measures through Attestcoin when liquidation risk
                is detected. Powered by Creditcoin settlement.
              </p>

              <div
                className="flex flex-wrap gap-3"
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: 'opacity 0.8s ease 0.35s',
                }}
              >
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate('/app')}
                  id="hero-launch-cta"
                  rightIcon={<ArrowRightIcon />}
                >
                  Launch Aegis Terminal
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  onClick={e => handleAnchorClick(e as React.MouseEvent, '#architecture')}
                  id="hero-arch-cta"
                >
                  Explore Architecture
                </Button>
              </div>

              {/* Technical meta row */}
              <div
                className="flex flex-wrap items-center gap-4 mt-10 pt-6 border-t border-aegis-border/40"
                style={{
                  opacity: mounted ? 1 : 0,
                  transition: 'opacity 0.8s ease 0.5s',
                }}
              >
                <TechPill label="Creditcoin CC3" />
                <TechPill label="Ethereum Sepolia" />
                <TechPill label="Attestcoin Protocol" />
                <TechPill label="The Graph" />
              </div>
            </div>

            {/* Right — Hero Orbit */}
            <div
              className="relative"
              style={{
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0)' : 'translateY(20px)',
                transition: 'opacity 1.0s ease 0.2s, transform 1.0s ease 0.2s',
              }}
            >
              <HeroOrbit className="w-full max-w-[560px] mx-auto" />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="relative z-10 flex justify-center pb-8">
        <div className="flex flex-col items-center gap-2 animate-pulse-dim">
          <span className="text-label-xs font-mono tracking-widest text-aegis-muted uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-aegis-muted to-transparent" />
        </div>
      </div>
    </section>
  )
}

function TechPill({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-label-xs font-mono tracking-wide text-aegis-subtle uppercase">
      <span className="w-1 h-1 rounded-full bg-aegis-lime/50" />
      {label}
    </span>
  )
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 7h10M8 3l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
