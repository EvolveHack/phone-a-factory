"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CustomerId } from "@/contract/view";
import type { StateSnapshot } from "@/contract/types";
import { BuildPanel } from "./build-panel";
import { CustomerBoards } from "./customer-boards";
import { newestFirst } from "./floor-copy";
import { QueueList } from "./queue-list";
import { ReviewPanel, type ReviewAction } from "./review-panel";
import { ScoreBar } from "./score-bar";

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

const RELOAD_START: Record<CustomerId, number> = { "mesa-lane": 0, pinecrest: 0 };

export function FloorScreen({ initial, boardUrl }: { initial: StateSnapshot; boardUrl: string }) {
  const [state, setState] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<Partial<Record<CustomerId, boolean>>>({});
  const [reload, setReload] = useState(RELOAD_START);
  const seen = useRef<Map<string, string> | null>(null);
  const timers = useRef<Partial<Record<CustomerId, number>>>({});
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

  useEffect(() => {
    const prev = seen.current;
    if (prev) {
      for (const request of state.requests) {
        const before = prev.get(request.id);
        if (request.status !== "live" || before === "live") continue;
        const customer = request.customer;
        setReload((current) => ({ ...current, [customer]: current[customer] + 1 }));
        setFlash((current) => ({ ...current, [customer]: true }));
        const existing = timers.current[customer];
        if (existing) window.clearTimeout(existing);
        timers.current[customer] = window.setTimeout(() => {
          setFlash((current) => ({ ...current, [customer]: false }));
        }, 3000);
      }
    }
    seen.current = new Map(state.requests.map((request) => [request.id, request.status]));
  }, [state]);

  useEffect(() => {
    const active = timers;
    return () => {
      for (const id of Object.values(active.current)) {
        if (id) window.clearTimeout(id);
      }
    };
  }, []);

  async function onAction(id: string, action: ReviewAction, body?: { reason: string }) {
    const response = await fetch(`/api/requests/${encodeURIComponent(id)}/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body ?? {}),
    });
    if (!response.ok) throw new Error("Could not update this ask.");
    await pull();
  }

  const requests = newestFirst(state.requests);

  return (
    <main className="relative grid h-screen grid-rows-[minmax(0,1.15fr)_minmax(0,1fr)_100px] overflow-hidden bg-[#05060a] font-sans text-white">
      <CustomerBoards boardUrl={boardUrl} flash={flash} reload={reload} />
      <div className="flex min-h-0 flex-col px-3 py-2">
        {state.currentCallTranscript ? (
          <p className="mb-2 truncate text-[22px]" data-floor-region="transcript">
            {state.currentCallTranscript}
          </p>
        ) : null}
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-3">
          <QueueList requests={requests} now={now} />
          <BuildPanel requests={requests.filter((r) => r.status === "building" || r.status === "checking" || r.status === "approved")} steps={state.steps} />
          <ReviewPanel requests={requests} onAction={onAction} />
        </div>
      </div>
      {error ? (
        <p className="absolute bottom-[100px] left-0 right-0 bg-red-950 px-4 py-1 text-[18px]">{error}</p>
      ) : null}
      <ScoreBar score={state.score} />
    </main>
  );
}
