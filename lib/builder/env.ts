import { CUSTOMER_IDS, CUSTOMERS, type CustomerId } from "@/contract/view";
import type { Ending } from "@/contract/types";

export function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

export function repoSlug(): { owner: string; name: string; full: string } {
  const full = required("DISPATCH_BOARD_REPO");
  const parts = full.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error("DISPATCH_BOARD_REPO must look like owner/repo.");
  }
  return { owner: parts[0], name: parts[1], full };
}

export function otherCustomer(customer: CustomerId): CustomerId {
  const other = CUSTOMER_IDS.find((id) => id !== customer);
  if (!other) throw new Error("There is no other customer to compare.");
  return other;
}

export function customerName(customer: CustomerId): string {
  return CUSTOMERS[customer].name;
}

export function customerPage(base: string, customer: CustomerId): string {
  const url = new URL(base);
  url.pathname = `/t/${customer}`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

/** Sandbox calls need the phone-a-factory project. On Vercel, VERCEL_PROJECT_ID is set for this app. */
export function sandboxCredentials(): { token: string; teamId: string; projectId: string } | undefined {
  const token = process.env.VERCEL_TOKEN?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (token && teamId && projectId) return { token, teamId, projectId };
  return undefined;
}

export function fileAllowed(file: string, customer: CustomerId, ending: Ending): boolean {
  const path = file.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^"|"$/g, "");
  if (!path || path.startsWith("contract/")) return false;
  if (ending === "goes_live") {
    return path === `tenants/${customer}/view.json` || path === `tenants/${customer}/overrides.tsx`;
  }
  const other = otherCustomer(customer);
  return path !== `tenants/${other}` && !path.startsWith(`tenants/${other}/`);
}

export function allowedFileList(customer: CustomerId, ending: Ending): string[] {
  const files = [`tenants/${customer}/view.json`, `tenants/${customer}/overrides.tsx`];
  if (ending === "needs_person") files.push(`tenants/${customer}/billing.json`);
  return files;
}
