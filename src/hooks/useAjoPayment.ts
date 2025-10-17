// /* eslint-disable @typescript-eslint/no-explicit-any */
// import { useEffect, useMemo, useState, useCallback } from "react";
// // 💡 V5 CHANGE: Import BigNumber and providers directly, and utils.
// import { ethers, utils, BigNumber } from "ethers";
// import AjoPayment from "@/abi/ajoPayments.json";
// import { useAjoStore } from "@/store/ajoStore";
// import erc20ABI from "@/abi/erc20ABI";
// import { toast } from "sonner";
// import { useMemberStore } from "@/store/memberInfoStore";
// import { usePaymentStore } from "@/store/ajoPaymentStore";

// // 💡 V5 setup: Destructure necessary utils
// const { formatUnits } = utils;

// const useAjoPayment = (ajoPaymentAddress: string) => {
//   const { dAppSigner } = useHashPackWallet();

//   // Extract the Ethers Provider from the dAppSigner
//   const provider = dAppSigner?.provider;

//   const { setCycleConfig } = usePaymentStore();
//   const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
//     null
//   );

//   // read-only contract (provider from dAppSigner)
//   const contractRead = useMemo(() => {
//     if (!provider || !ajoPaymentAddress) return null;
//     return new ethers.Contract(
//       ajoPaymentAddress,
//       (AjoPayment as any).abi,
//       provider
//     );
//   }, [provider, ajoPaymentAddress]);

//   // Writable contract (signer from dAppSigner)
//   useEffect(() => {
//     // dAppSigner is the Ethers Signer provided by HashConnect
//     if (!dAppSigner || !ajoPaymentAddress) {
//       setContractWrite(null);
//       return;
//     }
//     try {
//       // Use dAppSigner directly as the Signer
//       const writable = new ethers.Contract(
//         ajoPaymentAddress,
//         (AjoPayment as any).abi,
//         dAppSigner
//       );
//       setContractWrite(writable);
//     } catch (err) {
//       console.error("Failed to create write contract", err);
//       setContractWrite(null);
//     }
//   }, [dAppSigner, ajoPaymentAddress]);

//   // ---------------------------
//   // Read wrappers
//   // ---------------------------

//   const getPayOut = useCallback(
//     async (cycle: number) => {
//       if (!contractRead) return null;
//       try {
//         // V5: payout elements (amount, cycle, timestamp) are BigNumber objects
//         const payout = await contractRead.getPayout(cycle);

//         // 💡 V5 CHANGE: Use utils.formatUnits (or the destructured formatUnits)
//         // payout.amount is BigNumber
//         const formattedAmount = formatUnits(payout.amount, 18);

//         // 💡 V5 CHANGE: Use .toNumber() on BigNumber properties
//         const cycleNumber = payout.cycle.toNumber();
//         // V5 timestamp is seconds, convert to milliseconds for Date constructor
//         const timestampDate = new Date(payout.timestamp.toNumber() * 1000);

//         setCycleConfig({
//           recipient: payout.recipient,
//           amount: formattedAmount,
//           cycle: cycleNumber,
//           timeStamp: timestampDate,
//         });
//         return {
//           recipient: payout.recipient,
//           amount: formattedAmount,
//           cycle: cycleNumber,
//           timestamp: timestampDate,
//         };
//       } catch (err) {
//         console.error("Failed to fetch payout:", err);
//         toast.error("Could not fetch payout details");
//         return null;
//       }
//     },
//     [contractRead]
//   );

//   const getCurrentCycle = useCallback(async (): Promise<number | null> => {
//     try {
//       if (!contractRead) return null;

//       // 💡 V5 CHANGE: The result is a BigNumber, not native bigint.
//       // Ethers V5 contract calls return BigNumber
//       const cycleCount: BigNumber =
//         (await contractRead.getCurrentCycle?.()) ??
//         (await contractRead.currentCycle?.());

//       // 💡 V5 CHANGE: Convert BigNumber to JavaScript number
//       return cycleCount.toNumber();
//     } catch (err) {
//       console.error("❌ Failed to fetch current cycle:", err);
//       toast.error("Could not fetch current cycle count");
//       return null;
//     }
//   }, [contractRead]);

//   return {
//     getPayOut,
//     getCurrentCycle,
//   };
// };

// export default useAjoPayment;
