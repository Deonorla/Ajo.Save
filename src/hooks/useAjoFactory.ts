/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * hooks/useAjoFactoryHedera.ts
 *
 * Hedera-compatible replacement for your ethers-based useAjoFactory.
 * - Reads via Mirror Node (same pattern as your AjoCore example)
 * - Writes via ContractExecuteTransaction + wallet.sendTransaction (dApp signer)
 *
 * Requirements:
 *  - @hashgraph/sdk
 *  - @hashgraph/hedera-wallet-connect (for useHederaWallet)
 *  - ethers (for ABI log parsing)
 *  - AjoFactory.json ABI in /src/abi
 */

import { useCallback } from "react";
import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractCallQuery,
  ContractId,
  Hbar,
} from "@hashgraph/sdk";
import { toast } from "sonner";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import AjoFactory from "@/abi/ajoFactory.json";
import { useAjoStore } from "@/store/ajoStore";
import { bnToString, useAjoDetailsStore } from "@/store/ajoDetailsStore";
import { Interface } from "ethers";

const DEFAULT_MIRROR_NODE =
  import.meta.env.VITE_MIRROR_NODE_URL ||
  "https://testnet.mirrornode.hedera.com";

const AJO_FACTORY_CONTRACT_ID =
  import.meta.env.VITE_AJO_FACTORY_CONTRACT_ADDRESS || ""; // must be provided

