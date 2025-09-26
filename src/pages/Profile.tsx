import { useState, useEffect } from "react";
import { useWallet } from "@/auth/WalletContext";
import { useTokenStore } from "@/store/tokenStore";
import ProfileHeader from "@/components/profile/ProfileHeader";
import StatsCard from "@/components/profile/StatsCard";
import ProfileNavigationTab from "@/components/profile/ProfileNavigationTab";
import ProfileOverview from "@/components/profile/ProfileOverview";
import ProfileAjoGroups from "@/components/profile/ProfileAjoGroups";
import UserProfileCard from "@/components/profile/UserProfileCard";
import ProfileNftPage from "@/components/profile/ProfileNftPage";
import ProfileRecentActivity from "@/components/profile/ProfileRecentActivity";
import useAjoCore from "@/hooks/useAjoCore";

const Profile = () => {
  const { getMemberInfo, needsToPayThisCycle } = useAjoCore();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { address, network } = useWallet();
  const { whbar, usdc, loading } = useTokenStore();
  const [copied, setCopied] = useState(false);
  const [balanceInNGN, setBalanceInNGN] = useState<number | null>(null);
  const [usdcBalanceInNGN, setUsdcBalanceInNGN] = useState<number | null>(null);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const [hbarRes, usdcRes] = await Promise.all([
          fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=ngn"
          ),
          fetch(
            "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=ngn"
          ),
        ]);

        const [hbarData, usdcData] = await Promise.all([
          hbarRes.json(),
          usdcRes.json(),
        ]);

        const hbarPrice = hbarData?.["hedera-hashgraph"]?.ngn ?? 0;
        const usdcPrice = usdcData?.["usd-coin"]?.ngn ?? 0;

        console.log("HBAR Price NGN:", hbarPrice);
        console.log("USDC Price NGN:", usdcPrice);

        // if you already have balances
        if (whbar) setBalanceInNGN(parseFloat(whbar) * hbarPrice);
        if (usdc)
          setUsdcBalanceInNGN(parseFloat(usdc) * usdcPrice * Number(usdc));
      } catch (error) {
        console.error("Failed to fetch prices:", error);
      }
    };
    if (address) {
      getMemberInfo(address);
      needsToPayThisCycle(address);
    }

    fetchPrices();
  }, [whbar, usdc, getMemberInfo]);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <ProfileHeader />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}

        <UserProfileCard
          address={address}
          network={network}
          isVisible={isVisible}
          whbar={whbar}
          usdc={usdc}
          loading={loading}
          balanceInNGN={balanceInNGN}
          usdcBalanceInNGN={usdcBalanceInNGN}
          copied={copied}
          handleCopy={handleCopy}
        />

        {/* Stats Cards */}
        <StatsCard isVisible={isVisible} />
        {/* Navigation Tabs */}
        <ProfileNavigationTab
          isVisible={isVisible}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        {/* Tab Content */}
        <div
          className={`transform transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          }`}
        >
          {activeTab === "overview" && <ProfileOverview />}

          {activeTab === "ajo" && <ProfileAjoGroups />}

          {activeTab === "nfts" && <ProfileNftPage />}

          {activeTab === "activity" && <ProfileRecentActivity />}
        </div>
      </div>
    </div>
  );
};

export default Profile;
