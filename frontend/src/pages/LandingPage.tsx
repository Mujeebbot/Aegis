import React from 'react'
import { Navigation } from '../components/layout/Navigation'
import { HeroSection } from '../components/landing/HeroSection'
import { ProblemSection } from '../components/landing/ProblemSection'
import { HowItWorksSection } from '../components/landing/HowItWorksSection'
import { CrossChainSection } from '../components/landing/CrossChainSection'
import { AIMonitorSection } from '../components/landing/AIMonitorSection'
import { ProtectionModesSection } from '../components/landing/ProtectionModesSection'
import { TechnologySection } from '../components/landing/TechnologySection'
import { ArchitectureSection } from '../components/landing/ArchitectureSection'
import { TrustSection } from '../components/landing/TrustSection'
import { CTASection, Footer } from '../components/landing/CTASection'

// ─── LandingPage ──────────────────────────────────────────────────────────────
// The full marketing/information website for Aegis.
// All sections rendered in sequence with navigation overlay.
// ─────────────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-aegis-black">
      {/* Sticky navigation */}
      <Navigation />

      {/* Main content — one long scroll */}
      <main id="main-content">
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <AIMonitorSection />
        <CrossChainSection />
        <ProtectionModesSection />
        <TechnologySection />
        <ArchitectureSection />
        <TrustSection />
        <CTASection />
      </main>

      <Footer />
    </div>
  )
}
