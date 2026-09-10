import React from 'react'
import { cn } from '../../lib/utils'
import type { RiskState } from '../../types/position'

// ─── StatusBadge ─────────────────────────────────────────────────────────────

interface StatusBadgeProps {
  state: RiskState | 'PROTECTED' | 'MONITORING' | 'DEMO' | 'TESTNET' | 'OFFLINE' | 'LIVE TESTNET' | 'DEMO MODE'
  size?: 'sm' | 'md'
  pulse?: boolean
  className?: string
}

const STATE_CONFIG: Record<string, { label: string; classes: string; dotClasses: string }> = {
  'LIVE TESTNET': {
    label: 'LIVE TESTNET',
    classes: 'text-aegis-lime bg-aegis-lime/10 border-aegis-lime/40 shadow-[0_0_10px_rgba(168,224,99,0.15)]',
    dotClasses: 'bg-aegis-lime',
  },
  'DEMO MODE': {
    label: 'DEMO MODE',
    classes: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    dotClasses: 'bg-amber-400',
  },
  SAFE: {
    label: 'Safe',
    classes: 'text-aegis-lime bg-aegis-lime/10 border-aegis-lime/30',
    dotClasses: 'bg-aegis-lime',
  },
  WARNING: {
    label: 'Warning',
    classes: 'text-aegis-amber bg-aegis-amber/10 border-aegis-amber/30',
    dotClasses: 'bg-aegis-amber',
  },
  AT_RISK: {
    label: 'At Risk',
    classes: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
    dotClasses: 'bg-orange-400',
  },
  CRITICAL: {
    label: 'Critical',
    classes: 'text-aegis-red bg-aegis-red/10 border-aegis-red/40',
    dotClasses: 'bg-aegis-red',
  },
  PROTECTED: {
    label: 'Protected',
    classes: 'text-aegis-lime bg-aegis-lime/10 border-aegis-lime/30',
    dotClasses: 'bg-aegis-lime',
  },
  MONITORING: {
    label: 'Monitoring',
    classes: 'text-aegis-cyan bg-aegis-cyan/10 border-aegis-cyan/30',
    dotClasses: 'bg-aegis-cyan',
  },
  DEMO: {
    label: 'Demo Mode',
    classes: 'text-aegis-amber bg-aegis-amber/10 border-aegis-amber/30',
    dotClasses: 'bg-aegis-amber',
  },
  TESTNET: {
    label: 'Testnet',
    classes: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    dotClasses: 'bg-purple-400',
  },
  OFFLINE: {
    label: 'Offline',
    classes: 'text-aegis-dim bg-aegis-dim/10 border-aegis-dim/20',
    dotClasses: 'bg-aegis-dim',
  },
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-label-xs gap-1.5',
  md: 'px-2.5 py-1 text-label-sm gap-2',
}

export function StatusBadge({ state, size = 'sm', pulse = false, className }: StatusBadgeProps) {
  const config = STATE_CONFIG[state] ?? STATE_CONFIG.OFFLINE

  return (
    <span className={cn(
      'inline-flex items-center font-mono font-medium tracking-widest uppercase rounded-sm border',
      config.classes,
      sizeClasses[size],
      className,
    )}>
      <span className={cn(
        'rounded-full',
        size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2',
        config.dotClasses,
        pulse ? 'animate-pulse' : '',
      )} />
      {config.label}
    </span>
  )
}
