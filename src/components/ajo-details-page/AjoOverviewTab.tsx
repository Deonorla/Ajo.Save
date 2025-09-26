import useAjoCore from "@/hooks/useAjoCore";
import { useAjoStore } from "@/store/ajoStore";
import { useTokenStore } from "@/store/tokenStore";
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
import { useEffect, useState } from "react";

const AjoOverviewTab = () => {
  const { getCollateralDemo } = useAjoCore();
  const { ajoStats } = useAjoStore();
  const { nairaRate } = useTokenStore();
  const [demoData, setDemoData] = useState<{
    positions: string[];
    collaterals: string[];
  } | null>(null);

  const getDemo = async () => {
    try {
      const demo = await getCollateralDemo(10, "50");
      console.log("demo", demo);
      setDemoData(demo);
    } catch (err) {
      console.log("Error getting collateral demo", err);
    }
  };

  useEffect(() => {
    getDemo();
  }, []);

  return (
    <div className="grid lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2 space-y-6">
        {/* Collateral Simulation  */}
        {demoData && (
          <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
            <h3 className="text-xl font-bold text-card-foreground mb-4 flex items-center space-x-2">
              <Shield className="w-6 h-6 text-primary" />
              <span>Collateral Simulation</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg">
                <thead>
                  <tr className="bg-primary/20 text-left">
                    <th className="p-2">Position</th>
                    <th className="p-2">Collateral</th>
                  </tr>
                </thead>
                <tbody>
                  {demoData.positions.map((pos, idx) => (
                    <tr
                      key={idx}
                      className="border-t hover:bg-primary/10 transition"
                    >
                      <td className="p-2 font-medium text-card-foreground">
                        {pos}
                      </td>
                      <td className="p-2 text-white">
                        {formatCurrency(
                          Number(demoData.collaterals[idx]) * nairaRate
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {/* Cycle Progress */}
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h3 className="text-xl font-bold text-card-foreground mb-4 flex items-center space-x-2">
            <Target className="w-6 h-6 text-primary" />
            <span>Current Cycle Progress</span>
          </h3>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Cycle {0} of {12}
              </span>
              <span className="font-semibold text-card-foreground">
                Next payout: Pending
              </span>
            </div>

            <div className="w-full bg-background/50 rounded-full h-3 border border-border">
              <div
                className="bg-gradient-to-r from-primary to-accent h-3 rounded-full transition-all duration-1000"
                style={{
                  width: `${(0 / 12) * 100}%`,
                }}
              ></div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{0}</div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent">
                  {ajoStats?.activeMembers}
                </div>
                <div className="text-sm text-muted-foreground">Active</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">
                  {5 - Number(ajoStats?.activeMembers)}
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
            {!ajoStats && (
              <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
            )}
          </h3>

          {ajoStats ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Members:</span>
                  <span className="font-semibold text-card-foreground">
                    {ajoStats.totalMembers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Members:</span>
                  <span className="font-semibold text-primary">
                    {ajoStats.activeMembers}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queue Position:</span>
                  <span className="font-semibold text-card-foreground">
                    {ajoStats.currentQueuePosition}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Active Token:</span>
                  <span className="font-semibold flex items-center space-x-1 text-card-foreground">
                    <Coins className="w-4 h-4" />
                    <span>{ajoStats.activeToken === 0 ? "USDC" : "WHBAR"}</span>
                  </span>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Total Collateral:
                  </span>
                  <span className="font-semibold text-secondary-foreground">
                    {formatCurrency(
                      Number(ajoStats.totalCollateralUSDC) * nairaRate
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Contract Balance:
                  </span>
                  <span className="font-semibold text-primary">
                    {formatCurrency(
                      Number(ajoStats.contractBalanceUSDC) * nairaRate
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">HBAR Balance:</span>
                  <span className="font-semibold text-card-foreground">
                    {ajoStats.contractBalanceHBAR} HBAR
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
              <span className="text-muted-foreground">Payment Token:</span>
              <span className="font-semibold text-card-foreground flex items-center space-x-1">
                <Coins className="w-4 h-4" />
                <span>USDC</span>
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cycle Length:</span>
              <span className="font-semibold text-card-foreground">
                30 days
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Privacy:</span>
              <span className="font-semibold text-card-foreground">Public</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Collateral:</span>
              <span className="font-semibold text-white">
                {formatCurrency(
                  Number(ajoStats?.totalCollateralUSDC) * nairaRate
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-primary to-accent rounded-xl shadow-lg p-6 text-primary-foreground border border-primary/30">
          <h3 className="text-lg font-bold mb-4 flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>How to participate</span>
          </h3>

          <div className="space-y-3 text-sm">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-green-400">
                Get USDC from faucet (1000 tokens)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-accent" />
              <span className="font-semibold text-card-foreground">
                Approve contract to lock your collateral
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-secondary-foreground" />
              <span className="font-semibold text-card-foreground">
                Make monthly payments
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-green-400">
                Receive payout when it's your turn!
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="font-semibold text-green-400">
                Early positions lock more collateral but get paid first!
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
