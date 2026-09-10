import React from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useNavigate, Link } from 'react-router-dom'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TechnicalPanel, ScrollReveal } from '../../components/ui/TechnicalPanel'
import { HealthFactorGauge } from '../../components/visualizations/HealthFactorGauge'
import { DashboardCore3D } from '../../components/visualizations/DashboardCore3D'
import { Button } from '../../components/ui/Button'
import { DEMO_POSITIONS, DEMO_ACTIVITY, getDemoStats } from '../../data/demo'
import { getProtocolLabel, timeAgo } from '../../lib/utils'
import { getProtectionLabel } from '../../types/position'
import type { ActivityRecord } from '../../types/activity'

// ─── AppOverviewPage ──────────────────────────────────────────────────────────
// Luxury dApp Overview Dashboard
// Integrated with 3D Live Defense Core, Telemetry Cards, and Audit Feed
// ─────────────────────────────────────────────────────────────────────────────

export function AppOverviewPage() {
  const { isConnected } = useAccount()
  const navigate = useNavigate()
  const stats = getDemoStats()

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* Top Header & System Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-2xl font-bold text-white tracking-tight">
              Terminal Overview
            </h1>
            <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-aegis-lime/10 border border-aegis-lime/30 text-aegis-lime font-bold">
              CC3 TESTNET READY
            </span>
          </div>
          <p className="text-xs text-aegis-muted font-mono tracking-wide">
            Continuous 30s Polling • The Graph • Attestcoin Cryptographic Verification
          </p>
        </div>

        {/* Wallet Connection */}
        {!isConnected && (
          <div className="shrink-0">
            <ConnectButton chainStatus="none" showBalance={false} />
          </div>
        )}
      </div>

      {/* 3D Live Aegis Defense Core Banner */}
      <DashboardCore3D
        statusText="MONITORING ACTIVE • 30S POLLING"
        healthFactor={stats.averageHealthFactor}
        isProtected={stats.protectedPositions > 0}
      />

      {/* High-Level Key Financial Telemetry Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: 'Total Positions',
            value: String(stats.totalPositions),
            sub: 'Aave, Morpho, Compound',
            color: '#a8e063',
          },
          {
            label: 'Positions at Risk',
            value: String(stats.positionsAtRisk),
            sub: stats.positionsAtRisk > 0 ? 'Action Recommended' : 'Zero Liquidation Risk',
            color: stats.positionsAtRisk > 0 ? '#e8a040' : '#a8e063',
          },
          {
            label: 'Protected Positions',
            value: `${stats.protectedPositions} / ${stats.totalPositions}`,
            sub: 'CC3 Non-Custodial Bounds',
            color: '#a8e063',
          },
          {
            label: 'Average Health Factor',
            value: stats.averageHealthFactor.toFixed(2),
            sub: 'SAFE Portfolio Buffer',
            color: '#c5f57a',
          },
        ].map(stat => (
          <div
            key={stat.label}
            className="p-5 rounded-2xl glass-panel-luxury border border-aegis-border-emerald relative overflow-hidden"
          >
            <div className="font-mono text-[10px] text-aegis-muted uppercase tracking-wider mb-2 font-semibold">
              {stat.label}
            </div>
            <div
              className="font-display text-2xl font-bold tabular-nums mb-1"
              style={{ color: stat.color }}
            >
              {stat.value}
            </div>
            <div className="font-mono text-[10px] text-white/40">{stat.sub}</div>
          </div>
        ))}
      </div>

      {/* Two Columns: Positions (Left 2/3) + Real-Time Activity (Right 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Monitored Loan Positions */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-white">Monitored Positions</h2>
              <p className="font-mono text-xs text-aegis-muted">
                Click any position to inspect collateral, debt, and stress tests
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/positions')}>
              View All →
            </Button>
          </div>

          <div className="space-y-3">
            {DEMO_POSITIONS.map((pos, i) => (
              <ScrollReveal key={pos.id} delay={i * 50}>
                <div
                  onClick={() => navigate(`/app/positions/${pos.id}`)}
                  className="p-5 rounded-2xl glass-panel-luxury border border-aegis-border-emerald hover:border-aegis-lime cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-aegis-lime/10 border border-aegis-lime/30 flex items-center justify-center font-bold text-aegis-lime font-mono text-xs">
                        {pos.protocol.split('-')[0].toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-display text-sm font-bold text-white group-hover:text-aegis-lime transition-colors">
                          {getProtocolLabel(pos.protocol)}
                        </div>
                        <div className="font-mono text-[11px] text-aegis-muted">
                          {pos.chainName}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge state={pos.riskState} size="sm" />
                      <span className="font-mono text-xs text-aegis-lime opacity-0 group-hover:opacity-100 transition-opacity">
                        Inspect →
                      </span>
                    </div>
                  </div>

                  {/* Grid details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    {/* Health Factor */}
                    <div className="flex items-center gap-3">
                      <HealthFactorGauge
                        healthFactor={pos.healthFactor}
                        riskState={pos.riskState}
                        size="sm"
                        showLabel={false}
                      />
                      <div>
                        <div className="font-mono text-[10px] text-white/40 uppercase">HEALTH FACTOR</div>
                        <div
                          className="font-mono text-sm font-bold tabular-nums"
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
                    </div>

                    {/* Collateral */}
                    <div>
                      <div className="font-mono text-[10px] text-white/40 uppercase">COLLATERAL</div>
                      <div className="font-mono text-xs text-white font-semibold">
                        {pos.collateralAmount} {pos.collateralAsset}
                      </div>
                      <div className="font-mono text-[11px] text-aegis-muted">{pos.collateralUsd}</div>
                    </div>

                    {/* Debt */}
                    <div>
                      <div className="font-mono text-[10px] text-white/40 uppercase">DEBT</div>
                      <div className="font-mono text-xs text-white font-semibold">
                        {pos.debtAmount} {pos.debtAsset}
                      </div>
                      <div className="font-mono text-[11px] text-aegis-muted">{pos.debtUsd}</div>
                    </div>

                    {/* Protection Policy */}
                    <div className="text-right">
                      <div className="font-mono text-[10px] text-white/40 uppercase">POLICY</div>
                      <div
                        className="font-mono text-xs font-semibold"
                        style={{ color: pos.protectionMode !== 'NONE' ? '#a8e063' : '#5a5a50' }}
                      >
                        {getProtectionLabel(pos.protectionMode)}
                      </div>
                      <div className="font-mono text-[10px] text-white/40">
                        {pos.protectionThreshold ? `Trigger < ${pos.protectionThreshold.toFixed(2)}` : 'Unprotected'}
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Real-time Activity Feed (Right 1/3) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-white">Activity Log</h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/app/activity')}>
              Full Audit →
            </Button>
          </div>

          <div className="p-4 rounded-2xl glass-panel-luxury border border-aegis-border-emerald divide-y divide-white/[0.06]">
            {DEMO_ACTIVITY.slice(0, 6).map(record => (
              <ActivityItem key={record.id} record={record} />
            ))}
          </div>
        </div>
      </div>

      {/* Demo Notice Banner */}
      <div className="p-4 rounded-xl bg-[#061109] border border-aegis-border-emerald flex items-center gap-3 font-mono text-xs text-aegis-muted">
        <span className="w-2 h-2 rounded-full bg-aegis-lime animate-pulse shrink-0" />
        <span>
          Aegis Terminal connects to Creditcoin CC3 (Chain ID 102031) and Ethereum Sepolia. In demo mode, live telemetry data simulates continuous 30-second polling and non-custodial protection.
        </span>
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
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-start gap-2.5">
        <div
          className="mt-1 w-1.5 h-1.5 rounded-full shrink-0"
          style={{ background: colorMap[record.action] || '#a8e063' }}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span
              className="font-mono text-[11px] font-semibold tracking-wide truncate"
              style={{ color: colorMap[record.action] || '#a8e063' }}
            >
              {record.action.replace(/_/g, ' ')}
            </span>
            <span className="font-mono text-[10px] text-white/30 shrink-0">
              {timeAgo(record.timestamp)}
            </span>
          </div>
          <p className="font-mono text-xs text-aegis-muted truncate">{record.positionLabel}</p>
        </div>
      </div>
    </div>
  )
}
