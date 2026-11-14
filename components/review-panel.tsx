import { useState } from "react";
import type { FactoryRequest } from "@/contract/types";
import { customerName, endingBadge, STATUS_LABEL } from "./floor-copy";

export type ReviewAction = "approve" | "decline" | "undo" | "veto";

export function ReviewPanel({
  requests,
  onAction,
}: {
  requests: FactoryRequest[];
  onAction: (id: string, action: ReviewAction, body?: { reason: string }) => Promise<void>;
}) {
  const waiting = requests.filter((request) => request.status === "waiting_for_approval");
  const building = requests.filter((request) => request.status === "building" || request.status === "checking");
  const live = requests.filter((request) => request.status === "live");
  const empty = waiting.length === 0 && building.length === 0 && live.length === 0;

  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl bg-[#12141a] p-4" data-floor-region="review">
      <h2 className="shrink-0 pb-3 text-[28px] font-semibold">Review</h2>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        {empty ? <p className="text-[22px]">No review is waiting.</p> : null}
        {waiting.length === 0 && !empty ? <p className="text-[22px]">No ask is waiting for approval.</p> : null}
        {waiting.map((request) => (
          <WaitingCard key={request.id} request={request} onAction={onAction} />
        ))}
      </div>
      {building.length + live.length > 0 ? (
        <div className="mt-2 max-h-[42%] shrink-0 space-y-2 overflow-y-auto">
          {building.map((request) => (
            <ActionStrip key={request.id} request={request} action="veto" button="Veto" tone="bg-red-500 text-white" onAction={onAction} />
          ))}
          {live.map((request) => (
            <ActionStrip key={request.id} request={request} action="undo" button="Undo" tone="bg-amber-300 text-black" onAction={onAction} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function WaitingCard({
  request,
  onAction,
}: {
  request: FactoryRequest;
  onAction: (id: string, action: ReviewAction, body?: { reason: string }) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<null | "approve" | "decline">(null);
  const [error, setError] = useState(false);

  async function send(action: "approve" | "decline") {
    setPending(action);
    setError(false);
    try {
      if (action === "decline") {
        await onAction(request.id, "decline", { reason: reason.trim() || "Declined." });
      } else {
        await onAction(request.id, "approve");
      }
    } catch {
      setError(true);
    } finally {
      setPending(null);
    }
  }

  return (
    <article data-request-id={request.id} data-status={request.status} className="flex min-h-0 flex-1 flex-col gap-2 rounded-lg bg-white/10 p-3">
      <div className="flex gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-[24px] font-semibold">{customerName(request.customer)}</h3>
            {request.rule ? <span className="text-[18px] font-semibold">{request.rule.rule}</span> : null}
          </div>
          <p className="mt-1 text-[22px] leading-snug">{request.callerWords}</p>
        </div>
        <div className="h-24 w-40 shrink-0">
          <Preview request={request} />
        </div>
      </div>
      {request.rule ? (
        <p>
          <span className={request.rule.ending === "goes_live" ? "rounded-full bg-emerald-400 px-3 py-1 text-[18px] font-semibold text-black" : "rounded-full bg-amber-300 px-3 py-1 text-[18px] font-semibold text-black"}>
            {endingBadge(request.rule.ending, request.rule.approver)}
          </span>
        </p>
      ) : null}
      {request.rule?.reason ? <p className="text-[18px] leading-snug">{request.rule.reason}</p> : null}
      <div className="flex shrink-0 items-center gap-2">
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void send("decline");
            }
          }}
          placeholder="Reason"
          aria-label="Reason"
          spellCheck={false}
          disabled={pending != null}
          className="h-12 min-w-0 flex-1 rounded-lg border border-white/20 bg-black px-3 text-[18px] text-white outline-none placeholder:text-white/50"
        />
        <button
          type="button"
          data-action="approve"
          disabled={pending != null}
          onClick={() => void send("approve")}
          className="h-12 shrink-0 rounded-lg bg-emerald-400 px-4 text-[20px] font-semibold text-black disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          data-action="decline"
          disabled={pending != null}
          onClick={() => void send("decline")}
          className="h-12 shrink-0 rounded-lg bg-white/15 px-4 text-[20px] font-semibold disabled:opacity-50"
        >
          Decline
        </button>
      </div>
      {error ? <p className="text-[16px]">Could not update this ask.</p> : null}
    </article>
  );
}

function Preview({ request }: { request: FactoryRequest }) {
  const before = request.screenshotBeforeUrl;
  const after = request.screenshotAfterUrl;
  if (before || after) {
    return (
      <div className="grid grid-cols-2 gap-2">
        {before ? <Shot src={before} label="Before" /> : null}
        {after ? <Shot src={after} label="After" /> : null}
      </div>
    );
  }
  if (request.previewUrl) {
    return (
      <div className="flex h-full flex-col">
        <iframe title="Preview" src={request.previewUrl} className="min-h-0 w-full flex-1 rounded-md border-0 bg-black" />
        <a href={request.previewUrl} target="_blank" rel="noreferrer" className="truncate text-[14px] underline">
          Open the preview
        </a>
      </div>
    );
  }
  return <p className="text-[16px] text-white/70">No preview yet.</p>;
}

function Shot({ src, label }: { src: string; label: string }) {
  return (
    <figure>
      {/* External preview shots are not on a configured image host. */}
      <img src={src} alt={label} className="h-full max-h-28 w-full rounded-md bg-black object-contain" />
      <figcaption className="text-[14px] text-white/70">{label}</figcaption>
    </figure>
  );
}

function ActionStrip({
  request,
  action,
  button,
  tone,
  onAction,
}: {
  request: FactoryRequest;
  action: "undo" | "veto";
  button: string;
  tone: string;
  onAction: (id: string, action: ReviewAction, body?: { reason: string }) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div data-request-id={request.id} data-status={request.status} className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-1">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[18px] font-semibold">
          {customerName(request.customer)} · {STATUS_LABEL[request.status]}
        </p>
        <p className="truncate text-[16px] text-white/80">{request.ask}</p>
        {error ? <p className="text-[14px]">Could not update this ask.</p> : null}
      </div>
      <button
        type="button"
        data-action={action}
        disabled={pending}
        onClick={() => {
          setPending(true);
          setError(false);
          void onAction(request.id, action)
            .catch(() => setError(true))
            .finally(() => setPending(false));
        }}
        className={`h-10 shrink-0 rounded-lg px-4 text-[18px] font-semibold disabled:opacity-50 ${tone}`}
      >
        {button}
      </button>
    </div>
  );
}
