import React from 'react'
import { cn } from '../../lib/utils'

// ─── SectionLabel ─────────────────────────────────────────────────────────────
// Small uppercase technical label — the editorial voice of Aegis

interface SectionLabelProps {
  children: React.ReactNode
  className?: string
  dot?: boolean
  color?: 'lime' | 'amber' | 'dim'
}

export function SectionLabel({
  children,
  className,
  dot = true,
  color = 'lime',
}: SectionLabelProps) {
  const colorClasses = {
    lime: 'text-aegis-lime',
    amber: 'text-aegis-amber',
    dim: 'text-aegis-dim',
  }

  return (
    <div className={cn(
      'flex items-center gap-2 font-mono text-label-sm font-medium tracking-widest uppercase',
      colorClasses[color],
      className,
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          color === 'lime' ? 'bg-aegis-lime shadow-lime-sm' : '',
          color === 'amber' ? 'bg-aegis-amber' : '',
          color === 'dim' ? 'bg-aegis-dim' : '',
        )} />
      )}
      {children}
    </div>
  )
}
