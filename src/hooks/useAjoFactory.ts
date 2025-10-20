/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import {
  Client,
  ContractId,
  TransactionId,
  TransactionRecordQuery,
} from "@hashgraph/sdk";
import { ethers } from "ethers";
import { useWalletInterface } from "@/services/wallets/useWalletInterface";
import { ContractFunctionParameterBuilder } from "@/services/wallets/contractFunctionParameterBuilder";
import AjoFactoryABI from "@/abi/AjoFactory.json";
import { toast } from "sonner";
import { useAjoStore } from "@/store/ajoStore";
import { appConfig } from "@/config";
import { bnToString, useAjoDetailsStore } from "@/store/ajoDetailsStore";

const AJO_FACTORY_ADDRESS_HEDERA = import.meta.env
  .VITE_AJO_FACTORY_CONTRACT_ADDRESS_HEDERA;
const AJO_FACTORY_ADDRESS_EVM = import.meta.env
  .VITE_AJO_FACTORY_CONTRACT_ADDRESS_EVM;

const currentNetworkConfig = appConfig.networks.testnet;
const hederaNetwork = currentNetworkConfig.network;
const hederaClient = Client.forName(hederaNetwork);

export const useAjoFactory = (ajoFactoryAddress?: string) => {
  const { accountId, walletInterface } = useWalletInterface();
  const [loading, setLoading] = useState(false);
  const { setAjoInfos } = useAjoStore();
  const { setAjoDetails } = useAjoDetailsStore();
  const isMetaMask = accountId?.startsWith("0x");

  const contractAddress =
    ajoFactoryAddress ||
    (isMetaMask ? AJO_FACTORY_ADDRESS_EVM : AJO_FACTORY_ADDRESS_HEDERA);
  const readAddress = AJO_FACTORY_ADDRESS_EVM;

  // Helper to validate Hedera address format
  const isValidHederaAddress = (address: string): boolean => {
    const hederaRegex = /^\d+\.\d+\.\d+$/;
    return hederaRegex.test(address);
  };

  // Helper to validate EVM address format
  const isValidEvmAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  // Helper to convert Hedera address to EVM
  const convertToEvmAddress = (address: string): string => {
    console.log("Converting to EVM address:", address);
    if (isValidEvmAddress(address)) return address.toLowerCase();
    if (isValidHederaAddress(address)) {
      const parts = address.split(".");
      if (parts[0] !== "0" || parts[1] !== "0") {
        throw new Error(
          "Only shard 0 and realm 0 are supported for conversion"
        );
      }
      const accountNum = BigInt(parts[2]);
      return "0x" + accountNum.toString(16).padStart(40, "0").toLowerCase();
    }
    throw new Error(`Invalid address format: ${address}`);
  };

  // Helper to convert EVM address to Hedera
  const convertToHederaAddress = (address: string): string => {
    console.log("Converting to Hedera address:", address);
    if (isValidHederaAddress(address)) return address;
    if (isValidEvmAddress(address)) {
      try {
        const accountNum = BigInt(address);
        return `0.0.${accountNum.toString()}`;
      } catch (error) {
        throw new Error(`Failed to convert EVM address: ${address}`);
      }
    }
    throw new Error(`Invalid address format: ${address}`);
  };

  // Helper to get ContractId for Hedera SDK calls
  const getContractId = (address: string): ContractId => {
    if (isValidHederaAddress(address)) {
      return ContractId.fromString(address);
    } else if (isValidEvmAddress(address)) {
      return ContractId.fromEvmAddress(0, 0, address);
    }
    throw new Error(`Invalid contract address format: ${address}`);
  };

  /**
   * Associate user with HTS tokens
   */
  const associateUserWithHtsTokens = useCallback(
    async (user: string) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const userAddress = convertToEvmAddress(user);

        if (isMetaMask) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          const contract = new ethers.Contract(
            convertToEvmAddress(contractAddress),
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.associateUserWithHtsTokens(userAddress, {
            gasLimit: ethers.utils.hexlify(3_000_000),
          });
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          const params = new ContractFunctionParameterBuilder().addParam({
            type: "address",
            name: "user",
            value: userAddress,
          });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "associateUserWithHtsTokens",
            params,
            3_000_000
          );
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Associate user failed:", error);
        throw new Error(
          error.message || "Failed to associate user with HTS tokens"
        );
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Batch associate users with HTS tokens
   */
  const batchAssociateUsers = useCallback(
    async (users: string[]) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const convertedUsers = users.map(convertToEvmAddress);
        console.log("Batch associating users:", convertedUsers);
        if (isMetaMask) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          const contract = new ethers.Contract(
            convertToEvmAddress(contractAddress),
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.batchAssociateUsers(convertedUsers, {
            gasLimit: ethers.utils.hexlify(5_000_000),
          });
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          const params = new ContractFunctionParameterBuilder().addParam({
            type: "address[]",
            name: "users",
            value: convertedUsers,
          });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "batchAssociateUsers",
            params,
            5_000_000
          );
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Batch associate failed:", error);
        throw new Error(error.message || "Failed to batch associate users");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Batch fund users with HTS tokens
   * FIXED: Convert amounts to BigInt for proper int64 handling
   */
  const batchFundUsers = useCallback(
    async (users: string[], usdcAmount: number, hbarAmount: number) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const convertedUsers = users.map(convertToEvmAddress);

        if (isMetaMask) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          const contract = new ethers.Contract(
            convertToEvmAddress(contractAddress),
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.batchFundUsers(
            convertedUsers,
            usdcAmount,
            hbarAmount,
            {
              gasLimit: ethers.utils.hexlify(5_000_000),
            }
          );
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          // ✅ FIX: Convert to BigInt for proper int64 encoding
          const params = new ContractFunctionParameterBuilder()
            .addParam({
              type: "address[]",
              name: "users",
              value: convertedUsers,
            })
            .addParam({
              type: "int64",
              name: "usdcAmount",
              value: BigInt(usdcAmount), // ✅ CHANGED: Must be BigInt
            })
            .addParam({
              type: "int64",
              name: "hbarAmount",
              value: BigInt(hbarAmount), // ✅ CHANGED: Must be BigInt
            });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "batchFundUsers",
            params,
            5_000_000
          );
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Batch fund failed:", error);
        throw new Error(error.message || "Failed to batch fund users");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Check factory balances
   */
  const checkFactoryBalances = useCallback(async () => {
    if (!walletInterface || !accountId) {
      toast.error("Wallet not connected");
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
          AjoFactoryABI.abi,
          signer
        );

        const tx = await contract.checkFactoryBalances({
          gasLimit: ethers.utils.hexlify(3_000_000),
        });
        const receipt = await tx.wait();
        return receipt.transactionHash;
      } else {
        const params = new ContractFunctionParameterBuilder();

        const txId = await walletInterface.executeContractFunction(
          getContractId(contractAddress),
          "checkFactoryBalances",
          params,
          3_000_000
        );
        return txId?.toString() || null;
      }
    } catch (error: any) {
      console.error("Check factory balances failed:", error);
      throw new Error(error.message || "Failed to check factory balances");
    } finally {
      setLoading(false);
    }
  }, [walletInterface, accountId, contractAddress, isMetaMask]);

  /**
   * Complete Ajo initialization
   */
  const completeAjoInitialization = useCallback(
    async (ajoId: number) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
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
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.completeAjoInitialization(ajoId, {
            gasLimit: ethers.utils.hexlify(3_000_000),
          });
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          const params = new ContractFunctionParameterBuilder().addParam({
            type: "uint256",
            name: "ajoId",
            value: ajoId,
          });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "completeAjoInitialization",
            params,
            3_000_000
          );
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Complete Ajo initialization failed:", error);
        throw new Error(
          error.message || "Failed to complete Ajo initialization"
        );
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Create a new Ajo
   */
  const createAjo = useCallback(
    async (
      name: string,
      usesHtsTokens: boolean,
      usesScheduledPayments: boolean
    ) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      if (!contractAddress) {
        toast.error("Contract address not configured");
        throw new Error("Contract address not configured");
      }

      // Validate contract address before proceeding
      try {
        if (isMetaMask) {
          if (!isValidEvmAddress(contractAddress)) {
            throw new Error(`Invalid EVM contract address: ${contractAddress}`);
          }
        } else {
          const hederaAddress = convertToHederaAddress(contractAddress);
          if (!isValidHederaAddress(hederaAddress)) {
            throw new Error(
              `Invalid Hedera contract address: ${hederaAddress}`
            );
          }
        }
      } catch (error: any) {
        console.error("Contract address validation failed:", error);
        toast.error(error.message || "Invalid contract address");
        throw error;
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
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.createAjo(
            name,
            usesHtsTokens,
            usesScheduledPayments,
            {
              gasLimit: ethers.utils.hexlify(5_000_000),
            }
          );
          const receipt = await tx.wait();
          const event = receipt.events?.find(
            (e: any) => e.event === "AjoCreated"
          );
          const ajoId = event?.args?.ajoId?.toNumber();
          return { ajoId, receipt };
        } else {
          const params = new ContractFunctionParameterBuilder()
            .addParam({ type: "string", name: "name", value: name })
            .addParam({
              type: "bool",
              name: "usesHtsTokens",
              value: usesHtsTokens,
            })
            .addParam({
              type: "bool",
              name: "usesScheduledPayments",
              value: usesScheduledPayments,
            });

          console.log("Params before build:", params);
          const hapiParams = params.buildHAPIParams();
          console.log("HAPI Params:", hapiParams);

          const txIdStr = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "createAjo",
            params,
            5_000_000
          );

          if (!txIdStr) {
            throw new Error("Transaction execution failed");
          }

          console.log("Transaction ID:", txIdStr);

          // Wait a bit for transaction to be processed
          await new Promise((resolve) => setTimeout(resolve, 3000));

          // Fetch transaction record to get ajoId
          const transactionId = TransactionId.fromString(txIdStr);
          const recordQuery = new TransactionRecordQuery()
            .setTransactionId(transactionId)
            .setIncludeChildren(true);

          try {
            const record = await recordQuery.execute(hederaClient);

            if (!record.contractFunctionResult) {
              throw new Error("No contract function result in record");
            }

            const ajoId = record.contractFunctionResult
              .getUint256(0)
              .toNumber();
            console.log("Extracted ajoId:", ajoId);
            return { ajoId, receipt: txIdStr };
          } catch (recordError: any) {
            console.error("Failed to fetch transaction record:", recordError);
            // If we can't get the record, try to get total Ajos and use that as ID
            try {
              const total = await totalAjos();
              const ajoId = total; // Assuming the latest Ajo
              console.log("Fallback ajoId (from totalAjos):", ajoId);
              return { ajoId, receipt: txIdStr };
            } catch (fallbackError) {
              throw new Error(
                "Transaction succeeded but could not retrieve Ajo ID. Please check the transaction on HashScan."
              );
            }
          }
        }
      } catch (error: any) {
        console.error("Create Ajo failed:", error);
        throw new Error(error.message || "Failed to create Ajo");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Create HTS tokens for factory
   */
  const createHtsTokensForFactory = useCallback(async () => {
    if (!walletInterface || !accountId) {
      toast.error("Wallet not connected");
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
          AjoFactoryABI.abi,
          signer
        );

        const tx = await contract.createHtsTokensForFactory({
          gasLimit: ethers.utils.hexlify(5_000_000),
        });
        const receipt = await tx.wait();
        return receipt.transactionHash;
      } else {
        const params = new ContractFunctionParameterBuilder();

        const txId = await walletInterface.executeContractFunction(
          getContractId(contractAddress),
          "createHtsTokensForFactory",
          params,
          5_000_000
        );
        return txId?.toString() || null;
      }
    } catch (error: any) {
      console.error("Create HTS tokens failed:", error);
      throw new Error(
        error.message || "Failed to create HTS tokens for factory"
      );
    } finally {
      setLoading(false);
    }
  }, [walletInterface, accountId, contractAddress, isMetaMask]);

  /**
   * Force complete Ajo
   */
  const forceCompleteAjo = useCallback(
    async (ajoId: number) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
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
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.forceCompleteAjo(ajoId, {
            gasLimit: ethers.utils.hexlify(3_000_000),
          });
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          const params = new ContractFunctionParameterBuilder().addParam({
            type: "uint256",
            name: "ajoId",
            value: ajoId,
          });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "forceCompleteAjo",
            params,
            3_000_000
          );
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Force complete Ajo failed:", error);
        throw new Error(error.message || "Failed to force complete Ajo");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Fund user with HTS tokens
   * FIXED: Convert amounts to BigInt for proper int64 handling
   */
  const fundUserWithHtsTokens = useCallback(
    async (user: string, usdcAmount: number, hbarAmount: number) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const userAddress = convertToEvmAddress(user);

        console.log("fundUserWithHtsTokens:", {
          userAddress,
          usdcAmount,
          hbarAmount,
          isMetaMask,
        });

        if (isMetaMask) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          const contract = new ethers.Contract(
            convertToEvmAddress(contractAddress),
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.fundUserWithHtsTokens(
            userAddress,
            usdcAmount,
            hbarAmount,
            {
              gasLimit: ethers.utils.hexlify(3_000_000),
            }
          );
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          // ✅ FIX: For HashPack/WalletConnect, use BigInt for int64 values
          const params = new ContractFunctionParameterBuilder()
            .addParam({ type: "address", name: "user", value: userAddress })
            .addParam({
              type: "int64",
              name: "usdcAmount",
              value: BigInt(usdcAmount), // ✅ CHANGED: Must be BigInt for proper int64 encoding
            })
            .addParam({
              type: "int64",
              name: "hbarAmount",
              value: BigInt(hbarAmount), // ✅ CHANGED: Must be BigInt for proper int64 encoding
            });

          console.log("HAPI Params built:", {
            userAddress,
            usdcAmountBigInt: BigInt(usdcAmount).toString(),
            hbarAmountBigInt: BigInt(hbarAmount).toString(),
          });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "fundUserWithHtsTokens",
            params,
            3_000_000
          );

          console.log("Transaction submitted:", txId?.toString());
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Fund user failed:", error);
        throw new Error(error.message || "Failed to fund user with HTS tokens");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  // ... (rest of the functions remain the same - initializeAjoPhase2-5, setHtsTokensForFactory, etc.)

  /**
   * Initialize Ajo Phase 2
   */
  const initializeAjoPhase2 = useCallback(
    async (ajoId: number) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
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
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.initializeAjoPhase2(ajoId, {
            gasLimit: ethers.utils.hexlify(3_000_000),
          });
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          const params = new ContractFunctionParameterBuilder().addParam({
            type: "uint256",
            name: "ajoId",
            value: ajoId,
          });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "initializeAjoPhase2",
            params,
            3_000_000
          );

          console.log("initializeAjoPhase2 tx:", txId?.toString());
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Initialize Phase 2 failed:", error);
        throw new Error(error.message || "Failed to initialize Ajo Phase 2");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Initialize Ajo Phase 3
   */
  const initializeAjoPhase3 = useCallback(
    async (ajoId: number) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
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
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.initializeAjoPhase3(ajoId, {
            gasLimit: ethers.utils.hexlify(3_000_000),
          });
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          const params = new ContractFunctionParameterBuilder().addParam({
            type: "uint256",
            name: "ajoId",
            value: ajoId,
          });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "initializeAjoPhase3",
            params,
            3_000_000
          );
          console.log("initializeAjoPhase3 tx:", txId?.toString());
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Initialize Phase 3 failed:", error);
        throw new Error(error.message || "Failed to initialize Ajo Phase 3");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Initialize Ajo Phase 4
   */
  const initializeAjoPhase4 = useCallback(
    async (ajoId: number) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
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
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.initializeAjoPhase4(ajoId, {
            gasLimit: ethers.utils.hexlify(3_000_000),
          });
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          const params = new ContractFunctionParameterBuilder().addParam({
            type: "uint256",
            name: "ajoId",
            value: ajoId,
          });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "initializeAjoPhase4",
            params,
            3_000_000
          );
          console.log("initializeAjoPhase4 tx:", txId?.toString());
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Initialize Phase 4 failed:", error);
        throw new Error(error.message || "Failed to initialize Ajo Phase 4");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Initialize Ajo Phase 5
   */
  const initializeAjoPhase5 = useCallback(
    async (ajoId: number) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
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
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.initializeAjoPhase5(ajoId, {
            gasLimit: ethers.utils.hexlify(3_000_000),
          });
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          const params = new ContractFunctionParameterBuilder().addParam({
            type: "uint256",
            name: "ajoId",
            value: ajoId,
          });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "initializeAjoPhase5",
            params,
            3_000_000
          );
          console.log("initializeAjoPhase5 tx:", txId?.toString());
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Initialize Phase 5 failed:", error);
        throw new Error(error.message || "Failed to initialize Ajo Phase 5");
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Set HTS tokens for factory
   */
  const setHtsTokensForFactory = useCallback(
    async (usdcHts: string, hbarHts: string) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const convertedUsdc = isMetaMask
          ? convertToEvmAddress(usdcHts)
          : convertToHederaAddress(usdcHts);
        const convertedHbar = isMetaMask
          ? convertToEvmAddress(hbarHts)
          : convertToHederaAddress(hbarHts);

        if (isMetaMask) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          const contract = new ethers.Contract(
            convertToEvmAddress(contractAddress),
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.setHtsTokensForFactory(
            convertedUsdc,
            convertedHbar,
            {
              gasLimit: ethers.utils.hexlify(3_000_000),
            }
          );
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          const params = new ContractFunctionParameterBuilder()
            .addParam({
              type: "address",
              name: "_usdcHts",
              value: convertedUsdc,
            })
            .addParam({
              type: "address",
              name: "_hbarHts",
              value: convertedHbar,
            });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "setHtsTokensForFactory",
            params,
            3_000_000
          );
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Set HTS tokens failed:", error);
        throw new Error(
          error.message || "Failed to set HTS tokens for factory"
        );
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Set schedule service address
   */
  const setScheduleServiceAddress = useCallback(
    async (scheduleService: string) => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        throw new Error("Wallet not connected");
      }

      setLoading(true);
      try {
        const convertedAddress = isMetaMask
          ? convertToEvmAddress(scheduleService)
          : convertToHederaAddress(scheduleService);

        if (isMetaMask) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          const contract = new ethers.Contract(
            convertToEvmAddress(contractAddress),
            AjoFactoryABI.abi,
            signer
          );

          const tx = await contract.setScheduleServiceAddress(
            convertedAddress,
            {
              gasLimit: ethers.utils.hexlify(3_000_000),
            }
          );
          const receipt = await tx.wait();
          return receipt.transactionHash;
        } else {
          const params = new ContractFunctionParameterBuilder().addParam({
            type: "address",
            name: "_scheduleService",
            value: convertedAddress,
          });

          const txId = await walletInterface.executeContractFunction(
            getContractId(contractAddress),
            "setScheduleServiceAddress",
            params,
            3_000_000
          );
          return txId?.toString() || null;
        }
      } catch (error: any) {
        console.error("Set schedule service failed:", error);
        throw new Error(
          error.message || "Failed to set schedule service address"
        );
      } finally {
        setLoading(false);
      }
    },
    [walletInterface, accountId, contractAddress, isMetaMask]
  );

  /**
   * Get Ajo info
   */
  const getAjo = useCallback(
    async (ajoId: number) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL ||
            "https://testnet.hashio.io/api"
        );
        const contract = new ethers.Contract(
          readAddress,
          AjoFactoryABI.abi,
          provider
        );

        const info = await contract.getAjo(ajoId);
        return {
          ajoCore: info.ajoCore,
          ajoMembers: info.ajoMembers,
          ajoCollateral: info.ajoCollateral,
          ajoPayments: info.ajoPayments,
          ajoGovernance: info.ajoGovernance,
          ajoSchedule: info.ajoSchedule,
          creator: info.creator,
          createdAt: info.createdAt.toNumber(),
          name: info.name,
          isActive: info.isActive,
          usesHtsTokens: info.usesHtsTokens,
          usdcToken: info.usdcToken,
          hbarToken: info.hbarToken,
          hcsTopicId: info.hcsTopicId,
          usesScheduledPayments: info.usesScheduledPayments,
          scheduledPaymentsCount: info.scheduledPaymentsCount.toNumber(),
        };
      } catch (error: any) {
        console.error("Get Ajo failed:", error);
        throw new Error(error.message || "Failed to get Ajo info");
      }
    },
    [readAddress]
  );

  /**
   * Get Ajo schedule contract
   */
  const getAjoScheduleContract = useCallback(
    async (ajoId: number) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL ||
            "https://testnet.hashio.io/api"
        );
        const contract = new ethers.Contract(
          readAddress,
          AjoFactoryABI.abi,
          provider
        );

        return await contract.getAjoScheduleContract(ajoId);
      } catch (error: any) {
        console.error("Get Ajo schedule contract failed:", error);
        throw new Error(error.message || "Failed to get Ajo schedule contract");
      }
    },
    [readAddress]
  );

  /**
   * Get Ajo scheduling status
   */
  const getAjoSchedulingStatus = useCallback(
    async (ajoId: number) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL ||
            "https://testnet.hashio.io/api"
        );
        const contract = new ethers.Contract(
          readAddress,
          AjoFactoryABI.abi,
          provider
        );

        const [isEnabled, scheduledPaymentsCountResult, executedCount] =
          await contract.getAjoSchedulingStatus(ajoId);
        return {
          isEnabled,
          scheduledPaymentsCountResult: scheduledPaymentsCountResult.toNumber(),
          executedCount: executedCount.toNumber(),
        };
      } catch (error: any) {
        console.error("Get Ajo scheduling status failed:", error);
        throw new Error(error.message || "Failed to get Ajo scheduling status");
      }
    },
    [readAddress]
  );

  /**
   * Get all Ajos
   */
  const getAllAjos = useCallback(
    async (offset: number, limit: number) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL ||
            "https://testnet.hashio.io/api"
        );
        const contract = new ethers.Contract(
          readAddress,
          AjoFactoryABI.abi,
          provider
        );

        const [ajoInfos, hasMore] = await contract.getAllAjos(offset, limit);
        setAjoInfos(ajoInfos);
        return {
          ajoInfos: ajoInfos.map((info: any) => ({
            ajoCore: info.ajoCore,
            ajoMembers: info.ajoMembers,
            ajoCollateral: info.ajoCollateral,
            ajoPayments: info.ajoPayments,
            ajoGovernance: info.ajoGovernance,
            ajoSchedule: info.ajoSchedule,
            creator: info.creator,
            createdAt: info.createdAt.toNumber(),
            name: info.name,
            isActive: info.isActive,
            usesHtsTokens: info.usesHtsTokens,
            usdcToken: info.usdcToken,
            hbarToken: info.hbarToken,
            hcsTopicId: info.hcsTopicId,
            usesScheduledPayments: info.usesScheduledPayments,
            scheduledPaymentsCount: info.scheduledPaymentsCount.toNumber(),
          })),
          hasMore,
        };
      } catch (error: any) {
        console.error("Get all Ajos failed:", error);
        throw new Error(error.message || "Failed to get all Ajos");
      }
    },
    [readAddress, setAjoInfos]
  );

  /**
   * Get HTS allowance
   */
  const getHtsAllowance = useCallback(
    async (token: string, owner: string, spender: string) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL ||
            "https://testnet.hashio.io/api"
        );
        const contract = new ethers.Contract(
          readAddress,
          AjoFactoryABI.abi,
          provider
        );

        const convertedToken = convertToEvmAddress(token);
        const convertedOwner = convertToEvmAddress(owner);
        const convertedSpender = convertToEvmAddress(spender);

        const allowance = await contract.getHtsAllowance(
          convertedToken,
          convertedOwner,
          convertedSpender
        );
        return allowance.toNumber();
      } catch (error: any) {
        console.error("Get HTS allowance failed:", error);
        throw new Error(error.message || "Failed to get HTS allowance");
      }
    },
    [readAddress]
  );

  /**
   * Get HTS token addresses
   */
  const getHtsTokenAddresses = useCallback(async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL ||
          "https://testnet.hashio.io/api"
      );
      const contract = new ethers.Contract(
        readAddress,
        AjoFactoryABI.abi,
        provider
      );

      return await contract.getHtsTokenAddresses();
    } catch (error: any) {
      console.error("Get HTS token addresses failed:", error);
      throw new Error(error.message || "Failed to get HTS token addresses");
    }
  }, [readAddress]);

  /**
   * Get total Ajos
   */
  const totalAjos = useCallback(async () => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL ||
          "https://testnet.hashio.io/api"
      );
      const contract = new ethers.Contract(
        readAddress,
        AjoFactoryABI.abi,
        provider
      );

      const total = await contract.totalAjos();
      return total.toNumber();
    } catch (error: any) {
      console.error("Get total Ajos failed:", error);
      throw new Error(error.message || "Failed to get total Ajos");
    }
  }, [readAddress]);

  /**
   * Get operational status
   */

  const getAjoOperationalStatus = useCallback(
    async (ajoId: number, ajo: any) => {
      try {
        const provider = new ethers.providers.JsonRpcProvider(
          import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL ||
            "https://testnet.hashio.io/api"
        );
        const contract = new ethers.Contract(
          readAddress,
          AjoFactoryABI.abi,
          provider
        );

        const status = await contract.getAjoOperationalStatus(ajoId);
        setAjoDetails({
          ajoId: ajoId,
          ajoCore: ajo?.ajoCore,
          totalMembers: bnToString(status.totalMembers),
          //  activeMembers: bnToString(status.activeMembers),
          //  totalCollateralUSDC: bnToString(status.totalCollateralUSDC),
          //  totalCollateralHBAR: bnToString(status.totalCollateralHBAR),
          //  contractBalanceUSDC: bnToString(status.contractBalanceUSDC),
          //  contractBalanceHBAR: bnToString(status.contractBalanceHBAR),
          currentCycle: bnToString(status.currentCycle),
          //  activeToken: String(status.activeToken),
          canAcceptMembers: status.canAcceptMembers,
          hasActiveGovernance: status.hasActiveGovernance,
          hasActiveScheduling: status.hasActiveScheduling,
          //  canProcessPayments: status.canProcessPayments,
          //  canDistributePayouts: status.canDistributePayouts,
        });
        // 🔹 Return the typed object
        return {
          totalMembers: status.totalMembers,
          //  activeMembers: status.activeMembers,
          //  totalCollateralUSDC: status.totalCollateralUSDC,
          //  totalCollateralHBAR: status.totalCollateralHBAR,
          //  contractBalanceUSDC: status.contractBalanceUSDC,
          //  contractBalanceHBAR: status.contractBalanceHBAR,
          currentCycle: status.currentCycle,
          //  activeToken: status.activeToken,
          canAcceptMembers: status.canAcceptMembers,
          hasActiveGovernance: status.hasActiveGovernance,
          hasActiveScheduling: status.hasActiveScheduling,
          //  canProcessPayments: status.canProcessPayments,
          //  canDistributePayouts: status.canDistributePayouts,
        };
      } catch (error: any) {
        console.error("Get operational status failed:", error);
        throw new Error(error.message || "Failed to get operational status");
      }
    },
    []
  );

  return {
    loading,
    associateUserWithHtsTokens,
    batchAssociateUsers,
    batchFundUsers,
    checkFactoryBalances,
    completeAjoInitialization,
    createAjo,
    createHtsTokensForFactory,
    forceCompleteAjo,
    fundUserWithHtsTokens,
    initializeAjoPhase2,
    initializeAjoPhase3,
    initializeAjoPhase4,
    initializeAjoPhase5,
    setHtsTokensForFactory,
    setScheduleServiceAddress,
    getAjo,
    getAjoScheduleContract,
    getAjoSchedulingStatus,
    getAllAjos,
    getHtsAllowance,
    getHtsTokenAddresses,
    totalAjos,
    getAjoOperationalStatus,
    isConnected: !!accountId,
    accountId,
  };
};
