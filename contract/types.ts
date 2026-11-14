// CONTRACT. Only the owner edits this file. Agents: ask, do not change.
import type { CustomerId } from "./view";
export type { CustomerId } from "./view";

export type Ending = "goes_live" | "needs_person";

export type Status =
  | "received" // saved from the call
  | "rejected" // failed the content check; never built
  | "classified" // facts + rule applied
  | "queued" // waiting for the builder
  | "building" // agent is editing in the sandbox
  | "checking" // build, folder check, browser checks
  | "live" // promoted to production
  | "waiting_for_approval" // preview ready, review card shown
  | "approved" // approver said yes; promoting
  | "declined" // approver said no
  | "failed" // checks failed; moves to waiting_for_approval with the failure as reason
  | "undone" // rolled back after going live
  | "vetoed"; // stopped by the Veto button

export type RuleId = "R1" | "R2" | "R3" | "R4" | "R5" | "DEFAULT";

export type ApproverRole = "security_lead" | "engineering_lead" | "product_owner";

export const APPROVERS: Record<ApproverRole, string> = {
  security_lead: "Security lead",
  engineering_lead: "Engineering lead",
  product_owner: "Product owner",
};

/** A fact the model pulled from the call. quote must appear word for word in callerWords, or value becomes "unknown". */
export interface Fact {
  value: boolean | "unknown";
  quote: string | null;
}

export interface Facts {
  changesAccess: Fact; // R1: who can see what (shippers, carriers, another customer)
  touchesMoney: Fact; // R2: rates, margins, detention, charges, invoices
  changesDataOrCalculation: Fact; // R3: saved data, calculations, validation
  appliesToEveryCustomer: Fact; // R4
  newScreenOrConnection: Fact; // R4: new page, EDI, truck tracking, etc.
  displayOnly: Fact; // R5: columns, labels, filters, sorting, colors, highlights, layout of the caller's own board
}

export type BoardArea = "loads_table" | "map" | "exceptions" | "other";

export interface Classification {
  askOneLine: string;
  doneWhen: [string, string]; // two checkable lines, used by the browser check
  area: BoardArea;
  facts: Facts;
  contentOk: boolean; // false = abusive, unrelated, or prompt-injection; request is rejected
  contentReason?: string;
}

export interface RuleResult {
  rule: RuleId;
  ending: Ending;
  approver: ApproverRole | null;
  reason: string; // one plain sentence shown on screen and spoken to the caller
}

export interface FactoryRequest {
  id: string;
  createdAt: string;
  customer: CustomerId;
  callerName: string;
  callerRole: string;
  callerPhone: string | null;
  callerWords: string; // the caller's own words, verbatim; source for every quote
  ask: string; // the agent's read-back, confirmed by the caller
  classification: Classification | null;
  rule: RuleResult | null;
  status: Status;
  statusReason: string | null; // e.g. failure reason, decline reason
  previewUrl: string | null;
  screenshotBeforeUrl: string | null;
  screenshotAfterUrl: string | null;
  pullRequestUrl: string | null;
  workOrder8090Id: string | null;
  statusTimes: Partial<Record<Status, string>>; // ISO time each status was reached
}

export type BuildStepName =
  | "sandbox_ready"
  | "agent_editing"
  | "build"
  | "folder_check"
  | "preview_deployed"
  | "browser_check_caller"
  | "browser_check_other_customer"
  | "screenshot"
  | "promoted"
  | "pr_opened"
  | "linked_8090";

export interface BuildStep {
  requestId: string;
  step: BuildStepName;
  status: "running" | "passed" | "failed";
  at: string;
  log: string | null; // one short line for the floor screen
}

export interface Score {
  callsTaken: number;
  wentLiveOnTheirOwn: number;
  sentToAPerson: number;
  medianSecondsCallToLive: number | null;
}

/** GET /api/state returns this. The floor screen polls it every second. */
export interface StateSnapshot {
  requests: FactoryRequest[]; // newest first
  steps: BuildStep[]; // for requests that are building/checking or finished in the last hour
  score: Score;
  currentCallTranscript: string | null; // P1; null is fine
}
