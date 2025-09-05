import React, { createContext, useContext } from "react";
import { useMetaMask } from "../hooks/useMetamask";

interface WalletContextType {
  connectMetaMask: () => Promise<void>;
  disconnect: () => void;
  address: string | null;
  balance: string | null;
  network: string | null;
  connected: boolean;
  error: string | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const meta = useMetaMask();

  return (
    <WalletContext.Provider
      value={{
        connectMetaMask: meta.connect,
        disconnect: meta.disconnect,
        address: meta.address,
        balance: meta.balance,
        network: meta.network,
        connected: meta.connected,
        error: meta.error,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used inside WalletProvider");
  return ctx;
};
