// First matching rule wins. Unknown facts go to a person, never to goes live.
// Takes plain names (not ids) so Node's test runner can load this file on its own.
import type { Fact, Facts, RuleResult } from "../../contract/types";

export type Names = { customer: string; product: string };

function flagged(fact: Fact): boolean {
  return fact.value === true || fact.value === "unknown";
}

export function applyRules(facts: Facts, names: Names): RuleResult {
  const { customer, product } = names;

  if (flagged(facts.changesAccess)) {
    return {
      rule: "R1",
      ending: "needs_person",
      approver: "security_lead",
      reason: `This changes who can see what in ${product} for ${customer}, so the security lead reviews it first.`,
    };
  }
  if (flagged(facts.touchesMoney)) {
    return {
      rule: "R2",
      ending: "needs_person",
      approver: "engineering_lead",
      reason: `This touches money in ${product} for ${customer}, so the engineering lead reviews it first.`,
    };
  }
  if (flagged(facts.controlsDevices)) {
    return {
      rule: "R6",
      ending: "needs_person",
      approver: "safety_lead",
      reason: `This changes how physical devices behave in ${product} for ${customer}, so the safety lead reviews it first.`,
    };
  }
  if (flagged(facts.changesDataOrCalculation)) {
    return {
      rule: "R3",
      ending: "needs_person",
      approver: "engineering_lead",
      reason: `This changes saved data or a calculation in ${product} for ${customer}, so the engineering lead reviews it first.`,
    };
  }
  if (flagged(facts.appliesToEveryCustomer) || flagged(facts.newScreenOrConnection)) {
    return {
      rule: "R4",
      ending: "needs_person",
      approver: "product_owner",
      reason: `This reaches beyond ${customer}'s own ${product}, so the product owner reviews it first.`,
    };
  }
  if (facts.displayOnly.value === true) {
    return {
      rule: "R5",
      ending: "goes_live",
      approver: null,
      reason: `This only changes ${product} for ${customer}, so it can go live now.`,
    };
  }
  return {
    rule: "DEFAULT",
    ending: "needs_person",
    approver: "product_owner",
    reason: `This is unclear for ${customer} in ${product}, so the product owner reviews it first.`,
  };
}
