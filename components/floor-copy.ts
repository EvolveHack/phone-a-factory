import type {
  ApproverRole,
  BuildStep,
  BuildStepName,
  Ending,
  Facts,
  FactoryRequest,
  RuleId,
  Status,
} from "@/contract/types";
import { APPROVERS } from "@/contract/types";

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

const PARALLEL = 3;
const BUILDING: Status[] = ["building", "checking", "approved"];

function typicalBuildMinutes(requests: FactoryRequest[]): number {
  const took = requests
    .map((r) => {
      const start = r.statusTimes.building;
      const end = r.statusTimes.live ?? r.statusTimes.waiting_for_approval;
      return start && end ? (Date.parse(end) - Date.parse(start)) / 60000 : null;
    })
    .filter((m): m is number => m != null && m > 0)
    .sort((a, b) => a - b);
  return took.length ? took[Math.floor(took.length / 2)] : 4;
}

/** For a queued ask: how many asks are ahead of it and a rough wait. Null when it is not queued. */
export function queueWait(request: FactoryRequest, requests: FactoryRequest[]): string | null {
  if (request.status !== "queued") return null;
  const queued = requests
    .filter((r) => r.status === "queued")
    .sort((a, b) => {
      const pa = a.rule?.ending === "goes_live" ? 0 : 1;
      const pb = b.rule?.ending === "goes_live" ? 0 : 1;
      return pa - pb || a.createdAt.localeCompare(b.createdAt);
    });
  const ahead = queued.findIndex((r) => r.id === request.id);
  const building = requests.filter((r) => BUILDING.includes(r.status)).length;
  const freeNow = Math.max(0, PARALLEL - building);
  if (ahead < freeNow) return "Starting now.";
  const rounds = Math.ceil((ahead - freeNow + 1) / PARALLEL);
  const minutes = Math.max(1, Math.round(rounds * typicalBuildMinutes(requests)));
  const before = building + ahead;
  return `Waiting for ${before} ${before === 1 ? "build" : "builds"} ahead. About ${minutes} min.`;
}

/** One line that says what is happening to an ask right now. */
export function statusLine(request: FactoryRequest, steps: BuildStep[], requests: FactoryRequest[]): string {
  switch (request.status) {
    case "received":
    case "classified":
      return "Reading the ask.";
    case "queued":
      return queueWait(request, requests) ?? "Waiting to build.";
    case "building":
      return "An agent is making the change.";
    case "checking": {
      const shown = visibleSteps(steps, request.id);
      const last = shown[shown.length - 1];
      return last ? STEP_LABEL[last.step] : "Starting checks.";
    }
    case "waiting_for_approval":
      return request.rule?.approver ? `Waiting for the ${APPROVERS[request.rule.approver].toLowerCase()}.` : "Waiting for a person.";
    case "approved":
      return "Approved. Going live.";
    case "live":
      return "Live. Other customers unchanged.";
    default:
      return `${STATUS_LABEL[request.status]}.`;
  }
}

/** What each fact from the call means, in the order the rules read them. */
export const FACT_LABEL: Record<keyof Facts, string> = {
  changesAccess: "Changes who can see what",
  touchesMoney: "Touches money",
  controlsDevices: "Changes how physical devices behave",
  changesDataOrCalculation: "Changes saved data or a calculation",
  appliesToEveryCustomer: "Applies to every customer",
  newScreenOrConnection: "Adds a shared screen or an outside connection",
  displayOnly: "Only changes the caller's own product",
};

/** The rules in the order they are read. The first one that fits wins. */
export const RULES: { id: RuleId; when: string; ending: Ending; approver: ApproverRole | null }[] = [
  { id: "R1", when: "The ask changes who can see what.", ending: "needs_person", approver: "security_lead" },
  { id: "R2", when: "The ask touches money.", ending: "needs_person", approver: "engineering_lead" },
  { id: "R6", when: "The ask changes how physical devices behave.", ending: "needs_person", approver: "safety_lead" },
  { id: "R3", when: "The ask changes saved data or a calculation.", ending: "needs_person", approver: "engineering_lead" },
  { id: "R4", when: "The ask reaches beyond the caller's own product.", ending: "needs_person", approver: "product_owner" },
  { id: "R5", when: "The ask only changes the caller's own product.", ending: "goes_live", approver: null },
  { id: "DEFAULT", when: "The ask is unclear.", ending: "needs_person", approver: "product_owner" },
];
