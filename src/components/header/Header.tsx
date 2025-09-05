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
import { use, useEffect, useState } from "react";
import { useWallet } from "../../auth/WalletContext";
import { useLocation, useNavigate } from "react-router-dom";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

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
    // Implement navigation logic here, e.g., using react-router
    setActiveTab(tabId);
    navigate(`/${tabId}`);
  };

  return (
    <div className="bg-gray-50">
      {/* Desktop Navigation */}
      <nav className="hidden md:block fixed bg-white border-b border-gray-200 w-full top-0 z-40">
        <div className="   mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Dey.Play</span>
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? "bg-green-100 text-green-700"
                      : "text-gray-600 hover:text-gray-900"
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
                <div className="flex items-center gap-2 bg-green-100 px-3 py-2 rounded-lg text-sm font-medium">
                  <Wallet className="h-4 w-4 text-green-700" />
                  <span className="text-green-700">
                    {balance ? `${balance} HBAR` : "Loading..."}
                  </span>
                  <span className="text-gray-700">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-green-200 rounded"
                    title="Copy Address"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600" />
                    )}
                  </button>
                  <span className="ml-2 text-xs text-gray-500">{network}</span>
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
                  className="flex items-center gap-2 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700"
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
      <nav className="md:hidden bg-white border-b border-gray-200 fixed w-full top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-yellow-500 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Dey.Play</span>
          </div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
          >
            {isMobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white px-4 py-3 space-y-2">
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
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}

            {/* Wallets on Mobile */}
            <div className="pt-4 border-t border-gray-200">
              {connected ? (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 shadow-sm flex flex-col gap-3">
                  {/* Balance */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">Balance</span>
                    <span className="text-green-700 font-semibold">
                      {balance} HBAR
                    </span>
                  </div>

                  {/* Address */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">Wallet</span>
                    <span className="text-gray-800 font-medium">
                      {address?.slice(0, 6)}...{address?.slice(-4)}
                    </span>
                  </div>

                  {/* Network */}
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 text-sm">Network</span>
                    <span className="text-gray-700 text-sm">{network}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between gap-3 pt-2">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-600" />
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
      <div className="md:hidden fixed bottom-6 right-6">
        <button className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors">
          <Coins className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
};

export default Header;
