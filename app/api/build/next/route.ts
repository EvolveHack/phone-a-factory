import { runBuild } from "@/lib/builder/run";
import { isBuilderBusy, nextQueued, setStatus } from "@/lib/store";
import { after } from "next/server";

export const maxDuration = 800;
export const dynamic = "force-dynamic";

function originOf(req: Request): string {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? "https";
    return `${proto}://${host}`;
  }
  return new URL(req.url).origin;
}

export async function POST(req: Request) {
  if (await isBuilderBusy()) return Response.json({ started: null });
  const next = await nextQueued();
  if (!next) return Response.json({ started: null });
  await setStatus(next.id, "building");
  const origin = originOf(req);
  after(async () => {
    try {
      await runBuild(next.id);
    } finally {
      await fetch(`${origin}/api/build/next`, { method: "POST", cache: "no-store" }).catch(() => undefined);
    }
  });
  return Response.json({ started: next.id });
}
