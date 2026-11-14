import { after } from "next/server";
import { CUSTOMERS } from "@/contract/view";
import type { FactoryRequest } from "@/contract/types";
import { createWorkOrder } from "@/lib/factory8090";
import { insertRequest, newRequestId, setStatus, updateRequest } from "@/lib/store";
import { applyRules } from "@/lib/rules/apply";
import { classifyRequest } from "./classify";
import { customerFromCompany } from "./customer";

export const SAY_GOES_LIVE = "This only changes your board, so it can go live now. Watch the screen.";
export const SAY_REJECTED = "I can't take that request.";
export const SAY_WHICH_COMPANY =
  "Which company are you calling from, Mesa Lane Freight or Pinecrest Logistics?";

type SubmitBody = {
  name: string;
  company: string;
  role: string;
  ask: string;
  caller_words: string;
  caller_phone: string | null;
};

export async function submitRequest(request: Request, options: { requireSecret: boolean }): Promise<Response> {
  if (options.requireSecret && !secretOk(request.headers.get("x-tool-secret"))) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "Send JSON." }, { status: 400 });
  }
  const body = parseBody(raw);
  if (!body) {
    return Response.json(
      { error: "Name, company, role, ask, and caller words are required." },
      { status: 400 },
    );
  }

  const customer = customerFromCompany(body.company);
  if (!customer) {
    return Response.json({
      requestId: null,
      ending: null,
      rule: null,
      reason: "The company is not Mesa Lane Freight or Pinecrest Logistics.",
      say_to_caller: SAY_WHICH_COMPANY,
    });
  }

  const id = newRequestId();
  const now = new Date().toISOString();
  const initial: FactoryRequest = {
    id,
    createdAt: now,
    customer,
    callerName: body.name,
    callerRole: body.role,
    callerPhone: body.caller_phone,
    callerWords: body.caller_words,
    ask: body.ask,
    classification: null,
    rule: null,
    status: "received",
    statusReason: null,
    previewUrl: null,
    screenshotBeforeUrl: null,
    screenshotAfterUrl: null,
    pullRequestUrl: null,
    workOrder8090Id: null,
    statusTimes: { received: now },
  };
  await insertRequest(initial);

  let classification;
  try {
    classification = await classifyRequest({
      ask: body.ask,
      callerWords: body.caller_words,
      customerName: CUSTOMERS[customer].name,
    });
  } catch (err) {
    console.error("classify failed", err instanceof Error ? err.message : err);
    return Response.json(
      {
        requestId: id,
        ending: null,
        rule: null,
        reason: "Classification failed.",
        say_to_caller: "I could not classify that request. Please say it once more.",
      },
      { status: 500 },
    );
  }

  if (!classification.contentOk) {
    await updateRequest(id, { classification });
    const reason = classification.contentReason ?? SAY_REJECTED;
    await setStatus(id, "rejected", reason);
    return Response.json({
      requestId: id,
      ending: "rejected",
      rule: null,
      reason,
      say_to_caller: SAY_REJECTED,
    });
  }

  const rule = applyRules(classification.facts, customer);
  await updateRequest(id, { classification, rule });
  await setStatus(id, "classified");
  const queued = await setStatus(id, "queued");

  after(async () => {
    try {
      const res = await fetch(new URL("/api/build/next", request.url), { method: "POST" });
      if (!res.ok) console.error("build next failed", res.status);
    } catch (err) {
      console.error("build next failed", err instanceof Error ? err.message : err);
    }
    try {
      const workOrderId = await createWorkOrder(queued);
      if (workOrderId) await updateRequest(id, { workOrder8090Id: workOrderId });
    } catch (err) {
      console.error("work order failed", err instanceof Error ? err.message : err);
    }
  });

  return Response.json({
    requestId: id,
    ending: rule.ending,
    rule: rule.rule,
    reason: rule.reason,
    say_to_caller: rule.ending === "goes_live" ? SAY_GOES_LIVE : rule.reason,
  });
}

function secretOk(header: string | null): boolean {
  const expected = process.env.ELEVENLABS_TOOL_SECRET;
  if (!expected || !header) return false;
  return header === expected;
}

function parseBody(raw: unknown): SubmitBody | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const name = text(record.name);
  const company = text(record.company);
  const role = text(record.role);
  const ask = text(record.ask);
  const callerWords = text(record.caller_words);
  if (!name || !company || !role || !ask || !callerWords) return null;
  return {
    name,
    company,
    role,
    ask,
    caller_words: callerWords,
    caller_phone: text(record.caller_phone),
  };
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}
