import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { WagmiProvider } from 'wagmi'
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import '@rainbow-me/rainbowkit/styles.css'

import { wagmiConfig } from './lib/wagmi'
import { LandingPage } from './pages/LandingPage'
import { AppLayout } from './components/layout/AppLayout'
import { AppOverviewPage } from './pages/app/AppOverviewPage'
import { PositionsPage } from './pages/app/PositionsPage'
import { ProtectionPage } from './pages/app/ProtectionPage'
import { ActivityPage } from './pages/app/ActivityPage'
import { SettingsPage } from './pages/app/SettingsPage'

// ─── Query Client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
})

// ─── Custom RainbowKit Theme ──────────────────────────────────────────────────

const aegisRainbowTheme = darkTheme({
  accentColor: '#a8e063',
  accentColorForeground: '#080808',
  borderRadius: 'small',
  fontStack: 'system',
  overlayBlur: 'small',
})

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={aegisRainbowTheme}>
          <BrowserRouter>
            <Routes>

              {/* ── Marketing / Landing ── */}
              <Route path="/" element={<LandingPage />} />

              {/* ── dApp ── */}
              <Route path="/app" element={<AppLayout />}>
                <Route index    element={<AppOverviewPage />} />
                <Route path="positions"  element={<PositionsPage />} />
                <Route path="protection" element={<ProtectionPage />} />
                <Route path="activity"   element={<ActivityPage />} />
                <Route path="settings"   element={<SettingsPage />} />
                <Route path="*"          element={<Navigate to="/app" replace />} />
              </Route>

              {/* ── Catch-all ── */}
              <Route path="*" element={<Navigate to="/" replace />} />

            </Routes>
          </BrowserRouter>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
