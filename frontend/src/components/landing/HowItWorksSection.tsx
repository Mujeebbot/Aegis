import React from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'
import { PipelineFlow } from '../visualizations/PipelineFlow'

// ─── HowItWorksSection ────────────────────────────────────────────────────────
// "From risk detection to protection." — Fluid Cybernetic Architecture Flow
// ─────────────────────────────────────────────────────────────────────────────

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative section-padding bg-[#050806] overflow-hidden"
      aria-label="How Aegis works"
    >
      {/* Subtle Background Glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[500px] pointer-events-none rounded-full blur-[140px] opacity-15"
        style={{
          background: 'radial-gradient(circle, #5be4c8 0%, #0d2616 50%, transparent 75%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-5 md:px-10 relative z-10">
        <ScrollReveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <SectionLabel className="mb-4">Autonomous Execution Engine</SectionLabel>
              <h2 className="font-display text-display-xl font-bold text-white tracking-tight">
                From risk detection
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#a8e063] via-[#c5f57a] to-[#5be4c8]">
                  to on-chain defense.
                </span>
              </h2>
            </div>
            <p className="text-white/60 text-sm md:text-base max-w-md leading-relaxed">
              When your position approaches liquidation, Aegis moves faster than any manual response — generating zero-knowledge state proofs and executing protection on Creditcoin CC3.
            </p>
          </div>
        </ScrollReveal>

        <PipelineFlow />
      </div>
    </section>
  )
}
