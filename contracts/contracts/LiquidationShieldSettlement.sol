// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ILiquidationShieldSettlement.sol";

/// @notice Executes protection actions once ASC has verified position data.
contract LiquidationShieldSettlement is ILiquidationShieldSettlement {
    enum ProtectionAction { None, StopLoss, Rebalance, Close }

    struct UserConfig {
        ProtectionMode mode;
        uint256 threshold;
        bool configured;
    }

    address public asc;
    address public immutable deployer;
    bool public ascLocked;
    uint256 public constant SAFE_THRESHOLD = 1.05e18; // 1.05, 18 decimals — confirm units with AI/ML engineer

    mapping(address => UserConfig) public userConfigs;

    event PositionProtected(address indexed user, uint256 healthFactor, ProtectionAction action);
    event ProtectionModeSet(address indexed user, ProtectionMode mode, uint256 threshold);

    modifier onlyASC() {
        require(msg.sender == asc, "Only ASC");
        _;
    }

    // Settlement must exist before ASC can be deployed (ASC's constructor takes
    // Settlement's address), so the real ASC address isn't known yet at this point
    // in a fresh deploy — the constructor arg is a placeholder (or, in tests, a
    // signer standing in for the ASC directly). setAsc() below fixes it up once
    // ASC actually exists, and can only ever run once.
    constructor(address ascAddress) {
        asc = ascAddress;
        deployer = msg.sender;
    }

    /// @notice One-time fixup: point at the real ASC contract once it's deployed.
    function setAsc(address ascAddress) external {
        require(msg.sender == deployer, "Only deployer");
        require(!ascLocked, "ASC address already locked");
        require(ascAddress != address(0), "Zero address");
        asc = ascAddress;
        ascLocked = true;
    }

    function protectPosition(
        address user,
        uint256 healthFactor,
        uint256 collateral,
        uint256 debt
    ) external override onlyASC {
        require(healthFactor < SAFE_THRESHOLD, "Position safe");

        UserConfig memory cfg = userConfigs[user];
        ProtectionAction action;

        if (!cfg.configured) {
            // No mode set — default to the safest option.
            action = ProtectionAction.StopLoss;
        } else if (cfg.mode == ProtectionMode.StopLoss) {
            action = ProtectionAction.StopLoss;
            // TODO: repayDebt(user, debt) — needs the actual lending protocol adapter
            // (Aave/Compound/Morpho) to call repay() on the user's behalf. Biggest
            // remaining piece of real logic, separate chunk of work after
            // decodePositionData is unblocked.
        } else if (cfg.mode == ProtectionMode.LeverageRebalance) {
            action = ProtectionAction.Rebalance;
            // TODO: rebalanceCollateral(user, collateral)
        } else {
            action = ProtectionAction.Close;
            // TODO: closePosition(user)
        }

        emit PositionProtected(user, healthFactor, action);
    }

    function setProtectionMode(
        address user,
        ProtectionMode mode,
        uint256 threshold
    ) external override {
        require(msg.sender == user, "Only the position owner can set their own mode");
        userConfigs[user] = UserConfig({ mode: mode, threshold: threshold, configured: true });
        emit ProtectionModeSet(user, mode, threshold);
    }
}
