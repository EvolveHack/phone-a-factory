import { customerInfo, productOf, tenantDir, type CustomerId, type Product } from "@/contract/products";
import type { Ending } from "@/contract/types";

export function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set.`);
  return value;
}

/** Prefer a personal token. On Vercel, the project OIDC token is used when no personal token is set. */
export function vercelAuthToken(): string {
  const token = process.env.VERCEL_TOKEN?.trim() || process.env.VERCEL_OIDC_TOKEN?.trim();
  if (!token) throw new Error("VERCEL_TOKEN is not set.");
  return token;
}

export function repoSlug(repo: string): { owner: string; name: string; full: string } {
  const parts = repo.split("/");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error(`${repo} must look like owner/repo.`);
  return { owner: parts[0], name: parts[1], full: repo };
}

/** The customer's page on a deploy of its product: that deploy's origin plus the customer's path. */
export function pageUrl(base: string, customer: CustomerId): string {
  return new URL(customerInfo(customer).path, new URL(base).origin).toString();
}

/** The preview bypass secret for this product's Vercel project, if one is set. */
export function bypassSecret(product: Product): string | undefined {
  return process.env[product.bypassEnv]?.trim() || undefined;
}

/** Sandbox calls need the phone-a-factory project. On Vercel, VERCEL_PROJECT_ID is set for this app. */
export function sandboxCredentials(): { token: string; teamId: string; projectId: string } | undefined {
  const token = process.env.VERCEL_TOKEN?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (token && teamId && projectId) return { token, teamId, projectId };
  return undefined;
}

function underFolder(path: string, folder: string): boolean {
  return !folder || path.startsWith(`${folder}/`);
}

/**
 * goes_live: only the caller's own tenant folder, and never a billing.json (money).
 * needs_person: anything in the product's folder, including other tenants of the same product,
 * so "roll out to everyone" works. Never another product's folder, never contract/.
 */
export function fileAllowed(file: string, customer: CustomerId, ending: Ending): boolean {
  const path = file.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^"|"$/g, "");
  const { folder } = productOf(customer);
  if (!path || path.startsWith("contract/") || path.startsWith(`${folder}/contract/`)) return false;
  if (ending === "goes_live") {
    return path.startsWith(`${tenantDir(customer)}/`) && !path.endsWith("/billing.json");
  }
  return underFolder(path, folder);
}
