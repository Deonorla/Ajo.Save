/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";

interface CycleConfig {
  amount: string;
  cycle: number;
  recipient: string;
  timeStamp: any;
}

interface PaymentStore {
  cycleConfig: CycleConfig | null;
  setCycleConfig: (config: CycleConfig | null) => void;
}

export const usePaymentStore = create<PaymentStore>()((set) => ({
  cycleConfig: null,
  setCycleConfig: (config) => set({ cycleConfig: config }),
}));
