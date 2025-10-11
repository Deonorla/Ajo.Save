/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers, TransactionReceipt } from "ethers";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import { TokenAssociateTransaction, TokenId } from "@hashgraph/sdk";

import AjoCore from "@/abi/ajoCore.json";
import { useAjoStore } from "@/store/ajoStore";
import erc20ABI from "@/abi/erc20ABI";
import { toast } from "sonner";
import { useMemberStore } from "@/store/memberInfoStore";

export interface UseAjoCore {
  // status
  connected: boolean;
  error: string | null;

  // read
  getContractStats: () => Promise<any | null>;
  getMemberInfo: (memberAddress: string) => Promise<any | null>;
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

  // Read-only contract (Provider from HashPack's dAppSigner)
  const contractRead = useMemo(() => {
    const provider = dAppSigner?.provider;
    if (!provider || !ajoCoreAddress) return null;
    return new ethers.Contract(ajoCoreAddress, (AjoCore as any).abi, provider);
  }, [dAppSigner, ajoCoreAddress]);

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
        const res = await contractRead.getContractStats();
        return {
          totalMembers: res[0].toString(),
          activeMembers: res[1].toString(),
          totalCollateralUSDC: (res[2] / 1000000).toString(),
          totalCollateralHBAR: (res[3] / 1000000).toString(),
          contractBalanceUSDC: (res[4] / 1000000).toString(),
          contractBalanceHBAR: (res[5] / 1000000).toString(),
          currentQueuePosition: res[6].toString(),
          activeToken: Number(res[7]),
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
        const res = await contractRead.getMemberInfo(memberAddress);
        const rawMember = res[0];

        const member: MemberStruct = {
          queueNumber: rawMember.queueNumber.toString(),
          joinedCycle: rawMember.joinedCycle.toString(),
          totalPaid: (BigInt(rawMember.totalPaid) / BigInt(1000000)).toString(),
          requiredCollateral: (
            BigInt(rawMember.requiredCollateral) / BigInt(1000000)
          ).toString(),
          lockedCollateral: (
            BigInt(rawMember.lockedCollateral) / BigInt(1000000)
          ).toString(),
          lastPaymentCycle: rawMember.lastPaymentCycle.toString(),
          defaultCount: rawMember.defaultCount.toString(),
          hasReceivedPayout: rawMember.hasReceivedPayout,
          isActive: rawMember.isActive,
          guarantor: rawMember.guarantor,
          preferredToken: Number(rawMember.preferredToken),
          reputationScore: rawMember.reputationScore.toString(),
          pastPayments: Array.isArray(rawMember.pastPayments)
            ? rawMember.pastPayments.map((x: any) => x.toString())
            : [],
          guaranteePosition: rawMember.guaranteePosition.toString(),
        };

        const data: MemberInfoResponse = {
          memberInfo: member,
          pendingPenalty: BigInt(res[1]).toString(), // ✅ fixed
          effectiveVotingPower: BigInt(res[2]).toString(), // ✅ fixed
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
        // monthlyPayment is a string (we keep raw). If your contract expects uint256, pass BigNumber or string as appropriate.
        const res = await contractRead.getCollateralDemo(
          participants,
          monthlyPayment
        );
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
      const collateral = await contractRead?.getRequiredCollateralForJoin(0);
      console.log("collateral", collateral.toString());
      return collateral;
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
        // This will handle signing and submitting the SDK transaction
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
    ) => {
      if (!contractWrite || !accountId) {
        // Check for accountId instead of Ethers Signer/Address
        toast.info("Connect Wallet to participate");
        throw new Error("Wallet not connected / write contract not ready");
      }

      // --- 1. Get expected collateral (Remains the same, uses contractRead) ---
      let expectedCollateral;
      try {
        expectedCollateral = await contractRead?.getRequiredCollateralForJoin(
          tokenChoice
        );
        console.log("expectedCollateral", expectedCollateral.toString());
        const code = await dAppSigner?.getCode(tokenAddress);
        console.log("ERC20 deployed code:", code && code.length > 2);
      } catch (err) {
        console.warn(
          "getRequiredCollateralForJoin failed, fallback to tokenConfig",
          err
        );
        const tokenConfig = await contractRead?.getTokenConfig(tokenChoice);
        expectedCollateral = tokenConfig?.monthlyPayment;
      }
      if (!expectedCollateral)
        throw new Error("Could not determine collateral requirement");

      // --- 2. HTS: Associate Token (Replaces ERC-20 approval) ---
      // The contract will execute an HTS Transfer which requires prior association.
      await associateTokenIfNecessary(tokenAddress);

      // ⚠️ DELETE ERC-20 APPROVAL STEPS (Sections 2, 3, and 4 in your original code)
      // The HTS pre-compile in the smart contract handles the token transfer directly,
      // eliminating the need for allowance and approval calls.

      // --- 3. Join Ajo ---
      toast.info("Joining Ajo...");
      // Contract function is called via the Ethers Signer (dAppSigner)
      const tx = await contractWrite.joinAjo(tokenChoice);
      const receipt = await tx.wait(); // Await the Ethers transaction receipt

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

      // ⚠️ DELETE ERC-20 APPROVAL STEPS (Sections 1 & 2 in your original makePayment)
      // We assume the token is already associated from the joinAjo step.

      try {
        // send transaction
        const tx = await contractWrite.processPayment();
        toast.info("Processing payment...");

        const receipt = await tx.wait();
        if (receipt.status === 1) {
          toast.success("Monthly Payment successful!");
        } else {
          toast.error("Payment failed");
        }
      } catch (err: any) {
        console.error("makePayment error:", err);
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
      const tx = await contractWrite.distributePayout();
      const receipt = await tx.wait();

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
    // ... (rest of functions)
    // NOTE: If you need to include the original read functions, paste them back in.
  };
};

export default useAjoCore;
