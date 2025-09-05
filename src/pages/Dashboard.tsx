import Header from "@/components/header/Header";
import { Shield, Users, Star, ChevronRight } from "lucide-react";
import { useState, useEffect } from "react";

interface Organization {
  id: string;
  name: string;
  type: "NGO" | "Charity" | "Religious";
  impactScore: number;
  totalDonations: number;
  activeProjects: number;
  transparency: "High" | "Medium" | "Low";
}

const Dashboard = () => {
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const mockOrgs: Organization[] = [
    {
      id: "1",
      name: "Lagos Food Bank",
      type: "NGO",
      impactScore: 92,
      totalDonations: 45000000,
      activeProjects: 12,
      transparency: "High",
    },
    {
      id: "2",
      name: "Abuja Children Foundation",
      type: "Charity",
      impactScore: 78,
      totalDonations: 23000000,
      activeProjects: 8,
      transparency: "Medium",
    },
    {
      id: "3",
      name: "Victory Church Lagos",
      type: "Religious",
      impactScore: 45,
      totalDonations: 120000000,
      activeProjects: 3,
      transparency: "Low",
    },
    {
      id: "4",
      name: "Rivers State Youth Initiative",
      type: "NGO",
      impactScore: 88,
      totalDonations: 32000000,
      activeProjects: 15,
      transparency: "High",
    },
  ];

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);

  const getTransparencyColor = (level: string) => {
    switch (level) {
      case "High":
        return "bg-green-100 text-green-800";
      case "Medium":
        return "bg-yellow-100 text-yellow-800";
      case "Low":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getImpactColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-50";
    if (score >= 60) return "text-yellow-600 bg-yellow-50";
    return "text-red-600 bg-red-50";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 h-auto mt-16 lg:px-8 py-6">
        <div
          className={`space-y-6 mt-8 transform transition-all duration-1000 ${
            isVisible ? "translate-y-0 opacity-100" : "translate-y-10 opacity-0"
          }`}
        >
          {/* Welcome Banner */}
          <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-2">Welcome</h2>
            <p className="text-green-100">Dey Play - We Dey See Your Lies 👀</p>
            <p className="text-sm text-green-200 mt-2">
              Transparency on-chain, culture in our DNA
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
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Organizations Tracked</p>
                  <p className="text-2xl font-bold text-gray-900">247</p>
                </div>
                <Shield className="h-8 w-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Ajo Pools</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(125000000)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Cultural NFTs</p>
                  <p className="text-2xl font-bold text-gray-900">1,429</p>
                </div>
                <Star className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          {/* Reports */}
          <div
            className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transform transition-all duration-1000 delay-400 ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "translate-y-10 opacity-0"
            }`}
          >
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Recent Transparency Reports
              </h3>
              <p className="text-gray-600 text-sm">
                Latest organizations under community review
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {mockOrgs.slice(0, 3).map((org, index) => (
                <div
                  key={org.id}
                  className={`p-4 transition-all cursor-pointer transform duration-700 ${
                    isVisible
                      ? "translate-y-0 opacity-100"
                      : "translate-y-5 opacity-0"
                  }`}
                  style={{ transitionDelay: `${600 + index * 150}ms` }}
                  onClick={() => setSelectedOrg(org)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium text-gray-900">
                          {org.name}
                        </h4>
                        <span
                          className={`px-2 py-1 text-xs font-medium rounded-full ${getTransparencyColor(
                            org.transparency
                          )}`}
                        >
                          {org.transparency}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {org.type} • {formatCurrency(org.totalDonations)} total
                        donations
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getImpactColor(
                          org.impactScore
                        )}`}
                      >
                        {org.impactScore}%
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
