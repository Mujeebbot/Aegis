import React from 'react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TechnicalPanel, DataRow } from '../../components/ui/TechnicalPanel'
import { CHAIN_META } from '../../lib/chains'
import { useAccount, useChainId } from 'wagmi'

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const chainMeta = CHAIN_META[chainId]

  return (
    <div className="p-5 md:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1.5">
          <h1 className="font-display text-2xl font-bold text-aegis-white">Settings</h1>
          <StatusBadge state="TESTNET" size="sm" />
        </div>
        <p className="text-sm text-aegis-dim font-mono">System configuration and network details</p>
      </div>

      <div className="space-y-5">
        {/* Wallet */}
        <TechnicalPanel
          header={
            <span className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase">
              Wallet
            </span>
          }
        >
          <div className="p-4">
            <DataRow label="Status"  value={<StatusBadge state={isConnected ? 'MONITORING' : 'OFFLINE'} />} />
            <DataRow label="Address" value={<span className="font-mono text-xs truncate max-w-32">{address ?? 'Not connected'}</span>} />
          </div>
        </TechnicalPanel>

        {/* Network */}
        <TechnicalPanel
          header={
            <span className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase">
              Network
            </span>
          }
        >
          <div className="p-4">
            <DataRow label="Connected chain"  value={chainMeta?.name ?? 'Unknown'} />
            <DataRow label="Chain ID"         value={<span className="font-mono text-xs">{chainId}</span>} />
            <DataRow label="Settlement layer" value={<span className="text-aegis-cyan">Creditcoin CC3 (102031)</span>} />
            <DataRow label="Source chain"     value={<span className="text-aegis-lime">Ethereum Sepolia (11155111)</span>} />
          </div>
        </TechnicalPanel>

        {/* Contracts */}
        <TechnicalPanel
          header={
            <span className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase">
              Contracts (CC3 Testnet)
            </span>
          }
        >
          <div className="p-4">
            <DataRow
              label="Settlement"
              value={<span className="font-mono text-xs text-aegis-subtle truncate max-w-48">0x0000...TBD</span>}
            />
            <DataRow
              label="Attestcoin (ASC)"
              value={<span className="font-mono text-xs text-aegis-subtle truncate max-w-48">0x0000...TBD</span>}
            />
            <DataRow
              label="SAFE_THRESHOLD"
              value={<span className="font-mono text-xs text-aegis-lime">1.05 HF</span>}
            />
          </div>
        </TechnicalPanel>

        {/* System */}
        <TechnicalPanel
          header={
            <span className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase">
              System
            </span>
          }
        >
          <div className="p-4">
            <DataRow label="AI scan interval"    value={<span className="font-mono text-xs">30 seconds</span>} />
            <DataRow label="Attestation time"    value={<span className="font-mono text-xs">~15 seconds</span>} />
            <DataRow label="Mode"                value={<StatusBadge state="DEMO" />} />
            <DataRow label="Oracle worker"       value={<span className="font-mono text-xs text-aegis-dim">Simulated</span>} />
          </div>
        </TechnicalPanel>

        {/* Disclaimer */}
        <div className="px-4 py-3 rounded-sm" style={{ background: 'rgba(232,160,64,0.06)', border: '1px solid rgba(232,160,64,0.12)' }}>
          <p className="font-mono text-label-xs text-aegis-dim leading-relaxed">
            Aegis is running in demo mode. Contract addresses are not yet deployed.
            This interface is built for the BUIDL CTC 2026 Fall Hackathon.
            Not financial advice. Testnet only.
          </p>
        </div>
      </div>
    </div>
  )
}
