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
} from "lucide-react";
import { useState } from "react";
import { useWallet } from "../../auth/WalletContext";

const Header = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { connected, address, balance, network, connectMetaMask, disconnect } =
    useWallet();

  const handleCopy = async () => {
    if (!address) return;
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.error("Failed to copy address", err);
    }
  };

  return (
    <div className="bg-gray-50">
      {/* Desktop Navigation */}
      <nav className="hidden md:block fixed bg-white border-b border-gray-200 w-full top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Dey.Play</span>
            </div>

            {/* Nav Tabs */}
            <div className="flex items-center gap-6">
              {[
                { id: "dashboard", label: "Dashboard", icon: Home },
                { id: "transparency", label: "Transparency", icon: BarChart3 },
                { id: "ajo", label: "Digital Ajo", icon: Users },
                { id: "nft", label: "NFT Market", icon: Star },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
              {connected && address ? (
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                  <Wallet className="h-4 w-4 text-green-600" />

                  {/* Address */}
                  <span className="font-mono text-sm text-gray-800">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>

                  {/* Copy Button */}
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Copy Address"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-600" />
                    )}
                  </button>

                  {/* Balance */}
                  <span className="text-sm text-gray-700">
                    {parseFloat(balance ?? "0").toFixed(4)} HBAR
                  </span>

                  {/* Disconnect */}
                  <button
                    onClick={disconnect}
                    className="p-1 hover:bg-red-100 rounded"
                    title="Disconnect"
                  >
                    <LogOut className="h-4 w-4 text-red-600" />
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
              { id: "transparency", label: "Transparency", icon: BarChart3 },
              { id: "ajo", label: "Digital Ajo", icon: Users },
              { id: "nft", label: "NFT Market", icon: Star },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
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
            <div className="pt-3 border-t border-gray-200 space-y-2">
              {connected && address ? (
                <div className="flex flex-col gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm text-gray-800">
                      {address.slice(0, 6)}...{address.slice(-4)}
                    </span>
                    <button
                      onClick={handleCopy}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      {copied ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-600" />
                      )}
                    </button>
                  </div>
                  <span className="text-sm text-gray-700">
                    {parseFloat(balance ?? "0").toFixed(4)} HBAR
                  </span>
                  <button
                    onClick={disconnect}
                    className="flex items-center justify-center gap-2 bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-200"
                  >
                    <LogOut className="h-4 w-4" />
                    Disconnect
                  </button>
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
