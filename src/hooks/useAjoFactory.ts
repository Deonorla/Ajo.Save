/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useEffect, useCallback, useMemo } from "react";
import { BigNumber, Contract, ethers } from "ethers";
import { Transaction, AccountId } from "@hashgraph/sdk";

type BigNumberType = BigNumber;
type TransactionResponse = ethers.providers.TransactionResponse;
type TransactionReceipt = ethers.providers.TransactionReceipt;
type LogType = ethers.providers.Log;

import AjoFactory from "@/abi/ajoFactory.json";
import { useAjoStore } from "@/store/ajoStore";
import { useAjoDetailsStore } from "@/store/ajoDetailsStore";
import { useWallet } from "@/auth/WalletContext";
import { toast } from "sonner";

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
  const { connected, dAppSigner, accountId, evmAddress, hashconnect } =
    useWallet();

  const { setAjoInfos } = useAjoStore();
  const { setAjoDetails } = useAjoDetailsStore();

  const [contractWrite, setContractWrite] = useState<Contract | null>(null);
  const ajoFactoryAddress = import.meta.env.VITE_AJO_FACTORY_CONTRACT_ADDRESS;

  console.log("🔍 useAjoFactory state (v3):", {
    connected,
    accountId,
    evmAddress,
    hasDAppSigner: !!dAppSigner,
    hasHashConnect: !!hashconnect,
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

  // For HashConnect v3, we'll use the read-only contract for queries
  // and send transactions directly via the HashConnect SDK signer
  useEffect(() => {
    console.log("🔄 contractWrite effect triggered (v3)");

    if (!connected || !evmAddress || !dAppSigner || !ajoFactoryAddress) {
      console.log("⚠️ Resetting contractWrite", {
        connected,
        evmAddress,
        hasDAppSigner: !!dAppSigner,
        ajoFactoryAddress,
      });
      if (contractWrite) setContractWrite(null);
      return;
    }

    try {
      console.log("🏗️ Setting up contract interaction (v3)...");

      // For read operations, we can use the provider-based contract
      // For write operations, we'll use the Hedera SDK signer directly
      // Store a marker that we're ready to write
      setContractWrite(contractRead);
      console.log("✅ Contract ready for operations (v3)");
    } catch (err: any) {
      console.error("❌ Failed to setup contract:", err);
      toast.error(`Failed to initialize contract: ${err.message}`);
      setContractWrite(null);
    }
  }, [connected, evmAddress, dAppSigner, ajoFactoryAddress, contractRead]);

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

  // WRITE FUNCTIONS - Using Hedera SDK approach with HashConnect v3
  const createAjo = useCallback(
    async (
      ajoName: string,
      useHtsTokens: boolean = true,
      useScheduledPayments: boolean = true
    ) => {
      if (!contractWrite || !contractRead) {
        toast.error("Contract not ready - please reconnect wallet");
        throw new Error("Contract not ready - please reconnect wallet");
      }

      if (!accountId || !hashconnect) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      console.log("✅ Creating Ajo (v3):", {
        ajoName,
        useHtsTokens,
        useScheduledPayments,
        accountId,
        evmAddress,
      });

      try {
        // Build the contract call data using ethers
        const contractInterface = new ethers.utils.Interface(AjoFactory.abi);
        const data = contractInterface.encodeFunctionData("createAjo", [
          ajoName,
          useHtsTokens,
          useScheduledPayments,
        ]);

        console.log("📝 Encoded contract call data");

        // Create a Hedera ContractExecuteTransaction
        const { ContractExecuteTransaction } = await import("@hashgraph/sdk");

        const tx = new ContractExecuteTransaction()
          .setContractId(ajoFactoryAddress)
          .setGas(1500000)
          .setFunctionParameters(Buffer.from(data.slice(2), "hex"));

        console.log("📤 Sending transaction via HashConnect v3...");
        toast.info("Transaction sent to HashPack, awaiting confirmation...");

        // Use HashConnect v3 sendTransaction - requires AccountId object
        const accountIdObj = AccountId.fromString(accountId);
        const receipt: any = await hashconnect.sendTransaction(
          accountIdObj,
          tx
        );

        console.log("✅ Transaction confirmed");
        console.log("Receipt:", receipt);

        // V3: Extract transaction ID from receipt
        const transactionId = receipt?.transactionId?.toString() || null;

        console.log("🎉 Ajo created successfully");
        toast.success("Ajo created successfully!");

        return {
          success: true,
          receipt: receipt,
          transactionId: transactionId,
        };
      } catch (error: any) {
        console.error("❌ createAjo failed:", error);
        toast.error(
          `Failed to create Ajo: ${error.message || "Unknown error"}`
        );
        throw error;
      }
    },
    [
      contractWrite,
      contractRead,
      accountId,
      evmAddress,
      hashconnect,
      ajoFactoryAddress,
    ]
  );

  const initializePhase2 = useCallback(
    async (ajoId: number) => {
      if (!contractRead || !accountId || !hashconnect) {
        throw new Error("Contract not ready or wallet not connected");
      }

      const contractInterface = new ethers.utils.Interface(AjoFactory.abi);
      const data = contractInterface.encodeFunctionData("initializeAjoPhase2", [
        ajoId,
      ]);

      const { ContractExecuteTransaction } = await import("@hashgraph/sdk");

      const tx = new ContractExecuteTransaction()
        .setContractId(ajoFactoryAddress)
        .setGas(1200000)
        .setFunctionParameters(Buffer.from(data.slice(2), "hex"));

      const accountIdObj = AccountId.fromString(accountId);
      const receipt: any = await hashconnect.sendTransaction(accountIdObj, tx);

      return receipt;
    },
    [contractRead, accountId, hashconnect, ajoFactoryAddress]
  );

  const initializePhase3 = useCallback(
    async (ajoId: number) => {
      if (!contractRead || !accountId || !hashconnect) {
        throw new Error("Contract not ready or wallet not connected");
      }

      const contractInterface = new ethers.utils.Interface(AjoFactory.abi);
      const data = contractInterface.encodeFunctionData("initializeAjoPhase3", [
        ajoId,
      ]);

      const { ContractExecuteTransaction } = await import("@hashgraph/sdk");

      const tx = new ContractExecuteTransaction()
        .setContractId(ajoFactoryAddress)
        .setGas(1500000)
        .setFunctionParameters(Buffer.from(data.slice(2), "hex"));

      const accountIdObj = AccountId.fromString(accountId);
      const receipt: any = await hashconnect.sendTransaction(accountIdObj, tx);

      return receipt;
    },
    [contractRead, accountId, hashconnect, ajoFactoryAddress]
  );

  const initializePhase4 = useCallback(
    async (ajoId: number) => {
      if (!contractRead || !accountId || !hashconnect) {
        throw new Error("Contract not ready or wallet not connected");
      }

      const contractInterface = new ethers.utils.Interface(AjoFactory.abi);
      const data = contractInterface.encodeFunctionData("initializeAjoPhase4", [
        ajoId,
      ]);

      const { ContractExecuteTransaction } = await import("@hashgraph/sdk");

      const tx = new ContractExecuteTransaction()
        .setContractId(ajoFactoryAddress)
        .setGas(1800000)
        .setFunctionParameters(Buffer.from(data.slice(2), "hex"));

      const accountIdObj = AccountId.fromString(accountId);
      const receipt: any = await hashconnect.sendTransaction(accountIdObj, tx);

      return receipt;
    },
    [contractRead, accountId, hashconnect, ajoFactoryAddress]
  );

  const initializePhase5 = useCallback(
    async (ajoId: number) => {
      if (!contractRead || !accountId || !hashconnect) {
        throw new Error("Contract not ready or wallet not connected");
      }

      const contractInterface = new ethers.utils.Interface(AjoFactory.abi);
      const data = contractInterface.encodeFunctionData("initializeAjoPhase5", [
        ajoId,
      ]);

      const { ContractExecuteTransaction } = await import("@hashgraph/sdk");

      const tx = new ContractExecuteTransaction()
        .setContractId(ajoFactoryAddress)
        .setGas(1500000)
        .setFunctionParameters(Buffer.from(data.slice(2), "hex"));

      const accountIdObj = AccountId.fromString(accountId);
      const receipt: any = await hashconnect.sendTransaction(accountIdObj, tx);

      return receipt;
    },
    [contractRead, accountId, hashconnect, ajoFactoryAddress]
  );

  const finalizeSetup = useCallback(
    async (ajoId: number) => {
      if (!contractRead || !accountId || !hashconnect) {
        throw new Error("Contract not ready or wallet not connected");
      }

      const contractInterface = new ethers.utils.Interface(AjoFactory.abi);
      const data = contractInterface.encodeFunctionData("finalizeAjoSetup", [
        ajoId,
      ]);

      const { ContractExecuteTransaction } = await import("@hashgraph/sdk");

      const tx = new ContractExecuteTransaction()
        .setContractId(ajoFactoryAddress)
        .setGas(1000000)
        .setFunctionParameters(Buffer.from(data.slice(2), "hex"));

      const accountIdObj = AccountId.fromString(accountId);
      const receipt: any = await hashconnect.sendTransaction(accountIdObj, tx);

      return receipt;
    },
    [contractRead, accountId, hashconnect, ajoFactoryAddress]
  );

  const deactivateAjo = useCallback(
    async (ajoId: number) => {
      if (!contractRead || !accountId || !hashconnect) {
        throw new Error("Contract not ready or wallet not connected");
      }

      const contractInterface = new ethers.utils.Interface(AjoFactory.abi);
      const data = contractInterface.encodeFunctionData("deactivateAjo", [
        ajoId,
      ]);

      const { ContractExecuteTransaction } = await import("@hashgraph/sdk");

      const tx = new ContractExecuteTransaction()
        .setContractId(ajoFactoryAddress)
        .setGas(500000)
        .setFunctionParameters(Buffer.from(data.slice(2), "hex"));

      const accountIdObj = AccountId.fromString(accountId);
      const receipt: any = await hashconnect.sendTransaction(accountIdObj, tx);

      return receipt;
    },
    [contractRead, accountId, hashconnect, ajoFactoryAddress]
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
