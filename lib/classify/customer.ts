import type { CustomerId } from "../../contract/view";

/** Map a spoken company name to one of the two customers. Unknown names return null. */
export function customerFromCompany(company: string): CustomerId | null {
  const compact = company.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!compact) return null;
  if (compact.includes("pinecrest")) return "pinecrest";
  if (compact.includes("mesalane") || compact === "mesa") return "mesa-lane";
  return null;
}
