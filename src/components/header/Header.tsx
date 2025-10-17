/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Wallet,
  Menu,
  X,
  Home,
  User,
  Coins,
  BadgeDollarSign,
  LogOut,
  Copy,
  Check,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTokenStore } from "@/store/tokenStore";
import FormattedBalance from "@/utils/FormatedBalance";
import { toast } from "sonner";
import { ethers } from "ethers";
import { useWalletInterface } from "../../services/wallets/useWalletInterface";
import { openWalletConnectModal } from "../../services/wallets/walletconnect/walletConnectClient";
import { connectToMetamask } from "../../services/wallets/metamask/metamaskClient";
import { MirrorNodeClient } from "../../services/wallets/mirrorNodeClient";
import { appConfig } from "../../config";
import { AccountId, TokenId } from "@hashgraph/sdk";
import WalletModal from "../ui/WalletModal";

// --- Mock ERC20/HTS Facade ABI ---
const TOKEN_ABI = ["function mint(uint256 amount) external"];

// Helper to convert Hedera address format (0.0.X) to EVM format (0x...)
const convertHederaToEvmAddress = (hederaAddress: string): string => {
  if (hederaAddress.startsWith("0x")) {
    return hederaAddress;
  }

  const parts = hederaAddress.split(".");
  if (parts.length === 3) {
    const accountNum = parseInt(parts[2]);
    return "0x" + accountNum.toString(16).padStart(40, "0");
  }

  return hederaAddress;
};

// Helper to convert EVM address (0x...) back to Hedera format (0.0.X)
const convertEvmToHederaAddress = (evmAddress: string): string => {
  if (!evmAddress.startsWith("0x")) {
    return evmAddress;
  }

  try {
    const accountNum = parseInt(evmAddress.slice(2), 16);
    return `0.0.${accountNum}`;
  } catch (error) {
    console.error("Failed to convert EVM address to Hedera format:", error);
    return evmAddress;
  }
};

