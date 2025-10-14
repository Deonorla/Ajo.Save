import { useWallet } from "@/auth/WalletContext";
import { EmptyState } from "@/components/dashboard/EmptyState";
import Header from "@/components/header/Header";
import AjoCard from "@/components/shared/AjoCard";
import { useAjoFactory } from "@/hooks/useAjoFactory";
import { useTokenHook } from "@/hooks/useTokenHook";
import { useAjoStore } from "@/store/ajoStore";
import { Shield, Users, Star, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { getNaira } from "@/utils/utils";
import { useTokenStore } from "@/store/tokenStore";
import { useNavigate } from "react-router-dom";
import formatCurrency from "@/utils/formatCurrency";
import { toast } from "sonner";

const Dashboard = () => {
  const { connected: isConnected, getBalance } = useWallet();
  const { getAllAjos } = useAjoFactory();
  const navigate = useNavigate();
  // const { getWhbarBalance, getUsdcBalance } = useTokenHook();
  const { setNaira } = useTokenStore();
  const [isVisible, setIsVisible] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { ajoInfos } = useAjoStore();

  const getHbarBalance = async () => {
    const balance = await getBalance();
    console.log("My Hbar Balance:", balance);
  };

  // Fetch Ajos function
  const fetchAjos = useCallback(
    async (showToast = false) => {
      try {
        setIsRefreshing(true);
        console.log("🔄 Fetching Ajos...");

        // NOTE: getAllAjos() updates the store asynchronously.
        // It returns { ajoInfos: AjoStruct[], hasMore: boolean }
        const result = await getAllAjos();

        const naira = await getNaira();
        setNaira(naira);
        setLastUpdate(new Date());

        // 💡 FIX: Use the length from the function result (if available) or the current state
        const fetchedLength = result?.ajoInfos?.length ?? ajoInfos.length;

        // if (showToast) {
        //   toast.success(`Loaded ${fetchedLength} Ajos`);
        // }

        console.log("✅ Ajos fetched:", fetchedLength);
      } catch (err) {
        console.error("❌ Failed to fetch ajos:", err);
        if (showToast) {
          toast.error("Failed to refresh Ajos");
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [getAllAjos, setNaira]
  );

  // Initial load animation
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // Initial fetch + wallet balances
  useEffect(() => {
    // setIsVisible(true);
    // getWhbarBalance();
    // getUsdcBalance();
    fetchAjos();
    getHbarBalance();
  }, []);

  // ✅ AUTO-REFRESH: Poll every 15 seconds
  // useEffect(() => {
  //   const interval = setInterval(() => {
  //     console.log("⏰ Auto-refreshing Ajos...");
  //     fetchAjos(false); // Silent refresh
  //   }, 15000); // 15 seconds

  //   return () => clearInterval(interval);
  // }, [fetchAjos]);

  const handleRoute = () => {
    navigate("/ajo/create-ajo");
  };

  const handleManualRefresh = () => {
    fetchAjos(true); // Show toast on manual refresh
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
          {/* Welcome Banner with Refresh Button */}
          <div className="bg-gradient-to-br from-primary to-accent text-primary-foreground p-6 rounded-xl shadow-lg border border-border">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold mb-2">Welcome</h2>
                <p className="text-primary-foreground/90">Ajo Platform</p>
                <p className="text-sm text-primary-foreground/80 mt-2">
                  Transparency on-chain, blockchain-powered savings groups.
                  Build wealth with your community.
                </p>
              </div>

              {/* ✅ Refresh Button */}
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
                title="Refresh Ajos"
              >
                <RefreshCw
                  size={18}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                <span className="text-sm font-medium">Refresh</span>
              </button>
            </div>

            {/* ✅ Last Update Timestamp */}
            {lastUpdate && (
              <p className="text-xs text-primary-foreground/70 mt-3">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </p>
            )}
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
                  <p className="text-2xl font-bold text-foreground">
                    {ajoInfos.length}
                  </p>
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
                  <p className="text-2xl font-bold text-foreground">
                    {formatCurrency(0)}
                  </p>
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

          {/* Ajo Cards */}
          {ajoInfos.length !== 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {ajoInfos.map((ajo) => (
                <AjoCard key={ajo.ajoCore} ajo={ajo} isVisible={isVisible} />
              ))}
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
