import { repoSlug, required } from "@/lib/builder/env";
import { oneLine, redact } from "@/lib/builder/text";

type Pull = {
  number: number;
  html_url: string;
  merged?: boolean;
  merge_commit_sha?: string | null;
};

async function github<T>(path: string, init?: { method?: string; body?: unknown }): Promise<{ status: number; data: T }> {
  const { owner, name } = repoSlug();
  const res = await fetch(`https://api.github.com/repos/${owner}/${name}${path}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${required("GITHUB_TOKEN")}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      "User-Agent": "phone-a-factory",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
    cache: "no-store",
  });
  const text = await res.text();
  let data = {} as T;
  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      if (!res.ok) throw new Error(`GitHub returned ${res.status}. ${oneLine(redact(text))}`);
    }
  }
  return { status: res.status, data };
}

export function pullNumber(url: string): number {
  const match = url.match(/\/pull\/(\d+)/);
  if (!match) throw new Error("The pull request link has no number.");
  return Number(match[1]);
}

export async function openPullRequest(input: { branch: string; title: string; body: string }): Promise<string> {
  const created = await github<Pull>("/pulls", {
    method: "POST",
    body: { title: input.title, head: input.branch, base: "main", body: input.body },
  });
  if (created.status === 201 && created.data.html_url) return created.data.html_url;
  if (created.status === 422) {
    const { owner } = repoSlug();
    const head = encodeURIComponent(`${owner}:${input.branch}`);
    const existing = await github<Pull[]>(`/pulls?head=${head}&state=open`);
    const url = existing.data[0]?.html_url;
    if (existing.status === 200 && url) return url;
  }
  throw new Error(`Could not open the pull request (${created.status}).`);
}

export async function mergePullRequest(url: string): Promise<string> {
  const number = pullNumber(url);
  const current = await github<Pull>(`/pulls/${number}`);
  if (current.status === 200 && current.data.merged && current.data.merge_commit_sha) {
    return current.data.merge_commit_sha;
  }
  const merged = await github<{ sha?: string; merged?: boolean }>(`/pulls/${number}/merge`, {
    method: "PUT",
    body: { merge_method: "squash" },
  });
  if ((merged.status === 200 || merged.status === 201) && merged.data.sha) return merged.data.sha;
  const retry = await github<{ sha?: string; message?: string }>(`/pulls/${number}/merge`, {
    method: "PUT",
    body: { merge_method: "merge" },
  });
  if ((retry.status === 200 || retry.status === 201) && retry.data.sha) return retry.data.sha;
  const message = (merged.data as { message?: string }).message || retry.data.message || "";
  throw new Error(`Could not merge the pull request (${merged.status}). ${oneLine(message)}`.trim());
}

export async function closePullRequest(url: string): Promise<void> {
  const number = pullNumber(url);
  const closed = await github(`/pulls/${number}`, { method: "PATCH", body: { state: "closed" } });
  if (closed.status !== 200) throw new Error(`Could not close the pull request (${closed.status}).`);
}
