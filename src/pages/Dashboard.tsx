import { useWallet } from "@/auth/WalletContext";
import { EmptyState } from "@/components/dashboard/EmptyState";
import Header from "@/components/header/Header";
import AjoCard from "@/components/shared/AjoCard";
import useAjoCore from "@/hooks/useAjoCore";
import { useAjoFactory } from "@/hooks/useAjoFactory";
import { useTokenHook } from "@/hooks/useTokenHook";
import { useAjoStore } from "@/store/ajoStore";
import { Shield, Users, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { getNaira } from "@/utils/utils";
import { useTokenStore } from "@/store/tokenStore";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { connected: isConnected } = useWallet();
  const { getContractStats } = useAjoCore();
  const { getAllAjos } = useAjoFactory();
  const navigate = useNavigate();
  const { getWhbarBalance, getUsdcBalance } = useTokenHook();
  const { setNaira } = useTokenStore();
  const [isVisible, setIsVisible] = useState(false);
  const { ajoStats, setStats } = useAjoStore();

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setIsVisible(true);
    getWhbarBalance();
    getUsdcBalance();
    const fetchStats = async () => {
      try {
        const naira = await getNaira();
        setNaira(naira);
        const data = await getContractStats();
        const ajos = await getAllAjos();
        console.log("All Ajos:", ajos);
        if (data) setStats(data);
        console.log("Contract response:", data);
      } catch (err) {
        console.error("❌ Failed to fetch stats:", err);
      }
    };

    fetchStats();

    // if (isConnected) {
    // }
  }, [isConnected, getContractStats]);

  const handleRoute = () => {
    navigate("/ajo/create-ajo");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 h-auto mt-16 lg:px-8 py-6">
        <div
          className={`space-y-6 mt-8 transform transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          {/* Welcome Banner */}
          <div className="bg-gradient-to-br from-primary to-accent text-primary-foreground p-6 rounded-xl shadow-lg border border-border">
            <h2 className="text-2xl font-bold mb-2">Welcome</h2>
            <p className="text-primary-foreground/90"> Ajo Platform</p>
            <p className="text-sm text-primary-foreground/80 mt-2">
              Transparency on-chain, blockchain-powered savings groups. Build
              wealth with your community.
            </p>
          </div>

          {/* Stats Cards */}
          <div
            className={`grid grid-cols-1 md:grid-cols-3 gap-4 transform transition-all duration-1000 delay-200 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            <div className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition-all hover:scale-105 hover:border-primary/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Ajos Tracked</p>
                  <p className="text-2xl font-bold text-foreground">1</p>
                </div>
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition-all hover:scale-105 hover:border-accent/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">
                    Total Ajo Pools
                  </p>
                  <p className="text-2xl font-bold text-foreground">1</p>
                </div>
                <Users className="h-8 w-8 text-accent" />
              </div>
            </div>

            <div className="bg-card p-6 rounded-xl shadow-sm border border-border hover:shadow-md transition-all hover:scale-105 hover:border-secondary/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-muted-foreground text-sm">Cultural NFTs</p>
                  <p className="text-2xl font-bold text-foreground">0</p>
                </div>
                <Star className="h-8 w-8 text-secondary" />
              </div>
            </div>
          </div>
          {ajoStats ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ajoStats && <AjoCard ajoData={ajoStats} isVisible={isVisible} />}
            </div>
          ) : (
            <EmptyState onCreateAjo={handleRoute} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
