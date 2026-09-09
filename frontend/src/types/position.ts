// ─── Position Types ───────────────────────────────────────────────────────────

export type RiskState = 'SAFE' | 'WARNING' | 'AT_RISK' | 'CRITICAL'

export type ProtectionMode = 'STOP_LOSS' | 'TAKE_PROFIT' | 'LEVERAGE_REBALANCE' | 'NONE'

export type ChainId = 11155111 | 1 // Sepolia | Ethereum Mainnet

export type Protocol = 'aave-v3' | 'compound-v3' | 'morpho-blue'

export interface Position {
  id: string
  protocol: Protocol
  chainId: ChainId
  chainName: string
  collateralAsset: string
  collateralAmount: string   // display string e.g. "2.45 ETH"
  collateralUsd: string      // display string e.g. "$5,842.10"
  debtAsset: string
  debtAmount: string
  debtUsd: string
  healthFactor: number       // e.g. 1.82
  riskState: RiskState
  protectionMode: ProtectionMode
  protectionThreshold?: number
  lastUpdated: number        // unix timestamp
  isDemo: boolean
}

export interface PositionSnapshot {
  timestamp: number
  healthFactor: number
  riskState: RiskState
}

export function getRiskLabel(state: RiskState): string {
  const map: Record<RiskState, string> = {
    SAFE:     'Safe',
    WARNING:  'Warning',
    AT_RISK:  'At Risk',
    CRITICAL: 'Critical',
  }
  return map[state]
}

export function getProtectionLabel(mode: ProtectionMode): string {
  const map: Record<ProtectionMode, string> = {
    STOP_LOSS:         'Stop-Loss',
    TAKE_PROFIT:       'Take-Profit',
    LEVERAGE_REBALANCE:'Leverage Rebalance',
    NONE:              'None',
  }
  return map[mode]
}
