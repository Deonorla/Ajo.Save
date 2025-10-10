/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useHashPackWallet.ts
 *
 * HashPack integration using HashConnect v0.2.3
 *
 * FIXES INCLUDED:
 * 1. SIMPLIFICATION: Removed setTimeout and the setRelay attempt, relying on a clean useEffect execution.
 * 2. CRITICAL: Fixed HashConnect.init() call to use correct positional arguments (metadata, network, singleAccount).
 * 3. Fixed 'Client' import and 'signer.client' access for compatibility.
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
  Client,
} from "@hashgraph/sdk";
import { toast } from "sonner";

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

  const [initData, setInitData] =
    useState<HashConnectTypes.InitilizationData | null>(null);

  // Initialize HashConnect
  useEffect(() => {
    let mounted = true;

    // Function to run the initialization
    const init = async () => {
      try {
        console.log("LOG 1: Entering init function.");

        // 1. Initial check (optimistic, runs before HashConnect.init)
        const hasExt = !!(window as any).hashpack;
        setState((prev) => ({ ...prev, hasExtension: hasExt }));
        console.log("LOG 2: Initial Extension check complete.", hasExt);

        // Create HashConnect instance
        const hashconnect = new HashConnect();
        hashconnectRef.current = hashconnect;
        console.log("LOG 3: HashConnect instance created.");

        // 2. Set up event listeners BEFORE init
        hashconnect.foundExtensionEvent.on((walletMetadata) => {
          console.log("🎉 Extension found event:", walletMetadata);
          if (mounted) {
            setState((prev) => ({ ...prev, hasExtension: true }));
          }
        });

        hashconnect.pairingEvent.on((pairingData) => {
          if (pairingData.accountIds && pairingData.accountIds.length > 0) {
            const account = pairingData.accountIds[0];
            if (mounted) {
              setState((prev) => ({
                ...prev,
                connected: true,
                accountId: account,
                pairingData: pairingData,
              }));
              try {
                localStorage.setItem(
                  LS_KEY,
                  JSON.stringify({
                    topic: pairingData.topic,
                    accountIds: pairingData.accountIds,
                    network: pairingData.network,
                  })
                );
              } catch (err) {
                /* no-op */
              }
              toast.success(`Connected: ${account}`);
            }
          }
        });

        console.log("LOG 4: Event listeners set up.");

        // 3. Initialize HashConnect
        console.log("LOG 5: 🚀 Calling hashconnect.init()...");

        // Final attempt with the standard positional call for v0.2.x
        const data = await hashconnect.init(APP_METADATA, "testnet", false);

        if (!mounted) return;

        console.log("LOG 6: ✅ HashConnect initialized.");
        setInitData(data); // CRITICAL: initData is set here

        // 4. Try to restore previous session
        try {
          const saved = localStorage.getItem(LS_KEY);
          if (saved) {
            const parsedSession = JSON.parse(saved);
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
          console.warn("⚠️ Failed to restore session:", err);
          localStorage.removeItem(LS_KEY);
        }
      } catch (error) {
        // This catches initialization errors
        console.error("LOG CATCH: ❌ HashConnect initialization error:", error);
        toast.error("Failed to initialize HashPack connection");
      } finally {
        if (mounted) {
          console.log("LOG FINAL: Setting isInitializing to false.");
          setState((prev) => ({ ...prev, isInitializing: false }));
        }
      }
    };

    // FIX: Call init() directly on mount (no setTimeout)
    init();

    return () => {
      mounted = false;
      // No clearTimeout needed
    };
  }, []);

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

    if (!initData) {
      // This toast will appear if the relay connection is hanging
      toast.error("HashConnect not ready. Please wait...");
      return;
    }

    try {
      const hasExt = !!(window as any).hashpack;
      setState((prev) => ({ ...prev, hasExtension: hasExt }));

      if (!hasExt) {
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
  }, [state.connected, state.accountId, initData]);

  // --- IMPLEMENTATIONS OF OTHER METHODS (omitted for brevity, they remain the same) ---

  const disconnect = useCallback(async () => {
    try {
      setState({
        connected: false,
        accountId: null,
        pairingData: null,
        hasExtension: state.hasExtension,
        isInitializing: false,
      });
      localStorage.removeItem(LS_KEY);
      toast.success("Disconnected from HashPack");
    } catch (error: any) {
      console.error("❌ Disconnect error:", error);
      toast.error("Failed to disconnect");
    }
  }, [state.hasExtension]);

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
        const provider = hashconnect.getProvider(
          NETWORK,
          state.pairingData.topic,
          state.accountId
        );
        const signer = hashconnect.getSigner(provider);
        const client: Client = (signer as any).client;
        if (!client) {
          throw new Error(
            "Failed to retrieve Hedera Client from HashPackSigner."
          );
        }
        const response = await transaction.executeWithSigner(signer);
        const receipt = await response.getReceipt(client);
        return response.transactionId.toString();
      } catch (error: any) {
        console.error("❌ Transaction error:", error);
        throw new Error(
          `Transaction failed: ${error.message || "Unknown error"}`
        );
      }
    },
    [state]
  );

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
