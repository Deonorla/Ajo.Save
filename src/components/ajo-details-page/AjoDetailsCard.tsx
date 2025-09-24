import { useWallet } from "@/auth/WalletContext";
import useAjoCore from "@/hooks/useAjoCore";
import { ajoData } from "@/temp-data";
import { formatAddress } from "@/utils/utils";
import {
  Bell,
  CheckCircle,
  Clock,
  CreditCard,
  Database,
  ExternalLink,
  Star,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface AjoDetailsCardProps {
  isVisible?: boolean;
  lastUpdated: Date;
}

const AjoDetailsCard = ({ isVisible, lastUpdated }: AjoDetailsCardProps) => {
  const [loading, setLoading] = useState(false);
  const { joinAjo, getContractStats, getMemberInfo } = useAjoCore();
  const { address } = useWallet();

  const _joinAjo = async () => {
    try {
      setLoading(true);
      if (!address) {
        toast.error("Wallet address not found");
        setLoading(false);
        return;
      }
      const join = await joinAjo(
        0,
        import.meta.env.VITE_MOCK_USDC_ADDRESS,
        import.meta.env.VITE_AJO_COLLATERAL_CONTRACT,
        import.meta.env.VITE_AJO_PAYMENTS_CONTRACT
      );
      console.log("✅ Joined Ajo, tx hash:", join.hash);
      // Check logs
      console.log("📜 Logs:", join.logs);
      toast.success("Ajo joined");
      // Step 2: refresh global stats
      const stats = await getContractStats();
      console.log("📊 Updated stats:", stats);

      // Step 3: fetch this user’s details
      if (address) {
        const member = await getMemberInfo(address);
        console.log("🙋 Member details:", member);
      }
      setLoading(false);
    } catch (err) {
      console.log("Error:", err);
      toast.error("Failed to join");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`mb-8 transform transition-all duration-1000 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      <div className="bg-card rounded-xl shadow-lg p-8 border border-border">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-6 h-6 lg:w-12 lg:h-12 bg-gradient-to-br p-4 from-primary to-accent rounded-xl flex items-center justify-center text-sm lg:text-xl font-bold text-primary-foreground">
                {ajoData.name.charAt(0)}
              </div>
              <div>
                <h1 className=" text-sm lg:text-xl font-bold text-card-foreground mb-1">
                  {ajoData.name}
                </h1>
                <div className="flex items-center space-x-4">
                  <div
                    className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(
                      "forming"
                    )}`}
                  >
                    {getStatusIcon("Forming")}
                    <span className="capitalize">Forming</span>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              {ajoData.description}
            </p>

            <div className="mt-4 flex items-center space-x-2 text-sm">
              <Database className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">
                Smart Contract:
              </span>
              <span className="font-mono text-primary">
                {formatAddress(ajoData.contracts.core)}
              </span>
              {/* <button className="text-primary hover:text-primary/80">
                <ExternalLink className="w-4 h-4" />
              </button> */}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={_joinAjo}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg transition-all hover:scale-105 hover:shadow-lg flex items-center justify-center space-x-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                  <span>Joining Ajo...</span>
                </>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>Join Ajo</span>
                </>
              )}
            </button>
            {/* <button className="border border-primary text-primary hover:bg-primary/10 px-6 py-3 rounded-lg font-semibold transition-all flex items-center justify-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>Subscribe</span>
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjoDetailsCard;

const getStatusIcon = (status: string) => {
  switch (status) {
    case "active":
      return <Zap className="w-4 h-4" />;
    case "forming":
      return <Users className="w-4 h-4" />;
    case "completed":
      return <CheckCircle className="w-4 h-4" />;
    default:
      return <Clock className="w-4 h-4" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return "bg-green-600 text-white border border-green-500";
    case "forming":
      return "bg-accent/20 text-accent border border-accent/30";
    case "completed":
      return "bg-secondary/20 text-secondary-foreground border border-secondary/30";
    default:
      return "bg-muted/20 text-muted-foreground border border-muted/30";
  }
};
