export {};
declare global {
  type MemberStruct = {
    queueNumber: bigint;
    joinedCycle: bigint;
    totalPaid: bigint;
    requiredCollateral: bigint;
    lockedCollateral: bigint;
    lastPaymentCycle: bigint;
    defaultCount: bigint;
    hasReceivedPayout: boolean;
    isActive: boolean;
    guarantor: string;
    preferredToken: number;
    reputationScore: bigint;
    pastPayments: bigint[];
    guaranteePosition: bigint;
  };

  export type MemberInfoResponse = {
    memberInfo: MemberStruct;
    pendingPenalty: string; // bigint -> string
    effectiveVotingPower: string; // bigint -> string
  };

  export type ContractStats = {
    totalMembers: string;
    activeMembers: string;
    totalCollateralUSDC: string;
    totalCollateralHBAR: string;
    contractBalanceUSDC: string;
    contractBalanceHBAR: string;
    currentQueuePosition: string;
    activeToken: number;
  };
  interface AjoGroup {
    id: string;
    name: string;
    description: string;
    monthlyPayment: number;
    totalMembers: number;
    currentMembers: number;
    paymentToken: "USDC" | "HBAR";
    cycleLength: number;
    collateralRequired: number;
    nextPayout: string;
    status: "active" | "forming" | "completed";
    creator: string;
    reputation: number;
    totalSaved: number;
    completedCycles: number;
  }

  interface Organization {
    id: string;
    name: string;
    type: "NGO" | "Charity" | "Religious";
    impactScore: number;
    totalDonations: number;
    activeProjects: number;
    transparency: "High" | "Medium" | "Low";
  }
}
