/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback } from "react";
import { BigNumber, ethers } from "ethers";
import { useWallet } from "./../auth/WalletContext";
import AjoPayment from "@/abi/ajoPayments.json";
import { useAjoStore } from "@/store/ajoStore";
import erc20ABI from "@/abi/erc20ABI";
import { toast } from "sonner";
import { useMemberStore } from "@/store/memberInfoStore";
import { usePaymentStore } from "@/store/ajoPaymentStore";

const useAjoPayment = (ajoPaymentAddress: string) => {
  const { provider } = useWallet();
  const { setCycleConfig } = usePaymentStore();
  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );

  // read-only contract (provider)
  const contractRead = useMemo(() => {
    if (!provider || !ajoPaymentAddress) return null;
    return new ethers.Contract(
      ajoPaymentAddress,
      (AjoPayment as any).abi,
      provider
    );
  }, [provider, ajoPaymentAddress]);

  useEffect(() => {
    if (!provider || !ajoPaymentAddress) {
      setContractWrite(null);
      return;
    }
    try {
      const signer = provider.getSigner();
      const writable = new ethers.Contract(
        ajoPaymentAddress,
        (AjoPayment as any).abi,
        signer
      );
      setContractWrite(writable);
    } catch (err) {
      console.error("Failed to create write contract", err);
      setContractWrite(null);
    }
  }, [provider, ajoPaymentAddress]);

  // ---------------------------
  // Read wrappers
  // ---------------------------

  const getPayOut = useCallback(
    async (cycle: number) => {
      if (!contractRead) return null;
      try {
        const payout = await contractRead.getPayout(cycle);
        setCycleConfig({
          recipient: payout.recipient,
          amount: ethers.utils.formatUnits(payout.amount, 18), // adjust decimals if not 18
          cycle: payout.cycle.toNumber(),
          timeStamp: new Date(payout.timestamp.toNumber() * 1000),
        });
        return {
          recipient: payout.recipient,
          amount: ethers.utils.formatUnits(payout.amount, 18), // adjust decimals if not 18
          cycle: payout.cycle.toNumber(),
          timestamp: new Date(payout.timestamp.toNumber() * 1000),
        };
      } catch (err) {
        console.error("Failed to fetch payout:", err);
        toast.error("Could not fetch payout details");
        return null;
      }
    },
    [contractRead]
  );
  const getCurrentCycle = useCallback(async (): Promise<number | null> => {
    try {
      if (!contractRead) return null;

      // Either of these should work depending on deployment
      const cycleCount: BigNumber =
        (await contractRead.getCurrentCycle?.()) ??
        (await contractRead.currentCycle?.());

      return cycleCount.toNumber();
    } catch (err) {
      console.error("❌ Failed to fetch current cycle:", err);
      toast.error("Could not fetch current cycle count");
      return null;
    }
  }, [contractRead]);
  return {
    getPayOut,
    getCurrentCycle,
  };
};

export default useAjoPayment;