const Header = () => {
  const rawUsdcAddress = import.meta.env.VITE_MOCK_USDC_ADDRESS;
  const usdcContractId = convertHederaToEvmAddress(rawUsdcAddress);

  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { usdc, loading, setUsdc } = useTokenStore();
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);

  // Use the unified wallet interface
  const { accountId, walletInterface } = useWalletInterface();
  const connected = !!accountId;
  console.log("accountId", accountId);
  const [balance, setBalance] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);
  const [isAssociated, setIsAssociated] = useState(false);
  const [walletType, setWalletType] = useState<
    "metamask" | "walletconnect" | null
  >(null);

  const MINT_AMOUNT = ethers.utils.parseUnits("100", 6);
  const mirrorNodeClient = new MirrorNodeClient(appConfig.networks.testnet);

  const handleCopy = async () => {
    if (accountId) {
      await navigator.clipboard.writeText(accountId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Determine which wallet is connected
  useEffect(() => {
    if (accountId) {
      if (accountId.startsWith("0x")) {
        setWalletType("metamask");
      } else {
        setWalletType("walletconnect");
      }
    } else {
      setWalletType(null);
    }
  }, [accountId]);

  // Get HBAR balance
  const getHbarBalance = async () => {
    if (!accountId) return;

    try {
      const hederaAccountId = accountId.startsWith("0x")
        ? convertEvmToHederaAddress(accountId)
        : accountId;

      const accountInfo = await mirrorNodeClient.getAccountInfo(
        AccountId.fromString(hederaAccountId)
      );
      const hbarBalance = (accountInfo.balance.balance / 100000000).toFixed(2);
      setBalance(hbarBalance);
      console.log("My Hbar Balance:", hbarBalance);
    } catch (error) {
      console.error("Failed to fetch HBAR balance:", error);
    }
  };

  // Check token association on mount and when wallet connects
  useEffect(() => {
    const checkAssociation = async () => {
      if (!connected || !accountId || !usdcContractId) return;

      try {
        const hederaTokenId = convertEvmToHederaAddress(usdcContractId);
        const hederaAccountId = accountId.startsWith("0x")
          ? convertEvmToHederaAddress(accountId)
          : accountId;

        console.log("Checking association for token:", hederaTokenId);

        const tokenBalances =
          await mirrorNodeClient.getAccountTokenBalancesWithTokenInfo(
            AccountId.fromString(hederaAccountId)
          );

        const tokenBalance = tokenBalances.find(
          (t) => t.token_id === hederaTokenId
        );
        if (tokenBalance) {
          setIsAssociated(true);
          const decimals = parseInt(tokenBalance.info.decimals);
          const balance = (
            tokenBalance.balance / Math.pow(10, decimals)
          ).toFixed(decimals);
          console.log("Token already associated. Balance:", balance);
          setUsdc(balance);
        } else {
          setIsAssociated(false);
        }
      } catch (error) {
        console.log("Token not yet associated or error checking:", error);
        setIsAssociated(false);
      }
    };

    checkAssociation();
  }, [connected, accountId, usdcContractId, setUsdc]);

  // Fetch balances when connected
  useEffect(() => {
    if (connected) {
      getHbarBalance();
    }
  }, [connected, accountId]);

  /**
   * Connect wallet - shows modal to choose between WalletConnect and MetaMask
   */
  const handleConnect = () => {
    setIsWalletModalOpen(true);
  };
  /**
   * Handles WalletConnect selection
   */
  const handleConnectWalletConnect = async () => {
    setIsWalletModalOpen(false); // Close the modal first
    try {
      await openWalletConnectModal();
      toast.success("Connected via WalletConnect!");
    } catch (error: any) {
      toast.error(`Connection failed: ${error.message || "Unknown error"}`);
    }
  };

  /**
   * Handles MetaMask selection
   */
  const handleConnectMetamask = async () => {
    setIsWalletModalOpen(false); // Close the modal first
    try {
      const accounts = await connectToMetamask();
      if (accounts.length > 0) {
        toast.success("Connected via MetaMask!");
      }
    } catch (error: any) {
      toast.error(`Connection failed: ${error.message || "Unknown error"}`);
    }
  };

  /**
   * Disconnect wallet
   */
  const handleDisconnect = () => {
    if (walletInterface) {
      walletInterface.disconnect();
      setBalance(null);
      setUsdc("");
      setIsAssociated(false);
      toast.success("Wallet disconnected");
    }
  };

  /**
   * Mints HTS USDC tokens
   * Works with both MetaMask and WalletConnect
   */
  const handleMint = () => {
    if (!connected || !accountId) {
      toast.error("Wallet not connected.");
      return;
    }

    if (!walletInterface) {
      toast.error("Wallet interface not available.");
      return;
    }

    if (
      !usdcContractId ||
      usdcContractId === "0x0000000000000000000000000000000000000000"
    ) {
      toast.error(
        "USDC token address not configured. Please check your .env file."
      );
      return;
    }

    setMinting(true);
    // eslint-disable-next-line no-async-promise-executor
    const mintPromise = new Promise<string>(async (resolve, reject) => {
      try {
        console.log("=== MINT TRANSACTION START ===");
        console.log("Wallet Type:", walletType);

        // --- PHASE 1: TOKEN ASSOCIATION ---
        if (!isAssociated) {
          toast.info("Associating token with your account...");
          try {
            const hederaTokenId = convertEvmToHederaAddress(usdcContractId);
            await walletInterface.associateToken(
              TokenId.fromString(hederaTokenId)
            );
            setIsAssociated(true);
            toast.success("Token associated successfully!");
            await new Promise((resolve) => setTimeout(resolve, 2000));
          } catch (assocError: any) {
            if (
              assocError.message?.includes(
                "TOKEN_ALREADY_ASSOCIATED_TO_ACCOUNT"
              )
            ) {
              setIsAssociated(true);
              toast.info("Token already associated");
            } else {
              throw new Error(
                `Token association failed: ${assocError.message}`
              );
            }
          }
        } else {
          console.log("✅ Token already associated, skipping association");
        }

        // --- PHASE 2: MINT TRANSACTION ---
        toast.info("Preparing mint transaction...");

        // For MetaMask, use ethers directly
        if (walletType === "metamask") {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();

          const contractInterface = new ethers.utils.Interface(TOKEN_ABI);
          const mintData = contractInterface.encodeFunctionData("mint", [
            MINT_AMOUNT,
          ]);

          console.log("✅ Transaction data encoded");
          console.log("Contract address:", usdcContractId);
          console.log(
            "Mint amount:",
            ethers.utils.formatUnits(MINT_AMOUNT, 6),
            "USDC"
          );

          toast.info("Sending mint transaction...");

          const txRequest = {
            to: usdcContractId,
            data: mintData,
            gasLimit: ethers.utils.hexlify(3_000_000),
          };

          const txResponse = await signer.sendTransaction(txRequest);
          const txHash = txResponse.hash;

          console.log("✅ Transaction sent. Hash:", txHash);
          toast.info("Waiting for confirmation...");

          const receipt = await provider.waitForTransaction(txHash, 1, 30000);

          if (!receipt) {
            throw new Error("Transaction receipt not found after 30 seconds");
          }

          if (receipt.status !== 1) {
            throw new Error(
              `Transaction failed on chain. Status: ${receipt.status}`
            );
          }

          console.log("✅ Transaction confirmed!");
          resolve(txHash);
        }
        // For WalletConnect, use the wallet interface
        else if (walletType === "walletconnect") {
          const { ContractFunctionParameterBuilder } = await import(
            "../../services/wallets/contractFunctionParameterBuilder"
          );
          const { ContractId } = await import("@hashgraph/sdk");

          const functionParams =
            new ContractFunctionParameterBuilder().addParam({
              type: "uint256",
              name: "amount",
              value: MINT_AMOUNT.toString(),
            });

          toast.info("Sending mint transaction...");

          const txId = await walletInterface.executeContractFunction(
            ContractId.fromString(convertEvmToHederaAddress(usdcContractId)),
            "mint",
            functionParams,
            3_000_000
          );

          if (!txId) {
            throw new Error("Transaction failed");
          }

          console.log("✅ Transaction sent. ID:", txId);
          toast.info("Waiting for confirmation...");

          // Wait for mirror node to update
          await new Promise((resolve) => setTimeout(resolve, 5000));

          console.log("✅ Transaction confirmed!");
          resolve(txId.toString());
        } else {
          throw new Error("Unknown wallet type");
        }

        // --- PHASE 3: UPDATE BALANCE ---
        toast.info("Updating balance...");
        await new Promise((resolve) => setTimeout(resolve, 3000));

        try {
          const hederaTokenId = convertEvmToHederaAddress(usdcContractId);
          const hederaAccountId = accountId.startsWith("0x")
            ? convertEvmToHederaAddress(accountId)
            : accountId;

          const tokenBalances =
            await mirrorNodeClient.getAccountTokenBalancesWithTokenInfo(
              AccountId.fromString(hederaAccountId)
            );

          const tokenBalance = tokenBalances.find(
            (t) => t.token_id === hederaTokenId
          );
          if (tokenBalance) {
            const decimals = parseInt(tokenBalance.info.decimals);
            const newBalance = (
              tokenBalance.balance / Math.pow(10, decimals)
            ).toFixed(decimals);
            setUsdc(newBalance);
            console.log("✅ New balance:", newBalance);
          }
        } catch (balError) {
          console.warn("Could not fetch updated balance:", balError);
        }

        console.log("=== MINT TRANSACTION SUCCESS ===");
      } catch (error: any) {
        console.error("=== MINT TRANSACTION FAILED ===");
        console.error("Full error:", error);

        let errorMessage = "Minting transaction failed";

        if (error.reason) {
          errorMessage = error.reason;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else if (error.message) {
          const message = error.message.split("\n")[0];
          if (message.length < 200) {
            errorMessage = message;
          }
        }

        reject(new Error(errorMessage));
      } finally {
        setMinting(false);
      }
    });

    const mintAmountDisplay = ethers.utils.formatUnits(MINT_AMOUNT, 6);

    toast.promise(mintPromise, {
      loading: `Minting ${mintAmountDisplay} USDC...`,
      success: (hash) =>
        `Successfully minted ${mintAmountDisplay} USDC! TX: ${hash.slice(
          0,
          8
        )}...`,
      error: (err) => `${err.message || "Unknown error"}`,
    });
  };

  useEffect(() => {
    const currentPath = location.pathname.replace("/", "") || "dashboard";
    setActiveTab(currentPath || "dashboard");
  }, [location]);

  const navigateTo = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/${tabId}`);
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="bg-background">
      {/* Desktop Navigation */}
      <nav className="hidden lg:block fixed bg-background border-b border-ring w-full top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Ajo.Save</span>
            </div>

            <div className="flex items-center gap-4 flex-wrap justify-center">
              {[
                { id: "dashboard", label: "Dashboard", icon: Home },
                { id: "profile", label: "Profile", icon: User },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => navigateTo(tab.id)}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground hover:text-primary"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {accountId ? (
                <div className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-primary/15 px-3 py-2 rounded-lg text-sm font-medium">
                  <Wallet className="h-4 w-4 text-primary" />
                  <FormattedBalance
                    value={usdc ?? ""}
                    symbol="USDC"
                    loading={loading}
                  />
                  <FormattedBalance
                    value={balance ?? ""}
                    symbol="HBAR"
                    loading={loading}
                  />

                  <button
                    onClick={handleMint}
                    className="ml-2 flex items-center gap-1 text-primary hover:text-primary/80 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={minting || !connected}
                  >
                    <BadgeDollarSign className="h-4 w-4" />
                    {minting ? (
                      <div className="flex items-center">
                        <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                        minting
                      </div>
                    ) : (
                      "Mint USDC"
                    )}
                  </button>
                  <span className="hidden xl:block ml-2 text-xs text-white ">
                    {walletType === "metamask" ? "MetaMask" : "WalletConnect"}
                  </span>
                  <button
                    onClick={handleDisconnect}
                    className="ml-2 flex items-center gap-1 text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden bg-background border-b border-primary/25 fixed w-full top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Ajo.Save</span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white hover:text-primary rounded-lg"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-primary/25 bg-background px-4 py-3 space-y-2">
            {[
              { id: "dashboard", label: "Dashboard", icon: Home },
              { id: "profile", label: "Profile", icon: User },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigateTo(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/15 text-primary"
                    : "text-white hover:bg-primary/20"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}

            <div className="pt-4 border-t border-primary/25">
              {accountId ? (
                <div className="bg-primary/15 border border-primary/25 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Balance</span>
                    <div className="flex flex-col gap-2 items-end">
                      <span className="text-white font-semibold">
                        {usdc} USDC
                      </span>
                      <span className="text-white font-semibold">
                        {balance} HBAR
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Wallet</span>
                    <span className="text-white font-medium text-xs">
                      {accountId?.slice(0, 6)}...{accountId?.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Type</span>
                    <span className="text-white text-sm">
                      {walletType === "metamask" ? "MetaMask" : "WalletConnect"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-3 py-1 text-sm rounded-lg border border-primary text-white hover:bg-primary/20"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4 text-white" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                      onClick={handleMint}
                      className="px-3 py-1 text-xs flex justify-center items-center gap-1 rounded-lg border border-primary text-primary hover:text-primary/80 disabled:opacity-50"
                      disabled={minting || !connected}
                    >
                      <BadgeDollarSign className="h-4 w-4" />
                      {minting ? (
                        <div className="flex items-center">
                          <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"></div>
                          minting
                        </div>
                      ) : (
                        "Mint"
                      )}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
                    >
                      <LogOut className="h-4 w-4" />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  <Wallet className="h-4 w-4" />
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      <div className="fixed bottom-6 right-6 z-10">
        <button
          onClick={() => navigate("/ajo/create-ajo")}
          className="bg-primary text-white p-4 rounded-full shadow-lg hover:bg-primary/90 transition-colors cursor-pointer"
        >
          <Coins className="h-6 w-6" />
        </button>
      </div>
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSelectWalletConnect={handleConnectWalletConnect}
        onSelectMetamask={handleConnectMetamask}
      />
    </div>
  );
};

export default Header;
