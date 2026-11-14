// OWNED BY W2. Signatures are fixed in contract/api.md.
import { linkPullRequest } from "@/lib/factory8090";
import { promoteDeployment, waitForDeploy } from "@/lib/builder/deploy";
import { closePullRequest, mergePullRequest, revertPullRequestOnMain } from "@/lib/builder/github";
import { stopSandbox } from "@/lib/builder/sandbox";
import { errorText, sandboxNameFromLog } from "@/lib/builder/text";
import { addStep, getRequest, getState, setStatus, updateRequest, withMergeLock } from "@/lib/store";
import { productOf } from "@/contract/products";
import type { FactoryRequest } from "@/contract/types";

async function linkWorkOrder(request: FactoryRequest): Promise<void> {
  try {
    if (request.workOrder8090Id && request.pullRequestUrl) {
      await linkPullRequest(request.workOrder8090Id, request.pullRequestUrl);
      await addStep({
        requestId: request.id,
        step: "linked_8090",
        status: "passed",
        log: "The pull request is linked in 8090.",
      });
      return;
    }
    await addStep({
      requestId: request.id,
      step: "linked_8090",
      status: "passed",
      log: "No 8090 work order to link.",
    });
  } catch (error) {
    await addStep({
      requestId: request.id,
      step: "linked_8090",
      status: "failed",
      log: errorText(error),
    });
  }
}

async function markNeedsReview(requestId: string, reason: string): Promise<void> {
  await setStatus(requestId, "failed", reason);
  await setStatus(requestId, "waiting_for_approval", reason);
}

export async function promote(requestId: string): Promise<void> {
  const request = await getRequest(requestId);
  if (!request) throw new Error("This request was not found.");
  if (request.status === "live") return;
  if (!request.pullRequestUrl) throw new Error("This request has no pull request to merge.");
  const product = productOf(request.customer);
  try {
    await addStep({ requestId, step: "promoted", status: "running", log: "Waiting for its turn to merge." });
    const pullUrl = request.pullRequestUrl;
    const merged = await withMergeLock(product.repo, async () => {
      let sha: string;
      try {
        sha = await mergePullRequest(product.repo, pullUrl);
      } catch (error) {
        if (isConflict(error)) return null;
        throw error;
      }
      await addStep({ requestId, step: "promoted", status: "running", log: "Merged. Waiting for production." });
      const deploy = await waitForDeploy({ projectId: product.vercelProjectId, sha, target: "production", timeoutMs: 180_000 });
      await promoteDeployment(product.vercelProjectId, deploy.id);
      return sha;
    });
    if (merged === null) {
      await rebuildOnTop(requestId, product.repo, pullUrl);
      return;
    }
    await addStep({ requestId, step: "promoted", status: "passed", log: "Production is updated." });
    await setStatus(requestId, "live");
    await linkWorkOrder(request);
  } catch (error) {
    const current = await getRequest(requestId);
    if (current && current.status !== "live" && current.status !== "vetoed") {
      const reason = errorText(error);
      await addStep({ requestId, step: "promoted", status: "failed", log: reason });
      await markNeedsReview(requestId, reason);
    }
    throw error;
  }
}

function isConflict(error: unknown): boolean {
  const text = errorText(error);
  return /\((405|409)\)|not mergeable|merge conflict/i.test(text);
}

/** Another change reached main first and touched the same file. Build this ask again on top of it. */
async function rebuildOnTop(requestId: string, repo: string, pullUrl: string): Promise<void> {
  await closePullRequest(repo, pullUrl).catch(() => undefined);
  await addStep({ requestId, step: "promoted", status: "failed", log: "Another change reached the same files first. Building again on top of it." });
  await updateRequest(requestId, { pullRequestUrl: null, previewUrl: null, screenshotBeforeUrl: null, screenshotAfterUrl: null });
  await setStatus(requestId, "queued", "Building again on top of a newer change.");
}

export async function undo(requestId: string): Promise<void> {
  const request = await getRequest(requestId);
  if (!request) throw new Error("This request was not found.");
  if (request.status !== "live") throw new Error("Only a live change can be undone.");
  if (!request.pullRequestUrl) throw new Error("This change has no pull request to undo.");
  const pullUrl = request.pullRequestUrl;
  const product = productOf(request.customer);
  // Take only this change out of the code, then make that deploy live. Other live changes stay.
  await withMergeLock(product.repo, async () => {
    const sha = await revertPullRequestOnMain(product.repo, pullUrl);
    if (!sha) return;
    const deploy = await waitForDeploy({ projectId: product.vercelProjectId, sha, target: "production", timeoutMs: 180_000 });
    await promoteDeployment(product.vercelProjectId, deploy.id);
  });
  await setStatus(requestId, "undone", `The change was removed from the code, and ${product.name} was updated. Other changes stay live.`);
}

export async function veto(requestId: string): Promise<void> {
  const request = await getRequest(requestId);
  if (!request) throw new Error("This request was not found.");
  const { steps } = await getState();
  const logs = steps.filter((step) => step.requestId === requestId);
  for (let i = logs.length - 1; i >= 0; i--) {
    const name = sandboxNameFromLog(logs[i]?.log ?? null);
    if (!name) continue;
    await stopSandbox(name).catch(() => undefined);
    break;
  }
  if (request.pullRequestUrl) await closePullRequest(productOf(request.customer).repo, request.pullRequestUrl).catch(() => undefined);
  await setStatus(requestId, "vetoed", "The build was stopped.");
}
