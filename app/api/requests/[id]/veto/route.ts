import { veto } from "@/lib/builder";
import { finish } from "../finish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return finish(async () => {
    const { id } = await context.params;
    await veto(id);
  });
}
