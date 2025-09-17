export {};
declare global {
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

  interface ContractStats {
    totalMembers: number;
    activeMembers: number;
    totalCollateralUSDC: number;
    totalCollateralHBAR: number;
    contractBalanceUSDC: number;
    contractBalanceHBAR: number;
    currentQueuePosition: number;
    activeToken: number;
  }
}
