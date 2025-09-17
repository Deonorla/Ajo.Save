import { members } from "@/temp-data";
import formatCurrency from "@/utils/formatCurrency";
import { formatAddress } from "@/utils/utils";
import { Activity, Download, Shield, Star, Users } from "lucide-react";

const AjoMembers = () => {
  return (
    <div className="space-y-6">
      {/* Members Overview */}
      <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-card-foreground flex items-center space-x-2">
            <Users className="w-6 h-6 text-primary" />
            <span>Members ({members.length})</span>
          </h3>
          <div className="flex items-center space-x-3">
            <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Invite Member</span>
            </button>
            <button className="border border-border text-muted-foreground hover:text-card-foreground hover:bg-background/50 px-4 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2">
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 bg-background/30 rounded-lg hover:bg-background/50 transition-colors border border-border"
            >
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center text-primary-foreground font-bold">
                    {member.avatar}
                  </div>
                  {member.isCreator && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-accent rounded-full flex items-center justify-center">
                      <Star className="w-3 h-3 text-accent-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-card-foreground">
                      {member.name}
                    </span>
                    {member.isCreator && (
                      <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full font-medium">
                        Creator
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {formatAddress(member.address)}
                  </div>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                    <span>Queue: #{member.queueNumber}</span>
                    <span>Guarantor: #{member.guarantorPosition}</span>
                    <span>Reputation: {member.reputationScore}/100</span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm text-card-foreground">
                  Collateral: {formatCurrency(member.collateralLocked)}
                </div>
                <div className="text-sm text-card-foreground">
                  Paid: {formatCurrency(member.totalPaid)}
                </div>
                {member.hasReceivedPayout && (
                  <div className="text-xs text-primary font-medium">
                    ✓ Received Payout
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Member Statistics */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h4 className="text-lg font-bold text-card-foreground mb-4 flex items-center space-x-2">
            <Star className="w-5 h-5 text-accent" />
            <span>Reputation Scores</span>
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Average Score:</span>
              <span className="font-bold text-accent">89.5/100</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Highest:</span>
              <span className="font-semibold text-primary">95/100</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Lowest:</span>
              <span className="font-semibold text-secondary-foreground">
                83/100
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h4 className="text-lg font-bold text-card-foreground mb-4 flex items-center space-x-2">
            <Shield className="w-5 h-5 text-primary" />
            <span>Collateral Status</span>
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Locked:</span>
              <span className="font-bold text-primary">
                {formatCurrency(
                  members.reduce((sum, m) => sum + m.collateralLocked, 0)
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Average:</span>
              <span className="font-semibold text-card-foreground">
                {formatCurrency(
                  members.reduce((sum, m) => sum + m.collateralLocked, 0) /
                    members.length
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Coverage Ratio:</span>
              <span className="font-semibold text-accent">110%</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h4 className="text-lg font-bold text-card-foreground mb-4 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-secondary-foreground" />
            <span>Payment Status</span>
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Up to Date:</span>
              <span className="font-bold text-green-400">
                {members.filter((m) => m.status === "paid").length}/
                {members.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Pending:</span>
              <span className="font-semibold text-accent">
                {members.filter((m) => m.status === "pending").length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Success Rate:</span>
              <span className="font-semibold text-primary">100%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjoMembers;
