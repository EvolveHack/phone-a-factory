import { NextResponse } from "next/server";
import { productOf } from "@/contract/products";
import type { Classification, FactoryRequest } from "@/contract/types";
import { namesOf, queueClassified } from "@/lib/classify/submit";
import { applyRules } from "@/lib/rules/apply";
import { getRequest, insertRequest, newRequestId } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** "Roll out to everyone": a new ask for the same customer that makes a live change available to every customer of the product. */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const original = await getRequest(id);
  if (!original) return NextResponse.json({ ok: false }, { status: 404 });
  if (original.status !== "live") {
    return NextResponse.json({ ok: false, error: "Only a live change can be rolled out." }, { status: 409 });
  }

  const product = productOf(original.customer);
  const everyone = `every ${product.name} customer`;
  const ask = `Make this available to ${everyone}: ${original.ask}`;
  const base = original.classification;
  const facts = base?.facts;
  const classification: Classification = {
    askOneLine: `For ${everyone}: ${base?.askOneLine ?? original.ask}`.slice(0, 200),
    doneWhen: base?.doneWhen ?? [original.ask, "Every customer's page shows the change."],
    area: base?.area ?? "other",
    facts: {
      changesAccess: facts?.changesAccess ?? { value: false, quote: null },
      touchesMoney: facts?.touchesMoney ?? { value: false, quote: null },
      changesDataOrCalculation: facts?.changesDataOrCalculation ?? { value: false, quote: null },
      newScreenOrConnection: facts?.newScreenOrConnection ?? { value: false, quote: null },
      controlsDevices: facts?.controlsDevices ?? { value: false, quote: null },
      appliesToEveryCustomer: { value: true, quote: everyone },
      displayOnly: { value: false, quote: everyone },
    },
    contentOk: true,
  };

  const now = new Date().toISOString();
  const next: FactoryRequest = {
    ...original,
    id: newRequestId(),
    createdAt: now,
    callerName: "Vendor team",
    callerRole: "Roll out to everyone",
    callerPhone: null,
    callerWords: ask,
    ask,
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
  await insertRequest(next);
  await queueClassified(next.id, classification, applyRules(classification.facts, namesOf(original.customer)), request.url);
  return NextResponse.json({ ok: true, requestId: next.id });
}
