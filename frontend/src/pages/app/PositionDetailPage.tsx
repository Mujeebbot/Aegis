import React, { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { DEMO_POSITIONS, DEMO_SNAPSHOTS } from '../../data/demo'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TechnicalPanel, DataRow } from '../../components/ui/TechnicalPanel'
import { HealthFactorGauge } from '../../components/visualizations/HealthFactorGauge'
import { Button } from '../../components/ui/Button'
import { getProtocolLabel, timeAgo } from '../../lib/utils'
import { getProtectionLabel } from '../../types/position'

// ─── PositionDetailPage ───────────────────────────────────────────────────────
// Detailed telemetry and simulation inspection for a specific loan position
// Route: /app/positions/:id
// ─────────────────────────────────────────────────────────────────────────────

export function PositionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const pos = DEMO_POSITIONS.find(p => p.id === id) || DEMO_POSITIONS[0]
  const snapshots = DEMO_SNAPSHOTS[pos.id] || []

  // Simulation slider: Collateral price drop percentage (0% to -40%)
  const [priceDropPct, setPriceDropPct] = useState<number>(0)

  // Calculate simulated health factor
  const simulatedCollateralMultiplier = 1 - priceDropPct / 100
  const simulatedHF = Math.max(0.5, Number((pos.healthFactor * simulatedCollateralMultiplier).toFixed(2)))
  const simulatedRisk =
    simulatedHF >= 1.5 ? 'SAFE' : simulatedHF >= 1.15 ? 'WARNING' : 'CRITICAL'

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/positions')}
            className="px-3 py-1.5 rounded-lg bg-[#0b1b11] border border-aegis-border-emerald hover:border-aegis-lime text-aegis-lime font-mono text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <span>←</span>
            <span>All Positions</span>
          </button>
          <span className="text-white/20">/</span>
          <span className="font-mono text-xs text-white/60">{pos.id}</span>
        </div>

        <Link to={`/app/protection?pos=${pos.id}`}>
          <Button variant="primary" size="sm">
            Configure Policy →
          </Button>
        </Link>
      </div>

      {/* Position Hero Header Card */}
      <div className="glass-panel-luxury p-6 rounded-2xl border border-aegis-border-emerald mb-8 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-aegis-lime/10 border border-aegis-lime/30 flex items-center justify-center font-display font-bold text-aegis-lime text-lg">
              {pos.protocol.split('-')[0].toUpperCase().slice(0, 2)}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-2xl font-bold text-white">
                  {getProtocolLabel(pos.protocol)}
                </h1>
                <StatusBadge state="DEMO MODE" size="sm" />
                <StatusBadge state={pos.riskState} size="sm" />
              </div>
              <p className="font-mono text-xs text-aegis-muted">
                {pos.chainName} • Monitored via The Graph Subgraph • Last updated {timeAgo(pos.lastUpdated)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="font-mono text-[10px] text-aegis-muted uppercase tracking-wider">
                CURRENT HEALTH FACTOR
              </div>
              <div
                className="font-display text-3xl font-bold tabular-nums"
                style={{
                  color:
                    pos.riskState === 'SAFE'
                      ? '#a8e063'
                      : pos.riskState === 'WARNING'
                      ? '#e8a040'
                      : '#ef4444',
                }}
              >
                {pos.healthFactor.toFixed(2)}
              </div>
            </div>
            <HealthFactorGauge
              healthFactor={pos.healthFactor}
              riskState={pos.riskState}
              size="md"
              showLabel={false}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Financial Telemetry & Simulation */}
        <div className="lg:col-span-7 space-y-6">
          {/* Balance Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 rounded-2xl glass-panel-luxury border border-white/[0.06]">
              <div className="font-mono text-[10px] text-aegis-muted uppercase tracking-wider mb-1">
                COLLATERAL SUPPLIED
              </div>
              <div className="font-display text-2xl font-bold text-white mb-1">
                {pos.collateralAmount} {pos.collateralAsset}
              </div>
              <div className="font-mono text-xs text-aegis-lime">{pos.collateralUsd}</div>
            </div>

            <div className="p-5 rounded-2xl glass-panel-luxury border border-white/[0.06]">
              <div className="font-mono text-[10px] text-aegis-muted uppercase tracking-wider mb-1">
                DEBT BORROWED
              </div>
              <div className="font-display text-2xl font-bold text-white mb-1">
                {pos.debtAmount} {pos.debtAsset}
              </div>
              <div className="font-mono text-xs text-white/60">{pos.debtUsd}</div>
            </div>
          </div>

          {/* Interactive Liquidation Shock Simulator */}
          <div className="p-6 rounded-2xl glass-panel-luxury border border-aegis-border-emerald">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-aegis-lime animate-pulse" />
                <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                  MARKET STRESS SIMULATOR
                </h3>
              </div>
              <span className="font-mono text-xs text-aegis-lime font-bold">
                -{priceDropPct}% Price Shock
              </span>
            </div>

            <p className="text-xs text-aegis-muted leading-relaxed mb-6 font-mono">
              Simulate collateral asset price decline to visualize when Aegis autonomous intervention triggers.
            </p>

            {/* Slider */}
            <div className="space-y-2 mb-6">
              <input
                type="range"
                min={0}
                max={40}
                step={1}
                value={priceDropPct}
                onChange={e => setPriceDropPct(Number(e.target.value))}
                className="w-full accent-aegis-lime cursor-pointer"
              />
              <div className="flex justify-between font-mono text-[10px] text-aegis-muted">
                <span>0% (Current Price)</span>
                <span>-20% Correction</span>
                <span>-40% Crash</span>
              </div>
            </div>

            {/* Simulation Results Strip */}
            <div className="p-4 rounded-xl bg-[#061109] border border-white/[0.06] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-mono text-white/40 uppercase">
                  SIMULATED HEALTH FACTOR
                </div>
                <div
                  className="font-display text-xl font-bold tabular-nums"
                  style={{
                    color:
                      simulatedRisk === 'SAFE'
                        ? '#a8e063'
                        : simulatedRisk === 'WARNING'
                        ? '#e8a040'
                        : '#ef4444',
                  }}
                >
                  {simulatedHF.toFixed(2)} ({simulatedRisk})
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-mono text-white/40 uppercase">
                  AEGIS INTERVENTION
                </div>
                <div className="font-mono text-xs font-bold text-aegis-lime">
                  {simulatedHF <= (pos.protectionThreshold || 1.15)
                    ? 'AUTONOMOUS REPAY TRIGGERED'
                    : 'PASSIVE MONITORING'}
                </div>
              </div>
            </div>
          </div>

          {/* Historical Health Factor Telemetry */}
          <div className="p-6 rounded-2xl glass-panel-luxury border border-white/[0.06]">
            <h3 className="font-mono text-xs font-bold text-white uppercase tracking-wider mb-4">
              Historical Health Factor Trajectory
            </h3>
            {snapshots.length > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono text-aegis-muted">
                  <span>Last 24h Polling Record</span>
                  <span className="text-aegis-lime">30s Interval</span>
                </div>
                <div className="h-20 flex items-end gap-1 pt-4">
                  {snapshots.map((s, idx) => {
                    const heightPct = Math.min(100, Math.max(15, (s.healthFactor / 2.5) * 100))
                    return (
                      <div
                        key={idx}
                        className="flex-1 bg-aegis-lime/30 hover:bg-aegis-lime rounded-t transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`HF: ${s.healthFactor.toFixed(2)}`}
                      />
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="font-mono text-xs text-aegis-muted">No historical snapshots recorded yet.</p>
            )}
          </div>
        </div>

        {/* Right Column: Active Protection Policy & Security Bounds */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-2xl glass-panel-luxury border border-aegis-border-emerald">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-4">
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                ACTIVE DEFENSE POLICY
              </span>
              <span className="font-mono text-[10px] text-aegis-lime px-2 py-0.5 rounded bg-aegis-lime/10 border border-aegis-lime/30">
                CREDITCOIN CC3
              </span>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between font-mono text-xs">
                <span className="text-white/40">Protection Mode:</span>
                <span className="text-aegis-lime font-bold">
                  {getProtectionLabel(pos.protectionMode)}
                </span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span className="text-white/40">Trigger Threshold:</span>
                <span className="text-white font-bold">
                  HF &lt; {pos.protectionThreshold?.toFixed(2) || '1.15'}
                </span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span className="text-white/40">Proof Verifier:</span>
                <span className="text-white">Attestcoin ASC (CC3)</span>
              </div>
              <div className="flex justify-between font-mono text-xs">
                <span className="text-white/40">Custody Status:</span>
                <span className="text-emerald-400">Non-Custodial</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#061009] border border-white/[0.06] text-xs font-mono text-aegis-muted space-y-2 mb-6">
              <div className="text-[10px] text-aegis-lime uppercase font-semibold">
                SECURITY INVARIANT GUARANTEE
              </div>
              <p className="leading-relaxed">
                Repayment actions are restricted strictly to debt repayment within the protocol pool contract. No ERC-20 transfer permissions exist to external addresses.
              </p>
            </div>

            <Link to={`/app/protection?pos=${pos.id}`} className="block">
              <Button variant="primary" size="md" className="w-full">
                Adjust Defense Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
