// CONTRACT. Shared by phone-a-factory and dispatch-board (identical copy in both repos).
// Only the owner edits this file. Agents: ask, do not change.
//
// Each customer of Dispatch Board has a folder: tenants/<CustomerId>/
//   view.json      -> ViewConfig (how that customer's board looks). "Goes live" changes may edit this.
//   overrides.tsx  -> optional small React overrides for that customer. "Goes live" changes may edit this.
//   billing.json   -> BillingConfig (money). Never edited by a "goes live" change.

export const CUSTOMER_IDS = ["mesa-lane", "pinecrest"] as const;
export type CustomerId = (typeof CUSTOMER_IDS)[number];

export const CUSTOMERS: Record<CustomerId, { name: string; path: string }> = {
  "mesa-lane": { name: "Mesa Lane Freight", path: "/t/mesa-lane" },
  pinecrest: { name: "Pinecrest Logistics", path: "/t/pinecrest" },
};

export type LoadField =
  | "loadNumber"
  | "origin"
  | "destination"
  | "pickupAt"
  | "carrier"
  | "equipment" // "dry_van" | "reefer" | "flatbed"
  | "rate" // dollars, what the broker pays the carrier
  | "status" // "booked" | "in_transit" | "at_pickup" | "at_delivery" | "delivered"
  | "eta"
  | "minutesLate"
  | "detentionMinutes";

export interface Load {
  loadNumber: string;
  origin: string; // "Dallas, TX"
  destination: string;
  originLatLng: [number, number];
  destinationLatLng: [number, number];
  progress: number; // 0..1 along the lane, moved by the board's clock
  pickupAt: string; // ISO time
  carrier: string;
  equipment: "dry_van" | "reefer" | "flatbed";
  rate: number;
  status: "booked" | "at_pickup" | "in_transit" | "at_delivery" | "delivered";
  eta: string; // ISO time
  minutesLate: number; // 0 when on time
  detentionMinutes: number;
}

export interface Condition {
  field: LoadField;
  op: "gt" | "gte" | "lt" | "lte" | "eq" | "neq" | "contains";
  value: string | number;
}

export interface ViewConfig {
  title?: string;
  columns: { key: LoadField; label: string }[]; // display order
  filters: { key: LoadField; label: string; type: "select" | "text" }[];
  sort: { key: LoadField; direction: "asc" | "desc" }[]; // first entry wins, later entries break ties
  highlights: {
    when: Condition[]; // all must match
    color: "red" | "amber" | "green" | "blue";
    pinToTop?: boolean;
    label?: string;
  }[];
  hiddenPanels?: ("map" | "exceptions")[];
}

export interface BillingConfig {
  detentionFreeHours: number; // detention starts after this many hours at a stop
  detentionRatePerHour: number; // dollars
}
