import type { Score } from "@/contract/types";
import { formatCallToLive } from "./floor-copy";

export function ScoreBar({ score }: { score: Score }) {
  const parts = [
    `${score.callsTaken} ${score.callsTaken === 1 ? "call" : "calls"}`,
    `${score.wentLiveOnTheirOwn} went live on their own`,
    ...(score.medianSecondsCallToLive == null ? [] : [`${formatCallToLive(score.medianSecondsCallToLive)} from call to live`]),
  ];
  return (
    <footer className="border-t border-fg/15 pt-4 text-[14px] tabular-nums text-fg/60" data-floor-region="score">
      {parts.join(" · ")}
    </footer>
  );
}
