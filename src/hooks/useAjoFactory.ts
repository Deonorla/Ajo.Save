// hooks/useAjoFactory.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers, JsonRpcSigner } from "ethers";
import AjoFactory from "@/abi/ajoFactory.json";
import { useWallet } from "./../auth/WalletContext";
import { ERC20_ABI } from "../abi/erc20ABI";

export const useAjoFactory = () => {
  const { provider, connected } = useWallet();
  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );
  const ajoFactoryAddress = import.meta.env.VITE_AJO_FACTORY_CONTRACT_ADDRESS;
  const whbarAddress = import.meta.env.VITE_MOCK_WHBAR_ADDRESS;
  const WHBAR_ADDRESS = "0xf34f43E8110220dbA7dc74f1fE8eDEa2bcEC1e06";

  // ---------------- GET CONTRACT ----------------

  // read-only contract (provider)
  const contractRead = useMemo(() => {
    if (!provider || !ajoFactoryAddress) return null;
    return new ethers.Contract(ajoFactoryAddress, AjoFactory.abi, provider);
  }, [ajoFactoryAddress, provider]);

  /// write-enabled contract: provider.getSigner() is async in ethers v6, so build it in effect
  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      if (!provider || !ajoFactoryAddress) {
        if (mounted) setContractWrite(null);
        return;
      }
      try {
        const signer = await provider.getSigner(); // await is required
        if (!mounted) return;
        const writable = new ethers.Contract(
          ajoFactoryAddress,
          AjoFactory.abi,
          signer
        );
        setContractWrite(writable);
      } catch (err) {
        console.error("useAjoFactory: failed to create write contract", err);
        if (mounted) setContractWrite(null);
      }
    };
    setup();
    return () => {
      mounted = false;
    };
  }, [provider, ajoFactoryAddress]);

  // ---------------- READ FUNCTIONS ----------------

  /**
   * Get current creation fee from contract
   */
  const getCreationFee = useCallback(async () => {
    if (!contractRead) throw new Error("Contract not ready");
    const fee: bigint = await contractRead.creationFee();
    return fee;
  }, [contractRead]);

  const getFactoryStats = useCallback(async () => {
    if (!contractRead) return null;
    return await contractRead.getFactoryStats();
  }, [contractRead]);

  const getAllAjos = useCallback(async () => {
    if (!contractRead) return [];
    return await contractRead.getAllAjos();
  }, [contractRead]);

  const getCreatorAjos = useCallback(
    async (creator: string) => {
      if (!contractRead) return [];
      return await contractRead.getCreatorAjos(creator);
    },
    [contractRead]
  );

  const getAjoInfo = useCallback(
    async (ajoId: number) => {
      if (!contractRead) return null;
      return await contractRead.getAjoInfo(ajoId);
    },
    [contractRead]
  );

  // ---------------- WRITE FUNCTIONS ----------------
  const registerAjo = useCallback(
    async (creatorAddress: string, ajoName: string) => {
      if (!contractWrite) throw new Error("Contract not ready");

      // 1. Get creation fee
      const feeInWHBAR = await getCreationFee();
      if (!feeInWHBAR) throw new Error("Failed to fetch creation fee");
      console.log("Creation fee (in WHBAR):", feeInWHBAR.toString());

      // 2. Setup WHBAR contract
      const signer = contractWrite.runner as JsonRpcSigner; // signer is the runner attached to your contractWrite
      const whbarContract = new ethers.Contract(
        WHBAR_ADDRESS,
        ERC20_ABI,
        signer
      );

      // 3. Check allowance
      const userAddress = await signer?.getAddress();
      const allowance = await whbarContract.allowance(
        userAddress,
        ajoFactoryAddress
      );
      console.log("Current allowance:", allowance.toString());

      // 4. Approve if needed
      if (allowance < feeInWHBAR) {
        console.log("Approving WHBAR...");
        const approveTx = await whbarContract.approve(
          ajoFactoryAddress,
          feeInWHBAR
        );
        await approveTx.wait();
        console.log("Approval done ✅");
      }

      // 5. Call registerAjo (no value!)
      console.log("Calling registerAjo...");
      const tx = await contractWrite.registerAjo(creatorAddress, ajoName);
      return await tx.wait();
    },
    [contractWrite, getCreationFee]
  );

  const deactivateAjo = useCallback(
    async (ajoId: number) => {
      if (!contractWrite) throw new Error("Contract not ready");
      const tx = await contractWrite.deactivateAjo(ajoId);
      return await tx.wait();
    },
    [contractWrite]
  );

  const updateCreationFee = useCallback(
    async (newFee: string) => {
      if (!contractWrite) throw new Error("contract not ready");
      const tx = await contractWrite.updateCreationFee(newFee);
      return await tx.wait();
    },
    [contractWrite]
  );

  // ---------------- RETURN HOOK ----------------
  return {
    contractWrite,
    contractRead,
    connected,
    // Read
    getFactoryStats,
    getAllAjos,
    getCreatorAjos,
    getAjoInfo,
    getCreationFee,
    // Write
    registerAjo,
    deactivateAjo,
    updateCreationFee,
  };
};
