/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import { HEDERA_TESTNET } from "../lib/hederaConfig";
import { toast } from "sonner";
import { useTokenStore } from "@/store/tokenStore";

type MetaState = {
  available: boolean;
  connected: boolean;
  address: string | null;
  balance: string | null;
  network: string | null;
  error: string | null;
  provider: ethers.providers.Web3Provider | null;
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
  const [provider, setProvider] =
    useState<ethers.providers.Web3Provider | null>(null);
  const { setAddress: setAddr } = useTokenStore();

  // ---------------------------
  // Fetch Account Info
  // ---------------------------
  const fetchAccountInfo = useCallback(
    async (customProvider?: ethers.providers.Web3Provider) => {
      const activeProvider = customProvider ?? provider;
      if (!activeProvider) return;

      try {
        const signer = activeProvider.getSigner();
        const addr = await signer.getAddress();
        setAddress(addr);
        setAddr(addr);
        setConnected(true);

        const balBig = await activeProvider.getBalance(addr);
        setBalance(ethers.utils.formatEther(balBig));

        const net = await activeProvider.getNetwork();
        setNetwork(mapChainIdToName(net.chainId));
        setError(null);
      } catch (err: any) {
        setError(err?.message ?? String(err));
        setConnected(false);
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    [provider]
  );

  // ---------------------------
  // Effect: Setup + Restore Session
  // ---------------------------
  useEffect(() => {
    setAvailable(Boolean(window.ethereum));
    if (window.ethereum) {
      const p = new ethers.providers.Web3Provider(window.ethereum, "any");
      setProvider(p);

      // listen for account/network changes
      window.ethereum.on?.("accountsChanged", (accounts: string[]) => {
        if (!accounts || accounts.length === 0) {
          handleDisconnect();
        } else {
          try {
            setAddress(ethers.utils.getAddress(accounts[0]));
          } catch {
            setAddress(accounts[0]);
          }
          setConnected(true);
          localStorage.setItem(STORAGE_KEY, "true");
        }
      });

      window.ethereum.on?.("chainChanged", () => {
        setTimeout(() => {
          fetchAccountInfo();
        }, 500);
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
            const p = new ethers.providers.Web3Provider(window.ethereum, "any");
            setProvider(p);
            setConnected(true);
            try {
              setAddress(ethers.utils.getAddress(accounts[0]));
            } catch {
              setAddress(accounts[0]);
            }
            await fetchAccountInfo(p); // ✅ use fresh provider immediately
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

  // ---------------------------
  // Network Switch
  // ---------------------------
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

  // ---------------------------
  // Connect
  // ---------------------------
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

      const p = new ethers.providers.Web3Provider(window.ethereum, "any");
      setProvider(p);
      console.log("New provider set", p);
      await fetchAccountInfo(p); // ✅ use fresh provider
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

  // ---------------------------
  // Disconnect
  // ---------------------------
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
    provider,
    connect,
    disconnect,
    switchToHederaTestnet,
  };
}

// ---------------------------
// Map ChainId to Network Name
// ---------------------------
function mapChainIdToName(chainId: number): string {
  switch (chainId) {
    case 295:
      return "Hedera Mainnet";
    case 296:
      return "Hedera Testnet";
    case 297:
      return "Hedera Previewnet";
    default:
      return `Chain ${chainId}`;
  }
}
