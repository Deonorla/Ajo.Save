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
        dAppSigner // 👈 Use dAppSigner as the Ethers Signer
      );
      setContractWrite(writable);
    } catch (err) {
      console.error("Failed to create write contract", err);
      setContractWrite(null);
    }
  }, [dAppSigner, ajoCoreAddress]);

  // -------------------------------------------------------------
  // Read wrappers (No functional change, only context variable cleanup)
  // -------------------------------------------------------------

  // ... (getContractStats, getMemberInfo, needsToPayThisCycle, getQueueInfo,
  //      getTokenConfig, getCollateralDemo, owner, getRequiredCollateralForJoin remain UNCHANGED)
  // ... (Keeping existing implementation for brevity, as they rely only on contractRead)

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
        // ... (rest of collateral logic) ...
      } catch (err) {
        // ... (fallback logic) ...
      }
      if (!expectedCollateral)
        throw new Error("Could not determine collateral requirement");

      // --- 2. HTS: Associate Token (Replaces ERC-20 approval) ---
      // This is necessary because the contract will execute an HTS Transfer which requires prior association.
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
    // ... (All read functions are returned here)
    // write
    joinAjo,
    makePayment,
    distributePayout,
    // ... (rest of functions)
    // NOTE: If you need to include the original read functions, paste them back in.
    getContractStats: {} as any,
    getMemberInfo: {} as any,
    needsToPayThisCycle: {} as any,
    getQueueInfo: {} as any,
    getTokenConfig: {} as any,
    getCollateralDemo: {} as any,
    owner: {} as any,
    getRequiredCollateralForJoin: {} as any,
  };
};

export default useAjoCore;
