/* eslint-disable @typescript-eslint/no-explicit-any */
import { WalletConnectContext } from "../../../contexts/WalletConnectContext";
import { useCallback, useContext, useEffect } from "react";
import type { WalletInterface } from "../walletInterface";
import {
  AccountId,
  ContractExecuteTransaction,
  ContractId,
  LedgerId,
  TokenAssociateTransaction,
  TokenId,
  TransactionId,
  TransferTransaction,
  Client,
} from "@hashgraph/sdk";
import { ContractFunctionParameterBuilder } from "../contractFunctionParameterBuilder";
import { appConfig } from "../../../config";
import type { SessionTypes } from "@walletconnect/types";
import {
  DAppConnector,
  HederaJsonRpcMethod,
  HederaSessionEvent,
  HederaChainId,
  DAppSigner,
} from "@hashgraph/hedera-wallet-connect";
import EventEmitter from "events";

// Create refresh event for syncing wallet state
const refreshEvent = new EventEmitter();

// WalletConnect Project ID
const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
  "377d75bb6f86a2ffd427d032ff6ea7d3";

const currentNetworkConfig = appConfig.networks.testnet;
const hederaNetwork = currentNetworkConfig.network;

// Create a client for freezing transactions
const hederaClient = Client.forName(hederaNetwork);

// Metadata for Ajo.Save DApp
const metadata = {
  name: "Ajo.Save",
  description: "Decentralized Savings Platform on Hedera",
  url: window.location.origin,
  icons: [window.location.origin + "/logo192.png"],
};

// Initialize DAppConnector with better storage handling
const dappConnector = new DAppConnector(
  metadata,
  LedgerId.fromString(hederaNetwork),
  walletConnectProjectId,
  Object.values(HederaJsonRpcMethod),
  [HederaSessionEvent.ChainChanged, HederaSessionEvent.AccountsChanged],
  [HederaChainId.Testnet]
);

// Ensure WalletConnect initializes only once
let walletConnectInitPromise: Promise<void> | undefined = undefined;

const initializeWalletConnect = async () => {
  if (walletConnectInitPromise === undefined) {
    walletConnectInitPromise = dappConnector.init({
      logger: "error",
      // ✅ Add timeout and retry logic
    });
  }

  try {
    await walletConnectInitPromise;
    console.log("✅ WalletConnect initialized successfully");
  } catch (error) {
    console.error("❌ WalletConnect initialization failed:", error);
    // Reset the promise so it can be retried
    walletConnectInitPromise = undefined;
    throw error;
  }
};

// Open WalletConnect modal for pairing
export const openWalletConnectModal = async () => {
  try {
    await initializeWalletConnect();
    await dappConnector.openModal();
    refreshEvent.emit("sync");
  } catch (error) {
    console.error("Failed to open WalletConnect modal:", error);
    throw error;
  }
};

// Export dAppConnector for use in other components (like Header for minting)
export { dappConnector };

class WalletConnectWallet implements WalletInterface {
  private getSigner(): DAppSigner | null {
    if (!dappConnector.signers || dappConnector.signers.length === 0) {
      console.warn("⚠️ No signer available");
      return null;
    }
    return dappConnector.signers[0];
  }

  private accountId(): AccountId {
    const signer = this.getSigner();
    if (!signer) {
      throw new Error("No signer available");
    }
    return AccountId.fromString(signer.getAccountId().toString());
  }

  async transferHBAR(toAddress: AccountId, amount: number) {
    const signer = this.getSigner();
    if (!signer) {
      throw new Error("No signer available");
    }

    const accountId = this.accountId();

    const transferTransaction = new TransferTransaction()
      .addHbarTransfer(accountId, -amount)
      .addHbarTransfer(toAddress, amount)
      .setTransactionId(TransactionId.generate(accountId))
      .setNodeAccountIds([AccountId.fromString("0.0.3")]);

    try {
      await transferTransaction.freezeWith(hederaClient);
      const txResponse = await transferTransaction.executeWithSigner(signer);
      return txResponse.transactionId.toString();
    } catch (error) {
      console.error("Transfer HBAR failed:", error);
      return null;
    }
  }

  async transferFungibleToken(
    toAddress: AccountId,
    tokenId: TokenId,
    amount: number
  ) {
    const signer = this.getSigner();
    if (!signer) {
      throw new Error("No signer available");
    }

    const accountId = this.accountId();

    const transferTransaction = new TransferTransaction()
      .addTokenTransfer(tokenId, accountId, -amount)
      .addTokenTransfer(tokenId, toAddress, amount)
      .setTransactionId(TransactionId.generate(accountId))
      .setNodeAccountIds([AccountId.fromString("0.0.3")]);

    try {
      await transferTransaction.freezeWith(hederaClient);
      const txResponse = await transferTransaction.executeWithSigner(signer);
      return txResponse.transactionId.toString();
    } catch (error) {
      console.error("Transfer fungible token failed:", error);
      return null;
    }
  }

