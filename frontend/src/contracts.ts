// Single place the frontend reads contract addresses/ABIs from.
// Addresses come from .env — filled in after contracts/scripts/deploy.js runs.
// Don't hardcode addresses elsewhere in the app.

export const ASC_ADDRESS = import.meta.env.VITE_ASC_CONTRACT_ADDRESS as `0x${string}`;
export const SETTLEMENT_ADDRESS = import.meta.env.VITE_SETTLEMENT_CONTRACT_ADDRESS as `0x${string}`;

// Copied from contracts/artifacts/contracts/*.json (redeployed 2026-09-10, real
// verifyPosition/protectPosition/setProtectionMode logic, not stubs). Re-copy
// after any change to the .sol source - this is not auto-generated.
export const SETTLEMENT_ABI = [
  {
    inputs: [{ internalType: "address", name: "ascAddress", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "uint256", name: "healthFactor", type: "uint256" },
      {
        indexed: false,
        internalType: "enum LiquidationShieldSettlement.ProtectionAction",
        name: "action",
        type: "uint8",
      },
    ],
    name: "PositionProtected",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: false, internalType: "enum ProtectionMode", name: "mode", type: "uint8" },
      { indexed: false, internalType: "uint256", name: "threshold", type: "uint256" },
    ],
    name: "ProtectionModeSet",
    type: "event",
  },
  {
    inputs: [],
    name: "SAFE_THRESHOLD",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "asc",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "ascLocked",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deployer",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "uint256", name: "healthFactor", type: "uint256" },
      { internalType: "uint256", name: "collateral", type: "uint256" },
      { internalType: "uint256", name: "debt", type: "uint256" },
    ],
    name: "protectPosition",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "ascAddress", type: "address" }],
    name: "setAsc",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "user", type: "address" },
      { internalType: "enum ProtectionMode", name: "mode", type: "uint8" },
      { internalType: "uint256", name: "threshold", type: "uint256" },
    ],
    name: "setProtectionMode",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "", type: "address" }],
    name: "userConfigs",
    outputs: [
      { internalType: "enum ProtectionMode", name: "mode", type: "uint8" },
      { internalType: "uint256", name: "threshold", type: "uint256" },
      { internalType: "bool", name: "configured", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

export const ASC_ABI = [
  {
    inputs: [{ internalType: "address", name: "settlementAddress", type: "address" }],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "address", name: "user", type: "address" },
      { indexed: true, internalType: "bytes32", name: "queryId", type: "bytes32" },
    ],
    name: "PositionVerified",
    type: "event",
  },
  {
    inputs: [{ internalType: "bytes32", name: "", type: "bytes32" }],
    name: "processedQueries",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "settlement",
    outputs: [{ internalType: "contract ILiquidationShieldSettlement", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "chainKey", type: "uint64" },
      { internalType: "uint64", name: "blockHeight", type: "uint64" },
      { internalType: "bytes", name: "encodedTx", type: "bytes" },
      { internalType: "bytes", name: "merkleProof", type: "bytes" },
      { internalType: "bytes", name: "continuityProof", type: "bytes" },
      { internalType: "address", name: "user", type: "address" },
    ],
    name: "verifyPosition",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;
