"use client";

import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import type { BuildStep, FactoryRequest } from "@/contract/types";
import { queueWait } from "./floor-copy";
import { STATIONS, stationOf, type StationId } from "./stations";
import { Ticket, type TicketAction } from "./ticket";

const MAX_PER_STATION = 4;

export function FactoryLine({
  requests,
  steps,
  now,
  onAction,
}: {
  requests: FactoryRequest[];
  steps: BuildStep[];
  now: number | null;
  onAction: (id: string, action: TicketAction, body?: { reason: string }) => Promise<void>;
}) {
  const byStation = new Map<StationId, FactoryRequest[]>(STATIONS.map((s) => [s.id, []]));
  for (const request of requests) {
    const station = stationOf(request);
    if (station) byStation.get(station)!.push(request);
  }
  // Oldest first on every station, except Live, where the newest change leads.
  for (const [id, list] of byStation) {
    list.sort((a, b) => (id === "live" ? b.createdAt.localeCompare(a.createdAt) : a.createdAt.localeCompare(b.createdAt)));
  }

  return (
    <LayoutGroup>
      <div className="relative grid min-h-0 flex-1 grid-cols-6 gap-3" data-floor-region="line">
        <div className="belt pointer-events-none absolute inset-x-0 top-[78px] h-3 rounded-full opacity-80" aria-hidden />
        {STATIONS.map((station, index) => {
          const list = byStation.get(station.id) ?? [];
          const shown = list.slice(0, MAX_PER_STATION);
          const more = list.length - shown.length;
          return (
            <section key={station.id} className="flex min-h-0 flex-col" data-station={station.id}>
              <StationHeader index={index} label={station.label} hint={station.hint} count={list.length} id={station.id} />
              <div className="mt-10 flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
                <AnimatePresence mode="popLayout">
                  {shown.map((request) => (
                    <Ticket
                      key={request.id}
                      request={request}
                      station={station.id}
                      steps={steps}
                      now={now}
                      wait={queueWait(request, requests)}
                      onAction={onAction}
                    />
                  ))}
                </AnimatePresence>
                {list.length === 0 ? <p className="px-1 text-[15px] text-white/25">Nothing here yet.</p> : null}
                {more > 0 ? <p className="px-1 text-[15px] font-medium text-white/60">and {more} more</p> : null}
              </div>
            </section>
          );
        })}
      </div>
    </LayoutGroup>
  );
}

function StationHeader({ index, label, hint, count, id }: { index: number; label: string; hint: string; count: number; id: StationId }) {
  const tone = id === "gate" ? "#ffb020" : id === "live" ? "#3ddc97" : "#ff3d14";
  return (
    <header className="relative z-10">
      <div className="flex items-baseline gap-2">
        <span className="text-[14px] font-semibold tracking-[0.14em]" style={{ color: tone }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <h2 className="font-[family-name:var(--font-display)] text-[30px] font-medium leading-none tracking-tight">{label}</h2>
        <motion.span
          key={count}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className="ml-auto rounded-full bg-white/10 px-2.5 py-0.5 text-[15px] font-semibold tabular-nums"
        >
          {count}
        </motion.span>
      </div>
      <p className="mt-1 text-[13px] text-white/45">{hint}</p>
    </header>
  );
}
