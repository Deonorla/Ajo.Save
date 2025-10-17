/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { ContractId, AccountId, TokenId } from "@hashgraph/sdk";
import { ethers } from "ethers";
import { useWalletInterface } from "@/services/wallets/useWalletInterface";
import { ContractFunctionParameterBuilder } from "@/services/wallets/contractFunctionParameterBuilder";
import AjoCoreABI from "@/abi/AjoCore.json";
import { toast } from "sonner";
import { BigNumber } from "ethers";
import { useMemberStore } from "@/store/memberInfoStore";

// 💡 Define V5 BigNumber constants for common operations
const ONE_MILLION_BN = BigNumber.from(1000000);
const AJO_CORE_ADDRESS = import.meta.env.VITE_AJO_CORE_CONTRACT_ADDRESS;

export type PaymentToken = 0 | 1;

export const PaymentToken = {
  USDC: 0,
  HBAR: 1,
} as const;

export const useAjoCore = (ajoCoreAddress?: string) => {
  const { accountId, walletInterface } = useWalletInterface();
  const [loading, setLoading] = useState(false);
  const { setMemberData } = useMemberStore();
  const contractAddress = ajoCoreAddress || AJO_CORE_ADDRESS;

  // Helper to determine if using MetaMask
  const isMetaMask = accountId?.startsWith("0x");

  // Helper to convert Hedera address to EVM
  const convertToEvmAddress = (address: string): string => {
    console.log("Converting address:", address);
    if (address.startsWith("0x")) return address;
    const parts = address.split(".");
    if (parts.length === 3) {
      const accountNum = parseInt(parts[2]);
      return "0x" + accountNum.toString(16).padStart(40, "0");
    }
    return address;
  };

  // Helper to convert EVM address to Hedera
  const convertToHederaAddress = (address: string): string => {
    console.log("Converting address:", address);
    if (!address.startsWith("0x")) return address;
    try {
      const accountNum = parseInt(address.slice(2), 16);
      return `0.0.${accountNum}`;
    } catch {
      return address;
    }
  };

  /**
   * Join an Ajo with collateral
   */
  const joinAjo = useCallback(
    async (tokenChoice: PaymentToken) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        if (isMetaMask) {
          // MetaMask flow - use ethers.js
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          const contract = new ethers.Contract(
            convertToEvmAddress(contractAddress),
            AjoCoreABI.abi,
            signer
          );

          const tx = await contract.joinAjo(tokenChoice, {
            gasLimit: ethers.utils.hexlify(3_000_000),
          });
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          // WalletConnect flow - use Hedera SDK
          const params = new ContractFunctionParameterBuilder().addParam({
            type: "uint8",
            name: "tokenChoice",
            value: tokenChoice,
          });

          const txId = await walletInterface.executeContractFunction(
            ContractId.fromString(convertToHederaAddress(contractAddress)),
            "joinAjo",
            params,
            3_000_000
          );
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Join Ajo failed:", error);
        throw new Error(error.message || "Failed to join Ajo");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Process monthly payment
   */
  const processPayment = useCallback(async () => {
    if (!walletInterface || !accountId) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    try {
      if (isMetaMask) {
        const provider = new ethers.providers.Web3Provider(
          (window as any).ethereum
        );
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          convertToEvmAddress(contractAddress),
          AjoCoreABI.abi,
          signer
        );

        const tx = await contract.processPayment({
          gasLimit: ethers.utils.hexlify(3_000_000),
        });
        const receipt = await tx.wait();
        return receipt.transactionHash;
      } else {
        const params = new ContractFunctionParameterBuilder();
        const txId = await walletInterface.executeContractFunction(
          ContractId.fromString(convertToHederaAddress(contractAddress)),
          "processPayment",
          params,
          3_000_000
        );
        return txId?.toString() || null;
      }
    } catch (error: any) {
      console.error("Process payment failed:", error);
      throw new Error(error.message || "Failed to process payment");
    } finally {
      setLoading(false);
    }
  }, [walletInterface, accountId, contractAddress, isMetaMask]);

  /**
   * Distribute payout to current cycle receiver
   */
  const distributePayout = useCallback(async () => {
    if (!walletInterface || !accountId) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    try {
      if (isMetaMask) {
        const provider = new ethers.providers.Web3Provider(
          (window as any).ethereum
        );
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          convertToEvmAddress(contractAddress),
          AjoCoreABI.abi,
          signer
        );

        const tx = await contract.distributePayout({
          gasLimit: ethers.utils.hexlify(3_000_000),
        });
        const receipt = await tx.wait();
        return receipt.transactionHash;
      } else {
        const params = new ContractFunctionParameterBuilder();
        const txId = await walletInterface.executeContractFunction(
          ContractId.fromString(convertToHederaAddress(contractAddress)),
          "distributePayout",
          params,
          3_000_000
        );
        return txId?.toString() || null;
      }
    } catch (error: any) {
      console.error("Distribute payout failed:", error);
      throw new Error(error.message || "Failed to distribute payout");
    } finally {
      setLoading(false);
    }
  }, [walletInterface, accountId, contractAddress, isMetaMask]);

  /**
   * Exit from Ajo (withdraw collateral and exit)
   */
  const exitAjo = useCallback(async () => {
    if (!walletInterface || !accountId) {
      throw new Error("Wallet not connected");
    }

    setLoading(true);
    try {
      if (isMetaMask) {
        const provider = new ethers.providers.Web3Provider(
          (window as any).ethereum
        );
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          convertToEvmAddress(contractAddress),
          AjoCoreABI.abi,
          signer
        );

        const tx = await contract.exitAjo({
          gasLimit: ethers.utils.hexlify(3_000_000),
        });
        const receipt = await tx.wait();
        return receipt.transactionHash;
      } else {
        const params = new ContractFunctionParameterBuilder();
        const txId = await walletInterface.executeContractFunction(
          ContractId.fromString(convertToHederaAddress(contractAddress)),
          "exitAjo",
          params,
          3_000_000
        );
        return txId?.toString() || null;
      }
    } catch (error: any) {
      console.error("Exit Ajo failed:", error);
      throw new Error(error.message || "Failed to exit Ajo");
    } finally {
      setLoading(false);
    }
  }, [walletInterface, accountId, contractAddress, isMetaMask]);

  /**
   * Get member information
   */
  const getMemberInfo = useCallback(
    async (memberAddress?: string) => {
      if (!accountId && !memberAddress) {
        throw new Error("No address provided");
      }

      const addressToQuery = memberAddress || accountId;

      try {
        if (isMetaMask || memberAddress?.startsWith("0x")) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const contract = new ethers.Contract(
            convertToEvmAddress(contractAddress),
            AjoCoreABI.abi,
            provider
          );

          const result = await contract.getMemberInfo(
            convertToEvmAddress(addressToQuery!)
          );
          const rawMember = result[0];

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
            isHtsAssociated: rawMember.isHtsAssociated,
            isFrozen: rawMember.isFrozen,
          };

          const data: MemberInfoResponse = {
            memberInfo: member,
            pendingPenalty: result[1].toString(),
            effectiveVotingPower: result[2].toString(),
          };
          setMemberData(data);
          return data;
        } else {
          // For read operations, you can use JSON-RPC relay
          const provider = new ethers.providers.JsonRpcProvider(
            import.meta.env.VITE_JSON_RPC_URL || "https://testnet.hashio.io/api"
          );
          const contract = new ethers.Contract(
            convertToEvmAddress(contractAddress),
            AjoCoreABI.abi,
            provider
          );

          const result = await contract.getMemberInfo(
            convertToEvmAddress(addressToQuery!)
          );

          const rawMember = result[0];

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
            isHtsAssociated: rawMember.isHtsAssociated,
            isFrozen: rawMember.isFrozen,
          };

          const data: MemberInfoResponse = {
            memberInfo: member,
            pendingPenalty: result[1].toString(),
            effectiveVotingPower: result[2].toString(),
          };
          setMemberData(data);
          return data;
        }
      } catch (error: any) {
        console.error("Get member info failed:", error);
        throw new Error(error.message || "Failed to get member info");
      }
    },
    [accountId, contractAddress, isMetaMask]
  );

  /**
   * Get contract statistics
   */
  const getContractStats = useCallback(async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        import.meta.env.VITE_JSON_RPC_URL || "https://testnet.hashio.io/api"
      );
      const contract = new ethers.Contract(
        convertToEvmAddress(contractAddress),
        AjoCoreABI.abi,
        provider
      );

      const stats = await contract.getContractStats();
      return {
        totalMembers: stats.totalMembers.toNumber(),
        activeMembers: stats.activeMembers.toNumber(),
        totalCollateralUSDC: ethers.utils.formatUnits(
          stats.totalCollateralUSDC,
          6
        ),
        totalCollateralHBAR: ethers.utils.formatUnits(
          stats.totalCollateralHBAR,
          8
        ),
        contractBalanceUSDC: ethers.utils.formatUnits(
          stats.contractBalanceUSDC,
          6
        ),
        contractBalanceHBAR: ethers.utils.formatUnits(
          stats.contractBalanceHBAR,
          8
        ),
        currentQueuePosition: stats.currentQueuePosition.toNumber(),
        activeToken: stats.activeToken,
        usesHtsTokens: stats._usesHtsTokens,
      };
    } catch (error: any) {
      console.error("Get contract stats failed:", error);
      throw new Error(error.message || "Failed to get contract stats");
    }
  }, [contractAddress]);

  /**
   * Get required collateral for joining
   */
  const getRequiredCollateral = useCallback(
    async (tokenChoice: PaymentToken) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          import.meta.env.VITE_JSON_RPC_URL || "https://testnet.hashio.io/api"
        );
        const contract = new ethers.Contract(
          convertToEvmAddress(contractAddress),
          AjoCoreABI.abi,
          provider
        );

        const collateral = await contract.getRequiredCollateralForJoin(
          tokenChoice
        );
        return ethers.utils.formatUnits(
          collateral,
          tokenChoice === PaymentToken.USDC ? 6 : 8
        );
      } catch (error: any) {
        console.error("Get required collateral failed:", error);
        throw new Error(error.message || "Failed to get required collateral");
      }
    },
    [contractAddress]
  );

  return {
    loading,
    joinAjo,
    processPayment,
    distributePayout,
    exitAjo,
    getMemberInfo,
    getContractStats,
    getRequiredCollateral,
    isConnected: !!accountId,
    accountId,
  };
};
