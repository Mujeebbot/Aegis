import React from 'react'
import { SectionLabel } from '../ui/SectionLabel'
import { ScrollReveal } from '../ui/TechnicalPanel'
import { PipelineFlow } from '../visualizations/PipelineFlow'

// ─── HowItWorksSection ────────────────────────────────────────────────────────

export function HowItWorksSection() {
  return (
    <section
      className="relative section-padding"
      aria-label="How Aegis works"
    >
      <div className="max-w-7xl mx-auto px-5 md:px-8">
        <ScrollReveal>
          <SectionLabel className="mb-6">How Aegis Works</SectionLabel>
          <h2 className="font-display text-display-xl font-bold text-aegis-white mb-4">
            From risk detection
            <br />
            <span className="text-aegis-lime">to protection.</span>
          </h2>
          <p className="text-aegis-off text-lg max-w-xl leading-relaxed mb-20">
            When your position approaches liquidation, Aegis moves faster than any manual
            response — generating cryptographic proofs and executing protection on-chain.
          </p>
        </ScrollReveal>

        <PipelineFlow />
      </div>
    </section>
  )
}
