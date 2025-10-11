/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback } from "react";
import { ethers } from "ethers";
import useHashPackWallet from "@/hooks/useHashPackWallet"; // 👈 SWITCHED TO HASH PACK HOOK
import AjoMembers from "@/abi/ajoMembers.json";
import { useMembersStore } from "@/store/ajoMembersStore";

const useAjoMembers = (ajoMembersAddress: string) => {
  const { dAppSigner } = useHashPackWallet();

  // Extract the Ethers Provider from the dAppSigner
  const provider = dAppSigner?.provider;

  const { setMembersDetails } = useMembersStore();
  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );

  // ---------------- CONTRACT INSTANCES ----------------

  // ✅ Read-only contract (Uses provider from dAppSigner)
  const contractRead = useMemo(() => {
    if (!provider || !ajoMembersAddress) return null;
    return new ethers.Contract(
      ajoMembersAddress,
      (AjoMembers as any).abi,
      provider
    );
  }, [provider, ajoMembersAddress]);

  // ✅ Writable contract (with signer) (Uses dAppSigner directly)
  useEffect(() => {
    // dAppSigner is the Ethers Signer provided by HashConnect
    if (!dAppSigner || !ajoMembersAddress) {
      setContractWrite(null);
      return;
    }
    try {
      // Use dAppSigner directly as the Signer
      const writable = new ethers.Contract(
        ajoMembersAddress,
        (AjoMembers as any).abi,
        dAppSigner
      );
      setContractWrite(writable);
    } catch (err) {
      console.error("Failed to create write contract", err);
      setContractWrite(null);
    }
  }, [dAppSigner, ajoMembersAddress]);

  // ---------------- READ FUNCTIONS ----------------

  const getAllMembersDetails = useCallback(async () => {
    if (!contractRead) return [];
    try {
      const result = await contractRead.getAllMembersDetails();
      setMembersDetails(result);
      return result;
    } catch (err) {
      console.error("❌ Error fetching all member details:", err);
      return [];
    }
  }, [contractRead]);

  const getMembersDetailsPaginated = useCallback(
    async (offset: number, limit: number) => {
      if (!contractRead) return [];
      try {
        const result = await contractRead.getMembersDetailsPaginated(
          offset,
          limit
        );
        return result;
      } catch (err) {
        console.error("❌ Error fetching paginated members:", err);
        return [];
      }
    },
    [contractRead]
  );

  const getMemberActivity = useCallback(
    async (memberAddress: string) => {
      if (!contractRead) return null;
      try {
        const result = await contractRead.getMemberActivity(memberAddress);
        return result;
      } catch (err) {
        console.error("❌ Error fetching member activity:", err);
        return null;
      }
    },
    [contractRead]
  );

  const getMembersNeedingPayment = useCallback(async () => {
    if (!contractRead) return [];
    try {
      const result = await contractRead.getMembersNeedingPayment();
      return result;
    } catch (err) {
      console.error("❌ Error fetching members needing payment:", err);
      return [];
    }
  }, [contractRead]);

  const getMembersWithDefaults = useCallback(async () => {
    if (!contractRead) return [];
    try {
      const result = await contractRead.getMembersWithDefaults();
      return result;
    } catch (err) {
      console.error("❌ Error fetching members with defaults:", err);
      return [];
    }
  }, [contractRead]);

  const getTopMembersByReputation = useCallback(
    async (limit: number) => {
      if (!contractRead) return [];
      try {
        const result = await contractRead.getTopMembersByReputation(limit);
        return result;
      } catch (err) {
        console.error("❌ Error fetching top members:", err);
        return [];
      }
    },
    [contractRead]
  );

  const getMembersByStatus = useCallback(
    async (isActive: boolean) => {
      if (!contractRead) return [];
      try {
        const result = await contractRead.getMembersByStatus(isActive);
        return result;
      } catch (err) {
        console.error("❌ Error fetching members by status:", err);
        return [];
      }
    },
    [contractRead]
  );

  // 🔹 Event Listeners (Uncomment and adjust if needed for Ethers v6)
  // NOTE: Event listeners work the same way in Ethers v6, but BigNumber
  // access might change if you are using TypeScript with strict types.

  // useEffect(() => {
  //    if (!contractRead) return;

  //    const handleMemberJoined = (
  //      member: string,
  //      queueNumber: BigNumber, // BigNumber is still used in Ethers v6 for large integers
  //      collateral: BigNumber,
  //      token: number
  //    ) => {
  //      console.log("📥 MemberJoined:", {
  //        member,
  //        queueNumber: queueNumber.toString(),
  //        collateral: collateral.toString(),
  //        token,
  //      });
  //    };

  //    const handleMemberRemoved = (member: string) => {
  //      console.log("❌ MemberRemoved:", { member });
  //    };

  //    const handleMemberUpdated = (member: string) => {
  //      console.log("🔄 MemberUpdated:", { member });
  //    };

  //    const handleGuarantorAssigned = (member: string, guarantor: string) => {
  //      console.log("🤝 GuarantorAssigned:", { member, guarantor });
  //    };

  //    contractRead.on("MemberJoined", handleMemberJoined);
  //    contractRead.on("MemberRemoved", handleMemberRemoved);
  //    contractRead.on("MemberUpdated", handleMemberUpdated);
  //    contractRead.on("GuarantorAssigned", handleGuarantorAssigned);

  //    return () => {
  //      contractRead.off("MemberJoined", handleMemberJoined);
  //      contractRead.off("MemberRemoved", handleMemberRemoved);
  //      contractRead.off("MemberUpdated", handleMemberUpdated);
  //      contractRead.off("GuarantorAssigned", handleGuarantorAssigned);
  //    };
  // }, [contractRead]);

  // ---------------- RETURN HOOK ----------------
  return {
    contractRead,
    contractWrite,
    getAllMembersDetails,
    getMembersDetailsPaginated,
    getMemberActivity,
    getMembersNeedingPayment,
    getMembersWithDefaults,
    getTopMembersByReputation,
    getMembersByStatus,
  };
};

export default useAjoMembers;
