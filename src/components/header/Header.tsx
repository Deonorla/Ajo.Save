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
  ChevronDown,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTokenStore } from "@/store/tokenStore";
import { toast } from "sonner";
import { useWalletInterface } from "../../services/wallets/useWalletInterface";
import { openWalletConnectModal } from "../../services/wallets/walletconnect/walletConnectClient";
import { connectToMetamask } from "../../services/wallets/metamask/metamaskClient";
import { MirrorNodeClient } from "../../services/wallets/mirrorNodeClient";
import { appConfig } from "../../config";
import { AccountId } from "@hashgraph/sdk";
import WalletModal from "../ui/WalletModal";
import { useTokenMinting } from "@/hooks/useTokenMinting";
import { Tooltip, Whisper, Button } from "rsuite";
import "rsuite/Tooltip/styles/index.css";

// Helper to convert Hedera address format (0.0.X) to EVM format (0x...)
const convertHederaToEvmAddress = (hederaAddress: string): string => {
  if (hederaAddress.startsWith("0x")) return hederaAddress;
  const parts = hederaAddress.split(".");
  if (parts.length === 3) {
    const accountNum = parseInt(parts[2]);
    return "0x" + accountNum.toString(16).padStart(40, "0");
  }
  return hederaAddress;
};

// Helper to convert EVM address (0x...) back to Hedera format (0.0.X)
const convertEvmToHederaAddress = (evmAddress: string): string => {
  if (!evmAddress.startsWith("0x")) return evmAddress;
  try {
    const accountNum = parseInt(evmAddress.slice(2), 16);
    return `0.0.${accountNum}`;
  } catch (error) {
    console.error("Failed to convert EVM address to Hedera format:", error);
    return evmAddress;
  }
};

