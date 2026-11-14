import { submitRequest } from "@/lib/classify/submit";

export const maxDuration = 20;

/** Same as the voice route, without the shared secret. Off in production. */
export async function POST(request: Request) {
  if (process.env.VERCEL_ENV === "production") {
    return Response.json({ error: "This route is off in production." }, { status: 404 });
  }
  return submitRequest(request, { requireSecret: false });
}
