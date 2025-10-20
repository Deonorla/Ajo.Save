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

// Addresses from environment variables
const USDC_TOKEN_ADDRESS = import.meta.env.VITE_MOCK_USDC_ADDRESS;
const HBAR_TOKEN_ADDRESS = import.meta.env.VITE_MOCK_WHBAR_ADDRESS;
const AJO_CORE_ADDRESS_EVM = import.meta.env.VITE_AJO_CORE_CONTRACT_ADDRESS_EVM;
const AJO_CORE_ADDRESS_HEDERA = import.meta.env
  .VITE_AJO_CORE_CONTRACT_ADDRESS_HEDERA;

export type PaymentToken = 0 | 1;

export const PaymentToken = {
  USDC: 0,
  HBAR: 1,
} as const;

// ERC20 ABI for approve function
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
];

export const useAjoCore = (ajoCoreAddress?: string) => {
  const { accountId, walletInterface } = useWalletInterface();
  const [loading, setLoading] = useState(false);
  const { setMemberData } = useMemberStore();

  // Helper to determine if using MetaMask
  const isMetaMask = accountId?.startsWith("0x");
  const contractAddress =
    ajoCoreAddress ||
    (isMetaMask ? AJO_CORE_ADDRESS_EVM : AJO_CORE_ADDRESS_HEDERA);

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
   * Approve token spending for collateral contract
   */
  const approveCollateral = useCallback(
    async (
      collateralAddress: string,
      tokenChoice: PaymentToken,
      amount?: string
    ) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const tokenAddress =
          tokenChoice === PaymentToken.USDC
            ? USDC_TOKEN_ADDRESS
            : HBAR_TOKEN_ADDRESS;
        const decimals = tokenChoice === PaymentToken.USDC ? 6 : 8;

        // Default to max uint256 if no amount specified
        const approvalAmount = amount
          ? ethers.utils.parseUnits(amount, decimals)
          : ethers.constants.MaxUint256;

        if (isMetaMask) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            signer
          );

          const tx = await tokenContract.approve(
            convertToEvmAddress(collateralAddress),
            approvalAmount,
            { gasLimit: 800000 }
          );
          await tx.wait();
          toast.success("Collateral approval successful!");
          return tx.hash;
        } else {
          // For WalletConnect/HashPack - using direct ERC20 approve
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            signer
          );

          const tx = await tokenContract.approve(
            convertToEvmAddress(collateralAddress),
            approvalAmount,
            { gasLimit: 800000 }
          );
          await tx.wait();
          toast.success("Collateral approval successful!");
          return tx.hash;
        }
      } catch (error: any) {
        console.error("Approve collateral failed:", error);
        toast.error("Collateral approval failed");
        throw new Error(error.message || "Failed to approve collateral");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, isMetaMask]
  );

  /**
   * Approve token spending for payments contract
   */
  const approvePayments = useCallback(
    async (
      paymentsAddress: string,
      tokenChoice: PaymentToken,
      amount?: string
    ) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const tokenAddress =
          tokenChoice === PaymentToken.USDC
            ? USDC_TOKEN_ADDRESS
            : HBAR_TOKEN_ADDRESS;
        const decimals = tokenChoice === PaymentToken.USDC ? 6 : 8;

        const approvalAmount = amount
          ? ethers.utils.parseUnits(amount, decimals)
          : ethers.constants.MaxUint256;

        if (isMetaMask) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            signer
          );

          const tx = await tokenContract.approve(
            convertToEvmAddress(paymentsAddress),
            approvalAmount,
            { gasLimit: 800000 }
          );
          await tx.wait();
          toast.success("Payments approval successful!");
          return tx.hash;
        } else {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          const tokenContract = new ethers.Contract(
            tokenAddress,
            ERC20_ABI,
            signer
          );

          const tx = await tokenContract.approve(
            convertToEvmAddress(paymentsAddress),
            approvalAmount,
            { gasLimit: 800000 }
          );
          await tx.wait();
          toast.success("Payments approval successful!");
          return tx.hash;
        }
      } catch (error: any) {
        console.error("Approve payments failed:", error);
        toast.error("Payments approval failed");
        throw new Error(error.message || "Failed to approve payments");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, isMetaMask]
  );

  /**
   * Check token allowances
   */
  const checkAllowances = useCallback(
    async (
      collateralAddress: string,
      paymentsAddress: string,
      tokenChoice: PaymentToken
    ) => {
      if (!accountId) {
        throw new Error("Wallet not connected");
      }

      try {
        const tokenAddress =
          tokenChoice === PaymentToken.USDC
            ? USDC_TOKEN_ADDRESS
            : HBAR_TOKEN_ADDRESS;
        const provider = new ethers.providers.JsonRpcProvider(
          import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL ||
            "https://testnet.hashio.io/api"
        );
        const tokenContract = new ethers.Contract(
          tokenAddress,
          ERC20_ABI,
          provider
        );

        const [collateralAllowance, paymentsAllowance, balance] =
          await Promise.all([
            tokenContract.allowance(
              convertToEvmAddress(accountId),
              convertToEvmAddress(collateralAddress)
            ),
            tokenContract.allowance(
              convertToEvmAddress(accountId),
              convertToEvmAddress(paymentsAddress)
            ),
            tokenContract.balanceOf(convertToEvmAddress(accountId)),
          ]);

        const decimals = tokenChoice === PaymentToken.USDC ? 6 : 8;
        return {
          collateralAllowance: ethers.utils.formatUnits(
            collateralAllowance,
            decimals
          ),
          paymentsAllowance: ethers.utils.formatUnits(
            paymentsAllowance,
            decimals
          ),
          balance: ethers.utils.formatUnits(balance, decimals),
        };
      } catch (error: any) {
        console.error("Check allowances failed:", error);
        throw new Error(error.message || "Failed to check allowances");
      }
    },
    [accountId]
  );

  /**
   * Join an Ajo with collateral
   */
  const joinAjo = useCallback(
    async (
      collateralAddress: string,
      paymentsAddress: string,
      tokenChoice: PaymentToken
    ) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        // Step 1: Check if approvals are needed
        const allowances = await checkAllowances(
          collateralAddress,
          paymentsAddress,
          tokenChoice
        );
        const requiredCollateral = await getRequiredCollateral(tokenChoice);

        const collateralNeeded = parseFloat(requiredCollateral);
        const paymentsNeeded = parseFloat(requiredCollateral); // Approximate

        // Step 2: Approve if needed
        if (parseFloat(allowances.collateralAllowance) < collateralNeeded) {
          toast.info("Approving collateral...");
          await approveCollateral(collateralAddress, tokenChoice);
        }

        if (parseFloat(allowances.paymentsAllowance) < paymentsNeeded) {
          toast.info("Approving payments...");
          await approvePayments(paymentsAddress, tokenChoice);
        }

        // Step 3: Join Ajo
        toast.info("Joining Ajo...");

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

          const tx = await contract.joinAjo(tokenChoice, {
            gasLimit: ethers.utils.hexlify(3_000_000),
          });
          const receipt = await tx.wait();
          toast.success("Successfully joined Ajo!");
          return receipt.transactionHash;
        } else {
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
          toast.success("Successfully joined Ajo!");
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Join Ajo failed:", error);
        toast.error(error.message || "Failed to join Ajo");
        throw new Error(error.message || "Failed to join Ajo");
      } finally {
        setLoading(false);
      }
    },
    [
      walletInterface,
      accountId,
      contractAddress,
      isMetaMask,
      approveCollateral,
      approvePayments,
      checkAllowances,
    ]
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
        const provider = new ethers.providers.JsonRpcProvider(
          import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL ||
            "https://testnet.hashio.io/api"
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
          preferredToken: rawMember.preferredToken,
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
      } catch (error: any) {
        console.error("Get member info failed:", error);
        throw new Error(error.message || "Failed to get member info");
      }
    },
    [accountId, contractAddress]
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
        console.log("Required collateral (raw):", collateral.toString());
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

  /**
   * Get required collateral for joining
   */

  const getTokenConfig = useCallback(
    async (token: number) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          import.meta.env.VITE_JSON_RPC_URL || "https://testnet.hashio.io/api"
        );
        const contract = new ethers.Contract(
          convertToEvmAddress(contractAddress),
          AjoCoreABI.abi,
          provider
        );
        const tokenConfig = await contract.getTokenConfig(token);
        const formattedTokenConfig = {
          isActive: tokenConfig.isActive,
          monthlyPayment: tokenConfig.monthlyPayment.toString(),
        };
        return formattedTokenConfig;
      } catch (error: any) {
        console.error("Get token config failed:", error);
        throw new Error(error.message || "Failed to get token config");
      }
    },
    [contractAddress]
  );

  /**
   * Get required collateral demo
   */

  const getCollateralDemo = useCallback(
    async (participants: number, monthlyPayment: string) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          import.meta.env.VITE_JSON_RPC_URL || "https://testnet.hashio.io/api"
        );
        const contract = new ethers.Contract(
          convertToEvmAddress(contractAddress),
          AjoCoreABI.abi,
          provider
        );
        const collateralDemo = await contract.getCollateralDemo(
          participants,
          monthlyPayment
        );
        const positions = Array.isArray(collateralDemo[0])
          ? collateralDemo[0].map((p: any) => p.toString())
          : [];
        const collaterals = Array.isArray(collateralDemo[1])
          ? collateralDemo[1].map((c: any) => c.toString())
          : [];
        return { positions, collaterals };
      } catch (error: any) {
        console.error("Get required collateral demo failed:", error);
        throw new Error(
          error.message || "Failed to get required collateral demo"
        );
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
    getTokenConfig,
    getContractStats,
    getCollateralDemo,
    getRequiredCollateral,
    isConnected: !!accountId,
    accountId,
  };
};
