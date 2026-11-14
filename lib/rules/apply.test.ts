import assert from "node:assert/strict";
import { test } from "node:test";
import type { CustomerId } from "../../contract/view";
import type { Fact, Facts } from "../../contract/types";
// Node's test runner loads this file directly and needs the .ts extension.
// @ts-expect-error TS5097: allowImportingTsExtensions is off for the Next app.
import { applyRules } from "./apply.ts";

const no: Fact = { value: false, quote: "the board" };
const yes: Fact = { value: true, quote: "the board" };
const unknown: Fact = { value: "unknown", quote: null };

function facts(over: Partial<Facts> = {}): Facts {
  return {
    changesAccess: no,
    touchesMoney: no,
    changesDataOrCalculation: no,
    appliesToEveryCustomer: no,
    newScreenOrConnection: no,
    displayOnly: no,
    ...over,
  };
}

function expectRule(customer: CustomerId, over: Partial<Facts>, rule: string, ending: string, approver: string | null) {
  const result = applyRules(facts(over), customer);
  assert.equal(result.rule, rule);
  assert.equal(result.ending, ending);
  assert.equal(result.approver, approver);
  assert.equal(result.reason.endsWith("."), true);
  assert.equal(result.reason.includes("."), true);
  assert.equal(result.reason.slice(0, -1).includes("."), false);
  const name = customer === "mesa-lane" ? "Mesa Lane" : "Pinecrest";
  assert.equal(result.reason.includes(name), true);
  return result;
}

test("R1 true sends who-can-see-what to the security lead", () => {
  expectRule("mesa-lane", { changesAccess: yes }, "R1", "needs_person", "security_lead");
});

test("R1 unknown sends the ask to the security lead", () => {
  expectRule("pinecrest", { changesAccess: unknown }, "R1", "needs_person", "security_lead");
});

test("R1 wins when money is also true", () => {
  expectRule(
    "mesa-lane",
    { changesAccess: yes, touchesMoney: yes },
    "R1",
    "needs_person",
    "security_lead",
  );
});

test("R2 true sends money to the engineering lead", () => {
  expectRule("pinecrest", { touchesMoney: yes }, "R2", "needs_person", "engineering_lead");
});

test("R2 unknown sends the ask to the engineering lead", () => {
  expectRule("mesa-lane", { touchesMoney: unknown }, "R2", "needs_person", "engineering_lead");
});

test("R3 true sends data or calculation changes to the engineering lead", () => {
  expectRule("mesa-lane", { changesDataOrCalculation: yes }, "R3", "needs_person", "engineering_lead");
});

test("R3 unknown sends the ask to the engineering lead", () => {
  expectRule("pinecrest", { changesDataOrCalculation: unknown }, "R3", "needs_person", "engineering_lead");
});

test("R4 true when the change applies to every customer", () => {
  expectRule("mesa-lane", { appliesToEveryCustomer: yes }, "R4", "needs_person", "product_owner");
});

test("R4 true when the change adds a new screen or connection", () => {
  expectRule("pinecrest", { newScreenOrConnection: yes }, "R4", "needs_person", "product_owner");
});

test("R4 unknown on a new screen sends the ask to the product owner", () => {
  expectRule("mesa-lane", { newScreenOrConnection: unknown }, "R4", "needs_person", "product_owner");
});

test("R4 unknown when it may apply to every customer", () => {
  expectRule("pinecrest", { appliesToEveryCustomer: unknown }, "R4", "needs_person", "product_owner");
});

test("R5 display-only goes live with no approver", () => {
  const result = expectRule("mesa-lane", { displayOnly: yes }, "R5", "goes_live", null);
  assert.equal(result.reason, "This only changes how Mesa Lane's own board looks.");
});

test("R5 names Pinecrest when that customer called", () => {
  const result = expectRule("pinecrest", { displayOnly: yes }, "R5", "goes_live", null);
  assert.equal(result.reason, "This only changes how Pinecrest's own board looks.");
});

test("R5 does not match when the display fact is only unknown", () => {
  expectRule("mesa-lane", { displayOnly: unknown }, "DEFAULT", "needs_person", "product_owner");
});

test("DEFAULT when every fact is false", () => {
  expectRule("pinecrest", {}, "DEFAULT", "needs_person", "product_owner");
});
