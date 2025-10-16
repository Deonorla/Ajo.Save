/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * HashPack Integration with HashConnect v3.0.13
 * Compatible with ethers@5.7.2
 * Based on official v3 API
 */

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { HashConnect, HashConnectConnectionState } from "hashconnect";
import type { SessionData } from "hashconnect";
import { LedgerId } from "@hashgraph/sdk";
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

// Convert Hedera Account ID to EVM Address
const hederaAccountToEvmAddress = (hederaAccountId: string): string => {
  try {
    const accountId = AccountId.fromString(hederaAccountId);
    const evmAddress = `0x${accountId.toSolidityAddress()}`;
    console.log(`Converted ${hederaAccountId} to EVM address: ${evmAddress}`);
    return evmAddress;
  } catch (error) {
    console.error("Failed to convert Hedera account to EVM address:", error);
    throw new Error(`Invalid Hedera account ID: ${hederaAccountId}`);
  }
};

// --- CONFIGURATION ---
const MIRROR_NODE_DEFAULT = "https://testnet.mirrornode.hedera.com";
const NETWORK = (import.meta.env.VITE_NETWORK as string) || "testnet";
const MIRROR_NODE = import.meta.env.VITE_MIRROR_NODE_URL || MIRROR_NODE_DEFAULT;
const PROJECT_ID = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "";

const APP_METADATA = {
  name: "Ajo.Save",
  description: "Blockchain-powered savings groups",
  icons: ["https://www.hedera.com/resources/images/favicon.ico"],
  url: window.location.origin,
};

const LS_KEY = "hashconnect_session_v3";

// Get LedgerId based on network
const getLedgerId = (): LedgerId => {
  switch (NETWORK.toLowerCase()) {
    case "mainnet":
      return LedgerId.MAINNET;
    case "previewnet":
      return LedgerId.PREVIEWNET;
    case "testnet":
    default:
      return LedgerId.TESTNET;
  }
};

// --- INTERFACE ---
export interface LegacyHashPackState {
  connected: boolean;
  accountId: string | null;
  evmAddress: string | null;
  network: string;
  pairingData: SessionData | null;
  hasExtension: boolean;
  isInitializing: boolean;
  dAppSigner: any;
  topic: string;
  hashconnect: HashConnect | null;
  encryptionKey: string | null;

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
    evmAddress: null as string | null,
    pairingData: null as SessionData | null,
    hasExtension: false,
    isInitializing: true,
    connectionState: HashConnectConnectionState.Disconnected,
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
    // V3: pairingEvent (not pairingApproved)
    hashconnect.pairingEvent.on((newPairing: SessionData) => {
      console.log("🔗 Pairing event received:", newPairing);

      if (newPairing.accountIds && newPairing.accountIds.length > 0) {
        const account = newPairing.accountIds[0];
        const evmAddr = hederaAccountToEvmAddress(account);

        setState((prev) => ({
          ...prev,
          connected: true,
          accountId: account,
          evmAddress: evmAddr,
          pairingData: newPairing,
          connectionState: HashConnectConnectionState.Paired,
        }));

        // Save session
        try {
          localStorage.setItem(
            LS_KEY,
            JSON.stringify({
              accountIds: newPairing.accountIds,
              network: newPairing.network,
              metadata: newPairing.metadata,
            })
          );
          console.log("✅ Session saved to localStorage");
        } catch (err) {
          console.error("Failed to save session:", err);
        }

        toast.success(`Connected: ${account}`);
      }
    });

    // V3: disconnectionEvent
    hashconnect.disconnectionEvent.on((data) => {
      console.log("Disconnection event:", data);
      setState((prev) => ({
        ...prev,
        connected: false,
        accountId: null,
        evmAddress: null,
        pairingData: null,
        connectionState: HashConnectConnectionState.Disconnected,
      }));
      localStorage.removeItem(LS_KEY);
      toast.info("Wallet disconnected.");
    });

