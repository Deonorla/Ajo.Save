/* eslint-disable @typescript-eslint/no-explicit-any */
import erc20ABI from "@/abi/erc20ABI";
import { ethers } from "ethers";
import { useTokenStore } from "@/store/tokenStore";

const getContract = (address: string, provider: ethers.BrowserProvider) =>
  new ethers.Contract(address, erc20ABI, provider);

export const useTokenHook = () => {
  const { setWhbar, setUsdc, setLoading, setError } = useTokenStore();

  const getWhbarBalance = async () => {
    try {
      if (!(window as any).ethereum) {
        setError("MetaMask not detected");
        return;
      }

      setLoading(true);

      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const whbar = getContract(
        import.meta.env.VITE_MOCK_WHBAR_ADDRESS,
        provider
      );

      const [balance, decimals] = await Promise.all([
        whbar.balanceOf(userAddress),
        whbar.decimals(),
      ]);

      const formatted = ethers.formatUnits(balance, decimals);
      setWhbar(formatted);
      setLoading(false);
      console.log("Whbar Balance:", formatted);
      return formatted; // readable
    } catch (err: any) {
      setError(err.message ?? "Failed to fetch WHBAR balance");
      setLoading(false);
    }
  };

  const getUsdcBalance = async () => {
    try {
      if (!(window as any).ethereum) {
        setError("MetaMask not detected");
        return;
      }
      setLoading(true);
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      const usdc = getContract(
        import.meta.env.VITE_MOCK_USDC_ADDRESS,
        provider
      );
      const [balance, decimals] = await Promise.all([
        usdc.balanceOf(userAddress),
        usdc.decimals(),
      ]);

      const formatted = ethers.formatUnits(balance, decimals);
      setUsdc(formatted);
      setLoading(false);
      return formatted;
    } catch (err: any) {
      setError(err.message ?? "Failed to fetch USDC balance");
      setLoading(false);
    }
  };

  return {
    getWhbarBalance,
    getUsdcBalance,
  };
};
