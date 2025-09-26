"use client";

import { useState, useEffect, useCallback } from "react";
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
import { useTokenStore } from "@/store/tokenStore";

const AjoDetails = () => {
  const { address } = useTokenStore();
  const {
    getMemberInfo,
    getQueueInfo,
    getTokenConfig,
    needsToPayThisCycle,
    getContractStats,
  } = useAjoCore();
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [contractStats, setContractStats] = useState<ContractStats | null>(
    null
  );
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [monthlyPayment, setMonthlyPayment] = useState<string | undefined>("");

  const getUserData = useCallback(async () => {
    try {
      if (!address) {
        throw "Address not found, connect to metamask";
      }
      const data = await getMemberInfo(address);
      const queue = await getQueueInfo(address);
      const tokenConfig = await getTokenConfig(0);
      setMonthlyPayment(tokenConfig?.monthlyPayment);
      console.log("Info", data);
    } catch (err) {
      console.log("Error fetching member info:", err);
    }
  }, [getMemberInfo, getQueueInfo, getTokenConfig]);

  useEffect(() => {
    setIsVisible(true);
    getContractStats();
    getUserData();
  }, [getContractStats]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <ProfileHeader />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ajo Header */}
        <AjoDetailsCard
          monthlyPayment={monthlyPayment}
          isVisible={isVisible}
          lastUpdated={lastUpdated}
        />

        {/* Stats Grid */}

        <AjoDetailsStatsGrid
          monthlyPayment={monthlyPayment}
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
