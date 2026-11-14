import assert from "node:assert/strict";
import { test } from "node:test";
// Node's test runner loads this file directly and needs the .ts extension.
// @ts-expect-error TS5097: allowImportingTsExtensions is off for the Next app.
import { customerFromCompany } from "./customer.ts";

test("maps Mesa Lane names, including a short form", () => {
  assert.equal(customerFromCompany("Mesa Lane"), "mesa-lane");
  assert.equal(customerFromCompany("mesa lane freight"), "mesa-lane");
  assert.equal(customerFromCompany("Mesa Lane Freight"), "mesa-lane");
  assert.equal(customerFromCompany("mesa-lane"), "mesa-lane");
});

test("maps Pinecrest names", () => {
  assert.equal(customerFromCompany("Pinecrest"), "pinecrest");
  assert.equal(customerFromCompany("Pinecrest Logistics"), "pinecrest");
});

test("asks again when the company is not one of the two", () => {
  assert.equal(customerFromCompany("Acme Trucking"), null);
  assert.equal(customerFromCompany(""), null);
});
