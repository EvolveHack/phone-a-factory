import type { Metadata } from "next";
import { FloorScreen } from "@/components/floor-screen";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Phone-a-factory",
  description: "Every ask gets built.",
};

export default async function Page() {
  const initial = await getState();
  const boardUrl = process.env.NEXT_PUBLIC_DISPATCH_BOARD_PROD_URL?.trim() ?? "";
  return <FloorScreen initial={initial} boardUrl={boardUrl} />;
}
