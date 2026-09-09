import React from 'react'
import { Outlet } from 'react-router-dom'
import { AppSidebar } from './AppSidebar'
import { AmbientBackground } from '../background/AmbientBackground'
import { useAccount, useChainId } from 'wagmi'
import { CHAIN_META } from '../../lib/chains'

// ─── AppLayout ────────────────────────────────────────────────────────────────
// Shell layout for all /app/* routes.
// Sidebar + main content area.
// ─────────────────────────────────────────────────────────────────────────────

export function AppLayout() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const networkName = CHAIN_META[chainId]?.shortName ?? 'Unknown'

  return (
    <div className="min-h-screen bg-aegis-black relative">
      {/* Background — lower intensity in app */}
      <AmbientBackground intensity="low" />

      {/* Sidebar */}
      <AppSidebar
        walletAddress={address}
        isConnected={isConnected}
        networkName={CHAIN_META[chainId]?.name ?? 'Unknown Network'}
      />

      {/* Main Content */}
      <main
        className="lg:ml-56 min-h-screen relative z-10 pt-14 lg:pt-0"
        id="main-content"
      >
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
    </div>
  )
}

// ─── PageTransition ───────────────────────────────────────────────────────────
// CSS-based fade + slide transition (no framer-motion dependency needed)

interface PageTransitionProps {
  children: React.ReactNode
}

function PageTransition({ children }: PageTransitionProps) {
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    // Brief delay to allow exit animation before enter
    const t = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true))
    })
    return () => cancelAnimationFrame(t)
  }, [])

  return (
    <div
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      {children}
    </div>
  )
}