  async transferNonFungibleToken(
    toAddress: AccountId,
    tokenId: TokenId,
    serialNumber: number
  ) {
    const signer = this.getSigner();
    if (!signer) {
      throw new Error("No signer available");
    }

    const accountId = this.accountId();

    const transferTransaction = new TransferTransaction()
      .addNftTransfer(tokenId, serialNumber, accountId, toAddress)
      .setTransactionId(TransactionId.generate(accountId))
      .setNodeAccountIds([AccountId.fromString("0.0.3")]);

    try {
      await transferTransaction.freezeWith(hederaClient);
      const txResponse = await transferTransaction.executeWithSigner(signer);
      return txResponse.transactionId.toString();
    } catch (error) {
      console.error("Transfer NFT failed:", error);
      return null;
    }
  }

  async associateToken(tokenId: TokenId) {
    const signer = this.getSigner();
    if (!signer) {
      throw new Error("No signer available");
    }

    const accountId = this.accountId();

    const associateTransaction = new TokenAssociateTransaction()
      .setAccountId(accountId)
      .setTokenIds([tokenId])
      .setTransactionId(TransactionId.generate(accountId))
      .setNodeAccountIds([AccountId.fromString("0.0.3")]);

    try {
      await associateTransaction.freezeWith(hederaClient);
      const txResponse = await associateTransaction.executeWithSigner(signer);
      return txResponse.transactionId.toString();
    } catch (error) {
      console.error("Token association failed:", error);
      return null;
    }
  }

  async executeContractFunction(
    contractId: ContractId,
    functionName: string,
    functionParameters: ContractFunctionParameterBuilder,
    gasLimit: number
  ) {
    const signer = this.getSigner();
    if (!signer) {
      throw new Error("No signer available");
    }

    console.log("🔧 Executing contract function:", {
      contractId: contractId.toString(),
      functionName,
      gasLimit,
      accountId: signer.getAccountId().toString(),
    });

    const params = functionParameters.buildHAPIParams();

    // ✅ Don't set transactionId or nodeAccountIds manually
    // freezeWithSigner will handle these automatically
    const tx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(gasLimit)
      .setFunction(functionName, params);

    try {
      console.log("🔄 Freezing transaction with signer...");

      // ✅ Add timeout to prevent hanging
      const freezePromise = tx.freezeWithSigner(signer);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction freeze timeout after 60s")),
          60000
        )
      );

      const frozenTx = (await Promise.race([
        freezePromise,
        timeoutPromise,
      ])) as any;
      console.log("✅ Transaction frozen successfully");

      console.log("📤 Executing transaction...");
      const executePromise = frozenTx.executeWithSigner(signer);
      const execTimeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Transaction execution timeout after 90s")),
          90000
        )
      );

      const txResponse = (await Promise.race([
        executePromise,
        execTimeoutPromise,
      ])) as any;
      console.log(
        "✅ Transaction executed:",
        txResponse.transactionId.toString()
      );

      return txResponse.transactionId.toString();
    } catch (error: any) {
      console.error("❌ Contract execution failed:", error);

      // ✅ Provide more detailed error messages
      if (error.message?.includes("timeout")) {
        throw new Error(
          "Transaction timed out. Please check your wallet and try again."
        );
      } else if (error.message?.includes("User rejected")) {
        throw new Error("Transaction was rejected in wallet");
      } else if (error.message?.includes("insufficient")) {
        throw new Error("Insufficient balance for transaction");
      }

      throw error;
    }
  }

  disconnect() {
    console.log("🔌 Disconnecting wallet...");
    dappConnector
      .disconnectAll()
      .then(() => {
        // ✅ Clear any cached state
        console.log("✅ Wallet disconnected");
        refreshEvent.emit("sync");
      })
      .catch((error) => {
        console.error("❌ Disconnect failed:", error);
        // Force sync anyway
        refreshEvent.emit("sync");
      });
  }
}

export const walletConnectWallet = new WalletConnectWallet();

// Component to sync WalletConnect state with React context
export const WalletConnectClient = () => {
  const { setAccountId, setIsConnected } = useContext(WalletConnectContext);

  const syncWithWalletConnectContext = useCallback(() => {
    const accountId = dappConnector.signers[0]?.getAccountId()?.toString();
    console.log("🔄 Syncing wallet state:", {
      accountId,
      hasSigners: !!dappConnector.signers[0],
    });

    if (accountId) {
      setAccountId(accountId);
      setIsConnected(true);
      console.log("✅ Wallet connected:", accountId);
    } else {
      setAccountId("");
      setIsConnected(false);
      console.log("ℹ️ Wallet disconnected");
    }
  }, [setAccountId, setIsConnected]);

  useEffect(() => {
    // Listen for wallet connection changes
    refreshEvent.addListener("sync", syncWithWalletConnectContext);

    // Initialize WalletConnect on mount
    initializeWalletConnect()
      .then(() => {
        console.log("🎉 WalletConnect ready");
        syncWithWalletConnectContext();
      })
      .catch((error) => {
        console.error("💥 WalletConnect initialization failed:", error);
      });

    // Cleanup
    return () => {
      refreshEvent.removeListener("sync", syncWithWalletConnectContext);
    };
  }, [syncWithWalletConnectContext]);

  return null;
};
