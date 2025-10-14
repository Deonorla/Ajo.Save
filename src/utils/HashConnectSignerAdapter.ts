/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HashConnectSignerAdapter
 *
 * This adapter wraps HashConnect's signer to make it fully compatible
 * with Ethers v5.7.2's strict type checking.
 *
 * The issue: HashConnect v0.2.9 returns a signer-like object that works
 * functionally but doesn't pass Ethers' internal type validation.
 *
 * The solution: Extend Ethers' Signer class and delegate all methods
 * to the HashConnect signer.
 */

import { ethers, Signer } from "ethers";
import type {
  TransactionRequest,
  TransactionResponse,
  Provider,
} from "@ethersproject/abstract-provider";
import type { Deferrable } from "@ethersproject/properties";

export class HashConnectSignerAdapter extends Signer {
  private hashConnectSigner: any;

  constructor(hashConnectSigner: any, provider?: Provider) {
    super();

    // Store the HashConnect signer
    this.hashConnectSigner = hashConnectSigner;

    // Attach the provider
    if (provider) {
      ethers.utils.defineReadOnly(this, "provider", provider);
    } else if (hashConnectSigner.provider) {
      ethers.utils.defineReadOnly(this, "provider", hashConnectSigner.provider);
    }
  }

  // Required method: Get the signer's address
  async getAddress(): Promise<string> {
    if (this.hashConnectSigner.getAddress) {
      return await this.hashConnectSigner.getAddress();
    }
    if (this.hashConnectSigner._address) {
      return this.hashConnectSigner._address;
    }
    throw new Error("Cannot get address from HashConnect signer");
  }

  // Required method: Sign a transaction
  async signTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    if (this.hashConnectSigner.signTransaction) {
      return await this.hashConnectSigner.signTransaction(transaction);
    }
    throw new Error("signTransaction not supported by HashConnect signer");
  }

  // Required method: Sign a message
  async signMessage(message: string | ethers.utils.Bytes): Promise<string> {
    if (this.hashConnectSigner.signMessage) {
      return await this.hashConnectSigner.signMessage(message);
    }
    throw new Error("signMessage not supported by HashConnect signer");
  }

  // Primary method: Send a transaction
  async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    if (this.hashConnectSigner.sendTransaction) {
      return await this.hashConnectSigner.sendTransaction(transaction);
    }
    throw new Error("sendTransaction not supported by HashConnect signer");
  }

  // Connect to a different provider
  connect(provider: Provider): Signer {
    return new HashConnectSignerAdapter(this.hashConnectSigner, provider);
  }

  // Get transaction count (nonce)
  async getTransactionCount(blockTag?: any): Promise<number> {
    if (this.hashConnectSigner.getTransactionCount) {
      return await this.hashConnectSigner.getTransactionCount(blockTag);
    }
    if (this.provider) {
      const address = await this.getAddress();
      return await this.provider.getTransactionCount(address, blockTag);
    }
    return 0;
  }

  // Get gas price
  async getGasPrice(): Promise<ethers.BigNumber> {
    if (this.hashConnectSigner.getGasPrice) {
      return await this.hashConnectSigner.getGasPrice();
    }
    if (this.provider) {
      return await this.provider.getGasPrice();
    }
    throw new Error("Cannot get gas price");
  }

  // Get balance
  async getBalance(blockTag?: any): Promise<ethers.BigNumber> {
    if (this.hashConnectSigner.getBalance) {
      return await this.hashConnectSigner.getBalance(blockTag);
    }
    if (this.provider) {
      const address = await this.getAddress();
      return await this.provider.getBalance(address, blockTag);
    }
    throw new Error("Cannot get balance");
  }

  // Get chain ID
  async getChainId(): Promise<number> {
    if (this.hashConnectSigner.getChainId) {
      return await this.hashConnectSigner.getChainId();
    }
    if (this.provider) {
      const network = await this.provider.getNetwork();
      return network.chainId;
    }
    throw new Error("Cannot get chain ID");
  }

  // Call (read-only)
  async call(
    transaction: Deferrable<TransactionRequest>,
    blockTag?: any
  ): Promise<string> {
    if (this.hashConnectSigner.call) {
      return await this.hashConnectSigner.call(transaction, blockTag);
    }
    if (this.provider) {
      return await this.provider.call(transaction, blockTag);
    }
    throw new Error("Cannot call transaction");
  }

  // Estimate gas
  async estimateGas(
    transaction: Deferrable<TransactionRequest>
  ): Promise<ethers.BigNumber> {
    if (this.hashConnectSigner.estimateGas) {
      return await this.hashConnectSigner.estimateGas(transaction);
    }
    if (this.provider) {
      return await this.provider.estimateGas(transaction);
    }
    throw new Error("Cannot estimate gas");
  }

  // Check if this is a proper Signer (for Ethers' internal checks)
  _isSigner: boolean = true;
}

/**
 * Factory function to create an Ethers-compatible signer from HashConnect
 */
export function createEthersCompatibleSigner(
  hashConnectSigner: any,
  provider?: Provider
): Signer {
  // If it's already a proper Ethers Signer, return as-is
  if (hashConnectSigner instanceof Signer) {
    return hashConnectSigner;
  }

  // Otherwise, wrap it in our adapter
  return new HashConnectSignerAdapter(hashConnectSigner, provider);
}
