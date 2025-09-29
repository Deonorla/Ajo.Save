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
    console.log("Selected Ajo:", found);
    return found ?? null;
  }, [ajoId, ajoCore, ajoInfos]);

  return ajo;
};

// utils/formatTimestamp.ts
export function formatTimestamp(timestamp: string | number): string {
  if (!timestamp) return "N/A";

  // Ensure it's a number
  const seconds =
    typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;

  // Convert seconds → milliseconds
  const date = new Date(seconds * 1000);

  // Format as YYYY-MM-DD HH:mm:ss
  const formatted =
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0") +
    " " +
    String(date.getHours()).padStart(2, "0") +
    ":" +
    String(date.getMinutes()).padStart(2, "0") +
    ":" +
    String(date.getSeconds()).padStart(2, "0");

  return formatted;
}
