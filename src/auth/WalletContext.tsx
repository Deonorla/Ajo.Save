/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { createContext, useContext } from "react";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import type { HashConnectSigner } from "hashconnect/dist/esm/provider/signer";
import type { HashConnect } from "hashconnect";

interface WalletContextType {
  // Connection state
  connected: boolean;
  accountId: string | null;
  evmAddress: string | null;
  network: string;
  hasExtension: boolean;
  isInitializing: boolean;
  dAppSigner: HashConnectSigner | null;
  topic: string;
  hashconnect: HashConnect | null;
  encryptionKey: string | null; // 🔥 NEW: Expose encryption key

  // Connection methods
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;

  // Transaction methods
  sendHBAR: (to: string, amount: number) => Promise<string>;
  sendToken: (tokenId: string, to: string, amount: number) => Promise<string>;
  associateToken: (tokenId: string) => Promise<string>;

  // Query methods
  getBalance: () => Promise<string | null>;
  getTokenBalance: (tokenId: string) => Promise<string | null>;

  // Backward compatibility aliases
  address: string | null;
  balance: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const hashpack = useHashPackWallet();
  const [balance, setBalance] = React.useState<string | null>(null);

  // Update balance when connected
  React.useEffect(() => {
    if (hashpack.connected && hashpack.accountId) {
      hashpack.getBalance().then((bal) => {
        if (bal) setBalance(bal);
      });
    } else {
      setBalance(null);
    }
  }, [hashpack.connected, hashpack.accountId]);

  // 🔥 NEW: Log encryption key on mount and when it changes
  React.useEffect(() => {
    console.log("🔑 WalletContext - Encryption Key Status:", {
      hasKey: !!hashpack.encryptionKey,
      key: hashpack.encryptionKey,
      connected: hashpack.connected,
    });
  }, [hashpack.encryptionKey, hashpack.connected]);

  const contextValue: WalletContextType = {
    connected: hashpack.connected,
    accountId: hashpack.accountId,
    evmAddress: hashpack.evmAddress,
    network: hashpack.network,
    hasExtension: hashpack.hasExtension,
    isInitializing: hashpack.isInitializing,
    connect: hashpack.connect,
    disconnect: hashpack.disconnect,
    sendHBAR: hashpack.sendHBAR,
    sendToken: hashpack.sendToken,
    associateToken: hashpack.associateToken,
    getBalance: hashpack.getBalance,
    getTokenBalance: hashpack.getTokenBalance,
    address: hashpack.evmAddress,
    balance, // cached balance
    dAppSigner: hashpack.dAppSigner,
    topic: hashpack.topic,
    hashconnect: hashpack.hashconnect,
    encryptionKey: hashpack.encryptionKey, // 🔥 NEW: Expose encryption key
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
};
