/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { BrowserProvider, formatEther } from "ethers";
import { HEDERA_TESTNET } from "../lib/hederaConfig";

type MetaState = {
  available: boolean;
  connected: boolean;
  address: string | null;
  balance: string | null;
  network: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  switchToHederaTestnet: () => Promise<void>;
};

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useMetaMask(): MetaState {
  const [available, setAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  // ✅ Only check if MetaMask is available on mount (no auto-connect!)
  useEffect(() => {
    setAvailable(Boolean(window.ethereum));
  }, []);

  const fetchAccountInfo = useCallback(async (p: BrowserProvider) => {
    try {
      const signer = await p.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      setConnected(true);

      const balBig = await p.getBalance(addr);
      setBalance(formatEther(balBig));

      const net = await p.getNetwork();
      setNetwork(net.name || `chainId ${net.chainId}`);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setConnected(false);
    }
  }, []);

  const switchToHederaTestnet = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not detected.");
      return;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HEDERA_TESTNET.chainIdHex }],
      });
    } catch (switchError: any) {
      if (switchError?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: HEDERA_TESTNET.chainIdHex,
                chainName: HEDERA_TESTNET.chainName,
                nativeCurrency: HEDERA_TESTNET.nativeCurrency,
                rpcUrls: [HEDERA_TESTNET.rpcUrl],
                blockExplorerUrls: [HEDERA_TESTNET.blockExplorerUrl],
              },
            ],
          });
        } catch (addErr: any) {
          setError(
            addErr?.message ?? "Failed to add Hedera network to MetaMask"
          );
        }
      } else {
        setError(switchError?.message ?? "Failed to switch network");
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setError("MetaMask not detected. Please install MetaMask.");
      setAvailable(false);
      return;
    }
    try {
      await switchToHederaTestnet();

      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        setError("No MetaMask accounts available.");
        setConnected(false);
        return;
      }

      const p = new BrowserProvider(window.ethereum, "any");
      setProvider(p);
      await fetchAccountInfo(p);

      // ✅ set up listeners AFTER connecting
      window.ethereum.on?.("accountsChanged", (accounts: string[]) => {
        if (!accounts || accounts.length === 0) {
          disconnect();
        } else {
          fetchAccountInfo(p);
        }
      });

      window.ethereum.on?.("chainChanged", () => {
        fetchAccountInfo(p);
      });

      setError(null);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setConnected(false);
    }
  }, [fetchAccountInfo, switchToHederaTestnet]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setAddress(null);
    setBalance(null);
    setNetwork(null);
    setError(null);
    setProvider(null);
  }, []);

  return {
    available,
    connected,
    address,
    balance,
    network,
    error,
    connect,
    disconnect,
    switchToHederaTestnet,
  };
}
