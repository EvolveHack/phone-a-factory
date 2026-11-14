import { runBuild } from "@/lib/builder/run";
import { MAX_PARALLEL_BUILDS, claimNextQueued } from "@/lib/store";
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
  const origin = originOf(req);
  const started: string[] = [];
  for (let i = 0; i < MAX_PARALLEL_BUILDS; i++) {
    const next = await claimNextQueued();
    if (!next) break;
    started.push(next.id);
    after(async () => {
      try {
        await runBuild(next.id);
      } finally {
        await fetch(`${origin}/api/build/next`, { method: "POST", cache: "no-store" }).catch(() => undefined);
      }
    });
  }
  return Response.json({ started: started[0] ?? null, all: started });
}
