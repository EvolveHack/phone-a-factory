// OWNED BY W2. Stub so W3 can call these before W2 is merged. W2 replaces the bodies; signatures are fixed in contract/api.md.
import { setStatus } from "@/lib/store";

export async function promote(requestId: string): Promise<void> {
  await setStatus(requestId, "live");
}
export async function undo(requestId: string): Promise<void> {
  await setStatus(requestId, "undone");
}
export async function veto(requestId: string): Promise<void> {
  await setStatus(requestId, "vetoed");
}
