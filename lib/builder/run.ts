import { put } from "@vercel/blob";
import type { Sandbox } from "@vercel/sandbox";
import type { BuildStepName, Ending, FactoryRequest } from "@/contract/types";
import { compareScript, fastCheckScript, screenshotScript } from "@/lib/builder/browser";
import { customerName, customerPage, fileAllowed, otherCustomer, repoSlug, required } from "@/lib/builder/env";
import { promote } from "@/lib/builder/index";
import { openPullRequest } from "@/lib/builder/github";
import { checkPrompt, editPrompt, fixCheckPrompt, fixPrompt } from "@/lib/builder/prompt";
import { absoluteDir, commandMust, commandOutput, createBuildSandbox, findRepoDir, setOrigin } from "@/lib/builder/sandbox";
import { branchName, buildSandboxName, errorText } from "@/lib/builder/text";
import { waitForDeploy } from "@/lib/builder/deploy";
import { addStep, getRequest, setStatus, updateRequest } from "@/lib/store";

class BuildStopped extends Error {
  constructor() {
    super("This build was stopped.");
    this.name = "BuildStopped";
  }
}

type Ctx = {
  request: FactoryRequest;
  ending: Ending;
  sandbox: Sandbox | null;
  cwd: string;
  absCwd: string;
  step: BuildStepName;
  previewOrigin: string | null;
  screenshotsSaved: boolean;
  baseSha: string | null;
  changed: string[];
};

async function ensureActive(ctx: Ctx): Promise<void> {
  const current = await getRequest(ctx.request.id);
  if (!current) throw new Error("This request was not found.");
  ctx.request = current;
  if (current.status === "vetoed") throw new BuildStopped();
}

async function begin(ctx: Ctx, step: BuildStepName, log: string): Promise<void> {
  await ensureActive(ctx);
  ctx.step = step;
  await addStep({ requestId: ctx.request.id, step, status: "running", log });
}

async function pass(ctx: Ctx, log: string): Promise<void> {
  await addStep({ requestId: ctx.request.id, step: ctx.step, status: "passed", log });
}

async function claude(ctx: Ctx, prompt: string, timeoutMs: number, model?: "haiku"): Promise<void> {
  if (!ctx.sandbox) throw new Error("The sandbox is not running.");
  await ctx.sandbox.writeFiles([{ path: "/tmp/paf-prompt.md", content: prompt }]);
  const pick = model ? ` --model ${model}` : "";
  const result = await commandOutput(ctx.sandbox, {
    cmd: "bash",
    args: ["-c", `claude -p --dangerously-skip-permissions${pick} --output-format text < /tmp/paf-prompt.md`],
    cwd: ctx.cwd,
    timeoutMs,
  });
  if (result.code !== 0) throw new Error(`Claude Code stopped before it finished. ${result.out}`.trim());
}

function browserEnv(ctx: Ctx, extra: Record<string, string>): Record<string, string> {
  const env: Record<string, string> = {
    BOARD_PACKAGE_JSON: `${ctx.absCwd}/package.json`,
    ...extra,
  };
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim();
  if (secret) env.VERCEL_AUTOMATION_BYPASS_SECRET = secret;
  return env;
}

async function changedFiles(ctx: Ctx): Promise<string[]> {
  if (!ctx.sandbox) throw new Error("The sandbox is not running.");
  const tracked = await commandOutput(ctx.sandbox, { cmd: "git", args: ["diff", "--name-only", "origin/main"], cwd: ctx.cwd });
  const untracked = await commandOutput(ctx.sandbox, {
    cmd: "git",
    args: ["ls-files", "--others", "--exclude-standard"],
    cwd: ctx.cwd,
  });
  if (tracked.code !== 0 || untracked.code !== 0) throw new Error("Could not list the changed files.");
  return [...new Set(`${tracked.out}\n${untracked.out}`.split("\n").map((line) => line.trim()).filter(Boolean))];
}

