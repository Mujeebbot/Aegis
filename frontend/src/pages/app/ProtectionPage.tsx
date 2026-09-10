import React from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseUnits } from 'viem'
import { StatusBadge } from '../../components/ui/StatusBadge'
import { TechnicalPanel, DataRow } from '../../components/ui/TechnicalPanel'
import { Button } from '../../components/ui/Button'
import { SectionLabel } from '../../components/ui/SectionLabel'
import { DEMO_POSITIONS } from '../../data/demo'
import { getProtocolLabel, truncateHash } from '../../lib/utils'
import { getProtectionLabel } from '../../types/position'
import { PROTECTION_MODE_DESCRIPTIONS } from '../../types/protection'
import { SETTLEMENT_ADDRESS, SETTLEMENT_ABI } from '../../contracts'
import type { ProtectionMode } from '../../types/position'
import type { ProtectionWizardState } from '../../types/protection'

// ─── ProtectionPage ───────────────────────────────────────────────────────────
// 5-step configuration wizard for Aegis protection
// ─────────────────────────────────────────────────────────────────────────────

type WizardStep = 1 | 2 | 3 | 4 | 5

function getModeEnumIndex(mode: ProtectionMode | null): number {
  switch (mode) {
    case 'STOP_LOSS': return 1
    case 'TAKE_PROFIT': return 2
    case 'LEVERAGE_REBALANCE': return 3
    default: return 0
  }
}

