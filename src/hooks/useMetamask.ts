/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { BrowserProvider, formatEther, getAddress } from "ethers";
import { HEDERA_TESTNET } from "../lib/hederaConfig";
import { toast } from "sonner";

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

const STORAGE_KEY = "wallet_connected";

export function useMetaMask(): MetaState {
  const [available, setAvailable] = useState(false);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);

  useEffect(() => {
    setAvailable(Boolean(window.ethereum));
    if (window.ethereum) {
      const p = new BrowserProvider(window.ethereum, "any");
      setProvider(p);

      // listen for account/network changes
      window.ethereum.on?.("accountsChanged", (accounts: string[]) => {
        if (!accounts || accounts.length === 0) {
          handleDisconnect();
        } else {
          setAddress(getAddress(accounts[0]));
          setConnected(true);
          localStorage.setItem(STORAGE_KEY, "true");
        }
      });

      window.ethereum.on?.("chainChanged", () => {
        setTimeout(() => {
          fetchAccountInfo();
        }, 100);
      });
    }

    // try restore session on page load
    const wasConnected = localStorage.getItem(STORAGE_KEY);
    if (wasConnected && window.ethereum) {
      const restore = async () => {
        try {
          const accounts: string[] = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            setProvider(new BrowserProvider(window.ethereum, "any"));
            setConnected(true);
            setAddress(getAddress(accounts[0]));
            fetchAccountInfo();
          }
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      };
      restore();
    }

    return () => {
      try {
        window.ethereum?.removeListener?.("accountsChanged", () => {});
        window.ethereum?.removeListener?.("chainChanged", () => {});
      } catch {
        /* empty */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchAccountInfo = useCallback(async () => {
    if (!provider) return;
    try {
      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      setConnected(true);

      const balBig = await provider.getBalance(addr);
      const balance = formatEther(balBig);
      setBalance(balance);

      const net = await provider.getNetwork();
      setNetwork(net.name || `chainId ${net.chainId}`);
      setError(null);
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setConnected(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [provider]);

  const switchToHederaTestnet = useCallback(async () => {
    if (!window.ethereum) {
      toast.error(
        "MetaMask not detected. Please install MetaMask extension or use mobile MetaMask app."
      );
      setError("MetaMask not detected.");
      return;
    }
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: HEDERA_TESTNET.chainIdHex }],
      });
    } catch (switchError: any) {
      if (
        switchError?.code === 4902 ||
        /Unrecognized chain ID/i.test(String(switchError?.message ?? ""))
      ) {
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
        toast.error("Failed to switch network");
        setError(switchError?.message ?? "Failed to switch network");
      }
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      toast.error(
        "MetaMask not detected. Please install MetaMask extension or use mobile MetaMask app."
      );
      setError(
        "MetaMask not detected. Please install MetaMask extension or use mobile MetaMask app."
      );
      setAvailable(false);
      return;
    }
    try {
      await switchToHederaTestnet();

      const accounts: string[] = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts.length === 0) {
        toast.error("No MetaMask accounts available.");
        setError("No MetaMask accounts available.");
        setConnected(false);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      const p = new BrowserProvider(window.ethereum, "any");
      setProvider(p);
      await fetchAccountInfo();
      localStorage.setItem(STORAGE_KEY, "true");
      toast.success("Wallet connected");
      setError(null);
    } catch (err: any) {
      toast.error("Failed to connect wallet");
      setError(err?.message ?? String(err));
      setConnected(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [fetchAccountInfo, switchToHederaTestnet]);

  const handleDisconnect = useCallback(() => {
    setConnected(false);
    setAddress(null);
    setBalance(null);
    setNetwork(null);
    setError(null);
    toast.info("Wallet disconnected");
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const disconnect = handleDisconnect;

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
