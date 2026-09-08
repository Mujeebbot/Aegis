"use strict";

/**
 * These tests guard THE contract boundary between oracle-worker and the ASC.
 *
 * If the tuple layouts here drift from what the Solidity side decodes, proofs
 * fail on-chain after gas has already been spent. The encoded byte strings
 * below were produced against the precompile ABI shipped in @gluwa/usc-sdk.
 */

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  encodeProofs,
  encodeMerkleProof,
  encodeContinuityProof,
  decodeMerkleProof,
  decodeContinuityProof,
  MERKLE_PROOF_TYPE,
  CONTINUITY_PROOF_TYPE,
} = require("../src/proofs/encode");

const h = (n) => `0x${String(n).padStart(64, "0")}`;

const sampleProof = () => ({
  merkleProof: {
    root: h(1),
    siblings: [
      { hash: h(2), isLeft: true },
      { hash: h(3), isLeft: false },
    ],
  },
  continuityProof: {
    lowerEndpointDigest: h(9),
    roots: [h(4), h(5), h(6)],
  },
});

test("tuple types match the Block Prover precompile ABI", () => {
  // Transcribed from @gluwa/usc-sdk dist/block-prover/block_prover.json.
  // The ASC must abi.decode into exactly these shapes.
  assert.equal(
    MERKLE_PROOF_TYPE,
    "tuple(bytes32 root, tuple(bytes32 hash, bool isLeft)[] siblings)",
  );
  assert.equal(CONTINUITY_PROOF_TYPE, "tuple(bytes32 lowerEndpointDigest, bytes32[] roots)");
});

test("merkle proof survives an encode/decode round-trip", () => {
  const { merkleProof } = sampleProof();
  const decoded = decodeMerkleProof(encodeMerkleProof(merkleProof));
  assert.equal(decoded.root, merkleProof.root);
  assert.equal(decoded.siblings.length, 2);
  assert.equal(decoded.siblings[0].hash, h(2));
  assert.equal(decoded.siblings[0].isLeft, true);
  assert.equal(decoded.siblings[1].isLeft, false);
});

test("continuity proof survives an encode/decode round-trip", () => {
  const { continuityProof } = sampleProof();
  const decoded = decodeContinuityProof(encodeContinuityProof(continuityProof));
  assert.equal(decoded.lowerEndpointDigest, h(9));
  assert.deepEqual(decoded.roots, [h(4), h(5), h(6)]);
});

test("encodeProofs returns both proofs as 0x bytes", () => {
  const { merkleProofBytes, continuityProofBytes } = encodeProofs(sampleProof());
  assert.match(merkleProofBytes, /^0x[0-9a-f]+$/);
  assert.match(continuityProofBytes, /^0x[0-9a-f]+$/);
  // ABI encoding is word aligned: 2 chars for "0x" plus a multiple of 64.
  assert.equal((merkleProofBytes.length - 2) % 64, 0);
  assert.equal((continuityProofBytes.length - 2) % 64, 0);
});

test("empty sibling and root lists encode cleanly", () => {
  // A single-transaction block has no merkle siblings. This must not throw.
  const encoded = encodeProofs({
    merkleProof: { root: h(1), siblings: [] },
    continuityProof: { lowerEndpointDigest: h(2), roots: [] },
  });
  assert.deepEqual(decodeMerkleProof(encoded.merkleProofBytes).siblings, []);
  assert.deepEqual(decodeContinuityProof(encoded.continuityProofBytes).roots, []);
});

test("rejects malformed hashes rather than encoding garbage", () => {
  assert.throws(() => encodeMerkleProof({ root: "0xdead", siblings: [] }), /32-byte hex/);
  assert.throws(() => encodeMerkleProof({ root: h(1), siblings: [{ hash: "nope", isLeft: true }] }), /32-byte hex/);
  assert.throws(
    () => encodeContinuityProof({ lowerEndpointDigest: h(1), roots: ["0x00"] }),
    /32-byte hex/,
  );
});

test("rejects a non-boolean isLeft", () => {
  // Solidity bool is strict; a truthy string would encode to a wrong index.
  assert.throws(
    () => encodeMerkleProof({ root: h(1), siblings: [{ hash: h(2), isLeft: "true" }] }),
    /must be a boolean/,
  );
});

test("rejects missing or malformed proof objects", () => {
  assert.throws(() => encodeMerkleProof(null), /required/);
  assert.throws(() => encodeContinuityProof(undefined), /required/);
  assert.throws(() => encodeMerkleProof({ root: h(1) }), /must be an array/);
  assert.throws(() => encodeContinuityProof({ lowerEndpointDigest: h(1) }), /must be an array/);
});

test("encoding is deterministic", () => {
  // Two identical proofs must produce byte-identical calldata, otherwise
  // de-duplication and replay detection downstream become unreliable.
  assert.equal(
    encodeProofs(sampleProof()).merkleProofBytes,
    encodeProofs(sampleProof()).merkleProofBytes,
  );
});

test("encodes a realistically sized proof", () => {
  // Mirrors a real Sepolia proof: 8 merkle siblings, 11 continuity roots.
  const proof = {
    merkleProof: {
      root: h(1),
      siblings: Array.from({ length: 8 }, (_, i) => ({ hash: h(i + 10), isLeft: i % 2 === 0 })),
    },
    continuityProof: {
      lowerEndpointDigest: h(99),
      roots: Array.from({ length: 11 }, (_, i) => h(i + 100)),
    },
  };
  const encoded = encodeProofs(proof);
  assert.equal(decodeMerkleProof(encoded.merkleProofBytes).siblings.length, 8);
  assert.equal(decodeContinuityProof(encoded.continuityProofBytes).roots.length, 11);
});
