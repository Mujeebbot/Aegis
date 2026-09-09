import type { ProtectionMode } from './position'

// ─── Protection Types ─────────────────────────────────────────────────────────

export interface ProtectionConfig {
  positionId: string
  mode: ProtectionMode
  threshold: number          // health factor threshold e.g. 1.20
  permissionScope: 'LIMITED' | 'FULL'
  status: 'DRAFT' | 'READY' | 'ACTIVE' | 'PAUSED'
}

export interface ProtectionWizardState {
  step: 1 | 2 | 3 | 4 | 5
  selectedMode: ProtectionMode | null
  threshold: number
  permissionScope: 'LIMITED' | 'FULL'
  positionId: string | null
}

export const PROTECTION_MODE_DESCRIPTIONS: Record<string, {
  title: string
  description: string
  detail: string
}> = {
  STOP_LOSS: {
    title: 'Stop-Loss',
    description: 'Automatically repay debt and close position when health threshold is reached.',
    detail: 'When your health factor drops to the configured threshold, Aegis automatically repays enough debt to protect your collateral from liquidation.',
  },
  TAKE_PROFIT: {
    title: 'Take-Profit',
    description: 'Automatically close the position when the configured target is reached.',
    detail: 'When your position reaches the target health factor or collateral value, Aegis automatically exits to lock in gains.',
  },
  LEVERAGE_REBALANCE: {
    title: 'Leverage Rebalance',
    description: 'Continuously rebalance to maintain a safer health ratio.',
    detail: 'Aegis continuously monitors and adjusts your collateral-to-debt ratio, keeping your position within a safe operating range.',
  },
}
