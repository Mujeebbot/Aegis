require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.19",
  networks: {
    creditcoinTestnet: {
      url: process.env.CREDITCOIN_RPC_URL || "https://rpc.cc3-testnet.creditcoin.network",
      chainId: 102031,
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    sepolia: {
      url: process.env.SOURCE_CHAIN_RPC_ETHEREUM_SEPOLIA || "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
    },
    // Solana devnet is not EVM-compatible — handled separately via @solana/web3.js
    // in oracle-worker, not through Hardhat. Listed here for reference only.
  },
};
