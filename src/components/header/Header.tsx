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
import { useWallet } from "../../auth/WalletContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useTokenStore } from "@/store/tokenStore";
import FormattedBalance from "@/utils/FormatedBalance";
import { toast } from "sonner";
import { ethers, Contract } from "ethers";

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

  const {
    connected,
    address,
    balance,
    network,
    connect,
    disconnect,
    getBalance,
    associateToken,
    getTokenBalance,
    dAppSigner,
  } = useWallet();

  const [minting, setMinting] = useState(false);
  const [isAssociated, setIsAssociated] = useState(false);

  const MINT_AMOUNT = ethers.utils.parseUnits("100", 6);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const getHbarBalance = async () => {
    const balance = await getBalance();
    console.log("My Hbar Balance:", balance);
  };

  // Check token association on mount and when wallet connects
  useEffect(() => {
    const checkAssociation = async () => {
      if (!connected || !address || !usdcContractId) return;

      try {
        const hederaTokenId = convertEvmToHederaAddress(usdcContractId);
        console.log("Checking association for token:", hederaTokenId);

        const balance = await getTokenBalance(hederaTokenId);
        setIsAssociated(true);
        console.log("Token already associated. Balance:", balance);
        if (balance) {
          setUsdc(balance);
        }
      } catch (error) {
        console.log("Token not yet associated or error checking:", error);
        setIsAssociated(false);
      }
    };

    checkAssociation();
  }, [connected, address, usdcContractId, getTokenBalance, setUsdc]);

  /**
   * Mints HTS USDC tokens using the JSON-RPC relay directly
   * Bypasses Ethers Contract to avoid signer compatibility issues
   */
  const handleMint = () => {
    if (!connected || !address) {
      toast.error("Wallet not connected.");
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
    const mintPromise = new Promise<string>((resolve, reject) => {
      const mintLogic = async () => {
        try {
          console.log("=== MINT TRANSACTION START ===");

          // --- PHASE 1: TOKEN ASSOCIATION ---
          if (!isAssociated) {
            toast.info("Associating token with your account...");
            try {
              await associateToken(usdcContractId);
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

          // --- PHASE 2: PREPARE TRANSACTION DATA ---
          toast.info("Preparing mint transaction...");

          if (!dAppSigner) {
            throw new Error(
              "dAppSigner not available. Please reconnect your wallet."
            );
          }

          // The dAppSigner is the object responsible for sending and signing
          const dAppSignerEthers = dAppSigner as unknown as ethers.Signer;
          const providerForReceipt = dAppSignerEthers.provider; // Ethers Signers have a provider property

          if (!providerForReceipt) {
            throw new Error("Provider not available from dAppSigner");
          }

          console.log("✅ Signer and Provider obtained");

          // Create contract interface to encode the function call
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

          // --- PHASE 3: SEND TRANSACTION USING SIGNER ---
          toast.info("Sending mint transaction...");

          const txRequest = {
            to: usdcContractId,
            data: mintData,
            // 3,000,000 gas limit is standard for Hedera HTS/Precompiles
            gasLimit: ethers.utils.hexlify(3_000_000),
          };

          console.log("Transaction request (via Signer):", txRequest);

          // 💡 CRITICAL FIX: Use dAppSigner.sendTransaction (Ethers Signer method)
          const txResponse = await dAppSignerEthers.sendTransaction(txRequest);

          const txHash = txResponse.hash; // Get the transaction hash

          console.log("✅ Transaction sent. Hash:", txHash);
          toast.info("Waiting for confirmation...");

          // --- PHASE 4: WAIT FOR RECEIPT ---

          // Ethers v5 utility to wait for a transaction to be confirmed
          const receipt = await providerForReceipt.waitForTransaction(
            txHash,
            1,
            30000
          ); // 1 confirmation, 30s timeout

          if (!receipt) {
            throw new Error("Transaction receipt not found after 30 seconds");
          }

          if (receipt.status !== 1) {
            throw new Error(
              `Transaction failed on chain. Status: ${receipt.status}`
            );
          }

          console.log("✅ Transaction confirmed!");
          console.log("Receipt:", receipt);

          // --- PHASE 5: UPDATE BALANCE ---
          toast.info("Updating balance...");

          // Wait for mirror node to update
          await new Promise((resolve) => setTimeout(resolve, 3000));

          try {
            const hederaTokenId = convertEvmToHederaAddress(usdcContractId);
            const newBalance = await getTokenBalance(hederaTokenId);
            if (newBalance) {
              setUsdc(newBalance);
              console.log("✅ New balance:", newBalance);
            }
          } catch (balError) {
            console.warn("Could not fetch updated balance:", balError);
          }

          console.log("=== MINT TRANSACTION SUCCESS ===");
          resolve(txHash);
        } catch (error: any) {
          console.error("=== MINT TRANSACTION FAILED ===");
          console.error("Full error:", error);

          // ... (Error handling logic remains the same) ...

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
      };

      mintLogic();
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
    if (connected) {
      getHbarBalance();
    }
  }, [location, connected]);

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
              {connected ? (
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
                    {network}
                  </span>
                  <button
                    onClick={disconnect}
                    className="ml-2 flex items-center gap-1 text-red-600 hover:text-red-700 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connect}
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
              {connected ? (
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
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Network</span>
                    <span className="text-white text-sm">{network}</span>
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
                      onClick={disconnect}
                      className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-red-600 text-white hover:bg-red-700"
                    >
                      <LogOut className="h-4 w-4" />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={connect}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  <Wallet className="h-4 w-4" />
                  Connect Hashpack
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
    </div>
  );
};

export default Header;
