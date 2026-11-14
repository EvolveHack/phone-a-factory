import assert from "node:assert/strict";
import { test } from "node:test";
import type { Fact, Facts } from "../../contract/types";
// Node's test runner loads this file directly and needs the .ts extension.
// @ts-expect-error TS5097: allowImportingTsExtensions is off for the Next app.
import { enforceQuotes } from "./quotes.ts";

const kept: Fact = { value: true, quote: "in red" };
const missing: Fact = { value: false, quote: null };
const invented: Fact = { value: true, quote: "not said" };

function facts(over: Partial<Facts> = {}): Facts {
  return {
    changesAccess: missing,
    touchesMoney: missing,
    changesDataOrCalculation: missing,
    appliesToEveryCustomer: missing,
    newScreenOrConnection: missing,
    controlsDevices: missing,
    displayOnly: kept,
    ...over,
  };
}

const caller = "show any load more than thirty minutes late in red and put those at the top";

test("keeps a quote that appears in the caller words, ignoring case", () => {
  const result = enforceQuotes(facts({ displayOnly: { value: true, quote: "In Red" } }), caller);
  assert.deepEqual(result.displayOnly, { value: true, quote: "In Red" });
});

test("sets unknown when the quote is missing, blank, or not in the caller words", () => {
  const result = enforceQuotes(
    facts({
      changesAccess: missing,
      touchesMoney: { value: false, quote: "   " },
      displayOnly: invented,
    }),
    caller,
  );
  assert.deepEqual(result.changesAccess, { value: "unknown", quote: null });
  assert.deepEqual(result.touchesMoney, { value: "unknown", quote: null });
  assert.deepEqual(result.displayOnly, { value: "unknown", quote: null });
  assert.deepEqual(result.controlsDevices, { value: "unknown", quote: null });
});
