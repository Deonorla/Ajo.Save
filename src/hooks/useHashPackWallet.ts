/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * FINAL FIX: HashPack integration with proper session restoration
 * Compatible with hashconnect@0.2.9 and ethers@5.7.2
 */

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { HashConnect } from "hashconnect";
import type { HashConnectTypes } from "hashconnect";
import {
  TransferTransaction,
  TokenAssociateTransaction,
  TokenId,
  AccountId,
  Hbar,
  Transaction,
  TransactionId,
  TransactionReceipt,
} from "@hashgraph/sdk";
import { toast } from "sonner";
import { Buffer } from "buffer";

if (typeof (window as any).Buffer === "undefined") {
  (window as any).Buffer = Buffer;
}

// --- UTILITY FUNCTIONS ---
const randomIntFromInterval = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

const normalizeTokenIdForMirrorNode = (tokenId: string): string => {
  if (tokenId.match(/^\d+\.\d+\.\d+$/)) {
    return tokenId;
  }
  if (tokenId.startsWith("0x")) {
    try {
      const accountNum = parseInt(tokenId.slice(2), 16);
      return `0.0.${accountNum}`;
    } catch (error) {
      console.error("Failed to convert EVM token ID to Hedera format:", error);
      return tokenId;
    }
  }
  return tokenId;
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
  dAppSigner: any;

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
  const [isInitialized, setIsInitialized] = useState(false);

  const [state, setState] = useState({
    connected: false,
    accountId: null as string | null,
    pairingData: null as any,
    hasExtension: false,
    isInitializing: true,
  });

  const [topic, setTopic] = useState("");

  // =================================================================
  // === HELPER FUNCTIONS =====================
  // =================================================================

  const makeBytes = useCallback(
    async (trans: Transaction, signingAcctId: string) => {
      const transId = TransactionId.generate(signingAcctId);
      trans.setTransactionId(transId);

      let nodeId = 5;
      if (NETWORK === "testnet") {
        nodeId = randomIntFromInterval(3, 7);
      } else if (NETWORK === "mainnet") {
        nodeId = randomIntFromInterval(11, 24);
      } else if (NETWORK === "previewnet") {
        nodeId = randomIntFromInterval(1, 4);
      }

      trans.setNodeAccountIds([new AccountId(nodeId)]);
      trans.freeze();

      const transBytes = trans.toBytes();
      return transBytes;
    },
    []
  );

  // =================================================================
  // === INITIALIZATION & EVENTS =============
  // =================================================================

  const setUpHashConnectEvents = useCallback((hashconnect: HashConnect) => {
    hashconnect.foundExtensionEvent.once((data) => {
      console.log("✅ HashPack extension found");
      setState((prev) => ({ ...prev, hasExtension: true }));
    });

    hashconnect.pairingEvent.on((data) => {
      console.log("🔗 Pairing event received:", data);

      if (data.accountIds && data.accountIds.length > 0) {
        const account = data.accountIds[0];

        setState((prev) => ({
          ...prev,
          connected: true,
          accountId: account,
          pairingData: data,
        }));

        // Save session
        try {
          localStorage.setItem(
            LS_KEY,
            JSON.stringify({
              topic: data.topic,
              accountIds: data.accountIds,
              network: data.network,
            })
          );
          console.log("✅ Session saved to localStorage");
        } catch (err) {
          console.error("Failed to save session:", err);
        }

        toast.success(`Connected: ${account}`);
      }
    });

    hashconnect.transactionEvent.on((data) => {
      console.log("Transaction event:", data);
    });

    hashconnect.connectionStatusChangeEvent.on((state: any) => {
      console.log("Connection status changed:", state);
      if (state === "Disconnected" || state === 0) {
        setState((prev) => ({
          ...prev,
          connected: false,
          accountId: null,
          pairingData: null,
        }));
        localStorage.removeItem(LS_KEY);
        toast.info("Wallet disconnected.");
      }
    });
  }, []);

  // Single initialization
  useEffect(() => {
    if (isInitialized) return;

    const initHashconnect = async () => {
      try {
        console.log("🚀 Initializing HashConnect...");

        const hasExt = !!(window as any).hashpack;
        setState((prev) => ({ ...prev, hasExtension: hasExt }));

        const hashconnect = new HashConnect(true);
        hashconnectRef.current = hashconnect;

        setUpHashConnectEvents(hashconnect);

        const initData = await hashconnect.init(
          APP_METADATA,
          NETWORK as "testnet" | "mainnet" | "previewnet",
          false
        );

        console.log("✅ HashConnect initialized");
        console.log("Topic:", initData.topic);
        console.log("Saved pairings:", initData.savedPairings);

        setTopic(initData.topic);

        // 🔥 CRITICAL FIX: Restore session from savedPairings
        const savedPairing = initData.savedPairings.find(
          (p: any) => p.network === NETWORK
        );

        if (savedPairing?.accountIds?.[0]) {
          console.log("♻️ Restoring session:", savedPairing.accountIds[0]);

          setState((prev) => ({
            ...prev,
            connected: true,
            accountId: savedPairing.accountIds[0],
            pairingData: savedPairing,
          }));

          console.log("✅ Session restored successfully");
        } else {
          console.log("ℹ️ No saved session found");
        }

        setIsInitialized(true);
        setState((prev) => ({ ...prev, isInitializing: false }));
      } catch (error) {
        console.error("HashConnect initialization error:", error);
        toast.error("Failed to initialize HashPack connection");
        setState((prev) => ({ ...prev, isInitializing: false }));
      }
    };

    initHashconnect();
  }, [isInitialized, setUpHashConnectEvents]);

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
      const isCurrentlyDetected =
        state.hasExtension || !!(window as any).hashpack;

      if (!isCurrentlyDetected) {
        toast.error("HashPack extension not detected...", { duration: 6000 });
        setTimeout(() => {
          window.open("https://www.hashpack.app/download", "_blank");
        }, 1000);
        return;
      }

      toast.info("Opening HashPack extension...");
      hashconnect.connectToLocalWallet();

      toast.info("Check HashPack extension to approve connection");
    } catch (error: any) {
      console.error("Connection error:", error);
      toast.error(`Failed to connect: ${error.message || "Unknown error"}`);
    }
  }, [state.connected, state.accountId, topic, state.hasExtension]);

  const disconnect = useCallback(async () => {
    const hashconnect = hashconnectRef.current;
    if (hashconnect && topic) {
      await hashconnect.disconnect(topic);
    }

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
        const transactionBytes = await makeBytes(transaction, state.accountId);

        const transactionObj: any = {
          topic: topic,
          byteArray: transactionBytes,
          metadata: {
            accountToSign: state.accountId,
            returnTransaction: false,
            hideNft: true,
          },
        };

        const response = await hashconnect.sendTransaction(
          topic,
          transactionObj
        );

        if (!response?.success) {
          throw new Error(
            `Transaction failed: ${response?.error || "Unknown error"}`
          );
        }

        if (response.receipt) {
          const receipt: any = TransactionReceipt.fromBytes(
            response.receipt as Uint8Array
          );
          return (
            receipt.transactionId?.toString() ||
            transaction.transactionId?.toString() ||
            "Transaction sent successfully"
          );
        }

        return transaction.transactionId?.toString() || "Transaction sent";
      } catch (error: any) {
        console.error("Transaction error:", error);
        throw new Error(
          `Transaction failed: ${error.message || "Unknown error"}`
        );
      }
    },
    [state, topic, makeBytes]
  );

  // 🔥 CRITICAL FIX: Use useMemo to create stable dAppSigner reference
  // This prevents infinite re-renders and properly creates Ethers-compatible signer
  const dAppSigner = useMemo(() => {
    if (
      !state.connected ||
      !state.accountId ||
      !state.pairingData ||
      !hashconnectRef.current
    ) {
      return null;
    }

    try {
      const provider = hashconnectRef.current.getProvider(
        NETWORK,
        state.pairingData.topic,
        state.accountId
      );

      const signer = hashconnectRef.current.getSigner(provider);
      console.log("✅ dAppSigner created successfully");
      return signer;
    } catch (error) {
      console.error("Failed to create dAppSigner:", error);
      return null;
    }
  }, [state.connected, state.accountId, state.pairingData]);

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

      const hederaTokenId = normalizeTokenIdForMirrorNode(tokenId);
      console.log("Associating token:", {
        input: tokenId,
        normalized: hederaTokenId,
      });

      const tx = new TokenAssociateTransaction()
        .setAccountId(AccountId.fromString(state.accountId))
        .setTokenIds([TokenId.fromString(hederaTokenId)]);
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

      const normalizedTokenId = normalizeTokenIdForMirrorNode(tokenId);

      try {
        const url = `${MIRROR_NODE}/api/v1/accounts/${encodeURIComponent(
          state.accountId
        )}/tokens?token.id=${encodeURIComponent(normalizedTokenId)}`;

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`Mirror node token fetch failed: ${res.status}`);
        }

        const json = await res.json();

        if (json.tokens && json.tokens.length > 0) {
          const balance = String(json.tokens[0].balance ?? "0");
          return balance;
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
