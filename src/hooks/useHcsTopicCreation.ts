/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Client, TopicCreateTransaction, PrivateKey } from "@hashgraph/sdk";
import { ethers } from "ethers";
import { toast } from "sonner";

interface HcsTopicResult {
  topicId: string;
  bytes32TopicId: string;
  transactionId?: string;
  simulated: boolean;
}

export const useHcsTopicCreation = () => {
  const [creating, setCreating] = useState(false);

  /**
   * Creates a real HCS topic on Hedera network
   * @param ajoName - Name of the Ajo for the topic memo
   * @param network - 'testnet' or 'mainnet'
   * @returns HCS topic information
   */
  const createHcsTopic = async (
    ajoName: string,
    network: "testnet" | "mainnet" = "testnet"
  ): Promise<HcsTopicResult> => {
    setCreating(true);

    try {
      // Get operator credentials from environment variables
      const operatorId = import.meta.env.VITE_HEDERA_OPERATOR_ID;
      const operatorKey = import.meta.env.VITE_HEDERA_OPERATOR_KEY;

      if (!operatorId || !operatorKey) {
        throw new Error(
          "Hedera operator credentials not configured. Please set VITE_HEDERA_OPERATOR_ID and VITE_HEDERA_OPERATOR_KEY"
        );
      }

      // Create Hedera client
      const client = Client.forName(network);
      client.setOperator(operatorId, PrivateKey.fromString(operatorKey));

      toast.info(`Creating HCS topic for "${ajoName}"...`);

      // Create the HCS topic
      const transaction = new TopicCreateTransaction()
        .setTopicMemo(`AJO.SAVE Governance - ${ajoName}`)
        .setAdminKey(client.operatorPublicKey!)
        .setSubmitKey(client.operatorPublicKey!);

      // Execute transaction
      const txResponse = await transaction.execute(client);
      const receipt = await txResponse.getReceipt(client);

      if (!receipt.topicId) {
        throw new Error("Topic ID not returned from Hedera");
      }

      const topicId = receipt.topicId.toString();
      const topicNum = receipt.topicId.num.toString();

      // Convert topic number to bytes32 format for Solidity
      const bytes32TopicId = ethers.utils.hexZeroPad(
        ethers.utils.hexlify(BigInt(topicNum)),
        32
      );

      console.log("✅ HCS Topic Created:");
      console.log("  Topic ID (Hedera):", topicId);
      console.log("  Topic ID (bytes32):", bytes32TopicId);
      console.log("  Transaction ID:", txResponse.transactionId.toString());

      toast.success("HCS topic created successfully!");

      // Close the client
      client.close();

      return {
        topicId,
        bytes32TopicId,
        transactionId: txResponse.transactionId.toString(),
        simulated: false,
      };
    } catch (error: any) {
      console.error("Failed to create HCS topic:", error);

      // Fallback to simulated topic ID for development/testing
      toast.warning("Using simulated HCS topic ID for development");

      const simulatedTopicNum = Math.floor(Math.random() * 1000000);
      const bytes32TopicId = ethers.utils.hexZeroPad(
        ethers.utils.hexlify(simulatedTopicNum),
        32
      );

      return {
        topicId: `0.0.${simulatedTopicNum}`,
        bytes32TopicId,
        simulated: true,
      };
    } finally {
      setCreating(false);
    }
  };

  return {
    createHcsTopic,
    creating,
  };
};
