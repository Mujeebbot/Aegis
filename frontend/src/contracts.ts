// Single place the frontend reads contract addresses/ABIs from.
// Addresses come from .env — filled in after contracts/scripts/deploy.js runs.
// Don't hardcode addresses elsewhere in the app.

export const ASC_ADDRESS = import.meta.env.VITE_ASC_CONTRACT_ADDRESS as `0x${string}`;
export const SETTLEMENT_ADDRESS = import.meta.env.VITE_SETTLEMENT_CONTRACT_ADDRESS as `0x${string}`;

// TODO: import real ABIs once contracts compile — copy from
// contracts/artifacts/contracts/*.json after `npm run compile` in /contracts.
export const SETTLEMENT_ABI = [
  // "function setProtectionMode(address user, uint8 mode, uint256 threshold)",
  // "event PositionProtected(address indexed user, uint256 healthFactor, uint8 action)",
];
