/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback } from "react";
// 💡 V5 CORRECT FIX: Import BigNumber directly from "ethers".
import {
  BigNumber, // <-- CORRECT: BigNumber is now a direct import
  ethers,
} from "ethers";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import { TokenAssociateTransaction, TokenId } from "@hashgraph/sdk";

import AjoCore from "@/abi/ajoCore.json";
import { useAjoStore } from "@/store/ajoStore";
import erc20ABI from "@/abi/erc20ABI";
import { toast } from "sonner";
import { useMemberStore } from "@/store/memberInfoStore";

// 💡 V5 CHANGE: Alias for Ethers v5 TransactionReceipt
type TransactionReceipt = ethers.providers.TransactionReceipt;
// Get the JSON RPC URL from environment variables
const RPC_URL = import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL;

// 💡 V5 CORRECT FIX: utils is now the full object, no longer destructuring BigNumber from it.
// You can destructure other utilities if needed, or just use `utils.functionName`.
// const { getAddress } = utils;

// 💡 Define V5 BigNumber constants for common operations
const ONE_MILLION_BN = BigNumber.from(1000000);

// Assuming these structs/interfaces are defined elsewhere and need to use V5 BigNumber in their stores
interface ContractStats {
  totalMembers: string;
  activeMembers: string;
  totalCollateralUSDC: string;
  totalCollateralHBAR: string;
  contractBalanceUSDC: string;
  contractBalanceHBAR: string;
  currentQueuePosition: string;
  activeToken: number;
}
interface MemberStruct {
  queueNumber: string;
  joinedCycle: string;
  totalPaid: string;
  requiredCollateral: string;
  lockedCollateral: string;
  lastPaymentCycle: string;
  defaultCount: string;
  hasReceivedPayout: boolean;
  isActive: boolean;
  guarantor: string;
  preferredToken: number;
  reputationScore: string;
  pastPayments: string[];
  guaranteePosition: string;
}
interface MemberInfoResponse {
  memberInfo: MemberStruct;
  pendingPenalty: string;
  effectiveVotingPower: string;
}

export interface UseAjoCore {
  // status
  connected: boolean;
  error: string | null;

  // read
  getContractStats: () => Promise<ContractStats | null>; // Use the specific type
  getMemberInfo: (memberAddress: string) => Promise<MemberInfoResponse | null>; // Use the specific type
  needsToPayThisCycle: (memberAddress: string) => Promise<boolean | null>;
  getQueueInfo: (
    memberAddress: string
  ) => Promise<{ position: string; estimatedCyclesWait: string } | null>;
  getTokenConfig: (
    token: number
  ) => Promise<{ monthlyPayment: string; isActive: boolean } | null>;
  getCollateralDemo: (
    participants: number,
    monthlyPayment: string
  ) => Promise<{ positions: string[]; collaterals: string[] } | null>;
  owner: () => Promise<string | null>;
  getRequiredCollateralForJoin: () => Promise<string | null>;
  // write
  joinAjo: (
    tokenChoice: number,
    tokenAddress: string, // HTS Token ID (0.0.x) or EVM Address (0x...)
    collateralContract: string,
    paymentsContract: string
  ) => Promise<TransactionReceipt>; // returns Ethers Receipt
  makePayment: (paymentsContract: string) => Promise<void>;
  distributePayout: () => Promise<void>;
}

