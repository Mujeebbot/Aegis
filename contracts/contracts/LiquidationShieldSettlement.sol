// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ILiquidationShieldSettlement.sol";

/// @notice Executes protection actions once ASC has verified position data.
/// @dev STUB for Smart Contract Engineer to implement.
contract LiquidationShieldSettlement is ILiquidationShieldSettlement {
    enum ProtectionAction { None, StopLoss, Rebalance, Close }

    address public asc;
    uint256 public constant SAFE_THRESHOLD = 1.05e18; // placeholder, confirm units with AI/ML engineer

    event PositionProtected(address indexed user, uint256 healthFactor, ProtectionAction action);

    modifier onlyASC() {
        require(msg.sender == asc, "Only ASC");
        _;
    }

    constructor(address ascAddress) {
        asc = ascAddress;
    }

    function protectPosition(
        address user,
        uint256 healthFactor,
        uint256 collateral,
        uint256 debt
    ) external override onlyASC {
        require(healthFactor < SAFE_THRESHOLD, "Position safe");

        // TODO: determine action based on user's configured ProtectionMode
        ProtectionAction action = ProtectionAction.StopLoss;

        // TODO: if (action == ProtectionAction.StopLoss) { repayDebt(user, debt); }
        // TODO: else if (action == ProtectionAction.Rebalance) { rebalanceCollateral(user, collateral); }

        emit PositionProtected(user, healthFactor, action);
    }

    function setProtectionMode(
        address user,
        ProtectionMode mode,
        uint256 threshold
    ) external override {
        // TODO: store per-user mode + threshold, restrict to user themself or delegated signer
    }
}
