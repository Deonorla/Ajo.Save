import { useMemo } from "react";
import { ethers, Contract } from "ethers";
import ERC20_ABI from "../abi/erc20ABI";
import { useWallet } from "@/auth/WalletContext";

// Define ERC20 contract type separately (ethers v5 style)
type ERC20Contract = Contract & {
  allowance(owner: string, spender: string): Promise<ethers.BigNumber>;
  approve(
    spender: string,
    amount: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction>;
  balanceOf(owner: string): Promise<ethers.BigNumber>;
  transfer(
    to: string,
    amount: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction>;
  transferFrom(
    from: string,
    to: string,
    amount: ethers.BigNumberish
  ): Promise<ethers.ContractTransaction>;
  decimals(): Promise<number>;
};

export const useTokenContract = (tokenAddress: string) => {
  const { provider } = useWallet();

  const contract = useMemo(() => {
    if (!provider || !tokenAddress) return null;
    return new ethers.Contract(
      tokenAddress,
      ERC20_ABI,
      provider
    ) as ERC20Contract;
  }, [provider, tokenAddress]);

  const getAllowance = async (owner: string, spender: string) => {
    if (!contract) throw new Error("Contract not ready");
    return contract.allowance(owner, spender);
  };

  const approve = async (spender: string, amount: ethers.BigNumberish) => {
    if (!contract || !provider) throw new Error("Contract not ready");
    const signer = provider.getSigner();
    const writeable = contract.connect(signer) as ERC20Contract;
    const tx = await writeable.approve(spender, amount);
    return tx.wait();
  };

  return { contract, getAllowance, approve };
};