const useAjoCore = (ajoCoreAddress: string): UseAjoCore => {
  //  Use HashPack hook to get signer and transaction helpers
  const {
    connected,
    dAppSigner,
    accountId,
    sendTransaction, // HashPack's custom SDK transaction sender
  } = useHashPackWallet();

  // Map HashPack's status to the old interface
  const error = connected ? null : "Wallet disconnected";

  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );

  // Read Provider (Standard Ethers v5 JsonRpcProvider, guaranteed to work for read calls)
  const provider = useMemo(() => {
    if (!RPC_URL) {
      console.error("VITE_HEDERA_JSON_RPC_RELAY_URL is not set.");
      return null;
    }
    return new ethers.providers.JsonRpcProvider(RPC_URL);
  }, []);

  // Read-only contract (Provider from HashPack's dAppSigner)
  const contractRead = useMemo(() => {
    // V5: provider needs to be compatible with Ethers Provider
    if (!provider || !ajoCoreAddress) return null;
    return new ethers.Contract(ajoCoreAddress, AjoCore.abi, provider);
  }, [ajoCoreAddress, provider]);

  // Write contract (Signer from HashPack)
  useEffect(() => {
    // dAppSigner is the Ethers Signer provided by HashConnect
    if (!dAppSigner || !ajoCoreAddress) {
      setContractWrite(null);
      return;
    }
    try {
      const writable = new ethers.Contract(
        ajoCoreAddress,
        (AjoCore as any).abi,
        dAppSigner // dAppSigner as the Ethers Signer
      );
      setContractWrite(writable);
    } catch (err) {
      console.error("Failed to create write contract", err);
      setContractWrite(null);
    }
  }, [dAppSigner, ajoCoreAddress]);

  // -------------------------------------------------------------
  // Read wrappers
  // -------------------------------------------------------------

  const getContractStats =
    useCallback(async (): Promise<ContractStats | null> => {
      if (!contractRead) return null;
      try {
        // V5 returns BigNumber objects in the result array
        const res = await contractRead.getContractStats();
        console.log("Contract Stats:", res);
        return {
          totalMembers: res[0].toString(),
          activeMembers: res[1].toString(),
          // 💡 V5 CHANGE: Use .div() for BigNumber division
          totalCollateralUSDC: res[2].div(ONE_MILLION_BN).toString(),
          totalCollateralHBAR: res[3].div(ONE_MILLION_BN).toString(),
          contractBalanceUSDC: res[4].div(ONE_MILLION_BN).toString(),
          contractBalanceHBAR: res[5].div(ONE_MILLION_BN).toString(),
          currentQueuePosition: res[6].toString(),
          activeToken: res[7], // Use toNumber() on BigNumber
        };
      } catch (err) {
        console.error("getContractStats error:", err);
        return null;
      }
    }, [contractRead]);

  const getMemberInfo = useCallback(
    async (memberAddress: string): Promise<MemberInfoResponse | null> => {
      if (!contractRead) return null;
      const { setMemberData, setLoading, setError } = useMemberStore.getState();

      setLoading(true);
      try {
        // V5 returns BigNumber objects
        const res = await contractRead.getMemberInfo(memberAddress);
        const rawMember = res[0];

        // 💡 V5 CHANGE: Replace BigInt and native division with BigNumber methods
        const member: MemberStruct = {
          queueNumber: rawMember.queueNumber.toString(),
          joinedCycle: rawMember.joinedCycle.toString(),
          totalPaid: rawMember.totalPaid.div(ONE_MILLION_BN).toString(),
          requiredCollateral: rawMember.requiredCollateral
            .div(ONE_MILLION_BN)
            .toString(),
          lockedCollateral: rawMember.lockedCollateral
            .div(ONE_MILLION_BN)
            .toString(),
          lastPaymentCycle: rawMember.lastPaymentCycle.toString(),
          defaultCount: rawMember.defaultCount.toString(),
          hasReceivedPayout: rawMember.hasReceivedPayout,
          isActive: rawMember.isActive,
          guarantor: rawMember.guarantor,
          preferredToken: rawMember.preferredToken, // Ensure it's a number
          reputationScore: rawMember.reputationScore.toString(),
          pastPayments: Array.isArray(rawMember.pastPayments)
            ? rawMember.pastPayments.map((x: any) => x.toString())
            : [],
          guaranteePosition: rawMember.guaranteePosition.toString(),
        };

        const data: MemberInfoResponse = {
          memberInfo: member,
          // 💡 V5 CHANGE: Convert BigNumber to string
          pendingPenalty: res[1].toString(),
          effectiveVotingPower: res[2].toString(),
        };

        setMemberData(data);
        setLoading(false);
        return data;
      } catch (err: any) {
        console.error("getMemberInfo error:", err);
        setError(err.message);
        setLoading(false);
        return null;
      }
    },
    [contractRead]
  );

  const needsToPayThisCycle = useCallback(
    async (memberAddress: string): Promise<boolean | null> => {
      if (!contractRead) return null;
      const { setNeedsToPay } = useMemberStore.getState();
      try {
        const data = await contractRead.needsToPayThisCycle(memberAddress);
        setNeedsToPay(data);
        return data;
      } catch (err) {
        console.error("needsToPayThisCycle error:", err);
        return null;
      }
    },
    [contractRead]
  );

  const getQueueInfo = useCallback(
    async (
      memberAddress: string
    ): Promise<{ position: string; estimatedCyclesWait: string } | null> => {
      if (!contractRead) return null;
      const { setQueueInfo } = useMemberStore.getState();
      try {
        const res = await contractRead.getQueueInfo(memberAddress);
        // V5: res[0] and res[1] are BigNumber
        const info = {
          position: res[0].toString(),
          estimatedCyclesWait: res[1].toString(),
        };
        // console.log("QueueInfo:", info);
        setQueueInfo(info);
        return info;
      } catch (err) {
        console.error("getQueueInfo error:", err);
        return null;
      }
    },
    [contractRead]
  );

  const getTokenConfig = useCallback(
    async (
      token: number
    ): Promise<{ monthlyPayment: string; isActive: boolean } | null> => {
      if (!contractRead) return null;
      const { setTokenConfig } = useMemberStore.getState();
      try {
        const res = await contractRead.getTokenConfig(token);
        // V5: res[0] is BigNumber
        const config = {
          monthlyPayment: res[0].toString(),
          isActive: Boolean(res[1]),
        };
        console.log("TokenConfig:", config);
        setTokenConfig(config);
        return config;
      } catch (err) {
        console.error("getTokenConfig error:", err);
        return null;
      }
    },
    [contractRead]
  );

  const getCollateralDemo = useCallback(
    async (
      participants: number,
      monthlyPayment: string
    ): Promise<{ positions: string[]; collaterals: string[] } | null> => {
      if (!contractRead) return null;
      try {
        // V5: Input 'monthlyPayment' should be handled as BigNumberish if necessary
        const res = await contractRead.getCollateralDemo(
          participants,
          monthlyPayment
        );
        // V5: res[0] and res[1] are arrays of BigNumber
        const positions = Array.isArray(res[0])
          ? res[0].map((p: any) => p.toString())
          : [];
        const collaterals = Array.isArray(res[1])
          ? res[1].map((c: any) => c.toString())
          : [];
        return { positions, collaterals };
      } catch (err) {
        console.error("getCollateralDemo error:", err);
        return null;
      }
    },
    [contractRead]
  );

  const owner = useCallback(async (): Promise<string | null> => {
    if (!contractRead) return null;
    try {
      return await contractRead.owner();
    } catch (err) {
      console.error("owner() error:", err);
      return null;
    }
  }, [contractRead]);

  const getRequiredCollateralForJoin = useCallback(async (): Promise<
    string | null
  > => {
    if (!contractRead) return null;
    try {
      // Assuming 'getRequiredCollateralForJoin' takes a token ID (0)
      const collateral = await contractRead.getRequiredCollateralForJoin(0);
      // V5: collateral is BigNumber
      console.log("collateral", collateral.toString());
      return collateral.toString(); // Return as string as per interface
    } catch (err) {
      console.error("getRequiredCollateralForJoin failed", err);
      return null;
    }
  }, [contractRead]);

  // -------------------------------------------------------------
  // Write wrappers (HTS Token Logic is the major change)
  // -------------------------------------------------------------

  // Helper function to check/perform Token Association
  const associateTokenIfNecessary = useCallback(
    async (tokenAddress: string) => {
      if (!accountId || !tokenAddress) return;

      const tokenId = TokenId.fromString(tokenAddress);

      toast.info("Checking token association status...");

      try {
        // 1. Construct HTS Association Transaction
        const associateTx = new TokenAssociateTransaction()
          .setAccountId(accountId)
          .setTokenIds([tokenId]);

        // 2. Send the HTS Transaction using the HashPack helper
        await sendTransaction(associateTx);

        toast.success("Token associated successfully");
      } catch (err: any) {
        // Handle the common error case: token is already associated
        if (err.message.includes("TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT")) {
          toast.info("Token already associated.");
        } else {
          console.error("Token association failed", err);
          toast.error(`Token association failed: ${err.message}`);
          throw err;
        }
      }
    },
    [accountId, sendTransaction]
  );

  const joinAjo = useCallback(
    async (
      tokenChoice: number,
      tokenAddress: string, // HTS Token ID (0.0.x) or EVM Address (0x...)
      collateralContract: string,
      paymentsContract: string
    ): Promise<TransactionReceipt> => {
      // V5 Type
      if (!contractWrite || !accountId) {
        toast.info("Connect Wallet to participate");
        throw new Error("Wallet not connected / write contract not ready");
      }

      // --- 1. Get expected collateral (Remains the same, uses contractRead) ---
      let expectedCollateral: BigNumber | undefined;
      try {
        // V5 returns BigNumber
        expectedCollateral = await contractRead?.getRequiredCollateralForJoin(
          tokenChoice
        );
        // V5: Use toHexString() or toString() for console output
        console.log("expectedCollateral", expectedCollateral?.toHexString());
        const code = await dAppSigner?.provider.getCode(tokenAddress); // V5 provider method
        console.log("ERC20 deployed code:", code && code.length > 2);
      } catch (err) {
        console.warn(
          "getRequiredCollateralForJoin failed, fallback to tokenConfig",
          err
        );
        const tokenConfig = await contractRead?.getTokenConfig(tokenChoice);
        // Fallback result will be a string, convert to BigNumber for safety
        expectedCollateral = tokenConfig?.monthlyPayment
          ? BigNumber.from(tokenConfig.monthlyPayment)
          : undefined;
      }
      if (!expectedCollateral)
        throw new Error("Could not determine collateral requirement");

      // --- 2. HTS: Associate Token ---
      await associateTokenIfNecessary(tokenAddress);

      // --- 3. Join Ajo ---
      toast.info("Joining Ajo...");
      // V5: tx is a TransactionResponse
      const tx = await contractWrite.joinAjo(tokenChoice);
      const receipt = await tx.wait(); // V5: tx.wait() returns TransactionReceipt

      console.log("🎉 Joined Ajo, tx hash:", receipt.transactionHash);
      return receipt;
    },
    [contractWrite, contractRead, accountId, associateTokenIfNecessary] // Added associateTokenIfNecessary dependency
  );

  const makePayment = useCallback(
    async (paymentsContract: string): Promise<void> => {
      if (!contractWrite || !accountId) {
        toast.error("Wallet not connected or contract not ready");
        return;
      }

      try {
        // send transaction
        const tx = await contractWrite.processPayment(); // V5: tx is a TransactionResponse
        toast.info("Processing payment...");

        const receipt = await tx.wait(); // V5: tx.wait() returns TransactionReceipt
        if (receipt.status === 1) {
          toast.success("Monthly Payment successful!");
        } else {
          toast.error("Payment failed");
        }
      } catch (err: any) {
        console.error("makePayment error:", err);
        // V5 error handling often uses 'error.reason' or 'error.message'
        toast.error(err?.reason || err?.message || "Payment failed");
      }
    },
    [contractWrite, accountId]
  );

  const distributePayout = useCallback(async () => {
    if (!contractWrite) {
      toast.error("Wallet not connected / write contract not ready");
      return;
    }

    try {
      const tx = await contractWrite.distributePayout(); // V5: tx is a TransactionResponse
      const receipt = await tx.wait(); // V5: tx.wait() returns TransactionReceipt

      if (receipt.status === 1) {
        toast.success("Cycle Ajo distribution successful!");
      } else {
        toast.error("Distribution failed");
      }
    } catch (err: any) {
      console.error("distributePayout error:", err);

      const errorMessage =
        err?.reason || err?.data?.message || err?.message || "";

      if (
        errorMessage.includes("transfer amount exceeds balance") ||
        errorMessage.includes("UNPREDICTABLE_GAS_LIMIT")
      ) {
        toast.error(
          "You can only request for a payout when the whole team has paid this month cycle"
        );
      } else {
        toast.error("Distribution failed, please try again");
      }
    }
  }, [contractWrite]);

  // -------------------------------------------------------------
  // Return the hook object
  // -------------------------------------------------------------

  return {
    connected,
    error,
    // read
    getContractStats,
    getMemberInfo,
    needsToPayThisCycle,
    getQueueInfo,
    getTokenConfig,
    getCollateralDemo,
    owner,
    getRequiredCollateralForJoin,
    // write
    joinAjo,
    makePayment,
    distributePayout,
  };
};

export default useAjoCore;
