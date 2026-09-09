"use strict";

/**
 * Proof encoding: SDK structs -> the `bytes` the ASC contract expects.
 *
 * THE CONTRACT BOUNDARY. Read this before changing anything here.
 *
 * @gluwa/usc-sdk hands back proofs as STRUCTS:
 *   merkleProof     = { root, siblings: [{ hash, isLeft }] }
 *   continuityProof = { lowerEndpointDigest, roots: [...] }
 *
 * The Block Prover precompile (0x…0FD2) takes those as real Solidity tuples.
 * But ILiquidationShieldASC.verifyPosition declares them as `bytes`:
 *
 *   verifyPosition(uint64 chainKey, uint64 blockHeight, bytes encodedTx,
 *                  bytes merkleProof, bytes continuityProof, address user)
 *
 * So the worker ABI-encodes each struct into `bytes` here, and the ASC must
 * `abi.decode` them back into the SAME tuple shapes before forwarding to the
 * precompile. The Solidity structs to decode into are:
 *
 *   struct MerkleProofEntry { bytes32 hash; bool isLeft; }
 *   struct MerkleProof      { bytes32 root; MerkleProofEntry[] siblings; }
 *   struct ContinuityProof  { bytes32 lowerEndpointDigest; bytes32[] roots; }
 *
 *   (bytes32 root, MerkleProofEntry[] memory siblings) =
 *       abi.decode(merkleProof, (bytes32, MerkleProofEntry[]));
 *
 * These type strings are transcribed from the precompile ABI shipped inside the
 * SDK (dist/block-prover/block_prover.json), so they are authoritative rather
 * than guessed. `assertDecodable` round-trips every encode to catch drift.
 */

const { AbiCoder } = require("ethers");

const abiCoder = AbiCoder.defaultAbiCoder();

/** Matches INativeQueryVerifier.MerkleProof in the precompile ABI. */
const MERKLE_PROOF_TYPE = "tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings)";

/** Matches INativeQueryVerifier.ContinuityProof in the precompile ABI. */
const CONTINUITY_PROOF_TYPE = "tuple(bytes32 lowerEndpointDigest, bytes32[] roots)";

/**
 * @param {{root: string, siblings: {hash: string, isLeft: boolean}[]}} merkleProof
 * @returns {string} 0x-prefixed ABI-encoded bytes
 */
function encodeMerkleProof(merkleProof) {
  if (!merkleProof || typeof merkleProof !== "object") {
    throw new TypeError("encodeMerkleProof: merkleProof is required");
  }
  assertBytes32(merkleProof.root, "merkleProof.root");
  if (!Array.isArray(merkleProof.siblings)) {
    throw new TypeError("encodeMerkleProof: merkleProof.siblings must be an array");
  }

  const siblings = merkleProof.siblings.map((sibling, i) => {
    assertBytes32(sibling?.hash, `merkleProof.siblings[${i}].hash`);
    if (typeof sibling.isLeft !== "boolean") {
      throw new TypeError(`merkleProof.siblings[${i}].isLeft must be a boolean`);
    }
    return [sibling.hash, sibling.isLeft];
  });

  return abiCoder.encode([MERKLE_PROOF_TYPE], [[merkleProof.root, siblings]]);
}

/**
 * @param {{lowerEndpointDigest: string, roots: string[]}} continuityProof
 * @returns {string} 0x-prefixed ABI-encoded bytes
 */
function encodeContinuityProof(continuityProof) {
  if (!continuityProof || typeof continuityProof !== "object") {
    throw new TypeError("encodeContinuityProof: continuityProof is required");
  }
  assertBytes32(continuityProof.lowerEndpointDigest, "continuityProof.lowerEndpointDigest");
  if (!Array.isArray(continuityProof.roots)) {
    throw new TypeError("encodeContinuityProof: continuityProof.roots must be an array");
  }
  continuityProof.roots.forEach((root, i) => assertBytes32(root, `continuityProof.roots[${i}]`));

  return abiCoder.encode(
    [CONTINUITY_PROOF_TYPE],
    [[continuityProof.lowerEndpointDigest, continuityProof.roots]],
  );
}

/** Decode back into the SDK struct shape. Used to verify encodes round-trip. */
function decodeMerkleProof(encoded) {
  const [decoded] = abiCoder.decode([MERKLE_PROOF_TYPE], encoded);
  return {
    root: decoded.root,
    siblings: decoded.siblings.map((s) => ({ hash: s.hash, isLeft: s.isLeft })),
  };
}

function decodeContinuityProof(encoded) {
  const [decoded] = abiCoder.decode([CONTINUITY_PROOF_TYPE], encoded);
  return {
    lowerEndpointDigest: decoded.lowerEndpointDigest,
    roots: [...decoded.roots],
  };
}

/**
 * Encode both proofs and confirm each survives a decode.
 *
 * A malformed proof that still encodes cleanly would only fail once it is
 * on-chain, having already cost gas. This catches it locally first.
 *
 * @param {{merkleProof: object, continuityProof: object}} proof
 * @returns {{merkleProofBytes: string, continuityProofBytes: string}}
 */
function encodeProofs(proof) {
  const merkleProofBytes = encodeMerkleProof(proof.merkleProof);
  const continuityProofBytes = encodeContinuityProof(proof.continuityProof);

  assertDecodable(merkleProofBytes, continuityProofBytes, proof);

  return { merkleProofBytes, continuityProofBytes };
}

function assertDecodable(merkleProofBytes, continuityProofBytes, original) {
  const merkle = decodeMerkleProof(merkleProofBytes);
  if (merkle.root.toLowerCase() !== original.merkleProof.root.toLowerCase()) {
    throw new Error("Merkle proof failed encode/decode round-trip: root mismatch");
  }
  if (merkle.siblings.length !== original.merkleProof.siblings.length) {
    throw new Error("Merkle proof failed encode/decode round-trip: sibling count mismatch");
  }

  const continuity = decodeContinuityProof(continuityProofBytes);
  if (continuity.roots.length !== original.continuityProof.roots.length) {
    throw new Error("Continuity proof failed encode/decode round-trip: root count mismatch");
  }
}

/** 32-byte hex, the only thing the precompile accepts for a hash field. */
function assertBytes32(value, label) {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new TypeError(`${label} must be a 0x-prefixed 32-byte hex string, got ${String(value)}`);
  }
}

module.exports = {
  encodeProofs,
  encodeMerkleProof,
  encodeContinuityProof,
  decodeMerkleProof,
  decodeContinuityProof,
  MERKLE_PROOF_TYPE,
  CONTINUITY_PROOF_TYPE,
};
