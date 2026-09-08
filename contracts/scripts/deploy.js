// Deploys Settlement first (ASC needs its address), then ASC.
// Run: npm run deploy:testnet
// This is the "trivial deploy-and-call" smoke test — confirms the CC3 RPC
// pipeline works end to end before anyone builds real contract logic on top.

const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Settlement = await hre.ethers.getContractFactory("LiquidationShieldSettlement");
  // Placeholder ASC address — redeploy Settlement after ASC exists, or use a two-step deploy.
  const settlement = await Settlement.deploy(deployer.address);
  await settlement.waitForDeployment();
  console.log("Settlement deployed to:", await settlement.getAddress());

  const ASC = await hre.ethers.getContractFactory("LiquidationShieldASC");
  const asc = await ASC.deploy(await settlement.getAddress());
  await asc.waitForDeployment();
  console.log("ASC deployed to:", await asc.getAddress());

  console.log("\nAdd these to your .env:");
  console.log(`SETTLEMENT_CONTRACT_ADDRESS=${await settlement.getAddress()}`);
  console.log(`ASC_CONTRACT_ADDRESS=${await asc.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
