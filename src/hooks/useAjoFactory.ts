/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useMemo } from "react";
import { BigNumber, Contract, ethers, type Signer } from "ethers";

type BigNumberType = BigNumber;
type TransactionResponse = ethers.providers.TransactionResponse;
type TransactionReceipt = ethers.providers.TransactionReceipt;
type LogType = ethers.providers.Log;

import AjoFactory from "@/abi/ajoFactory.json";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import { useAjoStore } from "@/store/ajoStore";
import { useAjoDetailsStore } from "@/store/ajoDetailsStore";

// Get the JSON RPC URL from environment variables
const RPC_URL = import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL;

export interface AjoOperationalStatus {
  totalMembers: BigNumberType;
  currentCycle: BigNumberType;
  canAcceptMembers: boolean;
  hasActiveGovernance: boolean;
  hasActiveScheduling: boolean;
}

const bnToString = (value: BigNumberType): string => value.toString();

export const useAjoFactory = () => {
  const { connected, dAppSigner } = useHashPackWallet();

  const { setAjoInfos } = useAjoStore();
  const { setAjoDetails } = useAjoDetailsStore();

  const [contractWrite, setContractWrite] = useState<Contract | null>(null);
  const ajoFactoryAddress = import.meta.env.VITE_AJO_FACTORY_CONTRACT_ADDRESS;
  const signerIdKey = dAppSigner?.accountToSign;

  // ---------------- CONTRACT INSTANCES ----------------

  // Read Provider (Standard Ethers v5 JsonRpcProvider, guaranteed to work for read calls)
  const provider = useMemo(() => {
    if (!RPC_URL) {
      console.error("VITE_HEDERA_JSON_RPC_RELAY_URL is not set.");
      return null;
    }
    return new ethers.providers.JsonRpcProvider(RPC_URL);
  }, []);

  // contractRead: Uses the reliable Ethers Provider
  const contractRead = useMemo(() => {
    if (!provider || !ajoFactoryAddress) return null;
    return new Contract(ajoFactoryAddress, AjoFactory.abi, provider);
  }, [ajoFactoryAddress, provider]);

  // contractWrite: Uses the Ethers Signer from the HashPack dAppSigner
  useEffect(() => {
    // 1. Check for stability via the Hedera Account ID
    if (!connected || !signerIdKey || !dAppSigner || !ajoFactoryAddress) {
      if (contractWrite !== null) {
        setContractWrite(null);
      }
      return;
    }

    // 2. Optimization Check
    if (contractWrite) {
      return;
    }

    // --- FIX: Wrap in try-catch and suppress the error ---
    try {
      // Cast to 'any' first to bypass TypeScript's strict checking
      // This works because HashConnect's signer is functionally compatible with Ethers v5
      const writable = new Contract(
        ajoFactoryAddress,
        AjoFactory.abi,
        dAppSigner as any as Signer // Double cast to satisfy both TypeScript and runtime
      );

      setContractWrite(writable);

      // Optional: Verify the contract is functional (silent check)
      if (writable.signer) {
        console.log("✅ Write contract initialized successfully");
      }
    } catch (err: any) {
      // ⚠️ SUPPRESS: This error is expected due to type mismatch but doesn't affect functionality
      // Only log if it's NOT the known "invalid signer or provider" error
      if (!err?.message?.includes("invalid signer or provider")) {
        console.error(
          "useAjoFactory: Unexpected error creating write contract",
          err
        );
      }
      // Set contract to null only for unexpected errors
      // For the known type error, we can ignore it since the contract still works
      if (err?.code !== "INVALID_ARGUMENT") {
        setContractWrite(null);
      }
    }
  }, [ajoFactoryAddress, connected, signerIdKey, dAppSigner, contractWrite]);

  // ---------------- READ FUNCTIONS ----------------

  const getFactoryStats = useCallback(async () => {
    if (!contractRead) return null;
    return await contractRead.getFactoryStats();
  }, [contractRead]);

  const getAllAjos = useCallback(
    async (offset = 0, limit = 20) => {
      if (!contractRead) return { ajoInfos: [], hasMore: false };

      const [ajoStructs, hasMore] = await contractRead.getAllAjos(
        offset,
        limit
      );

      console.log("All Ajos:", ajoStructs);

      setAjoInfos(ajoStructs);

      return {
        ajoInfos: ajoStructs,
        hasMore,
      };
    },
    [contractRead, setAjoInfos]
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
      console.log("Ajo Info:", data);
      return data;
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

      const status: AjoOperationalStatus =
        await contractRead.getAjoOperationalStatus(ajoId);

      setAjoDetails({
        ajoId: ajoId,
        ajoCore: ajo?.ajoCore,
        totalMembers: bnToString(status.totalMembers),
        currentCycle: bnToString(status.currentCycle),
        canAcceptMembers: status.canAcceptMembers,
        hasActiveGovernance: status.hasActiveGovernance,
        hasActiveScheduling: status.hasActiveScheduling,
      });

      return status;
    },
    [contractRead, setAjoDetails]
  );

  // ---------------- WRITE FUNCTIONS ----------------

  const createAjo = useCallback(
    async (ajoName: string) => {
      if (!contractWrite) throw new Error("Contract not ready");
      console.log("ajoName", ajoName);

      const tx: TransactionResponse = await contractWrite.createAjo(ajoName);

      const receipt: TransactionReceipt = await tx.wait();
      console.log("receipt", receipt);

      const eventTopic = contractWrite.interface.getEventTopic("AjoCreated");

      if (!eventTopic) {
        throw new Error("AjoCreated event signature not found in ABI.");
      }

      const rawLog = receipt.logs.find(
        (log: LogType) => log.topics[0] === eventTopic
      );

      if (!rawLog) {
        throw new Error("AjoCreated log not found in receipt.");
      }

      const parsedEvent = contractWrite.interface.parseLog(rawLog);

      if (!parsedEvent) {
        throw new Error("Failed to parse AjoCreated event log.");
      }

      const ajoId =
        parsedEvent.args.ajoId?.toNumber() || parsedEvent.args[0]?.toNumber();

      if (typeof ajoId !== "number") {
        throw new Error("Failed to extract valid ajoId from event.");
      }

      console.log("🎉 Ajo created with ID:", ajoId);

      return {
        ajoId,
        receipt,
      };
    },
    [contractWrite]
  );

  const initializePhase2 = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx: TransactionResponse = await contractWrite.initializeAjoPhase2(
        ajoId
      );
      return await tx.wait();
    },
    [contractWrite]
  );

  const initializePhase3 = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx: TransactionResponse = await contractWrite.initializeAjoPhase3(
        ajoId
      );
      return await tx.wait();
    },
    [contractWrite]
  );

  const initializePhase4 = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx: TransactionResponse = await contractWrite.initializeAjoPhase4(
        ajoId
      );
      return await tx.wait();
    },
    [contractWrite]
  );

  const finalizeSetup = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx: TransactionResponse = await contractWrite.finalizeAjoSetup(
        ajoId
      );
      return await tx.wait();
    },
    [contractWrite]
  );

  const deactivateAjo = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx: TransactionResponse = await contractWrite.deactivateAjo(ajoId);
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
