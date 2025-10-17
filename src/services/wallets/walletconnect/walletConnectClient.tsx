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

// WalletConnect Project ID - replace with your own from https://cloud.walletconnect.com
const walletConnectProjectId =
  import.meta.env.VITE_WALLETCONNECT_PROJECT_ID ||
  "377d75bb6f86a2ffd427d032ff6ea7d3";

const currentNetworkConfig = appConfig.networks.testnet;
const hederaNetwork = currentNetworkConfig.network;

// Create a client for freezing transactions (no operator needed for this)
const hederaClient = Client.forName(hederaNetwork);

// Metadata for your dApp
const metadata = {
  name: "Ajo.Save",
  description: "Decentralized Savings Platform on Hedera",
  url: window.location.origin,
  icons: [window.location.origin + "/logo192.png"],
};

// Initialize DAppConnector
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
    walletConnectInitPromise = dappConnector.init({ logger: "error" });
  }
  await walletConnectInitPromise;
};

// Open WalletConnect modal for pairing
export const openWalletConnectModal = async () => {
  await initializeWalletConnect();
  await dappConnector.openModal();
  refreshEvent.emit("sync");
};

// Export dAppConnector for use in other components (like Header for minting)
export { dappConnector };

class WalletConnectWallet implements WalletInterface {
  private getSigner(): DAppSigner | null {
    if (!dappConnector.signers || dappConnector.signers.length === 0) {
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

    const params = functionParameters.buildHAPIParams();
    const accountId = this.accountId();

    const tx = new ContractExecuteTransaction()
      .setContractId(contractId)
      .setGas(gasLimit)
      .setFunction(functionName, params)
      .setTransactionId(TransactionId.generate(accountId))
      .setNodeAccountIds([AccountId.fromString("0.0.3")]);

    try {
      // Freeze the transaction with the client (no operator required)
      await tx.freezeWith(hederaClient);

      // Now execute with signer
      const txResponse = await tx.executeWithSigner(signer);
      return txResponse.transactionId.toString();
    } catch (error) {
      console.error("Contract execution failed:", error);
      return null;
    }
  }

  disconnect() {
    dappConnector.disconnectAll().then(() => {
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
    if (accountId) {
      setAccountId(accountId);
      setIsConnected(true);
    } else {
      setAccountId("");
      setIsConnected(false);
    }
  }, [setAccountId, setIsConnected]);

  useEffect(() => {
    // Listen for wallet connection changes
    refreshEvent.addListener("sync", syncWithWalletConnectContext);

    // Initialize WalletConnect on mount
    initializeWalletConnect().then(() => {
      syncWithWalletConnectContext();
    });

    // Cleanup
    return () => {
      refreshEvent.removeListener("sync", syncWithWalletConnectContext);
    };
  }, [syncWithWalletConnectContext]);

  return null;
};