export function ProtectionPage() {
  const [searchParams] = useSearchParams()
  const initialMode = searchParams.get('mode') as ProtectionMode | null
  const initialPos = searchParams.get('pos')

  const { address, isConnected } = useAccount()
  const { data: hash, isPending: isWriting, error: writeError, writeContract, reset: resetWrite } = useWriteContract()
  const { isLoading: isConfirming, isSuccess: isConfirmed, error: receiptError } = useWaitForTransactionReceipt({
    hash,
  })

  const [wizard, setWizard] = React.useState<ProtectionWizardState>(() => {
    let step: WizardStep = 1
    if (initialPos && initialMode) {
      step = 3
    } else if (initialPos) {
      step = 2
    } else if (initialMode) {
      step = 1
    }
    return {
      step,
      selectedMode: initialMode || null,
      threshold: 1.20,
      permissionScope: 'LIMITED',
      positionId: initialPos || null,
    }
  })

  const handleSubmit = () => {
    if (!address || !wizard.selectedMode) return
    const modeIndex = getModeEnumIndex(wizard.selectedMode)
    const thresholdScaled = parseUnits(wizard.threshold.toFixed(2), 18)

    writeContract({
      address: SETTLEMENT_ADDRESS,
      abi: SETTLEMENT_ABI,
      functionName: 'setProtectionMode',
      args: [address, modeIndex, thresholdScaled],
    })
  }

  const handleReset = () => {
    resetWrite()
    setWizard({ step: 1, selectedMode: null, threshold: 1.20, permissionScope: 'LIMITED', positionId: null })
  }

  if (isConfirmed) {
    return (
      <div className="p-5 md:p-8 max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-center w-full">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'rgba(168,224,99,0.1)', border: '1px solid rgba(168,224,99,0.3)', boxShadow: '0 0 40px rgba(168,224,99,0.2)' }}
          >
            <span className="text-2xl text-aegis-lime">✓</span>
          </div>
          <h2 className="font-display text-2xl font-bold text-aegis-lime mb-2">Protection Configured on CC3</h2>
          <p className="text-aegis-dim font-mono text-sm mb-6">
            Transaction confirmed! Settlement Contract `setProtectionMode` updated.
          </p>

          <TechnicalPanel className="mb-6 p-4 text-left font-mono text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-aegis-dim">Contract</span>
              <span className="text-aegis-lime">{truncateHash(SETTLEMENT_ADDRESS)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-aegis-dim">Transaction Hash</span>
              <span className="text-white font-bold">{hash ? truncateHash(hash) : 'Confirmed'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-aegis-dim">Mode</span>
              <span className="text-white">{wizard.selectedMode}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-aegis-dim">Threshold</span>
              <span className="text-aegis-lime font-bold">HF {wizard.threshold.toFixed(2)}</span>
            </div>
          </TechnicalPanel>

          <Button variant="primary" size="md" onClick={handleReset}>
            Configure Another Position
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-5 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1.5">
          <h1 className="font-display text-2xl font-bold text-aegis-white">Set Protection</h1>
          <StatusBadge state={isConnected ? 'LIVE TESTNET' : 'DEMO MODE'} size="sm" />
        </div>
        <p className="text-sm text-aegis-dim font-mono">Configure automated defense on CC3 Settlement Contract</p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2 mb-8">
        {([1,2,3,4,5] as WizardStep[]).map(step => (
          <React.Fragment key={step}>
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full font-mono text-xs font-bold transition-all duration-300"
              style={{
                background: step === wizard.step ? 'rgba(168,224,99,0.15)' : step < wizard.step ? 'rgba(168,224,99,0.08)' : '#111110',
                border: `1px solid ${step <= wizard.step ? '#a8e063' : '#242420'}`,
                color: step <= wizard.step ? '#a8e063' : '#5a5a50',
              }}
            >
              {step < wizard.step ? '✓' : step}
            </div>
            {step < 5 && (
              <div
                className="flex-1 h-px transition-all duration-300"
                style={{ background: step < wizard.step ? '#a8e063' : '#242420', opacity: step < wizard.step ? 0.4 : 0.2 }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Step content */}
      {wizard.step === 1 && <StepSelectPosition wizard={wizard} setWizard={setWizard} />}
      {wizard.step === 2 && <StepSelectMode wizard={wizard} setWizard={setWizard} />}
      {wizard.step === 3 && <StepSetThreshold wizard={wizard} setWizard={setWizard} />}
      {wizard.step === 4 && <StepPermissions wizard={wizard} setWizard={setWizard} />}
      {wizard.step === 5 && (
        <StepReview
          wizard={wizard}
          setWizard={setWizard}
          onSubmit={handleSubmit}
          isConnected={isConnected}
          userAddress={address}
          isWriting={isWriting}
          isConfirming={isConfirming}
          hash={hash}
          error={writeError || receiptError}
        />
      )}
    </div>
  )
}

// ─── Step 1: Select Position ──────────────────────────────────────────────────

function StepSelectPosition({ wizard, setWizard }: WizardProps) {
  return (
    <div>
      <SectionLabel className="mb-5">Step 01 — Choose Position</SectionLabel>
      <h2 className="font-display text-xl font-bold text-aegis-white mb-6">
        Which position to protect?
      </h2>
      <div className="space-y-3 mb-8">
        {DEMO_POSITIONS.map(pos => (
          <button
            key={pos.id}
            onClick={() => setWizard(w => ({ ...w, positionId: pos.id, step: 2 }))}
            className="w-full text-left"
            aria-label={`Select ${getProtocolLabel(pos.protocol)} position`}
          >
            <TechnicalPanel
              className={[
                'cursor-pointer transition-all duration-200',
                wizard.positionId === pos.id
                  ? 'border-aegis-lime/40 bg-aegis-lime/5'
                  : 'hover:border-aegis-border/80',
              ].join(' ')}
            >
              <div className="px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-display text-sm font-semibold text-aegis-white">
                    {getProtocolLabel(pos.protocol)}
                  </div>
                  <div className="font-mono text-xs text-aegis-dim mt-0.5">{pos.chainName}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="font-mono text-sm font-bold tabular-nums"
                    style={{ color: pos.riskState === 'SAFE' ? '#a8e063' : pos.riskState === 'WARNING' ? '#e8a040' : '#e05050' }}
                  >
                    HF {pos.healthFactor.toFixed(2)}
                  </span>
                  <StatusBadge state={pos.riskState} size="sm" />
                </div>
              </div>
            </TechnicalPanel>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Step 2: Select Mode ──────────────────────────────────────────────────────

function StepSelectMode({ wizard, setWizard }: WizardProps) {
  const modes: ProtectionMode[] = ['STOP_LOSS', 'TAKE_PROFIT', 'LEVERAGE_REBALANCE']

  return (
    <div>
      <SectionLabel className="mb-5">Step 02 — Protection Mode</SectionLabel>
      <h2 className="font-display text-xl font-bold text-aegis-white mb-6">
        Choose your protection strategy.
      </h2>
      <div className="space-y-3 mb-8">
        {modes.map(mode => {
          const info = PROTECTION_MODE_DESCRIPTIONS[mode]
          const isSelected = wizard.selectedMode === mode
          return (
            <button
              key={mode}
              onClick={() => setWizard(w => ({ ...w, selectedMode: mode }))}
              className="w-full text-left"
              aria-pressed={isSelected}
            >
              <TechnicalPanel
                className={[
                  'cursor-pointer transition-all duration-200',
                  isSelected ? 'border-aegis-lime/40 bg-aegis-lime/5' : 'hover:border-aegis-border/80',
                ].join(' ')}
              >
                <div className="px-4 py-4">
                  <div className="flex items-center gap-2 mb-2">
                    {isSelected && <span className="text-aegis-lime text-sm">✓</span>}
                    <div className="font-display text-base font-semibold text-aegis-white">{info.title}</div>
                  </div>
                  <p className="text-sm text-aegis-dim leading-relaxed">{info.description}</p>
                </div>
              </TechnicalPanel>
            </button>
          )
        })}
      </div>
      <div className="flex gap-3">
        <Button variant="ghost" size="md" onClick={() => setWizard(w => ({ ...w, step: 1 }))}>← Back</Button>
        <Button
          variant="primary" size="md"
          disabled={!wizard.selectedMode}
          onClick={() => setWizard(w => ({ ...w, step: 3 }))}
        >
          Continue →
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3: Threshold ────────────────────────────────────────────────────────

function StepSetThreshold({ wizard, setWizard }: WizardProps) {
  return (
    <div>
      <SectionLabel className="mb-5">Step 03 — Risk Threshold</SectionLabel>
      <h2 className="font-display text-xl font-bold text-aegis-white mb-6">
        At what health factor should Aegis act?
      </h2>

      <TechnicalPanel className="mb-6 p-6">
        <div className="text-center mb-6">
          <div className="font-mono text-label-xs text-aegis-dim tracking-widest uppercase mb-2">
            Trigger Threshold
          </div>
          <div className="font-display text-5xl font-bold text-aegis-lime tabular-nums">
            {wizard.threshold.toFixed(2)}
          </div>
          <div className="font-mono text-xs text-aegis-dim mt-1">Health Factor</div>
        </div>

        <input
          type="range"
          min="1.10"
          max="2.00"
          step="0.05"
          value={wizard.threshold}
          onChange={e => setWizard(w => ({ ...w, threshold: parseFloat(e.target.value) }))}
          className="w-full h-1.5 bg-aegis-raised rounded-full appearance-none cursor-pointer"
          style={{ accentColor: '#a8e063' }}
        />
        <div className="flex justify-between mt-2 font-mono text-label-xs text-aegis-muted">
          <span>1.10 (aggressive)</span>
          <span>2.00 (conservative)</span>
        </div>

        <div className="mt-6 space-y-2">
          <div className="px-3 py-2 rounded-sm text-xs font-mono" style={{ background: '#111110', border: '1px solid #242420' }}>
            <span className="text-aegis-dim">Liquidation threshold: </span>
            <span className="text-aegis-red">≤ 1.05 HF</span>
          </div>
          <div className="px-3 py-2 rounded-sm text-xs font-mono" style={{ background: '#111110', border: '1px solid rgba(168,224,99,0.15)' }}>
            <span className="text-aegis-dim">Your trigger: </span>
            <span className="text-aegis-lime">≤ {wizard.threshold.toFixed(2)} HF</span>
            <span className="text-aegis-dim ml-2">({(((wizard.threshold - 1.05) / wizard.threshold) * 100).toFixed(1)}% buffer)</span>
          </div>
        </div>
      </TechnicalPanel>

      <div className="flex gap-3">
        <Button variant="ghost" size="md" onClick={() => setWizard(w => ({ ...w, step: 2 }))}>← Back</Button>
        <Button variant="primary" size="md" onClick={() => setWizard(w => ({ ...w, step: 4 }))}>Continue →</Button>
      </div>
    </div>
  )
}

// ─── Step 4: Permissions ──────────────────────────────────────────────────────

function StepPermissions({ wizard, setWizard }: WizardProps) {
  return (
    <div>
      <SectionLabel className="mb-5">Step 04 — Permission Scope</SectionLabel>
      <h2 className="font-display text-xl font-bold text-aegis-white mb-6">
        What can Aegis do?
      </h2>

      <div className="space-y-3 mb-8">
        {([
          {
            key: 'LIMITED' as const,
            title: 'Limited (Recommended)',
            desc: 'Aegis can only repay debt up to the protection threshold. No full exits.',
          },
          {
            key: 'FULL' as const,
            title: 'Full Permission',
            desc: 'Aegis can execute any protection action including full position exit.',
          },
        ]).map(scope => (
          <button
            key={scope.key}
            onClick={() => setWizard(w => ({ ...w, permissionScope: scope.key }))}
            className="w-full text-left"
            aria-pressed={wizard.permissionScope === scope.key}
          >
            <TechnicalPanel
              className={[
                'cursor-pointer transition-all duration-200',
                wizard.permissionScope === scope.key ? 'border-aegis-lime/40 bg-aegis-lime/5' : 'hover:border-aegis-border/80',
              ].join(' ')}
            >
              <div className="px-4 py-4 flex items-start gap-3">
                <div
                  className="mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: wizard.permissionScope === scope.key ? '#a8e063' : '#3a3a34' }}
                >
                  {wizard.permissionScope === scope.key && (
                    <div className="w-2 h-2 rounded-full bg-aegis-lime" />
                  )}
                </div>
                <div>
                  <div className="font-display text-sm font-semibold text-aegis-white mb-1">{scope.title}</div>
                  <p className="text-sm text-aegis-dim">{scope.desc}</p>
                </div>
              </div>
            </TechnicalPanel>
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <Button variant="ghost" size="md" onClick={() => setWizard(w => ({ ...w, step: 3 }))}>← Back</Button>
        <Button variant="primary" size="md" onClick={() => setWizard(w => ({ ...w, step: 5 }))}>Review →</Button>
      </div>
    </div>
  )
}

interface StepReviewProps extends WizardProps {
  onSubmit: () => void
  isConnected?: boolean
  userAddress?: string
  isWriting?: boolean
  isConfirming?: boolean
  hash?: `0x${string}`
  error?: Error | null
}

function StepReview({
  wizard,
  setWizard,
  onSubmit,
  isConnected,
  userAddress,
  isWriting,
  isConfirming,
  hash,
  error,
}: StepReviewProps) {
  const pos = DEMO_POSITIONS.find(p => p.id === wizard.positionId)
  const modeInfo = wizard.selectedMode ? PROTECTION_MODE_DESCRIPTIONS[wizard.selectedMode] : null

  return (
    <div>
      <SectionLabel className="mb-5">Step 05 — Review & Submit</SectionLabel>
      <h2 className="font-display text-xl font-bold text-aegis-white mb-6">
        Confirm your protection setup.
      </h2>

      <TechnicalPanel className="mb-6">
        <div className="p-4">
          <DataRow label="Target Position" value={pos ? getProtocolLabel(pos.protocol) : '—'} />
          <DataRow label="Target Chain"    value={pos?.chainName ?? '—'} />
          <DataRow label="Defense Mode"    value={modeInfo?.title ?? '—'} />
          <DataRow label="Risk Threshold"  value={<span className="text-aegis-lime font-bold">HF {wizard.threshold.toFixed(2)}</span>} />
          <DataRow label="Permission"      value={wizard.permissionScope} />
          <DataRow label="Settlement Engine" value="Creditcoin CC3 Testnet" />
          <DataRow label="Settlement Address" value={<span className="font-mono text-xs text-aegis-lime">{truncateHash(SETTLEMENT_ADDRESS)}</span>} />
          <DataRow label="User Wallet"     value={<span className="font-mono text-xs text-white">{userAddress ? truncateHash(userAddress) : 'Not Connected'}</span>} />
        </div>
      </TechnicalPanel>

      {/* Contract Transaction Status Banner */}
      {isConnected ? (
        <div className="px-4 py-3 rounded-xl mb-6 bg-aegis-lime/5 border border-aegis-lime/30 text-xs font-mono">
          <div className="flex items-center gap-2 text-aegis-lime font-bold mb-1">
            <span className="w-2 h-2 rounded-full bg-aegis-lime animate-pulse" />
            <span>LIVE CC3 TESTNET TRANSACTION</span>
          </div>
          <p className="text-aegis-dim">
            Clicking Activate Protection will invoke <span className="text-aegis-lime font-semibold">setProtectionMode(user, mode, threshold)</span> directly on the Settlement Contract.
          </p>
        </div>
      ) : (
        <div className="px-4 py-3 rounded-xl mb-6 bg-amber-400/10 border border-amber-400/30 text-xs font-mono text-amber-300">
          ⚠️ Wallet Not Connected — Please connect your wallet in the top right / sidebar to send on-chain transactions.
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-3 rounded-xl mb-6 bg-aegis-red/10 border border-aegis-red/30 text-xs font-mono text-aegis-red">
          <div className="font-bold mb-1">Transaction Failed</div>
          <p className="break-words">{error.message || 'Transaction rejected or reverted.'}</p>
        </div>
      )}

      {/* Loading Banner */}
      {(isWriting || isConfirming) && (
        <div className="px-4 py-4 rounded-xl mb-6 bg-[#081b10] border border-aegis-lime/40 text-xs font-mono text-aegis-lime flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-aegis-lime border-t-transparent rounded-full animate-spin shrink-0" />
          <div>
            <div className="font-bold">
              {isWriting ? 'Requesting Wallet Signature...' : 'Confirming Transaction on CC3 Testnet...'}
            </div>
            {hash && (
              <div className="text-[11px] text-aegis-dim mt-0.5">
                Tx: {truncateHash(hash)}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="ghost" size="md" onClick={() => setWizard(w => ({ ...w, step: 4 }))} disabled={isWriting || isConfirming}>
          ← Back
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={onSubmit}
          disabled={!isConnected || !wizard.positionId || !wizard.selectedMode || isWriting || isConfirming}
        >
          {isWriting ? 'Signing Tx...' : isConfirming ? 'Confirming Tx...' : 'Activate Protection'}
        </Button>
      </div>
    </div>
  )
}

interface WizardProps {
  wizard: ProtectionWizardState
  setWizard: React.Dispatch<React.SetStateAction<ProtectionWizardState>>
}
