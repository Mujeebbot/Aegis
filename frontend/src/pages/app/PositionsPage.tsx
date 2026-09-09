import React from 'react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TechnicalPanel, DataRow } from '../../components/ui/TechnicalPanel'
import { HealthFactorGauge, HealthFactorBar } from '../../components/visualizations/HealthFactorGauge'
import { Button } from '../../components/ui/Button'
import { DEMO_POSITIONS, DEMO_SNAPSHOTS } from '../../data/demo'
import { getProtocolLabel, timeAgo } from '../../lib/utils'
import { getRiskLabel, getProtectionLabel } from '../../types/position'
import type { Position } from '../../types/position'

// ─── PositionsPage ────────────────────────────────────────────────────────────

export function PositionsPage() {
  const [selected, setSelected] = React.useState<string | null>(null)
  const selectedPos = DEMO_POSITIONS.find(p => p.id === selected) ?? null

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="font-display text-2xl font-bold text-aegis-white">Positions</h1>
            <StatusBadge state="DEMO" size="sm" />
          </div>
          <p className="text-sm text-aegis-dim font-mono">
            All monitored cross-chain positions
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSelected(null)}>
          {selected ? 'Clear Selection' : 'Add Position'}
        </Button>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Position list — 3/5 */}
        <div className="lg:col-span-3 space-y-3">
          {DEMO_POSITIONS.map(pos => (
            <button
              key={pos.id}
              onClick={() => setSelected(p => p === pos.id ? null : pos.id)}
              className="w-full text-left"
              aria-pressed={selected === pos.id}
            >
              <TechnicalPanel
                className={[
                  'transition-all duration-200 cursor-pointer',
                  selected === pos.id
                    ? 'border-aegis-lime/40 shadow-inner-lime'
                    : 'hover:border-aegis-border/80',
                ].join(' ')}
                header={
                  <>
                    <div className="flex items-center gap-3">
                      <ProtocolDot protocol={pos.protocol} />
                      <div>
                        <div className="font-display text-sm font-semibold text-aegis-white">
                          {getProtocolLabel(pos.protocol)}
                        </div>
                        <div className="font-mono text-label-xs text-aegis-dim">
                          {pos.chainName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge state={pos.riskState} size="sm" />
                      {selected === pos.id && (
                        <span className="font-mono text-label-xs text-aegis-lime">▶</span>
                      )}
                    </div>
                  </>
                }
              >
                <div className="px-4 py-3">
                  <HealthFactorBar
                    healthFactor={pos.healthFactor}
                    riskState={pos.riskState}
                    className="mb-3"
                  />
                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div>
                      <span className="text-aegis-dim">Collateral: </span>
                      <span className="text-aegis-off">{pos.collateralAmount} {pos.collateralAsset}</span>
                    </div>
                    <div>
                      <span className="text-aegis-dim">Debt: </span>
                      <span className="text-aegis-off">{pos.debtAmount} {pos.debtAsset}</span>
                    </div>
                    <div>
                      <span className="text-aegis-dim">Protection: </span>
                      <span style={{ color: pos.protectionMode !== 'NONE' ? '#a8e063' : '#5a5a50' }}>
                        {getProtectionLabel(pos.protectionMode)}
                      </span>
                    </div>
                    <div>
                      <span className="text-aegis-dim">Updated: </span>
                      <span className="text-aegis-subtle">{timeAgo(pos.lastUpdated)}</span>
                    </div>
                  </div>
                </div>
              </TechnicalPanel>
            </button>
          ))}
        </div>

        {/* Detail panel — 2/5 */}
        <div className="lg:col-span-2">
          {selectedPos ? (
            <PositionDetail pos={selectedPos} />
          ) : (
            <div
              className="rounded-sm h-full min-h-48 flex items-center justify-center"
              style={{ background: '#0a0a08', border: '1px solid #1c1c19', borderStyle: 'dashed' }}
            >
              <p className="font-mono text-label-xs text-aegis-muted tracking-widest uppercase">
                Select a position to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PositionDetail({ pos }: { pos: Position }) {
  const snapshots = DEMO_SNAPSHOTS[pos.id] ?? []

  return (
    <div className="space-y-4">
      {/* Gauge */}
      <TechnicalPanel>
        <div className="p-4 flex flex-col items-center">
          <HealthFactorGauge
            healthFactor={pos.healthFactor}
            riskState={pos.riskState}
            size="lg"
            showLabel
          />
          <div className="mt-3 text-center">
            <div className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase">
              {pos.riskState === 'SAFE' ? 'Position Safe' : `Risk: ${getRiskLabel(pos.riskState)}`}
            </div>
          </div>
        </div>
      </TechnicalPanel>

      {/* Details */}
      <TechnicalPanel>
        <div className="p-4">
          <DataRow label="Protocol"    value={getProtocolLabel(pos.protocol)} />
          <DataRow label="Chain"       value={pos.chainName} />
          <DataRow label="Collateral"  value={`${pos.collateralAmount} ${pos.collateralAsset}`} />
          <DataRow label="Coll. USD"   value={pos.collateralUsd} />
          <DataRow label="Debt"        value={`${pos.debtAmount} ${pos.debtAsset}`} />
          <DataRow label="Debt USD"    value={pos.debtUsd} />
          <DataRow
            label="Protection"
            value={
              <span style={{ color: pos.protectionMode !== 'NONE' ? '#a8e063' : '#5a5a50' }}>
                {getProtectionLabel(pos.protectionMode)}
              </span>
            }
          />
          {pos.protectionThreshold && (
            <DataRow label="Threshold" value={`HF ${pos.protectionThreshold.toFixed(2)}`} />
          )}
        </div>
      </TechnicalPanel>

      {/* Mini sparkline using snapshots */}
      <TechnicalPanel>
        <div className="p-4">
          <div className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase mb-3">
            Health Factor History
          </div>
          <MiniSparkline snapshots={snapshots} riskState={pos.riskState} />
        </div>
      </TechnicalPanel>
    </div>
  )
}

function MiniSparkline({ snapshots, riskState }: { snapshots: { healthFactor: number }[], riskState: string }) {
  if (!snapshots.length) return null

  const max = Math.max(...snapshots.map(s => s.healthFactor))
  const min = Math.min(1.0, ...snapshots.map(s => s.healthFactor))
  const range = max - min || 1
  const w = 200, h = 48
  const pts = snapshots.map((s, i) => {
    const x = (i / (snapshots.length - 1)) * w
    const y = h - ((s.healthFactor - min) / range) * h
    return `${x},${y}`
  }).join(' ')

  const color = riskState === 'SAFE' ? '#a8e063' : riskState === 'WARNING' ? '#e8a040' : '#e05050'

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 48 }}>
      {/* Threshold line at 1.05 */}
      <line
        x1="0" y1={h - ((1.05 - min) / range) * h}
        x2={w} y2={h - ((1.05 - min) / range) * h}
        stroke="#e05050" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.4"
      />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      {snapshots.length > 0 && (() => {
        const last = snapshots[snapshots.length - 1]
        const x = w
        const y = h - ((last.healthFactor - min) / range) * h
        return <circle cx={x} cy={y} r="3" fill={color} />
      })()}
    </svg>
  )
}

function ProtocolDot({ protocol }: { protocol: string }) {
  const colors: Record<string, string> = {
    'aave-v3':     '#b660cd',
    'compound-v3': '#00d395',
    'morpho-blue': '#2470dd',
  }
  return (
    <div
      className="w-6 h-6 rounded-sm shrink-0"
      style={{ background: `${colors[protocol] ?? '#5a5a50'}22`, border: `1px solid ${colors[protocol] ?? '#5a5a50'}40` }}
    >
      <div className="w-full h-full flex items-center justify-center">
        <div className="w-2 h-2 rounded-full" style={{ background: colors[protocol] ?? '#5a5a50' }} />
      </div>
    </div>
  )
}
