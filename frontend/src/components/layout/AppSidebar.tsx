import React from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'
import { StatusBadge } from '../ui/StatusBadge'

// ─── AppSidebar ───────────────────────────────────────────────────────────────
// Premium technical sidebar for the dApp.
// AEGIS logo always links to / (home) — NON-NEGOTIABLE per requirements.
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
        className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 w-56 bg-aegis-void border-r border-aegis-border z-40"
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
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-aegis-void/95 backdrop-blur border-b border-aegis-border flex items-center justify-between px-4">
        <Link
          to="/"
          className="font-display text-lg font-bold text-aegis-white hover:text-aegis-lime transition-colors"
          aria-label="Aegis — Home"
        >
          AEGIS
        </Link>
        <button
          onClick={() => setMobileOpen(o => !o)}
          className="p-2 text-aegis-dim hover:text-aegis-white transition-colors"
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
          <div className="absolute inset-0 bg-aegis-black/80 backdrop-blur-sm" />
          <aside
            className="absolute top-0 left-0 bottom-0 w-64 bg-aegis-void border-r border-aegis-border flex flex-col"
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
      {/* Header — AEGIS links home */}
      <div className="p-5 border-b border-aegis-border">
        <Link
          to="/"
          onClick={onClose}
          className="block font-display text-lg font-bold text-aegis-white hover:text-aegis-lime transition-colors duration-200"
          aria-label="Aegis — Return to home"
        >
          AEGIS
        </Link>
        <p className="mt-0.5 text-label-xs font-mono tracking-widest text-aegis-dim uppercase">
          DeFi Defense Protocol
        </p>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/app'}
            onClick={onClose}
            className={({ isActive }) => cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all duration-150 group',
              isActive
                ? 'text-aegis-lime bg-aegis-lime/8 border-l-2 border-aegis-lime pl-[10px]'
                : 'text-aegis-dim hover:text-aegis-white hover:bg-aegis-raised border-l-2 border-transparent',
            )}
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={cn(
                    'w-4 h-4 shrink-0 transition-colors',
                    isActive ? 'text-aegis-lime' : 'text-aegis-subtle group-hover:text-aegis-off',
                  )}
                />
                {label}
                {isActive && (
                  <span
                    className="ml-auto w-1 h-1 rounded-full bg-aegis-lime shadow-lime-sm"
                    aria-hidden="true"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Bottom: Wallet + Network + Home */}
      <div className="p-3 border-t border-aegis-border space-y-2">
        {/* Wallet status */}
        <div className="px-3 py-2 rounded-sm bg-aegis-raised">
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-label-xs font-mono tracking-widest text-aegis-dim uppercase">Wallet</span>
            <StatusBadge state={isConnected ? 'MONITORING' : 'OFFLINE'} size="sm" />
          </div>
          <p className="font-mono text-xs text-aegis-off truncate">
            {walletAddress
              ? `${walletAddress.slice(0, 6)}…${walletAddress.slice(-4)}`
              : 'Not connected'}
          </p>
        </div>

        {/* Network */}
        <div className="px-3 py-2 rounded-sm bg-aegis-raised flex items-center justify-between">
          <span className="text-label-xs font-mono tracking-widest text-aegis-dim uppercase">Network</span>
          <span className="font-mono text-xs text-aegis-cyan">{networkName ?? 'CC3 Testnet'}</span>
        </div>

        {/* Home */}
        <button
          onClick={() => { onClose(); navigate('/') }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-mono text-aegis-dim hover:text-aegis-white hover:bg-aegis-raised transition-colors tracking-wider uppercase"
        >
          <HomeIcon className="w-3.5 h-3.5" />
          Home
        </button>
      </div>
    </div>
  )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function OverviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1.5" y="1.5" width="5" height="5" rx="0.5" />
      <rect x="9.5" y="1.5" width="5" height="5" rx="0.5" />
      <rect x="1.5" y="9.5" width="5" height="5" rx="0.5" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="0.5" />
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

function HomeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1.5 7 L8 1.5 L14.5 7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 6.5 L3 14.5 L6.5 14.5 L6.5 10 L9.5 10 L9.5 14.5 L13 14.5 L13 6.5" />
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
