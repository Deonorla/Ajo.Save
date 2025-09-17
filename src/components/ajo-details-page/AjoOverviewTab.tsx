import { ajoData, paymentHistory } from "@/temp-data";
import formatCurrency from "@/utils/formatCurrency";
import { formatAddress } from "@/utils/utils";
import {
  Activity,
  CheckCircle,
  Coins,
  Database,
  Gift,
  Link,
  RefreshCw,
  Shield,
  Target,
} from "lucide-react";

interface AjoOverviewTabProps {
  contractStats: ContractStats | null;
  isLoading: boolean;
}

const AjoOverviewTab = ({ contractStats, isLoading }: AjoOverviewTabProps) => {
  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Cycle Progress */}
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h3 className="text-xl font-bold text-card-foreground mb-4 flex items-center space-x-2">
            <Target className="w-6 h-6 text-primary" />
            <span>Current Cycle Progress</span>
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Cycle {ajoData.currentCycle} of {ajoData.totalCycles}
              </span>
              <span className="font-semibold text-card-foreground">
                Next payout: {ajoData.nextPayout}
              </span>
            </div>

            <div className="w-full bg-background/50 rounded-full h-3 border border-border">
              <div
                className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-1000"
                style={{
                  width: `${
                    (ajoData.currentCycle / ajoData.totalCycles) * 100
                  }%`,
                }}
              ></div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">
                  {ajoData.completedCycles}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">1</div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {ajoData.totalCycles - ajoData.currentCycle}
                </div>
                <div className="text-sm text-muted-foreground">Remaining</div>
              </div>
            </div>
          </div>
        </div>

        {/* Smart Contract Status */}
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h3 className="text-xl font-bold text-card-foreground mb-4 flex items-center space-x-2">
            <Database className="w-6 h-6 text-accent" />
            <span>Smart Contract Status</span>
            {isLoading && (
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </h3>

          {contractStats ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Members:</span>
                  <span className="font-semibold text-card-foreground">
                    {contractStats.totalMembers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Members:</span>
                  <span className="font-semibold text-primary">
                    {contractStats.activeMembers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queue Position:</span>
                  <span className="font-semibold text-card-foreground">
                    {contractStats.currentQueuePosition}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Token:</span>
                  <span className="font-semibold flex items-center space-x-1 text-card-foreground">
                    <Coins className="w-4 h-4" />
                    <span>
                      {contractStats.activeToken === 0 ? "USDC" : "HBAR"}
                    </span>
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Total Collateral:
                  </span>
                  <span className="font-semibold text-secondary-foreground">
                    ${contractStats.totalCollateralUSDC.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Contract Balance:
                  </span>
                  <span className="font-semibold text-primary">
                    ${contractStats.contractBalanceUSDC.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HBAR Balance:</span>
                  <span className="font-semibold text-card-foreground">
                    {contractStats.contractBalanceHBAR.toFixed(8)} HBAR
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Loading contract data...</p>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h3 className="text-xl font-bold text-card-foreground mb-4 flex items-center space-x-2">
            <Activity className="w-6 h-6 text-accent" />
            <span>Recent Activity</span>
          </h3>

          <div className="space-y-4">
            {paymentHistory.slice(0, 3).map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between p-4 bg-background/30 rounded-lg border border-border"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                    <Gift className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="font-semibold text-card-foreground">
                      Payout to {payment.recipient}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Cycle {payment.cycle} • {payment.date}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono flex items-center space-x-1">
                      <Link className="w-3 h-3" />
                      <span>{formatAddress(payment.txHash)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-primary">
                    {formatCurrency(payment.amount)}
                  </div>
                  <div className="text-xs text-primary capitalize">
                    {payment.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sidebar */}
      <div className="space-y-6">
        {/* Key Information */}
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h3 className="text-lg font-bold text-card-foreground mb-4">
            Key Information
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created:</span>
              <span className="font-semibold text-card-foreground">
                {ajoData.createdDate}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Token:</span>
              <span className="font-semibold text-card-foreground flex items-center space-x-1">
                <Coins className="w-4 h-4" />
                <span>{ajoData.paymentToken}</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cycle Length:</span>
              <span className="font-semibold text-card-foreground">
                {ajoData.cycleLength} days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Privacy:</span>
              <span className="font-semibold text-card-foreground">
                {ajoData.isPrivate ? "Private" : "Public"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Collateral:</span>
              <span className="font-semibold text-secondary-foreground">
                {formatCurrency(ajoData.collateralRequired)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg p-6 text-primary-foreground border border-primary/30">
          <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Smart Contract Security</span>
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-green-400">
                Automated payments
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span className="font-semibold text-card-foreground">
                Transparent operations
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-secondary-foreground" />
              <span className="font-semibold text-card-foreground">
                Collateral protection
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="font-semibold text-primary">
                Governance voting
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span className="font-semibold text-accent">
                Reputation system
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-primary-foreground/20">
            <div className="text-xs opacity-90">
              <div>Network: Hedera Hashgraph</div>
              <div>Gas Optimization: ✓</div>
              <div>Audit Status: Verified</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjoOverviewTab;
