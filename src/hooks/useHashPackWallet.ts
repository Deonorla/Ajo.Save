/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useHashPackWallet.tsx
 *
 * HashPack integration using HashConnect v2 (stable)
 * - Works reliably with HashPack browser extension
 * - Simple, battle-tested API
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { HashConnect } from "hashconnect";
import {
  TransferTransaction,
  TokenAssociateTransaction,
  TokenId,
  AccountId,
  Hbar,
  Transaction,
} from "@hashgraph/sdk";
import { toast } from "sonner";

const MIRROR_NODE_DEFAULT = "https://testnet.mirrornode.hedera.com";
const NETWORK = (import.meta.env.VITE_NETWORK as string) || "testnet";
const MIRROR_NODE = import.meta.env.VITE_MIRROR_NODE_URL || MIRROR_NODE_DEFAULT;

/**
 * Minimal pairing/session data we keep
 */
export interface LegacyHashPackState {
  connected: boolean;
  accountId: string | null;
  network: string;
  pairingData: any | null;
  hasExtension: boolean;
  isInitializing: boolean;

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  sendTransaction: (tx: Transaction) => Promise<string>;
  sendHBAR: (to: string, amount: number) => Promise<string>;
  sendToken: (tokenId: string, to: string, amount: number) => Promise<string>;
  associateToken: (tokenId: string) => Promise<string>;

  getBalance: () => Promise<string | null>;
  getTokenBalance: (tokenId: string) => Promise<string | null>;
}

/**
 * App metadata for HashConnect v2
 */
const APP_METADATA = {
  name: "Ajo.Save",
  description: "Blockchain-powered savings groups",
  icon: "https://absolute.url/to/icon.png",
};

/**
 * LocalStorage key for session persistence
 */
const LS_KEY = "hashpack_session_v2";

/**
 * Main hook
 */
