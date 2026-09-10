import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { StatusBadge } from '../ui/StatusBadge'

// ─── AppSidebar ───────────────────────────────────────────────────────────────
// Luxury fintech sidebar for the Aegis dApp.
// Unmissable "← RETURN TO HOME" navigation button ensures user is never trapped.
// ─────────────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/app',            label: 'Overview',   icon: OverviewIcon },
  { to: '/app/positions',  label: 'Positions',  icon: PositionsIcon },
  { to: '/app/protection', label: 'Protection', icon: ProtectionIcon },
  { to: '/app/activity',   label: 'Activity',   icon: ActivityIcon },
  { to: '/app/settings',   label: 'Settings',   icon: SettingsIcon },
]

interface AppSidebarProps {
  walletAddress?: string
  isConnected?: boolean
  networkName?: string
}

export function AppSidebar({ walletAddress, isConnected, networkName }: AppSidebarProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-[#050906] border-r border-aegis-border-emerald z-40 backdrop-blur-xl"
        role="navigation"
        aria-label="Application navigation"
      >
        <SidebarContent
          walletAddress={walletAddress}
          isConnected={isConnected}
          networkName={networkName}
          onClose={() => setMobileOpen(false)}
        />
      </aside>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-[#050906]/95 backdrop-blur-md border-b border-aegis-border-emerald flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex items-center gap-1.5 font-mono text-xs text-aegis-lime hover:underline"
            aria-label="Return to home"
          >
            ← Home
          </Link>
          <span className="text-white/20">|</span>
          <span className="font-display text-sm font-bold text-white">AEGIS</span>
        </div>
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="p-2 text-white/70 hover:text-white transition-colors"
          aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        >
          <MobileMenuIcon open={mobileOpen} />
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          onClick={() => setMobileOpen(false)}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <aside
            className="absolute top-0 left-0 bottom-0 w-72 bg-[#050906] border-r border-aegis-border-emerald flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent
              walletAddress={walletAddress}
              isConnected={isConnected}
              networkName={networkName}
              onClose={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}
    </>
  )
}

function SidebarContent({
  walletAddress,
  isConnected,
  networkName,
  onClose,
}: AppSidebarProps & { onClose: () => void }) {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar: RETURN TO HOME Link (Prominent & Clear) */}
      <div className="p-4 border-b border-white/[0.06] bg-[#071109]/80">
        <button
          onClick={() => {
            onClose()
            navigate('/')
          }}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-[#0b1b11] border border-aegis-border-emerald hover:border-aegis-lime text-aegis-lime text-xs font-mono font-bold transition-all shadow-[0_0_12px_rgba(168,224,99,0.12)] group"
          aria-label="Return to Landing Page"
        >
          <span className="flex items-center gap-2">
            <span className="transition-transform group-hover:-translate-x-0.5">←</span>
            <span>RETURN TO HOME</span>
          </span>
          <span className="text-[10px] text-aegis-muted font-normal">ESC</span>
        </button>
      </div>

      {/* Brand & Monogram Header */}
      <div className="p-5 border-b border-white/[0.06]">
        <Link
          to="/"
          onClick={onClose}
          className="flex items-center gap-3 group"
          aria-label="Aegis — Home"
        >
          <div className="w-8 h-8 rounded-lg bg-aegis-lime/10 border border-aegis-lime/40 flex items-center justify-center font-mono font-bold text-aegis-lime text-xs shadow-[0_0_10px_rgba(168,224,99,0.2)] group-hover:border-aegis-lime transition-colors">
            AE
          </div>
          <div>
            <div className="font-display text-base font-bold text-white group-hover:text-aegis-lime transition-colors">
              AEGIS TERMINAL
            </div>
            <div className="text-[10px] font-mono tracking-widest text-aegis-muted uppercase">
              CC3 Defense Engine
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/app'}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group',
              isActive
                ? 'text-white bg-[#0b1e12] border border-aegis-border-emerald shadow-[0_0_15px_rgba(168,224,99,0.1)] font-semibold'
                : 'text-aegis-muted hover:text-white hover:bg-white/[0.03] border border-transparent',
            )}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-aegis-lime' : 'text-white/40 group-hover:text-white/80',
                  )}
                />
                <span>{label}</span>
                {isActive && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-aegis-lime shadow-[0_0_8px_#a8e063]"
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Wallet Telemetry & Network Status */}
      <div className="p-4 border-t border-white/[0.06] space-y-3 bg-[#040805]/90">
        {/* Wallet connection status */}
        <div className="p-3 rounded-xl bg-[#08130b] border border-white/[0.06]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono tracking-widest text-aegis-muted uppercase">
              WALLET STATUS
            </span>
            <StatusBadge state={isConnected ? 'MONITORING' : 'OFFLINE'} size="sm" />
          </div>
          <p className="font-mono text-xs text-white/90 truncate font-semibold">
            {walletAddress
              ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
              : '0x71C8...3F9A (Demo Mode)'}
          </p>
        </div>

        {/* Network & Mode status */}
        <div className="p-2.5 rounded-xl bg-[#08130b] border border-white/[0.06] flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono tracking-widest text-aegis-muted uppercase block">
              NETWORK
            </span>
            <span className="font-mono text-xs text-emerald-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              {networkName ?? 'CC3 Testnet'}
            </span>
          </div>
          <StatusBadge state={isConnected ? 'LIVE TESTNET' : 'DEMO MODE'} size="sm" />
        </div>
      </div>
    </div>
  )
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────

function OverviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="1" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
    </svg>
  )
}

function PositionsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5 L14.5 5 L14.5 11 L8 14.5 L1.5 11 L1.5 5 Z" />
      <circle cx="8" cy="8" r="2.5" />
    </svg>
  )
}

function ProtectionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5 L13.5 3.5 L13.5 8.5 C13.5 11.5 10.5 13.5 8 14.5 C5.5 13.5 2.5 11.5 2.5 8.5 L2.5 3.5 Z" />
      <path d="M5.5 8 L7 9.5 L10.5 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="1.5,8 4,4 6.5,10 9,5 11.5,8 14.5,8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1.5 L8 3 M8 13 L8 14.5 M1.5 8 L3 8 M13 8 L14.5 8 M3.2 3.2 L4.2 4.2 M11.8 11.8 L12.8 12.8 M12.8 3.2 L11.8 4.2 M4.2 11.8 L3.2 12.8" strokeLinecap="round" />
    </svg>
  )
}

function MobileMenuIcon({ open }: { open: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.5">
      {open ? (
        <>
          <line x1="5" y1="5" x2="17" y2="17" />
          <line x1="17" y1="5" x2="5" y2="17" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="19" y2="6" />
          <line x1="3" y1="11" x2="19" y2="11" />
          <line x1="3" y1="16" x2="19" y2="16" />
        </>
      )}
    </svg>
  )
}
