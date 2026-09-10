const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LiquidationShieldSettlement", function () {
  const SAFE_THRESHOLD = ethers.parseUnits("1.05", 18);
  const ProtectionMode = { StopLoss: 0, TakeProfit: 1, LeverageRebalance: 2 };
  const ProtectionAction = { None: 0, StopLoss: 1, Rebalance: 2, Close: 3 };

  async function deploy() {
    const [asc, user, stranger] = await ethers.getSigners();
    const Settlement = await ethers.getContractFactory("LiquidationShieldSettlement");
    const settlement = await Settlement.deploy(asc.address);
    return { settlement, asc, user, stranger };
  }

  describe("setProtectionMode", function () {
    it("stores the caller's own mode and threshold", async function () {
      const { settlement, user } = await deploy();
      const threshold = ethers.parseUnits("1.1", 18);

      await expect(settlement.connect(user).setProtectionMode(user.address, ProtectionMode.LeverageRebalance, threshold))
        .to.emit(settlement, "ProtectionModeSet")
        .withArgs(user.address, ProtectionMode.LeverageRebalance, threshold);

      const cfg = await settlement.userConfigs(user.address);
      expect(cfg.mode).to.equal(ProtectionMode.LeverageRebalance);
      expect(cfg.threshold).to.equal(threshold);
      expect(cfg.configured).to.equal(true);
    });

    it("rejects setting a mode on someone else's behalf", async function () {
      const { settlement, user, stranger } = await deploy();
      await expect(
        settlement.connect(stranger).setProtectionMode(user.address, ProtectionMode.StopLoss, 0),
      ).to.be.revertedWith("Only the position owner can set their own mode");
    });
  });

  describe("setAsc", function () {
    it("lets the deployer fix up the ASC address once", async function () {
      const [deployer, placeholder, realAsc] = await ethers.getSigners();
      const Settlement = await ethers.getContractFactory("LiquidationShieldSettlement");
      const settlement = await Settlement.connect(deployer).deploy(placeholder.address);

      await settlement.connect(deployer).setAsc(realAsc.address);
      expect(await settlement.asc()).to.equal(realAsc.address);
      expect(await settlement.ascLocked()).to.equal(true);
    });

    it("rejects a second call once locked", async function () {
      const [deployer, placeholder, realAsc, other] = await ethers.getSigners();
      const Settlement = await ethers.getContractFactory("LiquidationShieldSettlement");
      const settlement = await Settlement.connect(deployer).deploy(placeholder.address);

      await settlement.connect(deployer).setAsc(realAsc.address);
      await expect(settlement.connect(deployer).setAsc(other.address)).to.be.revertedWith(
        "ASC address already locked",
      );
    });

    it("rejects a caller who isn't the deployer", async function () {
      const { settlement, stranger } = await deploy();
      await expect(settlement.connect(stranger).setAsc(stranger.address)).to.be.revertedWith("Only deployer");
    });
  });

  describe("protectPosition", function () {
    it("rejects calls from anyone other than the ASC", async function () {
      const { settlement, user, stranger } = await deploy();
      await expect(
        settlement.connect(stranger).protectPosition(user.address, 0, 0, 0),
      ).to.be.revertedWith("Only ASC");
    });

    it("rejects a position that is not actually at risk", async function () {
      const { settlement, asc, user } = await deploy();
      await expect(
        settlement.connect(asc).protectPosition(user.address, SAFE_THRESHOLD, 0, 0),
      ).to.be.revertedWith("Position safe");
    });

    it("defaults to StopLoss when the user has no configured mode", async function () {
      const { settlement, asc, user } = await deploy();
      const healthFactor = ethers.parseUnits("1.0", 18);

      await expect(settlement.connect(asc).protectPosition(user.address, healthFactor, 100, 50))
        .to.emit(settlement, "PositionProtected")
        .withArgs(user.address, healthFactor, ProtectionAction.StopLoss);
    });

    it("routes LeverageRebalance mode to a Rebalance action", async function () {
      const { settlement, asc, user } = await deploy();
      await settlement.connect(user).setProtectionMode(user.address, ProtectionMode.LeverageRebalance, 0);
      const healthFactor = ethers.parseUnits("1.0", 18);

      await expect(settlement.connect(asc).protectPosition(user.address, healthFactor, 100, 50))
        .to.emit(settlement, "PositionProtected")
        .withArgs(user.address, healthFactor, ProtectionAction.Rebalance);
    });

    it("routes TakeProfit mode to a Close action", async function () {
      const { settlement, asc, user } = await deploy();
      await settlement.connect(user).setProtectionMode(user.address, ProtectionMode.TakeProfit, 0);
      const healthFactor = ethers.parseUnits("1.0", 18);

      await expect(settlement.connect(asc).protectPosition(user.address, healthFactor, 100, 50))
        .to.emit(settlement, "PositionProtected")
        .withArgs(user.address, healthFactor, ProtectionAction.Close);
    });
  });
});
