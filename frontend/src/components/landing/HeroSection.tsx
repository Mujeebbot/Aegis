import React from 'react'
import { useNavigate } from 'react-router-dom'
import { HeroMonument3D } from '../visualizations/HeroMonument3D'

// ─── HeroSection ─────────────────────────────────────────────────────────────
// Exact match to reference hero section:
// Headline, 3 Bullet points, Dual CTAs, 3D Defense Monument with 6 Callouts, and Bottom Integration Strip
// ─────────────────────────────────────────────────────────────────────────────

export function HeroSection() {
  const navigate = useNavigate()

  const handleScrollToArch = (e: React.MouseEvent) => {
    e.preventDefault()
    const el = document.querySelector('#architecture')
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section
      className="relative min-h-screen bg-[#050806] text-white flex flex-col justify-between pt-28 md:pt-36 pb-12 overflow-hidden"
      aria-label="Hero section"
    >
      {/* Ambient Volumetric Green Atmosphere */}
      <div
        className="absolute top-1/4 right-1/4 w-[750px] h-[750px] pointer-events-none rounded-full blur-[160px] opacity-25"
        style={{
          background: 'radial-gradient(circle at center, #a8e063 0%, #0d2616 55%, transparent 75%)',
        }}
      />
      <div
        className="absolute top-10 left-10 w-[500px] h-[500px] pointer-events-none rounded-full blur-[140px] opacity-15"
        style={{
          background: 'radial-gradient(circle at center, #22c55e 0%, #081a0e 60%, transparent 80%)',
        }}
      />

      {/* Main Grid: Left Copy & Bullets + Right 3D Defense Monument */}
      <div className="max-w-7xl mx-auto px-5 md:px-10 w-full relative z-10 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-6 items-center">

          {/* Left Column: Headline, Bullets, Action Buttons (6 Cols) */}
          <div className="lg:col-span-6 space-y-7">
            {/* Top Pill Badge */}
            <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#08160d] border border-[rgba(168,224,99,0.3)] shadow-[0_0_15px_rgba(168,224,99,0.12)]">
              <span className="w-2 h-2 rounded-full bg-[#a8e063] shadow-[0_0_8px_#a8e063]" />
              <span className="font-mono text-[11px] font-bold tracking-wider text-[#a8e063] uppercase">
                AI-POWERED CROSS-CHAIN PROTECTION
              </span>
            </div>

            {/* Headline matching image line-breaks & electric green highlight */}
            <h1 className="font-display text-[clamp(2.6rem,5vw,4.4rem)] font-extrabold text-white leading-[1.08] tracking-tight">
              Protect your <br />
              <span className="text-[#a8e063] drop-shadow-[0_0_30px_rgba(168,224,99,0.35)]">
                DeFi capital
              </span>{' '}
              before <br />
              liquidation does.
            </h1>

            {/* 3 Key Feature Bullets with green dots */}
            <div className="space-y-3 pt-1 text-sm md:text-[15px] text-white/80 leading-relaxed font-normal">
              <div className="flex items-start gap-3">
                <span className="text-[#a8e063] text-lg leading-none mt-0.5">•</span>
                <p>
                  AI monitors lending positions across{' '}
                  <strong className="font-semibold text-white">
                    Ethereum, Solana, and Creditcoin 24/7.
                  </strong>
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[#a8e063] text-lg leading-none mt-0.5">•</span>
                <p>
                  <strong className="font-semibold text-white">Attestcoin</strong> verifies
                  zero-knowledge state proofs in real time.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="text-[#a8e063] text-lg leading-none mt-0.5">•</span>
                <p>
                  <strong className="font-semibold text-white">Creditcoin</strong> settles
                  trustless defense actions in ~15 seconds.
                </p>
              </div>
            </div>

            {/* Dual CTA Buttons */}
            <div className="flex flex-wrap items-center gap-6 pt-3">
              {/* Primary Electric Lime Button */}
              <button
                onClick={() => navigate('/app')}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-[#a8e063] hover:bg-[#bcf279] text-black font-extrabold text-sm tracking-wide transition-all duration-200 shadow-[0_0_30px_rgba(168,224,99,0.4)] hover:shadow-[0_0_40px_rgba(168,224,99,0.6)] group"
              >
                <span>Launch Aegis Terminal</span>
                <span className="transition-transform group-hover:translate-x-1">→</span>
              </button>

              {/* Secondary Link */}
              <a
                href="#architecture"
                onClick={handleScrollToArch}
                className="inline-flex items-center gap-2 text-sm font-semibold text-white hover:text-[#a8e063] transition-colors group cursor-pointer"
              >
                <span>Explore Architecture</span>
                <span className="text-[#a8e063] transition-transform group-hover:translate-x-1">→</span>
              </a>
            </div>
          </div>

          {/* Right Column: 3D Defense Monument with 6 HUD Callouts (6 Cols) */}
          <div className="lg:col-span-6 relative flex items-center justify-center">
            <HeroMonument3D />
          </div>
        </div>
      </div>

      {/* Bottom: Integrated Protocols & Blockchains Strip */}
      <div className="relative z-10 w-full pt-12 md:pt-16">
        <div className="max-w-5xl mx-auto px-5 text-center">
          {/* Section Header */}
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.25em] text-[#a8e063]/80 mb-6">
            INTEGRATED PROTOCOLS & BLOCKCHAINS
          </div>

          {/* Partner & Chain Names Row */}
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-14 font-display text-sm md:text-base font-bold tracking-wider">
            <span className="text-white/60 hover:text-white transition-colors cursor-default">
              AAVE
            </span>
            <span className="text-white/60 hover:text-white transition-colors cursor-default">
              COMPOUND
            </span>
            <span className="text-white/60 hover:text-white transition-colors cursor-default">
              MORPHO
            </span>
            <span className="text-[#a8e063] drop-shadow-[0_0_10px_rgba(168,224,99,0.3)] cursor-default">
              ETHEREUM
            </span>
            <span className="text-white/60 hover:text-white transition-colors cursor-default">
              SOLANA
            </span>
            <span className="text-[#a8e063] drop-shadow-[0_0_10px_rgba(168,224,99,0.3)] cursor-default">
              CREDITCOIN
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
