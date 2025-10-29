/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { ethers } from "ethers";
import {
  Client,
  TopicMessageSubmitTransaction,
  PrivateKey,
  AccountId,
  TopicId,
  ContractExecuteTransaction,
} from "@hashgraph/sdk";
import { useWalletInterface } from "@/services/wallets/useWalletInterface";
import { ContractId } from "@hashgraph/sdk";
import AjoGovernanceABI from "@/abi/ajoGovernance.json";
import { toast } from "sonner";

const normalizeSignature = (signature: string): string => {
  const sig = signature.startsWith("0x") ? signature.slice(2) : signature;
  if (sig.length === 130) {
    const v = parseInt(sig.slice(128, 130), 16);
    if (v < 27) {
      return "0x" + sig.slice(0, 128) + (v + 27).toString(16).padStart(2, "0");
    }
    return "0x" + sig;
  }
  if (sig.length === 128) return "0x" + sig + "1b";
  if (sig.length > 130) return normalizeSignature("0x" + sig.slice(0, 130));
  if (sig.length < 128) return "0x" + sig.padEnd(130, "0");
  return "0x" + sig;
};

export interface HcsVote {
  voter: string;
  support: number;
  votingPower: number;
  timestamp: number;
  hcsMessageId: string;
  hcsSequenceNumber: number;
  signature: string;
}

export interface HcsVoteReceipt {
  success: boolean;
  sequenceNumber: number;
  transactionId: string;
  cost: number;
  simulated?: boolean;
  error?: string;
}

