import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

// ─── Navigation ───────────────────────────────────────────────────────────────
// Premium sticky navigation: starts transparent, gains blur + border on scroll

const NAV_LINKS = [
  { label: 'Product',       href: '#product' },
  { label: 'Architecture',  href: '#architecture' },
  { label: 'Protection',    href: '#protection' },
  { label: 'Technology',    href: '#technology' },
]

export function Navigation() {
  const navigate = useNavigate()
  const [scrolled, setScrolled] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close mobile menu on resize
  React.useEffect(() => {
    const handleResize = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
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
          'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
          scrolled
            ? 'bg-aegis-black/80 backdrop-blur-md border-b border-aegis-border/60'
            : 'bg-transparent border-b border-transparent',
        )}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between gap-8">

          {/* Logo */}
          <Link
            to="/"
            className="font-display text-xl font-bold tracking-tight text-aegis-white hover:text-aegis-lime transition-colors duration-200 shrink-0"
            aria-label="Aegis — Home"
          >
            AEGIS
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <a
                key={link.href}
                href={link.href}
                onClick={e => handleAnchorClick(e, link.href)}
                className="px-4 py-2 text-sm text-aegis-dim hover:text-aegis-white transition-colors duration-200 font-medium"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/app')}
            >
              Launch Terminal
            </Button>
          </div>

          {/* Mobile Hamburger */}
          <button
            className="md:hidden p-2 text-aegis-dim hover:text-aegis-white transition-colors"
            onClick={() => setMobileOpen(o => !o)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            <HamburgerIcon open={mobileOpen} />
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-aegis-black/95 backdrop-blur-md md:hidden transition-all duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        aria-hidden={!mobileOpen}
      >
        <div className="flex flex-col items-center justify-center h-full gap-8">
          {NAV_LINKS.map((link, i) => (
            <a
              key={link.href}
              href={link.href}
              onClick={e => handleAnchorClick(e, link.href)}
              className="font-display text-3xl font-bold text-aegis-white hover:text-aegis-lime transition-colors duration-200"
              style={{ transitionDelay: mobileOpen ? `${i * 60}ms` : '0ms' }}
            >
              {link.label}
            </a>
          ))}
          <Button
            variant="primary"
            size="lg"
            onClick={() => { setMobileOpen(false); navigate('/app') }}
            className="mt-4"
          >
            Launch Terminal
          </Button>
        </div>
      </div>
    </>
  )
}

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      {open ? (
        <>
          <line x1="6" y1="6" x2="18" y2="18" />
          <line x1="18" y1="6" x2="6" y2="18" />
        </>
      ) : (
        <>
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </>
      )}
    </svg>
  )
}