export default function useHashPackWallet(): LegacyHashPackState {
  const hashconnectRef = useRef<HashConnect | null>(null);
  const [state, setState] = useState({
    connected: false,
    accountId: null as string | null,
    pairingData: null as any,
    hasExtension: false,
    isInitializing: true,
  });

  const [initData, setInitData] = useState<any>(null);

  // Initialize HashConnect v2
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        // Create HashConnect instance
        const hashconnect = new HashConnect();
        hashconnectRef.current = hashconnect;

        // Initialize HashConnect
        const initData = await hashconnect.init(APP_METADATA, "testnet", false);

        if (!mounted) return;

        setInitData(initData);

        console.log("HashConnect initialized:", {
          topic: initData.topic,
          pairingString: initData.pairingString,
        });

        // Check for extension
        // const hasExt = checkForHashPackExtension();
        // setState((prev) => ({ ...prev, hasExtension: hasExt }));

        // Set up event listeners
        hashconnect.foundExtensionEvent.once((walletMetadata) => {
          console.log("HashPack extension found:", walletMetadata);
          setState((prev) => ({ ...prev, hasExtension: true }));
        });

        hashconnect.pairingEvent.once((pairingData) => {
          console.log("Pairing successful:", pairingData);

          if (pairingData.accountIds && pairingData.accountIds.length > 0) {
            const account = pairingData.accountIds[0];

            setState((prev) => ({
              ...prev,
              connected: true,
              accountId: account,
              pairingData: pairingData,
            }));

            // Save to localStorage
            try {
              localStorage.setItem(
                LS_KEY,
                JSON.stringify({
                  topic: pairingData.topic,
                  accountIds: pairingData.accountIds,
                  network: pairingData.network,
                  metadata: pairingData.metadata,
                })
              );
            } catch (err) {
              console.warn("Failed to save session:", err);
            }

            toast.success(`Connected: ${account}`);
          }
        });

        // Try to restore previous session
        try {
          const saved = localStorage.getItem(LS_KEY);
          if (saved) {
            const parsedSession = JSON.parse(saved);
            console.log("Attempting to restore session:", parsedSession);

            // Set optimistic state
            if (
              parsedSession.accountIds &&
              parsedSession.accountIds.length > 0
            ) {
              setState((prev) => ({
                ...prev,
                connected: true,
                accountId: parsedSession.accountIds[0],
                pairingData: parsedSession,
              }));

              toast.success(`Session restored: ${parsedSession.accountIds[0]}`);
            }
          }
        } catch (err) {
          console.warn("Failed to restore session:", err);
          localStorage.removeItem(LS_KEY);
        }
      } catch (error) {
        console.error("HashConnect initialization error:", error);
        toast.error("Failed to initialize HashPack connection");
      } finally {
        if (mounted) {
          setState((prev) => ({ ...prev, isInitializing: false }));
        }
      }
    };

    // Delay to allow extension injection
    const timer = setTimeout(init, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, []);

  /**
   * Check if HashPack extension is available
   */
  const checkForHashPackExtension = (): boolean => {
    if (typeof window === "undefined") return false;

    // Check for HashPack extension global objects
    const globalHashPack = (window as any).hashpack;
    const globalHbarWallet = (window as any).hbarWallet;

    return !!(globalHashPack || globalHbarWallet);
  };

  /**
   * Connect to HashPack extension
   */
  const connect = useCallback(async () => {
    if (state.connected && state.accountId) {
      toast.info("Already connected");
      return;
    }

    const hashconnect = hashconnectRef.current;
    if (!hashconnect) {
      toast.error("HashConnect not initialized");
      return;
    }

    try {
      // Check for extension
      const extensionAvailable = checkForHashPackExtension();
      setState((prev) => ({ ...prev, hasExtension: extensionAvailable }));

      if (!extensionAvailable) {
        toast.error(
          "HashPack extension not detected. Please install HashPack and refresh the page.",
          { duration: 5000 }
        );

        // Open HashPack website
        window.open("https://www.hashpack.app/download", "_blank");
        return;
      }

      console.log("Connecting to HashPack extension...");

      // Connect to extension - this will trigger the pairing popup
      hashconnect.connectToLocalWallet();

      toast.info("Check HashPack extension to approve connection", {
        duration: 5000,
      });
    } catch (error: any) {
      console.error("Connection error:", error);
      toast.error(`Failed to connect: ${error.message || "Unknown error"}`);
    }
  }, [state.connected, state.accountId, initData]);

  /**
   * Disconnect from HashPack
   */
  const disconnect = useCallback(async () => {
    const hashconnect = hashconnectRef.current;
    if (!hashconnect) return;

    try {
      // HashConnect v2 doesn't have explicit disconnect for extension
      // Just clear local state
      setState({
        connected: false,
        accountId: null,
        pairingData: null,
        hasExtension: state.hasExtension,
        isInitializing: false,
      });

      try {
        localStorage.removeItem(LS_KEY);
      } catch (err) {
        console.warn("Failed to remove session:", err);
      }

      toast.success("Disconnected from HashPack");
    } catch (error: any) {
      console.error("Disconnect error:", error);
      toast.error("Failed to disconnect");
    }
  }, [state.hasExtension]);

  /**
   * Send a transaction through HashPack
   */
  const sendTransaction = useCallback(
    async (transaction: Transaction): Promise<string> => {
      if (!state.connected || !state.accountId || !state.pairingData) {
        throw new Error("Wallet not connected");
      }

      const hashconnect = hashconnectRef.current;
      if (!hashconnect) {
        throw new Error("HashConnect not initialized");
      }

      try {
        // Freeze transaction
        transaction.freeze();

        // Convert to bytes
        const transactionBytes = transaction.toBytes();

        // Create signing request
        const transaction_to_sign = {
          topic: state.pairingData.topic,
          byteArray: transactionBytes,
          metadata: {
            accountToSign: state.accountId,
            returnTransaction: false,
            hideNft: false,
          },
        };

        console.log("Sending transaction to HashPack for signing...");

        // Send transaction - this returns a promise in v2
        const response = await hashconnect.sendTransaction(
          state.pairingData.topic,
          transaction_to_sign
        );

        console.log("Transaction response:", response);

        // Extract transaction ID from various possible response structures
        let txId: string | null = null;

        if (response) {
          txId = response.receipt?.toString() || null;
        }

        if (!txId) {
          throw new Error("No transaction ID returned from HashPack");
        }

        // Wait for mirror node confirmation
        await waitForMirrorSuccess(txId);

        return txId;
      } catch (error: any) {
        console.error("Transaction error:", error);
        throw new Error(
          `Transaction failed: ${error.message || "Unknown error"}`
        );
      }
    },
    [state]
  );

  /**
   * Send HBAR
   */
  const sendHBAR = useCallback(
    async (to: string, amount: number) => {
      if (!state.connected || !state.accountId) {
        throw new Error("Wallet not connected");
      }

      const tx = new TransferTransaction()
        .addHbarTransfer(state.accountId, new Hbar(-amount))
        .addHbarTransfer(to, new Hbar(amount))
        .setTransactionMemo("Ajo.Save: HBAR transfer");

      const txId = await sendTransaction(tx);
      toast.success("HBAR sent successfully");
      return txId;
    },
    [state.connected, state.accountId, sendTransaction]
  );

  /**
   * Send Token
   */
  const sendToken = useCallback(
    async (tokenId: string, to: string, amount: number) => {
      if (!state.connected || !state.accountId) {
        throw new Error("Wallet not connected");
      }

      const tx = new TransferTransaction()
        .addTokenTransfer(
          TokenId.fromString(tokenId),
          AccountId.fromString(state.accountId),
          -amount
        )
        .addTokenTransfer(
          TokenId.fromString(tokenId),
          AccountId.fromString(to),
          amount
        )
        .setTransactionMemo("Ajo.Save: Token transfer");

      const txId = await sendTransaction(tx);
      toast.success("Token sent successfully");
      return txId;
    },
    [state.connected, state.accountId, sendTransaction]
  );

  /**
   * Associate Token
   */
  const associateToken = useCallback(
    async (tokenId: string) => {
      if (!state.connected || !state.accountId) {
        throw new Error("Wallet not connected");
      }

      const tx = new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(state.accountId))
        .setTokenIds([TokenId.fromString(tokenId)]);

      const txId = await sendTransaction(tx);
      toast.success("Token association successful");
      return txId;
    },
    [state.connected, state.accountId, sendTransaction]
  );

  /**
   * Get HBAR balance from mirror node
   */
  const getBalance = useCallback(async (): Promise<string | null> => {
    if (!state.accountId) return null;

    try {
      const res = await fetch(
        `${MIRROR_NODE}/api/v1/accounts/${encodeURIComponent(state.accountId)}`
      );

      if (!res.ok) throw new Error("Mirror node request failed");

      const data = await res.json();
      const hbarTiny = Number(data.balance?.balance ?? data.balance ?? 0);
      const hbar = hbarTiny / 100_000_000;

      return hbar.toFixed(4);
    } catch (err) {
      console.error("getBalance error:", err);
      return null;
    }
  }, [state.accountId]);

  /**
   * Get token balance from mirror node
   */
  const getTokenBalance = useCallback(
    async (tokenId: string): Promise<string | null> => {
      if (!state.accountId) return null;

      try {
        const url = `${MIRROR_NODE}/api/v1/accounts/${encodeURIComponent(
          state.accountId
        )}/tokens?token.id=${encodeURIComponent(tokenId)}`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Mirror node token fetch failed");

        const json = await res.json();
        if (json.tokens && json.tokens.length > 0) {
          return String(json.tokens[0].balance ?? "0");
        }

        return "0";
      } catch (err) {
        console.error("getTokenBalance error:", err);
        return null;
      }
    },
    [state.accountId]
  );

  return {
    connected: state.connected,
    accountId: state.accountId,
    network: NETWORK,
    pairingData: state.pairingData,
    hasExtension: state.hasExtension,
    isInitializing: state.isInitializing,
    connect,
    disconnect,
    sendTransaction,
    sendHBAR,
    sendToken,
    associateToken,
    getBalance,
    getTokenBalance,
  };
}

/**
 * Poll mirror node for transaction confirmation
 */
async function waitForMirrorSuccess(
  transactionId: string,
  timeoutMs = 30000
): Promise<void> {
  const start = Date.now();
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  while (Date.now() - start < timeoutMs) {
    try {
      const url = `${MIRROR_NODE_DEFAULT}/api/v1/transactions/${encodeURIComponent(
        transactionId
      )}`;

      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        const txs = json?.transactions ?? [];

        if (txs.length > 0) {
          const tx = txs[0];
          if (tx.result === "SUCCESS") {
            console.log("Transaction confirmed:", transactionId);
            return;
          }
          if (tx.result && tx.result !== "PENDING") {
            throw new Error(`Transaction failed: ${tx.result}`);
          }
        }
      }
    } catch (err) {
      // Continue polling on errors
    }

    await sleep(2000);
  }

  console.warn("Mirror node confirmation timed out for", transactionId);
}
