/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState, useCallback } from "react";
import { BigNumber, ethers } from "ethers";
import { useWallet } from "./../auth/WalletContext";
import AjoMembers from "@/abi/ajoMembers.json";
import { useMembersStore } from "@/store/ajoMembersStore";

const useAjoMembers = (ajoMembersAddress: string) => {
  const { provider } = useWallet();
  const { setMembersDetails } = useMembersStore();
  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );

  // ✅ Read-only contract
  const contractRead = useMemo(() => {
    if (!provider || !ajoMembersAddress) return null;
    return new ethers.Contract(
      ajoMembersAddress,
      (AjoMembers as any).abi,
      provider
    );
  }, [provider, ajoMembersAddress]);

  // ✅ Writable contract (with signer)
  useEffect(() => {
    if (!provider || !ajoMembersAddress) {
      setContractWrite(null);
      return;
    }
    try {
      const signer = provider.getSigner();
      const writable = new ethers.Contract(
        ajoMembersAddress,
        (AjoMembers as any).abi,
        signer
      );
      setContractWrite(writable);
    } catch (err) {
      console.error("Failed to create write contract", err);
      setContractWrite(null);
    }
  }, [provider, ajoMembersAddress]);

  // 🔹 Fetch all member details
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

  // 🔹 Paginated members
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

  // 🔹 Member activity
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

  // 🔹 Members needing payment
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

  // 🔹 Members with defaults
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

  // 🔹 Top members by reputation
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

  // 🔹 Get members by status
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

  // 🔹 Event Listeners
  //   useEffect(() => {
  //     if (!contractRead) return;

  //     const handleMemberJoined = (
  //       member: string,
  //       queueNumber: BigNumber,
  //       collateral: BigNumber,
  //       token: number
  //     ) => {
  //       console.log("📥 MemberJoined:", {
  //         member,
  //         queueNumber: queueNumber.toString(),
  //         collateral: collateral.toString(),
  //         token,
  //       });
  //     };

  //     const handleMemberRemoved = (member: string) => {
  //       console.log("❌ MemberRemoved:", { member });
  //     };

  //     const handleMemberUpdated = (member: string) => {
  //       console.log("🔄 MemberUpdated:", { member });
  //     };

  //     const handleGuarantorAssigned = (member: string, guarantor: string) => {
  //       console.log("🤝 GuarantorAssigned:", { member, guarantor });
  //     };

  //     contractRead.on("MemberJoined", handleMemberJoined);
  //     contractRead.on("MemberRemoved", handleMemberRemoved);
  //     contractRead.on("MemberUpdated", handleMemberUpdated);
  //     contractRead.on("GuarantorAssigned", handleGuarantorAssigned);

  //     return () => {
  //       contractRead.off("MemberJoined", handleMemberJoined);
  //       contractRead.off("MemberRemoved", handleMemberRemoved);
  //       contractRead.off("MemberUpdated", handleMemberUpdated);
  //       contractRead.off("GuarantorAssigned", handleGuarantorAssigned);
  //     };
  //   }, [contractRead]);

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
