/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { ContractExecuteTransaction, ContractId } from "@hashgraph/sdk";
import { Interface } from "ethers";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import AjoMembers from "@/abi/ajoMembers.json";
import { useMembersStore } from "@/store/ajoMembersStore";

const MIRROR_NODE_URL = "https://testnet.mirrornode.hedera.com";

const useAjoMembers = (ajoMembersAddress: string) => {
  const wallet = useHashPackWallet();
  const { setMembersDetails } = useMembersStore();
  const [error, setError] = useState<string | null>(null);

  // Create ethers interface for ABI encoding/decoding
  const contractInterface = new Interface((AjoMembers as any).abi);

  // Helper: Encode function call using ABI
  const encodeFunctionCall = useCallback(
    (functionName: string, params: any[] = []) => {
      try {
        return contractInterface.encodeFunctionData(functionName, params);
      } catch (err: any) {
        console.error(`Failed to encode ${functionName}:`, err);
        throw err;
      }
    },
    [contractInterface]
  );

  // Helper: Decode function result using ABI
  const decodeFunctionResult = useCallback(
    (functionName: string, data: string) => {
      try {
        return contractInterface.decodeFunctionResult(functionName, data);
      } catch (err: any) {
        console.error(`Failed to decode ${functionName}:`, err);
        throw err;
      }
    },
    [contractInterface]
  );

  // Helper: Query contract (read-only via Mirror Node)
  const queryContract = useCallback(
    async (functionName: string, params: any[] = []) => {
      try {
        // Encode the function call using ABI
        const encodedData = encodeFunctionCall(functionName, params);

        // Query via Mirror Node REST API
        const response = await fetch(
          `${MIRROR_NODE_URL}/api/v1/contracts/call`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: encodedData,
              to: ajoMembersAddress,
              estimate: false,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`Query failed: ${response.statusText}`);
        }

        const result = await response.json();

        // Decode the result using ABI
        if (result.result) {
          const decoded = decodeFunctionResult(functionName, result.result);
          return decoded;
        }

        return null;
      } catch (err: any) {
        console.error(`Query ${functionName} failed:`, err);
        setError(err.message);
        return null;
      }
    },
    [ajoMembersAddress, encodeFunctionCall, decodeFunctionResult]
  );

  // Helper: Execute contract transaction (write)
  const executeContract = useCallback(
    async (functionName: string, params: any[] = []) => {
      if (!wallet.connected || !wallet.accountId) {
        throw new Error("Wallet not connected");
      }

      try {
        // Encode function call using ABI
        const encodedData = encodeFunctionCall(functionName, params);

        // Remove '0x' prefix if present
        const functionData = encodedData.startsWith("0x")
          ? encodedData.slice(2)
          : encodedData;

        // Create contract execute transaction
        const transaction = new ContractExecuteTransaction()
          .setContractId(ContractId.fromString(ajoMembersAddress))
          .setGas(1000000)
          .setFunctionParameters(Buffer.from(functionData, "hex"));

        // Execute through wallet signer
        const txId = await wallet.sendTransaction(transaction);
        return txId;
      } catch (err: any) {
        console.error(`Execute ${functionName} failed:`, err);
        throw err;
      }
    },
    [wallet, ajoMembersAddress, encodeFunctionCall]
  );

  // ---------------------------
  // Read Functions
  // ---------------------------

  // 🔹 Fetch all member details
  const getAllMembersDetails = useCallback(async () => {
    try {
      const result = await queryContract("getAllMembersDetails", []);

      if (!result || result.length === 0) return [];

      // The result should be an array of member details
      const membersArray = Array.isArray(result[0]) ? result[0] : [];
      setMembersDetails(membersArray);
      return membersArray;
    } catch (err) {
      console.error("❌ Error fetching all member details:", err);
      return [];
    }
  }, [queryContract, setMembersDetails]);

  // 🔹 Paginated members
  const getMembersDetailsPaginated = useCallback(
    async (offset: number, limit: number) => {
      try {
        const result = await queryContract("getMembersDetailsPaginated", [
          offset,
          limit,
        ]);

        if (!result || result.length === 0) return [];

        return Array.isArray(result[0]) ? result[0] : [];
      } catch (err) {
        console.error("❌ Error fetching paginated members:", err);
        return [];
      }
    },
    [queryContract]
  );

  // 🔹 Member activity
  const getMemberActivity = useCallback(
    async (memberAddress: string) => {
      try {
        const result = await queryContract("getMemberActivity", [
          memberAddress,
        ]);

        if (!result || result.length === 0) return null;

        // Return the member activity object
        return result[0] ?? null;
      } catch (err) {
        console.error("❌ Error fetching member activity:", err);
        return null;
      }
    },
    [queryContract]
  );

  // 🔹 Members needing payment
  const getMembersNeedingPayment = useCallback(async () => {
    try {
      const result = await queryContract("getMembersNeedingPayment", []);

      if (!result || result.length === 0) return [];

      return Array.isArray(result[0]) ? result[0] : [];
    } catch (err) {
      console.error("❌ Error fetching members needing payment:", err);
      return [];
    }
  }, [queryContract]);

  // 🔹 Members with defaults
  const getMembersWithDefaults = useCallback(async () => {
    try {
      const result = await queryContract("getMembersWithDefaults", []);

      if (!result || result.length === 0) return [];

      return Array.isArray(result[0]) ? result[0] : [];
    } catch (err) {
      console.error("❌ Error fetching members with defaults:", err);
      return [];
    }
  }, [queryContract]);

  // 🔹 Top members by reputation
  const getTopMembersByReputation = useCallback(
    async (limit: number) => {
      try {
        const result = await queryContract("getTopMembersByReputation", [
          limit,
        ]);

        if (!result || result.length === 0) return [];

        return Array.isArray(result[0]) ? result[0] : [];
      } catch (err) {
        console.error("❌ Error fetching top members:", err);
        return [];
      }
    },
    [queryContract]
  );

  // 🔹 Get members by status
  const getMembersByStatus = useCallback(
    async (isActive: boolean) => {
      try {
        const result = await queryContract("getMembersByStatus", [isActive]);

        if (!result || result.length === 0) return [];

        return Array.isArray(result[0]) ? result[0] : [];
      } catch (err) {
        console.error("❌ Error fetching members by status:", err);
        return [];
      }
    },
    [queryContract]
  );

  // ---------------------------
  // Event Listeners (Optional - for future implementation)
  // ---------------------------
  // Note: Hedera event listening requires using Mirror Node REST API
  // or WebSocket subscriptions. This is more complex than Ethereum events.
  // For now, polling is recommended for updates.

  // Example polling function (you can implement this if needed):
  // const pollForEvents = useCallback(async () => {
  //   try {
  //     const response = await fetch(
  //       `${MIRROR_NODE_URL}/api/v1/contracts/${ajoMembersAddress}/results/logs`
  //     );
  //     const data = await response.json();
  //     // Process logs/events
  //   } catch (err) {
  //     console.error("Error polling events:", err);
  //   }
  // }, [ajoMembersAddress]);

  return {
    connected: wallet.connected,
    error,
    getAllMembersDetails,
    getMembersDetailsPaginated,
    getMemberActivity,
    getMembersNeedingPayment,
    getMembersWithDefaults,
    getTopMembersByReputation,
    getMembersByStatus,
    executeContract, // Expose for any write operations
  };
};

export default useAjoMembers;
