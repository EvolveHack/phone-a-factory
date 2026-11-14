import type { Ending, FactoryRequest } from "@/contract/types";
import { customerName, endingBadge, newestFirst, secondsSince, STATUS_LABEL } from "./floor-copy";

export function QueueList({ requests, now }: { requests: FactoryRequest[]; now: number | null }) {
  const ordered = newestFirst(requests);
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl bg-[#12141a] p-4" data-floor-region="queue">
      <h2 className="shrink-0 pb-3 text-[28px] font-semibold">Queue</h2>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {ordered.length === 0 ? <p className="text-[22px]">No asks yet.</p> : null}
        {ordered.map((request) => (
          <QueueCard key={request.id} request={request} now={now} />
        ))}
      </div>
    </section>
  );
}

function QueueCard({ request, now }: { request: FactoryRequest; now: number | null }) {
  const since = now == null ? null : secondsSince(request.createdAt, now);
  if (request.status === "rejected") {
    return (
      <article
        data-request-id={request.id}
        data-status={request.status}
        className="rounded-lg px-1 py-1 text-[15px] leading-snug text-zinc-500"
      >
        <p>
          {customerName(request.customer)} · {request.callerName}, {request.callerRole}
          {since ? ` · ${since}` : ""}
        </p>
        <p>{request.ask}</p>
        <p>
          {STATUS_LABEL[request.status]}
          {request.statusReason ? ` · ${request.statusReason}` : ""}
        </p>
      </article>
    );
  }

  return (
    <article data-request-id={request.id} data-status={request.status} className="rounded-lg bg-white/10 px-3 py-2">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-[22px] font-semibold">{customerName(request.customer)}</h3>
        {since ? <p className="shrink-0 text-[18px] text-white/80">{since}</p> : null}
      </div>
      <p className="text-[18px] text-white/80">
        {request.callerName}, {request.callerRole}
      </p>
      <p className="mt-1 text-[22px] font-semibold leading-snug">{request.ask}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {request.rule ? (
          <span className={badgeClass(request.rule.ending)}>{endingBadge(request.rule.ending, request.rule.approver)}</span>
        ) : null}
        <span className="text-[18px]">{STATUS_LABEL[request.status]}</span>
      </div>
      {request.rule?.reason ? <p className="mt-1 text-[18px] leading-snug text-white/85">{request.rule.reason}</p> : null}
      {request.statusReason ? <p className="mt-1 text-[18px] leading-snug">{request.statusReason}</p> : null}
    </article>
  );
}

function badgeClass(ending: Ending): string {
  const base = "rounded-full px-3 py-1 text-[18px] font-semibold text-black";
  return ending === "goes_live" ? `${base} bg-emerald-400` : `${base} bg-amber-300`;
}
