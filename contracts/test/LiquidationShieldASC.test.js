const { expect } = require("chai");
const { ethers, network } = require("hardhat");

// The real Block Prover Precompile address on CC3 — Hardhat's local network has no
// code there, so these tests inject a mock via hardhat_setCode to exercise the real
// call shape (struct args, not a guessed raw signature) without needing a live node.
const BLOCK_PROVER_ADDRESS = "0x0000000000000000000000000000000000000FD2";

describe("LiquidationShieldASC", function () {
  const coder = ethers.AbiCoder.defaultAbiCoder();

  function encodeProofs() {
    const merkleProofBytes = coder.encode(
      ["bytes32", "tuple(bytes32 hash, bool isLeft)[]"],
      [ethers.ZeroHash, [{ hash: ethers.ZeroHash, isLeft: true }]],
    );
    const continuityProofBytes = coder.encode(
      ["bytes32", "bytes32[]"],
      [ethers.ZeroHash, [ethers.ZeroHash]],
    );
    return { merkleProofBytes, continuityProofBytes };
  }

  async function deploy() {
    const [ascSigner, user] = await ethers.getSigners();
    const Settlement = await ethers.getContractFactory("LiquidationShieldSettlement");
    // Placeholder settlement owner — ASC's own address is what matters for onlyASC,
    // and these tests never reach the settlement.protectPosition forwarding call.
    const settlement = await Settlement.deploy(ascSigner.address);

    const ASC = await ethers.getContractFactory("LiquidationShieldASC");
    const asc = await ASC.deploy(await settlement.getAddress());

    const Mock = await ethers.getContractFactory("MockBlockProver");
    const mock = await Mock.deploy();
    const mockCode = await ethers.provider.getCode(await mock.getAddress());
    await network.provider.send("hardhat_setCode", [BLOCK_PROVER_ADDRESS, mockCode]);
    // Re-attach at the precompile's address so calls to `mockAtPrecompile.setResult`
    // affect the exact bytecode instance `asc` will call.
    const mockAtPrecompile = await ethers.getContractAt("MockBlockProver", BLOCK_PROVER_ADDRESS);

    return { asc, settlement, mockAtPrecompile, user };
  }

  it("stores the settlement address on deploy", async function () {
    const { asc, settlement } = await deploy();
    expect(await asc.settlement()).to.equal(await settlement.getAddress());
  });

  it("rejects the proof when the precompile reports it invalid", async function () {
    const { asc, mockAtPrecompile, user } = await deploy();
    await mockAtPrecompile.setResult(false);
    const { merkleProofBytes, continuityProofBytes } = encodeProofs();

    await expect(
      asc.verifyPosition(1, 1, "0x1234", merkleProofBytes, continuityProofBytes, user.address),
    ).to.be.revertedWith("Invalid proof");
  });

  it("gets past precompile verification and hits the still-unimplemented decode step", async function () {
    // Documents the real current state: decodePositionData is blocked on a design
    // decision (see docs/asc-settlement-corrections.md), so even a fully valid,
    // precompile-verified proof cannot complete end-to-end yet. Once decode is
    // implemented, replace this expectation with one asserting a real
    // PositionVerified emission + Settlement.protectPosition forwarding, and add a
    // replay-protection test (second call with the same proof rejected) — that
    // cannot be tested honestly until a call can succeed at all.
    const { asc, mockAtPrecompile, user } = await deploy();
    await mockAtPrecompile.setResult(true);
    const { merkleProofBytes, continuityProofBytes } = encodeProofs();

    await expect(
      asc.verifyPosition(1, 1, "0x1234", merkleProofBytes, continuityProofBytes, user.address),
    ).to.be.revertedWith("decodePositionData not yet implemented - blocked on source-chain snapshot design");
  });
});
