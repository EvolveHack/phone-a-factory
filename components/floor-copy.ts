import type {
  ApproverRole,
  BuildStep,
  BuildStepName,
  Ending,
  FactoryRequest,
  Status,
} from "@/contract/types";
import { APPROVERS } from "@/contract/types";
import { CUSTOMERS } from "@/contract/view";

export const PHONE_LINE = "Call +1 408 762 6927";

const STEP_ORDER: BuildStepName[] = [
  "sandbox_ready",
  "agent_editing",
  "build",
  "folder_check",
  "preview_deployed",
  "browser_check_caller",
  "browser_check_other_customer",
  "screenshot",
  "promoted",
  "pr_opened",
  "linked_8090",
];

const LAST_VISIBLE = STEP_ORDER.indexOf("browser_check_other_customer");

export const STATUS_LABEL: Record<Status, string> = {
  received: "Received",
  rejected: "Rejected",
  classified: "Classified",
  queued: "Queued",
  building: "Building",
  checking: "Checking",
  live: "Live",
  waiting_for_approval: "Waiting for approval",
  approved: "Approved",
  declined: "Declined",
  failed: "Failed",
  undone: "Undone",
  vetoed: "Vetoed",
};

export const STEP_LABEL: Record<BuildStepName, string> = {
  sandbox_ready: "Sandbox ready",
  agent_editing: "Editing the board",
  build: "Build",
  folder_check: "Folder check",
  preview_deployed: "Preview is up",
  browser_check_caller: "Caller's board checked",
  browser_check_other_customer: "Other customer unchanged.",
  screenshot: "Screenshot",
  promoted: "Promoted",
  pr_opened: "Pull request opened",
  linked_8090: "Record linked",
};

export const STEP_MARK: Record<BuildStep["status"], string> = {
  running: "Running",
  passed: "Passed",
  failed: "Failed",
};

export function customerName(id: FactoryRequest["customer"]): string {
  return CUSTOMERS[id].name;
}

export function endingBadge(ending: Ending, approver: ApproverRole | null): string {
  if (ending === "goes_live") return "Goes live";
  if (!approver) return "Needs a person";
  return `Needs a person: ${APPROVERS[approver]}`;
}

export function secondsSince(iso: string, now: number): string {
  const seconds = Math.max(0, Math.floor((now - Date.parse(iso)) / 1000));
  if (seconds < 60) return `${seconds} sec ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

const ACTIVE: Status[] = ["received", "classified", "queued", "building", "checking", "approved", "waiting_for_approval", "live"];

/** Active asks first (newest first), then the newest finished ones, up to `limit` in all. */
export function queueOrder(requests: FactoryRequest[], limit = 8): FactoryRequest[] {
  const sorted = newestFirst(requests);
  const active = sorted.filter((request) => ACTIVE.includes(request.status));
  const done = sorted.filter((request) => !ACTIVE.includes(request.status));
  return [...active, ...done].slice(0, Math.max(limit, active.length));
}

export function formatCallToLive(seconds: number | null): string {
  if (seconds == null) return "Not yet";
  if (seconds < 60) return seconds === 1 ? "1 sec" : `${seconds} sec`;
  const minutes = Math.round(seconds / 60);
  return minutes === 1 ? "1 min" : `${minutes} min`;
}

export function shareOf(part: number, whole: number): string {
  if (whole <= 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

export function newestFirst(requests: FactoryRequest[]): FactoryRequest[] {
  return [...requests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function currentBuild(requests: FactoryRequest[]): FactoryRequest | null {
  const active = requests.filter((request) => request.status === "building" || request.status === "checking");
  active.sort((a, b) => {
    const aAt = a.statusTimes[a.status] ?? a.createdAt;
    const bAt = b.statusTimes[b.status] ?? b.createdAt;
    return bAt.localeCompare(aAt);
  });
  return active[0] ?? null;
}

/** Steps after "Other customer unchanged." stay off the floor screen. */
export function visibleSteps(steps: BuildStep[], requestId: string): BuildStep[] {
  const allowed = STEP_ORDER.slice(0, LAST_VISIBLE + 1);
  const latest = new Map<BuildStepName, BuildStep>();
  for (const step of steps) {
    if (step.requestId !== requestId || !allowed.includes(step.step)) continue;
    const prev = latest.get(step.step);
    if (!prev || prev.at <= step.at) latest.set(step.step, step);
  }
  return allowed.flatMap((name) => {
    const step = latest.get(name);
    return step ? [step] : [];
  });
}

export function safeBoardBase(boardUrl: string): string | null {
  const trimmed = boardUrl.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.origin}${url.pathname.replace(/\/$/, "")}`;
  } catch {
    return null;
  }
}

export function boardSrc(base: string, path: string, reload: number): string {
  const src = `${base}${path}`;
  return reload > 0 ? `${src}?reload=${reload}` : src;
}
