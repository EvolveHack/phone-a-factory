import { RulesScreen } from "@/components/rules-screen";
import { getState } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function Page() {
  return <RulesScreen initial={await getState()} />;
}
