// hooks/useAjoFactory.ts
import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import AjoFactory from "@/abi/ajoFactory.json";
import { useWallet } from "./../auth/WalletContext";
import erc20ABI from "../abi/erc20ABI";

export const useAjoFactory = () => {
  const { provider, connected } = useWallet();
  const [contractWrite, setContractWrite] = useState<ethers.Contract | null>(
    null
  );
  const ajoFactoryAddress = import.meta.env.VITE_AJO_FACTORY_CONTRACT_ADDRESS;
  const WHBAR_ADDRESS = import.meta.env.VITE_MOCK_WHBAR_ADDRESS;

  // ---------------- GET CONTRACT ----------------
  const contractRead = useMemo(() => {
    if (!provider || !ajoFactoryAddress) return null;
    return new ethers.Contract(ajoFactoryAddress, AjoFactory.abi, provider);
  }, [ajoFactoryAddress, provider]);

  useEffect(() => {
    let mounted = true;
    const setup = async () => {
      if (!provider || !ajoFactoryAddress) {
        if (mounted) setContractWrite(null);
        return;
      }
      try {
        const signer = provider.getSigner();
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
  const getCreationFee = useCallback(async () => {
    if (!contractRead) throw new Error("Contract not ready");
    const fee = await contractRead.creationFee(); // BigNumber in v5
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

      // 1. Get raw creation fee (BigNumber, usually 18 decimals)
      const rawFee = await getCreationFee();
      if (!rawFee) throw new Error("Failed to fetch creation fee");

      console.log("=== 🧾 Creation Fee Info ===");
      console.log("Raw fee (from contract):", rawFee.toString());

      // 2. Setup WHBAR contract with signer
      const signer = provider?.getSigner();
      const whbarContract = new ethers.Contract(
        WHBAR_ADDRESS,
        erc20ABI,
        signer
      );

      // 3. Normalize fee to WHBAR decimals
      const tokenDecimals: number = await whbarContract.decimals();
      const normalizedFee = ethers.utils.parseUnits(
        ethers.utils.formatUnits(rawFee, 18), // interpret raw fee as 18 decimals
        tokenDecimals // re-encode in WHBAR decimals
      );

      const userAddress = await signer?.getAddress();
      const balance = await whbarContract.balanceOf(userAddress);
      const allowance = await whbarContract.allowance(
        userAddress,
        ajoFactoryAddress
      );

      console.log("=== 📊 Token Stats ===");
      console.log("WHBAR decimals:", tokenDecimals);
      console.log("User address:", userAddress);
      console.log("Balance (raw):", balance.toString());
      console.log(
        "Balance (formatted):",
        ethers.utils.formatUnits(balance, tokenDecimals)
      );
      console.log("Allowance (raw):", allowance.toString());
      console.log(
        "Allowance (formatted):",
        ethers.utils.formatUnits(allowance, tokenDecimals)
      );
      console.log("Creation fee (normalized raw):", normalizedFee.toString());
      console.log(
        "Creation fee (formatted):",
        ethers.utils.formatUnits(normalizedFee, tokenDecimals)
      );

      // 4. Approve if needed
      if (allowance.lt(normalizedFee)) {
        console.log("🔑 Approving WHBAR...");
        const approveTx = await whbarContract.approve(
          ajoFactoryAddress,
          normalizedFee
        );
        await approveTx.wait();
        console.log("✅ Approval done");
      }

      // 5. Call registerAjo
      console.log("🚀 Calling registerAjo...");
      const tx = await contractWrite.registerAjo(creatorAddress, ajoName);
      const receipt = await tx.wait();

      console.log("🎉 Ajo created successfully:", receipt);
      return receipt;
    },
    [contractWrite, getCreationFee, ajoFactoryAddress, provider]
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
