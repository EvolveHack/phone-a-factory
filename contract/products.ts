// CONTRACT. The product registry. Identical copy in phone-a-factory and factory-apps.
// Only the owner edits this file. Agents: ask, do not change.
//
// Every customer id is unique across all products, so a customer id alone tells you its product.

export const PRODUCT_IDS = ["freight", "helpdesk", "orders", "coldchain", "shop"] as const;
export type ProductId = (typeof PRODUCT_IDS)[number];

export const CUSTOMER_IDS = [
  "mesa-lane",
  "pinecrest",
  "lumen",
  "cedar",
  "granite",
  "bluewater",
  "freshfare",
  "northgate",
  "willow",
  "summit",
] as const;
export type CustomerId = (typeof CUSTOMER_IDS)[number];

export interface ProductCustomer {
  id: CustomerId;
  name: string;
  /** Path of this customer's page on the product's site. */
  path: string;
}

export interface Product {
  id: ProductId;
  /** What the product is called on the floor screen. */
  name: string;
  /** The fictional vendor that sells it. */
  vendor: string;
  /** One plain sentence: what it does and who it is for. */
  what: string;
  /** GitHub repo the builder edits. */
  repo: string;
  /** Production address of the product's site. */
  prodUrl: string;
  /** Vercel project id for previews, promote, and undo. */
  vercelProjectId: string;
  /** Folder inside the repo that holds this product. "" means the repo root. */
  folder: string;
  /** Env var names on phone-a-factory that hold this repo's sandbox snapshot id and preview bypass secret. */
  snapshotEnv: string;
  bypassEnv: string;
  /** Command the builder runs inside the repo, after the build, to prove a change for one customer.
   *  It gets PAGE_URL (the preview page for that customer), CUSTOMER, and BOARD_PACKAGE_JSON. Exit 0 = proven. */
  proofCommand: string | null;
  customers: [ProductCustomer, ProductCustomer];
  /** Sample asks for rehearsal and the deck. */
  sampleAsks: { goesLive: string; needsPerson: string };
}

