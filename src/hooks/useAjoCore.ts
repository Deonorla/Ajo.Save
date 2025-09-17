/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import { ethers } from "ethers";
import AjoCore from "./../abi/ajo.json";

interface UseAjoCore {
  contract: ethers.Contract | null;
  signer: ethers.Signer | null;
  getContractStats: () => Promise<any | null>;
  joinAjo: (tokenChoice: number) => Promise<void>;
  makePayment: () => Promise<void>;
  distributePayout: () => Promise<void>;
  getMemberInfo: (memberAddress: string) => Promise<any | null>;
  needsToPayThisCycle: (memberAddress: string) => Promise<boolean | null>;
}

const useAjoCore = (): UseAjoCore => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    const init = async () => {
      if (typeof window !== "undefined" && (window as any).ethereum) {
        try {
          const provider = new ethers.BrowserProvider((window as any).ethereum);
          const _signer = await provider.getSigner();

          const contractAddress = import.meta.env
            .VITE_AJO_CORE_CONTRACT_ADDRESS;
          if (!contractAddress) {
            console.error("❌ Missing VITE_AJO_CORE_CONTRACT_ADDRESS in .env");
            return;
          }

          const _contract = new ethers.Contract(
            contractAddress,
            AjoCore.abi,
            _signer
          );

          setSigner(_signer);
          setContract(_contract);
        } catch (err) {
          console.error("Failed to init AjoCore contract:", err);
        }
      }
    };

    init();
  }, []);

  // ---------------------------
  // 🔹 Contract Read: Stats
  // ---------------------------
  const getContractStats = useCallback(async () => {
    if (!contract) return null;
    try {
      //   console.log("Contract address:", contract.target);
      //   console.log(
      //     "ABI functions:",
      //     contract.interface.fragments.map((f) => f)
      //   );

      const result = await contract.getContractStats();
      return {
        totalMembers: result.totalMembers.toString(),
        activeMembers: result.activeMembers.toString(),
        totalCollateralUSDC: result.totalCollateralUSDC.toString(),
        totalCollateralHBAR: result.totalCollateralHBAR.toString(),
        contractBalanceUSDC: result.contractBalanceUSDC.toString(),
        contractBalanceHBAR: result.contractBalanceHBAR.toString(),
        currentQueuePosition: result.currentQueuePosition.toString(),
        activeToken: result.activeToken,
      };
    } catch (err) {
      console.error("Error fetching contract stats:", err);
      return null;
    }
  }, [contract]);

  // ---------------------------
  // 🔹 Contract Write: Join Ajo
  // ---------------------------
  const joinAjo = useCallback(
    async (tokenChoice: number) => {
      if (!contract) return;
      try {
        const tx = await contract.joinAjo(tokenChoice);
        await tx.wait();
        console.log("✅ Joined Ajo with token choice:", tokenChoice);
      } catch (err) {
        console.error("Failed to join Ajo:", err);
      }
    },
    [contract]
  );

  // ---------------------------
  // 🔹 Contract Write: Make Payment
  // ---------------------------
  const makePayment = useCallback(async () => {
    if (!contract) return;
    try {
      const tx = await contract.makePayment();
      await tx.wait();
      console.log("✅ Payment successful");
    } catch (err) {
      console.error("Payment failed:", err);
    }
  }, [contract]);

  // ---------------------------
  // 🔹 Contract Write: Distribute Payout
  // ---------------------------
  const distributePayout = useCallback(async () => {
    if (!contract) return;
    try {
      const tx = await contract.distributePayout();
      await tx.wait();
      console.log("✅ Payout distributed");
    } catch (err) {
      console.error("Failed to distribute payout:", err);
    }
  }, [contract]);

  // ---------------------------
  // 🔹 Contract Read: Get Member Info
  // ---------------------------
  const getMemberInfo = useCallback(
    async (memberAddress: string) => {
      if (!contract) return null;
      try {
        const result = await contract.getMemberInfo(memberAddress);
        return result;
      } catch (err) {
        console.error("Error fetching member info:", err);
        return null;
      }
    },
    [contract]
  );

  // ---------------------------
  // 🔹 Contract Read: Needs To Pay This Cycle
  // ---------------------------
  const needsToPayThisCycle = useCallback(
    async (memberAddress: string) => {
      if (!contract) return null;
      try {
        return await contract.needsToPayThisCycle(memberAddress);
      } catch (err) {
        console.error("Error checking if member needs to pay:", err);
        return null;
      }
    },
    [contract]
  );

  return {
    contract,
    signer,
    getContractStats,
    joinAjo,
    makePayment,
    distributePayout,
    getMemberInfo,
    needsToPayThisCycle,
  };
};

export default useAjoCore;
