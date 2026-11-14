// OWNED BY W1. Stub. W1 replaces the bodies; signatures are fixed in contract/api.md. These never throw.
import type { FactoryRequest } from "@/contract/types";

export async function createWorkOrder(_r: FactoryRequest): Promise<string | null> {
  return null;
}
export async function linkPullRequest(_workOrderId: string, _prUrl: string): Promise<void> {}
export async function addComment(_workOrderId: string, _text: string): Promise<void> {}
