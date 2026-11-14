import { required, vercelAuthToken } from "@/lib/builder/env";
import { oneLine, redact, sleep } from "@/lib/builder/text";

type Deployment = {
  uid?: string;
  id?: string;
  url?: string | null;
  state?: string;
  readyState?: string;
  created?: number;
  target?: string | null;
  meta?: { githubCommitRef?: string; githubCommitSha?: string };
};

function deploymentId(d: Deployment): string {
  return d.uid || d.id || "";
}

function stateOf(d: Deployment): string {
  return d.readyState || d.state || "";
}

export function isReady(d: Deployment): boolean {
  return stateOf(d) === "READY" && Boolean(d.url);
}

function isFailed(d: Deployment): boolean {
  const state = stateOf(d);
  return state === "ERROR" || state === "CANCELED";
}

async function listDeployments(query: Record<string, string>): Promise<Deployment[]> {
  const url = new URL("https://api.vercel.com/v7/deployments");
  url.searchParams.set("projectId", required("VERCEL_PROJECT_ID_DISPATCH"));
  url.searchParams.set("teamId", required("VERCEL_TEAM_ID"));
  for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${vercelAuthToken()}` },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Could not list deploys (${res.status}). ${oneLine(redact(text))}`);
  const data = JSON.parse(text) as { deployments?: Deployment[] };
  return data.deployments ?? [];
}

/** true when the deploy matches, false when it does not, null when the response has no git meta. */
function matches(d: Deployment, filter: { sha?: string; branch?: string }): boolean | null {
  const sha = d.meta?.githubCommitSha;
  const branch = d.meta?.githubCommitRef;
  if (filter.sha && sha) return sha === filter.sha;
  if (filter.branch && branch) return branch === filter.branch;
  if (!sha && !branch) return null;
  return false;
}

export async function waitForDeploy(filter: {
  sha?: string;
  branch?: string;
  target?: "production";
  timeoutMs: number;
}): Promise<{ id: string; url: string }> {
  const deadline = Date.now() + filter.timeoutMs;
  while (Date.now() < deadline) {
    const query: Record<string, string> = { limit: "20" };
    if (filter.target) query.target = filter.target;
    if (filter.sha) query.sha = filter.sha;
    if (filter.branch) query.branch = filter.branch;
    const listed = await listDeployments(query);
    const known = listed.filter((d) => matches(d, filter) === true);
    const unknown = listed.filter((d) => matches(d, filter) === null);
    const hits = known.length > 0 ? known : unknown;
    const ready = hits.find(isReady);
    if (ready?.url) return { id: deploymentId(ready), url: `https://${ready.url}` };
    if (hits.some(isFailed)) throw new Error("The deploy failed.");
    await sleep(3000);
  }
  throw new Error("The deploy did not finish in time.");
}

export async function previousProductionDeployment(): Promise<{ id: string; url: string }> {
  const listed = await listDeployments({ target: "production", state: "READY", limit: "10" });
  const ready = listed.filter(isReady).sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
  const previous = ready[1];
  if (!previous?.url) throw new Error("There is no earlier production deploy to restore.");
  return { id: deploymentId(previous), url: `https://${previous.url}` };
}

export async function rollbackTo(deploymentId: string): Promise<void> {
  const projectId = required("VERCEL_PROJECT_ID_DISPATCH");
  const url = new URL(`https://api.vercel.com/v1/projects/${projectId}/rollback/${deploymentId}`);
  url.searchParams.set("teamId", required("VERCEL_TEAM_ID"));
  url.searchParams.set("description", "Undo a live change");
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${vercelAuthToken()}`,
      "Content-Type": "application/json",
    },
    body: "{}",
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Could not restore the previous deploy (${res.status}). ${oneLine(redact(text))}`);
  }
}
