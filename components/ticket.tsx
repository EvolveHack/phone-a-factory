"use client";

import { motion } from "motion/react";
import { useState } from "react";
import type { BuildStep, FactoryRequest } from "@/contract/types";
import { customerInfo, productOf } from "@/contract/products";
import { endingBadge, secondsSince, STEP_LABEL, visibleSteps } from "./floor-copy";
import type { StationId } from "./stations";
import { customerColor } from "./stations";

export type TicketAction = "approve" | "decline" | "undo" | "veto" | "rollout";
type OnAction = (id: string, action: TicketAction, body?: { reason: string }) => Promise<void>;

const TOTAL_STEPS = 7;

export function Ticket({
  request,
  station,
  steps,
  now,
  wait,
  onAction,
}: {
  request: FactoryRequest;
  station: StationId;
  steps: BuildStep[];
  now: number | null;
  wait: string | null;
  onAction: OnAction;
}) {
  const color = customerColor(request.customer);
  const shown = visibleSteps(steps, request.id);
  const last = shown[shown.length - 1];
  const since = now == null ? "" : secondsSince(request.createdAt, now);
  const goesLive = request.rule?.ending === "goes_live";

  return (
    <motion.article
      layoutId={request.id}
      layout
      initial={{ opacity: 0, y: -36, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.25 } }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      data-request-id={request.id}
      data-status={request.status}
      className={`relative overflow-hidden rounded-2xl bg-[#1c1c1c] p-3.5 ring-1 ring-[#2a2a2a] ${station === "gate" ? "gate-hold" : ""}`}
    >
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} aria-hidden />
      {station === "live" ? <LiveBurst /> : null}

      <header className="flex items-baseline justify-between gap-2 pl-1.5">
        <p className="truncate text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">{productOf(request.customer).name}</p>
        <p className="shrink-0 text-[13px] text-white/50">{since}</p>
      </header>
      <p className="truncate pl-1.5 text-[13px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
        {customerInfo(request.customer).name}
      </p>

      <p className="mt-1.5 line-clamp-3 pl-1.5 font-[family-name:var(--font-display)] text-[19px] leading-snug text-white">
        {request.ask}
      </p>
      <p className="mt-1 truncate pl-1.5 text-[13px] text-white/50">
        {request.callerName}, {request.callerRole}
      </p>

      {request.rule && station !== "call" ? (
        <p className="mt-2.5 pl-1.5">
          <span
            className={`inline-block rounded-full px-2.5 py-1 text-[12px] font-semibold ${goesLive ? "bg-[#3ddc97]/15 text-[#3ddc97]" : "bg-[#ffb020]/15 text-[#ffb020]"}`}
          >
            {request.rule.rule} · {endingBadge(request.rule.ending, request.rule.approver)}
          </span>
        </p>
      ) : null}

      {station === "call" ? <Working label="Reading the ask" /> : null}
      {station === "rules" && wait ? <p className="mt-2 pl-1.5 text-[14px] font-medium text-[#ffb020]">{wait}</p> : null}
      {station === "build" ? <Working label="An agent is editing the board" /> : null}
      {station === "checks" ? (
        <div className="mt-2.5 pl-1.5">
          <p className="text-[14px] text-white/80">{last ? STEP_LABEL[last.step] : "Starting checks"}</p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-[#ff3d14]"
              animate={{ width: `${Math.max(8, (shown.length / TOTAL_STEPS) * 100)}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
      ) : null}
      {station === "gate" ? <GateActions request={request} onAction={onAction} /> : null}
      {station === "live" ? <LiveFooter request={request} onAction={onAction} /> : null}
      {station === "build" || station === "checks" ? (
        <VetoButton id={request.id} onAction={onAction} />
      ) : null}
    </motion.article>
  );
}

function Working({ label }: { label: string }) {
  return (
    <div className="mt-2.5 pl-1.5">
      <p className="text-[14px] text-white/80">{label}</p>
      <div className="sweep mt-1.5 h-1.5 rounded-full bg-white/10" />
    </div>
  );
}

function LiveBurst() {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-2xl"
      initial={{ boxShadow: "inset 0 0 0 3px rgba(61,220,151,0.95)", backgroundColor: "rgba(61,220,151,0.18)" }}
      animate={{ boxShadow: "inset 0 0 0 1px rgba(61,220,151,0.35)", backgroundColor: "rgba(61,220,151,0)" }}
      transition={{ duration: 1.6, ease: "easeOut" }}
    />
  );
}

function GateActions({ request, onAction }: { request: FactoryRequest; onAction: OnAction }) {
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const shot = request.screenshotAfterUrl;

  async function send(action: "approve" | "decline") {
    setPending(true);
    setError(false);
    try {
      await onAction(request.id, action, action === "decline" ? { reason: reason.trim() || "Declined." } : undefined);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="mt-2.5 space-y-2 pl-1.5">
      {request.statusReason ? <p className="line-clamp-3 text-[13px] leading-snug text-white/70">{request.statusReason}</p> : null}
      {shot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={shot} alt="The change, before it goes live" className="h-20 w-full rounded-lg bg-black object-cover object-top" />
      ) : null}
      <input
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Reason, if you decline"
        aria-label="Reason"
        disabled={pending}
        className="h-9 w-full rounded-lg bg-black px-3 text-[14px] text-white ring-1 ring-white/15 outline-none placeholder:text-white/40"
      />
      <div className="flex gap-2">
        {request.pullRequestUrl ? (
          <button
            type="button"
            data-action="approve"
            disabled={pending}
            onClick={() => void send("approve")}
            className="h-9 flex-1 rounded-lg bg-[#3ddc97] text-[15px] font-semibold text-black disabled:opacity-50"
          >
            Approve
          </button>
        ) : null}
        <button
          type="button"
          data-action="decline"
          disabled={pending}
          onClick={() => void send("decline")}
          className="h-9 flex-1 rounded-lg bg-white/10 text-[15px] font-semibold disabled:opacity-50"
        >
          Decline
        </button>
      </div>
      {error ? <p className="text-[13px] text-[#ff8a70]">Could not update this ask.</p> : null}
    </div>
  );
}

function LiveFooter({ request, onAction }: { request: FactoryRequest; onAction: OnAction }) {
  const [pending, setPending] = useState(false);
  const [rollout, setRollout] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const product = productOf(request.customer);
  const href = `${product.prodUrl}${customerInfo(request.customer).path}`;
  return (
    <div className="mt-2.5 space-y-2 pl-1.5">
      <p className="text-[13px] font-medium text-[#3ddc97]">Other customers unchanged</p>
      {request.screenshotAfterUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={request.screenshotAfterUrl} alt="The change, live" className="h-20 w-full rounded-lg bg-black object-cover object-top" />
      ) : null}
      <div className="flex gap-2">
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="flex h-9 flex-1 items-center justify-center rounded-lg bg-white text-[15px] font-semibold text-black"
        >
          Open board
        </a>
        <button
          type="button"
          data-action="undo"
          disabled={pending}
          onClick={() => {
            setPending(true);
            void onAction(request.id, "undo").finally(() => setPending(false));
          }}
          className="h-9 rounded-lg bg-white/10 px-3 text-[15px] font-semibold disabled:opacity-50"
        >
          {pending ? "Undoing" : "Undo"}
        </button>
      </div>
      <button
        type="button"
        data-action="rollout"
        disabled={rollout === "sending" || rollout === "sent"}
        title={`Make this available to every ${product.name} customer. The product owner reviews it first.`}
        onClick={() => {
          setRollout("sending");
          onAction(request.id, "rollout").then(
            () => setRollout("sent"),
            () => setRollout("failed"),
          );
        }}
        className="h-9 w-full rounded-lg bg-white/10 text-[15px] font-semibold disabled:opacity-60"
      >
        {rollout === "sent" ? "Sent to the product owner" : rollout === "sending" ? "Sending" : "Roll out to everyone"}
      </button>
      {rollout === "failed" ? <p className="text-[13px] text-[#ff8a70]">Could not start the rollout.</p> : null}
    </div>
  );
}

function VetoButton({ id, onAction }: { id: string; onAction: OnAction }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      type="button"
      data-action="veto"
      disabled={pending}
      onClick={() => {
        setPending(true);
        void onAction(id, "veto").finally(() => setPending(false));
      }}
      className="mt-2 ml-1.5 text-[13px] font-medium text-white/50 underline-offset-2 hover:underline disabled:opacity-50"
    >
      Stop this build
    </button>
  );
}
