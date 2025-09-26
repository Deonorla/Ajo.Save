// store/memberStore.ts
import { create } from "zustand";

export interface MemberStruct {
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
}

export interface MemberInfoResponse {
  memberInfo: MemberStruct;
  pendingPenalty: string;
  effectiveVotingPower: string;
}

interface QueueInfo {
  position: string;
  estimatedCyclesWait: string;
}

interface TokenConfig {
  monthlyPayment: string;
  isActive: boolean;
}

interface MemberStore {
  memberData: MemberInfoResponse | null;
  needsToPayThisCycle: boolean | null;
  queueInfo: QueueInfo | null;
  tokenConfig: TokenConfig | null;
  loading: boolean;
  error: string | null;

  // setters
  setMemberData: (data: MemberInfoResponse | null) => void;
  setNeedsToPay: (value: boolean | null) => void;
  setQueueInfo: (info: QueueInfo | null) => void;
  setTokenConfig: (config: TokenConfig | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useMemberStore = create<MemberStore>((set) => ({
  memberData: null,
  needsToPayThisCycle: null,
  queueInfo: null,
  tokenConfig: null,
  loading: false,
  error: null,

  setMemberData: (data) => set({ memberData: data }),
  setNeedsToPay: (value) => set({ needsToPayThisCycle: value }),
  setQueueInfo: (info) => set({ queueInfo: info }),
  setTokenConfig: (config) => set({ tokenConfig: config }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
