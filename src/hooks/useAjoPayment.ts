/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * useAjoPaymentHedera.ts
 *
 * Hedera-native replacement for your Ethers-based useAjoPayment hook.
 * - Testnet Mirror Node is used for read-only contract calls (struct[] and tuples decoding)
 * - Works with your useHashPackWallet (no dAppSigner required)
 * - Returns payout timestamp as Date
 *
 * Environment:
 *  - Assumes AjoPayment contract id is passed in (e.g. "0.0.12345")
 *  - Mirror node endpoint hardcoded to Hedera Testnet API v1
 *
 * NOTE:
 * Mirror node JSON shapes may vary by version — this code attempts several common shapes.
 * If you get an unexpected response, paste the raw mirror-node JSON and I can adapt the parser exactly.
 */

import { useCallback } from "react";
import { toast } from "sonner";
import useHashPackWallet from "@/hooks/useHashPackWallet";
import AjoPayment from "@/abi/ajoPayments.json";

const MIRROR_NODE = "https://testnet.mirrornode.hedera.com/api/v1";

function safeToString(v: any): string {
  if (v === null || v === undefined) return "0";
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  if (typeof v?.toString === "function") return v.toString();
  try {
    return String(v);
  } catch {
    return "0";
  }
}

/** Convert smallest-unit integer string -> human readable assuming 18 decimals */
function formatAmountFrom18Decimals(
  amountSmallestUnit: string | number | bigint
) {
  const s = safeToString(amountSmallestUnit);
  // if value already includes decimals (mirror node sometimes returns stringlike), try Number
  try {
    const n = Number(s);
    return (n / 1e18).toString();
  } catch {
    return s;
  }
}

/** Parse a contract "payout" result returned from mirror node into fields */
function parsePayoutFromMirror(resultJson: any) {
  // Expect recipient (address), amount, cycle, timestamp
  // mirror node can return named object, array, or nested fields
  // Try named object first
  if (!resultJson) return null;

  // Case: resultJson is { recipient: "...", amount: "...", cycle: "...", timestamp: "..." }
  if (
    resultJson.recipient ||
    resultJson.amount ||
    resultJson.cycle ||
    resultJson.timestamp
  ) {
    const recipient = resultJson.recipient ?? resultJson[0] ?? null;
    const amount = resultJson.amount ?? resultJson[1] ?? "0";
    const cycle = resultJson.cycle ?? resultJson[2] ?? "0";
    const timestamp = resultJson.timestamp ?? resultJson[3] ?? null;
    return {
      recipient,
      amount: formatAmountFrom18Decimals(amount),
      cycle: Number(safeToString(cycle)) || 0,
      timestamp: timestamp
        ? new Date(Number(safeToString(timestamp)) * 1000)
        : null,
    };
  }

  // Case: resultJson is an array [recipient, amount, cycle, timestamp]
  if (Array.isArray(resultJson) && resultJson.length >= 4) {
    const recipient = resultJson[0];
    const amount = resultJson[1];
    const cycle = resultJson[2];
    const timestamp = resultJson[3];
    return {
      recipient,
      amount: formatAmountFrom18Decimals(amount),
      cycle: Number(safeToString(cycle)) || 0,
      timestamp: timestamp
        ? new Date(Number(safeToString(timestamp)) * 1000)
        : null,
    };
  }

  // Some mirror node responses nest results under `result` or `data` arrays
  // Try to find first object/array that matches expected shape
  const walk = (obj: any): any | null => {
    if (!obj || typeof obj !== "object") return null;
    if (Array.isArray(obj)) {
      if (
        obj.length >= 4 &&
        (typeof obj[0] === "string" || typeof obj[0] === "object")
      )
        return obj;
    } else {
      const keys = Object.keys(obj);
      if (keys.includes("recipient") && keys.includes("amount")) return obj;
    }
    for (const k of Object.keys(obj)) {
      const found = walk(obj[k]);
      if (found) return found;
    }
    return null;
  };

  const found = walk(resultJson);
  if (found) {
    if (Array.isArray(found)) {
      return {
        recipient: found[0],
        amount: formatAmountFrom18Decimals(found[1]),
        cycle: Number(safeToString(found[2])) || 0,
        timestamp: found[3]
          ? new Date(Number(safeToString(found[3])) * 1000)
          : null,
      };
    } else {
      return {
        recipient: found.recipient ?? null,
        amount: formatAmountFrom18Decimals(found.amount ?? "0"),
        cycle: Number(safeToString(found.cycle)) || 0,
        timestamp: found.timestamp
          ? new Date(Number(safeToString(found.timestamp)) * 1000)
          : null,
      };
    }
  }

  return null;
}