export const useAjoFactory = () => {
  const wallet = useHashPackWallet();
  const { setAjoInfos } = useAjoStore();
  const { setAjoDetails } = useAjoDetailsStore();

  if (!AJO_FACTORY_CONTRACT_ID) {
    console.warn("VITE_AJO_FACTORY_CONTRACT_ADDRESS is not set");
  }

  const abiInterface = new Interface((AjoFactory as any).abi);
  const MIRROR_NODE_URL = DEFAULT_MIRROR_NODE;

  // ---------------- MIRROR-NODE READ HELPER ----------------
  const queryContract = useCallback(
    async (functionName: string, params?: ContractFunctionParameters) => {
      try {
        // Use the same mirror-node endpoint pattern as your AjoCore example.
        const url = `${MIRROR_NODE_URL}/api/v1/contracts/${AJO_FACTORY_CONTRACT_ID}/results/${functionName}`;

        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Query failed: ${response.statusText}`);
        }
        const json = await response.json();
        return json;
      } catch (err: any) {
        console.error(`queryContract ${functionName} failed:`, err);
        toast.error(`Failed to query ${functionName}`);
        return null;
      }
    },
    [MIRROR_NODE_URL]
  );

  // ---------------- EXECUTE (WRITE) HELPER ----------------
  const executeContract = useCallback(
    async (
      functionName: string,
      params?: ContractFunctionParameters,
      payableAmount?: number,
      gas = 500_000
    ) => {
      if (!wallet.connected || !wallet.accountId) {
        throw new Error("Wallet not connected");
      }
      if (!AJO_FACTORY_CONTRACT_ID) {
        throw new Error("Factory contract id not configured");
      }

      try {
        const tx = new ContractExecuteTransaction()
          .setContractId(ContractId.fromString(AJO_FACTORY_CONTRACT_ID))
          .setGas(gas);

        if (params) tx.setFunction(functionName, params);
        else tx.setFunction(functionName);

        if (typeof payableAmount === "number") {
          tx.setPayableAmount(new Hbar(payableAmount));
        }

        // Wallet's sendTransaction should executeWithSigner internally and return a txId string
        const txId: string = await wallet.sendTransaction(tx);
        return txId;
      } catch (err: any) {
        console.error(`executeContract ${functionName} failed:`, err);
        toast.error(`Failed to execute ${functionName}`);
        throw err;
      }
    },
    [wallet]
  );

  // ---------------------
  // helper to poll mirror node transaction for logs and try to decode event AjoCreated
  // ---------------------
  const fetchAjoIdFromTx = useCallback(
    async (txId: string, timeoutMs = 15000): Promise<number | null> => {
      if (!txId) return null;

      const start = Date.now();
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

      while (Date.now() - start < timeoutMs) {
        try {
          const encoded = encodeURIComponent(txId);
          const url = `${MIRROR_NODE_URL}/api/v1/transactions/${encoded}`;
          const res = await fetch(url);
          if (res.ok) {
            const json = await res.json();
            const txs = json?.transactions ?? [];
            if (txs.length > 0) {
              const tx = txs[0];

              // Try multiple paths to find logs
              // 1) tx.contract_function_result.logs
              // 2) tx.result?.contract_function_result?.logs
              // 3) tx.logs
              // 4) tx.contract_function_result?.logs
              let logs: any[] = [];

              if (tx?.contract_function_result?.logs) {
                logs = tx.contract_function_result.logs;
              } else if (tx?.result?.contract_function_result?.logs) {
                logs = tx.result.contract_function_result.logs;
              } else if (tx?.logs) {
                logs = tx.logs;
              } else if (tx?.contract_function_result) {
                // maybe contract_function_result is object with 'logs' deeper
                if (Array.isArray(tx.contract_function_result)) {
                  logs = tx.contract_function_result;
                } else if (tx.contract_function_result.logs) {
                  logs = tx.contract_function_result.logs;
                }
              }

              if (Array.isArray(logs) && logs.length > 0) {
                for (const rawLog of logs) {
                  // rawLog may be a hex string or an object { data, topics } or { topics: [...], data: "0x..." }
                  let data: string | undefined;
                  let topics: string[] | undefined;

                  if (typeof rawLog === "string") {
                    data = rawLog;
                    topics = [];
                  } else if (rawLog && typeof rawLog === "object") {
                    data = rawLog.data ?? rawLog[0] ?? rawLog;
                    topics = rawLog.topics ?? rawLog[1] ?? [];
                  }

                  try {
                    // ethers.parseLog expects { data, topics }
                    const parsed = abiInterface.parseLog({
                      data: data ?? "0x",
                      topics: topics ?? [],
                    } as any);

                    if (parsed && parsed.name === "AjoCreated") {
                      // parsed.args may be a named object or an array-like object
                      let ajoIdArg: any = null;
                      if (parsed.args) {
                        // prefer named field if present
                        if (
                          Object.prototype.hasOwnProperty.call(
                            parsed.args,
                            "ajoId"
                          )
                        ) {
                          ajoIdArg = parsed.args.ajoId;
                        } else if (parsed.args[0] !== undefined) {
                          ajoIdArg = parsed.args[0];
                        }
                      }

                      if (ajoIdArg !== null && ajoIdArg !== undefined) {
                        // ethers BigNumber-like handling
                        const ajoId =
                          typeof ajoIdArg.toNumber === "function"
                            ? ajoIdArg.toNumber()
                            : Number(ajoIdArg);
                        if (!Number.isNaN(ajoId)) return ajoId;
                      }
                    }
                  } catch (e) {
                    // parse failed — continue to next log
                    continue;
                  }
                }
              }
            }
          }
        } catch (err) {
          // ignore and retry
        }

        await sleep(1200);
      }

      return null;
    },
    [MIRROR_NODE_URL]
  );

  // ---------------- READ FUNCTIONS ----------------

  const getFactoryStats = useCallback(async () => {
    try {
      const res = await queryContract("getFactoryStats");
      return res;
    } catch (err) {
      console.error("getFactoryStats error:", err);
      return null;
    }
  }, [queryContract]);

  const getAllAjos = useCallback(
    async (offset = 0, limit = 20) => {
      try {
        const res = await queryContract("getAllAjos");
        const ajoStructs = res ? res[0] ?? res : [];
        const hasMore = res ? res[1] ?? false : false;

        setAjoInfos(ajoStructs ?? []);

        return {
          ajoInfos: ajoStructs ?? [],
          hasMore,
        };
      } catch (err) {
        console.error("getAllAjos error:", err);
        return { ajoInfos: [], hasMore: false };
      }
    },
    [queryContract, setAjoInfos]
  );

  const getAjosByCreator = useCallback(
    async (creator: string) => {
      try {
        const params = new ContractFunctionParameters().addAddress(creator);
        const res = await queryContract("getAjosByCreator", params);
        return res ?? [];
      } catch (err) {
        console.error("getAjosByCreator error:", err);
        return [];
      }
    },
    [queryContract]
  );

  const getAjoInfo = useCallback(
    async (ajoId: number) => {
      try {
        const params = new ContractFunctionParameters().addUint256(ajoId);
        const res = await queryContract("getAjo", params);
        return res ?? null;
      } catch (err) {
        console.error("getAjo error:", err);
        return null;
      }
    },
    [queryContract]
  );

  const getAjoStatus = useCallback(
    async (ajoId: number) => {
      try {
        const params = new ContractFunctionParameters().addUint256(ajoId);
        const res = await queryContract("ajoStatus", params);
        return res ?? null;
      } catch (err) {
        console.error("getAjoStatus error:", err);
        return null;
      }
    },
    [queryContract]
  );

  const getAjoInitializationStatus = useCallback(
    async (ajoId: number) => {
      try {
        const params = new ContractFunctionParameters().addUint256(ajoId);
        const res = await queryContract("getAjoInitializationStatus", params);
        return res ?? null;
      } catch (err) {
        console.error("getAjoInitializationStatus error:", err);
        return null;
      }
    },
    [queryContract]
  );

  const getAjoOperationalStatus = useCallback(
    async (ajoId: number, ajo: any): Promise<any | null> => {
      try {
        const params = new ContractFunctionParameters().addUint256(ajoId);
        const status = await queryContract("getAjoOperationalStatus", params);

        if (!status) return null;

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

        return status;
      } catch (err) {
        console.error("getAjoOperationalStatus error:", err);
        return null;
      }
    },
    [queryContract, setAjoDetails]
  );

  // ---------------- WRITE FUNCTIONS ----------------

  const createAjo = useCallback(
    async (ajoName: string) => {
      if (!wallet.connected) throw new Error("Wallet not connected");
      try {
        const params = new ContractFunctionParameters().addString(ajoName);

        const txId = await executeContract("createAjo", params);
        toast.success("createAjo transaction submitted");

        const ajoId = await fetchAjoIdFromTx(txId);
        if (ajoId !== null) {
          toast.success(`Ajo created with ID ${ajoId}`);
        } else {
          toast.info("Ajo created — could not fetch ajoId immediately");
        }

        return { ajoId, txId };
      } catch (err: any) {
        console.error("createAjo error:", err);
        toast.error(err.message || "Failed to create Ajo");
        throw err;
      }
    },
    [wallet.connected, executeContract, fetchAjoIdFromTx]
  );

  const initializePhase2 = useCallback(
    async (ajoId: number) => {
      if (!wallet.connected) throw new Error("Wallet not connected");
      try {
        const params = new ContractFunctionParameters().addUint256(ajoId);
        const txId = await executeContract("initializeAjoPhase2", params);
        return txId;
      } catch (err: any) {
        console.error("initializePhase2 error:", err);
        throw err;
      }
    },
    [wallet.connected, executeContract]
  );

  const initializePhase3 = useCallback(
    async (ajoId: number) => {
      if (!wallet.connected) throw new Error("Wallet not connected");
      try {
        const params = new ContractFunctionParameters().addUint256(ajoId);
        const txId = await executeContract("initializeAjoPhase3", params);
        return txId;
      } catch (err: any) {
        console.error("initializePhase3 error:", err);
        throw err;
      }
    },
    [wallet.connected, executeContract]
  );

  const initializePhase4 = useCallback(
    async (ajoId: number) => {
      if (!wallet.connected) throw new Error("Wallet not connected");
      try {
        const params = new ContractFunctionParameters().addUint256(ajoId);
        const txId = await executeContract("initializeAjoPhase4", params);
        return txId;
      } catch (err: any) {
        console.error("initializePhase4 error:", err);
        throw err;
      }
    },
    [wallet.connected, executeContract]
  );

  const finalizeSetup = useCallback(
    async (ajoId: number) => {
      if (!wallet.connected) throw new Error("Wallet not connected");
      try {
        const params = new ContractFunctionParameters().addUint256(ajoId);
        const txId = await executeContract("finalizeAjoSetup", params);
        return txId;
      } catch (err: any) {
        console.error("finalizeSetup error:", err);
        throw err;
      }
    },
    [wallet.connected, executeContract]
  );

  const deactivateAjo = useCallback(
    async (ajoId: number) => {
      if (!wallet.connected) throw new Error("Wallet not connected");
      try {
        const params = new ContractFunctionParameters().addUint256(ajoId);
        const txId = await executeContract("deactivateAjo", params);
        return txId;
      } catch (err: any) {
        console.error("deactivateAjo error:", err);
        throw err;
      }
    },
    [wallet.connected, executeContract]
  );

  return {
    // read
    getFactoryStats,
    getAllAjos,
    getAjosByCreator,
    getAjoInfo,
    getAjoStatus,
    getAjoInitializationStatus,
    getAjoOperationalStatus,
    // write
    createAjo,
    initializePhase2,
    initializePhase3,
    initializePhase4,
    finalizeSetup,
    deactivateAjo,
  };
};

export default useAjoFactory;
