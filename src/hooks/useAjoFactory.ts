/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useMemo } from "react";
import { BigNumber, Contract, ethers } from "ethers";

type BigNumberType = BigNumber;
type TransactionResponse = ethers.providers.TransactionResponse;
type TransactionReceipt = ethers.providers.TransactionReceipt;
type LogType = ethers.providers.Log;

import AjoFactory from "@/abi/ajoFactory.json";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import { useAjoStore } from "@/store/ajoStore";
import { useAjoDetailsStore } from "@/store/ajoDetailsStore";

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
  const { connected, dAppSigner, accountId } = useHashPackWallet();

  const { setAjoInfos } = useAjoStore();
  const { setAjoDetails } = useAjoDetailsStore();

  const [contractWrite, setContractWrite] = useState<Contract | null>(null);
  const ajoFactoryAddress = import.meta.env.VITE_AJO_FACTORY_CONTRACT_ADDRESS;

  console.log("🔍 useAjoFactory state:", {
    connected,
    accountId,
    hasDAppSigner: !!dAppSigner,
    hasContractWrite: !!contractWrite,
    ajoFactoryAddress,
  });

  // Read Provider
  const provider = useMemo(() => {
    if (!RPC_URL) {
      console.error("VITE_HEDERA_JSON_RPC_RELAY_URL is not set.");
      return null;
    }
    return new ethers.providers.JsonRpcProvider(RPC_URL);
  }, []);

  // contractRead
  const contractRead = useMemo(() => {
    if (!provider || !ajoFactoryAddress) return null;
    return new Contract(ajoFactoryAddress, AjoFactory.abi, provider);
  }, [ajoFactoryAddress, provider]);

  // 🔥 QUICK FIX: Create a minimal Ethers-compatible wrapper
  const createCompatibleSigner = useCallback(
    (hashConnectSigner: any) => {
      if (!hashConnectSigner) return null;

      // Create a wrapper that satisfies Ethers' requirements
      const compatibleSigner = {
        ...hashConnectSigner,
        _isSigner: true, // Ethers checks for this flag

        // Ensure getAddress returns a Promise
        getAddress: async () => {
          if (typeof hashConnectSigner.getAddress === "function") {
            return await hashConnectSigner.getAddress();
          }
          if (hashConnectSigner._address) {
            return hashConnectSigner._address;
          }
          return accountId || "0x0";
        },

        // Ensure sendTransaction exists
        sendTransaction: async (tx: any) => {
          if (typeof hashConnectSigner.sendTransaction === "function") {
            return await hashConnectSigner.sendTransaction(tx);
          }
          throw new Error("sendTransaction not available");
        },

        // Attach provider if available
        provider: hashConnectSigner.provider || provider,
      };

      return compatibleSigner;
    },
    [accountId, provider]
  );

  // Create writable contract
  useEffect(() => {
    console.log("🔄 contractWrite effect triggered");

    if (!connected || !accountId || !dAppSigner || !ajoFactoryAddress) {
      console.log("⚠️ Resetting contractWrite");
      if (contractWrite) setContractWrite(null);
      return;
    }

    try {
      console.log("🏗️ Creating writable contract...");

      // Create compatible signer
      const compatibleSigner = createCompatibleSigner(dAppSigner);

      if (!compatibleSigner) {
        throw new Error("Failed to create compatible signer");
      }

      const writable = new Contract(
        ajoFactoryAddress,
        AjoFactory.abi,
        compatibleSigner as any // Type assertion needed for our wrapper
      );

      setContractWrite(writable);
      console.log("✅ contractWrite created successfully");
      console.log("Contract address:", writable.address);
    } catch (err: any) {
      console.error("❌ Failed to create write contract:", err);
      setContractWrite(null);
    }
  }, [
    connected,
    accountId,
    dAppSigner,
    ajoFactoryAddress,
    createCompatibleSigner,
    contractWrite,
  ]);

  // READ FUNCTIONS
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

      return { ajoInfos: ajoStructs, hasMore };
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

  // WRITE FUNCTIONS
  const createAjo = useCallback(
    async (
      ajoName: string,
      useHtsTokens: boolean = true,
      useScheduledPayments: boolean = true
    ) => {
      if (!contractWrite) {
        throw new Error("Contract not ready - please reconnect wallet");
      }

      console.log("✅ Creating Ajo:", {
        ajoName,
        useHtsTokens,
        useScheduledPayments,
      });

      const tx: TransactionResponse = await contractWrite.createAjo(
        ajoName,
        useHtsTokens,
        useScheduledPayments,
        { gasLimit: 1500000 }
      );

      console.log("📤 Transaction sent:", tx.hash);
      const receipt: TransactionReceipt = await tx.wait();
      console.log("✅ Transaction confirmed");

      const eventTopic = contractWrite.interface.getEventTopic("AjoCreated");
      if (!eventTopic) throw new Error("AjoCreated event not found");

      const rawLog = receipt.logs.find(
        (log: LogType) => log.topics[0] === eventTopic
      );
      if (!rawLog) throw new Error("AjoCreated log not found");

      const parsedEvent = contractWrite.interface.parseLog(rawLog);
      const ajoId =
        parsedEvent.args.ajoId?.toNumber() || parsedEvent.args[0]?.toNumber();

      if (typeof ajoId !== "number") throw new Error("Invalid ajoId");

      console.log("🎉 Ajo created with ID:", ajoId);
      return { ajoId, receipt };
    },
    [contractWrite]
  );

  const initializePhase2 = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.initializeAjoPhase2(ajoId, {
        gasLimit: 1200000,
      });
      return await tx.wait();
    },
    [contractWrite]
  );

  const initializePhase3 = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.initializeAjoPhase3(ajoId, {
        gasLimit: 1500000,
      });
      return await tx.wait();
    },
    [contractWrite]
  );

  const initializePhase4 = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.initializeAjoPhase4(ajoId, {
        gasLimit: 1800000,
      });
      return await tx.wait();
    },
    [contractWrite]
  );

  const initializePhase5 = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.initializeAjoPhase5(ajoId, {
        gasLimit: 1500000,
      });
      return await tx.wait();
    },
    [contractWrite]
  );

  const finalizeSetup = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.finalizeAjoSetup(ajoId, {
        gasLimit: 1000000,
      });
      return await tx.wait();
    },
    [contractWrite]
  );

  const deactivateAjo = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.deactivateAjo(ajoId, { gasLimit: 500000 });
      return await tx.wait();
    },
    [contractWrite]
  );

  return {
    contractWrite,
    contractRead,
    connected,
    getFactoryStats,
    getAllAjos,
    getAjosByCreator,
    getAjoInfo,
    getAjoStatus,
    getAjoInitializationStatus,
    getAjoOperationalStatus,
    createAjo,
    initializePhase2,
    initializePhase3,
    initializePhase4,
    initializePhase5,
    finalizeSetup,
    deactivateAjo,
  };
};
