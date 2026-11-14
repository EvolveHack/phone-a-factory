import { notFound } from "next/navigation";
import { AskScreen } from "@/components/ask-screen";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const initial = await getState();
  if (!initial.requests.some((r) => r.id === id)) notFound();
  return <AskScreen initial={initial} id={id} />;
}