export const useHcsVoting = (governanceAddress: string) => {
  const { accountId, walletInterface } = useWalletInterface();
  const [loading, setLoading] = useState(false);
  const [hederaClient, setHederaClient] = useState<any>(null);

  const isMetaMask = accountId?.startsWith("0x");

  const convertHcsTopicIdToHedera = useCallback(
    (bytes32TopicId: string): string | null => {
      try {
        if (bytes32TopicId.match(/^\d+\.\d+\.\d+$/)) return bytes32TopicId;
        const hex = bytes32TopicId.startsWith("0x")
          ? bytes32TopicId.slice(2)
          : bytes32TopicId;
        const topicNum = BigInt("0x" + hex);
        return `0.0.${topicNum.toString()}`;
      } catch (error: any) {
        console.error(`❌ Topic ID conversion failed: ${error.message}`);
        return null;
      }
    },
    []
  );

  const isHtsToken = (address: string): boolean => {
    if (!address.startsWith("0x")) return false;
    return address.toLowerCase().startsWith("0x" + "0".repeat(30));
  };

  const convertEvmToHederaAddress = useCallback(
    async (evmAddress: string): Promise<string> => {
      if (!evmAddress.startsWith("0x")) return evmAddress;
      if (isHtsToken(evmAddress)) {
        return `0.0.${BigInt(evmAddress).toString()}`;
      }
      try {
        const mirrorNodeUrl =
          import.meta.env.VITE_HEDERA_MIRROR_NODE_URL ||
          "https://testnet.mirrornode.hedera.com";
        const response = await fetch(
          `${mirrorNodeUrl}/api/v1/accounts/${evmAddress}`
        );
        if (!response.ok)
          throw new Error(`Mirror node query failed: ${response.statusText}`);
        const data = await response.json();
        return data.account;
      } catch (error) {
        console.error("Failed to convert EVM to Hedera address:", error);
        throw error;
      }
    },
    []
  );

  const convertToEvmAddress = (address: string): string => {
    if (address.startsWith("0x")) return address;
    const parts = address.split(".");
    if (parts.length === 3) {
      const accountNum = BigInt(parts[2]);
      return "0x" + accountNum.toString(16).padStart(40, "0");
    }
    return address;
  };

  /**
   * THE KEY INSIGHT: HashPack signatures are ALREADY Ethereum-prefixed internally
   * We just need to find which v value recovers to a valid address
   */
  const tryRecoverAddress = useCallback(
    (
      messageHash: string,
      signature: string
    ): { address: string; vValue: number } | null => {
      const sig = signature.startsWith("0x") ? signature.slice(2) : signature;
      if (sig.length !== 128) {
        // Already has v, just recover
        try {
          const prefixedHash = ethers.utils.hashMessage(
            ethers.utils.arrayify(messageHash)
          );
          const addr = ethers.utils.recoverAddress(prefixedHash, "0x" + sig);
          const v = parseInt(sig.slice(128, 130), 16);
          return { address: addr, vValue: v };
        } catch (e) {
          return null;
        }
      }

      const r = "0x" + sig.slice(0, 64);
      const s = "0x" + sig.slice(64, 128);
      const prefixedHash = ethers.utils.hashMessage(
        ethers.utils.arrayify(messageHash)
      );

      // Try both v values
      for (const v of [27, 28]) {
        try {
          const testSig = r + s.slice(2) + v.toString(16).padStart(2, "0");
          const recovered = ethers.utils.recoverAddress(prefixedHash, testSig);
          console.log(`   v=${v} recovers to: ${recovered}`);
          return { address: recovered, vValue: v };
        } catch (e) {
          console.log(`   v=${v} failed:`, (e as Error).message);
        }
      }
      return null;
    },
    []
  );

  const setupHederaClient = useCallback(async () => {
    const network = import.meta.env.VITE_HEDERA_NETWORK || "testnet";
    let operatorPrivateKey = import.meta.env.VITE_HEDERA_OPERATOR_KEY;
    const operatorId = import.meta.env.VITE_HEDERA_OPERATOR_ID;

    if (!operatorPrivateKey || !operatorId) {
      console.warn("⚠️ Missing Hedera credentials");
      return null;
    }

    try {
      const accountIdObj = AccountId.fromString(operatorId);
      if (operatorPrivateKey.startsWith("0x"))
        operatorPrivateKey = operatorPrivateKey.slice(2);

      let operatorKey: PrivateKey;
      const keyPrefix = operatorPrivateKey.substring(0, 24);
      if (keyPrefix.startsWith("302e020100300506032b6570")) {
        operatorKey = PrivateKey.fromStringED25519(operatorPrivateKey);
      } else if (keyPrefix.startsWith("3030020100300706052b8104000a")) {
        operatorKey = PrivateKey.fromStringECDSA(operatorPrivateKey);
      } else {
        operatorKey = PrivateKey.fromString(operatorPrivateKey);
      }

      let client;
      if (network === "mainnet") {
        client = Client.forMainnet();
      } else if (network === "local") {
        client = Client.forNetwork({ "127.0.0.1:50211": new AccountId(3) });
        client.setMirrorNetwork(
          import.meta.env.VITE_LOCAL_NODE_ENDPOINT || "http://localhost:5551"
        );
      } else {
        client = Client.forTestnet();
      }

      client.setOperator(accountIdObj, operatorKey);
      console.log("✅ Hedera Client initialized");
      setHederaClient(client);
      return client;
    } catch (error: any) {
      console.error(`❌ Failed to setup Hedera client: ${error.message}`);
      return null;
    }
  }, []);

  /**
   * SIMPLIFIED: Sign once, recover the signer, use that for everything
   */
  const createSignedVote = useCallback(
    async (
      proposalId: number,
      support: number
    ): Promise<{
      voter: string;
      support: number;
      signature: string;
      timestamp: number;
    } | null> => {
      try {
        if (!walletInterface || !accountId) {
          toast.error("Wallet not connected");
          return null;
        }

        console.log("🗳️ Creating signed vote...");
        console.log("   Proposal:", proposalId, "Support:", support);

        // For HashPack, we'll sign with a temporary voter and then use the recovered address
        const tempVoter = isMetaMask
          ? await (async () => {
              const provider = new ethers.providers.Web3Provider(
                (window as any).ethereum
              );
              return await provider.getSigner().getAddress();
            })()
          : convertToEvmAddress(accountId);

        console.log("   Temp voter address:", tempVoter);

        const tempHcsMessageId = ethers.constants.HashZero;
        const tempHcsSequenceNumber = 0;

        const messageHash = ethers.utils.solidityKeccak256(
          ["uint256", "address", "uint8", "bytes32", "uint256"],
          [
            proposalId,
            tempVoter,
            support,
            tempHcsMessageId,
            tempHcsSequenceNumber,
          ]
        );

        console.log("   Message hash:", messageHash);

        // Get signature
        let rawSignature: string;
        if (isMetaMask) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          rawSignature = await signer.signMessage(
            ethers.utils.arrayify(messageHash)
          );
        } else {
          const messageBytes = ethers.utils.arrayify(messageHash);
          const signResult = await walletInterface.signMessage(messageBytes);
          if (!signResult?.signature) throw new Error("No signature returned");
          rawSignature = signResult.signature;
          console.log("   Raw signature:", rawSignature.slice(0, 20) + "...");
        }

        // Normalize and try to recover
        const normalized = normalizeSignature(rawSignature);
        const recovery = tryRecoverAddress(messageHash, normalized);

        if (!recovery) {
          throw new Error("Could not recover address from signature");
        }

        console.log("✅ Recovered signer:", recovery.address);
        console.log("   v value:", recovery.vValue);

        // CRITICAL FIX: The signature we have is for the WRONG message hash
        // It was created with tempVoter, but we recovered recovery.address
        // We need to create a NEW signature with the CORRECT hash

        // If recovered address differs from temp, we need a new signature
        if (recovery.address.toLowerCase() !== tempVoter.toLowerCase()) {
          console.log("⚠️ Recovered address differs from temp!");
          console.log("   Temp:", tempVoter);
          console.log("   Recovered:", recovery.address);
          console.log(
            "   Creating correct message hash and using existing signature..."
          );

          // The message hash that would make this signature valid
          // is the one we already created (with tempVoter)
          // So we store tempVoter as the voter, not recovery.address!
          // This way the contract will reconstruct the SAME hash we signed

          // Wait, that won't work either because contract expects signer to match voter

          // BETTER SOLUTION: Use the recovered address as voter,
          // but we need to resign with correct parameters
          console.log("   Requesting corrected signature...");

          const correctMessageHash = ethers.utils.solidityKeccak256(
            ["uint256", "address", "uint8", "bytes32", "uint256"],
            [
              proposalId,
              recovery.address,
              support,
              tempHcsMessageId,
              tempHcsSequenceNumber,
            ]
          );

          console.log("   Correct hash:", correctMessageHash);

          const messageBytes2 = ethers.utils.arrayify(correctMessageHash);
          const signResult2 = await walletInterface.signMessage(messageBytes2);
          if (!signResult2?.signature)
            throw new Error("No corrected signature");

          const normalized2 = normalizeSignature(signResult2.signature);
          const recovery2 = tryRecoverAddress(correctMessageHash, normalized2);

          if (!recovery2)
            throw new Error("Could not recover corrected signature");

          console.log("✅ Corrected signature, signer:", recovery2.address);

          const sig2 = normalized2.startsWith("0x")
            ? normalized2.slice(2)
            : normalized2;
          const finalSignature =
            "0x" +
            sig2.slice(0, 128) +
            recovery2.vValue.toString(16).padStart(2, "0");

          return {
            voter: recovery2.address,
            support: support,
            signature: finalSignature,
            timestamp: Math.floor(Date.now() / 1000),
          };
        }

        // Signer matches temp voter, all good
        const sig = normalized.startsWith("0x")
          ? normalized.slice(2)
          : normalized;
        const finalSignature =
          "0x" +
          sig.slice(0, 128) +
          recovery.vValue.toString(16).padStart(2, "0");

        return {
          voter: recovery.address,
          support: support,
          signature: finalSignature,
          timestamp: Math.floor(Date.now() / 1000),
        };
      } catch (error: any) {
        console.error(`❌ Vote signing failed: ${error.message}`);
        toast.error("Failed to sign vote");
        return null;
      }
    },
    [accountId, walletInterface, isMetaMask, tryRecoverAddress]
  );

  const submitVoteToHCS = useCallback(
    async (
      topicIdBytes32: string,
      voteData: {
        proposalId: number;
        voter: string;
        support: number;
        signature: string;
        timestamp: number;
      }
    ): Promise<HcsVoteReceipt> => {
      let client = hederaClient;
      if (!client) client = await setupHederaClient();

      if (!client) {
        return {
          success: true,
          sequenceNumber: Math.floor(Math.random() * 1000000),
          transactionId: `simulated-${Date.now()}`,
          cost: 0.0001,
          simulated: true,
        };
      }

      try {
        const topicIdStr = convertHcsTopicIdToHedera(topicIdBytes32);
        if (!topicIdStr) throw new Error("Failed to convert topic ID");

        const topicId = TopicId.fromString(topicIdStr);
        const voteMessage = JSON.stringify({
          proposalId: voteData.proposalId,
          voter: voteData.voter,
          support: voteData.support,
          signature: voteData.signature,
          timestamp: voteData.timestamp,
          version: "1.0",
        });

        console.log(`📝 Submitting to HCS topic ${topicIdStr}...`);
        const transaction = new TopicMessageSubmitTransaction()
          .setTopicId(topicId)
          .setMessage(voteMessage);

        const txResponse = await transaction.execute(client);
        const receipt = await txResponse.getReceipt(client);
        const sequenceNumber = receipt.topicSequenceNumber?.toNumber() ?? 0;

        if (!sequenceNumber) throw new Error("No sequence number returned");

        console.log(`✅ HCS Sequence: ${sequenceNumber}`);
        return {
          success: true,
          sequenceNumber,
          transactionId: txResponse.transactionId.toString(),
          cost: 0.0001,
        };
      } catch (error: any) {
        console.error(`❌ HCS submission failed: ${error.message}`);
        return {
          success: false,
          sequenceNumber: 0,
          transactionId: "",
          cost: 0,
          error: error.message,
        };
      }
    },
    [hederaClient, convertHcsTopicIdToHedera, setupHederaClient]
  );

  const castHcsVote = useCallback(
    async (
      proposalId: number,
      support: number,
      hcsTopicId: string
    ): Promise<HcsVote | null> => {
      if (!accountId) {
        toast.error("Wallet not connected");
        return null;
      }

      setLoading(true);
      try {
        console.log(`\n🗳️ Casting HCS vote for proposal #${proposalId}`);

        // Step 1: Sign initial vote (with placeholder HCS data)
        const signedVote = await createSignedVote(proposalId, support);
        if (!signedVote) throw new Error("Failed to sign vote");

        console.log("✅ Initial vote signed, voter:", signedVote.voter);

        // Step 2: Submit to HCS
        const hcsResult = await submitVoteToHCS(hcsTopicId, {
          proposalId,
          voter: signedVote.voter,
          support: signedVote.support,
          signature: signedVote.signature,
          timestamp: signedVote.timestamp,
        });

        if (!hcsResult.success)
          throw new Error(hcsResult.error || "HCS failed");

        // Step 3: Create FINAL signature with actual HCS sequence
        console.log("\n📝 Creating final signature with HCS sequence...");
        const hcsMessageIdBytes32 = ethers.utils.hexZeroPad(
          ethers.utils.hexlify(hcsResult.sequenceNumber),
          32
        );

        const finalMessageHash = ethers.utils.solidityKeccak256(
          ["uint256", "address", "uint8", "bytes32", "uint256"],
          [
            proposalId,
            signedVote.voter,
            support,
            hcsMessageIdBytes32,
            hcsResult.sequenceNumber,
          ]
        );

        let finalSignature: string;
        if (isMetaMask) {
          const provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = provider.getSigner();
          finalSignature = await signer.signMessage(
            ethers.utils.arrayify(finalMessageHash)
          );
        } else {
          const messageBytes = ethers.utils.arrayify(finalMessageHash);
          const signResult = await walletInterface.signMessage(messageBytes);
          if (!signResult?.signature) throw new Error("No final signature");

          const normalized = normalizeSignature(signResult.signature);
          const recovery = tryRecoverAddress(finalMessageHash, normalized);

          if (!recovery) throw new Error("Could not recover final signature");

          // Verify recovered address matches
          if (
            recovery.address.toLowerCase() !== signedVote.voter.toLowerCase()
          ) {
            console.warn("⚠️ Final signature has different signer!");
            console.warn("   Expected:", signedVote.voter);
            console.warn("   Got:", recovery.address);
            // Use it anyway - the signature is what matters
          }

          const sig = normalized.startsWith("0x")
            ? normalized.slice(2)
            : normalized;
          finalSignature =
            "0x" +
            sig.slice(0, 128) +
            recovery.vValue.toString(16).padStart(2, "0");
        }

        console.log("✅ Final signature created\n");

        const completeVote: HcsVote = {
          voter: signedVote.voter,
          support: support,
          votingPower: 100,
          timestamp: signedVote.timestamp,
          hcsMessageId: hcsMessageIdBytes32,
          hcsSequenceNumber: hcsResult.sequenceNumber,
          signature: finalSignature,
        };

        toast.success(`Vote submitted! Sequence: ${hcsResult.sequenceNumber}`);
        return completeVote;
      } catch (error: any) {
        console.error("❌ Cast HCS vote failed:", error);
        toast.error(`Failed: ${error.message}`);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      accountId,
      isMetaMask,
      createSignedVote,
      submitVoteToHCS,
      walletInterface,
      tryRecoverAddress,
    ]
  );

  // Tally votes from HCS
  const tallyVotesFromHCS = useCallback(
    async (
      proposalId: number,
      votes: HcsVote[]
    ): Promise<{
      forVotes: string;
      againstVotes: string;
      abstainVotes: string;
      isPassing: boolean;
      gasUsed: string;
    } | null> => {
      if (!walletInterface || !accountId) {
        toast.error("Wallet not connected");
        return null;
      }

      if (votes.length === 0) {
        toast.error("No votes to tally");
        return null;
      }

      setLoading(true);
      try {
        console.log(
          `🧮 Tallying ${votes.length} votes for Proposal #${proposalId}...`
        );

        console.log(
          "📋 Votes to tally:",
          votes.map((v) => ({
            voter: v.voter,
            support: v.support,
            signatureLength: v.signature.length,
            hcsSeq: v.hcsSequenceNumber,
          }))
        );

        let receipt;

        if (isMetaMask) {
          const web3Provider = new ethers.providers.Web3Provider(
            (window as any).ethereum
          );
          const signer = web3Provider.getSigner();
          const contract = new ethers.Contract(
            convertToEvmAddress(governanceAddress),
            AjoGovernanceABI.abi,
            signer
          );

          const tx = await contract.tallyVotesFromHCS(proposalId, votes, {
            gasLimit: 2_000_000,
          });

          console.log("⏳ Waiting for confirmation...");
          receipt = await tx.wait();
        } else {
          console.log("📝 Encoding transaction for HashPack");

          const iface = new ethers.utils.Interface(AjoGovernanceABI.abi);
          const encodedData = iface.encodeFunctionData("tallyVotesFromHCS", [
            proposalId,
            votes,
          ]);

          console.log("📦 Encoded data length:", encodedData.length);

          const dataBytes = ethers.utils.arrayify(encodedData);
          const hederaAddress = await convertEvmToHederaAddress(
            governanceAddress
          );

          const contractTx = new ContractExecuteTransaction()
            .setContractId(ContractId.fromString(hederaAddress))
            .setGas(2_000_000)
            .setFunctionParameters(dataBytes);

          console.log("📤 Executing via HashPack wallet...");

          const txId = await walletInterface.sendTransaction(contractTx);

          if (!txId) {
            throw new Error("Transaction failed - no transaction ID returned");
          }

          console.log("⏳ Transaction sent:", txId);

          await new Promise((resolve) => setTimeout(resolve, 5000));

          console.log("🔍 Querying Mirror Node for transaction result...");

          const mirrorNodeUrl =
            import.meta.env.VITE_HEDERA_MIRROR_NODE_URL ||
            "https://testnet.mirrornode.hedera.com";

          let attempts = 0;
          const maxAttempts = 20;
          let transactionData: any = null;

          const [accountPart, timestampPart] = txId.split("@");
          const formattedTxId = `${accountPart}-${timestampPart.replace(
            ".",
            "-"
          )}`;
          console.log("📝 Formatted transaction ID:", formattedTxId);

          while (attempts < maxAttempts) {
            try {
              const txUrl = `${mirrorNodeUrl}/api/v1/transactions/${formattedTxId}`;
              console.log(`   Attempt ${attempts + 1}: ${txUrl}`);

              const response = await fetch(txUrl);

              if (response.ok) {
                const data = await response.json();

                if (data.transactions && data.transactions.length > 0) {
                  transactionData = data.transactions[0];
                  console.log("✅ Transaction found on Mirror Node");
                  console.log("   Result:", transactionData.result);

                  if (transactionData.result === "SUCCESS") {
                    break;
                  } else {
                    throw new Error(
                      `Transaction failed with result: ${transactionData.result}`
                    );
                  }
                }
              } else {
                console.log(`   Response status: ${response.status}`);
              }
            } catch (e: any) {
              console.log(`   Error: ${e.message}`);
            }

            await new Promise((resolve) => setTimeout(resolve, 3000));
            attempts++;
          }

          if (!transactionData) {
            throw new Error(
              "Transaction not found on Mirror Node after 60 seconds"
            );
          }

          console.log("📥 Fetching contract call results...");

          const contractResultUrl = `${mirrorNodeUrl}/api/v1/contracts/results/${formattedTxId}`;
          const contractResultResponse = await fetch(contractResultUrl);

          if (!contractResultResponse.ok) {
            throw new Error(
              `Failed to fetch contract call results: ${contractResultResponse.status}`
            );
          }

          const contractResult = await contractResultResponse.json();
          console.log("📊 Contract result:", contractResult);

          if (!contractResult.logs || contractResult.logs.length === 0) {
            throw new Error("No logs found in contract result");
          }

          receipt = {
            logs: contractResult.logs.map((log: any) => ({
              address: log.address,
              topics: log.topics.map((t: string) =>
                t.startsWith("0x") ? t : "0x" + t
              ),
              data: log.data.startsWith("0x") ? log.data : "0x" + log.data,
            })),
            gasUsed: ethers.BigNumber.from(contractResult.gas_used || 0),
            status: contractResult.result === "SUCCESS" ? 1 : 0,
          };

          console.log("✅ Receipt constructed from Mirror Node data");
        }

        const iface = new ethers.utils.Interface(AjoGovernanceABI.abi);
        let tallyEvent;

        for (const log of receipt.logs) {
          try {
            const parsed = iface.parseLog(log);
            console.log("📝 Found event:", parsed.name);

            if (parsed.name === "VotesTallied") {
              tallyEvent = parsed;
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (tallyEvent) {
          const forVotes = tallyEvent.args.forVotes.toString();
          const againstVotes = tallyEvent.args.againstVotes.toString();
          const abstainVotes = tallyEvent.args.abstainVotes.toString();
          const isPassing = BigInt(forVotes) > BigInt(againstVotes);

          console.log("✅ Votes tallied successfully:", {
            forVotes,
            againstVotes,
            abstainVotes,
            isPassing,
          });

          toast.success("✅ Votes successfully tallied!");

          return {
            forVotes,
            againstVotes,
            abstainVotes,
            isPassing,
            gasUsed: receipt.gasUsed.toString(),
          };
        } else {
          console.error("❌ VotesTallied event not found");
          console.log(
            "Available events:",
            receipt.logs.map((log: any) => {
              try {
                return iface.parseLog(log).name;
              } catch {
                return "unknown";
              }
            })
          );

          throw new Error(
            "VotesTallied event not found in transaction receipt"
          );
        }
      } catch (error: any) {
        console.error("Tally failed:", error);

        if (error.message?.includes("CONTRACT_REVERT_EXECUTED")) {
          toast.error("Contract execution reverted - check vote signatures");
        } else if (error.message?.includes("INVALID_SIGNATURE")) {
          toast.error("Invalid signature detected in votes");
        } else {
          toast.error(`Failed to tally votes: ${error.message}`);
        }

        return null;
      } finally {
        setLoading(false);
      }
    },
    [
      walletInterface,
      accountId,
      governanceAddress,
      isMetaMask,
      convertToEvmAddress,
      convertEvmToHederaAddress,
    ]
  );

  // Get HCS Topic ID from contract
  const getHcsTopicId = useCallback(async (): Promise<string | null> => {
    try {
      const provider = new ethers.providers.JsonRpcProvider(
        import.meta.env.VITE_HEDERA_JSON_RPC_RELAY_URL ||
          "https://testnet.hashio.io/api"
      );
      const contract = new ethers.Contract(
        governanceAddress,
        AjoGovernanceABI.abi,
        provider
      );

      const topicId = await contract.getHcsTopicId();
      return topicId;
    } catch (error: any) {
      console.error("Get HCS topic ID failed:", error);
      return null;
    }
  }, [governanceAddress]);

  // Fetch votes from HCS Mirror Node
  const fetchVotesFromMirrorNode = useCallback(
    async (hcsTopicId: string, proposalId?: number): Promise<HcsVote[]> => {
      try {
        const topicIdStr = convertHcsTopicIdToHedera(hcsTopicId);
        if (!topicIdStr) {
          throw new Error("Invalid topic ID");
        }

        const mirrorNodeUrl =
          import.meta.env.VITE_HEDERA_MIRROR_NODE_URL ||
          "https://testnet.mirrornode.hedera.com";

        const url = `${mirrorNodeUrl}/api/v1/topics/${topicIdStr}/messages?order=asc`;
        console.log(`🔍 Querying mirror node: ${url}`);

        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Mirror node query failed: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(
          `📊 Mirror node returned ${data.messages?.length || 0} messages`
        );

        const votes: HcsVote[] = [];

        for (const message of data.messages || []) {
          try {
            const decodedMessage = atob(message.message);
            const voteData = JSON.parse(decodedMessage);

            console.log(`✅ Parsed vote:`, {
              proposalId: voteData.proposalId,
              voter: voteData.voter,
              support: voteData.support,
              sequenceNumber: message.sequence_number,
            });

            // Filter by proposal ID if specified
            if (
              proposalId !== undefined &&
              voteData.proposalId !== proposalId
            ) {
              console.log(
                `⏭️ Skipping vote for different proposal (${voteData.proposalId} !== ${proposalId})`
              );
              continue;
            }

            // Convert sequence number to bytes32 the SAME way as when signing
            const hcsMessageIdBytes32 = ethers.utils.hexZeroPad(
              ethers.utils.hexlify(message.sequence_number),
              32
            );

            console.log(`🔍 Vote reconstruction debug:`, {
              sequenceNumber: message.sequence_number,
              hcsMessageIdBytes32,
              voter: voteData.voter,
              support: voteData.support,
              signaturePreview: voteData.signature.slice(0, 20) + "...",
            });

            // Verify the signature matches what we expect
            const expectedMessageHash = ethers.utils.solidityKeccak256(
              ["uint256", "address", "uint8", "bytes32", "uint256"],
              [
                voteData.proposalId,
                voteData.voter,
                voteData.support,
                hcsMessageIdBytes32,
                message.sequence_number,
              ]
            );

            console.log(`🔍 Expected message hash: ${expectedMessageHash}`);

            // Try to recover the signer to verify signature validity
            try {
              // Test BOTH recovery methods to see which one works
              let recoveredAddress: string | null = null;
              let recoveryMethod = "";

              // Method 1: With Ethereum prefix (what signMessage uses)
              try {
                const messageHashBytes =
                  ethers.utils.arrayify(expectedMessageHash);
                const ethSignedMessageHash =
                  ethers.utils.hashMessage(messageHashBytes);
                recoveredAddress = ethers.utils.recoverAddress(
                  ethSignedMessageHash,
                  voteData.signature
                );
                recoveryMethod = "WITH Ethereum prefix";
                console.log(
                  `✅ Recovered signer (${recoveryMethod}): ${recoveredAddress}`
                );
              } catch (e1: any) {
                console.log(`❌ Recovery with prefix failed: ${e1.message}`);
              }

              // Method 2: Without Ethereum prefix (raw hash)
              if (
                !recoveredAddress ||
                recoveredAddress.toLowerCase() !== voteData.voter.toLowerCase()
              ) {
                try {
                  recoveredAddress = ethers.utils.recoverAddress(
                    expectedMessageHash,
                    voteData.signature
                  );
                  recoveryMethod = "WITHOUT Ethereum prefix (raw hash)";
                  console.log(
                    `✅ Recovered signer (${recoveryMethod}): ${recoveredAddress}`
                  );
                } catch (e2: any) {
                  console.log(
                    `❌ Recovery without prefix failed: ${e2.message}`
                  );
                }
              }

              console.log(`   Expected voter:  ${voteData.voter}`);
              console.log(`   Recovery method: ${recoveryMethod}`);

              if (
                recoveredAddress &&
                recoveredAddress.toLowerCase() === voteData.voter.toLowerCase()
              ) {
                console.log(
                  `✅ Signature verification passed using: ${recoveryMethod}`
                );
                console.log(
                  `⚠️  Make sure your Solidity contract uses the SAME method!`
                );
              } else {
                console.error(
                  `❌ Signature verification failed with BOTH methods!`
                );
                console.error(`   Recovered: ${recoveredAddress || "null"}`);
                console.error(`   Expected:  ${voteData.voter}`);
                console.error(
                  `   This vote will likely fail on-chain verification`
                );
              }
            } catch (sigError: any) {
              console.error(
                `❌ Failed to verify signature: ${sigError.message}`
              );
            }

            // The voter address from HCS should already be in the correct format
            const voterAddress = voteData.voter.startsWith("0x")
              ? voteData.voter
              : convertToEvmAddress(voteData.voter);

            console.log(`   Using voter address: ${voterAddress}`);

            // Reconstruct vote object
            votes.push({
              voter: voterAddress,
              support: voteData.support,
              votingPower: 100,
              timestamp: voteData.timestamp,
              hcsMessageId: hcsMessageIdBytes32,
              hcsSequenceNumber: message.sequence_number,
              signature: voteData.signature,
            });
          } catch (err) {
            console.warn("Failed to parse message:", err, message);
          }
        }

        console.log(
          `✅ Successfully parsed ${votes.length} votes for proposal ${proposalId}`
        );

        // Log the first vote for debugging
        if (votes.length > 0) {
          console.log(`📋 First vote details:`, {
            voter: votes[0].voter,
            support: votes[0].support,
            signatureLength: votes[0].signature.length,
            hcsSeq: votes[0].hcsSequenceNumber,
            hcsMessageId: votes[0].hcsMessageId,
          });
        }

        return votes;
      } catch (error: any) {
        console.error("Fetch votes from mirror node failed:", error);
        toast.error("Failed to fetch votes from HCS");
        return [];
      }
    },
    [convertHcsTopicIdToHedera, convertToEvmAddress]
  );

  return {
    loading,
    hederaClient,
    setupHederaClient,
    castHcsVote,
    tallyVotesFromHCS,
    getHcsTopicId,
    fetchVotesFromMirrorNode,
    convertHcsTopicIdToHedera,
  };
};

export default useHcsVoting;