    // V3: connectionStatusChangeEvent
    hashconnect.connectionStatusChangeEvent.on(
      (connectionStatus: HashConnectConnectionState) => {
        console.log("Connection status changed:", connectionStatus);
        setState((prev) => ({
          ...prev,
          connectionState: connectionStatus,
        }));

        if (connectionStatus === HashConnectConnectionState.Disconnected) {
          setState((prev) => ({
            ...prev,
            connected: false,
            accountId: null,
            evmAddress: null,
            pairingData: null,
          }));
        }
      }
    );
  }, []);

  // Single initialization
  useEffect(() => {
    if (isInitialized) return;

    const initHashconnect = async () => {
      try {
        console.log("🚀 Initializing HashConnect v3...");

        if (!PROJECT_ID) {
          console.error("❌ WalletConnect Project ID is required!");
          toast.error("WalletConnect Project ID not configured");
          setState((prev) => ({ ...prev, isInitializing: false }));
          return;
        }

        const hasExt = !!(window as any).hashpack;
        setState((prev) => ({ ...prev, hasExtension: hasExt }));

        // V3: Constructor: new HashConnect(ledgerId, projectId, metadata, debug)
        const hashconnect = new HashConnect(
          getLedgerId(),
          PROJECT_ID,
          APP_METADATA,
          true // debug mode
        );
        hashconnectRef.current = hashconnect;

        setUpHashConnectEvents(hashconnect);

        // V3: init() returns InitilizationData with savedPairings
        const initData: any = await hashconnect.init();

        console.log("✅ HashConnect v3 initialized");
        console.log("Init data:", initData);

        // Check for existing pairing
        let savedPairing = null;
        if (initData && Array.isArray(initData.savedPairings)) {
          savedPairing = initData.savedPairings.find(
            (p: SessionData) => p.network === NETWORK
          );
        }

        if (savedPairing?.accountIds?.[0]) {
          console.log("♻️ Restoring session:", savedPairing.accountIds[0]);

          const account = savedPairing.accountIds[0];
          const evmAddr = hederaAccountToEvmAddress(account);

          setState((prev) => ({
            ...prev,
            connected: true,
            accountId: account,
            evmAddress: evmAddr,
            pairingData: savedPairing,
            connectionState: HashConnectConnectionState.Paired,
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
    if (!hashconnect) {
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

      toast.info("Opening HashPack pairing modal...");

      // V3: openPairingModal() - can pass optional theme config
      hashconnect.openPairingModal();

      toast.info("Check HashPack to approve connection");
    } catch (error: any) {
      console.error("Connection error:", error);
      toast.error(`Failed to connect: ${error.message || "Unknown error"}`);
    }
  }, [state.connected, state.accountId, state.hasExtension]);

  const disconnect = useCallback(async () => {
    const hashconnect = hashconnectRef.current;
    if (hashconnect) {
      // V3: disconnect() with no parameters
      await hashconnect.disconnect();
    }

    setState((prev) => ({
      ...prev,
      connected: false,
      accountId: null,
      evmAddress: null,
      pairingData: null,
      connectionState: HashConnectConnectionState.Disconnected,
    }));
    localStorage.removeItem(LS_KEY);
    toast.success("Disconnected from HashPack");
  }, []);

  // =================================================================
  // === TRANSACTION SENDING  =================
  // =================================================================

  const sendTransaction = useCallback(
    async (transaction: Transaction): Promise<string> => {
      if (!state.connected || !state.accountId) {
        throw new Error("Wallet not connected");
      }
      const hashconnect = hashconnectRef.current;
      if (!hashconnect) {
        throw new Error("HashConnect not initialized");
      }

      try {
        // V3: sendTransaction(accountId, transaction) - accountId must be AccountId object
        const accountIdObj = AccountId.fromString(state.accountId);
        const receipt: any = await hashconnect.sendTransaction(
          accountIdObj,
          transaction
        );

        console.log("✅ Transaction sent, receipt:", receipt);

        // V3: Extract transaction ID from receipt
        if (receipt && receipt.transactionId) {
          return receipt.transactionId.toString();
        }

        if (transaction.transactionId) {
          return transaction.transactionId.toString();
        }

        return "Transaction sent successfully";
      } catch (error: any) {
        console.error("Transaction error:", error);
        throw new Error(
          `Transaction failed: ${error.message || "Unknown error"}`
        );
      }
    },
    [state.accountId, state.connected]
  );

  // Create stable dAppSigner using getSigner
  const dAppSigner = useMemo(() => {
    if (!state.connected || !state.accountId || !hashconnectRef.current) {
      return null;
    }

    try {
      // V3: getSigner(accountId) - returns a signer that works with SDK
      const accountIdObj = AccountId.fromString(state.accountId);
      const signer = hashconnectRef.current.getSigner(accountIdObj);

      console.log("✅ dAppSigner created successfully (v3)");

      return signer;
    } catch (error) {
      console.error("Failed to create dAppSigner:", error);
      return null;
    }
  }, [state.connected, state.accountId]);

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
    evmAddress: state.evmAddress,
    network: NETWORK,
    pairingData: state.pairingData,
    hasExtension: state.hasExtension,
    isInitializing: state.isInitializing,
    dAppSigner,
    topic, // V3 doesn't expose topic directly, but keeping for compatibility
    hashconnect: hashconnectRef.current as HashConnect | null,
    encryptionKey: null, // V3 manages this internally
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
