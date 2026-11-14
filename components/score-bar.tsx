"use client";

import { motion } from "motion/react";
import type { Score } from "@/contract/types";
import { formatCallToLive, shareOf } from "./floor-copy";

export function ScoreBar({ score }: { score: Score }) {
  return (
    <footer className="grid grid-cols-4 gap-6" data-floor-region="score">
      <Stat label="Calls taken" value={String(score.callsTaken)} />
      <Stat label="Went live on their own" value={`${score.wentLiveOnTheirOwn}`} note={shareOf(score.wentLiveOnTheirOwn, score.callsTaken)} />
      <Stat label="Sent to a person" value={`${score.sentToAPerson}`} note={shareOf(score.sentToAPerson, score.callsTaken)} />
      <Stat label="Median time from call to live" value={formatCallToLive(score.medianSecondsCallToLive)} />
    </footer>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="min-w-0 border-t border-white/15 pt-3">
      <p className="flex items-baseline gap-2">
        <motion.span
          key={value}
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 22 }}
          className="font-[family-name:var(--font-display)] text-[44px] font-medium leading-none tabular-nums text-[#ff3d14]"
        >
          {value}
        </motion.span>
        {note ? <span className="text-[18px] text-white/50">{note}</span> : null}
      </p>
      <p className="mt-1.5 text-[14px] uppercase tracking-[0.12em] text-white/50">{label}</p>
    </div>
  );
}
