import { Sandbox } from "@vercel/sandbox";
import type { Product } from "@/contract/products";
import { repoSlug, required, sandboxCredentials } from "@/lib/builder/env";
import { redact } from "@/lib/builder/text";

const BUILD_TIMEOUT_MS = 12 * 60 * 1000;

export async function commandOutput(
  sandbox: Sandbox,
  params: { cmd: string; args?: string[]; cwd?: string; env?: Record<string, string>; sudo?: boolean; timeoutMs?: number },
): Promise<{ code: number; out: string }> {
  const result = await sandbox.runCommand(params);
  const out = redact(`${await result.stdout()}\n${await result.stderr()}`).trim();
  return { code: result.exitCode, out };
}

export async function commandMust(
  sandbox: Sandbox,
  params: { cmd: string; args?: string[]; cwd?: string; env?: Record<string, string>; sudo?: boolean; timeoutMs?: number },
  label: string,
): Promise<string> {
  const result = await commandOutput(sandbox, params);
  if (result.code !== 0) throw new Error(`${label} ${result.out}`.trim());
  return result.out;
}

export async function findRepoDir(sandbox: Sandbox, repoName: string): Promise<string> {
  const listed = await commandMust(sandbox, { cmd: "ls", args: ["-1"] }, "Could not list the sandbox.");
  const names = listed.split("\n").map((line) => line.trim());
  if (names.includes(repoName)) return repoName;
  if (names.includes("package.json")) return ".";
  throw new Error("The repository was not in the sandbox.");
}

export async function absoluteDir(sandbox: Sandbox, cwd: string): Promise<string> {
  const out = await commandMust(sandbox, { cmd: "pwd", cwd }, "Could not read the working directory.");
  const line = out.split("\n").map((item) => item.trim()).filter(Boolean).at(-1);
  if (!line) throw new Error("Could not read the working directory.");
  return line;
}

/** Put the token on the remote only while fetching or pushing, then take it off before the agent runs. */
export async function setOrigin(sandbox: Sandbox, cwd: string, repo: string, withToken: boolean): Promise<void> {
  const { full } = repoSlug(repo);
  const url = withToken
    ? `https://x-access-token:${required("GITHUB_TOKEN")}@github.com/${full}.git`
    : `https://github.com/${full}.git`;
  const result = await sandbox.runCommand({ cmd: "git", args: ["remote", "set-url", "origin", url], cwd });
  if (result.exitCode !== 0) throw new Error(`Could not sign in to the ${full} repository.`);
}

/** Builds start from the snapshot of the product's repo, named by product.snapshotEnv. */
export async function createBuildSandbox(name: string, product: Product): Promise<Sandbox> {
  const creds = sandboxCredentials();
  return Sandbox.create({
    name,
    timeout: BUILD_TIMEOUT_MS,
    resources: { vcpus: 4 },
    persistent: false,
    source: { type: "snapshot", snapshotId: required(product.snapshotEnv) },
    env: { ANTHROPIC_API_KEY: required("ANTHROPIC_API_KEY") },
    ...(creds ?? {}),
  });
}

export async function stopSandbox(name: string): Promise<void> {
  const creds = sandboxCredentials();
  const sandbox = await Sandbox.get({ name, ...(creds ?? {}) });
  await sandbox.stop();
}
