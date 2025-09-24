import { useAjoStore } from "@/store/ajoStore";
import { useTokenStore } from "@/store/tokenStore";
import formatCurrency from "@/utils/formatCurrency";
import { DollarSign, TrendingUp, Users, Wallet } from "lucide-react";

interface AjoDetailsStatsGridProps {
  isVisible: boolean;
  contractStats: ContractStats | null;
}

const AjoDetailsStatsGrid = ({
  isVisible,
  contractStats,
}: AjoDetailsStatsGridProps) => {
  const { nairaRate } = useTokenStore();
  const { ajoStats } = useAjoStore();
  return (
    <div
      className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 transform transition-all duration-1000 delay-200 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">Monthly</span>
        </div>
        <div className="text-2xl font-bold text-card-foreground">
          {formatCurrency(nairaRate * 50)}
        </div>
        <div className="text-sm text-muted-foreground">Payment Amount</div>
      </div>

      <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-muted-foreground">Progress</span>
        </div>
        <div className="text-2xl font-bold text-card-foreground">
          {ajoStats?.activeMembers}/{ajoStats?.totalMembers}
        </div>
        <div className="text-sm text-muted-foreground">Members</div>
      </div>

      <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Wallet className="w-6 h-6  text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
        <div className="text-2xl font-bold text-card-foreground">
          {formatCurrency(0)}
        </div>
        <div className="text-sm text-muted-foreground">Pool Value</div>
      </div>

      <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="w-10 h-10 bg-accent/20 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-accent" />
          </div>
          <span className="text-xs text-muted-foreground">Earned</span>
        </div>
        <div className="text-2xl font-bold text-card-foreground">
          {formatCurrency(0)}
        </div>
        <div className="text-sm text-muted-foreground">Yield Generated</div>
      </div>
    </div>
  );
};

export default AjoDetailsStatsGrid;
