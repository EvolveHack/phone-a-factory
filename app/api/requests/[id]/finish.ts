import { NextResponse } from "next/server";

export async function finish(work: () => Promise<void>) {
  try {
    await work();
    return NextResponse.json({ ok: true });
  } catch (err) {
    const missing = err instanceof Error && err.message.includes("not found");
    return NextResponse.json({ ok: false }, { status: missing ? 404 : 500 });
  }
}
