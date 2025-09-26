/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemberStore } from "@/store/memberInfoStore";
import { useTokenStore } from "@/store/tokenStore";
import formatCurrency from "@/utils/formatCurrency";
import { Coins } from "lucide-react";
import { useNavigate } from "react-router-dom";

const ProfileAjoGroups = ({ ajoStats }: { ajoStats: any }) => {
  const navigate = useNavigate();
  const { nairaRate } = useTokenStore();
  const { memberData } = useMemberStore();

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <Coins className="w-6 h-6 text-yellow-600" />
          <span>Active Ajo Groups</span>
        </h3>
        <div className="space-y-4">
          <div
            onClick={() => navigate(`/ajo/${ajoStats.activeToken}`)}
            className="p-4 border-2 border-gray-100/10 rounded-lg hover:border-yellow-300 transition-all hover:scale-105 group cursor-pointer"
          >
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-semibold text-white group-hover:text-yellow-600 transition-colors">
                Contract Test
              </h4>
              <span className="text-sm bg-primary/35 text-white px-2 py-1 rounded-full">
                {ajoStats.activeMembers} members
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Monthly:</span>
                <div className="font-semibold text-white">
                  {formatCurrency(50 * nairaRate)}
                </div>
              </div>
              {/* <div>
                <span className="text-gray-500">Next payout:</span>
                <div className="font-semibold text-white">{ajo.nextPayout}</div>
              </div> */}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-white mb-6">Ajo Performance</h3>
        <div className="space-y-6">
          <div className="text-center p-6 bg-gradient-to-br from-green-50 to-yellow-50 rounded-lg">
            <div className="text-3xl font-bold text-green-600 mb-2">
              {formatCurrency(
                Number(memberData?.memberInfo.lockedCollateral) * nairaRate
              )}
            </div>
            <div className="text-gray-600">Total Contributed</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">
                {memberData?.memberInfo.joinedCycle}
              </div>
              <div className="text-sm text-gray-600">Completed Cycles</div>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">
                {memberData?.pendingPenalty}
              </div>
              <div className="text-sm text-gray-600">Pending penalty</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileAjoGroups;
