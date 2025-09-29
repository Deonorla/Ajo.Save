import {
  Wallet,
  Menu,
  X,
  Home,
  Users,
  Copy,
  LogOut,
  Check,
  User,
  Coins,
  BadgeDollarSign,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useWallet } from "../../auth/WalletContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useTokenStore } from "@/store/tokenStore";
import FormattedBalance from "@/utils/FormatedBalance";
import { useTokenContract } from "@/hooks/useTokenContract";
import { ethers } from "ethers";
import { toast } from "sonner";

const Header = () => {
  const usdcContract = import.meta.env.VITE_MOCK_USDC_ADDRESS;
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { usdc, whbar, loading, setUsdc } = useTokenStore();
  const { connected, address, network, connectMetaMask, disconnect } =
    useWallet();
  const { getBalance, faucet } = useTokenContract(usdcContract);
  const [minting, setMinting] = useState(false);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleMint = async () => {
    try {
      setMinting(true);
      const tx = await faucet(); // mint 10000 USDC (6 decimals)
      console.log("Mint tx:", tx);
      toast.success("1000 usdc minted successfully");
      if (address) {
        const balance = await getBalance(address);
        setUsdc(ethers.utils.formatUnits(balance, 6));
        console.log("New balance:", ethers.utils.formatUnits(balance, 6));
      }
    } catch (err) {
      console.error("Mint failed", err);
    } finally {
      setMinting(false);
    }
  };
  useEffect(() => {
    const currentPath = location.pathname.replace("/", "") || "dashboard";
    setActiveTab(currentPath || "dashboard");
  }, [location]);

  const navigateTo = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/${tabId}`);
    setIsMobileMenuOpen(false); // close mobile menu after nav
  };

  return (
    <div className="bg-background">
      {/* Desktop Navigation */}
      <nav className="hidden lg:block fixed bg-background border-b border-ring w-full top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2 shrink-0">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Ajo.Save</span>
            </div>

            {/* Nav Tabs */}
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

            {/* Wallet Section */}
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
                    value={whbar ?? ""}
                    symbol="WHBAR"
                    loading={loading}
                  />
                  {/* <span className=" text-white/50 truncate max-w-[100px]">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span> */}
                  {/* <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-primary/20 rounded"
                    title="Copy Address"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4 text-white" />
                    )}
                  </button> */}
                  <button
                    onClick={handleMint}
                    className="ml-2 flex items-center gap-1 text-primary hover:text-primary/80 cursor-pointer"
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
                  onClick={connectMetaMask}
                  className="flex items-center gap-2 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  <Wallet className="h-4 w-4" />
                  Connect MetaMask
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className="lg:hidden bg-background border-b border-primary/25 fixed w-full top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Ajo.Save</span>
          </div>

          {/* Hamburger */}
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

        {/* Mobile Dropdown */}
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

            {/* Wallets on Mobile */}
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
                        {whbar} WHBAR
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Wallet</span>
                    <span className="text-white font-medium">
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
                      className=" px-3 py-1 flex justify-center items-center gap-1 rounded-lg border border-primary  text-primary hover:text-primary/80"
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
                  onClick={connectMetaMask}
                  className="w-full flex items-center justify-center gap-2 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-primary/90"
                >
                  <Wallet className="h-4 w-4" />
                  Connect MetaMask
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Floating Action Button (Mobile) */}
      <div className=" fixed bottom-6 right-6 z-10 ">
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
