// OWNED BY W2. Signatures are fixed in contract/api.md.
import { linkPullRequest } from "@/lib/factory8090";
import { previousProductionDeployment, rollbackTo, waitForDeploy } from "@/lib/builder/deploy";
import { closePullRequest, mergePullRequest } from "@/lib/builder/github";
import { stopSandbox } from "@/lib/builder/sandbox";
import { errorText, sandboxNameFromLog } from "@/lib/builder/text";
import { addStep, getRequest, getState, setStatus } from "@/lib/store";
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
  try {
    await addStep({ requestId, step: "promoted", status: "running", log: "Merging the pull request." });
    const sha = await mergePullRequest(request.pullRequestUrl);
    await waitForDeploy({ sha, target: "production", timeoutMs: 180_000 });
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

export async function undo(requestId: string): Promise<void> {
  const request = await getRequest(requestId);
  if (!request) throw new Error("This request was not found.");
  const previous = await previousProductionDeployment();
  await rollbackTo(previous.id);
  await setStatus(requestId, "undone", "Production was restored to the previous deploy.");
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
  if (request.pullRequestUrl) await closePullRequest(request.pullRequestUrl).catch(() => undefined);
  await setStatus(requestId, "vetoed", "The build was stopped.");
}
