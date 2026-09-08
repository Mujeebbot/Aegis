"use strict";

/**
 * Creditcoin CC3 connection: provider, signer, and boot-time sanity checks.
 *
 * The checks matter because every failure mode they catch is otherwise
 * discovered as an opaque revert several minutes into a demo: pointed at the
 * wrong chain, unfunded hot wallet, ASC address with no code at it.
 */

const { JsonRpcProvider, Wallet, formatEther } = require("ethers");

class CreditcoinClient {
  /**
   * @param {object} deps
   * @param {object} deps.config full worker config
   * @param {object} deps.logger
   */
  constructor({ config, logger }) {
    this.config = config;
    this.logger = logger.child({ module: "creditcoin" });

    // staticNetwork avoids a chainId round-trip on every call; we verify the
    // chain explicitly in connect() instead.
    this.provider = new JsonRpcProvider(config.creditcoin.rpcUrl, undefined, {
      staticNetwork: true,
    });

    this.wallet = config.signer.privateKey
      ? new Wallet(normalizeKey(config.signer.privateKey), this.provider)
      : null;
  }

  get address() {
    return this.wallet?.address ?? null;
  }

  /** Verify the RPC is live, on the expected chain, and the wallet is funded. */
  async connect() {
    const network = await this.provider.getNetwork();
    const actualChainId = Number(network.chainId);

    if (actualChainId !== this.config.creditcoin.chainId) {
      throw new Error(
        `Connected to chainId ${actualChainId} but CREDITCOIN_CHAIN_ID is ` +
          `${this.config.creditcoin.chainId}. Check CREDITCOIN_RPC_URL points at CC3 testnet.`,
      );
    }

    const blockNumber = await this.provider.getBlockNumber();
    const info = { chainId: actualChainId, blockNumber, rpcUrl: this.config.creditcoin.rpcUrl };

    if (this.wallet) {
      const balance = await this.provider.getBalance(this.wallet.address);
      info.signer = this.wallet.address;
      info.balance = `${formatEther(balance)} tCTC`;

      if (balance < this.config.signer.minBalanceWei) {
        // A warning, not a throw: the worker should still boot and serve its
        // API so the problem is visible on /readyz rather than as a crash loop.
        this.logger.warn("signer balance below minimum; submissions will be refused", {
          signer: this.wallet.address,
          balance: formatEther(balance),
          minimum: formatEther(this.config.signer.minBalanceWei),
          hint: "top up via the Creditcoin Discord faucet",
        });
        info.underfunded = true;
      }
    }

    this.logger.info("connected to Creditcoin", info);
    return info;
  }

  /** Guard called immediately before any state-changing submission. */
  async assertCanSubmit() {
    if (!this.wallet) {
      throw new Error("No signer configured. Set DEPLOYER_PRIVATE_KEY to submit proofs.");
    }
    const balance = await this.provider.getBalance(this.wallet.address);
    if (balance < this.config.signer.minBalanceWei) {
      throw new Error(
        `Signer ${this.wallet.address} has ${formatEther(balance)} tCTC, below the ` +
          `${formatEther(this.config.signer.minBalanceWei)} minimum. Top up before submitting.`,
      );
    }
    return balance;
  }

  async getBalance() {
    if (!this.wallet) return null;
    return this.provider.getBalance(this.wallet.address);
  }
}

/** ethers v6 wants the 0x prefix; .env files routinely omit it. */
function normalizeKey(key) {
  return key.startsWith("0x") ? key : `0x${key}`;
}

module.exports = { CreditcoinClient, normalizeKey };
