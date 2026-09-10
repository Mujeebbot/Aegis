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
    lime: 'text-aegis-lime border-[rgba(168,224,99,0.2)] bg-[rgba(9,20,13,0.65)]',
    amber: 'text-aegis-amber border-[rgba(232,160,64,0.2)] bg-[rgba(232,160,64,0.06)]',
    dim: 'text-aegis-off border-[rgba(255,255,255,0.08)] bg-[rgba(13,29,19,0.4)]',
  }

  return (
    <div className={cn(
      'inline-flex items-center gap-2 px-3 py-1 rounded-full border backdrop-blur-md font-mono text-[10px] font-semibold tracking-widest uppercase',
      colorClasses[color],
      className,
    )}>
      {dot && (
        <span className={cn(
          'w-1.5 h-1.5 rounded-full',
          color === 'lime' ? 'bg-aegis-lime shadow-[0_0_8px_#a8e063]' : '',
          color === 'amber' ? 'bg-aegis-amber shadow-[0_0_8px_#e8a040]' : '',
          color === 'dim' ? 'bg-aegis-off/60' : '',
        )} />
      )}
      {children}
    </div>
  )
}
