/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback } from "react";
import {
  ContractExecuteTransaction,
  ContractFunctionParameters,
  ContractCallQuery,
  AccountId,
  TokenId,
  ContractId,
} from "@hashgraph/sdk";
import { Interface } from "ethers";
import { toast } from "sonner";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import AjoCore from "@/abi/ajoCore.json";
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
    tokenId: string,
    collateralContract: string,
    paymentsContract: string
  ) => Promise<any>;
  makePayment: (paymentsContract: string) => Promise<void>;
  distributePayout: () => Promise<void>;
}

const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";

const useAjoCore = (ajoCoreAddress: string): UseAjoCore => {
  const wallet = useHashPackWallet();
  const [error, setError] = useState<string | null>(null);

  // Create ethers interface for ABI encoding/decoding (ethers v6)
  const contractInterface = new Interface((AjoCore as any).abi);

  // Helper: Encode function call using ABI
  const encodeFunctionCall = useCallback(
    (functionName: string, params: any[] = []) => {
      try {
        return contractInterface.encodeFunctionData(functionName, params);
      } catch (err: any) {
        console.error(`Failed to encode ${functionName}:`, err);
        throw err;
      }
    },
    [contractInterface]
  );

  // Helper: Decode function result using ABI
  const decodeFunctionResult = useCallback(
    (functionName: string, data: string) => {
      try {
        return contractInterface.decodeFunctionResult(functionName, data);
      } catch (err: any) {
        console.error(`Failed to decode ${functionName}:`, err);
        throw err;
      }
    },
    [contractInterface]
  );

  // Helper: Query contract (read-only via Mirror Node)
  const queryContract = useCallback(
    async (functionName: string, params: any[] = []) => {
      try {
        // Encode the function call using ABI
        const encodedData = encodeFunctionCall(functionName, params);

        // Query via Mirror Node REST API
        const response = await fetch(
          `${MIRROR_NODE_URL}/api/v1/contracts/call`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: encodedData,
              to: ajoCoreAddress,
              estimate: false,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Query failed: ${response.statusText}`);
        }

        const result = await response.json();

        // Decode the result using ABI
        if (result.result) {
          const decoded = decodeFunctionResult(functionName, result.result);
          return decoded;
        }

        return null;
      } catch (err: any) {
        console.error(`Query ${functionName} failed:`, err);
        setError(err.message);
        return null;
      }
    },
    [ajoCoreAddress, encodeFunctionCall, decodeFunctionResult]
  );

  // Helper: Execute contract transaction (write)
  const executeContract = useCallback(
    async (
      functionName: string,
      params: any[] = [],
      payableAmount?: number
    ) => {
      if (!wallet.connected || !wallet.accountId) {
        throw new Error("Wallet not connected");
      }

      try {
        // Encode function call using ABI
        const encodedData = encodeFunctionCall(functionName, params);

        // Remove '0x' prefix if present
        const functionData = encodedData.startsWith("0x")
          ? encodedData.slice(2)
          : encodedData;

        // Create contract execute transaction
        const transaction = new ContractExecuteTransaction()
          .setContractId(ContractId.fromString(ajoCoreAddress))
          .setGas(1000000) // Increased gas limit
          .setFunctionParameters(Buffer.from(functionData, "hex"));

        if (payableAmount) {
          transaction.setPayableAmount(payableAmount);
        }

        // Execute through wallet signer
        const txId = await wallet.sendTransaction(transaction);
        return txId;
      } catch (err: any) {
        console.error(`Execute ${functionName} failed:`, err);
        throw err;
      }
    },
    [wallet, ajoCoreAddress, encodeFunctionCall]
  );

  // Helper: Associate token with account
  const associateTokenIfNeeded = useCallback(
    async (tokenId: string) => {
      try {
        // Check if already associated via mirror node
        const response = await fetch(
          `${MIRROR_NODE_URL}/api/v1/accounts/${wallet.accountId}/tokens?token.id=${tokenId}`
        );
        const data = await response.json();

        if (data.tokens && data.tokens.length > 0) {
          console.log("Token already associated");
          return;
        }

        // Associate token
        toast.info("Associating token with your account...");
        await wallet.associateToken(tokenId);
      } catch (err: any) {
        if (!err.message?.includes("TOKEN_ALREADY_ASSOCIATED")) {
          throw err;
        }
      }
    },
    [wallet]
  );

  // Helper: Approve token (using token contract's approve function)
  const approveToken = useCallback(
    async (tokenId: string, spender: string, amount: number) => {
      try {
        toast.info(`Approving ${spender.slice(0, 10)}...`);

        // Create ERC20 interface for approve function (ethers v6)
        const erc20Interface = new Interface([
          "function approve(address spender, uint256 amount) returns (bool)",
        ]);

        const encodedData = erc20Interface.encodeFunctionData("approve", [
          spender,
          amount,
        ]);

        const functionData = encodedData.startsWith("0x")
          ? encodedData.slice(2)
          : encodedData;

        const transaction = new ContractExecuteTransaction()
          .setContractId(ContractId.fromString(tokenId))
          .setGas(100000)
          .setFunctionParameters(Buffer.from(functionData, "hex"));

        const txId = await wallet.sendTransaction(transaction);
        toast.success("Approval successful");
        return txId;
      } catch (err: any) {
        console.error("Approve failed:", err);
        toast.error("Approval failed");
        throw err;
      }
    },
    [wallet]
  );

  // ---------------------------
  // Read Functions
  // ---------------------------

  const getContractStats =
    useCallback(async (): Promise<ContractStats | null> => {
      try {
        const result = await queryContract("getContractStats", []);
        if (!result) return null;

        return {
          totalMembers: result.totalMembers?.toString() ?? "0",
          activeMembers: result.activeMembers?.toString() ?? "0",
          totalCollateralUSDC: (
            Number(result.totalCollateralUSDC ?? 0) / 1000000
          ).toString(),
          totalCollateralHBAR: (
            Number(result.totalCollateralHBAR ?? 0) / 1000000
          ).toString(),
          contractBalanceUSDC: (
            Number(result.contractBalanceUSDC ?? 0) / 1000000
          ).toString(),
          contractBalanceHBAR: (
            Number(result.contractBalanceHBAR ?? 0) / 1000000
          ).toString(),
          currentQueuePosition: result.currentQueuePosition?.toString() ?? "0",
          activeToken: Number(result.activeToken ?? 0),
        };
      } catch (err) {
        console.error("getContractStats error:", err);
        return null;
      }
    }, [queryContract]);

  const getMemberInfo = useCallback(
    async (memberAddress: string): Promise<MemberInfoResponse | null> => {
      const { setMemberData, setLoading, setError } = useMemberStore.getState();
      setLoading(true);

      try {
        const result = await queryContract("getMemberInfo", [memberAddress]);

        if (!result || !result.memberInfo) {
          setLoading(false);
          return null;
        }

        const rawMember = result.memberInfo;

        const member: MemberStruct = {
          queueNumber: rawMember.queueNumber?.toString() ?? "0",
          joinedCycle: rawMember.joinedCycle?.toString() ?? "0",
          totalPaid: (
            BigInt(rawMember.totalPaid ?? 0) / BigInt(1000000)
          ).toString(),
          requiredCollateral: (
            BigInt(rawMember.requiredCollateral ?? 0) / BigInt(1000000)
          ).toString(),
          lockedCollateral: (
            BigInt(rawMember.lockedCollateral ?? 0) / BigInt(1000000)
          ).toString(),
          lastPaymentCycle: rawMember.lastPaymentCycle?.toString() ?? "0",
          defaultCount: rawMember.defaultCount?.toString() ?? "0",
          hasReceivedPayout: rawMember.hasReceivedPayout ?? false,
          isActive: rawMember.isActive ?? false,
          guarantor:
            rawMember.guarantor ?? "0x0000000000000000000000000000000000000000",
          preferredToken: Number(rawMember.preferredToken ?? 0),
          reputationScore: rawMember.reputationScore?.toString() ?? "0",
          pastPayments: Array.isArray(rawMember.pastPayments)
            ? rawMember.pastPayments.map((x: any) => x.toString())
            : [],
          guaranteePosition: rawMember.guaranteePosition?.toString() ?? "0",
        };

        const data: MemberInfoResponse = {
          memberInfo: member,
          pendingPenalty: (result.pendingPenalty ?? BigInt(0)).toString(),
          effectiveVotingPower: (
            result.effectiveVotingPower ?? BigInt(0)
          ).toString(),
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
    [queryContract]
  );

  const needsToPayThisCycle = useCallback(
    async (memberAddress: string): Promise<boolean | null> => {
      const { setNeedsToPay } = useMemberStore.getState();
      try {
        const result = await queryContract("needsToPayThisCycle", [
          memberAddress,
        ]);
        const needsPay = result?.[0] || false;
        setNeedsToPay(needsPay);
        return needsPay;
      } catch (err) {
        console.error("needsToPayThisCycle error:", err);
        return null;
      }
    },
    [queryContract]
  );

  const getQueueInfo = useCallback(
    async (
      memberAddress: string
    ): Promise<{ position: string; estimatedCyclesWait: string } | null> => {
      const { setQueueInfo } = useMemberStore.getState();
      try {
        const result = await queryContract("getQueueInfo", [memberAddress]);

        if (!result) return null;

        const info = {
          position: result.position?.toString() ?? "0",
          estimatedCyclesWait: result.estimatedCyclesWait?.toString() ?? "0",
        };
        setQueueInfo(info);
        return info;
      } catch (err) {
        console.error("getQueueInfo error:", err);
        return null;
      }
    },
    [queryContract]
  );

  const getTokenConfig = useCallback(
    async (
      token: number
    ): Promise<{ monthlyPayment: string; isActive: boolean } | null> => {
      const { setTokenConfig } = useMemberStore.getState();
      try {
        const result = await queryContract("getTokenConfig", [token]);

        if (!result || !result[0]) return null;

        const config = {
          monthlyPayment: result[0]?.monthlyPayment?.toString() ?? "0",
          isActive: Boolean(result[0]?.isActive ?? false),
        };
        setTokenConfig(config);
        return config;
      } catch (err) {
        console.error("getTokenConfig error:", err);
        return null;
      }
    },
    [queryContract]
  );

  const getCollateralDemo = useCallback(
    async (
      participants: number,
      monthlyPayment: string
    ): Promise<{ positions: string[]; collaterals: string[] } | null> => {
      try {
        const result = await queryContract("getCollateralDemo", [
          participants,
          monthlyPayment,
        ]);

        if (!result) return null;

        const positions = Array.isArray(result.positions)
          ? result.positions.map((p: any) => p.toString())
          : [];
        const collaterals = Array.isArray(result.collaterals)
          ? result.collaterals.map((c: any) => c.toString())
          : [];

        return { positions, collaterals };
      } catch (err) {
        console.error("getCollateralDemo error:", err);
        return null;
      }
    },
    [queryContract]
  );

  const owner = useCallback(async (): Promise<string | null> => {
    try {
      const result = await queryContract("owner", []);
      return result?.[0] || null;
    } catch (err) {
      console.error("owner() error:", err);
      return null;
    }
  }, [queryContract]);

  const getRequiredCollateralForJoin = useCallback(async (): Promise<
    string | null
  > => {
    try {
      const result = await queryContract("getRequiredCollateralForJoin", [0]);
      console.log("collateral", result?.[0]?.toString());
      return result?.[0]?.toString() || null;
    } catch (err) {
      console.error("getRequiredCollateralForJoin failed", err);
      return null;
    }
  }, [queryContract]);

  // ---------------------------
  // Write Functions
  // ---------------------------

  const joinAjo = useCallback(
    async (
      tokenChoice: number,
      tokenId: string,
      collateralContract: string,
      paymentsContract: string
    ) => {
      if (!wallet.connected) {
        toast.info("Connect Wallet to participate");
        throw new Error("Wallet not connected");
      }

      try {
        // 1. Get required collateral
        toast.info("Calculating required collateral...");
        const collateralResult = await queryContract(
          "getRequiredCollateralForJoin",
          [tokenChoice]
        );

        let collateralAmount: number;

        if (
          !collateralResult ||
          collateralResult.length === 0 ||
          !collateralResult[0]
        ) {
          const tokenConfig = await getTokenConfig(tokenChoice);
          if (!tokenConfig) {
            throw new Error("Could not fetch token configuration");
          }
          collateralAmount = Number(tokenConfig.monthlyPayment);
        } else {
          collateralAmount = Number(collateralResult[0]);
        }

        if (!collateralAmount) {
          throw new Error("Could not determine collateral requirement");
        }

        console.log(`Collateral needed: ${collateralAmount / 1000000} tokens`);

        // 2. Check token balance
        toast.info("Checking token balance...");
        const balance = await wallet.getTokenBalance(tokenId);
        const balanceNum = Number(balance ?? 0);

        if (balanceNum < collateralAmount) {
          const errorMsg = `Insufficient balance. Need ${
            collateralAmount / 1000000
          }, have ${balanceNum / 1000000}`;
          toast.error(errorMsg);
          throw new Error(errorMsg);
        }

        // 3. Associate token if needed
        await associateTokenIfNeeded(tokenId);

        // 4. Approve collateral contract
        await approveToken(tokenId, collateralContract, collateralAmount);

        // 5. Approve payments contract
        await approveToken(tokenId, paymentsContract, collateralAmount);

        // 6. Join Ajo
        toast.info("Joining Ajo...");
        const txId = await executeContract("joinAjo", [tokenChoice]);

        toast.success("Successfully joined Ajo!");
        console.log("🎉 Joined Ajo, tx hash:", txId);
        return txId;
      } catch (err: any) {
        console.error("joinAjo error:", err);
        toast.error(err.message || "Failed to join Ajo");
        throw err;
      }
    },
    [
      wallet,
      queryContract,
      getTokenConfig,
      associateTokenIfNeeded,
      approveToken,
      executeContract,
    ]
  );

  const makePayment = useCallback(
    async (paymentsContract: string): Promise<void> => {
      if (!wallet.connected) {
        toast.error("Wallet not connected");
        return;
      }

      try {
        // 1. Get required payment amount
        const paymentResult = await queryContract(
          "getRequiredCollateralForJoin",
          [0]
        );

        let paymentAmount: number;

        if (!paymentResult || paymentResult.length === 0 || !paymentResult[0]) {
          const tokenConfig = await getTokenConfig(0);
          if (!tokenConfig) {
            throw new Error("Could not fetch token configuration");
          }
          paymentAmount = Number(tokenConfig.monthlyPayment) || 50000000;
        } else {
          paymentAmount = Number(paymentResult[0]) || 50000000;
        }

        // 2. Approve payment
        const tokenId = import.meta.env.VITE_MOCK_USDC_ADDRESS;
        toast.info("Approving payment...");
        await approveToken(tokenId, paymentsContract, paymentAmount);

        // 3. Process payment
        toast.info("Processing payment...");
        const txId = await executeContract("processPayment", []);

        toast.success("Monthly payment successful!");
        console.log("✅ Payment processed:", txId);
      } catch (err: any) {
        console.error("makePayment error:", err);
        toast.error(err?.message || "Payment failed");
      }
    },
    [wallet, queryContract, getTokenConfig, approveToken, executeContract]
  );

  const distributePayout = useCallback(async () => {
    if (!wallet.connected) {
      toast.error("Wallet not connected");
      return;
    }

    try {
      toast.info("Distributing payout...");
      const txId = await executeContract("distributePayout", []);

      toast.success("Cycle Ajo distribution successful!");
      console.log("✅ Payout distributed:", txId);
    } catch (err: any) {
      console.error("distributePayout error:", err);

      const errorMessage = err?.message || "";

      if (
        errorMessage.includes("transfer amount exceeds balance") ||
        errorMessage.includes("PayoutNotReady")
      ) {
        toast.error(
          "You can only request payout when the whole team has paid this cycle"
        );
      } else {
        toast.error("Distribution failed, please try again");
      }
    }
  }, [wallet, executeContract]);

  return {
    connected: wallet.connected,
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
