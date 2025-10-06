import { useAjoDetailsStore } from "@/store/ajoDetailsStore";
import { useAjoStore } from "@/store/ajoStore";
import { useMemberStore } from "@/store/memberInfoStore";
import { useTokenStore } from "@/store/tokenStore";
import { members } from "@/temp-data";
import formatCurrency from "@/utils/formatCurrency";
import { formatAddress } from "@/utils/utils";
import {
  Check,
  Copy,
  DollarSign,
  ShieldCheckIcon,
  Users,
  Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

interface AjoDetailsStatsGridProps {
  isVisible: boolean;
  contractStats: ContractStats | null;
  monthlyPayment: string | undefined;
}

const AjoDetailsStatsGrid = ({
  isVisible,
  contractStats,
  monthlyPayment,
}: AjoDetailsStatsGridProps) => {
  const { memberData } = useMemberStore();
  const { nairaRate } = useTokenStore();
  const [copied, setCopied] = useState(false);
  const { activeMembers, totalCollateralUSDC, totalCollateralHBAR } =
    useAjoDetailsStore();

  const formattedTotalCollateralHBAR = Number(totalCollateralHBAR) / 1000000;
  const [formattedTotalCollateralUSDC, setFormattedTotalCollateralUSDC] =
    useState(0);
  useEffect(() => {
    setFormattedTotalCollateralUSDC(Number(totalCollateralUSDC) / 1000000);
  }, [activeMembers]);

  // Copy guarantor's address
  const handleCopy = async () => {
    if (memberData) {
      await navigator.clipboard.writeText(memberData?.memberInfo.guarantor);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  return (
    <div
      className={`grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8 transform transition-all duration-1000 delay-200 ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0"
      }`}
    >
      <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="w-6 h-6 md:w-10 md:h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <DollarSign className="w-3 h-3 md:w-6 md:h-6 text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">Monthly</span>
        </div>
        <div className="text-lg md:text-2xl font-bold text-card-foreground">
          {formatCurrency(
            nairaRate * (monthlyPayment ? Number(monthlyPayment) / 1000000 : 0)
          )}
          {/* {formatCurrency(50 * nairaRate)} */}
        </div>
        <div className="text-sm text-muted-foreground">Payment Amount</div>
      </div>

      <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="w-6 h-6 md:w-10 md:h-10 bg-accent/20 rounded-lg flex items-center justify-center">
            <Users className="w-3 h-3 md:w-6 md:h-6 text-accent" />
          </div>
          <span className="text-xs text-muted-foreground">Progress</span>
        </div>
        <div className="text-lg md:text-2xl font-bold text-card-foreground">
          {activeMembers}/10
        </div>
        <div className="text-sm text-muted-foreground">Members</div>
      </div>

      <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="w-6 h-6 md:w-10 md:h-10 bg-primary/20 rounded-lg flex items-center justify-center">
            <Wallet className="w-3 h-3 md:w-6 md:h-6  text-primary" />
          </div>
          <span className="text-xs text-muted-foreground">Total</span>
        </div>
        <div className="text-lg md:text-2xl font-bold text-card-foreground">
          {formatCurrency(
            (formattedTotalCollateralHBAR + formattedTotalCollateralUSDC) *
              nairaRate
          )}
        </div>
        <div className="text-sm text-muted-foreground">Pool Value</div>
      </div>

      <div className="bg-card p-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 border border-border">
        <div className="flex items-center justify-between mb-2">
          <div className="w-6 h-6 md:w-10 md:h-10 bg-accent/20 rounded-lg flex items-center justify-center">
            <ShieldCheckIcon className="w-3 h-3 md:w-6 md:h-6 text-accent" />
          </div>
          <button
            onClick={handleCopy}
            className="p-1 hover:bg-primary/20 rounded"
            title="Copy Address"
          >
            {copied ? (
              <Check className="h-4 w-4 text-primary" />
            ) : (
              <Copy className="h-4 w-4 text-white" />
            )}
          </button>
        </div>
        <div className="text-lg md:text-2xl font-bold text-card-foreground">
          {memberData && formatAddress(memberData?.memberInfo.guarantor)}
        </div>
        <div className="text-sm text-muted-foreground">Guarantor address</div>
      </div>
    </div>
  );
};

export default AjoDetailsStatsGrid;
