import type { Position, PositionSnapshot } from '../types/position'
import type { ActivityRecord } from '../types/activity'

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA — NOT REAL BLOCKCHAIN DATA
// These values are used for UI demonstration purposes only.
// All data is clearly labeled as DEMO in the interface.
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_POSITIONS: Position[] = [
  {
    id: 'demo-pos-001',
    protocol: 'aave-v3',
    chainId: 11155111,
    chainName: 'Ethereum Sepolia',
    collateralAsset: 'wETH',
    collateralAmount: '2.450',
    collateralUsd: '$5,842.10',
    debtAsset: 'USDC',
    debtAmount: '3,200.00',
    debtUsd: '$3,200.00',
    healthFactor: 1.82,
    riskState: 'SAFE',
    protectionMode: 'STOP_LOSS',
    protectionThreshold: 1.20,
    lastUpdated: Date.now() - 28000,
    isDemo: true,
  },
  {
    id: 'demo-pos-002',
    protocol: 'compound-v3',
    chainId: 11155111,
    chainName: 'Ethereum Sepolia',
    collateralAsset: 'wBTC',
    collateralAmount: '0.085',
    collateralUsd: '$4,122.50',
    debtAsset: 'USDC',
    debtAmount: '2,900.00',
    debtUsd: '$2,900.00',
    healthFactor: 1.42,
    riskState: 'WARNING',
    protectionMode: 'LEVERAGE_REBALANCE',
    protectionThreshold: 1.15,
    lastUpdated: Date.now() - 14000,
    isDemo: true,
  },
  {
    id: 'demo-pos-003',
    protocol: 'morpho-blue',
    chainId: 11155111,
    chainName: 'Ethereum Sepolia',
    collateralAsset: 'stETH',
    collateralAmount: '1.200',
    collateralUsd: '$2,863.20',
    debtAsset: 'DAI',
    debtAmount: '2,400.00',
    debtUsd: '$2,400.00',
    healthFactor: 1.19,
    riskState: 'AT_RISK',
    protectionMode: 'NONE',
    lastUpdated: Date.now() - 7000,
    isDemo: true,
  },
]

export const DEMO_SNAPSHOTS: Record<string, PositionSnapshot[]> = {
  'demo-pos-001': [
    { timestamp: Date.now() - 3600000, healthFactor: 2.10, riskState: 'SAFE' },
    { timestamp: Date.now() - 2700000, healthFactor: 2.05, riskState: 'SAFE' },
    { timestamp: Date.now() - 1800000, healthFactor: 1.95, riskState: 'SAFE' },
    { timestamp: Date.now() - 900000,  healthFactor: 1.87, riskState: 'SAFE' },
    { timestamp: Date.now(),           healthFactor: 1.82, riskState: 'SAFE' },
  ],
  'demo-pos-002': [
    { timestamp: Date.now() - 3600000, healthFactor: 1.80, riskState: 'SAFE' },
    { timestamp: Date.now() - 2700000, healthFactor: 1.65, riskState: 'SAFE' },
    { timestamp: Date.now() - 1800000, healthFactor: 1.55, riskState: 'WARNING' },
    { timestamp: Date.now() - 900000,  healthFactor: 1.48, riskState: 'WARNING' },
    { timestamp: Date.now(),           healthFactor: 1.42, riskState: 'WARNING' },
  ],
  'demo-pos-003': [
    { timestamp: Date.now() - 3600000, healthFactor: 1.60, riskState: 'SAFE' },
    { timestamp: Date.now() - 2700000, healthFactor: 1.45, riskState: 'WARNING' },
    { timestamp: Date.now() - 1800000, healthFactor: 1.32, riskState: 'WARNING' },
    { timestamp: Date.now() - 900000,  healthFactor: 1.24, riskState: 'AT_RISK' },
    { timestamp: Date.now(),           healthFactor: 1.19, riskState: 'AT_RISK' },
  ],
}

const now = Date.now()

export const DEMO_ACTIVITY: ActivityRecord[] = [
  {
    id: 'act-001',
    timestamp: now - 240000,
    positionId: 'demo-pos-003',
    positionLabel: 'Morpho Blue / Ethereum Sepolia',
    action: 'RISK_ALERT',
    healthFactor: 1.19,
    triggerSource: 'AI Monitor',
    settlementRef: null,
    chain: 'ETHEREUM',
    status: 'SUCCESS',
    details: 'Health factor dropped below WARNING threshold. Oracle worker notified.',
    isDemo: true,
  },
  {
    id: 'act-002',
    timestamp: now - 180000,
    positionId: 'demo-pos-003',
    positionLabel: 'Morpho Blue / Ethereum Sepolia',
    action: 'PROOF_GENERATED',
    healthFactor: 1.19,
    triggerSource: 'Oracle Worker',
    settlementRef: '0x7f3a...bc41',
    chain: 'ETHEREUM',
    status: 'SUCCESS',
    details: 'Merkle + continuity proof generated via @gluwa/usc-sdk.',
    isDemo: true,
  },
  {
    id: 'act-003',
    timestamp: now - 165000,
    positionId: 'demo-pos-003',
    positionLabel: 'Morpho Blue / Ethereum Sepolia',
    action: 'ATTESTATION_VERIFIED',
    healthFactor: 1.19,
    triggerSource: 'Attestcoin',
    settlementRef: '0xasc-demo-proof-003',
    chain: 'CREDITCOIN',
    status: 'SUCCESS',
    details: 'Block verified against CC3 Block Prover precompile (~15s).',
    isDemo: true,
  },
  {
    id: 'act-004',
    timestamp: now - 150000,
    positionId: 'demo-pos-002',
    positionLabel: 'Compound V3 / Ethereum Sepolia',
    action: 'POSITION_SCAN',
    healthFactor: 1.42,
    triggerSource: 'AI Monitor',
    settlementRef: null,
    chain: 'ETHEREUM',
    status: 'SUCCESS',
    details: 'Routine health factor scan. Position within safe rebalance range.',
    isDemo: true,
  },
  {
    id: 'act-005',
    timestamp: now - 86400000,
    positionId: 'demo-pos-001',
    positionLabel: 'Aave V3 / Ethereum Sepolia',
    action: 'PROTECTION_CONFIGURED',
    healthFactor: null,
    triggerSource: 'User',
    settlementRef: null,
    chain: 'ETHEREUM',
    status: 'SUCCESS',
    details: 'Stop-Loss protection configured. Threshold HF < 1.20.',
    isDemo: true,
  },
]

// ─── Aggregate Stats (derived from demo positions) ───────────────────────────

export function getDemoStats() {
  const positions = DEMO_POSITIONS
  const atRisk = positions.filter(p => p.riskState === 'AT_RISK' || p.riskState === 'CRITICAL')
  const protected_ = positions.filter(p => p.protectionMode !== 'NONE')
  const avgHF = positions.reduce((sum, p) => sum + p.healthFactor, 0) / positions.length

  return {
    totalPositions: positions.length,
    positionsAtRisk: atRisk.length,
    protectedPositions: protected_.length,
    averageHealthFactor: avgHF,
    systemStatus: atRisk.length > 0 ? 'AT_RISK' : 'MONITORING',
  } as const
}
