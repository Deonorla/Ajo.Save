/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useHashPackWallet.ts - TAILORED TO CLASS LOGIC
 *
 * HashPack integration using HashConnect v0.2.3, now using the manual
 * transaction byte generation and hashconnect.sendTransaction() from the
 * class example to bypass potential JSON-RPC relay issues.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { HashConnect } from "hashconnect";
import type { HashConnectTypes } from "hashconnect";
import {
  TransferTransaction,
  TokenAssociateTransaction,
  TokenId,
  AccountId,
  Hbar,
  Transaction,
  TransactionId, // manual transaction ID generation
  TransactionReceipt, // receipt processing
  Client, // Retained for getReceipt logic, though less used now
} from "@hashgraph/sdk";
import { toast } from "sonner";

// ==========================================================
// 🛠️ FIX FOR: ReferenceError: Buffer is not defined
// This is required for older HashConnect versions in Vite.
// ==========================================================
import { Buffer } from "buffer";

// We need to manually inject Buffer into the global scope for HashConnect v0.2.9
// This is safe because we only use it for the pairing string generation.
if (typeof (window as any).Buffer === "undefined") {
  (window as any).Buffer = Buffer;
}
// ==========================================================

// --- UTILITY FUNCTION ---
// Replicating the helper from the class for node selection
const randomIntFromInterval = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

// --- CONFIGURATION ---
const MIRROR_NODE_DEFAULT = "https://testnet.mirrornode.hedera.com";
const NETWORK = (import.meta.env.VITE_NETWORK as string) || "testnet";
const MIRROR_NODE = import.meta.env.VITE_MIRROR_NODE_URL || MIRROR_NODE_DEFAULT;

const APP_METADATA: HashConnectTypes.AppMetadata = {
  name: "Ajo.Save",
  description: "Blockchain-powered savings groups",
  icon: "https://www.hedera.com/resources/images/favicon.ico",
};

const LS_KEY = "hashconnect_session_v023";

// --- INTERFACE ---
export interface LegacyHashPackState {
  connected: boolean;
  accountId: string | null;
  network: string;
  pairingData: any | null;
  hasExtension: boolean;
  isInitializing: boolean;
  dAppSigner: any; // Retained for compatibility, though less crucial now

  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  sendTransaction: (tx: Transaction) => Promise<string>;
  sendHBAR: (to: string, amount: number) => Promise<string>;
  sendToken: (tokenId: string, to: string, amount: number) => Promise<string>;
  associateToken: (tokenId: string) => Promise<string>;

  getBalance: () => Promise<string | null>;
  getTokenBalance: (tokenId: string) => Promise<string | null>;
}

