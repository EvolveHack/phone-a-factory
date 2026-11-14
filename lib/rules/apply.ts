// First matching rule wins. Unknown facts go to a person, never to goes live.
import type { CustomerId } from "../../contract/view";
import type { Fact, Facts, RuleResult } from "../../contract/types";

const CUSTOMER_NAME: Record<CustomerId, string> = {
  "mesa-lane": "Mesa Lane",
  pinecrest: "Pinecrest",
};

function flagged(fact: Fact): boolean {
  return fact.value === true || fact.value === "unknown";
}

export function applyRules(facts: Facts, customer: CustomerId): RuleResult {
  const name = CUSTOMER_NAME[customer];

  if (flagged(facts.changesAccess)) {
    return {
      rule: "R1",
      ending: "needs_person",
      approver: "security_lead",
      reason: `This changes who can see what for ${name}, so the security lead reviews it first.`,
    };
  }
  if (flagged(facts.touchesMoney)) {
    return {
      rule: "R2",
      ending: "needs_person",
      approver: "engineering_lead",
      reason: `This touches money for ${name}, so the engineering lead reviews it first.`,
    };
  }
  if (flagged(facts.changesDataOrCalculation)) {
    return {
      rule: "R3",
      ending: "needs_person",
      approver: "engineering_lead",
      reason: `This changes saved data or a calculation for ${name}, so the engineering lead reviews it first.`,
    };
  }
  if (flagged(facts.appliesToEveryCustomer) || flagged(facts.newScreenOrConnection)) {
    return {
      rule: "R4",
      ending: "needs_person",
      approver: "product_owner",
      reason: `This applies beyond ${name}'s own board, so the product owner reviews it first.`,
    };
  }
  if (facts.displayOnly.value === true) {
    return {
      rule: "R5",
      ending: "goes_live",
      approver: null,
      reason: `This only changes how ${name}'s own board looks.`,
    };
  }
  return {
    rule: "DEFAULT",
    ending: "needs_person",
    approver: "product_owner",
    reason: `This is unclear for ${name}, so the product owner reviews it first.`,
  };
}