const Header = () => {
  const { hbar, usdc, whbar, setHbar, setAddress, setUsdc, setWhbar } =
    useTokenStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isWalletDropdownOpen, setIsWalletDropdownOpen] = useState(false);
  const [showMintModal, setShowMintModal] = useState(false);

  // Use the unified wallet interface
  const { accountId, walletInterface } = useWalletInterface();
  const connected = !!accountId;

  // Use token minting hook
  const {
    loading: minting,
    mintTokens,
    mintPresetTokens,
    getTokenBalances,
  } = useTokenMinting();

  const [loadingBalances, setLoadingBalances] = useState(false);
  const [walletType, setWalletType] = useState<
    "metamask" | "walletconnect" | null
  >(null);
  const [customUSDC, setCustomUSDC] = useState("1000");
  const [customHBAR, setCustomHBAR] = useState("1000");

  const mirrorNodeClient = new MirrorNodeClient(appConfig.networks.testnet);

  const handleCopy = async () => {
    if (accountId) {
      await navigator.clipboard.writeText(accountId);
      setCopied(true);
      toast.success("Address copied!");
      setTimeout(() => setCopied(false), 1500);
    }
  };

  // Determine which wallet is connected
  useEffect(() => {
    if (accountId) {
      setAddress(accountId);
      if (accountId.startsWith("0x")) {
        setWalletType("metamask");
      } else {
        setWalletType("walletconnect");
      }
    } else {
      setWalletType(null);
    }
  }, [accountId, setAddress]);

  // Get HBAR balance from mirror node
  const getHbarBalance = async () => {
    if (!accountId) return;

    try {
      const hederaAccountId = accountId.startsWith("0x")
        ? convertEvmToHederaAddress(accountId)
        : accountId;

      const accountInfo = await mirrorNodeClient.getAccountInfo(
        AccountId.fromString(hederaAccountId)
      );
      const hbarBal = (accountInfo.balance.balance / 100000000).toFixed(2);
      setHbar(hbarBal);
    } catch (error) {
      console.error("Failed to fetch HBAR balance:", error);
    }
  };

  // Load all balances
  const loadBalances = async () => {
    if (!accountId) return;

    setLoadingBalances(true);
    try {
      const balances = await getTokenBalances();
      setUsdc(parseFloat(balances.usdc).toFixed(2));
      setWhbar(parseFloat(balances.hbar).toFixed(2));
      // Also get HBAR from mirror node
      await getHbarBalance();
    } catch (error) {
      console.error("Failed to load balances:", error);
    } finally {
      setLoadingBalances(false);
    }
  };

  // Fetch balances when connected
  useEffect(() => {
    if (connected) {
      loadBalances();
    }
  }, [connected, accountId]);

  // Handle quick mint
  const handleQuickMint = async () => {
    try {
      await mintPresetTokens();
      toast.success("Successfully minted 1000 USDC + 1000 WHBAR!");
      setShowMintModal(false);
      await loadBalances();
    } catch (error: any) {
      console.error("Mint failed:", error);
    }
  };

  // Handle custom mint
  const handleCustomMint = async () => {
    const usdcAmount = parseFloat(customUSDC);
    const hbarAmount = parseFloat(customHBAR);

    if (
      isNaN(usdcAmount) ||
      isNaN(hbarAmount) ||
      usdcAmount <= 0 ||
      hbarAmount <= 0
    ) {
      toast.error("Please enter valid amounts");
      return;
    }

    try {
      await mintTokens(usdcAmount, hbarAmount);
      toast.success(
        `Successfully minted ${usdcAmount} USDC + ${hbarAmount} WHBAR!`
      );
      setShowMintModal(false);
      await loadBalances();
    } catch (error: any) {
      console.error("Mint failed:", error);
    }
  };

  // Connect wallet handlers
  const handleConnect = () => {
    setIsWalletModalOpen(true);
  };

  const handleConnectWalletConnect = async () => {
    setIsWalletModalOpen(false);
    try {
      await openWalletConnectModal();
      toast.success("Connected via WalletConnect!");
    } catch (error: any) {
      toast.error(`Connection failed: ${error.message || "Unknown error"}`);
    }
  };

  const handleConnectMetamask = async () => {
    setIsWalletModalOpen(false);
    try {
      const accounts = await connectToMetamask();
      if (accounts.length > 0) {
        toast.success("Connected via MetaMask!");
      }
    } catch (error: any) {
      toast.error(`Connection failed: ${error.message || "Unknown error"}`);
    }
  };

  const handleDisconnect = () => {
    if (walletInterface) {
      walletInterface.disconnect();
      setUsdc("");
      setWhbar("");
      setHbar("");
      toast.success("Wallet disconnected");
    }
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
    <>
      {/* Desktop Navigation */}
      <nav className="hidden lg:block fixed bg-gradient-to-r from-background via-background to-background/95 backdrop-blur-xl border-b border-primary/20 w-full top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div
              className="flex items-center space-x-3 shrink-0 cursor-pointer"
              onClick={() => navigate("/dashboard")}
            >
              <div className="w-10 h-10 bg-gradient-to-br from-primary via-primary/90 to-accent rounded-xl flex items-center justify-center shadow-lg hover:shadow-primary/50 transition-all duration-300 hover:scale-110">
                <Coins className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Ajo.Save
              </span>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              {[
                { id: "dashboard", label: "Dashboard", icon: Home },
                { id: "profile", label: "Profile", icon: User },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => navigateTo(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/30"
                      : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Wallet Section */}
            <div className="flex items-center gap-3 shrink-0">
              {accountId ? (
                <div className="relative">
                  <button
                    onClick={() =>
                      setIsWalletDropdownOpen(!isWalletDropdownOpen)
                    }
                    className="flex items-center gap-3 bg-gradient-to-r from-primary/20 to-accent/20 hover:from-primary/30 hover:to-accent/30 border border-primary/30 px-4 py-2 rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-primary/20"
                  >
                    <div className="flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-primary" />
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-muted-foreground">
                          Balance
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-foreground">
                            {hbar} HBAR
                          </span>
                          <span className="text-xs text-muted-foreground">
                            |
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {usdc} USDC
                          </span>
                        </div>
                      </div>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${
                        isWalletDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isWalletDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 bg-card border border-primary/20 rounded-xl shadow-2xl overflow-hidden z-50">
                      <div className="p-4 bg-gradient-to-r from-primary/10 to-accent/10 border-b border-primary/20">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                            Connected Wallet
                          </span>
                          <button
                            onClick={loadBalances}
                            disabled={loadingBalances}
                            className="p-1 hover:bg-primary/10 rounded-lg transition-colors"
                          >
                            <RefreshCw
                              className={`h-4 w-4 text-primary ${
                                loadingBalances ? "animate-spin" : ""
                              }`}
                            />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-sm font-medium text-foreground">
                            {walletType === "metamask"
                              ? "MetaMask"
                              : "WalletConnect"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-mono">
                            {accountId.startsWith("0x")
                              ? `${accountId.slice(0, 8)}...${accountId.slice(
                                  -6
                                )}`
                              : `${accountId}`}
                          </span>
                          <button
                            onClick={handleCopy}
                            className="p-1 hover:bg-primary/10 rounded transition-colors"
                          >
                            {copied ? (
                              <Check className="h-3 w-3 text-green-500" />
                            ) : (
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Balances */}
                      <div className="p-4 space-y-3">
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">
                            USDC Balance
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            {usdc}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">
                            WHBAR Balance
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            {whbar}
                          </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                          <span className="text-sm text-muted-foreground">
                            HBAR Balance
                          </span>
                          <span className="text-lg font-bold text-foreground">
                            {hbar}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="p-4 border-t border-primary/20 space-y-2">
                        <button
                          onClick={() => {
                            setShowMintModal(true);
                            setIsWalletDropdownOpen(false);
                          }}
                          disabled={minting}
                          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white px-4 py-2 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <BadgeDollarSign className="h-4 w-4" />
                          {minting ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Minting...</span>
                            </>
                          ) : (
                            <span>Mint Tokens</span>
                          )}
                        </button>
                        <button
                          onClick={handleDisconnect}
                          className="w-full flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-600 border border-red-600/30 px-4 py-2 rounded-lg font-semibold transition-all duration-300"
                        >
                          <LogOut className="h-4 w-4" />
                          Disconnect
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-6 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
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
      <nav className="lg:hidden bg-gradient-to-r from-background via-background to-background/95 backdrop-blur-xl border-b border-primary/20 fixed w-full top-0 z-50 shadow-lg">
        <div className="px-4 py-3 flex items-center justify-between">
          <div
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            <div className="w-9 h-9 bg-gradient-to-br from-primary via-primary/90 to-accent rounded-xl flex items-center justify-center shadow-lg">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Ajo.Save
            </span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 hover:bg-primary/10 rounded-lg transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6 text-foreground" />
            ) : (
              <Menu className="h-6 w-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-primary/20 bg-background/95 backdrop-blur-xl px-4 py-4 space-y-3 max-h-[calc(100vh-4rem)] overflow-y-auto">
            {/* Navigation Links */}
            {[
              { id: "dashboard", label: "Dashboard", icon: Home },
              { id: "profile", label: "Profile", icon: User },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigateTo(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg"
                    : "text-muted-foreground hover:bg-primary/10"
                }`}
              >
                <tab.icon className="h-5 w-5" />
                {tab.label}
              </button>
            ))}

            <div className="pt-3 border-t border-primary/20">
              {accountId ? (
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl p-4 shadow-lg space-y-4">
                  {/* Wallet Info */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span className="text-sm font-medium text-foreground">
                        {walletType === "metamask"
                          ? "MetaMask"
                          : "WalletConnect"}
                      </span>
                    </div>
                    <button
                      onClick={loadBalances}
                      disabled={loadingBalances}
                      className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors"
                    >
                      <RefreshCw
                        className={`h-4 w-4 text-primary ${
                          loadingBalances ? "animate-spin" : ""
                        }`}
                      />
                    </button>
                  </div>

                  {/* Address */}
                  <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg">
                    <span className="text-xs font-mono text-muted-foreground">
                      {accountId.startsWith("0x")
                        ? `${accountId.slice(0, 8)}...${accountId.slice(-6)}`
                        : `${accountId}`}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-1.5 hover:bg-primary/10 rounded transition-colors"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>

                  {/* Balances */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-background/50 p-3 rounded-lg">
                      <span className="text-xs text-muted-foreground block mb-1">
                        USDC
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {usdc}
                      </span>
                    </div>
                    <div className="bg-background/50 p-3 rounded-lg">
                      <span className="text-xs text-muted-foreground block mb-1">
                        WHBAR
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {whbar}
                      </span>
                    </div>
                    <div className="bg-background/50 p-3 rounded-lg">
                      <span className="text-xs text-muted-foreground block mb-1">
                        HBAR
                      </span>
                      <span className="text-sm font-bold text-foreground">
                        {hbar}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setShowMintModal(true);
                        setIsMobileMenuOpen(false);
                      }}
                      disabled={minting}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 text-white px-4 py-2.5 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50"
                    >
                      <BadgeDollarSign className="h-4 w-4" />
                      {minting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Minting...</span>
                        </>
                      ) : (
                        <span>Mint Tokens</span>
                      )}
                    </button>
                    <button
                      onClick={handleDisconnect}
                      className="w-full flex items-center justify-center gap-2 bg-red-600/10 text-red-600 border border-red-600/30 px-4 py-2.5 rounded-lg font-semibold transition-all duration-300"
                    >
                      <LogOut className="h-4 w-4" />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleConnect}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white px-6 py-3 rounded-xl text-sm font-semibold shadow-lg transition-all duration-300"
                >
                  <Wallet className="h-5 w-5" />
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Floating Create Ajo Button */}
      <div className="fixed bottom-6 right-6 z-40 cursor-pointer">
        <Whisper placement="auto" speaker={<Tooltip>Create Ajo</Tooltip>}>
          <button
            onClick={() => navigate("/ajo/create-ajo")}
            className="bg-gradient-to-r from-primary to-accent text-white p-4 rounded-full shadow-2xl hover:shadow-primary/50 transition-all duration-300 hover:scale-110 group"
          >
            <Coins className="h-6 w-6 group-hover:rotate-180 transition-transform duration-300" />
          </button>
        </Whisper>
      </div>

      {/* Mint Modal */}
      {showMintModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-primary/20 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BadgeDollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">
                    Mint Tokens
                  </h3>
                </div>
                <button
                  onClick={() => setShowMintModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Quick Mint */}
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-primary" />
                  Quick Mint (Recommended)
                </h4>
                <button
                  onClick={handleQuickMint}
                  disabled={minting}
                  className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-6 py-4 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {minting ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Minting...</span>
                    </div>
                  ) : (
                    <span>Mint 1,000 USDC + 1,000 WHBAR</span>
                  )}
                </button>
                {/* <p className="text-xs text-muted-foreground mt-2 text-center">
                  Perfect amount to join an Ajo and participate
                </p> */}
              </div>

              {/* Custom Amount */}
              <div className="pt-6 border-t border-primary/20">
                <h4 className="text-sm font-semibold text-foreground mb-3">
                  Custom Amount
                </h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      USDC Amount
                    </label>
                    <input
                      type="number"
                      value={customUSDC}
                      onChange={(e) => setCustomUSDC(e.target.value)}
                      placeholder="1000"
                      className="w-full px-4 py-3 bg-background border rounded-lg focus:ring-0 outline-none focus:ring-primary focus:border-primary transition-colors text-foreground"
                      disabled={minting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                      WHBAR Amount
                    </label>
                    <input
                      type="number"
                      value={customHBAR}
                      onChange={(e) => setCustomHBAR(e.target.value)}
                      placeholder="1000"
                      className="w-full px-4 py-3 bg-background border rounded-lg focus:ring-0 outline-none focus:ring-primary focus:border-primary transition-colors text-foreground"
                      disabled={minting}
                    />
                  </div>
                  <button
                    onClick={handleCustomMint}
                    disabled={minting}
                    className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground px-6 py-3 rounded-lg font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {minting ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        <span>Minting...</span>
                      </div>
                    ) : (
                      <span>Mint Custom Amount</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-xs text-blue-900 dark:text-blue-100">
                  ℹ️ These are test tokens on Hedera Testnet. You'll need tokens
                  to join an Ajo and participate in the savings cycle.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Selection Modal */}
      <WalletModal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        onSelectWalletConnect={handleConnectWalletConnect}
        onSelectMetamask={handleConnectMetamask}
      />

      {/* Click outside to close dropdown */}
      {isWalletDropdownOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsWalletDropdownOpen(false)}
        />
      )}
    </>
  );
};

export default Header;
