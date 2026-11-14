import type { FactoryRequest } from "@/contract/types";
import { reachedIndex, STATIONS, stationOf } from "./stations";

const ACCENT = "var(--accent)";
const GATE = "var(--gate)";
const LIVE = "var(--live)";
const FAINT = "color-mix(in srgb, var(--fg) 14%, transparent)";

/** One ask's trip down the line: six stops, the current one pulsing. Only the large one shows the stop names. A change that goes live on its own skips the Gate. */
export function Tracker({ request, large = false }: { request: FactoryRequest; large?: boolean }) {
  const onLine = stationOf(request) !== null;
  const at = reachedIndex(request);
  const isLive = request.status === "live";
  const skipsGate = request.rule?.ending === "goes_live";
  const dot = large ? 20 : 12;

  return (
    <ol className="grid grid-cols-6" aria-label="Progress">
      {STATIONS.map((station, index) => {
        const skipped = station.id === "gate" && skipsGate;
        const done = index < at || (isLive && index === at);
        const current = index === at && !isLive;
        const tone = !onLine ? "color-mix(in srgb, var(--fg) 35%, transparent)" : isLive ? LIVE : station.id === "gate" && current ? GATE : ACCENT;
        const reached = done || current;
        return (
          <li key={station.id} className="relative flex flex-col items-center">
            {index > 0 ? (
              <span
                aria-hidden
                className="absolute right-1/2 w-full"
                style={{ top: dot / 2 - 1, height: 2, background: reached ? tone : FAINT }}
              />
            ) : null}
            <span className="relative z-10 grid place-items-center" style={{ width: dot, height: dot }}>
              {current && onLine ? (
                <span className="absolute inset-0 animate-ping rounded-full" style={{ background: tone, opacity: 0.5 }} aria-hidden />
              ) : null}
              <span
                className="relative block h-full w-full rounded-full"
                style={
                  skipped
                    ? { background: large ? "var(--panel)" : "var(--panel-2)", border: `2px dashed ${reached ? tone : "color-mix(in srgb, var(--fg) 30%, transparent)"}` }
                    : { background: reached ? tone : "var(--line)" }
                }
              />
            </span>
            <span className={large ? `mt-2 text-[15px] font-medium ${current ? "text-fg" : reached ? "text-fg/70" : "text-fg/35"}` : "sr-only"}>
              {station.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
