/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers, TransactionReceipt } from "ethers";
import AjoFactory from "@/abi/ajoFactory.json";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import { useAjoStore } from "@/store/ajoStore";
import { bnToString, useAjoDetailsStore } from "@/store/ajoDetailsStore";

// NOTE: Assuming AjoOperationalStatus is defined or aliased elsewhere
type AjoOperationalStatus = any;

export const useAjoFactory = () => {
  const { connected, dAppSigner } = useHashPackWallet();

  const { setAjoInfos } = useAjoStore();
  const { setAjoDetails } = useAjoDetailsStore();

  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );
  const ajoFactoryAddress = import.meta.env.VITE_AJO_FACTORY_CONTRACT_ADDRESS;

  // ---------------- CONTRACT INSTANCES ----------------

  // contractRead: Uses the Ethers Provider from the HashPack dAppSigner
  const contractRead = useMemo(() => {
    const provider = dAppSigner?.provider; // Get Provider from HashPack Signer
    if (!provider || !ajoFactoryAddress) return null;
    return new ethers.Contract(ajoFactoryAddress, AjoFactory.abi, provider);
  }, [ajoFactoryAddress, dAppSigner]); // 👈 Depend on dAppSigner

  // contractWrite: Uses the Ethers Signer from the HashPack dAppSigner
  useEffect(() => {
    // dAppSigner is the Ethers Signer provided by HashConnect
    if (!dAppSigner || !ajoFactoryAddress) {
      setContractWrite(null);
      return;
    }
    try {
      // dAppSigner is used directly as the Signer/Wallet
      const writable = new ethers.Contract(
        ajoFactoryAddress,
        AjoFactory.abi,
        dAppSigner
      );
      setContractWrite(writable);
    } catch (err) {
      console.error("useAjoFactory: failed to create write contract", err);
      setContractWrite(null);
    }
  }, [dAppSigner, ajoFactoryAddress]); // 👈 Depend on dAppSigner

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
      console.log("All Ajos:", ajoStructs);
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
      // NOTE: data is currently unused but fetch successful
      console.log("Ajo Info:", data);
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
    [contractRead, setAjoDetails] // Added setAjoDetails dependency for completeness
  );

  // ---------------- WRITE FUNCTIONS ----------------
  // All write functions are UNCHANGED as they rely only on contractWrite (now using dAppSigner)

  // Phase 1: Create Ajo and extract ID
  const createAjo = useCallback(
    async (ajoName: string) => {
      if (!contractWrite) throw new Error("Contract not ready");
      console.log("ajoName", ajoName);

      const tx = await contractWrite.createAjo(ajoName);

      // Use TransactionReceipt from ethers v6 directly
      const receipt: TransactionReceipt = await tx.wait();
      console.log("receipt", receipt);

      // --- FIX: Decode the Log using the Contract's Interface ---

      // Find the raw log entry (now in receipt.logs)
      // need to manually check the topic to find the event signature.
      // A way is to loop or filter the logs.

      // Find the AjoCreated event signature (topic)
      const eventTopic =
        contractWrite.interface.getEvent("AjoCreated")?.topicHash;

      if (!eventTopic) {
        throw new Error("AjoCreated event signature not found in ABI.");
      }

      const rawLog = receipt.logs.find(
        (log: any) => log.topics[0] === eventTopic
      );

      if (!rawLog) {
        throw new Error("AjoCreated log not found in receipt.");
      }

      // 2. Decode the raw log to get the arguments
      // Use the writable contract's interface to parse the raw log object.
      const parsedEvent = contractWrite.interface.parseLog(rawLog);

      if (!parsedEvent) {
        throw new Error("Failed to parse AjoCreated event log.");
      }

      // 3. Access arguments via parsedEvent.args
      const ajoId =
        parsedEvent.args[0]?.toNumber() || parsedEvent.args.ajoId?.toNumber(); // Access by index (0) or name
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
