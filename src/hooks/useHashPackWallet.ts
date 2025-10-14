/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 *
 * HashPack integration using HashConnect v0.2.3, now using the manual
 * transaction byte generation and hashconnect.sendTransaction() from the
 * class example to bypass potential JSON-RPC relay issues.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { HashConnect } from "hashconnect";
import type { HashConnectTypes } from "hashconnect";
import type { Signer } from "ethers";
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

// ==========================================================
// 🛠️ FIX FOR: ReferenceError: Buffer is not defined
// This is required for older HashConnect versions in Vite.
// ==========================================================
import { Buffer } from "buffer";

if (typeof (window as any).Buffer === "undefined") {
  (window as any).Buffer = Buffer;
}
// ==========================================================

// --- UTILITY FUNCTIONS ---
const randomIntFromInterval = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

// Helper to convert token ID to Hedera format for Mirror Node queries
const normalizeTokenIdForMirrorNode = (tokenId: string): string => {
  // If already in Hedera format (0.0.X), return as is
  if (tokenId.match(/^\d+\.\d+\.\d+$/)) {
    return tokenId;
  }

  // If in EVM format (0x...), convert to Hedera format
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

  const [state, setState] = useState({
    connected: false,
    accountId: null as string | null,
    pairingData: null as any,
    hasExtension: false,
    isInitializing: true,
  });

  const [topic, setTopic] = useState("");
  const [pairingString, setPairingString] = useState("");
  const [initData, setInitData] =
    useState<HashConnectTypes.InitilizationData | null>(null);

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
    [NETWORK]
  );

  // =================================================================
  // === INITIALIZATION & EVENTS =============
  // =================================================================

  const setUpHashConnectEvents = useCallback(
    (hashconnect: HashConnect, mounted: React.MutableRefObject<boolean>) => {
      hashconnect.foundExtensionEvent.on((data) => {
        if (mounted.current) {
          setState((prev) => ({ ...prev, hasExtension: true }));
        }
      });

      hashconnect.pairingEvent.on((data) => {
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
        // Transaction callback
      });

      (hashconnect.connectionStatusChangeEvent.on as any)((data: number) => {
        if (data === 0) {
          if (mounted.current) {
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
  );

  useEffect(() => {
    const mounted = { current: true };

    const initHashconnect = async () => {
      try {
        const hasExt = !!(window as any).hashpack;
        setState((prev) => ({ ...prev, hasExtension: hasExt }));

        const hashconnect = new HashConnect(true);
        hashconnectRef.current = hashconnect;

        setUpHashConnectEvents(hashconnect, mounted);

        const initData = await hashconnect.init(
          APP_METADATA,
          NETWORK as "testnet" | "mainnet" | "previewnet",
          false
        );

        if (!mounted.current) return;

        setInitData(initData);
        setTopic(initData.topic);
        console.log("Topic", initData.topic);
        setPairingString(initData.pairingString);

        const pairingData = initData.savedPairings[0];

        if (pairingData && pairingData.accountIds[0]) {
          setState((prev) => ({
            ...prev,
            connected: true,
            accountId: pairingData.accountIds[0],
            pairingData: pairingData,
          }));
        }
      } catch (error) {
        console.error("HashConnect initialization error:", error);
        toast.error("Failed to initialize HashPack connection");
      } finally {
        if (mounted.current) {
          setState((prev) => ({ ...prev, isInitializing: false }));
        }
      }
    };

    initHashconnect();

    return () => {
      mounted.current = false;
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
      const isCurrentlyDetected =
        state.hasExtension || !!(window as any).hashpack;

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

        const responseData: any = {
          response,
          receipt: null,
        };

        if (response.receipt) {
          responseData.receipt = TransactionReceipt.fromBytes(
            response.receipt as Uint8Array
          );
          return (
            responseData.receipt.transactionId?.toString() ||
            transaction.transactionId?.toString() ||
            "Transaction sent successfully (ID unknown)"
          );
        }

        return (
          transaction.transactionId?.toString() ||
          "Transaction sent successfully (ID unknown)"
        );
      } catch (error: any) {
        console.error("Transaction error:", error);
        throw new Error(
          `Transaction failed: ${error.message || "Unknown error"}`
        );
      }
    },
    [state, topic, makeBytes]
  );

  const dAppSigner: Signer | null =
    state.pairingData && hashconnectRef.current
      ? (() => {
          const provider = hashconnectRef.current!.getProvider(
            NETWORK,
            state.pairingData.topic,
            state.accountId!
          );
          // Cast to 'any' first to satisfy TypeScript when converting v5 HashConnect type to v6 Ethers Signer
          return hashconnectRef.current!.getSigner(provider) as any as Signer;
        })()
      : null;

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

      // Convert EVM format to Hedera format if needed for the transaction
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

      // Normalize token ID to Hedera format for Mirror Node query
      const normalizedTokenId = normalizeTokenIdForMirrorNode(tokenId);
      console.log("Fetching token balance:", {
        input: tokenId,
        normalized: normalizedTokenId,
        account: state.accountId,
      });

      try {
        const url = `${MIRROR_NODE}/api/v1/accounts/${encodeURIComponent(
          state.accountId
        )}/tokens?token.id=${encodeURIComponent(normalizedTokenId)}`;

        console.log("Mirror Node query URL:", url);

        const res = await fetch(url);
        if (!res.ok) {
          const errorText = await res.text();
          console.error("Mirror node response error:", errorText);
          throw new Error(
            `Mirror node token fetch failed: ${res.status} ${res.statusText}`
          );
        }

        const json = await res.json();
        console.log("Mirror Node response:", json);

        if (json.tokens && json.tokens.length > 0) {
          const balance = String(json.tokens[0].balance ?? "0");
          console.log("Token balance found:", balance);
          return balance;
        }

        console.log("No token balance found, returning 0");
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
