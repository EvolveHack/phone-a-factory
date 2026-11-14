// Run once per repo:
//   npx tsx scripts/sandbox-snapshot.ts                 (EvolveHack/dispatch-board)
//   npx tsx scripts/sandbox-snapshot.ts factory-apps    (EvolveHack/factory-apps)
// Prints the snapshot id, then the env var to set it in (the product registry's snapshotEnv for that repo).
import { Sandbox } from "@vercel/sandbox";
import { PRODUCTS } from "@/contract/products";
import { repoSlug, required, sandboxCredentials } from "@/lib/builder/env";
import { absoluteDir, commandMust, findRepoDir, setOrigin } from "@/lib/builder/sandbox";

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

/** "factory-apps" or "EvolveHack/factory-apps". Default: Dispatch Board's repo. */
function repoFromArgs(): string {
  const arg = process.argv[2]?.trim() || PRODUCTS.freight.repo;
  const repo = arg.includes("/") ? arg : `${PRODUCTS.freight.repo.split("/")[0]}/${arg}`;
  if (!Object.values(PRODUCTS).some((p) => p.repo === repo)) {
    throw new Error(`${repo} is not a repo in the product registry.`);
  }
  return repo;
}

async function main() {
  const repo = repoFromArgs();
  const { full, name } = repoSlug(repo);
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
    await setOrigin(sandbox, abs, repo, false);
    const snapshot = await sandbox.snapshot({ expiration: FOURTEEN_DAYS_MS });
    saved = true;
    const envName = Object.values(PRODUCTS).find((p) => p.repo === repo)!.snapshotEnv;
    console.log(snapshot.snapshotId);
    console.error(`Set ${envName} to that id on the phone-a-factory Vercel project.`);
  } finally {
    if (!saved) await sandbox.stop().catch(() => undefined);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
