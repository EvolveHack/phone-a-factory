"use client";

import { AnimatePresence, motion } from "motion/react";
import type { FactoryRequest } from "@/contract/types";
import { customerInfo } from "@/contract/products";
import { STATUS_LABEL } from "./floor-copy";
import { customerColor, OFF_LINE } from "./stations";

/** Tickets that left the line: declined, rejected, stopped, or undone. Newest first. */
export function OutcomesStrip({ requests }: { requests: FactoryRequest[] }) {
  const done = requests
    .filter((r) => OFF_LINE.includes(r.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6);
  return (
    <div className="flex h-12 items-center gap-3 overflow-hidden" data-floor-region="outcomes">
      <p className="shrink-0 text-[13px] font-semibold uppercase tracking-[0.14em] text-white/40">Off the line</p>
      {done.length === 0 ? <p className="text-[15px] text-white/25">Declined, stopped, or undone asks show here.</p> : null}
      <AnimatePresence initial={false}>
        {done.map((r) => (
          <motion.p
            key={r.id}
            layout
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="flex shrink-0 items-center gap-2 rounded-full bg-white/[0.06] px-3 py-1.5 text-[14px]"
            title={r.statusReason ?? undefined}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: customerColor(r.customer) }} aria-hidden />
            <span className="text-white/60">{customerInfo(r.customer).name}</span>
            <span className="max-w-[260px] truncate">{r.ask}</span>
            <span className="font-semibold text-white/70">{STATUS_LABEL[r.status]}</span>
          </motion.p>
        ))}
      </AnimatePresence>
    </div>
  );
}
