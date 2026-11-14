// CONTRACT-OWNED shared module. Only the owner edits this file. Every workstream reads and writes through it.
// Uses Postgres when DATABASE_URL is set; otherwise an in-memory store seeded with fixtures (local dev only).
import postgres from "postgres";
import { FIXTURE_REQUESTS, FIXTURE_STEPS } from "@/contract/fixtures";
import type { BuildStep, FactoryRequest, Score, StateSnapshot, Status } from "@/contract/types";

const sql = process.env.DATABASE_URL ? postgres(process.env.DATABASE_URL, { ssl: "require", max: 5 }) : null;

type Mem = { requests: Map<string, FactoryRequest>; steps: BuildStep[] };
const g = globalThis as unknown as { __pafMem?: Mem };
function mem(): Mem {
  if (!g.__pafMem) {
    g.__pafMem = {
      requests: new Map(FIXTURE_REQUESTS.map((r) => [r.id, structuredClone(r)])),
      steps: structuredClone(FIXTURE_STEPS),
    };
  }
  return g.__pafMem;
}

export function newRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function insertRequest(r: FactoryRequest): Promise<void> {
  if (!sql) {
    mem().requests.set(r.id, structuredClone(r));
    return;
  }
  await sql`insert into requests (id, created_at, customer, status, ending, data)
    values (${r.id}, ${r.createdAt}, ${r.customer}, ${r.status}, ${r.rule?.ending ?? null}, ${sql.json(r as never)})`;
}

export async function getRequest(id: string): Promise<FactoryRequest | null> {
  if (!sql) return structuredClone(mem().requests.get(id) ?? null);
  const rows = await sql<{ data: FactoryRequest }[]>`select data from requests where id = ${id}`;
  return rows[0]?.data ?? null;
}

/** Merge fields into a request. Use setStatus for status changes. */
export async function updateRequest(id: string, patch: Partial<FactoryRequest>): Promise<FactoryRequest> {
  const current = await getRequest(id);
  if (!current) throw new Error(`request ${id} not found`);
  const next: FactoryRequest = { ...current, ...patch, id };
  if (!sql) {
    mem().requests.set(id, structuredClone(next));
    return next;
  }
  await sql`update requests set status = ${next.status}, ending = ${next.rule?.ending ?? null},
    data = ${sql.json(next as never)} where id = ${id}`;
  return next;
}

export async function setStatus(id: string, status: Status, statusReason: string | null = null): Promise<FactoryRequest> {
  const current = await getRequest(id);
  if (!current) throw new Error(`request ${id} not found`);
  return updateRequest(id, {
    status,
    statusReason,
    statusTimes: { ...current.statusTimes, [status]: new Date().toISOString() },
  });
}

/** Next request for the builder: goes_live first, then oldest. */
export async function nextQueued(): Promise<FactoryRequest | null> {
  const all = await listRequests();
  const queued = all.filter((r) => r.status === "queued");
  queued.sort((a, b) => {
    const pa = a.rule?.ending === "goes_live" ? 0 : 1;
    const pb = b.rule?.ending === "goes_live" ? 0 : 1;
    return pa - pb || a.createdAt.localeCompare(b.createdAt);
  });
  return queued[0] ?? null;
}

/** How many builds may run at the same time. Merges still happen one at a time (see withMergeLock). */
export const MAX_PARALLEL_BUILDS = 3;

const ACTIVE_BUILD: Status[] = ["building", "checking", "approved"];

function queueSort(a: FactoryRequest, b: FactoryRequest): number {
  const pa = a.rule?.ending === "goes_live" ? 0 : 1;
  const pb = b.rule?.ending === "goes_live" ? 0 : 1;
  return pa - pb || a.createdAt.localeCompare(b.createdAt);
}