async function prepareRepo(ctx: Ctx): Promise<void> {
  if (!ctx.sandbox) throw new Error("The sandbox is not running.");
  const branch = branchName(ctx.request.id);
  await commandMust(ctx.sandbox, { cmd: "git", args: ["config", "user.email", process.env.BUILDER_GIT_EMAIL?.trim() || "builder@phone-a-factory.local"], cwd: ctx.cwd }, "Could not set the git email.");
  await commandMust(ctx.sandbox, { cmd: "git", args: ["config", "user.name", "Phone a factory"], cwd: ctx.cwd }, "Could not set the git name.");
  await setOrigin(ctx.sandbox, ctx.cwd, true);
  await commandMust(ctx.sandbox, { cmd: "git", args: ["fetch", "origin", "+refs/heads/main:refs/remotes/origin/main"], cwd: ctx.cwd, timeoutMs: 60_000 }, "Could not fetch Dispatch Board.");
  await commandMust(ctx.sandbox, { cmd: "git", args: ["checkout", "-B", "main", "origin/main"], cwd: ctx.cwd }, "Could not update main.");
  ctx.baseSha = (await commandMust(ctx.sandbox, { cmd: "git", args: ["rev-parse", "HEAD"], cwd: ctx.cwd }, "Could not read main.")).trim() || null;
  await commandMust(ctx.sandbox, { cmd: "git", args: ["checkout", "-B", branch], cwd: ctx.cwd }, "Could not create the branch.");
  await setOrigin(ctx.sandbox, ctx.cwd, false);
}

async function runBuildCommand(ctx: Ctx): Promise<{ code: number; out: string }> {
  if (!ctx.sandbox) throw new Error("The sandbox is not running.");
  return commandOutput(ctx.sandbox, { cmd: "npm", args: ["run", "build"], cwd: ctx.cwd, timeoutMs: 180_000 });
}

async function checkCaller(ctx: Ctx, previewPage: string): Promise<boolean> {
  if (!ctx.sandbox) throw new Error("The sandbox is not running.");
  const viewOnly = `tenants/${ctx.request.customer}/view.json`;
  if (ctx.changed.length > 0 && ctx.changed.every((file) => file === viewOnly)) {
    await ctx.sandbox.writeFiles([{ path: "/tmp/paf-fast.mjs", content: fastCheckScript }]);
    const fast = await commandOutput(ctx.sandbox, {
      cmd: "node",
      args: ["/tmp/paf-fast.mjs"],
      cwd: ctx.cwd,
      env: browserEnv(ctx, { PAGE_URL: previewPage, VIEW_PATH: `${ctx.absCwd}/${viewOnly}` }),
      timeoutMs: 90_000,
    });
    if (fast.code !== 0) throw new Error(`The caller's board does not show the new view. ${fast.out}`.trim());
    return true;
  }
  await claude(ctx, checkPrompt(ctx.request, previewPage), 240_000, "haiku");
  const run = () => commandOutput(ctx.sandbox!, {
    cmd: "node",
    args: ["/tmp/check-caller.mjs"],
    cwd: ctx.cwd,
    env: browserEnv(ctx, { PAGE_URL: previewPage }),
    timeoutMs: 90_000,
  });
  let result = await run();
  const asserted = result.out.includes("ASSERT_FAIL");
  if (result.code !== 0 && !asserted) {
    await claude(ctx, fixCheckPrompt(result.out), 150_000, "haiku");
    result = await run();
  }
  if (result.code !== 0) {
    throw new Error("The caller's board did not match the done-when lines.");
  }
  return false;
}

/** The deploy of the main commit this build started from. Other builds may change production meanwhile. */
async function baseOrigin(ctx: Ctx): Promise<string> {
  if (ctx.baseSha) {
    try {
      const base = await waitForDeploy({ sha: ctx.baseSha, target: "production", timeoutMs: 20_000 });
      return base.url;
    } catch {
      // Fall back to the production address.
    }
  }
  return required("DISPATCH_BOARD_PROD_URL");
}

async function checkOther(ctx: Ctx, previewOrigin: string): Promise<void> {
  if (!ctx.sandbox) throw new Error("The sandbox is not running.");
  const other = otherCustomer(ctx.request.customer);
  await ctx.sandbox.writeFiles([{ path: "/tmp/paf-compare.mjs", content: compareScript }]);
  const result = await commandOutput(ctx.sandbox, {
    cmd: "node",
    args: ["/tmp/paf-compare.mjs"],
    cwd: ctx.cwd,
    env: browserEnv(ctx, {
      PROD_URL: customerPage(await baseOrigin(ctx), other),
      PREVIEW_URL: customerPage(previewOrigin, other),
    }),
    timeoutMs: 90_000,
  });
  if (result.code !== 0) throw new Error("Could not open the other customer's board.");
  const changed = result.out.split("\n").some((line) => line.trim() === "DIFFERENT");
  if (!changed) {
    await pass(ctx, "The other customer's board is unchanged.");
    return;
  }
  if (ctx.ending === "goes_live") {
    throw new Error("The other customer's board changed, so this cannot go live.");
  }
  await pass(ctx, "The other customer's board changed. A person will review this.");
}

