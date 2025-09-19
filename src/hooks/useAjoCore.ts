/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "./../auth/WalletContext";
import AjoCore from "@/abi/ajoCore.json";

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

  // write
  joinAjo: (tokenChoice: number) => Promise<void>;
  makePayment: () => Promise<void>;
  distributePayout: () => Promise<void>;
}

const useAjoCore = (): UseAjoCore => {
  const ajoAddress = import.meta.env.VITE_AJO_CORE_CONTRACT_ADDRESS;

  const { provider, connected, error } = useWallet();
  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );

  // read-only contract (provider)
  const contractRead = useMemo(() => {
    if (!provider || !ajoAddress) return null;
    return new ethers.Contract(ajoAddress, (AjoCore as any).abi, provider);
  }, [provider, ajoAddress]);

  // write-enabled contract: provider.getSigner() is async in ethers v6, so build it in effect
  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      if (!provider || !ajoAddress) {
        if (mounted) setContractWrite(null);
        return;
      }
      try {
        const signer = await provider.getSigner(); // await is required
        if (!mounted) return;
        const writable = new ethers.Contract(
          ajoAddress,
          (AjoCore as any).abi,
          signer
        );
        setContractWrite(writable);
      } catch (err) {
        console.error("useAjoCore: failed to create write contract", err);
        if (mounted) setContractWrite(null);
      }
    };
    setup();
    return () => {
      mounted = false;
    };
  }, [provider, ajoAddress]);

  // ---------------------------
  // Read wrappers
  // ---------------------------
  const getContractStats =
    useCallback(async (): Promise<ContractStats | null> => {
      if (!contractRead) return null;
      try {
        const res = await contractRead.getContractStats();
        return {
          totalMembers: res[0].toString(),
          activeMembers: res[1].toString(),
          totalCollateralUSDC: res[2].toString(),
          totalCollateralHBAR: res[3].toString(),
          contractBalanceUSDC: res[4].toString(),
          contractBalanceHBAR: res[5].toString(),
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
      try {
        const res = await contractRead.getMemberInfo(memberAddress);
        // res: [ memberStruct, pendingPenalty, effectiveVotingPower ]
        const rawMember = res[0];
        const member: MemberStruct = {
          queueNumber: rawMember.queueNumber,
          joinedCycle: rawMember.joinedCycle,
          totalPaid: rawMember.totalPaid,
          requiredCollateral: rawMember.requiredCollateral,
          lockedCollateral: rawMember.lockedCollateral,
          lastPaymentCycle: rawMember.lastPaymentCycle,
          defaultCount: rawMember.defaultCount,
          hasReceivedPayout: rawMember.hasReceivedPayout,
          isActive: rawMember.isActive,
          guarantor: rawMember.guarantor,
          preferredToken: Number(rawMember.preferredToken),
          reputationScore: rawMember.reputationScore,
          pastPayments: Array.isArray(rawMember.pastPayments)
            ? rawMember.pastPayments.map((x: any) => BigInt(x))
            : [],
          guaranteePosition: rawMember.guaranteePosition,
        };
        return {
          memberInfo: member,
          pendingPenalty: res[1].toString(),
          effectiveVotingPower: res[2].toString(),
        };
      } catch (err) {
        console.error("getMemberInfo error:", err);
        return null;
      }
    },
    [contractRead]
  );

  const needsToPayThisCycle = useCallback(
    async (memberAddress: string): Promise<boolean | null> => {
      if (!contractRead) return null;
      try {
        return await contractRead.needsToPayThisCycle(memberAddress);
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
      try {
        const res = await contractRead.getQueueInfo(memberAddress);
        return {
          position: res[0].toString(),
          estimatedCyclesWait: res[1].toString(),
        };
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
      try {
        const res = await contractRead.getTokenConfig(token);
        return { monthlyPayment: res[0].toString(), isActive: Boolean(res[1]) };
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
        // monthlyPayment is a string (we keep raw). If your contract expects uint256, pass BigInt or string as appropriate.
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

  // ---------------------------
  // Write wrappers
  // ---------------------------
  const joinAjo = useCallback(
    async (tokenChoice: number) => {
      if (!contractWrite)
        throw new Error("Wallet not connected / write contract not ready");
      try {
        const tx = await contractWrite.joinAjo(tokenChoice);
        await tx.wait();
      } catch (err) {
        console.error("joinAjo error:", err);
        throw err;
      }
    },
    [contractWrite]
  );

  const makePayment = useCallback(async () => {
    if (!contractWrite)
      throw new Error("Wallet not connected / write contract not ready");
    try {
      const tx = await contractWrite.makePayment();
      await tx.wait();
    } catch (err) {
      console.error("makePayment error:", err);
      throw err;
    }
  }, [contractWrite]);

  const distributePayout = useCallback(async () => {
    if (!contractWrite)
      throw new Error("Wallet not connected / write contract not ready");
    try {
      const tx = await contractWrite.distributePayout();
      await tx.wait();
    } catch (err) {
      console.error("distributePayout error:", err);
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
    // write
    joinAjo,
    makePayment,
    distributePayout,
  };
};

export default useAjoCore;
