/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "./../auth/WalletContext";
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
  getContractStats: () => Promise<ContractStats | null>;
  getMemberInfo: (memberAddress: string) => Promise<MemberInfoResponse | null>;
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
    tokenAddress: string,
    collateralContract: string,
    paymentsContract: string
  ) => Promise<ethers.providers.TransactionReceipt>;
  makePayment: () => Promise<void>;
  distributePayout: () => Promise<void>;
}

const useAjoCore = (ajoCoreAddress: string): UseAjoCore => {
  // const { setStats } = useAjoStore();
  const ajoAddress = import.meta.env.VITE_AJO_CORE_CONTRACT_ADDRESS;

  const { provider, connected, error } = useWallet();
  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );

  // read-only contract (provider)
  const contractRead = useMemo(() => {
    if (!provider || !ajoCoreAddress) return null;
    return new ethers.Contract(ajoCoreAddress, (AjoCore as any).abi, provider);
  }, [provider, ajoCoreAddress]);

  useEffect(() => {
    if (!provider || !ajoCoreAddress) {
      setContractWrite(null);
      return;
    }
    try {
      const signer = provider.getSigner();
      const writable = new ethers.Contract(
        ajoCoreAddress,
        (AjoCore as any).abi,
        signer
      );
      setContractWrite(writable);
    } catch (err) {
      console.error("Failed to create write contract", err);
      setContractWrite(null);
    }
  }, [provider, ajoCoreAddress]);

  // ---------------------------
  // Read wrappers
  // ---------------------------
  const getContractStats =
    useCallback(async (): Promise<ContractStats | null> => {
      if (!contractRead) return null;
      try {
        const res = await contractRead.getContractStats();
        // setStats({
        //   totalMembers: res[0].toString(),
        //   activeMembers: res[1].toString(),
        //   totalCollateralUSDC: (res[2] / 1000000).toString(),
        //   totalCollateralHBAR: (res[3] / 1000000).toString(),
        //   contractBalanceUSDC: (res[4] / 1000000).toString(),
        //   contractBalanceHBAR: (res[5] / 1000000).toString(),
        //   currentQueuePosition: res[6].toString(),
        //   activeToken: Number(res[7]),
        // });
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

  // ---------------------------
  // Write wrappers
  // ---------------------------
  const joinAjo = useCallback(
    async (
      tokenChoice: number,
      tokenAddress: string,
      collateralContract: string,
      paymentsContract: string
    ) => {
      if (!contractWrite) {
        toast.info("Connect Wallet to participate");
        throw new Error("Wallet not connected / write contract not ready");
      }

      // signer & user address (ethers v5)
      const signer = provider?.getSigner();
      const userAddress = signer ? await signer.getAddress() : null;
      if (!signer || !userAddress)
        throw new Error("Could not get signer or user address");

      // --- 1. Get expected collateral ---
      let expectedCollateral;
      try {
        expectedCollateral = await contractRead?.getRequiredCollateralForJoin(
          tokenChoice
        );
        console.log("expectedCollateral", expectedCollateral.toString());
        const code = await provider?.getCode(tokenAddress);
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

      // --- 2. Interact with token ---
      const token = new ethers.Contract(tokenAddress, erc20ABI, signer);

      // Hardcode decimals for Hedera USDC (6) or fallback to token.decimals()
      let decimals = 6;
      try {
        // try to read decimals (some mocks expose decimals)
        const d = await token.decimals();
        decimals = Number(d);
      } catch {
        // keep default 6
      }
      const formattedCollateral = ethers.utils.formatUnits(
        expectedCollateral,
        decimals
      );
      console.log(`Collateral needed: ${formattedCollateral} tokens`);

      // --- 3. Approve Collateral Contract ---
      try {
        const allowanceCollateral = await token.allowance(
          userAddress,
          collateralContract
        );
        console.log("allowanceCollateral", allowanceCollateral.toString());

        if (allowanceCollateral.lt(expectedCollateral)) {
          const approveTx = await token.approve(
            collateralContract,
            expectedCollateral
          );
          const receipt = await approveTx.wait();
          console.log("✅ Collateral approved", receipt.transactionHash);
        } else {
          console.log("✅ Collateral already approved");
        }
      } catch (err) {
        console.error("❌ allowance() / approve() for collateral failed", err);
      }

      // --- 4. Approve Payments Contract ---
      try {
        const allowancePayments = await token.allowance(
          userAddress,
          paymentsContract
        );
        console.log("allowancePayments", allowancePayments.toString());

        if (allowancePayments.lt(expectedCollateral)) {
          const approveTx = await token.approve(
            paymentsContract,
            expectedCollateral
          );
          const receipt = await approveTx.wait();
          console.log("✅ Payments approved", receipt.transactionHash);
        } else {
          console.log("✅ Payments already approved");
        }
      } catch (err) {
        console.error("❌ allowance() / approve() for payments failed", err);
      }

      // --- 5. Join Ajo ---
      const tx = await contractWrite.joinAjo(tokenChoice);
      const receipt = await tx.wait();
      console.log("🎉 Joined Ajo, tx hash:", receipt.transactionHash);
      return receipt;
    },
    [contractWrite, contractRead, provider]
  );

  const makePayment = useCallback(async (): Promise<void> => {
    if (!contractWrite) {
      toast.error("Wallet not connected or contract not ready");
      return;
    }

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
  }, [contractWrite]);

  const distributePayout = useCallback(async () => {
    if (!contractWrite)
      throw new Error("Wallet not connected / write contract not ready");
    try {
      const tx = await contractWrite.distributePayout();
      const receipt = await tx.wait();
      if (receipt.status === 1) {
        toast.success("Cycle ajo distribution successful!");
      } else {
        toast.error("Payment failed");
      }
    } catch (err: any) {
      console.error("distributePayout error:", err);
      toast.error(err?.reason || err?.message || "Payment failed");
      throw err;
    }
  }, [contractWrite]);

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
