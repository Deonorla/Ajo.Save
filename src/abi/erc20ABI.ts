const erc20ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 value) returns (bool)",
  "function transfer(address to, uint256 value) returns (bool)",
  "function transferFrom(address from, address to, uint256 value) returns (bool)",
  "function decimals() view returns (uint8)",
  "function mint(address to, uint256 amount) returns (bool)", // optional, only if contract has it
  "function faucet()", // just the function name and parameters, no `external`
] as const;

export default erc20ABI;
