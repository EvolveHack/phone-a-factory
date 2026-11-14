// Posts each scripted ask to POST /api/requests/test and scores the ending and rule.
//
// d12, "show the rate column in bold", is R5. Bold changes how that column looks.
// It does not change the rate, so it is not a money change.
// d25, "everybody, not just us", is R4. The casual phrase means every customer.
// d27 to d30 accept rejected or needs_person. The test prompt allows either.
// h, o, c, s cases cover Helpdesk Agent, Order Flows, Cold Chain Monitor, and Shopping App:
// one goes-live feature, one gated ask, and one tricky ask each. accept_rules lists rules that both fit.

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

type CallCase = {
  id: string;
  name: string;
  company: string;
  role: string;
  ask: string;
  caller_words: string;
  expected_ending: string;
  expected_rule: string | null;
  accept_rejected_or_needs_person?: boolean;
  /** Any of these rules counts, with the expected ending. For asks where two rules both fit. */
  accept_rules?: string[];
  why?: string;
  suggested_fix: string;
};

type Reply = {
  requestId?: string | null;
  ending?: string | null;
  rule?: string | null;
  reason?: string | null;
  error?: string;
};

const base = process.argv[2];
if (!base) {
  console.error("Usage: node --experimental-strip-types tests/calls/run.ts <base-url>");
  process.exit(1);
}

const casesPath = join(dirname(fileURLToPath(import.meta.url)), "cases.json");
const cases = JSON.parse(readFileSync(casesPath, "utf8")) as CallCase[];

function accepted(item: CallCase, body: Reply): boolean {
  const ending = body.ending ?? null;
  if (item.accept_rejected_or_needs_person) {
    return ending === "rejected" || ending === "needs_person";
  }
  const rules = item.accept_rules ?? [item.expected_rule];
  return ending === item.expected_ending && rules.includes(body.rule ?? null);
}

async function postCase(item: CallCase): Promise<{ status: number; body: Reply }> {
  const response = await fetch(new URL("/api/requests/test", base), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: item.name,
      company: item.company,
      role: item.role,
      ask: item.ask,
      caller_words: item.caller_words,
    }),
    signal: AbortSignal.timeout(45_000),
  });
  let body: Reply = {};
  try {
    body = (await response.json()) as Reply;
  } catch {
    body = { error: "Response was not JSON." };
  }
  return { status: response.status, body };
}

async function postWithRetry(item: CallCase): Promise<{ status: number; body: Reply }> {
  let last = await postCase(item);
  for (let attempt = 1; attempt < 3 && (last.status >= 500 || last.status === 0); attempt += 1) {
    last = await postCase(item);
  }
  return last;
}

const misses: string[] = [];
let passed = 0;

console.log("id   result  ending         rule      ask");
for (const item of cases) {
  let result: { status: number; body: Reply };
  try {
    result = await postWithRetry(item);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed.";
    console.log(`${item.id}  FAIL    request failed`);
    misses.push(`${item.id}  ${item.ask}\n  error: ${message}\n  fix: ${item.suggested_fix}`);
    continue;
  }

  if (result.body.error === "This route is off in production.") {
    console.error("The test route is off in production. This is not a classification miss. Stop.");
    process.exit(2);
  }

  const ending = result.body.ending ?? "-";
  const rule = result.body.rule ?? "-";
  const ok = result.status === 200 && accepted(item, result.body);
  if (ok) passed += 1;
  console.log(
    `${item.id}  ${ok ? "ok   " : "MISS "}  ${ending.padEnd(13)}  ${String(rule).padEnd(8)}  ${item.ask}`,
  );
  if (!ok) {
    const lines = [
      `${item.id}  ${item.ask}`,
      `  got ${ending} ${rule}; expected ${item.expected_ending} ${item.expected_rule ?? "(none)"}`,
      `  reason: ${result.body.reason ?? result.body.error ?? `HTTP ${result.status}`}`,
    ];
    if (item.why) lines.push(`  why: ${item.why}`);
    lines.push(`  fix: ${item.suggested_fix}`);
    misses.push(lines.join("\n"));
  }
}

console.log(`\n${passed} of ${cases.length}`);
if (misses.length > 0) {
  console.log("\nMisses");
  for (const miss of misses) console.log(`\n${miss}`);
}
