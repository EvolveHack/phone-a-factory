import type { FactoryRequest, Status } from "@/contract/types";
import { CUSTOMER_IDS, type CustomerId } from "@/contract/products";

export type StationId = "call" | "rules" | "build" | "checks" | "gate" | "live";

export const STATIONS: { id: StationId; label: string; hint: string }[] = [
  { id: "call", label: "Call", hint: "Heard and read back" },
  { id: "rules", label: "Rules", hint: "Your rules pick the path" },
  { id: "build", label: "Build", hint: "An agent makes the change" },
  { id: "checks", label: "Checks", hint: "Build, folder, browser" },
  { id: "gate", label: "Gate", hint: "A person decides" },
  { id: "live", label: "Live", hint: "On that customer's board" },
];

const STATION_OF: Partial<Record<Status, StationId>> = {
  received: "call",
  classified: "call",
  queued: "rules",
  building: "build",
  checking: "checks",
  waiting_for_approval: "gate",
  approved: "gate",
  live: "live",
};

/** Where a ticket sits on the line, or null when it has left the line (declined, rejected, undone, vetoed). */
export function stationOf(request: FactoryRequest): StationId | null {
  return STATION_OF[request.status] ?? null;
}

/** How far along the line a ticket got (0 = Call, 5 = Live), even after it left the line. */
export function reachedIndex(request: FactoryRequest): number {
  let reached = 0;
  for (const status of Object.keys(request.statusTimes) as Status[]) {
    const station = STATION_OF[status];
    if (station) reached = Math.max(reached, STATIONS.findIndex((s) => s.id === station));
  }
  return reached;
}

/** Finished tickets that left the line, newest first. */
export const OFF_LINE: Status[] = ["declined", "rejected", "vetoed", "undone", "failed"];

const HUES = ["#ff3d14", "#3ddc97", "#5b8cff", "#ffb020", "#d46bff", "#2ec5d3", "#ff6fa3", "#a3d93b", "#e8e36b", "#9b7bff"];

/** A steady color per customer: one hue for each of the ten customers, in registry order. */
export function customerColor(id: CustomerId): string {
  const index = CUSTOMER_IDS.indexOf(id);
  const at = index >= 0 ? index : [...id].reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return `color-mix(in oklab, ${HUES[at % HUES.length]} var(--hue-keep), black)`;
}
