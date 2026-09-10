import React from 'react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TechnicalPanel, DataRow } from '../../components/ui/TechnicalPanel'
import { HealthFactorGauge, HealthFactorBar } from '../../components/visualizations/HealthFactorGauge'
import { Button } from '../../components/ui/Button'
import { DEMO_POSITIONS, DEMO_SNAPSHOTS } from '../../data/demo'
import { getProtocolLabel, timeAgo } from '../../lib/utils'
import { getRiskLabel, getProtectionLabel } from '../../types/position'
import type { Position } from '../../types/position'

// ─── PositionsPage ────────────────────────────────────────────────────────────
// Monitored Cross-Chain DeFi Loan Positions
// Integrated with luxury styling and direct deep inspection links
// ─────────────────────────────────────────────────────────────────────────────

export function PositionsPage() {
  const [selected, setSelected] = React.useState<string | null>(DEMO_POSITIONS[0]?.id || null)
  const navigate = useNavigate()
  const selectedPos = DEMO_POSITIONS.find(p => p.id === selected) ?? null

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Monitored Positions
            </h1>
            <StatusBadge state="DEMO MODE" size="sm" />
            <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-aegis-lime/10 border border-aegis-lime/30 text-aegis-lime font-bold">
              3 PROTOCOLS ACTIVE
            </span>
          </div>
          <p className="text-xs text-aegis-muted font-mono">
            Cross-chain lending telemetry via The Graph • Aave V3, Compound V3, Morpho Blue
          </p>
        </div>
      </div>

      {/* Contract Getter Blocker Notice */}
      <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 font-mono text-xs text-amber-300/90 flex items-start gap-3">
        <span className="text-amber-400 font-bold shrink-0">ℹ️ DEMO MODE NOTICE:</span>
        <div>
          Pending contract getter on Settlement contract (`getUserConfig(address user) view returns (ProtectionMode, uint256 threshold, bool configured)`).
          Displaying demo position state until Abraham adds the getter to the Solidity contract.
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Position List (Left 7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {DEMO_POSITIONS.map(pos => {
            const isSelected = selected === pos.id
            return (
              <div
                key={pos.id}
                onClick={() => setSelected(pos.id)}
                className={`p-5 rounded-2xl glass-panel-luxury border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-aegis-lime shadow-[0_0_24px_rgba(168,224,99,0.18)] bg-[#0b1b11]'
                    : 'border-aegis-border-emerald hover:border-aegis-lime/40'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-aegis-lime/10 border border-aegis-lime/30 flex items-center justify-center font-bold text-aegis-lime font-mono text-xs">
                      {pos.protocol.split('-')[0].toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div className="font-display text-sm font-bold text-white">
                        {getProtocolLabel(pos.protocol)}
                      </div>
                      <div className="font-mono text-[11px] text-aegis-muted">
                        {pos.chainName}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge state={pos.riskState} size="sm" />
                  </div>
                </div>

                {/* Health Factor Progress Bar */}
                <HealthFactorBar
                  healthFactor={pos.healthFactor}
                  riskState={pos.riskState}
                  className="mb-4"
                />

                {/* Financial Summary Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs font-mono mb-4">
                  <div>
                    <span className="text-white/40">Collateral: </span>
                    <span className="text-white font-semibold">
                      {pos.collateralAmount} {pos.collateralAsset}
                    </span>
                    <span className="text-aegis-muted text-[11px] block">{pos.collateralUsd}</span>
                  </div>
                  <div>
                    <span className="text-white/40">Debt: </span>
                    <span className="text-white font-semibold">
                      {pos.debtAmount} {pos.debtAsset}
                    </span>
                    <span className="text-aegis-muted text-[11px] block">{pos.debtUsd}</span>
                  </div>
                </div>

                {/* Action Row */}
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <div className="font-mono text-[11px]">
                    <span className="text-white/40">Policy: </span>
                    <span style={{ color: pos.protectionMode !== 'NONE' ? '#a8e063' : '#5a5a50' }}>
                      {getProtectionLabel(pos.protectionMode)}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/app/positions/${pos.id}`)
                    }}
                    className="font-mono text-xs text-aegis-lime hover:underline font-semibold flex items-center gap-1"
                  >
                    Inspect Details →
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Selected Position Quick Inspector (Right 5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {selectedPos ? (
            <div className="p-6 rounded-2xl glass-panel-luxury border border-aegis-border-emerald space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-aegis-lime animate-pulse" />
                  <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    QUICK INSPECTOR
                  </span>
                </div>
                <StatusBadge state={selectedPos.riskState} size="sm" />
              </div>

              {/* Central Gauge */}
              <div className="flex flex-col items-center py-2">
                <HealthFactorGauge
                  healthFactor={selectedPos.healthFactor}
                  riskState={selectedPos.riskState}
                  size="lg"
                  showLabel
                />
                <div className="font-mono text-xs text-aegis-muted mt-2">
                  {selectedPos.riskState === 'SAFE' ? 'Position Safe' : `Risk: ${getRiskLabel(selectedPos.riskState)}`}
                </div>
              </div>

              {/* Data Table */}
              <div className="space-y-2 pt-2 border-t border-white/[0.06]">
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-white/40">Protocol</span>
                  <span className="text-white">{getProtocolLabel(selectedPos.protocol)}</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-white/40">Network</span>
                  <span className="text-white">{selectedPos.chainName}</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-white/40">Collateral Value</span>
                  <span className="text-aegis-lime">{selectedPos.collateralUsd}</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-white/40">Debt Value</span>
                  <span className="text-white">{selectedPos.debtUsd}</span>
                </div>
                <div className="flex justify-between font-mono text-xs">
                  <span className="text-white/40">Trigger Threshold</span>
                  <span className="text-white">
                    {selectedPos.protectionThreshold ? `HF < ${selectedPos.protectionThreshold.toFixed(2)}` : 'None'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-white/[0.06] space-y-2">
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  onClick={() => navigate(`/app/positions/${selectedPos.id}`)}
                >
                  Open Full Detail Page →
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  className="w-full"
                  onClick={() => navigate(`/app/protection?pos=${selectedPos.id}`)}
                >
                  Configure Protection Policy
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8 rounded-2xl glass-panel-luxury border border-dashed border-white/[0.1] text-center text-aegis-muted font-mono text-xs">
              Select a position to view details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
