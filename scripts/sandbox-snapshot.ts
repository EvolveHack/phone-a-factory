// Run once: npx tsx scripts/sandbox-snapshot.ts
// Prints the snapshot id. Set SANDBOX_SNAPSHOT_ID to that id before builds run.
import { Sandbox } from "@vercel/sandbox";
import { repoSlug, required, sandboxCredentials } from "@/lib/builder/env";
import { absoluteDir, commandMust, findRepoDir, setOrigin } from "@/lib/builder/sandbox";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

async function main() {
  const { full, name } = repoSlug();
  const creds = sandboxCredentials();
  const sandbox = await Sandbox.create({
    name: `paf-snapshot-${Date.now().toString(36)}`,
    timeout: 30 * 60 * 1000,
    resources: { vcpus: 4 },
    source: {
      type: "git",
      url: `https://github.com/${full}.git`,
      username: "x-access-token",
      password: required("GITHUB_TOKEN"),
      revision: "main",
      depth: 1,
    },
    ...(creds ?? {}),
  });

  let saved = false;
  try {
    const cwd = await findRepoDir(sandbox, name);
    await commandMust(sandbox, { cmd: "git", args: ["config", "--global", "--add", "safe.directory", "*"] }, "Could not mark the repo as safe.");
    await commandMust(sandbox, { cmd: "npm", args: ["ci"], cwd, timeoutMs: 10 * 60 * 1000 }, "npm ci failed.");
    await commandMust(
      sandbox,
      { cmd: "npm", args: ["install", "-g", "@anthropic-ai/claude-code"], cwd, sudo: true, timeoutMs: 10 * 60 * 1000 },
      "Could not install Claude Code.",
    );
    await commandMust(
      sandbox,
      { cmd: "npm", args: ["install", "--no-save", "playwright"], cwd, timeoutMs: 10 * 60 * 1000 },
      "Could not install Playwright.",
    );
    const abs = await absoluteDir(sandbox, cwd);
    await commandMust(
      sandbox,
      { cmd: "npx", args: ["playwright", "install-deps", "chromium"], cwd, sudo: true, timeoutMs: 10 * 60 * 1000 },
      "Could not install Playwright system packages.",
    );
    await commandMust(
      sandbox,
      { cmd: "npx", args: ["playwright", "install", "chromium"], cwd, timeoutMs: 10 * 60 * 1000 },
      "Could not install Chromium.",
    );
    await commandMust(sandbox, { cmd: "bash", args: ["-c", "command -v claude"], cwd }, "Claude Code is not on PATH.");
    await setOrigin(sandbox, abs, false);
    const snapshot = await sandbox.snapshot({ expiration: FOURTEEN_DAYS_MS });
    saved = true;
    console.log(snapshot.snapshotId);
  } finally {
    if (!saved) await sandbox.stop().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
