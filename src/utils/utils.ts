export const formatAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const getNaira = async () => {
  const url =
    "https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=ngn";
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("Failed to fetch rate from CoinGecko");
  }

  const data = await res.json();
  // CoinGecko responds like: { usd: { ngn: 1500.23 } }
  const rate = data.usd.ngn;
  console.log("rate", rate);
  return rate;
};
