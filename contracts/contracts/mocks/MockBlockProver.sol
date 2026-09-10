// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/IBlockProver.sol";

/// @notice Test-only stand-in for the real Block Prover Precompile. Deployed via
/// hardhat_setCode at the precompile's address so ASC tests can exercise the real
/// `verify()` call shape without needing an actual CC3 node.
contract MockBlockProver is IBlockProver {
    bool public result = true;

    function setResult(bool value) external {
        result = value;
    }

    function verify(
        uint64,
        uint64,
        bytes memory,
        MerkleProof memory,
        ContinuityProof memory
    ) external view override returns (bool) {
        return result;
    }
}
