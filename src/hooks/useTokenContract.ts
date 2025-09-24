import { useMemo } from "react";
import { ethers, Contract, ContractTransactionResponse } from "ethers";
import ERC20_ABI from "../abi/erc20ABI";
import { useWallet } from "@/auth/WalletContext";

// Define ERC20 contract type separately
type ERC20Contract = {
  allowance(owner: string, spender: string): Promise<bigint>;
  approve(
    spender: string,
    amount: bigint
  ): Promise<ContractTransactionResponse>;
  balanceOf(owner: string): Promise<bigint>;
  transfer(to: string, amount: bigint): Promise<ContractTransactionResponse>;
  transferFrom(
    from: string,
    to: string,
    amount: bigint
  ): Promise<ContractTransactionResponse>;
  decimals(): Promise<number>;
} & Contract;

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

  const approve = async (spender: string, amount: bigint) => {
    if (!contract || !provider) throw new Error("Contract not ready");
    const signer = await provider.getSigner();
    const writeable = contract.connect(signer) as ERC20Contract;
    const tx = await writeable.approve(spender, amount);
    return tx.wait();
  };

  return { contract, getAllowance, approve };
};
