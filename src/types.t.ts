export {};

export interface AjoGroup {
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

export interface Organization {
  id: string;
  name: string;
  type: "NGO" | "Charity" | "Religious";
  impactScore: number;
  totalDonations: number;
  activeProjects: number;
  transparency: "High" | "Medium" | "Low";
}
