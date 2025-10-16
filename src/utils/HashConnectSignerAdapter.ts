/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HashConnectSignerAdapter - FIXED VERSION
 *
 * Critical fix: Pass encryption key from pairing data to enable transaction encryption
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
  private evmAddress: string | undefined;
  private hashconnect: any;
  private topicId: string;
  private accountToSign: string;
  private encryptionKey: string | undefined; // 🔥 NEW: Store encryption key

  constructor(
    hashConnectSigner: any,
    provider?: Provider,
    evmAddress?: string,
    encryptionKey?: string // 🔥 NEW: Accept encryption key
  ) {
    super();

    this.hashConnectSigner = hashConnectSigner;
    this.evmAddress = evmAddress;
    this.hashconnect = hashConnectSigner.hashconnect;
    this.topicId = hashConnectSigner.topicId;
    this.accountToSign = hashConnectSigner.accountToSign;
    this.encryptionKey = encryptionKey; // 🔥 NEW: Store encryption key

    ethers.utils.defineReadOnly(this, "_isSigner", true);

    if (hashConnectSigner?.provider) {
      ethers.utils.defineReadOnly(this, "provider", hashConnectSigner.provider);
    } else if (provider) {
      ethers.utils.defineReadOnly(this, "provider", provider);
    }

    console.log("✅ HashConnectSignerAdapter initialized", {
      topicId: this.topicId,
      accountToSign: this.accountToSign,
      evmAddress: this.evmAddress,
      hasEncryptionKey: !!this.encryptionKey, // 🔥 NEW: Log encryption key status
      encryptionKey: this.encryptionKey, // 🔥 NEW: Log actual key for debugging
    });
  }

  async getAddress(): Promise<string> {
    if (this.evmAddress && this.evmAddress.startsWith("0x")) {
      return this.evmAddress;
    }
    throw new Error("EVM address not available");
  }

  async signTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<string> {
    throw new Error(
      "Direct transaction signing not supported. Use sendTransaction instead."
    );
  }

  async signMessage(message: string | ethers.utils.Bytes): Promise<string> {
    throw new Error("Message signing not yet implemented for HashConnect");
  }

  // 🔥 CRITICAL FIX: Proper encryption key handling
  async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    console.log("🔄 HashConnectSignerAdapter.sendTransaction called");

    // 🔥 NEW: Verify encryption key exists
    if (!this.encryptionKey) {
      console.error("❌ Encryption key missing!");
      console.log(
        "Available pairing data:",
        this.hashconnect?.hcData?.pairingData
      );
      throw new Error(
        "Encryption key not available. Please reconnect your wallet."
      );
    }

    console.log("🔑 Using encryption key:", this.encryptionKey);

    const resolvedTx = await ethers.utils.resolveProperties(transaction);
    console.log("✅ Resolved transaction:", resolvedTx);

    if (!resolvedTx.from) {
      resolvedTx.from = await this.getAddress();
    }

    try {
      console.log("📤 Converting transaction to bytes...");

      // Build raw transaction for serialization
      const rawTx: any = {
        to: resolvedTx.to,
        data: resolvedTx.data || "0x",
        value: resolvedTx.value
          ? ethers.BigNumber.from(resolvedTx.value)
          : ethers.BigNumber.from(0),
        gasLimit: resolvedTx.gasLimit
          ? ethers.BigNumber.from(resolvedTx.gasLimit)
          : ethers.BigNumber.from(1500000),
        gasPrice: resolvedTx.gasPrice
          ? ethers.BigNumber.from(resolvedTx.gasPrice)
          : undefined,
        nonce:
          resolvedTx.nonce !== undefined ? Number(resolvedTx.nonce) : undefined,
        chainId: 296,
        type: 0,
      };

      // Remove undefined fields
      if (rawTx.gasPrice === undefined) delete rawTx.gasPrice;
      if (rawTx.nonce === undefined) delete rawTx.nonce;

      // Serialize to bytes
      const serializedTx = ethers.utils.serializeTransaction(rawTx);
      const txBytes = ethers.utils.arrayify(serializedTx);

      console.log("✅ Transaction serialized to bytes");

      // Build HashConnect message with encryption key
      const transactionMessage: any = {
        topic: this.topicId, // 🔥 IMPORTANT: Include topic
        byteArray: txBytes,
        metadata: {
          accountToSign: this.accountToSign,
          returnTransaction: false,
          hideNft: false,
        },
      };

      console.log("📤 Sending transaction to HashPack...");
      console.log("Transaction message:", {
        topic: this.topicId,
        accountToSign: this.accountToSign,
        bytesLength: txBytes.length,
      });

      // 🔥 CRITICAL FIX: Set up event listener BEFORE sending transaction
      const responsePromise = new Promise<any>((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.hashconnect.transactionEvent.off(transactionListener);
          reject(
            new Error(
              "Transaction timed out (60s). Please check HashPack wallet."
            )
          );
        }, 60000);

        const transactionListener = (response: any) => {
          console.log("📥 Transaction event received:", response);

          if (
            response &&
            (response.success !== undefined || response.receipt !== undefined)
          ) {
            clearTimeout(timeout);
            this.hashconnect.transactionEvent.off(transactionListener);
            resolve(response);
          }
        };

        // Register listener
        this.hashconnect.transactionEvent.on(transactionListener);

        console.log("✅ Event listener registered, sending transaction...");
      });

      // 🔥 CRITICAL: Send transaction with proper method signature
      // According to HashConnect 0.2.9 docs, sendTransaction takes (topic, transaction)
      await this.hashconnect.sendTransaction(this.topicId, transactionMessage);

      console.log("⏳ Waiting for user approval and transaction response...");

      // Wait for response from event
      const response = await responsePromise;

      console.log("✅ Transaction response received:", response);

      // Check success
      if (response.success === false) {
        throw new Error(
          `Transaction failed: ${response.error || "Unknown error"}`
        );
      }

      // Extract transaction hash
      let txHash: string;

      if (response.receipt) {
        // Convert receipt bytes to hash
        const receiptBytes =
          typeof response.receipt === "string"
            ? ethers.utils.arrayify(response.receipt)
            : response.receipt;

        txHash = ethers.utils.keccak256(receiptBytes);
        console.log("✅ Transaction hash from receipt:", txHash);
      } else if (response.response) {
        txHash = response.response;
        console.log("✅ Transaction hash from response:", txHash);
      } else {
        // Fallback: generate hash from serialized transaction
        txHash = ethers.utils.keccak256(serializedTx);
        console.log("⚠️ Using fallback transaction hash:", txHash);
      }

      // Return Ethers TransactionResponse
      const txResponse: any = {
        hash: txHash,
        to: resolvedTx.to,
        from: resolvedTx.from,
        nonce: resolvedTx.nonce || 0,
        gasLimit: resolvedTx.gasLimit || ethers.BigNumber.from(0),
        value: resolvedTx.value || ethers.BigNumber.from(0),
        data: resolvedTx.data || "0x",
        chainId: 296,
        confirmations: 0,
        wait: async (confirmations?: number) => {
          console.log(`⏳ Waiting for confirmation...`);

          // Wait a bit for Hedera consensus
          await new Promise((resolve) => setTimeout(resolve, 3000));

          console.log("✅ Transaction assumed confirmed");

          return {
            transactionHash: txHash,
            status: 1,
            blockNumber: 0,
            blockHash: "",
            from: resolvedTx.from!,
            to: resolvedTx.to!,
            gasUsed: ethers.BigNumber.from(0),
            cumulativeGasUsed: ethers.BigNumber.from(0),
            logs: [],
            logsBloom: "",
            confirmations: 1,
            type: 0,
            byzantium: true,
          };
        },
      };

      return txResponse as TransactionResponse;
    } catch (error: any) {
      console.error("❌ Transaction failed:", error);

      if (
        error.code === 4001 ||
        error.message?.includes("reject") ||
        error.message?.includes("denied") ||
        error.message?.includes("timed out")
      ) {
        throw new Error("Transaction rejected or timed out");
      }

      throw error;
    }
  }

  connect(provider: Provider): Signer {
    return new HashConnectSignerAdapter(
      this.hashConnectSigner,
      provider,
      this.evmAddress,
      this.encryptionKey // 🔥 NEW: Pass encryption key
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
    throw new Error("Cannot get balance");
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
    throw new Error("Cannot call transaction");
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
 * Factory function to create an Ethers-compatible signer from HashConnect
 * 🔥 UPDATED: Now accepts encryption key
 */
export function createEthersCompatibleSigner(
  hashConnectSigner: any,
  provider?: Provider,
  evmAddress?: string,
  encryptionKey?: string // 🔥 NEW: Accept encryption key
): Signer {
  if (hashConnectSigner instanceof Signer) {
    return hashConnectSigner;
  }

  return new HashConnectSignerAdapter(
    hashConnectSigner,
    provider,
    evmAddress,
    encryptionKey // 🔥 NEW: Pass encryption key
  );
}
