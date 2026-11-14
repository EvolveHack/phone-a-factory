import type { BuildStep, FactoryRequest } from "@/contract/types";
import { customerName, STATUS_LABEL, STEP_LABEL, STEP_MARK, visibleSteps } from "./floor-copy";

export function BuildPanel({ request, steps }: { request: FactoryRequest | null; steps: BuildStep[] }) {
  const shown = request ? visibleSteps(steps, request.id) : [];
  return (
    <section className="flex h-full min-h-0 flex-col rounded-xl bg-[#12141a] p-4" data-floor-region="build">
      <h2 className="shrink-0 pb-3 text-[28px] font-semibold">Current build</h2>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {request == null ? <p className="text-[22px]">No build is running.</p> : null}
        {request ? (
          <>
            <p className="text-[20px] text-white/80">
              {customerName(request.customer)} · {STATUS_LABEL[request.status]}
            </p>
            <p className="mt-1 text-[24px] font-semibold leading-snug">{request.ask}</p>
            {shown.length === 0 ? <p className="mt-4 text-[20px]">The build has not reported a step yet.</p> : null}
            {shown.length > 0 ? (
              <ol className="mt-4 flex flex-col gap-3">
                {shown.map((step) => (
                  <li key={step.step} className="flex gap-3">
                    <span className={`w-24 shrink-0 text-[18px] font-semibold ${markClass(step.status)}`}>
                      {STEP_MARK[step.status]}
                    </span>
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
          </>
        ) : null}
      </div>
    </section>
  );
}

function markClass(status: BuildStep["status"]): string {
  if (status === "passed") return "text-emerald-300";
  if (status === "failed") return "text-red-400";
  return "animate-pulse text-white";
}
