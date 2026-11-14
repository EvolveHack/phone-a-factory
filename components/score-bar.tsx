import type { Score } from "@/contract/types";
import { PHONE_LINE, formatCallToLive, shareOf } from "./floor-copy";

export function ScoreBar({ score }: { score: Score }) {
  return (
    <footer className="grid h-full grid-cols-[1fr_1fr_1fr_1fr_auto] items-center gap-4 border-t border-white/15 bg-black px-6" data-floor-region="score">
      <Stat label="Calls taken" value={String(score.callsTaken)} />
      <Stat label="Went live on their own" value={`${score.wentLiveOnTheirOwn} (${shareOf(score.wentLiveOnTheirOwn, score.callsTaken)})`} />
      <Stat label="Sent to a person" value={`${score.sentToAPerson} (${shareOf(score.sentToAPerson, score.callsTaken)})`} />
      <Stat label="Median time from call to live" value={formatCallToLive(score.medianSecondsCallToLive)} />
      <p className="whitespace-nowrap rounded-xl bg-[#ff3d14] px-5 py-3 text-[36px] font-semibold leading-none text-white">{PHONE_LINE}</p>
    </footer>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[28px] font-semibold leading-none">{value}</p>
      <p className="mt-1 text-[15px] leading-tight text-white/75">{label}</p>
    </div>
  );
}
