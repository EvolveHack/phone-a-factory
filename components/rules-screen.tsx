"use client";

import Link from "next/link";
import type { StateSnapshot } from "@/contract/types";
import { customerInfo, productOf } from "@/contract/products";
import { endingBadge, RULES, STATUS_LABEL } from "./floor-copy";
import { Shell } from "./shell";
import { useFactory } from "./use-factory";

/** The rules that pick each ask's path, with the asks each one caught. */
export function RulesScreen({ initial }: { initial: StateSnapshot }) {
  const { state, error } = useFactory(initial);
  return (
    <Shell error={error}>
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-[36px] font-medium leading-none tracking-[-0.03em]">Your rules pick the path.</h1>
        <p className="mt-3 text-[15px] text-fg/55">
          Every ask gets built. The first rule that fits decides who looks before it ships. An unknown fact goes to a person.
        </p>
      </div>
      <ol className="min-h-0 flex-1 space-y-4 overflow-y-auto p-1">
        {RULES.map((rule, index) => {
          const caught = state.requests.filter((r) => r.rule?.rule === rule.id);
          const goesLive = rule.ending === "goes_live";
          return (
            <li key={rule.id}>
              <details className="group rounded-2xl bg-panel-2 ring-1 ring-line" data-rule={rule.id}>
                <summary className="grid cursor-pointer list-none grid-cols-[3rem_minmax(0,1fr)_auto_7rem] items-center gap-6 px-7 py-5">
                  <span className="text-[14px] font-semibold tracking-[0.14em] text-accent">{String(index + 1).padStart(2, "0")}</span>
                  <span className="font-[family-name:var(--font-display)] text-[18px] leading-snug">{rule.when}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-[13px] font-semibold ${goesLive ? "bg-live/15 text-live" : "bg-gate/15 text-gate"}`}
                  >
                    {endingBadge(rule.ending, rule.approver)}
                  </span>
                  <span className="text-right text-[14px] text-fg/55">
                    {caught.length} {caught.length === 1 ? "ask" : "asks"} <span className="inline-block transition-transform group-open:rotate-90">›</span>
                  </span>
                </summary>
                <ul className="space-y-1 border-t border-fg/10 px-7 py-4">
                  {caught.length === 0 ? <li className="text-[14px] text-fg/35">No asks have matched this rule yet.</li> : null}
                  {caught.map((r) => (
                    <li key={r.id}>
                      <Link href={`/asks/${r.id}`} className="flex items-baseline gap-4 rounded-lg px-2 py-1 text-[14px] hover:bg-fg/[0.06]">
                        <span className="w-64 shrink-0 truncate text-fg/50">
                          {customerInfo(r.customer).name} · {productOf(r.customer).name}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-fg/85">{r.ask}</span>
                        <span className="shrink-0 font-semibold text-fg/60">{STATUS_LABEL[r.status]}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ol>
    </Shell>
  );
}
