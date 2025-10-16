/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HashConnectSignerAdapter - HashConnect v3.0.13 Compatible
 * Works with ethers 5.7.2
 *
 * Note: HashConnect v3 uses Hedera SDK signers, not ethers signers.
 * This adapter is kept for backwards compatibility but has limited functionality.
 * For full functionality, use Hedera SDK transactions directly with hashconnect.sendTransaction()
 */

import { ethers, Signer } from "ethers";
import type {
  TransactionRequest,
  TransactionResponse,
  Provider,
} from "@ethersproject/abstract-provider";
import type { Deferrable } from "@ethersproject/properties";

export class HashConnectSignerAdapter extends Signer {
  private hederaSigner: any; // Hedera SDK Signer from getSigner()
  private evmAddress: string | undefined;

  constructor(hederaSigner: any, provider?: Provider, evmAddress?: string) {
    super();

    this.hederaSigner = hederaSigner;
    this.evmAddress = evmAddress;

    ethers.utils.defineReadOnly(this, "_isSigner", true);

    if (provider) {
      ethers.utils.defineReadOnly(this, "provider", provider);
    }

    console.log("✅ HashConnectSignerAdapter initialized (v3)", {
      evmAddress: this.evmAddress,
      hasProvider: !!this.provider,
    });
  }

  async getAddress(): Promise<string> {
    if (this.evmAddress && this.evmAddress.startsWith("0x")) {
      return this.evmAddress;
    }

    // Try to get from Hedera signer
    try {
      if (this.hederaSigner.getAccountId) {
        const accountId = this.hederaSigner.getAccountId();
        const evmAddr = `0x${accountId.toSolidityAddress()}`;
        return evmAddr;
      }
    } catch (err) {
      console.warn("Could not get address from signer:", err);
    }

    throw new Error("EVM address not available");
  }

  async signTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    throw new Error(
      "Direct transaction signing not supported. Use Hedera SDK transactions with hashconnect.sendTransaction() instead."
    );
  }

  async signMessage(message: string | ethers.utils.Bytes): Promise<string> {
    console.log("🔄 HashConnectSignerAdapter.signMessage called");

    try {
      const messageStr =
        typeof message === "string"
          ? message
          : ethers.utils.toUtf8String(message);

      if (this.hederaSigner.sign) {
        const signatures = await this.hederaSigner.sign([messageStr]);
        if (signatures && signatures.length > 0) {
          return signatures[0].signature;
        }
      }

      throw new Error("Signer does not support message signing");
    } catch (error: any) {
      console.error("❌ Message signing failed:", error);
      throw new Error(
        `Message signing failed: ${error.message || "Unknown error"}`
      );
    }
  }

  async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    console.error("❌ sendTransaction not supported in HashConnect v3 adapter");
    console.log("Use Hedera SDK transactions instead:");
    console.log("1. Create ContractExecuteTransaction");
    console.log("2. Call hashconnect.sendTransaction(accountId, tx)");

    throw new Error(
      "EVM-style transactions are not supported in HashConnect v3. " +
        "Please use Hedera SDK transactions:\n\n" +
        "import { ContractExecuteTransaction, AccountId } from '@hashgraph/sdk';\n" +
        "const tx = new ContractExecuteTransaction()...;\n" +
        "const accountId = AccountId.fromString(accountIdString);\n" +
        "await hashconnect.sendTransaction(accountId, tx);"
    );
  }

  connect(provider: Provider): Signer {
    return new HashConnectSignerAdapter(
      this.hederaSigner,
      provider,
      this.evmAddress
    );
  }

  async getTransactionCount(blockTag?: any): Promise<number> {
    if (this.provider) {
      const address = await this.getAddress();
      return await this.provider.getTransactionCount(address, blockTag);
    }
    return 0;
  }

  async getGasPrice(): Promise<ethers.BigNumber> {
    if (this.provider) {
      return await this.provider.getGasPrice();
    }
    return ethers.BigNumber.from("0x1");
  }

  async getBalance(blockTag?: any): Promise<ethers.BigNumber> {
    if (this.provider) {
      const address = await this.getAddress();
      return await this.provider.getBalance(address, blockTag);
    }
    throw new Error("Cannot get balance without provider");
  }

  async getNetwork(): Promise<ethers.providers.Network> {
    if (this.provider) {
      return await this.provider.getNetwork();
    }

    return {
      name: "hedera-testnet",
      chainId: 296,
      ensAddress: undefined,
      _defaultProvider: undefined,
    } as ethers.providers.Network;
  }

  async getChainId(): Promise<number> {
    if (this.provider) {
      const network = await this.provider.getNetwork();
      return network.chainId;
    }
    return 296;
  }

  async call(
    transaction: Deferrable<TransactionRequest>,
    blockTag?: any
  ): Promise<string> {
    if (this.provider) {
      return await this.provider.call(transaction, blockTag);
    }
    throw new Error("Cannot call transaction without provider");
  }

  async estimateGas(
    transaction: Deferrable<TransactionRequest>
  ): Promise<ethers.BigNumber> {
    if (this.provider) {
      return await this.provider.estimateGas(transaction);
    }
    return ethers.BigNumber.from("0x16e360");
  }
}

/**
 * Creates an ethers-compatible signer adapter
 * Note: Limited functionality - prefer using Hedera SDK transactions directly
 */
export function createEthersCompatibleSigner(
  hederaSigner: any,
  provider?: Provider,
  evmAddress?: string
): Signer {
  if (hederaSigner instanceof Signer) {
    return hederaSigner;
  }

  return new HashConnectSignerAdapter(hederaSigner, provider, evmAddress);
}
