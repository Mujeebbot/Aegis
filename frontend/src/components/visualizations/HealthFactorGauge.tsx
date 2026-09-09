import React from 'react'
import { cn } from '../../lib/utils'
import type { RiskState } from '../../types/position'

// ─── HealthFactorGauge ────────────────────────────────────────────────────────
// Radial arc health factor indicator with threshold line and state zones.
// States: SAFE → WARNING → AT_RISK → CRITICAL
// ─────────────────────────────────────────────────────────────────────────────

interface HealthFactorGaugeProps {
  healthFactor: number
  riskState: RiskState
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

const STATE_COLORS: Record<RiskState, { stroke: string; fill: string; text: string }> = {
  SAFE:     { stroke: '#a8e063', fill: '#a8e063',   text: '#a8e063' },
  WARNING:  { stroke: '#e8a040', fill: '#e8a040',   text: '#e8a040' },
  AT_RISK:  { stroke: '#f97316', fill: '#f97316',   text: '#f97316' },
  CRITICAL: { stroke: '#e05050', fill: '#e05050',   text: '#e05050' },
}

const STATE_LABELS: Record<RiskState, string> = {
  SAFE:     'SAFE',
  WARNING:  'WARNING',
  AT_RISK:  'AT RISK',
  CRITICAL: 'CRITICAL',
}

// HF max for display purposes — we cap at 3.0 for gauge
const HF_MAX = 3.0
const HF_THRESHOLD = 1.05 // liquidation threshold

export function HealthFactorGauge({
  healthFactor,
  riskState,
  size = 'md',
  showLabel = true,
  className,
}: HealthFactorGaugeProps) {
  const colors = STATE_COLORS[riskState]

  const sizes = {
    sm: { viewBox: 80, strokeWidth: 6, fontSize: 14, labelSize: 7, cx: 40, cy: 40, r: 28 },
    md: { viewBox: 120, strokeWidth: 8, fontSize: 20, labelSize: 9, cx: 60, cy: 60, r: 44 },
    lg: { viewBox: 160, strokeWidth: 10, fontSize: 26, labelSize: 10, cx: 80, cy: 80, r: 60 },
  }
  const s = sizes[size]
  const { cx, cy, r } = s

  // Arc from 210° to 330° (240° sweep, bottom gap)
  const startAngle = 210
  const endAngle = 330 // going clockwise, sweeps 240°
  const totalSweep = 300 // degrees (210° → 150° going clockwise, 300° arc)

  // Clamp HF for display
  const hfClamped = Math.min(Math.max(healthFactor, 1.0), HF_MAX)
  const fillPct = (hfClamped - 1.0) / (HF_MAX - 1.0)

  // Threshold position
  const thresholdPct = (HF_THRESHOLD - 1.0) / (HF_MAX - 1.0)

  function polarToXY(angle: number, radius: number) {
    const rad = ((angle - 90) * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    }
  }

  function describeArc(startDeg: number, sweepDeg: number, radius: number) {
    if (sweepDeg <= 0) return ''
    const cappedSweep = Math.min(sweepDeg, 359.9)
    const start = polarToXY(startDeg, radius)
    const end = polarToXY(startDeg + cappedSweep, radius)
    const largeArc = cappedSweep > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
  }

  const trackStart = 210
  const trackSweep = 300

  const fillSweep = fillPct * trackSweep
  const thresholdAngle = trackStart + thresholdPct * trackSweep
  const thresholdPos = polarToXY(thresholdAngle, r + s.strokeWidth * 0.5 + 3)
  const thresholdPosInner = polarToXY(thresholdAngle, r - s.strokeWidth * 0.5 - 3)

  return (
    <div className={cn('inline-flex flex-col items-center', className)}>
      <svg viewBox={`0 0 ${s.viewBox} ${s.viewBox}`} className={
        size === 'sm' ? 'w-16 h-16' :
        size === 'md' ? 'w-24 h-24' : 'w-32 h-32'
      }>
        {/* Track background */}
        <path
          d={describeArc(trackStart, trackSweep, r)}
          fill="none"
          stroke="#242420"
          strokeWidth={s.strokeWidth}
          strokeLinecap="round"
        />

        {/* Fill arc */}
        {fillSweep > 0 && (
          <path
            d={describeArc(trackStart, fillSweep, r)}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={s.strokeWidth}
            strokeLinecap="round"
            style={{
              filter: riskState === 'SAFE' ? 'drop-shadow(0 0 4px rgba(168,224,99,0.5))' :
                      riskState === 'WARNING' ? 'drop-shadow(0 0 4px rgba(232,160,64,0.5))' :
                      'drop-shadow(0 0 4px rgba(224,80,80,0.5))',
            }}
          />
        )}

        {/* Threshold marker */}
        <line
          x1={thresholdPosInner.x} y1={thresholdPosInner.y}
          x2={thresholdPos.x} y2={thresholdPos.y}
          stroke="#e8a040"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Center text — HF value */}
        <text
          x={cx} y={cy + 4}
          textAnchor="middle"
          fill={colors.text}
          fontSize={s.fontSize}
          fontFamily="Space Grotesk, sans-serif"
          fontWeight="700"
        >
          {healthFactor.toFixed(2)}
        </text>

        {/* State label */}
        {showLabel && (
          <text
            x={cx} y={cy + s.fontSize * 0.9 + 6}
            textAnchor="middle"
            fill="#5a5a50"
            fontSize={s.labelSize}
            fontFamily="JetBrains Mono, monospace"
            letterSpacing="0.08em"
          >
            {STATE_LABELS[riskState]}
          </text>
        )}
      </svg>
    </div>
  )
}

// ─── HealthFactorBar ─────────────────────────────────────────────────────────
// Simpler linear version for tables

interface HealthFactorBarProps {
  healthFactor: number
  riskState: RiskState
  className?: string
}

export function HealthFactorBar({ healthFactor, riskState, className }: HealthFactorBarProps) {
  const colors = STATE_COLORS[riskState]
  const pct = Math.min(Math.max((healthFactor - 1.0) / (HF_MAX - 1.0), 0), 1) * 100
  const thresholdPct = ((HF_THRESHOLD - 1.0) / (HF_MAX - 1.0)) * 100

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="flex-1 h-1.5 bg-aegis-raised rounded-full relative overflow-visible">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            backgroundColor: colors.stroke,
            boxShadow: `0 0 6px ${colors.stroke}50`,
          }}
        />
        {/* Threshold marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 bg-aegis-amber rounded-full"
          style={{ left: `${thresholdPct}%` }}
        />
      </div>
      <span
        className="font-mono text-xs font-semibold shrink-0 tabular-nums"
        style={{ color: colors.text }}
      >
        {healthFactor.toFixed(2)}
      </span>
    </div>
  )
}
