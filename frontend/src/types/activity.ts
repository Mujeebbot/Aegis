// ─── Activity Types ───────────────────────────────────────────────────────────

export type ActivityAction =
  | 'PROTECTION_TRIGGERED'
  | 'PROOF_GENERATED'
  | 'ATTESTATION_VERIFIED'
  | 'SETTLEMENT_EXECUTED'
  | 'PROTECTION_CONFIGURED'
  | 'RISK_ALERT'
  | 'POSITION_SCAN'

export type ActivityChain = 'ETHEREUM' | 'CREDITCOIN' | 'ALL'

export interface ActivityRecord {
  id: string
  timestamp: number          // unix ms
  positionId: string
  positionLabel: string      // e.g. "Aave / Ethereum"
  action: ActivityAction
  healthFactor: number | null
  triggerSource: string      // e.g. "AI Monitor", "User", "Oracle Worker"
  settlementRef: string | null  // tx hash or proof ID
  chain: ActivityChain
  status: 'SUCCESS' | 'PENDING' | 'FAILED'
  details: string
  isDemo: boolean
}

export function getActionLabel(action: ActivityAction): string {
  const map: Record<ActivityAction, string> = {
    PROTECTION_TRIGGERED:  'Protection Triggered',
    PROOF_GENERATED:       'Proof Generated',
    ATTESTATION_VERIFIED:  'Attestation Verified',
    SETTLEMENT_EXECUTED:   'Settlement Executed',
    PROTECTION_CONFIGURED: 'Protection Configured',
    RISK_ALERT:            'Risk Alert',
    POSITION_SCAN:         'Position Scan',
  }
  return map[action]
}
