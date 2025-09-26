import { userStats } from "@/temp-data";
import { Check, Copy } from "lucide-react";

interface UserProfileCardProps {
  isVisible: boolean;
  address?: string | null;
  network?: string | null;
  whbar?: string | null;
  usdc?: string | null;
  loading?: boolean;
  copied?: boolean;
  balanceInNGN?: number | null;
  usdcBalanceInNGN?: number | null;
  handleCopy?: () => void;
}

const UserProfileCard = ({
  isVisible,
  address,
  network,
  whbar,
  usdc,
  loading,
  copied,
  balanceInNGN,
  usdcBalanceInNGN,
  handleCopy,
}: UserProfileCardProps) => {
  return (
    <div
      className={`bg-white rounded-2xl shadow-xl overflow-hidden mb-8 transform transition-all duration-1000 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      <div className="relative h-48 bg-gradient-to-r from-primary via-yellow-500 to-accent">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="absolute bottom-2 sm:bottom-6 left-6 right-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-end space-y-4 sm:space-y-0 sm:space-x-6">
            <div className="relative group hidden sm:block">
              <div className="w-24 h-24 bg-gradient-to-br from-white to-gray-100 rounded-full flex items-center justify-center text-3xl font-bold text-primary border-4 border-white shadow-lg">
                {userStats.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </div>
              {/* <button className="absolute bottom-0 right-0 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-4 h-4" />
                  </button> */}
            </div>

            <div className="flex-1 text-white">
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-lg sm:text-3xl font-bold">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </h1>
                <button
                  onClick={handleCopy}
                  className="p-1  rounded cursor-pointer hover:bg-white/30 transition-colors"
                  title="Copy Address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 sm:h-6 sm:w-6 text-white" />
                  ) : (
                    <Copy className="w-4 h-4 sm:h-6 sm:w-6 text-white" />
                  )}
                </button>
              </div>
              <p className="text-green-100 text-sm  sm:text-lg mb-2">
                Wallet Balance
              </p>
              <div className="flex items-center space-x-2 text-sm text-green-100">
                <div className="flex items-center text-sm font-semibold  sm:text-xl space-x-1">
                  <img src="/images/profile/hedera.png" className="w-6 h-6" />
                  {loading ? <span>...</span> : <span>{whbar}</span>}
                </div>
                <div className="flex items-center text-sm font-semibold  sm:text-xl space-x-1">
                  <span>WHBAR</span>
                </div>
                {/* {balanceInNGN !== null && (
                  <p className="text-green-200 text-sm  font-semibold sm:text-xl">
                    ≈ ₦
                    {balanceInNGN?.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )} */}
              </div>
              <div className="flex items-center my-1 space-x-2 text-sm text-green-100">
                <div className="flex items-center text-sm font-semibold  sm:text-xl space-x-1">
                  <img src="/images/profile/usdc.png" className="w-6 h-6" />
                  {loading ? <span>...</span> : <span>{usdc}</span>}
                </div>
                <div className="flex items-center text-sm font-semibold  sm:text-xl space-x-1">
                  <span>USDC</span>
                </div>
                {/* {usdcBalanceInNGN !== null && (
                  <p className="text-green-200 text-sm  font-semibold sm:text-xl">
                    ≈ ₦
                    {usdcBalanceInNGN?.toLocaleString("en-NG", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                )} */}
              </div>
            </div>

            <div className="bg-white/20 hover:bg-white/30 text-white text-[.9rem] sm:text-lg px-3 py-1 sm:px-6 sm:py-3 rounded-full font-semibold transition-all hover:scale-105 flex items-center space-x-2">
              {/* <Edit3 className="w-4 h-4" /> */}
              <span>{network}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileCard;