// --- HOOK IMPLEMENTATION ---
export default function useHashPackWallet(): LegacyHashPackState {
  const hashconnectRef = useRef<HashConnect | null>(null);

  const [state, setState] = useState({
    connected: false,
    accountId: null as string | null,
    pairingData: null as any,
    hasExtension: false,
    isInitializing: true,
  });

  // Now storing topic/pairingString explicitly, similar to the class
  const [topic, setTopic] = useState("");
  const [pairingString, setPairingString] = useState("");
  const [initData, setInitData] =
    useState<HashConnectTypes.InitilizationData | null>(null);

  // =================================================================
  // === HELPER FUNCTIONS (From the Class Logic) =====================
  // =================================================================

  // transaction formatting logic to control node selection
  const makeBytes = useCallback(
    async (trans: Transaction, signingAcctId: string) => {
      const transId = TransactionId.generate(signingAcctId);
      trans.setTransactionId(transId);

      let nodeId = 5; // Default node

      // Choose random node ID based on network, replicating class logic
      if (NETWORK === "testnet") {
        nodeId = randomIntFromInterval(3, 7);
      } else if (NETWORK === "mainnet") {
        nodeId = randomIntFromInterval(11, 24);
      } else if (NETWORK === "previewnet") {
        // Assuming a default range for previewnet if needed, using a safe node ID
        nodeId = randomIntFromInterval(1, 4);
      }

      trans.setNodeAccountIds([new AccountId(nodeId)]);
      trans.freeze();

      const transBytes = trans.toBytes();
      return transBytes;
    },
    [NETWORK]
  );

  // =================================================================
  // === INITIALIZATION & EVENTS (Adapted from the Class) =============
  // =================================================================

  const setUpHashConnectEvents = useCallback(
    (hashconnect: HashConnect, mounted: React.MutableRefObject<boolean>) => {
      hashconnect.foundExtensionEvent.on((data) => {
        // console.log("🎉 Extension found event:", data);
        if (mounted.current) {
          setState((prev) => ({ ...prev, hasExtension: true }));
        }
      });

      hashconnect.pairingEvent.on((data) => {
        // console.log("🤝 Pairing event:", data);
        if (data.accountIds && data.accountIds.length > 0) {
          const account = data.accountIds[0];
          if (mounted.current) {
            setState((prev) => ({
              ...prev,
              connected: true,
              accountId: account,
              pairingData: data,
            }));
            try {
              localStorage.setItem(
                LS_KEY,
                JSON.stringify({
                  topic: data.topic,
                  accountIds: data.accountIds,
                  network: data.network,
                })
              );
            } catch (err) {
              /* no-op */
            }
            toast.success(`Connected: ${account}`);
          }
        }
      });

      hashconnect.transactionEvent.on((data) => {
        // console.log(
        //   "Transaction event callback (data received from wallet, usually just a log):",
        //   data
        // );
      });

      (hashconnect.connectionStatusChangeEvent.on as any)((data: number) => {
        // State 0 is universally 'Disconnected' in HashConnect v0.2.9
        if (data === 0) {
          if (mounted.current) {
            // console.log("Connection Status Change: Disconnected (Value 0)");
            setState((prev) => ({
              ...prev,
              connected: false,
              accountId: null,
              pairingData: null,
            }));
            localStorage.removeItem(LS_KEY);
            toast.info("Wallet disconnected.");
          }
        }
      });
    },
    []
  ); // Dependencies are stable

  useEffect(() => {
    const mounted = { current: true }; // Use a ref for the mounted state inside the async function

    const initHashconnect = async () => {
      try {
        // console.log("LOG 1: Entering initHashconnect function.");

        // 1. Initial check
        const hasExt = !!(window as any).hashpack;
        setState((prev) => ({ ...prev, hasExtension: hasExt }));

        // 2. Create HashConnect instance
        const hashconnect = new HashConnect(true); // 'true' for debug logs
        hashconnectRef.current = hashconnect;

        // 3. Register events BEFORE init
        setUpHashConnectEvents(hashconnect, mounted);
        // console.log("LOG 4: Event listeners set up.");

        // 4. Initialize HashConnect (using environment NETWORK value)
        // console.log("LOG 5: 🚀 Calling hashconnect.init()...");

        const initData = await hashconnect.init(
          APP_METADATA,
          NETWORK as "testnet" | "mainnet" | "previewnet",
          false
        );

        if (!mounted.current) return;

        // console.log("LOG 6: ✅ HashConnect initialized.");
        setInitData(initData);
        setTopic(initData.topic);
        console.log("Topic", initData.topic);
        setPairingString(initData.pairingString);

        // 5. Try to restore previous session from savedPairings
        const pairingData = initData.savedPairings[0];

        if (pairingData && pairingData.accountIds[0]) {
          // console.log("LOG 7: Session restored from savedPairings.");
          setState((prev) => ({
            ...prev,
            connected: true,
            accountId: pairingData.accountIds[0],
            pairingData: pairingData,
          }));
          // toast.success(`Session restored: ${pairingData.accountIds[0]}`);
        }
      } catch (error) {
        console.error("LOG CATCH: ❌ HashConnect initialization error:", error);
        toast.error("Failed to initialize HashPack connection");
      } finally {
        if (mounted.current) {
          console.log("LOG FINAL: Setting isInitializing to false.");
          setState((prev) => ({ ...prev, isInitializing: false }));
        }
      }
    };

    initHashconnect();

    return () => {
      mounted.current = false;
      // Optional: Cleanup listeners if needed, though HashConnect instance is cleared on unmount
    };
  }, [setUpHashConnectEvents, NETWORK]);

  // =================================================================
  // === CONNECT & DISCONNECT  ================
  // =================================================================

  const connect = useCallback(async () => {
    if (state.connected && state.accountId) {
      toast.info("Already connected");
      return;
    }

    const hashconnect = hashconnectRef.current;
    if (!hashconnect || !topic) {
      toast.error("HashConnect not ready. Please wait...");
      return;
    }

    try {
      // 1. Trust the current state first. If it's false, perform a final, immediate check.
      const isCurrentlyDetected =
        state.hasExtension || !!(window as any).hashpack;

      // Update state if the direct check found it now
      if (isCurrentlyDetected !== state.hasExtension) {
        setState((prev) => ({ ...prev, hasExtension: isCurrentlyDetected }));
      }

      if (!isCurrentlyDetected) {
        toast.error("HashPack extension not detected...", { duration: 6000 });
        setTimeout(() => {
          window.open("https://www.hashpack.app/download", "_blank");
        }, 1000);
        return;
      }

      toast.info("Opening HashPack extension...", { duration: 3000 });
      hashconnect.connectToLocalWallet();

      toast.info("Check HashPack extension to approve connection", {
        duration: 10000,
      });
    } catch (error: any) {
      console.error("❌ Connection error:", error);
      toast.error(`Failed to connect: ${error.message || "Unknown error"}`);
    }
  }, [state.connected, state.accountId, topic, state.hasExtension]);

  const disconnect = useCallback(async () => {
    const hashconnect = hashconnectRef.current;
    if (hashconnect && topic) {
      //  clearPairings
      await hashconnect.disconnect(topic);
    }

    // Manual state cleanup (now also covered by connectionStatusChangeEvent)
    setState({
      connected: false,
      accountId: null,
      pairingData: null,
      hasExtension: state.hasExtension,
      isInitializing: false,
    });
    localStorage.removeItem(LS_KEY);
    toast.success("Disconnected from HashPack");
  }, [state.hasExtension, topic]);

  // =================================================================
  // === TRANSACTION SENDING  =================
  // =================================================================

  const sendTransaction = useCallback(
    async (transaction: Transaction): Promise<string> => {
      if (!state.connected || !state.accountId || !topic) {
        throw new Error("Wallet not connected or topic not initialized");
      }
      const hashconnect = hashconnectRef.current;
      if (!hashconnect) {
        throw new Error("HashConnect not initialized");
      }

      try {
        // makeBytes logic
        const transactionBytes = await makeBytes(transaction, state.accountId);

        const transactionObj: any = {
          // <-- Use 'any' to bypass strict type definition issue
          topic: topic,
          byteArray: transactionBytes,
          metadata: {
            accountToSign: state.accountId,
            returnTransaction: false,
            hideNft: true,
          },
        };

        // sendTransaction call
        const response = await hashconnect.sendTransaction(
          topic,
          transactionObj
        );

        if (!response?.success) {
          throw new Error(
            `Transaction failed: ${response?.error || "Unknown error"}`
          );
        }

        const responseData: any = {
          response,
          receipt: null,
        };

        // 4. Process receipt (uses fromBytes)
        // For v0.2.3, the response.receipt is often a byte array which we process
        if (response.receipt) {
          // NOTE: Client is not needed for fromBytes
          responseData.receipt = TransactionReceipt.fromBytes(
            response.receipt as Uint8Array
          );
          return (
            responseData.receipt.transactionId?.toString() ||
            transaction.transactionId?.toString() ||
            "Transaction sent successfully (ID unknown)"
          );
        }

        // Fallback for success without explicit receipt data
        return (
          transaction.transactionId?.toString() ||
          "Transaction sent successfully (ID unknown)"
        );
      } catch (error: any) {
        console.error("❌ Transaction error:", error);
        throw new Error(
          `Transaction failed: ${error.message || "Unknown error"}`
        );
      }
    },
    [state, topic, makeBytes] // makeBytes is now a dependency
  );

  // Remaining wrapper functions (sendHBAR, sendToken, associateToken, etc.) remain the same
  // as they rely on the updated sendTransaction

  // NOTE: The dAppSigner logic becomes less useful if we use the byte-based transaction flow,
  // but we keep it for compatibility if other parts of the dApp rely on it.
  const dAppSigner =
    state.pairingData && hashconnectRef.current
      ? (() => {
          const provider = hashconnectRef.current!.getProvider(
            NETWORK,
            state.pairingData.topic,
            state.accountId!
          );
          return hashconnectRef.current!.getSigner(provider);
        })()
      : null;

  // The remaining HBAR, Token, and Mirror Node functions are wrappers around
  // sendTransaction and mirror node fetching, and do not need modification.

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
    dAppSigner,
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
