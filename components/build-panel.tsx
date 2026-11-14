import type { BuildStep, FactoryRequest } from "@/contract/types";
import { customerName, STEP_LABEL, STEP_MARK, visibleSteps } from "./floor-copy";

/** Shows every build that is running (up to three at once). One build gets the full step list; several get one line each. */
export function BuildPanel({ requests, steps }: { requests: FactoryRequest[]; steps: BuildStep[] }) {
  const title = requests.length > 1 ? `Building now (${requests.length})` : "Current build";
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl bg-[#12141a] p-4" data-floor-region="build">
      <h2 className="shrink-0 pb-3 text-[28px] font-semibold">{title}</h2>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
        {requests.length === 0 ? <p className="text-[22px]">No build is running.</p> : null}
        {requests.map((request) => (
          <BuildCard key={request.id} request={request} steps={visibleSteps(steps, request.id)} compact={requests.length > 1} />
        ))}
      </div>
    </section>
  );
}

function BuildCard({ request, steps, compact }: { request: FactoryRequest; steps: BuildStep[]; compact: boolean }) {
  const last = steps[steps.length - 1];
  return (
    <article className={compact ? "rounded-lg bg-white/10 px-3 py-2" : ""}>
      <p className="text-[20px] text-white/80">{customerName(request.customer)}</p>
      <p className="mt-1 text-[22px] font-semibold leading-snug">{request.ask}</p>
      {steps.length === 0 ? <p className="mt-2 text-[18px]">Starting the sandbox.</p> : null}
      {compact && last ? (
        <p className="mt-2 flex gap-3 text-[18px]">
          <span className={`font-semibold ${markClass(last.status)}`}>{STEP_MARK[last.status]}</span>
          <span className="font-semibold">{STEP_LABEL[last.step]}</span>
          <span className="text-white/60">· step {steps.length} of 7</span>
        </p>
      ) : null}
      {!compact && steps.length > 0 ? (
        <ol className="mt-4 flex flex-col gap-3">
          {steps.map((step) => (
            <li key={step.step} className="flex gap-3">
              <span className={`w-24 shrink-0 text-[18px] font-semibold ${markClass(step.status)}`}>{STEP_MARK[step.status]}</span>
              <div className="min-w-0">
                <p className="text-[20px] font-semibold">{STEP_LABEL[step.step]}</p>
                {step.log ? (
                  <p className="text-[18px] text-white/80" style={{ overflowWrap: "anywhere" }}>
                    {step.log}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      ) : null}
    </article>
  );
}

function markClass(status: BuildStep["status"]): string {
  if (status === "passed") return "text-emerald-300";
  if (status === "failed") return "text-red-400";
  return "animate-pulse text-white";
}
