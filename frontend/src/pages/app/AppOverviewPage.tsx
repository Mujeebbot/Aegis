import React from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TechnicalPanel, DataRow, ScrollReveal } from '../../components/ui/TechnicalPanel'
import { HealthFactorGauge } from '../../components/visualizations/HealthFactorGauge'
import { Button } from '../../components/ui/Button'
import { DEMO_POSITIONS, DEMO_ACTIVITY, getDemoStats } from '../../data/demo'
import { getProtocolLabel, timeAgo, formatTimestamp } from '../../lib/utils'
import { getRiskLabel, getProtectionLabel } from '../../types/position'
import type { ActivityRecord } from '../../types/activity'

// ─── AppOverviewPage ──────────────────────────────────────────────────────────
// The main dApp dashboard — system status, positions summary, activity feed
// ─────────────────────────────────────────────────────────────────────────────

export function AppOverviewPage() {
  const { isConnected } = useAccount()
  const navigate = useNavigate()
  const stats = getDemoStats()

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="font-display text-2xl font-bold text-aegis-white">Overview</h1>
            <StatusBadge state="DEMO" size="sm" />
          </div>
          <p className="text-sm text-aegis-dim font-mono tracking-wide">
            System status · Position health · Activity log
          </p>
        </div>

        {/* Wallet connection */}
        {!isConnected && (
          <div className="shrink-0">
            <ConnectButton chainStatus="none" showBalance={false} />
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          { label: 'Positions',   value: String(stats.totalPositions), color: '#a8e063' },
          { label: 'At Risk',     value: String(stats.positionsAtRisk), color: stats.positionsAtRisk > 0 ? '#e8a040' : '#a8e063' },
          { label: 'Protected',   value: String(stats.protectedPositions), color: '#a8e063' },
          { label: 'Avg HF',      value: stats.averageHealthFactor.toFixed(2), color: '#a8e063' },
        ].map(stat => (
          <TechnicalPanel key={stat.label} className="text-center py-4 px-3">
            <div className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase mb-2">{stat.label}</div>
            <div className="font-display text-2xl font-bold tabular-nums" style={{ color: stat.color }}>
              {stat.value}
            </div>
          </TechnicalPanel>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Positions overview — 2/3 width */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-aegis-white">Positions</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/positions')}>
              View All →
            </Button>
          </div>

          {DEMO_POSITIONS.map((pos, i) => (
            <ScrollReveal key={pos.id} delay={i * 60}>
              <TechnicalPanel
                className="cursor-pointer hover:border-aegis-lime/20 transition-colors duration-200"
                header={
                  <>
                    <div>
                      <div className="font-display text-sm font-semibold text-aegis-white">
                        {getProtocolLabel(pos.protocol)}
                      </div>
                      <div className="font-mono text-label-xs text-aegis-dim mt-0.5 tracking-wide">
                        {pos.chainName}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge state={pos.riskState} size="sm" />
                    </div>
                  </>
                }
              >
                <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 items-center">
                  {/* Health Factor Gauge */}
                  <div className="flex items-center gap-3">
                    <HealthFactorGauge
                      healthFactor={pos.healthFactor}
                      riskState={pos.riskState}
                      size="sm"
                      showLabel={false}
                    />
                    <div>
                      <div className="font-mono text-xs text-aegis-dim">HF</div>
                      <div
                        className="font-mono text-sm font-bold tabular-nums"
                        style={{ color: pos.riskState === 'SAFE' ? '#a8e063' : pos.riskState === 'WARNING' ? '#e8a040' : '#e05050' }}
                      >
                        {pos.healthFactor.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Collateral */}
                  <div>
                    <div className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase mb-0.5">Collateral</div>
                    <div className="font-mono text-xs text-aegis-white">{pos.collateralAmount} {pos.collateralAsset}</div>
                    <div className="font-mono text-xs text-aegis-subtle">{pos.collateralUsd}</div>
                  </div>

                  {/* Debt */}
                  <div>
                    <div className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase mb-0.5">Debt</div>
                    <div className="font-mono text-xs text-aegis-white">{pos.debtAmount} {pos.debtAsset}</div>
                    <div className="font-mono text-xs text-aegis-subtle">{pos.debtUsd}</div>
                  </div>

                  {/* Protection */}
                  <div className="text-right">
                    <div className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase mb-0.5">Protection</div>
                    <div
                      className="font-mono text-xs"
                      style={{ color: pos.protectionMode !== 'NONE' ? '#a8e063' : '#5a5a50' }}
                    >
                      {getProtectionLabel(pos.protectionMode)}
                    </div>
                  </div>
                </div>
              </TechnicalPanel>
            </ScrollReveal>
          ))}
        </div>

        {/* Activity feed — 1/3 width */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-lg font-semibold text-aegis-white">Activity</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/activity')}>
              All →
            </Button>
          </div>

          <TechnicalPanel>
            <div className="divide-y divide-aegis-border/30">
              {DEMO_ACTIVITY.slice(0, 6).map(record => (
                <ActivityItem key={record.id} record={record} />
              ))}
            </div>
          </TechnicalPanel>
        </div>
      </div>

      {/* Demo notice */}
      <div className="mt-8 px-4 py-3 rounded-sm flex items-center gap-3" style={{ background: 'rgba(232,160,64,0.06)', border: '1px solid rgba(232,160,64,0.15)' }}>
        <span className="text-aegis-amber text-lg shrink-0">⚠</span>
        <p className="text-xs text-aegis-dim font-mono">
          This interface displays demo data for hackathon demonstration purposes.
          All positions, health factors, and activity records are simulated.
          Connect your wallet to interact with testnet smart contracts when live.
        </p>
      </div>
    </div>
  )
}

function ActivityItem({ record }: { record: ActivityRecord }) {
  const colorMap: Record<string, string> = {
    PROTECTION_TRIGGERED:  '#a8e063',
    PROOF_GENERATED:       '#5be4c8',
    ATTESTATION_VERIFIED:  '#5be4c8',
    SETTLEMENT_EXECUTED:   '#a8e063',
    PROTECTION_CONFIGURED: '#a8e063',
    RISK_ALERT:            '#e8a040',
    POSITION_SCAN:         '#5a5a50',
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-start gap-2.5">
        <div
          className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: colorMap[record.action] }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span
              className="font-mono text-label-xs font-semibold tracking-wide truncate"
              style={{ color: colorMap[record.action] }}
            >
              {record.action.replace(/_/g, ' ')}
            </span>
            <span className="font-mono text-label-xs text-aegis-muted shrink-0">
              {timeAgo(record.timestamp)}
            </span>
          </div>
          <p className="font-mono text-xs text-aegis-dim truncate">{record.positionLabel}</p>
        </div>
      </div>
    </div>
  )
}
