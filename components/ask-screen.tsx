"use client";

import Link from "next/link";
import { useState } from "react";
import type { Facts, FactoryRequest, StateSnapshot } from "@/contract/types";
import { customerInfo, productOf } from "@/contract/products";
import { FACT_LABEL, formatCallToLive, secondsSince, statusLine, STEP_LABEL, STEP_MARK, visibleSteps } from "./floor-copy";
import { Shell } from "./shell";
import { customerColor, stationOf } from "./stations";
import { Tracker } from "./tracker";
import { useFactory, type Act } from "./use-factory";

/** One ask from call to live: where it is, the rule that picked the path, what the agent changed, and the buttons a person needs. */
export function AskScreen({ initial, id }: { initial: StateSnapshot; id: string }) {
  const { state, error, now, act } = useFactory(initial);
  const request = state.requests.find((r) => r.id === id);

  if (!request) {
    return (
      <Shell error={error}>
        <p className="text-[17px] text-fg/60">This ask is no longer on the floor.</p>
        <Link href="/" className="text-[15px] font-semibold underline underline-offset-4">
          Back to the floor
        </Link>
      </Shell>
    );
  }

  const product = productOf(request.customer);
  const customer = customerInfo(request.customer);
  const color = customerColor(request.customer);
  const station = stationOf(request);
  const steps = visibleSteps(state.steps, request.id);
  const times = request.statusTimes;
  const callToLive =
    times.live && times.received ? formatCallToLive(Math.round((Date.parse(times.live) - Date.parse(times.received)) / 1000)) : null;

  return (
    <Shell error={error}>
      <div className="min-h-0 flex-1 space-y-7 overflow-y-auto pr-1">
        <div>
          <Link href="/" className="text-[14px] font-semibold text-fg/55 hover:text-fg">
            ← All asks
          </Link>
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.12em]">
            <span style={{ color }}>{customer.name}</span>
            <span className="text-fg/45"> · {product.name} by {product.vendor}</span>
          </p>
          <h1 className="mt-2 max-w-[1000px] font-[family-name:var(--font-display)] text-[30px] font-medium leading-tight tracking-[-0.02em]">
            {request.ask}
          </h1>
          <p className="mt-2.5 text-[14px] text-fg/55">
            {request.callerName}, {request.callerRole}
            {now == null ? "" : ` · called ${secondsSince(request.createdAt, now)}`}
            {callToLive ? ` · ${callToLive} from call to live` : ""}
          </p>
        </div>

        <section className="rounded-2xl bg-panel px-8 py-7 ring-1 ring-line">
          <Tracker request={request} large />
          <p className="mt-6 text-center text-[16px] font-medium">{statusLine(request, state.steps, state.requests)}</p>
          {request.statusReason ? <p className="mx-auto mt-1 max-w-[760px] text-center text-[14px] text-fg/60">{request.statusReason}</p> : null}
          {request.rule ? (
            <p className="mx-auto mt-1 max-w-[760px] text-center text-[14px] text-fg/60">
              <Link href="/rules" className="font-semibold hover:text-fg">
                {request.rule.rule}
              </Link>
              {` · ${request.rule.reason}`}
            </p>
          ) : null}
        </section>

        <div className="grid grid-cols-[minmax(0,8fr)_minmax(0,4fr)] items-start gap-7">
          <Panel title={`The change in ${product.name}`}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                {station === "live" ? (
                  <Out href={`${product.prodUrl}${customer.path}`} strong>
                    Open {customer.name}&apos;s {product.name}
                  </Out>
                ) : null}
                {request.previewUrl && station !== "live" ? <Out href={request.previewUrl}>Open the preview</Out> : null}
                {request.pullRequestUrl ? <Out href={request.pullRequestUrl}>Open the pull request</Out> : null}
                <p className="ml-2 text-[14px] text-fg/55">Only {customer.name} changes.</p>
              </div>
              <Actions request={request} act={act} />
            </div>
            <Shots key={request.screenshotAfterUrl ?? "none"} before={request.screenshotBeforeUrl} after={request.screenshotAfterUrl} />
          </Panel>

          <div className="space-y-7">
            {request.classification ? (
              <Panel title="Done when">
                <ul className="space-y-1.5 text-[14px] text-fg/80">
                  {request.classification.doneWhen.map((line) => (
                    <li key={line}>✓ {line}</li>
                  ))}
                </ul>
                <details className="mt-5 border-t border-fg/10 pt-4">
                  <summary className="cursor-pointer text-[14px] font-semibold text-fg/55 hover:text-fg">What the call said</summary>
                  <FactList facts={request.classification.facts} />
                </details>
              </Panel>
            ) : null}

            {steps.length > 0 ? (
              <Panel title="Checks">
                <ul className="space-y-1.5">
                  {steps.map((step) => (
                    <li key={step.step} className="flex items-baseline gap-3 text-[15px]">
                      <span
                        className={`w-16 shrink-0 text-[13px] font-semibold ${step.status === "passed" ? "text-live" : step.status === "failed" ? "text-accent" : "text-gate"}`}
                      >
                        {STEP_MARK[step.status]}
                      </span>
                      <span className="text-fg/85">{STEP_LABEL[step.step]}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            ) : null}
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-panel-2 p-7 ring-1 ring-line">
      <h2 className="mb-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-fg/45">{title}</h2>
      {children}
    </section>
  );
}

function Out({ href, strong = false, children }: { href: string; strong?: boolean; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`flex h-10 items-center rounded-lg px-4 text-[15px] font-semibold ${strong ? "bg-fg text-ink" : "bg-fg/10 hover:bg-fg/15"}`}
    >
      {children}
    </a>
  );
}

/** What the factory heard on the call. Facts that sent the ask down its path lead, each with the caller's own words. */
function FactList({ facts }: { facts: Facts }) {
  const keys = Object.keys(FACT_LABEL) as (keyof Facts)[];
  return (
    <ul className="mt-3 space-y-2">
      {keys.map((key) => {
        const fact = facts[key];
        if (!fact) return null; // Asks taken before a fact existed do not have it.
        const hit = fact.value !== false;
        return (
          <li key={key} className={`flex items-baseline gap-3 text-[14px] ${hit ? "text-fg" : "text-fg/35"}`}>
            <span className="w-16 shrink-0 font-semibold">{fact.value === true ? "Yes" : fact.value === false ? "No" : "Unknown"}</span>
            <span>
              {FACT_LABEL[key]}
              {fact.quote ? <span className="text-fg/55"> · “{fact.quote}”</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Shots({ before, after }: { before: string | null; after: string | null }) {
  const [show, setShow] = useState<"before" | "after">("after");
  const src = show === "after" ? (after ?? before) : (before ?? after);
  if (!src) return <p className="mt-4 rounded-xl bg-well/40 px-4 py-8 text-center text-[14px] text-fg/35">No screenshot yet.</p>;
  return (
    <div className="mt-6">
      {before && after ? (
        <div className="mb-2 inline-flex gap-1 rounded-full bg-well/50 p-1" role="group" aria-label="Screenshot">
          {(["before", "after"] as const).map((which) => (
            <button
              key={which}
              type="button"
              aria-pressed={show === which}
              onClick={() => setShow(which)}
              className={`rounded-full px-4 py-1 text-[13px] font-semibold ${show === which ? "bg-fg text-ink" : "text-fg/60"}`}
            >
              {which === "before" ? "Before" : "After"}
            </button>
          ))}
        </div>
      ) : null}
      {after && !before ? <p className="mb-2 text-[13px] text-fg/50">The page looks the same before and after this change.</p> : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={show === "after" ? "The product after the change" : "The product before the change"} className="w-full rounded-xl bg-well ring-1 ring-fg/10" />
    </div>
  );
}

function Actions({ request, act }: { request: FactoryRequest; act: Act }) {
  const [reason, setReason] = useState("");
  const [declining, setDeclining] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const station = stationOf(request);
  const product = productOf(request.customer);

  async function send(action: Parameters<Act>[1], done?: string) {
    setBusy(action);
    setNote(null);
    try {
      await act(request.id, action, action === "decline" ? { reason: reason.trim() || "Declined." } : undefined);
      if (done) setNote(done);
    } catch {
      setNote("Could not update this ask.");
    } finally {
      setBusy(null);
    }
  }

  const quiet = "h-10 rounded-lg bg-fg/10 px-4 text-[15px] font-semibold hover:bg-fg/15 disabled:opacity-50";
  let buttons: React.ReactNode = null;

  if (request.status === "waiting_for_approval") {
    buttons = declining ? (
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send("decline");
        }}
      >
        <input
          autoFocus
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Reason"
          aria-label="Reason"
          disabled={busy !== null}
          className="h-10 w-72 rounded-lg bg-well px-3 text-[15px] text-fg ring-1 ring-fg/15 outline-none placeholder:text-fg/40"
        />
        <button type="submit" data-action="decline" disabled={busy !== null} className={quiet}>
          Decline
        </button>
        <button type="button" disabled={busy !== null} onClick={() => setDeclining(false)} className={quiet}>
          Cancel
        </button>
      </form>
    ) : (
      <>
        {request.pullRequestUrl ? (
          <button
            type="button"
            data-action="approve"
            disabled={busy !== null}
            onClick={() => void send("approve")}
            className="h-10 rounded-lg bg-live px-6 text-[15px] font-semibold text-ink disabled:opacity-50"
          >
            Approve
          </button>
        ) : null}
        <button type="button" disabled={busy !== null} onClick={() => setDeclining(true)} className={quiet}>
          Decline
        </button>
      </>
    );
  } else if (station === "live") {
    buttons = (
      <>
        <button
          type="button"
          data-action="rollout"
          disabled={busy !== null}
          title={`Make this available to every ${product.name} customer. The product owner reviews it first.`}
          onClick={() => void send("rollout", "Sent to the product owner.")}
          className={quiet}
        >
          {busy === "rollout" ? "Sending" : "Roll out to everyone"}
        </button>
        <button type="button" data-action="undo" disabled={busy !== null} onClick={() => void send("undo")} className={quiet}>
          {busy === "undo" ? "Undoing" : "Undo"}
        </button>
      </>
    );
  } else if (station === "build" || station === "checks") {
    buttons = (
      <button type="button" data-action="veto" disabled={busy !== null} onClick={() => void send("veto")} className={quiet}>
        Stop this build
      </button>
    );
  }

  if (!buttons && !note) return null;
  return (
    <div>
      <div className="flex flex-wrap justify-end gap-2">{buttons}</div>
      {note ? <p className="mt-2 text-right text-[14px] text-fg/70">{note}</p> : null}
    </div>
  );
}
