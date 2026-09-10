// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./interfaces/ILiquidationShieldASC.sol";
import "./interfaces/ILiquidationShieldSettlement.sol";
import "./interfaces/IBlockProver.sol";

/// @notice Attestcoin Smart Contract — verifies cross-chain position proofs
/// and forwards verified data to the Settlement contract.
contract LiquidationShieldASC is ILiquidationShieldASC {
    // Block Prover Precompile — confirmed address on both CC3 mainnet and testnet.
    IBlockProver constant BLOCK_PROVER = IBlockProver(0x0000000000000000000000000000000000000FD2);

    ILiquidationShieldSettlement public settlement;

    // Replay protection: a given (chainKey, blockHeight, encodedTx) proof can only
    // ever be processed once.
    mapping(bytes32 => bool) public processedQueries;

    event PositionVerified(address indexed user, bytes32 indexed queryId);

    constructor(address settlementAddress) {
        settlement = ILiquidationShieldSettlement(settlementAddress);
    }

    function verifyPosition(
        uint64 chainKey,
        uint64 blockHeight,
        bytes memory encodedTx,
        bytes memory merkleProof,
        bytes memory continuityProof,
        address user
    ) external override returns (bool) {
        bytes32 queryId = keccak256(abi.encodePacked(chainKey, blockHeight, encodedTx));
        require(!processedQueries[queryId], "Already processed");

        // oracle-worker ABI-encodes the SDK's proof structs into bytes to cross the
        // verifyPosition interface boundary (see shared/interfaces.md) — decode them
        // back into the precompile's real struct types before calling it.
        (bytes32 merkleRoot, IBlockProver.MerkleProofEntry[] memory siblings) =
            abi.decode(merkleProof, (bytes32, IBlockProver.MerkleProofEntry[]));
        (bytes32 lowerEndpointDigest, bytes32[] memory roots) =
            abi.decode(continuityProof, (bytes32, bytes32[]));

        // --- 1. Verify inclusion + continuity via the real Block Prover precompile ---
        bool verified = BLOCK_PROVER.verify(
            chainKey,
            blockHeight,
            encodedTx,
            IBlockProver.MerkleProof({root: merkleRoot, siblings: siblings}),
            IBlockProver.ContinuityProof({lowerEndpointDigest: lowerEndpointDigest, roots: roots})
        );
        require(verified, "Invalid proof");

        // --- 2. Mark processed before any external state-changing call (checks-effects-interactions) ---
        processedQueries[queryId] = true;

        // --- 3. Decode the verified tx bytes into position data ---
        // BLOCKED: the precompile only proves `encodedTx` was included and lets us
        // read its bytes — it does not tell us what those bytes mean. Which
        // source-chain event/call actually carries live healthFactor/collateral/debt
        // (vs. positionTx.js's current deposit/borrow tx, which only proves the
        // position exists) is an open design decision with the backend engineer.
        // decodePositionData() intentionally reverts rather than fabricate a shape
        // that would just be thrown away once that's settled.
        (bool txSucceeded, uint256 healthFactor, uint256 collateral, uint256 debt) =
            decodePositionData(encodedTx);
        require(txSucceeded, "Source tx did not succeed");

        emit PositionVerified(user, queryId);

        // --- 4. Forward to Settlement ---
        settlement.protectPosition(user, healthFactor, collateral, debt);

        return true;
    }

    /// @dev Placeholder — blocked on the source-chain snapshot design decision above.
    function decodePositionData(bytes memory encodedTx)
        internal
        pure
        returns (bool succeeded, uint256 healthFactor, uint256 collateral, uint256 debt)
    {
        revert("decodePositionData not yet implemented - blocked on source-chain snapshot design");
    }
}
