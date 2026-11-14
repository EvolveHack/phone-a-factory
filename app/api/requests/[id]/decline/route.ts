import { setStatus } from "@/lib/store";
import { NextResponse } from "next/server";
import { finish } from "../finish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  let reason = "";
  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "reason" in body && typeof body.reason === "string") {
      reason = body.reason.trim();
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!reason) return NextResponse.json({ ok: false }, { status: 400 });

  return finish(async () => {
    const { id } = await context.params;
    await setStatus(id, "declined", reason);
  });
}
