import { submitRequest } from "@/lib/classify/submit";

export const maxDuration = 20;

export async function POST(request: Request) {
  return submitRequest(request, { requireSecret: true });
}
