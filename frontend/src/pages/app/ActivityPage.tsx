import React from 'react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { MonoValue } from '../../components/ui/TechnicalPanel'
import { DEMO_ACTIVITY } from '../../data/demo'
import { formatTimestamp, timeAgo, truncateHash } from '../../lib/utils'
import { getActionLabel } from '../../types/activity'
import type { ActivityRecord } from '../../types/activity'

// ─── ActivityPage ─────────────────────────────────────────────────────────────
// Cryptographic event and attestation audit log in luxury fintech styling
// ─────────────────────────────────────────────────────────────────────────────

const ACTION_COLORS: Record<string, string> = {
  PROTECTION_TRIGGERED:  '#a8e063',
  PROOF_GENERATED:       '#5be4c8',
  ATTESTATION_VERIFIED:  '#5be4c8',
  SETTLEMENT_EXECUTED:   '#a8e063',
  PROTECTION_CONFIGURED: '#a8e063',
  RISK_ALERT:            '#e8a040',
  POSITION_SCAN:         '#5a5a50',
}

type FilterChain = 'ALL' | 'ETHEREUM' | 'CREDITCOIN'

export function ActivityPage() {
  const [filterChain, setFilterChain] = React.useState<FilterChain>('ALL')
  const [selected, setSelected] = React.useState<string | null>(DEMO_ACTIVITY[0]?.id || null)

  const filtered =
    filterChain === 'ALL'
      ? DEMO_ACTIVITY
      : DEMO_ACTIVITY.filter(r => r.chain === filterChain)

  const selectedRecord = DEMO_ACTIVITY.find(r => r.id === selected)

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            Activity & Proof Audit Log
          </h1>
          <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-aegis-lime/10 border border-aegis-lime/30 text-aegis-lime font-bold">
            IMMUTABLE RECORDS
          </span>
        </div>
        <p className="text-xs text-aegis-muted font-mono">
          Cryptographic state proofs, Attestcoin verifications, and settlement dispatches
        </p>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2">
        {(['ALL', 'ETHEREUM', 'CREDITCOIN'] as FilterChain[]).map(chain => (
          <button
            key={chain}
            onClick={() => setFilterChain(chain)}
            className={`px-3 py-1.5 rounded-lg font-mono text-xs uppercase tracking-wider transition-all ${
              filterChain === chain
                ? 'bg-aegis-lime text-black font-bold shadow-[0_0_12px_#a8e063]'
                : 'bg-[#08150d] text-aegis-muted hover:text-white border border-white/[0.06]'
            }`}
          >
            {chain}
          </button>
        ))}
      </div>

      {/* Event Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Event List (Left 7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="rounded-2xl glass-panel-luxury border border-aegis-border-emerald divide-y divide-white/[0.06] overflow-hidden">
            {filtered.map(record => {
              const isSelected = selected === record.id
              return (
                <button
                  key={record.id}
                  onClick={() => setSelected(record.id)}
                  className={`w-full text-left p-4 transition-all duration-200 block ${
                    isSelected
                      ? 'bg-[#0b1b11] border-l-2 border-l-aegis-lime'
                      : 'hover:bg-white/[0.02] border-l-2 border-l-transparent'
                  }`}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-1 w-2 h-2 rounded-full shrink-0"
                      style={{
                        background: ACTION_COLORS[record.action] || '#a8e063',
                        boxShadow: `0 0 8px ${ACTION_COLORS[record.action] || '#a8e063'}`,
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className="font-mono text-xs font-bold tracking-wide truncate"
                          style={{ color: ACTION_COLORS[record.action] || '#a8e063' }}
                        >
                          {getActionLabel(record.action)}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-[10px] text-white/40 uppercase">
                            {record.chain}
                          </span>
                          <span className="font-mono text-[10px] text-aegis-muted">
                            {timeAgo(record.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="font-mono text-xs text-aegis-muted truncate">
                        {record.positionLabel}
                      </p>
                      {record.settlementRef && (
                        <div className="mt-1 font-mono text-[11px] text-white/50">
                          Ref: {truncateHash(record.settlementRef)}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}

            {filtered.length === 0 && (
              <div className="p-12 text-center text-aegis-muted font-mono text-xs">
                No events recorded for this chain.
              </div>
            )}
          </div>
        </div>

        {/* Selected Event Detail (Right 5 Cols) */}
        <div className="lg:col-span-5">
          {selectedRecord ? (
            <div className="p-6 rounded-2xl glass-panel-luxury border border-aegis-border-emerald space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ background: ACTION_COLORS[selectedRecord.action] || '#a8e063' }}
                  />
                  <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
                    {getActionLabel(selectedRecord.action)}
                  </span>
                </div>
                <StatusBadge
                  state={selectedRecord.status === 'SUCCESS' ? 'SAFE' : 'WARNING'}
                  size="sm"
                />
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between border-b border-white/[0.04] pb-2">
                  <span className="text-white/40">Timestamp</span>
                  <span className="text-white">{formatTimestamp(selectedRecord.timestamp)}</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-2">
                  <span className="text-white/40">Position</span>
                  <span className="text-white">{selectedRecord.positionLabel}</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-2">
                  <span className="text-white/40">Chain</span>
                  <span className="text-white">{selectedRecord.chain}</span>
                </div>
                <div className="flex justify-between border-b border-white/[0.04] pb-2">
                  <span className="text-white/40">Trigger Source</span>
                  <span className="text-aegis-lime">{selectedRecord.triggerSource}</span>
                </div>
                {selectedRecord.healthFactor !== null && (
                  <div className="flex justify-between border-b border-white/[0.04] pb-2">
                    <span className="text-white/40">HF at Event</span>
                    <span className="text-white font-bold">
                      {selectedRecord.healthFactor.toFixed(2)}
                    </span>
                  </div>
                )}
                {selectedRecord.settlementRef && (
                  <div className="flex justify-between border-b border-white/[0.04] pb-2">
                    <span className="text-white/40">Proof Hash</span>
                    <span className="text-emerald-400 truncate max-w-40">
                      {selectedRecord.settlementRef}
                    </span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <div className="font-mono text-[10px] text-white/40 uppercase mb-1">
                  Event Technical Payload
                </div>
                <p className="font-mono text-xs text-aegis-muted leading-relaxed p-3 rounded-lg bg-[#061009] border border-white/[0.04]">
                  {selectedRecord.details}
                </p>
              </div>

              {selectedRecord.isDemo && (
                <div className="pt-2 text-[10px] font-mono text-amber-400">
                  ⚡ Simulated Telemetry Event • Verified on Creditcoin CC3 Testnet
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 rounded-2xl glass-panel-luxury border border-dashed border-white/[0.1] text-center text-aegis-muted font-mono text-xs">
              Select an activity event to view proof details
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
