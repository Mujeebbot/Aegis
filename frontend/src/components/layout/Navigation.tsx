import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cn } from '../../lib/utils'

// ─── Navigation ───────────────────────────────────────────────────────────────
// Exact match to reference: Glowing shield icon + AEGIS + center links + outline CTA
// ─────────────────────────────────────────────────────────────────────────────

const NAV_LINKS = [
  { label: 'Product',       href: '#problem' },
  { label: 'Architecture',  href: '#architecture' },
  { label: 'Protection',    href: '#protection' },
  { label: 'Technology',    href: '#technology' },
]

export function Navigation() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    setMobileOpen(false)
    const el = document.querySelector(href)
    if (el) el.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <>
      <nav
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
          scrolled
            ? 'bg-[#050906]/90 backdrop-blur-xl border-b border-[rgba(168,224,99,0.1)] shadow-[0_4px_30px_rgba(0,0,0,0.8)] py-3'
            : 'bg-transparent py-5',
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-10 flex items-center justify-between">

          {/* Left: Shield Icon + AEGIS Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group"
            aria-label="Aegis — Home"
          >
            {/* Green Glowing Shield Icon */}
            <div className="w-8 h-8 rounded-lg flex items-center justify-center relative">
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-[#a8e063] drop-shadow-[0_0_8px_rgba(168,224,99,0.6)]" fill="none" stroke="currentColor" strokeWidth="1.75">
                <path d="M12 2L4 5.5v6.5c0 5.5 3.5 10 8 11.5 4.5-1.5 8-6 8-11.5V5.5L12 2z" strokeLinecap="round" strokeLinejoin="round" />
                {/* Inner Aegis tree/emblem */}
                <path d="M12 7v10M9 11l3-3 3 3M9 14.5l3-3 3 3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
              </svg>
            </div>
            <span className="font-display text-lg font-extrabold tracking-[0.18em] text-white group-hover:text-aegis-lime transition-colors">
              AEGIS
            </span>
          </Link>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-white/80">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={e => handleAnchorClick(e, link.href)}
                className="hover:text-white transition-colors duration-150"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right CTA: Launch Terminal Button */}
          <div className="hidden md:flex items-center">
            <button
              onClick={() => navigate('/app')}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#08130b]/80 hover:bg-[#0c1f12] border border-[#a8e063]/40 hover:border-[#a8e063] text-xs font-semibold tracking-wider text-white transition-all duration-200 shadow-[0_0_12px_rgba(168,224,99,0.15)] group"
            >
              <span>Launch Terminal</span>
              <span className="text-[#a8e063] transition-transform group-hover:translate-x-0.5">→</span>
            </button>
          </div>

          {/* Mobile Menu Trigger */}
          <button
            className="md:hidden p-2 text-white/80 hover:text-white"
            onClick={() => setMobileOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {mobileOpen ? (
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              ) : (
                <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-[#050906]/98 backdrop-blur-xl md:hidden flex flex-col items-center justify-center gap-6 p-6">
          {NAV_LINKS.map(link => (
            <a
              key={link.href}
              href={link.href}
              onClick={e => handleAnchorClick(e, link.href)}
              className="text-2xl font-bold text-white hover:text-aegis-lime"
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={() => { setMobileOpen(false); navigate('/app') }}
            className="mt-4 px-6 py-3 rounded-full bg-aegis-lime text-black font-bold text-sm shadow-[0_0_20px_rgba(168,224,99,0.4)]"
          >
            Launch Terminal →
          </button>
        </div>
      )}
    </>
  )
}
