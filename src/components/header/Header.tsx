import {
  Wallet,
  Eye,
  Menu,
  X,
  Home,
  BarChart3,
  Users,
  Star,
  Coins,
  Copy,
  LogOut,
  Check,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useWallet } from "../../auth/WalletContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useTokenStore } from "@/store/tokenStore";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { whbar, loading } = useTokenStore();
  const { connected, address, network, balance, connectMetaMask, disconnect } =
    useWallet();

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };
  useEffect(() => {
    const currentPath = location.pathname.replace("/", "") || "dashboard";
    setActiveTab(currentPath || "dashboard");
  }, [location]);

  const navigateTo = (tabId: string) => {
    setActiveTab(tabId);
    navigate(`/${tabId}`);
  };

  return (
    <div className="bg-background">
      {/* Desktop Navigation */}
      <nav className="hidden md:block fixed bg-background border-b border-ring w-full top-0 z-40">
        <div className="   mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Ajo.Save</span>
            </div>

            {/* Nav Tabs */}
            <div className="flex items-center gap-6 ml-60">
              {[
                { id: "dashboard", label: "Dashboard", icon: Home },
                // { id: "transparency", label: "Transparency", icon: BarChart3 },
                { id: "ajo", label: "Digital Ajo", icon: Users },
                // { id: "nft", label: "NFT Market", icon: Star },
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
            <div className="flex items-center gap-3">
              {connected ? (
                <div className="flex items-center gap-2 bg-primary/15 px-3 py-2 rounded-lg text-sm font-medium">
                  <Wallet className="h-4 w-4 text-primary" />
                  <span className="text-primary">
                    {!loading ? `${whbar} WHBAR` : "Loading..."}
                  </span>
                  <span className="text-white/50">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-primary/20 rounded"
                    title="Copy Address"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4 text-white" />
                    )}
                  </button>
                  <span className="ml-2 text-xs text-white">{network}</span>
                  <button
                    onClick={disconnect}
                    className="ml-2 flex items-center gap-1 text-red-600 hover:text-red-700"
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
      <nav className="md:hidden bg-background border-b border-primary/25 fixed w-full top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
              <Coins className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Ajo.Save</span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-white hover:text-gray-900 hover:bg-gray-100 rounded-lg"
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
              // { id: "transparency", label: "Transparency", icon: BarChart3 },
              { id: "ajo", label: "Digital Ajo", icon: Users },
              // { id: "nft", label: "NFT Market", icon: Star },
              { id: "profile", label: "Profile", icon: User },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  navigateTo(tab.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary/15 text-primary"
                    : "text-white hover:bg-primary"
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
                  {/* Balance */}
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Balance</span>
                    <span className="text-white font-semibold">
                      {whbar} WHBAR
                    </span>
                  </div>

                  {/* Address */}
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Wallet</span>
                    <span className="text-white font-medium">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>

                  {/* Network */}
                  <div className="flex items-center justify-between">
                    <span className="text-white text-sm">Network</span>
                    <span className="text-white text-sm">{network}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-primary text-white hover:bg-white/80"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <Copy className="h-4 w-4 text-white" />
                      )}
                      {copied ? "Copied" : "Copy"}
                    </button>
                    <button
                      onClick={disconnect}
                      className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                    >
                      <LogOut className="h-4 w-4" />
                      Disconnect
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={connectMetaMask}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
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
      <div className="md:hidden fixed bottom-6 right-6 z-10">
        <button className="bg-primary text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors">
          <Coins className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default Header;