async function shoot(ctx: Ctx, pageUrl: string, outPath: string): Promise<Buffer> {
  if (!ctx.sandbox) throw new Error("The sandbox is not running.");
  await ctx.sandbox.writeFiles([{ path: "/tmp/paf-shot.mjs", content: screenshotScript }]);
  const result = await commandOutput(ctx.sandbox, {
    cmd: "node",
    args: ["/tmp/paf-shot.mjs"],
    cwd: ctx.cwd,
    env: browserEnv(ctx, { PAGE_URL: pageUrl, OUT_PATH: outPath }),
    timeoutMs: 90_000,
  });
  if (result.code !== 0) throw new Error(`Could not take a screenshot. ${result.out}`.trim());
  const bytes = await ctx.sandbox.readFileToBuffer({ path: outPath });
  if (!bytes) throw new Error("Could not read the screenshot.");
  return bytes;
}

async function saveScreenshots(ctx: Ctx, previewPage: string): Promise<void> {
  const before = await shoot(ctx, customerPage(required("DISPATCH_BOARD_PROD_URL"), ctx.request.customer), "/tmp/paf-before.png");
  const after = await shoot(ctx, previewPage, "/tmp/paf-after.png");
  const [beforeBlob, afterBlob] = await Promise.all([
    put(`screenshots/${ctx.request.id}/before.png`, before, { access: "public", contentType: "image/png", addRandomSuffix: true }),
    put(`screenshots/${ctx.request.id}/after.png`, after, { access: "public", contentType: "image/png", addRandomSuffix: true }),
  ]);
  await updateRequest(ctx.request.id, {
    screenshotBeforeUrl: beforeBlob.url,
    screenshotAfterUrl: afterBlob.url,
  });
  ctx.screenshotsSaved = true;
}

async function fail(ctx: Ctx, error: unknown): Promise<void> {
  if (error instanceof BuildStopped) return;
  const current = await getRequest(ctx.request.id).catch(() => null);
  if (!current || current.status === "vetoed" || current.status === "live" || current.status === "waiting_for_approval") return;
  const reason = errorText(error);
  if (ctx.sandbox && ctx.previewOrigin && !ctx.screenshotsSaved && ctx.step !== "screenshot") {
    const page = customerPage(ctx.previewOrigin, ctx.request.customer);
    await saveScreenshots(ctx, page).catch(() => undefined);
  }
  await addStep({ requestId: ctx.request.id, step: ctx.step, status: "failed", log: reason });
  await setStatus(ctx.request.id, "failed", reason);
  await setStatus(ctx.request.id, "waiting_for_approval", reason);
}

