import { create } from "zustand";

interface AjoStats {
  totalMembers: string;
  activeMembers: string;
  totalCollateralUSDC: string;
  totalCollateralHBAR: string;
  contractBalanceUSDC: string;
  contractBalanceHBAR: string;
  currentQueuePosition: string;
  activeToken: number;
}

interface AjoState {
  ajoStats: AjoStats | null;
  setStats: (stats: AjoStats) => void;
  clearStats: () => void;
}

export const useAjoStore = create<AjoState>((set) => ({
  ajoStats: null,
  setStats: (stats) => set({ ajoStats: stats }),
  clearStats: () => set({ ajoStats: null }),
}));
