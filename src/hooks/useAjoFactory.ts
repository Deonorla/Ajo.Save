/* eslint-disable @typescript-eslint/no-explicit-any */
// hooks/useAjoFactory.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import AjoFactory from "@/abi/ajoFactory.json";
import { useWallet } from "./../auth/WalletContext";
import { useAjoStore } from "@/store/ajoStore";
import { bnToString, useAjoDetailsStore } from "@/store/ajoDetailsStore";

export const useAjoFactory = () => {
  const { provider, connected } = useWallet();
  const { setAjoInfos } = useAjoStore();
  const { setAjoDetails } = useAjoDetailsStore();
  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );
  const ajoFactoryAddress = import.meta.env.VITE_AJO_FACTORY_CONTRACT_ADDRESS;

  // ---------------- CONTRACT INSTANCES ----------------
  const contractRead = useMemo(() => {
    if (!provider || !ajoFactoryAddress) return null;
    return new ethers.Contract(ajoFactoryAddress, AjoFactory.abi, provider);
  }, [ajoFactoryAddress, provider]);

  useEffect(() => {
    if (!provider || !ajoFactoryAddress) {
      setContractWrite(null);
      return;
    }
    try {
      const signer = provider.getSigner();
      const writable = new ethers.Contract(
        ajoFactoryAddress,
        AjoFactory.abi,
        signer
      );
      setContractWrite(writable);
    } catch (err) {
      console.error("useAjoFactory: failed to create write contract", err);
      setContractWrite(null);
    }
  }, [provider, ajoFactoryAddress]);

  // ---------------- READ FUNCTIONS ----------------
  const getFactoryStats = useCallback(async () => {
    if (!contractRead) return null;
    return await contractRead.getFactoryStats();
  }, [contractRead]);

  const getAllAjos = useCallback(
    async (offset = 0, limit = 20) => {
      if (!contractRead) return { ajoInfos: [], hasMore: false };

      const result = await contractRead.getAllAjos(offset, limit);

      const ajoStructs = result[0];
      const hasMore = result[1];

      // Save into store
      setAjoInfos(ajoStructs);

      return {
        ajoInfos: useAjoStore.getState().ajoInfos,
        hasMore,
      };
    },
    [contractRead]
  );

  const getAjosByCreator = useCallback(
    async (creator: string) => {
      if (!contractRead) return [];
      return await contractRead.getAjosByCreator(creator);
    },
    [contractRead]
  );

  const getAjoInfo = useCallback(
    async (ajoId: number) => {
      if (!contractRead) return null;
      const data = await contractRead.getAjo(ajoId);
    },
    [contractRead]
  );

  const getAjoStatus = useCallback(
    async (ajoId: number) => {
      if (!contractRead) return null;
      return await contractRead.ajoStatus(ajoId);
    },
    [contractRead]
  );

  const getAjoInitializationStatus = useCallback(
    async (ajoId: number) => {
      if (!contractRead) return null;
      return await contractRead.getAjoInitializationStatus(ajoId);
    },
    [contractRead]
  );

  const getAjoOperationalStatus = useCallback(
    async (ajoId: number, ajo: any): Promise<AjoOperationalStatus | null> => {
      if (!contractRead) return null;

      const status = await contractRead.getAjoOperationalStatus(ajoId);
      setAjoDetails({
        ajoId: ajoId,
        ajoCore: ajo?.ajoCore,
        totalMembers: bnToString(status.totalMembers),
        activeMembers: bnToString(status.activeMembers),
        totalCollateralUSDC: bnToString(status.totalCollateralUSDC),
        totalCollateralHBAR: bnToString(status.totalCollateralHBAR),
        contractBalanceUSDC: bnToString(status.contractBalanceUSDC),
        contractBalanceHBAR: bnToString(status.contractBalanceHBAR),
        currentCycle: bnToString(status.currentCycle),
        activeToken: String(status.activeToken),
        canAcceptMembers: status.canAcceptMembers,
        canProcessPayments: status.canProcessPayments,
        canDistributePayouts: status.canDistributePayouts,
      });
      // 🔹 Return the typed object
      return {
        totalMembers: status.totalMembers,
        activeMembers: status.activeMembers,
        totalCollateralUSDC: status.totalCollateralUSDC,
        totalCollateralHBAR: status.totalCollateralHBAR,
        contractBalanceUSDC: status.contractBalanceUSDC,
        contractBalanceHBAR: status.contractBalanceHBAR,
        currentCycle: status.currentCycle,
        activeToken: status.activeToken,
        canAcceptMembers: status.canAcceptMembers,
        canProcessPayments: status.canProcessPayments,
        canDistributePayouts: status.canDistributePayouts,
      };
    },
    [contractRead]
  );

  // ---------------- WRITE FUNCTIONS ----------------

  // Phase 1: Create Ajo and extract ID
  const createAjo = useCallback(
    async (ajoName: string) => {
      if (!contractWrite) throw new Error("Contract not ready");
      console.log("ajoName", ajoName);

      const tx = await contractWrite.createAjo(ajoName);
      const receipt = await tx.wait();
      console.log("receipt", receipt);

      // ✅ Parse AjoCreated event
      const event = receipt.events?.find((e: any) => e.event === "AjoCreated");

      if (!event) {
        throw new Error("AjoCreated event not found in logs");
      }

      const ajoId = event.args?.ajoId?.toNumber();
      console.log("🎉 Ajo created with ID:", ajoId);

      return {
        ajoId,
        receipt,
      };
    },
    [contractWrite]
  );

  // Phase 2
  const initializePhase2 = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.initializeAjoPhase2(ajoId);
      return await tx.wait();
    },
    [contractWrite]
  );

  // Phase 3
  const initializePhase3 = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.initializeAjoPhase3(ajoId);
      return await tx.wait();
    },
    [contractWrite]
  );

  // Phase 4
  const initializePhase4 = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.initializeAjoPhase4(ajoId);
      return await tx.wait();
    },
    [contractWrite]
  );

  // Finalize setup (optional last step)
  const finalizeSetup = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.finalizeAjoSetup(ajoId);
      return await tx.wait();
    },
    [contractWrite]
  );

  const deactivateAjo = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.deactivateAjo(ajoId);
      return await tx.wait();
    },
    [contractWrite]
  );

  // ---------------- RETURN HOOK ----------------
  return {
    contractWrite,
    contractRead,
    connected,
    // Read
    getFactoryStats,
    getAllAjos,
    getAjosByCreator,
    getAjoInfo,
    getAjoStatus,
    getAjoInitializationStatus,
    getAjoOperationalStatus,
    // Write
    createAjo,
    initializePhase2,
    initializePhase3,
    initializePhase4,
    finalizeSetup,
    deactivateAjo,
  };
};
