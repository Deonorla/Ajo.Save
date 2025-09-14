import { useState, useEffect } from "react";
import {
  User,
  Shield,
  Coins,
  Trophy,
  TrendingUp,
  Eye,
  Star,
  Award,
  Zap,
  ChevronRight,
  Users,
  Wallet,
  Check,
  Copy,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWallet } from "@/auth/WalletContext";
import { useTokenStore } from "@/store/tokenStore";

const Profile = () => {
  const naviagte = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const { address, network, balance } = useWallet();
  const { whbar, usdc, loading } = useTokenStore();
  const [copied, setCopied] = useState(false);
  const [hbarPrice, setHbarPrice] = useState<number | null>(null);
  const [balanceInNGN, setBalanceInNGN] = useState<number | null>(null);
  //   const [profileImage, setProfileImage] = useState('');

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    const fetchWHBARPrice = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=hedera-hashgraph&vs_currencies=ngn"
        );
        const data = await res.json();
        const price = data["hedera-hashgraph"].ngn;
        setHbarPrice(price);

        if (whbar) {
          const whbarAmount = parseFloat(whbar ?? "0"); // make sure balance is a string number
          setBalanceInNGN(whbarAmount * price);
        }
      } catch (error) {
        console.error("Failed to fetch HBAR price:", error);
      }
    };

    fetchWHBARPrice();
  }, [whbar]);

  const handleCopy = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const userStats = {
    name: "Chidi Okwu",
    username: "@chidi_truth",
    location: "Lagos, Nigeria",
    joinDate: "March 2024",
    transparencyScore: 98,
    ajoContributions: "₦850,000",
    nftsOwned: 12,
    communitiesJoined: 5,
    exposuresReported: 23,
  };

  const achievements = [
    {
      icon: Shield,
      title: "Truth Seeker",
      description: "Exposed 20+ corrupt practices",
      color: "bg-green-500",
    },
    {
      icon: Coins,
      title: "Ajo Master",
      description: "Completed 5 Ajo cycles",
      color: "bg-yellow-500",
    },
    {
      icon: Trophy,
      title: "Community Builder",
      description: "Founded 3 transparency groups",
      color: "bg-blue-500",
    },
    {
      icon: Star,
      title: "Cultural Guardian",
      description: "Owns rare Wazobia NFTs",
      color: "bg-purple-500",
    },
  ];

  const recentActivity = [
    {
      type: "ajo",
      text: "Contributed ₦50,000 to Tech Bros Ajo",
      time: "2 hours ago",
      icon: Coins,
    },
    {
      type: "exposure",
      text: "Reported suspicious NGO spending",
      time: "1 day ago",
      icon: Eye,
    },
    {
      type: "nft",
      text: "Minted 'Sapa Survivor' badge",
      time: "3 days ago",
      icon: Award,
    },
    {
      type: "community",
      text: "Joined Abuja Transparency Circle",
      time: "1 week ago",
      icon: Users,
    },
  ];

  const nftCollection = [
    { name: "Sapa Survivor #001", rarity: "Legendary", image: "🏆" },
    { name: "Wazobia Unity", rarity: "Rare", image: "🌍" },
    { name: "Dey Play Meme", rarity: "Common", image: "😂" },
    { name: "Truth Teller", rarity: "Epic", image: "⚡" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background backdrop-blur-md border-b border-primary/25">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => naviagte("/dashboard")}
            className="flex items-center space-x-2 text-white hover:primary/90 transition-colors cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
            <span>Back to Home</span>
          </button>

          {/* <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-700 hover:text-green-600 transition-colors">
              <Share2 className="w-5 h-5" />
            </button>
            <button className="p-2 text-gray-700 hover:text-green-600 transition-colors">
              <Settings className="w-5 h-5" />
            </button>
          </div> */}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div
          className={`bg-white rounded-2xl shadow-xl overflow-hidden mb-8 transform transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          }`}
        >
          <div className="relative h-48 bg-gradient-to-r from-primary via-yellow-500 to-accent">
            <div className="absolute inset-0 bg-black/20"></div>
            <div className="absolute bottom-6 left-6 right-6">
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
                      <Wallet className="w-6 h-6" />
                      {loading ? <span>...</span> : <span>{whbar}</span>}
                    </div>
                    <div className="flex items-center text-sm font-semibold  sm:text-xl space-x-1">
                      <span>WHBAR</span>
                    </div>
                    {balanceInNGN !== null && (
                      <p className="text-green-200 text-sm  font-semibold sm:text-xl">
                        ≈ ₦
                        {balanceInNGN.toLocaleString("en-NG", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </p>
                    )}
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

        {/* Stats Cards */}
        <div
          className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 transform transition-all duration-1000 delay-200 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          }`}
        >
          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/15 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {userStats.transparencyScore}
                </div>
                <div className="text-sm text-white">Transparency Score</div>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${userStats.transparencyScore}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/15 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Coins className="w-6 h-6 text-primary" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {userStats.ajoContributions}
                </div>
                <div className="text-sm text-white">Ajo Contributions</div>
              </div>
            </div>
            <div className="text-sm text-white">+12% this month</div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/15 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {userStats.nftsOwned}
                </div>
                <div className="text-sm text-white">Cultural NFTs</div>
              </div>
            </div>
            <div className="text-sm text-white">3 rare items</div>
          </div>

          <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all hover:scale-105 group">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-primary/15 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Eye className="w-6 h-6 text-primary" />
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {userStats.exposuresReported}
                </div>
                <div className="text-sm text-white">Exposures Reported</div>
              </div>
            </div>
            <div className="text-sm text-white">Community hero</div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`bg-card rounded-xl shadow-lg mb-8 transform transition-all duration-1000 delay-300 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          }`}
        >
          <div className="flex overflow-x-auto">
            {[
              { id: "overview", label: "Overview", icon: User },
              { id: "ajo", label: "Ajo Groups", icon: Coins },
              { id: "nfts", label: "NFT Collection", icon: Award },
              { id: "activity", label: "Activity", icon: TrendingUp },
            ].map((tab) => {
              const IconComponent = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? "text-primary border-b-2 border-primary bg-primary/15 rounded-xl"
                      : "text-white hover:text-primary hover:bg-primary/20 rounded-sm"
                  }`}
                >
                  <IconComponent className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content */}
        <div
          className={`transform transition-all duration-500 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
          }`}
        >
          {activeTab === "overview" && (
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Achievements */}
              <div className="lg:col-span-2">
                <div className="bg-card rounded-xl shadow-lg p-6 mb-8">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                    <Trophy className="w-6 h-6 text-yellow-600" />
                    <span>Achievements</span>
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {achievements.map((achievement, index) => {
                      const IconComponent = achievement.icon;
                      return (
                        <div
                          key={index}
                          className="p-4 rounded-lg border-2 border-primary/15 hover:border-primary/60 transition-all hover:scale-105 group cursor-pointer"
                        >
                          <div className="flex items-center space-x-3 mb-3">
                            <div
                              className={`w-10 h-10 rounded-lg ${achievement.color} flex items-center justify-center group-hover:scale-110 transition-transform`}
                            >
                              <IconComponent className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-white">
                                {achievement.title}
                              </h4>
                            </div>
                          </div>
                          <p className="text-sm text-white/50">
                            {achievement.description}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-card rounded-xl shadow-lg p-6">
                  <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                    <Zap className="w-6 h-6 text-blue-600" />
                    <span>Recent Activity</span>
                  </h3>
                  <div className="space-y-4">
                    {recentActivity.map((activity, index) => {
                      const IconComponent = activity.icon;
                      return (
                        <div
                          key={index}
                          className="flex items-center space-x-4 p-3 rounded-lg hover:bg-primary/15 transition-colors group"
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                            <IconComponent className="w-5 h-5 text-gray-600 group-hover:text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="text-white font-medium">
                              {activity.text}
                            </p>
                            <p className="text-sm text-gray-500">
                              {activity.time}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Profile Summary */}
                <div className="bg-card rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Profile Summary
                  </h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-white/50">Communities</span>
                      <span className="font-semibold text-primary">
                        {userStats.communitiesJoined}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/50">Total Savings</span>
                      <span className="font-semibold text-green-600">
                        {userStats.ajoContributions}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/50">NFTs Owned</span>
                      <span className="font-semibold text-purple-600">
                        {userStats.nftsOwned}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/50">Exposures</span>
                      <span className="font-semibold text-blue-600">
                        {userStats.exposuresReported}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transparency Score */}
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-xl shadow-lg p-6 text-white border border-primary/30">
                  <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
                    <Shield className="w-5 h-5" />
                    <span>Transparency Score</span>
                  </h3>
                  <div className="text-center">
                    <div className="text-4xl font-bold mb-2">
                      {userStats.transparencyScore}
                    </div>
                    <div className="text-green-100 mb-4">
                      Exceptional Transparency
                    </div>
                    <div className="w-full bg-white rounded-full h-3">
                      <div
                        className="bg-primary h-3 rounded-full transition-all duration-1000"
                        style={{ width: `${userStats.transparencyScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-card rounded-xl shadow-lg p-6">
                  <h3 className="text-lg font-bold text-white mb-4">
                    Quick Actions
                  </h3>
                  <div className="space-y-3">
                    <button className="w-full bg-primary/15 hover:bg-primary/20 text-primary p-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center justify-between">
                      <span>Join New Ajo</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button className="w-full bg-primary/15 hover:bg-primary/20 text-primary p-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center justify-between">
                      <span>Report Corruption</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button className="w-full bg-primary/15 hover:bg-primary/20 text-primary p-3 rounded-lg font-medium transition-all hover:scale-105 flex items-center justify-between">
                      <span>Browse NFTs</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "ajo" && (
            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                  <Coins className="w-6 h-6 text-yellow-600" />
                  <span>Active Ajo Groups</span>
                </h3>
                <div className="space-y-4">
                  {[
                    {
                      name: "Tech Bros Ajo",
                      members: 12,
                      contribution: "₦50,000",
                      nextPayout: "5 days",
                    },
                    {
                      name: "Lagos Landlords",
                      members: 8,
                      contribution: "₦100,000",
                      nextPayout: "12 days",
                    },
                    {
                      name: "Startup Founders Circle",
                      members: 15,
                      contribution: "₦75,000",
                      nextPayout: "20 days",
                    },
                  ].map((ajo, index) => (
                    <div
                      key={index}
                      className="p-4 border-2 border-gray-100 rounded-lg hover:border-yellow-300 transition-all hover:scale-105 group cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">
                          {ajo.name}
                        </h4>
                        <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                          {ajo.members} members
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Monthly:</span>
                          <div className="font-semibold text-gray-900">
                            {ajo.contribution}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500">Next payout:</span>
                          <div className="font-semibold text-gray-900">
                            {ajo.nextPayout}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-6">
                  Ajo Performance
                </h3>
                <div className="space-y-6">
                  <div className="text-center p-6 bg-gradient-to-br from-green-50 to-yellow-50 rounded-lg">
                    <div className="text-3xl font-bold text-green-600 mb-2">
                      ₦850,000
                    </div>
                    <div className="text-gray-600">Total Contributed</div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">5</div>
                      <div className="text-sm text-gray-600">
                        Completed Cycles
                      </div>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <div className="text-xl font-bold text-gray-900">
                        100%
                      </div>
                      <div className="text-sm text-gray-600">Payment Rate</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "nfts" && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                <Award className="w-6 h-6 text-purple-600" />
                <span>Cultural NFT Collection</span>
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {nftCollection.map((nft, index) => (
                  <div key={index} className="group cursor-pointer">
                    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 mb-4 hover:from-green-100 hover:to-yellow-100 transition-all hover:scale-105 group-hover:shadow-lg">
                      <div className="text-6xl text-center mb-4">
                        {nft.image}
                      </div>
                      <div
                        className={`text-xs font-medium px-2 py-1 rounded-full text-center ${
                          nft.rarity === "Legendary"
                            ? "bg-yellow-200 text-yellow-800"
                            : nft.rarity === "Epic"
                            ? "bg-purple-200 text-purple-800"
                            : nft.rarity === "Rare"
                            ? "bg-blue-200 text-blue-800"
                            : "bg-gray-200 text-gray-800"
                        }`}
                      >
                        {nft.rarity}
                      </div>
                    </div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-green-600 transition-colors">
                      {nft.name}
                    </h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "activity" && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
                <TrendingUp className="w-6 h-6 text-blue-600" />
                <span>Activity Timeline</span>
              </h3>
              <div className="space-y-6">
                {recentActivity.map((activity, index) => {
                  const IconComponent = activity.icon;
                  return (
                    <div
                      key={index}
                      className="flex items-start space-x-4 p-4 rounded-lg hover:bg-gray-50 transition-colors group"
                    >
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-green-100 transition-colors">
                        <IconComponent className="w-6 h-6 text-gray-600 group-hover:text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 font-medium mb-1">
                          {activity.text}
                        </p>
                        <p className="text-sm text-gray-500">{activity.time}</p>
                      </div>
                      <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
