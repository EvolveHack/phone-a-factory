"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { StateSnapshot } from "@/contract/types";
import { FactoryLine } from "./factory-line";
import { PHONE_LINE } from "./floor-copy";
import { OutcomesStrip } from "./outcomes-strip";
import { ScoreBar } from "./score-bar";
import type { TicketAction } from "./ticket";

function useNow(): number | null {
  return useSyncExternalStore(
    (onChange) => {
      const id = window.setInterval(onChange, 1000);
      return () => window.clearInterval(id);
    },
    () => Date.now(),
    () => null,
  );
}

export function FloorScreen({ initial }: { initial: StateSnapshot }) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const gen = useRef(0);
  const now = useNow();

  const pull = useCallback(async () => {
    const mine = ++gen.current;
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw new Error("load failed");
      const data = (await response.json()) as StateSnapshot;
      if (mine !== gen.current) return;
      setState(data);
      setError(null);
    } catch {
      if (mine !== gen.current) return;
      setError("The floor could not load. Trying again.");
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => void pull(), 1000);
    return () => window.clearInterval(id);
  }, [pull]);

  async function onAction(id: string, action: TicketAction, body?: { reason: string }) {
    const response = await fetch(`/api/requests/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!response.ok) throw new Error("Could not update this ask.");
    await pull();
  }

  return (
    <main className="flex h-screen flex-col gap-5 overflow-hidden bg-[#0b0b0b] px-10 pt-8 pb-7 text-white">
      <header className="flex items-end justify-between gap-8">
        <div>
          <p className="inline-flex items-center gap-3 rounded-full px-4 py-1.5 text-[13px] font-semibold uppercase tracking-[0.16em] ring-1 ring-white/30">
            <span className="live-dot h-2 w-2 rounded-full bg-[#ff3d14]" aria-hidden />
            <span className="text-[#ff3d14]">Live</span>
            <span className="text-white/40">|</span>
            <span>Phone-a-factory</span>
          </p>
          <h1 className="mt-4 font-[family-name:var(--font-display)] text-[56px] font-medium leading-none tracking-[-0.03em]">
            Call in an order. Watch it ship.
          </h1>
        </div>
        <p className="shrink-0 rounded-2xl bg-[#ff3d14] px-7 py-4 font-[family-name:var(--font-display)] text-[46px] font-medium leading-none tracking-tight">
          {PHONE_LINE}
        </p>
      </header>

      <FactoryLine requests={state.requests} steps={state.steps} now={now} onAction={onAction} />

      <OutcomesStrip requests={state.requests} />
      {error ? <p className="text-[15px] text-[#ff8a70]">{error}</p> : null}
      <ScoreBar score={state.score} />
    </main>
  );
}
