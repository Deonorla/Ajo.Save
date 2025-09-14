import { useEffect, useState } from "react";
import { ethers } from "ethers";
import AjoCore from "./../abi/ajo.json";

// Define return type
interface UseAjoCore {
  contract: ethers.Contract | null;
  signer: ethers.Signer | null;
}

const useAjoCore = (): UseAjoCore => {
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [signer, setSigner] = useState<ethers.Signer | null>(null);

  useEffect(() => {
    const init = async () => {
      if (
        typeof window !== "undefined" &&
        (window as unknown as { ethereum?: ethers.Eip1193Provider }).ethereum
      ) {
        try {
          // ✅ Use BrowserProvider (ethers v6)
          const provider = new ethers.BrowserProvider(
            (window as unknown as { ethereum: ethers.Eip1193Provider }).ethereum
          );
          const _signer = await provider.getSigner();

          // ✅ Read env variable safely
          const contractAddress = process.env.VITE_AJO_CORE_CONTRACT_ADDRESS;
          if (!contractAddress) {
            console.error("❌ Missing VITE_AJO_CORE_CONTRACT_ADDRESS in .env");
            return;
          }

          // ✅ Contract instance
          const _contract = new ethers.Contract(
            contractAddress,
            AjoCore.abi,
            _signer
          );

          setSigner(_signer);
          setContract(_contract);
        } catch (err) {
          console.error("Failed to init AjoCore contract:", err);
        }
      }
    };

    init();
  }, []);

  return { contract, signer };
};

export default useAjoCore;
