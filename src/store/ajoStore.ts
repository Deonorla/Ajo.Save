/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { persist } from "zustand/middleware";
// import { BigNumber } from "ethers";

export interface AjoInfo {
  ajoId: number;
  ajoCore: string;
  ajoMembers: string;
  ajoCollateral: string;
  ajoPayments: string;
  ajoGovernance: string;
  creator: string;
  createdAt: string; // stored as string (timestamp or block number)
  name: string;
  isActive: boolean;
}

interface AjoStore {
  ajoInfos: AjoInfo[];
  hasMore: boolean;
  setAjoInfos: (data: any[]) => void;
  clearAjoInfos: () => void;
}

const mapAjoStruct = (ajo: any[], index: number): AjoInfo => {
  return {
    ajoId: index + 1,
    ajoCore: ajo[0],
    ajoMembers: ajo[1],
    ajoCollateral: ajo[2],
    ajoPayments: ajo[3],
    ajoGovernance: ajo[4],
    creator: ajo[5],
    createdAt: BigInt(ajo[6]) ? ajo[6].toString() : String(ajo[6]),
    name: ajo[7],
    isActive: ajo[8],
  };
};

export const useAjoStore = create<AjoStore>()(
  persist(
    (set) => ({
      ajoInfos: [],
      hasMore: false,
      setAjoInfos: (data) =>
        set({
          ajoInfos: data.map((ajo: any, index: number) =>
            mapAjoStruct(ajo, index)
          ),
        }),
      clearAjoInfos: () => set({ ajoInfos: [], hasMore: false }),
    }),
    {
      name: "ajo-storage", // key in localStorage
    }
  )
);
