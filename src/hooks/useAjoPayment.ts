/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import AjoPayment from "@/abi/ajoPayments.json";
import { useAjoStore } from "@/store/ajoStore";
import erc20ABI from "@/abi/erc20ABI";
import { toast } from "sonner";
import { useMemberStore } from "@/store/memberInfoStore";
import { usePaymentStore } from "@/store/ajoPaymentStore";

const useAjoPayment = (ajoPaymentAddress: string) => {
  const { dAppSigner } = useHashPackWallet();

  // Extract the Ethers Provider from the dAppSigner
  const provider = dAppSigner?.provider;

  const { setCycleConfig } = usePaymentStore();
  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );

  // read-only contract (provider from dAppSigner)
  const contractRead = useMemo(() => {
    if (!provider || !ajoPaymentAddress) return null;
    return new ethers.Contract(
      ajoPaymentAddress,
      (AjoPayment as any).abi,
      provider
    );
  }, [provider, ajoPaymentAddress]);

  // Writable contract (signer from dAppSigner)
  useEffect(() => {
    // dAppSigner is the Ethers Signer provided by HashConnect
    if (!dAppSigner || !ajoPaymentAddress) {
      setContractWrite(null);
      return;
    }
    try {
      // Use dAppSigner directly as the Signer
      const writable = new ethers.Contract(
        ajoPaymentAddress,
        (AjoPayment as any).abi,
        dAppSigner
      );
      setContractWrite(writable);
    } catch (err) {
      console.error("Failed to create write contract", err);
      setContractWrite(null);
    }
  }, [dAppSigner, ajoPaymentAddress]);

  // ---------------------------
  // Read wrappers
  // ---------------------------

  const getPayOut = useCallback(
    async (cycle: number) => {
      if (!contractRead) return null;
      try {
        const payout = await contractRead.getPayout(cycle);

        const formattedAmount = ethers.formatUnits(payout.amount, 18);

        setCycleConfig({
          recipient: payout.recipient,
          amount: formattedAmount,
          cycle: payout.cycle.toNumber(),
          timeStamp: new Date(payout.timestamp.toNumber() * 1000),
        });
        return {
          recipient: payout.recipient,
          amount: formattedAmount,
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

      const cycleCount: bigint =
        (await contractRead.getCurrentCycle?.()) ??
        (await contractRead.currentCycle?.());

      return Number(cycleCount);
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