/** Atomically move the next queued request to "building" if fewer than `max` builds are running. */
export async function claimNextQueued(max = MAX_PARALLEL_BUILDS): Promise<FactoryRequest | null> {
  const pick = (all: FactoryRequest[]): FactoryRequest | null => {
    if (all.filter((r) => ACTIVE_BUILD.includes(r.status)).length >= max) return null;
    const queued = all.filter((r) => r.status === "queued").sort(queueSort);
    const next = queued[0];
    if (!next) return null;
    const at = new Date().toISOString();
    return { ...next, status: "building", statusReason: null, statusTimes: { ...next.statusTimes, building: at } };
  };
  if (!sql) {
    const next = pick([...mem().requests.values()]);
    if (next) mem().requests.set(next.id, structuredClone(next));
    return next;
  }
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(4201)`;
    const rows = await tx<{ data: FactoryRequest }[]>`
      select data from requests where status in ('queued', 'building', 'checking', 'approved')`;
    const next = pick(rows.map((r) => r.data));
    if (!next) return null;
    await tx`update requests set status = 'building', data = ${tx.json(next as never)} where id = ${next.id}`;
    return next;
  }) as Promise<FactoryRequest | null>;
}

const memLocks = new Map<string, Promise<unknown>>();

/** Run `fn` while no other merge to the same repo runs, so changes reach that repo's main and production one at a time. */
export async function withMergeLock<T>(repo: string, fn: () => Promise<T>): Promise<T> {
  if (!sql) {
    const run = (memLocks.get(repo) ?? Promise.resolve()).then(fn, fn);
    memLocks.set(repo, run.catch(() => undefined));
    return run;
  }
  return sql.begin(async (tx) => {
    await tx`select pg_advisory_xact_lock(4202, hashtext(${repo}))`;
    return fn();
  }) as Promise<T>;
}

export async function isBuilderBusy(): Promise<boolean> {
  const all = await listRequests();
  return all.some((r) => r.status === "building" || r.status === "checking" || r.status === "approved");
}

export async function addStep(step: Omit<BuildStep, "at"> & { at?: string }): Promise<void> {
  const s: BuildStep = { ...step, at: step.at ?? new Date().toISOString() };
  if (!sql) {
    mem().steps.push(s);
    return;
  }
  await sql`insert into build_steps (request_id, step, status, at, log) values (${s.requestId}, ${s.step}, ${s.status}, ${s.at}, ${s.log})`;
}

export async function listRequests(): Promise<FactoryRequest[]> {
  if (!sql) return [...mem().requests.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((r) => structuredClone(r));
  const rows = await sql<{ data: FactoryRequest }[]>`select data from requests order by created_at desc limit 200`;
  return rows.map((r) => r.data);
}

async function listRecentSteps(): Promise<BuildStep[]> {
  if (!sql) return structuredClone(mem().steps);
  const rows = await sql<{ request_id: string; step: BuildStep["step"]; status: BuildStep["status"]; at: Date; log: string | null }[]>`
    select request_id, step, status, at, log from build_steps where at > now() - interval '1 hour' order by at asc`;
  return rows.map((r) => ({ requestId: r.request_id, step: r.step, status: r.status, at: new Date(r.at).toISOString(), log: r.log }));
}

export function computeScore(requests: FactoryRequest[]): Score {
  const counted = requests.filter((r) => r.status !== "rejected");
  const durations = counted
    .filter((r) => r.statusTimes.live && r.statusTimes.received)
    .map((r) => (Date.parse(r.statusTimes.live!) - Date.parse(r.statusTimes.received!)) / 1000)
    .sort((a, b) => a - b);
  return {
    callsTaken: counted.length,
    wentLiveOnTheirOwn: counted.filter((r) => r.rule?.ending === "goes_live" && r.status === "live").length,
    sentToAPerson: counted.filter((r) => r.rule?.ending === "needs_person").length,
    medianSecondsCallToLive: durations.length ? Math.round(durations[Math.floor(durations.length / 2)]) : null,
  };
}

export async function getState(): Promise<StateSnapshot> {
  const [requests, steps] = await Promise.all([listRequests(), listRecentSteps()]);
  return { requests, steps, score: computeScore(requests), currentCallTranscript: null };
}
