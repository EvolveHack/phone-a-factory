// 8090 External API. Failures are logged and never thrown. The local store stays the source for the screen.
import { CUSTOMERS } from "@/contract/view";
import type { FactoryRequest } from "@/contract/types";

type Config = { base: string; key: string; projectId: string };

type Label = { id: string; title: string };

export async function createWorkOrder(r: FactoryRequest): Promise<string | null> {
  try {
    const cfg = readConfig();
    if (!cfg) return null;

    const endingLabel = r.rule?.ending === "goes_live" ? "goes-live" : "needs-a-person";
    const customerName = CUSTOMERS[r.customer].name;
    const labelIds = await labelIdsFor(cfg, [
      { title: endingLabel, color: endingLabel === "goes-live" ? "green" : "orange" },
      { title: customerName, color: "blue" },
    ]);

    const title = (r.classification?.askOneLine || r.ask).slice(0, 180);
    const markdown = [
      `**Caller:** ${r.callerName}, ${r.callerRole}`,
      `**Customer:** ${customerName}`,
      `**Ask:** ${r.ask}`,
      `**Caller words:** ${r.callerWords}`,
      `**Ending:** ${r.rule?.ending === "goes_live" ? "Goes live" : "Needs a person"}`,
      `**Rule:** ${r.rule?.rule ?? "none"}`,
      `**Reason:** ${r.rule?.reason ?? "No rule yet."}`,
    ].join("\n\n");

    const workOrderId = await createOne(cfg, r.id, title, markdown, labelIds);
    if (!workOrderId) return null;

    if (r.rule?.reason) await addComment(workOrderId, r.rule.reason);
    if (labelIds.length > 0) await linkLabels(cfg, workOrderId, labelIds);
    return workOrderId;
  } catch (err) {
    console.error("8090 createWorkOrder failed", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function linkPullRequest(workOrderId: string, prUrl: string): Promise<void> {
  try {
    const cfg = readConfig();
    if (!cfg) return;
    const res = await call8090(cfg, `/work_orders/${workOrderId}/pull_requests`, {
      method: "POST",
      body: { url: prUrl },
    });
    if (!res || (res.status !== 200 && res.status !== 201)) {
      console.error("8090 link pull request failed", res?.status ?? "no response");
    }
  } catch (err) {
    console.error("8090 linkPullRequest failed", err instanceof Error ? err.message : err);
  }
}

export async function addComment(workOrderId: string, text: string): Promise<void> {
  try {
    const cfg = readConfig();
    if (!cfg) return;
    const res = await call8090(cfg, `/work_orders/${workOrderId}/comments`, {
      method: "POST",
      body: { markdown_content: text },
    });
    if (!res || (res.status !== 200 && res.status !== 201)) {
      console.error("8090 comment failed", res?.status ?? "no response");
    }
  } catch (err) {
    console.error("8090 addComment failed", err instanceof Error ? err.message : err);
  }
}

function readConfig(): Config | null {
  const base = process.env.FACTORY_8090_BASE_URL?.replace(/\/$/, "");
  const key = process.env.FACTORY_8090_API_KEY;
  const projectId = process.env.FACTORY_8090_PROJECT_ID;
  if (!base || !key || !projectId) {
    console.error("8090 is not configured");
    return null;
  }
  return { base, key, projectId };
}

async function labelIdsFor(cfg: Config, wanted: { title: string; color: string }[]): Promise<string[]> {
  const ids: string[] = [];
  for (const label of wanted) {
    const id = await ensureLabel(cfg, label.title.slice(0, 50), label.color);
    if (id) ids.push(id);
  }
  return ids;
}

async function ensureLabel(cfg: Config, title: string, color: string): Promise<string | null> {
  const existing = await findLabel(cfg, title);
  if (existing) return existing;
  const created = await call8090(cfg, "/work_orders/labels", {
    method: "POST",
    body: { title, color },
  });
  const createdId = labelIdFrom(created?.body);
  if (createdId) return createdId;
  if (created?.status === 409) return findLabel(cfg, title);
  console.error("8090 label failed", title, created?.status ?? "no response");
  return null;
}

async function findLabel(cfg: Config, title: string): Promise<string | null> {
  const listed = await call8090(cfg, "/work_orders/labels?archived=false", { method: "GET" });
  const items = labelsFrom(listed?.body);
  return items.find((item) => item.title === title)?.id ?? null;
}

async function createOne(
  cfg: Config,
  requestId: string,
  title: string,
  markdown: string,
  labelIds: string[],
): Promise<string | null> {
  const full = await batchCreate(cfg, requestId, {
    title,
    markdown_content: markdown,
    priority: "medium",
    type: "build",
    status: "ready",
    ...(labelIds.length ? { label_ids: labelIds } : {}),
  });
  if (full) return full;
  return batchCreate(cfg, `${requestId}-retry`, {
    title,
    markdown_content: markdown,
  });
}

async function batchCreate(
  cfg: Config,
  requestId: string,
  patch: Record<string, unknown>,
): Promise<string | null> {
  const res = await call8090(cfg, "/work_orders/batch_create", {
    method: "POST",
    body: {
      request_id: requestId,
      operations: [{ operation_id: "create", operation_type: "CreateWorkOrder", patch }],
    },
  });
  const id = workOrderIdFrom(res?.body);
  if (id && (res?.status === 200 || res?.status === 201)) return id;
  console.error("8090 create failed", cfg.projectId, res?.status ?? "no response", short(res?.body));
  return null;
}

async function linkLabels(cfg: Config, workOrderId: string, labelIds: string[]): Promise<void> {
  const shapes: Record<string, unknown>[] = [
    { target: { work_order_id: workOrderId }, patch: { label_ids: labelIds } },
    { target: { id: workOrderId }, patch: { label_ids: labelIds } },
    { target: { work_order_id: workOrderId }, patch: { labels: labelIds } },
  ];
  for (const [index, shape] of shapes.entries()) {
    const res = await call8090(cfg, "/work_orders/batch_update", {
      method: "POST",
      body: {
        request_id: `${workOrderId}-labels-${index}`,
        operations: [{ operation_id: "labels", operation_type: "LinkLabels", ...shape }],
      },
    });
    if (res && (res.status === 200 || res.status === 201)) return;
    console.error("8090 link labels failed", res?.status ?? "no response", short(res?.body));
  }
}

async function call8090(
  cfg: Config,
  path: string,
  init: { method: string; body?: unknown },
): Promise<{ status: number; body: unknown } | null> {
  try {
    const res = await fetch(`${cfg.base}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        "Content-Type": "application/json",
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(10_000),
    });
    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text.slice(0, 300);
      }
    }
    return { status: res.status, body };
  } catch (err) {
    console.error("8090 request failed", path, err instanceof Error ? err.message : err);
    return null;
  }
}

function workOrderIdFrom(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const results = (body as { results?: unknown }).results;
  const values = Array.isArray(results)
    ? results
    : results && typeof results === "object"
      ? Object.values(results as Record<string, unknown>)
      : [];
  for (const value of values) {
    if (!value || typeof value !== "object") continue;
    const id = (value as { work_order_id?: unknown }).work_order_id;
    if (typeof id === "string" && id) return id;
  }
  const dataId = (body as { data?: { id?: unknown } }).data?.id;
  return typeof dataId === "string" && dataId ? dataId : null;
}

function labelIdFrom(body: unknown): string | null {
  if (!body || typeof body !== "object") return null;
  const data = (body as { data?: { id?: unknown } }).data;
  return typeof data?.id === "string" ? data.id : null;
}

function labelsFrom(body: unknown): Label[] {
  if (!body || typeof body !== "object") return [];
  const items = (body as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = (item as { id?: unknown }).id;
    const title = (item as { title?: unknown }).title;
    if (typeof id !== "string" || typeof title !== "string") return [];
    return [{ id, title }];
  });
}

function short(body: unknown): string {
  const text = typeof body === "string" ? body : JSON.stringify(body);
  return (text ?? "").slice(0, 300);
}
