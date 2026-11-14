import type { CustomerId, Product } from "../../contract/products";

/** Words every company name could share. They do not tell customers apart. */
const GENERIC = /\b(freight|logistics|analytics|health|supply|distributors?|markets?|warehousing|home|outdoors?|inc|llc|co|company|the)\b/g;

const compact = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "");
const core = (text: string) => compact(text.toLowerCase().replace(GENERIC, " "));

/** For each customer: the distinctive part of its name ("mesalane") and its id ("mesa-lane" -> "mesalane"). */
function keysOf(products: Product[]): { id: CustomerId; keys: string[] }[] {
  return products.flatMap((product) =>
    product.customers.map((c) => ({ id: c.id, keys: [...new Set([core(c.name), compact(c.id)].filter(Boolean))] })),
  );
}

function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const here = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = here;
    }
  }
  return row[b.length];
}

/**
 * Map a spoken company name to one of the customers, allowing short forms ("Mesa", "Willow")
 * and small speech-to-text slips ("Fresh Fair"). Unknown or unclear names return null.
 * Takes the registry as an argument so Node's test runner can load this file on its own.
 */
export function customerFromCompany(company: string, products: Product[]): CustomerId | null {
  const KEYS = keysOf(products);
  const whole = compact(company);
  const said = core(company);
  if (!whole) return null;
  const pick = (hits: CustomerId[]) => (new Set(hits).size === 1 ? hits[0] : null);

  const contained = KEYS.filter(({ keys }) => keys.some((key) => whole.includes(key))).map(({ id }) => id);
  if (contained.length) return pick(contained);

  if (!said) return null;
  const prefix = KEYS.filter(({ keys }) => said.length >= 4 && keys.some((key) => key.startsWith(said))).map(({ id }) => id);
  if (prefix.length) return pick(prefix);

  const close = KEYS.filter(({ keys }) => keys.some((key) => distance(said, key) <= (key.length >= 7 ? 2 : 1))).map(({ id }) => id);
  return close.length ? pick(close) : null;
}

