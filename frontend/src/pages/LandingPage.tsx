import React from 'react'
import { Navigation } from '../components/layout/Navigation'
import { HeroSection } from '../components/landing/HeroSection'
import { ProblemSection } from '../components/landing/ProblemSection'
import { HowItWorksSection } from '../components/landing/HowItWorksSection'
import { AIMonitorSection } from '../components/landing/AIMonitorSection'
import { CrossChainSection } from '../components/landing/CrossChainSection'
import { ArchitectureSection } from '../components/landing/ArchitectureSection'
import { ProtectionModesSection } from '../components/landing/ProtectionModesSection'
import { AttestcoinSection } from '../components/landing/AttestcoinSection'
import { NonCustodialSection } from '../components/landing/NonCustodialSection'
import { TechnologySection } from '../components/landing/TechnologySection'
import { CTASection, Footer } from '../components/landing/CTASection'

// ─── LandingPage ──────────────────────────────────────────────────────────────
// The full marketing/information website for Aegis.
// Luxury Dark Green Fintech Aesthetic with rich 3D Infrastructure Visualizations
// ─────────────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-screen bg-aegis-bg-deep text-white selection:bg-aegis-lime selection:text-black">
      {/* Floating Luxury Glass Pill Navigation */}
      <Navigation />

      {/* Main content sections in logical sequence */}
      <main id="main-content">
        <HeroSection />
        <ProblemSection />
        <HowItWorksSection />
        <AIMonitorSection />
        <CrossChainSection />
        <ArchitectureSection />
        <ProtectionModesSection />
        <AttestcoinSection />
        <NonCustodialSection />
        <TechnologySection />
        <CTASection />
      </main>

      <Footer />
    </div>
  )
}
