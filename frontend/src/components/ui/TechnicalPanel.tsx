import React from 'react'
import { cn } from '../../lib/utils'

// ─── TechnicalPanel ───────────────────────────────────────────────────────────
// Premium dark panel used throughout the interface

interface TechnicalPanelProps {
  children: React.ReactNode
  className?: string
  glow?: boolean
  header?: React.ReactNode
  footer?: React.ReactNode
}

export function TechnicalPanel({
  children,
  className,
  glow = false,
  header,
  footer,
}: TechnicalPanelProps) {
  return (
    <div className={cn(
      'aegis-panel overflow-hidden',
      glow && 'border-aegis-lime/20 shadow-inner-lime',
      className,
    )}>
      {header && (
        <div className="px-4 py-3 border-b border-aegis-border flex items-center justify-between gap-2">
          {header}
        </div>
      )}
      <div>{children}</div>
      {footer && (
        <div className="px-4 py-3 border-t border-aegis-border flex items-center justify-between gap-2">
          {footer}
        </div>
      )}
    </div>
  )
}

// ─── MonoValue ────────────────────────────────────────────────────────────────
// Technical monospace values — hashes, IDs, addresses

interface MonoValueProps {
  children: React.ReactNode
  className?: string
  dim?: boolean
  selectable?: boolean
}

export function MonoValue({ children, className, dim = false, selectable = true }: MonoValueProps) {
  return (
    <span className={cn(
      'font-mono text-xs',
      dim ? 'text-aegis-dim' : 'text-aegis-off',
      selectable ? 'select-all' : 'select-none',
      className,
    )}>
      {children}
    </span>
  )
}

// ─── DataRow ──────────────────────────────────────────────────────────────────

interface DataRowProps {
  label: string
  value: React.ReactNode
  className?: string
}

export function DataRow({ label, value, className }: DataRowProps) {
  return (
    <div className={cn(
      'flex items-center justify-between py-2.5 border-b border-aegis-border/50 last:border-0',
      className,
    )}>
      <span className="text-xs font-mono text-aegis-dim tracking-wide uppercase">{label}</span>
      <div className="text-sm text-aegis-white font-medium">{value}</div>
    </div>
  )
}

// ─── Divider ─────────────────────────────────────────────────────────────────

export function Divider({ className }: { className?: string }) {
  return <div className={cn('h-px w-full bg-aegis-border', className)} />
}

// ─── ScrollReveal ─────────────────────────────────────────────────────────────
// CSS-based intersection observer scroll reveal (no framer needed)

interface ScrollRevealProps {
  children: React.ReactNode
  className?: string
  delay?: number
}

export function ScrollReveal({ children, className, delay = 0 }: ScrollRevealProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={cn(className)}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}
