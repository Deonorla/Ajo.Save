import { useMembersStore } from "@/store/ajoMembersStore";
import { useTokenStore } from "@/store/tokenStore";
import { formatAddress, useAjoDetails } from "@/utils/utils";
import formatCurrency from "@/utils/formatCurrency";
import { Users, Star } from "lucide-react";
// import useAjoMembers from "@/hooks/useAjoMembers";
import { useCallback, useEffect } from "react";
import type { AjoInfo } from "@/store/ajoStore";

const AjoMembers = ({ ajo }: { ajo: AjoInfo | null | undefined }) => {
  const { membersDetails } = useMembersStore();
  const selectedAjo = useAjoDetails();
  const { nairaRate } = useTokenStore();
  // const { getAllMembersDetails } = useAjoMembers(ajo ? ajo?.ajoMembers : "");

  const getFunctions = useCallback(async () => {
    try {
      // await getAllMembersDetails();
    } catch (err) {
      console.log("Error", err);
    }
  }, []);

  useEffect(() => {
    getFunctions();
    console.log("Members", membersDetails);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card rounded-xl shadow-lg p-4 sm:p-6 border border-border">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          <h3 className="text-lg sm:text-xl font-bold text-card-foreground flex items-center space-x-2">
            <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
            <span>Members ({membersDetails.length})</span>
          </h3>
        </div>

        {/* Members List */}
        <div className="space-y-3 sm:space-y-4">
          {membersDetails.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-6">
              No members yet — join to get started!
            </p>
          )}

          {membersDetails.map((member, idx) => (
            <div
              key={member.userAddress}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-background/30 rounded-lg border border-border hover:bg-background/50 transition-colors"
            >
              {/* Left Section */}
              <div className="flex items-center space-x-3 sm:space-x-4 mb-3 sm:mb-0">
                <div className="relative">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm sm:text-base">
                    #{idx + 1}
                  </div>

                  {selectedAjo?.creator === member.userAddress && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-accent rounded-full flex items-center justify-center">
                      <Star className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-accent-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm text-primary font-mono">
                    {formatAddress(member.userAddress)}
                    {selectedAjo?.creator === member.userAddress && (
                      <span className="px-2 py-0.5 bg-accent/20 text-accent text-[10px] sm:text-xs rounded-full font-medium mt-1 w-fit ml-1">
                        Creator
                      </span>
                    )}
                  </span>

                  <div className="flex flex-wrap gap-2 mt-1 text-[10px] sm:text-xs text-muted-foreground">
                    <span>
                      Queue:{" "}
                      <span className="text-primary">
                        #{member.queuePosition}
                      </span>
                    </span>
                    <span>
                      Guarantor:{" "}
                      <span className="text-primary">
                        #{member.guarantorQueuePosition}
                      </span>
                    </span>
                    <span>
                      Reputation:{" "}
                      <span className="text-primary">
                        {member.reputationScore}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Right Section */}
              <div className="text-xs sm:text-sm text-start sm:text-end">
                <div className="text-primary-foreground/70 mb-1">
                  Collateral Locked:{" "}
                  <span className="text-[#3DB569] font-semibold">
                    {formatCurrency(
                      (Number(member.collateralLocked) / 1_000_000) * nairaRate
                    )}{" "}
                    ✓
                  </span>
                </div>

                <div>
                  Paid this cycle:{" "}
                  <span
                    className={`font-semibold ${
                      member.hasPaidThisCycle
                        ? "text-[#3DB569]"
                        : "text-[#EA4343]"
                    }`}
                  >
                    {member.hasPaidThisCycle ? "Yes ✓" : "Not yet"}
                  </span>
                </div>

                {member.hasReceivedPayout && (
                  <div className="text-[#3DB569] text-[11px] sm:text-xs font-medium mt-1">
                    ✓ Received Payout
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AjoMembers;
