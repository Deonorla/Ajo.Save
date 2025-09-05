import Header from "@/components/header/Header";
import formatCurrency from "@/utils/formatCurrency";
import { TrendingUp, Zap } from "lucide-react";

interface AjoGroup {
  id: string;
  name: string;
  members: number;
  totalPool: number;
  nextPayout: string;
  myTurn: number;
  yieldGenerated: number;
}

const Ajo = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 h-auto mt-16 lg:px-8 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Digital Ajo Groups
              </h2>
              <p className="text-gray-600">
                Traditional savings, modern yields
              </p>
            </div>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
              Create New Ajo
            </button>
          </div>

          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-2">
              AI-Powered Yield Optimization
            </h3>
            <p className="text-blue-100 text-sm mb-3">
              Your idle Ajo funds are earning 8.5% APY through smart staking
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="bg-blue-500/30 px-3 py-1 rounded-full">
                <Zap className="h-3 w-3 inline mr-1" />
                Auto-staked
              </div>
              <div className="bg-blue-500/30 px-3 py-1 rounded-full">
                Risk: Low
              </div>
            </div>
          </div>

          <div className="grid gap-4">
            {mockAjoGroups.map((ajo) => (
              <div
                key={ajo.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ajo.name}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {ajo.members} members • Next payout: {ajo.nextPayout}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Pool Size</p>
                    <p className="text-xl font-bold text-gray-900">
                      {formatCurrency(ajo.totalPool)}
                    </p>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-700">Yield Generated</p>
                      <p className="text-lg font-semibold text-green-800">
                        {formatCurrency(ajo.yieldGenerated)}
                      </p>
                    </div>
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Your Turn</p>
                    <p className="text-lg font-bold text-gray-900">
                      #{ajo.myTurn}
                    </p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600">Expected Amount</p>
                    <p className="text-lg font-bold text-gray-900">
                      {formatCurrency(
                        (ajo.totalPool + ajo.yieldGenerated) / ajo.members
                      )}
                    </p>
                  </div>
                </div>

                <button className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                  Make Monthly Contribution
                </button>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Ajo;

const mockAjoGroups: AjoGroup[] = [
  {
    id: "1",
    name: "Tech Bros Ajo",
    members: 10,
    totalPool: 5000000,
    nextPayout: "Dec 15, 2024",
    myTurn: 3,
    yieldGenerated: 125000,
  },
  {
    id: "2",
    name: "Market Vendors Union",
    members: 25,
    totalPool: 12500000,
    nextPayout: "Jan 5, 2025",
    myTurn: 8,
    yieldGenerated: 312500,
  },
];
