// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface ILiquidationShieldASC {
    function verifyPosition(
        uint64 chainKey,
        uint64 blockHeight,
        bytes memory encodedTx,
        bytes memory merkleProof,
        bytes memory continuityProof,
        address user
    ) external returns (bool);
}
