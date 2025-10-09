import { useParams } from "react-router-dom";
import { useAjoStore } from "./../store/ajoStore";
import { useMemo } from "react";

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

export const useAjoDetails = () => {
  const { ajoId, ajoCore } = useParams<{ ajoId: string; ajoCore: string }>();
  const { ajoInfos } = useAjoStore();

  const ajo = useMemo(() => {
    if (!ajoId && !ajoCore) return null;

    const found = ajoInfos.find((item) => {
      const matchesId = ajoId && String(item.ajoId) === String(ajoId); // match by ID
      const matchesCore =
        ajoCore && item.ajoCore.toLowerCase() === ajoCore.toLowerCase(); // match by core
      return matchesId || matchesCore;
    });
    return found ?? null;
  }, [ajoId, ajoCore, ajoInfos]);

  return ajo;
};

// utils/formatTimestamp.ts
export function formatTimestamp(timestamp: string | number): string {
  if (!timestamp) return "N/A";

  // Ensure timestamp is a number
  const seconds =
    typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;

  // Convert seconds → milliseconds
  const date = new Date(seconds * 1000);

  // Format options
  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  // Example output: "25 July, 10:30 PM"
  return date.toLocaleString("en-US", options).replace(",", "");
}
