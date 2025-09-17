import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AjoStats {
  totalMembers: string;
  activeMembers: string;
  totalCollateralUSDC: string;
  totalCollateralHBAR: string;
  contractBalanceUSDC: string;
  contractBalanceHBAR: string;
  currentQueuePosition: string;
  activeToken: string;
}

interface AjoState {
  ajoStats: AjoStats | null;
}
