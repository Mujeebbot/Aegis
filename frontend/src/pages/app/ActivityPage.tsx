import React from 'react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TechnicalPanel, MonoValue } from '../../components/ui/TechnicalPanel'
import { DEMO_ACTIVITY } from '../../data/demo'
import { formatTimestamp, timeAgo, truncateHash } from '../../lib/utils'
import { getActionLabel } from '../../types/activity'
import type { ActivityRecord, ActivityChain } from '../../types/activity'

// ─── ActivityPage ─────────────────────────────────────────────────────────────

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
  const [selected, setSelected] = React.useState<string | null>(null)

  const filtered = filterChain === 'ALL'
    ? DEMO_ACTIVITY
    : DEMO_ACTIVITY.filter(r => r.chain === filterChain)

  const selectedRecord = DEMO_ACTIVITY.find(r => r.id === selected)

  return (
    <div className="p-5 md:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <h1 className="font-display text-2xl font-bold text-aegis-white">Activity Log</h1>
            <StatusBadge state="DEMO" size="sm" />
          </div>
          <p className="text-sm text-aegis-dim font-mono">
            Full system event history — proofs, verifications, settlements
          </p>
        </div>
      </div>

      {/* Chain filter */}
      <div className="flex gap-2 mb-6">
        {(['ALL', 'ETHEREUM', 'CREDITCOIN'] as FilterChain[]).map(chain => (
          <button
            key={chain}
            onClick={() => setFilterChain(chain)}
            className="px-3 py-1.5 rounded-sm font-mono text-label-xs tracking-widest uppercase transition-all duration-150"
            style={{
              background: filterChain === chain ? 'rgba(168,224,99,0.1)' : '#111110',
              border: `1px solid ${filterChain === chain ? 'rgba(168,224,99,0.3)' : '#242420'}`,
              color: filterChain === chain ? '#a8e063' : '#5a5a50',
            }}
          >
            {chain}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Event list */}
        <div className="lg:col-span-3">
          <TechnicalPanel>
            <div className="divide-y divide-aegis-border/30">
              {filtered.map(record => (
                <button
                  key={record.id}
                  onClick={() => setSelected(s => s === record.id ? null : record.id)}
                  className="w-full text-left px-4 py-4 hover:bg-aegis-raised/50 transition-colors duration-150 group"
                  aria-pressed={selected === record.id}
                  style={{
                    background: selected === record.id ? 'rgba(168,224,99,0.04)' : undefined,
                    borderLeft: selected === record.id ? '2px solid #a8e063' : '2px solid transparent',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-1 w-2 h-2 rounded-full shrink-0"
                      style={{ background: ACTION_COLORS[record.action] }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className="font-mono text-xs font-semibold tracking-wide"
                          style={{ color: ACTION_COLORS[record.action] }}
                        >
                          {getActionLabel(record.action)}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className="font-mono text-label-xs tracking-widest uppercase"
                            style={{ color: record.chain === 'CREDITCOIN' ? '#5be4c8' : '#5a5a50' }}
                          >
                            {record.chain}
                          </span>
                          <span className="font-mono text-label-xs text-aegis-muted">
                            {timeAgo(record.timestamp)}
                          </span>
                        </div>
                      </div>
                      <p className="font-mono text-xs text-aegis-dim truncate">{record.positionLabel}</p>
                      {record.settlementRef && (
                        <MonoValue className="mt-1 block" dim>
                          {truncateHash(record.settlementRef)}
                        </MonoValue>
                      )}
                    </div>
                  </div>
                </button>
              ))}

              {filtered.length === 0 && (
                <div className="px-4 py-12 text-center">
                  <p className="font-mono text-label-xs text-aegis-muted tracking-widest uppercase">
                    No events for this chain
                  </p>
                </div>
              )}
            </div>
          </TechnicalPanel>
        </div>

        {/* Detail panel */}
        <div className="lg:col-span-2">
          {selectedRecord ? (
            <ActivityDetail record={selectedRecord} />
          ) : (
            <div
              className="rounded-sm h-48 flex items-center justify-center"
              style={{ background: '#0a0a08', border: '1px solid #1c1c19', borderStyle: 'dashed' }}
            >
              <p className="font-mono text-label-xs text-aegis-muted tracking-widest uppercase">
                Select an event
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ActivityDetail({ record }: { record: ActivityRecord }) {
  const color = ACTION_COLORS[record.action]

  return (
    <TechnicalPanel
      glow={record.action === 'PROOF_GENERATED' || record.action === 'ATTESTATION_VERIFIED'}
      header={
        <>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: color }} />
            <span className="font-display text-sm font-semibold text-aegis-white">
              {getActionLabel(record.action)}
            </span>
          </div>
          <StatusBadge
            state={record.status === 'SUCCESS' ? 'SAFE' : record.status === 'PENDING' ? 'WARNING' : 'CRITICAL'}
            size="sm"
          />
        </>
      }
    >
      <div className="p-4 space-y-3 text-sm">
        <Row label="Timestamp"  value={formatTimestamp(record.timestamp)} />
        <Row label="Position"   value={record.positionLabel} />
        <Row label="Chain"      value={record.chain} />
        <Row label="Trigger"    value={record.triggerSource} />
        {record.healthFactor !== null && (
          <Row label="HF at event" value={record.healthFactor.toFixed(2)} />
        )}
        {record.settlementRef && (
          <Row label="Ref" value={<MonoValue selectable>{record.settlementRef}</MonoValue>} />
        )}
        <div className="pt-3 border-t border-aegis-border/40">
          <div className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase mb-2">Details</div>
          <p className="text-xs text-aegis-off leading-relaxed">{record.details}</p>
        </div>
        {record.isDemo && (
          <div className="pt-2">
            <span className="font-mono text-label-xs text-aegis-amber">Demo event · Not a real transaction</span>
          </div>
        )}
      </div>
    </TechnicalPanel>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-aegis-border/30 pb-2.5 last:border-0 last:pb-0">
      <span className="font-mono text-xs text-aegis-dim shrink-0">{label}</span>
      <span className="font-mono text-xs text-aegis-white text-right">{value}</span>
    </div>
  )
}
