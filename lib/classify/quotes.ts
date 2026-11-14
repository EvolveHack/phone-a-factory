import type { Facts } from "../../contract/types";

const FACT_KEYS = [
  "changesAccess",
  "touchesMoney",
  "changesDataOrCalculation",
  "appliesToEveryCustomer",
  "newScreenOrConnection",
  "controlsDevices",
  "displayOnly",
] as const satisfies readonly (keyof Facts)[];

/** A quote counts only when it is a non-empty, case-insensitive substring of the caller words. */
export function enforceQuotes(facts: Facts, callerWords: string): Facts {
  const haystack = callerWords.toLowerCase();
  const next: Facts = { ...facts };
  for (const key of FACT_KEYS) {
    const quote = facts[key].quote;
    const needle = quote?.trim().toLowerCase() ?? "";
    if (!needle || !haystack.includes(needle)) {
      next[key] = { value: "unknown", quote: null };
    }
  }
  return next;
}