export const PRODUCTS: Record<ProductId, Product> = {
  freight: {
    id: "freight",
    name: "Dispatch Board",
    vendor: "Relaytrack",
    what: "A load board that freight brokers use to track loads, carriers, and late trucks.",
    repo: "EvolveHack/dispatch-board",
    prodUrl: "https://dispatch-board-six.vercel.app",
    vercelProjectId: "prj_j0A02YxdFJLkVEfwJpIraTLCOXq9",
    folder: "",
    snapshotEnv: "SANDBOX_SNAPSHOT_ID",
    bypassEnv: "VERCEL_AUTOMATION_BYPASS_SECRET",
    proofCommand: null,
    customers: [
      { id: "mesa-lane", name: "Mesa Lane Freight", path: "/t/mesa-lane" },
      { id: "pinecrest", name: "Pinecrest Logistics", path: "/t/pinecrest" },
    ],
    sampleAsks: {
      goesLive: "Add an ETA countdown and a Call driver button on late loads.",
      needsPerson: "Add an invoice tab that totals detention charges.",
    },
  },
  helpdesk: {
    id: "helpdesk",
    name: "Helpdesk Agent",
    vendor: "Northpeak",
    what: "An AI support agent that answers a software company's customers in chat.",
    repo: "EvolveHack/factory-apps",
    prodUrl: "https://factory-apps.vercel.app",
    vercelProjectId: "prj_800fI5NVMK7QdNCrLLZfccau2AHH",
    folder: "products/helpdesk",
    snapshotEnv: "SANDBOX_SNAPSHOT_ID_APPS",
    bypassEnv: "VERCEL_AUTOMATION_BYPASS_SECRET_APPS",
    proofCommand: "node products/helpdesk/proof.mjs",
    customers: [
      { id: "lumen", name: "Lumen Analytics", path: "/helpdesk/lumen" },
      { id: "cedar", name: "Cedar Health", path: "/helpdesk/cedar" },
    ],
    sampleAsks: {
      goesLive: "When someone asks about an outage, check our status page and answer with it.",
      needsPerson: "Let the agent issue refunds up to fifty dollars.",
    },
  },
  orders: {
    id: "orders",
    name: "Order Flows",
    vendor: "Tallyflow",
    what: "Workflows that move a distributor's orders between its systems and its team chat.",
    repo: "EvolveHack/factory-apps",
    prodUrl: "https://factory-apps.vercel.app",
    vercelProjectId: "prj_800fI5NVMK7QdNCrLLZfccau2AHH",
    folder: "products/orders",
    snapshotEnv: "SANDBOX_SNAPSHOT_ID_APPS",
    bypassEnv: "VERCEL_AUTOMATION_BYPASS_SECRET_APPS",
    proofCommand: "node products/orders/proof.mjs",
    customers: [
      { id: "granite", name: "Granite Supply", path: "/orders/granite" },
      { id: "bluewater", name: "Bluewater Distributors", path: "/orders/bluewater" },
    ],
    sampleAsks: {
      goesLive: "When an order over five thousand dollars ships, post it to big orders with the margin.",
      needsPerson: "When an order ships, create the invoice in our accounting system.",
    },
  },
  coldchain: {
    id: "coldchain",
    name: "Cold Chain Monitor",
    vendor: "Frostline",
    what: "Sensors and alerts that keep freezers safe in grocery stores and warehouses.",
    repo: "EvolveHack/factory-apps",
    prodUrl: "https://factory-apps.vercel.app",
    vercelProjectId: "prj_800fI5NVMK7QdNCrLLZfccau2AHH",
    folder: "products/coldchain",
    snapshotEnv: "SANDBOX_SNAPSHOT_ID_APPS",
    bypassEnv: "VERCEL_AUTOMATION_BYPASS_SECRET_APPS",
    proofCommand: "node products/coldchain/proof.mjs",
    customers: [
      { id: "freshfare", name: "FreshFare Markets", path: "/coldchain/freshfare" },
      { id: "northgate", name: "Northgate Warehousing", path: "/coldchain/northgate" },
    ],
    sampleAsks: {
      goesLive: "Add a freezer door left open alert that pages the shift lead after three minutes.",
      needsPerson: "Raise the defrost cycle setpoint on all freezers.",
    },
  },
  shop: {
    id: "shop",
    name: "Shopping App",
    vendor: "Cartwise",
    what: "The mobile shopping app a retailer's customers use on their phones.",
    repo: "EvolveHack/factory-apps",
    prodUrl: "https://factory-apps.vercel.app",
    vercelProjectId: "prj_800fI5NVMK7QdNCrLLZfccau2AHH",
    folder: "products/shop",
    snapshotEnv: "SANDBOX_SNAPSHOT_ID_APPS",
    bypassEnv: "VERCEL_AUTOMATION_BYPASS_SECRET_APPS",
    proofCommand: "node products/shop/proof.mjs",
    customers: [
      { id: "willow", name: "Willow Pine Home", path: "/shop/willow" },
      { id: "summit", name: "Summit Outdoor", path: "/shop/summit" },
    ],
    sampleAsks: {
      goesLive: "Add a Reorder my last purchase button on the home screen.",
      needsPerson: "Turn on the new checkout for every shopper.",
    },
  },
};

const BY_CUSTOMER = new Map<CustomerId, { product: Product; customer: ProductCustomer }>();
for (const product of Object.values(PRODUCTS)) {
  for (const customer of product.customers) BY_CUSTOMER.set(customer.id, { product, customer });
}

export function isCustomerId(value: string): value is CustomerId {
  return (CUSTOMER_IDS as readonly string[]).includes(value);
}

export function productOf(customer: CustomerId): Product {
  return BY_CUSTOMER.get(customer)!.product;
}

export function customerInfo(customer: CustomerId): ProductCustomer {
  return BY_CUSTOMER.get(customer)!.customer;
}

/** The other customer of the same product (each product has two). */
export function otherCustomerOf(customer: CustomerId): CustomerId {
  const { product } = BY_CUSTOMER.get(customer)!;
  return product.customers[0].id === customer ? product.customers[1].id : product.customers[0].id;
}

/** Repo-relative folder that holds this customer's own files. A "goes live" change may only edit here. */
export function tenantDir(customer: CustomerId): string {
  const { product } = BY_CUSTOMER.get(customer)!;
  return `${product.folder ? `${product.folder}/` : ""}tenants/${customer}`;
}
