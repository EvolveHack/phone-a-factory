import { getState } from "@/lib/store";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const state = await getState();
  return NextResponse.json(state, {
    headers: { "cache-control": "no-store" },
  });
}
