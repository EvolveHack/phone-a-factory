"use client";

import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import type { FactoryRequest, StateSnapshot } from "@/contract/types";
import { customerInfo, productOf, PRODUCTS, type ProductId } from "@/contract/products";
import { endingBadge, secondsSince, statusLine } from "./floor-copy";
import { ScoreBar } from "./score-bar";
import { Shell } from "./shell";
import { customerColor, stationOf } from "./stations";
import { Tracker } from "./tracker";
import { useFactory } from "./use-factory";

type Group = "all" | "moving" | "gate" | "live" | "off";

const GROUPS: { id: Group; label: string }[] = [
  { id: "all", label: "All asks" },
  { id: "moving", label: "In progress" },
  { id: "gate", label: "Needs a person" },
  { id: "live", label: "Live" },
  { id: "off", label: "Off the line" },
];

function groupOf(request: FactoryRequest): Exclude<Group, "all"> {
  const station = stationOf(request);
  if (station === null) return "off";
  if (station === "gate" || station === "live") return station;
  return "moving";
}

// Work that is moving leads, then asks that wait for a person, then finished ones. Newest first inside each.
const ORDER: Record<Exclude<Group, "all">, number> = { moving: 0, gate: 1, live: 2, off: 3 };

export function FloorScreen({ initial }: { initial: StateSnapshot }) {
  const { state, error, now } = useFactory(initial);
  const [group, setGroup] = useState<Group>("all");
  const [product, setProduct] = useState<ProductId | "all">("all");

  const inProduct = state.requests.filter((r) => product === "all" || productOf(r.customer).id === product);
  const shown = inProduct
    .filter((r) => group === "all" || groupOf(r) === group)
    .sort((a, b) => ORDER[groupOf(a)] - ORDER[groupOf(b)] || b.createdAt.localeCompare(a.createdAt));

  return (
    <Shell error={error}>
      <div className="flex items-end justify-between gap-8">
        <h1 className="font-[family-name:var(--font-display)] text-[36px] font-medium leading-none tracking-[-0.03em]">
          Call in an order. Watch it ship.
        </h1>
        <div className="flex gap-2" role="group" aria-label="Show">
          {GROUPS.map((g) => (
            <Chip key={g.id} on={group === g.id} onClick={() => setGroup(g.id)}>
              {g.label}
              <span className="ml-2 tabular-nums opacity-60">
                {g.id === "all" ? inProduct.length : inProduct.filter((r) => groupOf(r) === g.id).length}
              </span>
            </Chip>
          ))}
        </div>
      </div>

      <div className="-mt-2 flex flex-wrap gap-2" role="group" aria-label="App">
        <Chip on={product === "all"} onClick={() => setProduct("all")}>
          All apps
        </Chip>
        {Object.values(PRODUCTS).map((p) => (
          <Chip key={p.id} on={product === p.id} onClick={() => setProduct(p.id)}>
            {p.name}
          </Chip>
        ))}
      </div>

      <ul className="min-h-0 flex-1 space-y-4 overflow-y-auto p-1" data-floor-region="orders">
        <AnimatePresence initial={false}>
          {shown.map((request) => (
            <Order key={request.id} request={request} line={statusLine(request, state.steps, state.requests)} now={now} />
          ))}
        </AnimatePresence>
        {shown.length === 0 ? <li className="px-1 pt-6 text-[17px] text-fg/40">No asks here yet. Call the number to add one.</li> : null}
      </ul>

      <ScoreBar score={state.score} />
    </Shell>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-[13px] font-semibold transition-colors ${on ? "bg-fg text-ink" : "bg-fg/[0.06] text-fg/70 hover:bg-fg/[0.12]"}`}
    >
      {children}
    </button>
  );
}

function Order({ request, line, now }: { request: FactoryRequest; line: string; now: number | null }) {
  const color = customerColor(request.customer);
  const group = groupOf(request);
  const tone = group === "gate" ? "text-gate" : group === "live" ? "text-live" : group === "off" ? "text-fg/50" : "text-fg/85";
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 28 }}
      data-request-id={request.id}
      data-status={request.status}
    >
      <Link
        href={`/asks/${request.id}`}
        className={`relative grid grid-cols-[minmax(0,5fr)_minmax(0,5fr)_minmax(0,3fr)] items-center gap-10 overflow-hidden rounded-2xl bg-panel-2 py-5 pr-7 pl-8 ring-1 ring-line transition-colors hover:bg-panel-3 hover:ring-fg/30 ${group === "gate" ? "gate-hold" : ""}`}
      >
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold uppercase tracking-[0.12em]">
            <span style={{ color }}>{customerInfo(request.customer).name}</span>
            <span className="text-fg/45"> · {productOf(request.customer).name}</span>
          </p>
          <p className="mt-1.5 line-clamp-2 font-[family-name:var(--font-display)] text-[18px] leading-snug">{request.ask}</p>
          <p className="mt-1.5 truncate text-[13px] text-fg/45">
            {request.callerName}, {request.callerRole}
            {now == null ? "" : ` · ${secondsSince(request.createdAt, now)}`}
          </p>
        </div>
        <Tracker request={request} />
        <div className="min-w-0 text-right">
          <p className={`text-[14px] font-medium ${tone}`}>{line}</p>
          {request.rule ? (
            <p className="mt-1.5 truncate text-[12px] text-fg/45">
              {request.rule.rule} · {endingBadge(request.rule.ending, request.rule.approver)}
            </p>
          ) : null}
          <p className="mt-1.5 text-[13px] font-semibold text-fg/70">{group === "gate" ? "Review the change →" : "Open →"}</p>
        </div>
      </Link>
    </motion.li>
  );
}
