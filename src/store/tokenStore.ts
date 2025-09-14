import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TokenState {
  whbar: string | null;
  usdc: string | null;
  loading: boolean;
  error: string | null;
  setWhbar: (bal: string) => void;
  setUsdc: (bal: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (err: string | null) => void;
  reset: () => void;
}

export const useTokenStore = create<TokenState>()(
  persist(
    (set) => ({
      whbar: null,
      usdc: null,
      loading: false,
      error: null,
      setWhbar: (bal) => set({ whbar: bal }),
      setUsdc: (bal) => set({ usdc: bal }),
      setLoading: (loading) => set({ loading }),
      setError: (err) => set({ error: err }),
      reset: () =>
        set({ whbar: null, usdc: null, loading: false, error: null }),
    }),
    { name: "token-storage" } //persisted in local storage
  )
);
