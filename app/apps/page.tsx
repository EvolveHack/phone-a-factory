import { AppsScreen } from "@/components/apps-screen";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <AppsScreen initial={await getState()} />;
}
