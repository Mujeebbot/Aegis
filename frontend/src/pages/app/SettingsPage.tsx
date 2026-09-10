import React from 'react'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { DataRow } from '../../components/ui/TechnicalPanel'
import { CHAIN_META } from '../../lib/chains'
import { useAccount, useChainId } from 'wagmi'

// ─── SettingsPage ─────────────────────────────────────────────────────────────
// System configuration and network details in luxury fintech styling
// ─────────────────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const chainMeta = CHAIN_META[chainId]

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display text-2xl font-bold text-white tracking-tight">
            System & Network Parameters
          </h1>
          <span className="font-mono text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/30 text-emerald-400 font-bold">
            CC3 TESTNET
          </span>
        </div>
        <p className="text-xs text-aegis-muted font-mono">
          Cryptographic node configuration • Creditcoin consensus parameters
        </p>
      </div>

      <div className="space-y-5">
        {/* Wallet */}
        <div className="p-5 rounded-2xl glass-panel-luxury border border-aegis-border-emerald">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Connected Signer
            </span>
            <StatusBadge state={isConnected ? 'MONITORING' : 'OFFLINE'} size="sm" />
          </div>
          <div className="space-y-1">
            <DataRow
              label="Address"
              value={
                <span className="font-mono text-xs text-white">
                  {address ?? '0x71C8364...3F9A (Demo Signer)'}
                </span>
              }
            />
            <DataRow
              label="Delegation Scope"
              value={<span className="font-mono text-xs text-aegis-lime">Limited Non-Custodial</span>}
            />
          </div>
        </div>

        {/* Network */}
        <div className="p-5 rounded-2xl glass-panel-luxury border border-aegis-border-emerald">
          <div className="pb-3 border-b border-white/[0.06] mb-4">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Network Routing
            </span>
          </div>
          <div className="space-y-1">
            <DataRow label="Connected Chain" value={chainMeta?.name ?? 'Creditcoin CC3 Testnet'} />
            <DataRow
              label="Chain ID"
              value={<span className="font-mono text-xs text-white">102031 (CC3)</span>}
            />
            <DataRow
              label="Settlement Engine"
              value={<span className="text-emerald-400 font-mono text-xs">Creditcoin Substrate EVM</span>}
            />
            <DataRow
              label="Source Telemetry"
              value={<span className="text-aegis-lime font-mono text-xs">Ethereum Sepolia (11155111)</span>}
            />
            <DataRow
              label="Precompile"
              value={<span className="text-white font-mono text-xs">Block Prover (Native Substrate)</span>}
            />
          </div>
        </div>

        {/* Contracts */}
        <div className="p-5 rounded-2xl glass-panel-luxury border border-aegis-border-emerald">
          <div className="pb-3 border-b border-white/[0.06] mb-4">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Smart Contract Invariants
            </span>
          </div>
          <div className="space-y-1">
            <DataRow
              label="Settlement Contract"
              value={<span className="font-mono text-xs text-white/60">0x4F12...CC3Settlement</span>}
            />
            <DataRow
              label="Attestcoin (ASC)"
              value={<span className="font-mono text-xs text-white/60">0x89E0...AttestcoinASC</span>}
            />
            <DataRow
              label="SAFE_THRESHOLD Invariant"
              value={<span className="font-mono text-xs text-aegis-lime font-bold">1.05 HF (Locked)</span>}
            />
          </div>
        </div>

        {/* System */}
        <div className="p-5 rounded-2xl glass-panel-luxury border border-aegis-border-emerald">
          <div className="pb-3 border-b border-white/[0.06] mb-4">
            <span className="font-mono text-xs font-bold text-white uppercase tracking-wider">
              Cadence & Telemetry Engines
            </span>
          </div>
          <div className="space-y-1">
            <DataRow
              label="AI Risk Polling"
              value={<span className="font-mono text-xs text-aegis-lime">30 Seconds (The Graph)</span>}
            />
            <DataRow
              label="Attestation Finality"
              value={<span className="font-mono text-xs text-emerald-400">~15 Seconds</span>}
            />
            <DataRow
              label="Proof Engine"
              value={<span className="font-mono text-xs text-white">@gluwa/usc-sdk v0.4.1</span>}
            />
          </div>
        </div>

        {/* Disclaimer */}
        <div className="p-4 rounded-xl bg-[#061109] border border-white/[0.06] font-mono text-xs text-aegis-muted leading-relaxed">
          Aegis is operating in non-custodial testnet demonstration mode for the BUIDL CTC 2026 Fall Hackathon. All operations execute strictly within pre-defined smart contract limits.
        </div>
      </div>
    </div>
  )
}