export async function runBuild(requestId: string): Promise<void> {
  const initial = await getRequest(requestId);
  if (!initial) throw new Error("This request was not found.");
  if (initial.status === "vetoed" || initial.status === "live" || initial.status === "waiting_for_approval") return;
  if (initial.status === "queued") await setStatus(requestId, "building");

  const ctx: Ctx = {
    request: initial,
    ending: initial.rule?.ending ?? "needs_person",
    sandbox: null,
    cwd: "",
    absCwd: "",
    step: "sandbox_ready",
    previewOrigin: null,
    screenshotsSaved: false,
    baseSha: null,
    changed: [],
  };

  try {
    const name = buildSandboxName(requestId);
    await begin(ctx, "sandbox_ready", "Starting the sandbox from the snapshot.");
    ctx.sandbox = await createBuildSandbox(name);
    const { name: repoName } = repoSlug();
    ctx.cwd = await findRepoDir(ctx.sandbox, repoName);
    ctx.absCwd = await absoluteDir(ctx.sandbox, ctx.cwd);
    await prepareRepo(ctx);
    await pass(ctx, `The sandbox ${name} is ready.`);

    await begin(ctx, "agent_editing", `Editing ${customerName(ctx.request.customer)}'s board.`);
    await claude(ctx, editPrompt(ctx.request, ctx.ending), 150_000);
    await pass(ctx, "The edit is in the working tree.");

    await setStatus(requestId, "checking");
    await begin(ctx, "build", "Running the build.");
    let built = await runBuildCommand(ctx);
    if (built.code !== 0) {
      await claude(ctx, fixPrompt(ctx.request, ctx.ending, built.out), 120_000);
      built = await runBuildCommand(ctx);
    }
    if (built.code !== 0) throw new Error(`The build failed. ${built.out}`.trim());
    await pass(ctx, "The build passed.");

    await begin(ctx, "folder_check", "Checking that only allowed files changed.");
    const files = await changedFiles(ctx);
    ctx.changed = files;
    if (files.length === 0) {
      const note = await commandOutput(ctx.sandbox!, { cmd: "bash", args: ["-c", "cat /tmp/paf-cannot.txt 2>/dev/null | head -c 400"] });
      const why = note.out.replace(/\s+/g, " ").trim();
      const reason = why
        ? `${why} The product owner decides what to do next.`
        : "The agent found no safe change to make in this customer's files. The product owner decides what to do next.";
      if (ctx.request.rule) {
        await updateRequest(ctx.request.id, {
          rule: { ...ctx.request.rule, ending: "needs_person", approver: "product_owner", reason },
        });
      }
      throw new Error(reason);
    }
    const blocked = files.filter((file) => !fileAllowed(file, ctx.request.customer, ctx.ending));
    if (blocked.length > 0) {
      throw new Error(`The change edited files outside the allowed folders: ${blocked.join(", ")}.`);
    }
    await pass(ctx, "Only allowed files changed.");

    await begin(ctx, "pr_opened", "Opening the pull request.");
    const branch = branchName(requestId);
    const title = `${customerName(ctx.request.customer)}: ${ctx.request.classification?.askOneLine ?? ctx.request.ask}`;
    const body = [
      `${customerName(ctx.request.customer)} asked: ${ctx.request.ask}`,
      "",
      "Done when:",
      ...(ctx.request.classification?.doneWhen ?? []).map((line) => `- ${line}`),
      "",
      ctx.request.rule?.reason ?? "",
    ].join("\n").trim();
    await ctx.sandbox.writeFiles([{ path: "/tmp/paf-commit.txt", content: `${title}\n` }]);
    await setOrigin(ctx.sandbox, ctx.cwd, true);
    await commandMust(ctx.sandbox, { cmd: "git", args: ["add", "-A"], cwd: ctx.cwd }, "Could not stage the change.");
    await commandMust(ctx.sandbox, { cmd: "git", args: ["commit", "-F", "/tmp/paf-commit.txt"], cwd: ctx.cwd }, "Could not commit the change.");
    await commandMust(
      ctx.sandbox,
      { cmd: "git", args: ["push", "-u", "origin", `HEAD:${branch}`], cwd: ctx.cwd, timeoutMs: 60_000 },
      "Could not push the branch.",
    );
    await setOrigin(ctx.sandbox, ctx.cwd, false);
    const pullUrl = await openPullRequest({ branch, title: title.slice(0, 120), body });
    await updateRequest(requestId, { pullRequestUrl: pullUrl });
    await pass(ctx, "The pull request is open.");

    await begin(ctx, "preview_deployed", "Waiting for the preview.");
    const preview = await waitForDeploy({ branch, timeoutMs: 180_000 });
    ctx.previewOrigin = preview.url;
    const previewPage = customerPage(preview.url, ctx.request.customer);
    await updateRequest(requestId, { previewUrl: previewPage });
    await pass(ctx, "The preview is ready.");

    await begin(ctx, "browser_check_caller", "Checking the caller's board.");
    const fast = await checkCaller(ctx, previewPage);
    await pass(ctx, fast ? "The caller's board shows the new view exactly." : "The caller's board matches the done-when lines.");

    await begin(ctx, "browser_check_other_customer", "Checking that the other customer's board stayed the same.");
    await checkOther(ctx, preview.url);

    await begin(ctx, "screenshot", "Saving the before and after screenshots.");
    await saveScreenshots(ctx, previewPage);
    await pass(ctx, "The screenshots are saved.");

    if (ctx.ending === "goes_live") {
      await promote(requestId);
      return;
    }
    await setStatus(requestId, "waiting_for_approval");
  } catch (error) {
    await fail(ctx, error);
  } finally {
    await ctx.sandbox?.stop().catch(() => undefined);
  }
}
