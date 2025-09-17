import { Coins } from "lucide-react";

const ProfileAjoGroups = () => {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
          <Coins className="w-6 h-6 text-yellow-600" />
          <span>Active Ajo Groups</span>
        </h3>
        <div className="space-y-4">
          {[
            {
              name: "Tech Bros Ajo",
              members: 12,
              contribution: "₦50,000",
              nextPayout: "5 days",
            },
            {
              name: "Lagos Landlords",
              members: 8,
              contribution: "₦100,000",
              nextPayout: "12 days",
            },
            {
              name: "Startup Founders Circle",
              members: 15,
              contribution: "₦75,000",
              nextPayout: "20 days",
            },
          ].map((ajo, index) => (
            <div
              key={index}
              className="p-4 border-2 border-gray-100 rounded-lg hover:border-yellow-300 transition-all hover:scale-105 group cursor-pointer"
            >
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold text-gray-900 group-hover:text-yellow-600 transition-colors">
                  {ajo.name}
                </h4>
                <span className="text-sm bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                  {ajo.members} members
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Monthly:</span>
                  <div className="font-semibold text-gray-900">
                    {ajo.contribution}
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">Next payout:</span>
                  <div className="font-semibold text-gray-900">
                    {ajo.nextPayout}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-6">
          Ajo Performance
        </h3>
        <div className="space-y-6">
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-yellow-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">
              ₦850,000
            </div>
            <div className="text-gray-600">Total Contributed</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">5</div>
              <div className="text-sm text-gray-600">Completed Cycles</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">100%</div>
              <div className="text-sm text-gray-600">Payment Rate</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileAjoGroups;
