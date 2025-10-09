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
  // Fetch Account Info with Retry
  // ---------------------------
  const fetchAccountInfo = useCallback(
    async (customProvider?: ethers.providers.Web3Provider, retries = 3) => {
      const activeProvider = customProvider ?? provider;
      if (!activeProvider) return;

      for (let attempt = 0; attempt < retries; attempt++) {
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
          return; // Success, exit retry loop
        } catch (err: any) {
          console.error(`Attempt ${attempt + 1} failed:`, err);

          // If circuit breaker error, wait before retry
          if (err?.code === -32603 && attempt < retries - 1) {
            await new Promise((resolve) =>
              setTimeout(resolve, 2000 * (attempt + 1))
            );
            continue;
          }

          // Final attempt failed
          if (attempt === retries - 1) {
            setError(err?.message ?? String(err));
            setConnected(false);
            localStorage.removeItem(STORAGE_KEY);
            toast.error(
              "Failed to fetch account info. Please try reconnecting."
            );
          }
        }
      }
    },
    [provider, setAddr]
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
        }, 1000); // Increased delay
      });

      window.ethereum.on?.("disconnect", () => {
        handleDisconnect();
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
              setAddr(ethers.utils.getAddress(accounts[0]));
            } catch {
              setAddress(accounts[0]);
              setAddr(accounts[0]);
            }
            // Delay fetching to avoid circuit breaker on load
            setTimeout(() => {
              fetchAccountInfo(p);
            }, 1500);
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
        window.ethereum?.removeListener?.("disconnect", () => {});
      } catch {
        /* empty */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------
  // Network Switch with Better Error Handling
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

      // Wait for network switch to complete
      await new Promise((resolve) => setTimeout(resolve, 1000));
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

          // Wait for network to be added
          await new Promise((resolve) => setTimeout(resolve, 1500));
        } catch (addErr: any) {
          toast.error("Failed to add Hedera network");
          setError(
            addErr?.message ?? "Failed to add Hedera network to MetaMask"
          );
          throw addErr;
        }
      } else if (switchError?.code === 4001) {
        // User rejected
        toast.info("Network switch cancelled");
        throw switchError;
      } else {
        toast.error("Failed to switch network");
        setError(switchError?.message ?? "Failed to switch network");
        throw switchError;
      }
    }
  }, []);

  // ---------------------------
  // Connect with Better Flow
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
      // First request accounts
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

      // Set basic connection state first
      const addr = ethers.utils.getAddress(accounts[0]);
      setAddress(addr);
      setAddr(addr);
      setConnected(true);
      localStorage.setItem(STORAGE_KEY, "true");

      // Create provider
      const p = new ethers.providers.Web3Provider(window.ethereum, "any");
      setProvider(p);

      // Check if we need to switch network
      const currentNetwork = await p.getNetwork();
      if (currentNetwork.chainId !== HEDERA_TESTNET.chainIdDecimal) {
        toast.info("Switching to Hedera Testnet...");
        await switchToHederaTestnet();
      }

      // Fetch full account info with delay
      setTimeout(() => {
        fetchAccountInfo(p);
      }, 1000);

      toast.success("Wallet connected");
      setError(null);
    } catch (err: any) {
      console.error("Connect error:", err);

      if (err?.code === 4001) {
        toast.info("Connection cancelled");
      } else if (err?.code === -32603) {
        toast.error("Network connection issue. Please try again in a moment.");
      } else {
        toast.error("Failed to connect wallet");
      }

      setError(err?.message ?? String(err));
      setConnected(false);
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [fetchAccountInfo, switchToHederaTestnet, setAddr]);

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
