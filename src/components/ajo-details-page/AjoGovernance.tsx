import { governanceProposals } from "@/temp-data";
import { formatAddress } from "@/utils/utils";
import { Activity, CheckCircle, Settings, Vote } from "lucide-react";

const AjoGovernance = () => {
  return (
    <div className="space-y-6">
      {/* Active Proposals */}
      <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-card-foreground flex items-center space-x-2">
            <Vote className="w-6 h-6 text-primary" />
            <span>Governance Proposals</span>
          </h3>
          <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2">
            <Vote className="w-4 h-4" />
            <span>Create Proposal</span>
          </button>
        </div>

        <div className="space-y-6">
          {governanceProposals.map((proposal) => (
            <div
              key={proposal.id}
              className="p-6 bg-background/30 rounded-lg border border-border hover:bg-background/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="text-lg font-bold text-card-foreground">
                      {proposal.title}
                    </h4>
                    <div
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        proposal.status === "active"
                          ? "bg-accent/20 text-accent"
                          : proposal.status === "executed"
                          ? "bg-green-600/20 text-green-400"
                          : "bg-muted/20 text-muted-foreground"
                      }`}
                    >
                      {proposal.status}
                    </div>
                  </div>
                  <p className="text-muted-foreground mb-3">
                    {proposal.description}
                  </p>
                  <div className="text-sm text-muted-foreground">
                    Proposed by: {formatAddress(proposal.proposer)} • Ends:{" "}
                    {proposal.endTime}
                  </div>
                </div>
              </div>

              {/* Voting Results */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Voting Results</span>
                  <span className="text-card-foreground">
                    {proposal.forVotes +
                      proposal.againstVotes +
                      proposal.abstainVotes}{" "}
                    votes cast
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm text-muted-foreground">For</span>
                    </div>
                    <span className="text-sm font-semibold text-green-400">
                      {proposal.forVotes} votes
                    </span>
                  </div>
                  <div className="w-full bg-background/50 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (proposal.forVotes /
                            (proposal.forVotes +
                              proposal.againstVotes +
                              proposal.abstainVotes)) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        Against
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-red-400">
                      {proposal.againstVotes} votes
                    </span>
                  </div>
                  <div className="w-full bg-background/50 rounded-full h-2">
                    <div
                      className="bg-red-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (proposal.againstVotes /
                            (proposal.forVotes +
                              proposal.againstVotes +
                              proposal.abstainVotes)) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-sm text-muted-foreground">
                        Abstain
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-muted-foreground">
                      {proposal.abstainVotes} votes
                    </span>
                  </div>
                  <div className="w-full bg-background/50 rounded-full h-2">
                    <div
                      className="bg-gray-500 h-2 rounded-full"
                      style={{
                        width: `${
                          (proposal.abstainVotes /
                            (proposal.forVotes +
                              proposal.againstVotes +
                              proposal.abstainVotes)) *
                          100
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Voting Actions */}
              {proposal.status === "active" && (
                <div className="flex items-center space-x-3 mt-4 pt-4 border-t border-border">
                  <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>Vote For</span>
                  </button>
                  <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold transition-all flex items-center space-x-2">
                    <span>Vote Against</span>
                  </button>
                  <button className="border border-border text-muted-foreground hover:text-card-foreground hover:bg-background/50 px-4 py-2 rounded-lg font-semibold transition-all">
                    <span>Abstain</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Governance Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h4 className="text-lg font-bold text-card-foreground mb-4 flex items-center space-x-2">
            <Vote className="w-5 h-5 text-primary" />
            <span>Voting Power</span>
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Your Voting Power:</span>
              <span className="font-bold text-primary">12.5%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                Total Eligible Voters:
              </span>
              <span className="font-semibold text-card-foreground">8</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Quorum Required:</span>
              <span className="font-semibold text-accent">51%</span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h4 className="text-lg font-bold text-card-foreground mb-4 flex items-center space-x-2">
            <Activity className="w-5 h-5 text-accent" />
            <span>Proposal History</span>
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Proposals:</span>
              <span className="font-bold text-accent">
                {governanceProposals.length}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Executed:</span>
              <span className="font-semibold text-green-400">
                {
                  governanceProposals.filter((p) => p.status === "executed")
                    .length
                }
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Active:</span>
              <span className="font-semibold text-primary">
                {
                  governanceProposals.filter((p) => p.status === "active")
                    .length
                }
              </span>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl shadow-lg p-6 border border-border">
          <h4 className="text-lg font-bold text-card-foreground mb-4 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-secondary-foreground" />
            <span>Governance Settings</span>
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Voting Period:</span>
              <span className="font-semibold text-card-foreground">7 days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Proposal Threshold:</span>
              <span className="font-semibold text-secondary-foreground">
                1 member
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Execution Delay:</span>
              <span className="font-semibold text-accent">24 hours</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AjoGovernance;
