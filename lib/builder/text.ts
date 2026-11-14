export function oneLine(text: string, max = 240): string {
  const line = text.replace(/\s+/g, " ").trim();
  if (line.length <= max) return line;
  return `${line.slice(0, max - 1)}…`;
}

export function redact(text: string): string {
  return text
    .replace(/x-access-token:[^@\s'"]+/g, "x-access-token:redacted")
    .replace(/ghp_[A-Za-z0-9]+/g, "ghp_redacted")
    .replace(/github_pat_[A-Za-z0-9_]+/g, "github_pat_redacted")
    .replace(/sk-ant-[A-Za-z0-9_-]+/g, "sk-ant-redacted");
}

export function errorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return oneLine(redact(message));
}

export function branchName(requestId: string): string {
  if (!/^req_[a-z0-9_]+$/i.test(requestId)) {
    throw new Error("This request id cannot be used as a branch name.");
  }
  return `ask/${requestId}`;
}

export function buildSandboxName(requestId: string): string {
  const slug = requestId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `paf-${slug}-${Date.now().toString(36)}`.slice(0, 63);
}

export function sandboxNameFromLog(log: string | null): string | null {
  const match = log?.match(/sandbox ([a-z0-9-]+) is ready/i);
  return match?.[1] ?? null;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