/**
 * useAjoPaymentHedera
 * @param ajoPaymentAddress - Hedera contract id string (example "0.0.123456")
 */
export function useAjoPaymentHedera(ajoPaymentAddress: string) {
  const wallet = useHashPackWallet();

  if (!ajoPaymentAddress) {
    console.warn(
      "useAjoPaymentHedera: contract id (ajoPaymentAddress) is required"
    );
  }

  /**
   * Fetch contract view result from mirror node for a named contract function.
   * Mirror node endpoints vary; we try a couple of common patterns and parse robustly.
   * Returns parsed JSON or throws on network / unexpected failures.
   */
  const mirrorCall = useCallback(
    async (functionName: string, args?: (string | number)[]) => {
      if (!ajoPaymentAddress) throw new Error("Contract address required");

      // Primary attempt: endpoint pattern used previously in examples
      // Example: GET /api/v1/contracts/{contractId}/results/{functionName}
      const url1 = `${MIRROR_NODE}/contracts/${encodeURIComponent(
        ajoPaymentAddress
      )}/results/${encodeURIComponent(functionName)}`;

      // Another possible pattern (rare): query param function
      const url2 = `${MIRROR_NODE}/contracts/${encodeURIComponent(
        ajoPaymentAddress
      )}/results?function=${encodeURIComponent(functionName)}`;

      // If args are provided, append them as query params (mirror node implementations vary).
      // We'll attempt to include args as `params` query param joined by comma.
      const argQuery =
        args && args.length > 0
          ? `?params=${encodeURIComponent(args.join(","))}`
          : "";

      const tryFetch = async (url: string) => {
        try {
          const finalUrl =
            url + (url.includes("?") || !argQuery ? argQuery : argQuery);
          const resp = await fetch(finalUrl, {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          });
          if (!resp.ok) {
            // return null so caller can try another pattern
            return null;
          }
          const json = await resp.json();
          return json;
        } catch (err) {
          return null;
        }
      };

      // try url1
      let json = await tryFetch(url1);
      if (!json) json = await tryFetch(url2);

      if (!json) {
        // Try contract results by name under transactions endpoint (less direct)
        // We'll try /contracts/{id}/results and search
        try {
          const fallbackUrl = `${MIRROR_NODE}/contracts/${encodeURIComponent(
            ajoPaymentAddress
          )}/results`;
          const resp = await fetch(fallbackUrl, {
            headers: { Accept: "application/json" },
          });
          if (resp.ok) {
            const fallbackJson = await resp.json();
            // try to find a field which contains our functionName result
            const walk = (obj: any): any | null => {
              if (!obj || typeof obj !== "object") return null;
              if (obj[functionName]) return obj[functionName];
              for (const k of Object.keys(obj)) {
                const found = walk(obj[k]);
                if (found) return found;
              }
              return null;
            };
            json = walk(fallbackJson);
          }
        } catch {
          // ignore
        }
      }

      if (!json) {
        throw new Error(
          "Mirror node did not return function result (tried multiple endpoints)"
        );
      }

      return json;
    },
    [ajoPaymentAddress]
  );

  // ---------------------------
  // getPayout(cycle)
  // ---------------------------
  const getPayout = useCallback(
    async (cycle: number) => {
      if (!ajoPaymentAddress) {
        toast.error("Contract ID not provided");
        return null;
      }

      try {
        // Try to call mirror node endpoint for this function.
        // Some mirror node endpoints accept params in the URL; we pass cycle as arg.
        const json = await mirrorCall("getPayout", [cycle]);

        // Mirror node structures vary: try to extract the underlying result
        // Look for common fields: result, data, functionResult, callResult, etc.
        const candidates = [
          json,
          json.result ?? null,
          json.data ?? null,
          json.contract_function_result ?? null,
          json.contractFunctionResult ?? null,
          json.functionResult ?? null,
        ];

        let parsed = null;
        for (const c of candidates) {
          if (!c) continue;
          parsed = parsePayoutFromMirror(c);
          if (parsed) break;
        }

        // If parsed still null, try deep-walk to find tuple-like entry
        if (!parsed) {
          const walkFind = (obj: any): any | null => {
            if (!obj || typeof obj !== "object") return null;
            // If object has recipient && amount, accept
            if (
              (obj.recipient && obj.amount) ||
              (Array.isArray(obj) && obj.length >= 4)
            ) {
              return obj;
            }
            for (const k of Object.keys(obj)) {
              const found = walkFind(obj[k]);
              if (found) return found;
            }
            return null;
          };
          const found = walkFind(json);
          if (found) parsed = parsePayoutFromMirror(found);
        }

        if (!parsed) {
          console.warn(
            "Unable to parse getPayout mirror node response; returning null",
            json
          );
          toast.error("Could not parse payout response from mirror node");
          return null;
        }

        // parsed example: { recipient, amount, cycle, timestamp (Date|null) }
        return parsed;
      } catch (err: any) {
        console.error("getPayout error:", err);
        toast.error("Failed to fetch payout");
        return null;
      }
    },
    [ajoPaymentAddress, mirrorCall]
  );

  // ---------------------------
  // getCurrentCycle()
  // ---------------------------
  const getCurrentCycle = useCallback(async (): Promise<number | null> => {
    if (!ajoPaymentAddress) {
      toast.error("Contract ID not provided");
      return null;
    }

    try {
      // Mirror node call
      const json = await mirrorCall("getCurrentCycle");

      // Attempt to find a numeric value in common locations
      const candidates = [
        json,
        json.result ?? null,
        json.data ?? null,
        json.contract_function_result ?? null,
        json.contractFunctionResult ?? null,
        json.functionResult ?? null,
      ];

      for (const c of candidates) {
        if (!c) continue;
        // If c is number or numeric string
        if (typeof c === "number") return c;
        if (typeof c === "string" && /^\d+$/.test(c)) return Number(c);
        // If object with value in index 0 or named field
        if (Array.isArray(c) && c.length > 0) {
          const maybe = c[0];
          if (typeof maybe === "number") return maybe;
          if (typeof maybe === "string" && /^\d+$/.test(maybe))
            return Number(maybe);
        }
        if (typeof c === "object") {
          // try several property names
          const keys = ["0", "value", "currentCycle", "result", "returnValue"];
          for (const k of keys) {
            if (
              c[k] !== undefined &&
              (typeof c[k] === "number" ||
                (typeof c[k] === "string" && /^\d+$/.test(c[k])))
            ) {
              return Number(safeToString(c[k]));
            }
          }
          // try to find nested numeric
          const walk = (o: any): number | null => {
            if (o === null || o === undefined) return null;
            if (typeof o === "number") return o;
            if (typeof o === "string" && /^\d+$/.test(o)) return Number(o);
            if (typeof o !== "object") return null;
            for (const key of Object.keys(o)) {
              const v = walk(o[key]);
              if (v !== null) return v;
            }
            return null;
          };
          const deep = walk(c);
          if (deep !== null) return deep;
        }
      }

      console.warn(
        "getCurrentCycle: could not determine numeric result from mirror node response",
        json
      );
      return null;
    } catch (err: any) {
      console.error("getCurrentCycle error:", err);
      toast.error("Failed to fetch current cycle");
      return null;
    }
  }, [ajoPaymentAddress, mirrorCall]);

  // Return read-only helpers. Use wallet.sendTransaction(...) for writes (not implemented here).
  return {
    getPayout,
    getCurrentCycle,
  };
}

export default useAjoPaymentHedera;
