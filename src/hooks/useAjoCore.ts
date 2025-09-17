/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import AjoCore from "./../abi/ajo.json";

interface UseAjoCore {
  contractRead: ethers.Contract | null;
  contractWrite: ethers.Contract | null;
  signer: ethers.Signer | null;
  isConnected: boolean;
  networkError: string | null;
  getContractStats: () => Promise<any | null>;
  joinAjo: (tokenChoice: number) => Promise<void>;
  makePayment: () => Promise<void>;
  distributePayout: () => Promise<void>;
  getMemberInfo: (memberAddress: string) => Promise<any | null>;
  needsToPayThisCycle: (memberAddress: string) => Promise<boolean | null>;
  reconnect: () => Promise<void>;
}

const useAjoCore = (): UseAjoCore => {
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);
  const [contractRead, setContractRead] = useState<ethers.Contract | null>(
    null
  );
  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );
  const [isConnected, setIsConnected] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // 🔹 Check if we’re on Hedera network
  const checkNetwork = async (provider: ethers.BrowserProvider) => {
    try {
      const network = await provider.getNetwork();
      console.log(
        "Connected to network:",
        network.name,
        "Chain ID:",
        network.chainId.toString()
      );

      if (network.chainId !== 296n && network.chainId !== 295n) {
        setNetworkError("Please switch to Hedera network in MetaMask");
        return false;
      }

      setNetworkError(null);
      return true;
    } catch (error) {
      console.error("Network check failed:", error);
      setNetworkError("Failed to connect to Hedera network");
      return false;
    }
  };

  // 🔹 Initialize contracts
  const init = async () => {
    if (typeof window !== "undefined" && (window as any).ethereum) {
      try {
        setNetworkError("Connecting to wallet...");

        const _provider = new ethers.BrowserProvider((window as any).ethereum);
        setProvider(_provider);

        const networkOk = await checkNetwork(_provider);
        if (!networkOk) {
          setIsConnected(false);
          return;
        }

        // Quick RPC test
        try {
          await _provider.getBlockNumber();
          console.log("✅ RPC connection successful");
        } catch (rpcError) {
          console.error("❌ RPC connection failed:", rpcError);
          setNetworkError(
            "RPC endpoint unavailable. Try switching networks in MetaMask."
          );
          setIsConnected(false);
          return;
        }

        const _signer = await _provider.getSigner();
        const address = await _signer.getAddress();
        console.log("Connected wallet address:", address);
        setSigner(_signer);

        const contractAddress = import.meta.env.VITE_AJO_CORE_CONTRACT_ADDRESS;
        if (!contractAddress) {
          console.error("❌ Missing VITE_AJO_CORE_CONTRACT_ADDRESS in .env");
          setNetworkError("Contract address not configured");
          return;
        }

        // Separate read-only (provider) and write (signer) contracts
        const _contractRead = new ethers.Contract(
          contractAddress,
          AjoCore.abi,
          _provider
        );
        const _contractWrite = new ethers.Contract(
          contractAddress,
          AjoCore.abi,
          _signer
        );

        setContractRead(_contractRead);
        setContractWrite(_contractWrite);
        setIsConnected(true);
        setNetworkError(null);

        console.log("✅ Contracts initialized:", contractAddress);
      } catch (err: any) {
        console.error("Failed to init AjoCore contract:", err);
        setNetworkError(err.message || "Failed to initialize contract");
        setIsConnected(false);
      }
    } else {
      setNetworkError("MetaMask not detected");
      setIsConnected(false);
    }
  };

  const reconnect = useCallback(async () => {
    await init();
  }, []);

  useEffect(() => {
    init();

    if ((window as any).ethereum) {
      (window as any).ethereum.on("accountsChanged", init);
      (window as any).ethereum.on("chainChanged", init);

      return () => {
        (window as any).ethereum.removeListener("accountsChanged", init);
        (window as any).ethereum.removeListener("chainChanged", init);
      };
    }
  }, []);

  // ---------------------------
  // 🔹 Contract Read: Stats
  // ---------------------------
  const getContractStats = useCallback(async () => {
    if (!contractRead) {
      console.warn("Read contract not ready");
      return null;
    }

    try {
      const result = await contractRead.getContractStats();
      console.log("✅ Stats:", result);

      return {
        totalMembers: result[0].toString(),
        activeMembers: result[1].toString(),
        totalCollateralUSDC: result[2].toString(),
        totalCollateralHBAR: result[3].toString(),
        contractBalanceUSDC: result[4].toString(),
        contractBalanceHBAR: result[5].toString(),
        currentQueuePosition: result[6].toString(),
        activeToken: result[7].toString(),
      };
    } catch (err) {
      console.error("❌ Error fetching stats:", err);
      return null;
    }
  }, [contractRead]);

  // ---------------------------
  // 🔹 Contract Write: Join Ajo
  // ---------------------------
  const joinAjo = useCallback(
    async (tokenChoice: number) => {
      if (!contractWrite) {
        console.error("Write contract not ready");
        return;
      }
      try {
        const tx = await contractWrite.joinAjo(tokenChoice);
        await tx.wait();
        console.log("✅ Joined Ajo with token choice:", tokenChoice);
      } catch (err) {
        console.error("Failed to join Ajo:", err);
        throw err;
      }
    },
    [contractWrite]
  );

  // ---------------------------
  // 🔹 Contract Write: Make Payment
  // ---------------------------
  const makePayment = useCallback(async () => {
    if (!contractWrite) {
      console.error("Write contract not ready");
      return;
    }
    try {
      const tx = await contractWrite.makePayment();
      await tx.wait();
      console.log("✅ Payment successful");
    } catch (err) {
      console.error("Payment failed:", err);
      throw err;
    }
  }, [contractWrite]);

  // ---------------------------
  // 🔹 Contract Write: Distribute Payout
  // ---------------------------
  const distributePayout = useCallback(async () => {
    if (!contractWrite) {
      console.error("Write contract not ready");
      return;
    }
    try {
      const tx = await contractWrite.distributePayout();
      await tx.wait();
      console.log("✅ Payout distributed");
    } catch (err) {
      console.error("Failed to distribute payout:", err);
      throw err;
    }
  }, [contractWrite]);

  // ---------------------------
  // 🔹 Contract Read: Get Member Info
  // ---------------------------
  const getMemberInfo = useCallback(
    async (memberAddress: string) => {
      if (!contractRead) return null;
      try {
        return await contractRead.getMemberInfo(memberAddress);
      } catch (err) {
        console.error("Error fetching member info:", err);
        return null;
      }
    },
    [contractRead]
  );

  // ---------------------------
  // 🔹 Contract Read: Needs To Pay This Cycle
  // ---------------------------
  const needsToPayThisCycle = useCallback(
    async (memberAddress: string) => {
      if (!contractRead) return null;
      try {
        return await contractRead.needsToPayThisCycle(memberAddress);
      } catch (err) {
        console.error("Error checking if member needs to pay:", err);
        return null;
      }
    },
    [contractRead]
  );

  return {
    contractRead,
    contractWrite,
    signer,
    isConnected,
    networkError,
    getContractStats,
    joinAjo,
    makePayment,
    distributePayout,
    getMemberInfo,
    needsToPayThisCycle,
    reconnect,
  };
};

export default useAjoCore;
