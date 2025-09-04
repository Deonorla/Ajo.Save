import {
  Wallet,
  Shield,
  TrendingUp,
  Users,
  Star,
  Eye,
  ChevronRight,
  Menu,
  X,
  Home,
  BarChart3,
  Coins,
  Zap,
} from "lucide-react";
import { useState } from "react";

const Header = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="  bg-gray-50">
      {/*  */}
      <nav className="hidden md:block fixed bg-white border-b border-gray-200 w-full  top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-yellow-500 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">Dey.Play</span>
            </div>

            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("transparency")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "transparency"
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Transparency
              </button>
              <button
                onClick={() => setActiveTab("ajo")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "ajo"
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Users className="h-4 w-4" />
                Digital Ajo
              </button>
              <button
                onClick={() => setActiveTab("nft")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "nft"
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Star className="h-4 w-4" />
                NFT Market
              </button>
            </div>

            <div>
              {isWalletConnected ? (
                <div className="flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg">
                  <Wallet className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {/* {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)} */}
                  </span>
                </div>
              ) : (
                <button
                  //   onClick={connectWallet}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center gap-2"
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
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
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
        </div>

        {isMobileMenuOpen && (
          <div className="border-t border-gray-200 bg-white">
            <div className="px-4 py-3 space-y-2">
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "dashboard"
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Home className="h-4 w-4" />
                Dashboard
              </button>
              <button
                onClick={() => {
                  setActiveTab("transparency");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "transparency"
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Transparency
              </button>
              <button
                onClick={() => {
                  setActiveTab("ajo");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "ajo"
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Users className="h-4 w-4" />
                Digital Ajo
              </button>
              <button
                onClick={() => {
                  setActiveTab("nft");
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "nft"
                    ? "bg-green-100 text-green-700"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Star className="h-4 w-4" />
                NFT Market
              </button>

              <div className="pt-3 border-t border-gray-200">
                {isWalletConnected ? (
                  <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-2 rounded-lg">
                    <Wallet className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </span>
                  </div>
                ) : (
                  <button
                    // onClick={}
                    className="w-full bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <Wallet className="h-4 w-4" />
                    Connect MetaMask
                  </button>
                )}
              </div>
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
