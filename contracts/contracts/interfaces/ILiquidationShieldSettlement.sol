// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

enum ProtectionMode { StopLoss, TakeProfit, LeverageRebalance }

interface ILiquidationShieldSettlement {
    function protectPosition(
        address user,
        uint256 healthFactor,
        uint256 collateral,
        uint256 debt
    ) external;

    function setProtectionMode(
        address user,
        ProtectionMode mode,
        uint256 threshold
    ) external;
}
