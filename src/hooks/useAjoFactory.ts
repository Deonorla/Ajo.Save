// hooks/useAjoFactory.ts
import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import AjoFactory from "@/abi/ajoFactory.json";
import { useWallet } from "./../auth/WalletContext";

const ajoFactoryAddress = import.meta.env.VITE_AJO_FACTORY_CONTRACT_ADDRESS;

export const useAjoFactory = () => {
  const { provider, connected } = useWallet();
  const [contract, setContract] = useState<ethers.Contract | null>(null);

  // ---------------- GET CONTRACT ----------------
  const getContract = useCallback(async () => {
    if (!provider) return null;

    // must await in ethers v6 BrowserProvider
    const signer = await provider.getSigner();
    return new ethers.Contract(ajoFactoryAddress, AjoFactory.abi, signer);
  }, [provider]);

  // Sync contract state
  useEffect(() => {
    const setup = async () => {
      if (connected && provider) {
        const c = await getContract();
        setContract(c);
      } else {
        setContract(null);
      }
    };
    setup();
  }, [connected, provider, getContract]);

  // ---------------- READ FUNCTIONS ----------------
  const getFactoryStats = useCallback(async () => {
    if (!contract) return null;
    return await contract.getFactoryStats();
  }, [contract]);

  const getAllAjos = useCallback(async () => {
    if (!contract) return [];
    return await contract.getAllAjos();
  }, [contract]);

  const getCreatorAjos = useCallback(
    async (creator: string) => {
      if (!contract) return [];
      return await contract.getCreatorAjos(creator);
    },
    [contract]
  );

  const getAjoInfo = useCallback(
    async (ajoId: number) => {
      if (!contract) return null;
      return await contract.getAjoInfo(ajoId);
    },
    [contract]
  );

  // ---------------- WRITE FUNCTIONS ----------------
  const registerAjo = useCallback(
    async (ajoCoreAddress: string, name: string, feeInWei: string) => {
      if (!contract) throw new Error("Contract not ready");
      const tx = await contract.registerAjo(ajoCoreAddress, name, {
        value: feeInWei,
      });
      return await tx.wait();
    },
    [contract]
  );

  const deactivateAjo = useCallback(
    async (ajoId: number) => {
      if (!contract) throw new Error("Contract not ready");
      const tx = await contract.deactivateAjo(ajoId);
      return await tx.wait();
    },
    [contract]
  );

  const updateCreationFee = useCallback(
    async (newFee: string) => {
      if (!contract) throw new Error("Contract not ready");
      const tx = await contract.updateCreationFee(newFee);
      return await tx.wait();
    },
    [contract]
  );

  // ---------------- RETURN HOOK ----------------
  return {
    contract,
    connected,
    getContract,
    // Read
    getFactoryStats,
    getAllAjos,
    getCreatorAjos,
    getAjoInfo,
    // Write
    registerAjo,
    deactivateAjo,
    updateCreationFee,
  };
};
