"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StateSnapshot } from "@/contract/types";

export type AskAction = "approve" | "decline" | "undo" | "veto" | "rollout";
export type Act = (id: string, action: AskAction, body?: { reason: string }) => Promise<void>;

/** The current time, refreshed each second. Null until the page is in the browser. */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** Live factory state for every page: polls /api/state each second and sends the buttons' actions. */
export function useFactory(initial: StateSnapshot) {
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

  const act: Act = useCallback(
    async (id, action, body) => {
      const response = await fetch(`/api/requests/${encodeURIComponent(id)}/${action}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      if (!response.ok) throw new Error("Could not update this ask.");
      await pull();
    },
    [pull],
  );

  return { state, error, now, act };
}
