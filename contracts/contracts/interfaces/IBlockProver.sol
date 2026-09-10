// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Creditcoin CC3's Block Prover Precompile at 0x0FD2.
/// @dev Struct shapes and the `verify` signature are taken directly from the
/// usc-sdk package's block_prover.json ABI (INativeQueryVerifier) - the precompile
/// takes these as structs, not ABI-encoded bytes. Do not hand-guess this interface.
interface IBlockProver {
    struct MerkleProofEntry {
        bytes32 hash;
        bool isLeft;
    }

    struct MerkleProof {
        bytes32 root;
        MerkleProofEntry[] siblings;
    }

    struct ContinuityProof {
        bytes32 lowerEndpointDigest;
        bytes32[] roots;
    }

    function verify(
        uint64 chainKey,
        uint64 height,
        bytes memory encodedTransaction,
        MerkleProof memory merkleProof,
        ContinuityProof memory continuityProof
    ) external view returns (bool);
}
