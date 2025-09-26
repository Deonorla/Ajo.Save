"use client";

import { useState, useEffect } from "react";
import ProfileHeader from "@/components/profile/ProfileHeader";
import AjoDetailsCard from "@/components/ajo-details-page/AjoDetailsCard";
import AjoDetailsStatsGrid from "@/components/ajo-details-page/AjoDetailsStatsGrid";
import AjoDetailsNavigationTab from "@/components/ajo-details-page/AjoDetailsNavigationTab";
import AjoOverviewTab from "@/components/ajo-details-page/AjoOverviewTab";
import AjoMembers from "@/components/ajo-details-page/AjoMembers";
import AjoGovernance from "@/components/ajo-details-page/AjoGovernance";

import AjoDetailAnalytics from "@/components/ajo-details-page/AjoDetailAnalytics";
import AjoPaymentHistory from "@/components/ajo-details-page/AjoPaymentHistory";
import useAjoCore from "@/hooks/useAjoCore";
import { useWallet } from "@/auth/WalletContext";

const AjoDetails = () => {
  const { address } = useWallet();
  const { getMemberInfo, getQueueInfo, getTokenConfig, needsToPayThisCycle } =
    useAjoCore();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [contractStats, setContractStats] = useState<ContractStats | null>(
    null
  );
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const getUserData = async () => {
    try {
      if (!address) {
        throw "Address not found, connect to metamask";
      }
      const data = await getMemberInfo(address);
      console.log("Info", data);
    } catch (err) {
      console.log("Error fetching member info:", err);
    }
  };

  useEffect(() => {
    setIsVisible(true);
    // fetchContractData();
    if (address) {
      getQueueInfo(address);
      getTokenConfig(0);
    }
    getUserData();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <ProfileHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ajo Header */}
        <AjoDetailsCard isVisible={isVisible} lastUpdated={lastUpdated} />

        {/* Stats Grid */}

        <AjoDetailsStatsGrid
          isVisible={isVisible}
          contractStats={contractStats}
        />
        {/* Tab Navigation */}

        <AjoDetailsNavigationTab
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
          {activeTab === "overview" && <AjoOverviewTab />}

          {/* {activeTab === "members" && <AjoMembers />} */}
          {/* {activeTab === "payments" && <AjoPaymentHistory />} */}

          {activeTab === "governance" && <AjoGovernance />}

          {/* {activeTab === "analytics" && <AjoDetailAnalytics />} */}
        </div>
      </div>
    </div>
  );
};

export default AjoDetails;
