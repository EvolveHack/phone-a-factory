import assert from "node:assert/strict";
import { test } from "node:test";
// Node's test runner loads this file directly and needs the .ts extension.
// @ts-expect-error TS5097: allowImportingTsExtensions is off for the Next app.
import { customerFromCompany as match } from "./customer.ts";
// @ts-expect-error TS5097: see above.
import { PRODUCTS } from "../../contract/products.ts";

const customerFromCompany = (company: string) => match(company, Object.values(PRODUCTS));

test("maps Mesa Lane names, including a short form", () => {
  assert.equal(customerFromCompany("Mesa Lane"), "mesa-lane");
  assert.equal(customerFromCompany("mesa lane freight"), "mesa-lane");
  assert.equal(customerFromCompany("Mesa Lane Freight"), "mesa-lane");
  assert.equal(customerFromCompany("mesa-lane"), "mesa-lane");
  assert.equal(customerFromCompany("Mesa"), "mesa-lane");
});

test("maps Pinecrest names", () => {
  assert.equal(customerFromCompany("Pinecrest"), "pinecrest");
  assert.equal(customerFromCompany("Pinecrest Logistics"), "pinecrest");
  assert.equal(customerFromCompany("Pine Crest"), "pinecrest");
});

test("maps every other customer by full name and short form", () => {
  const cases: [string, string][] = [
    ["Lumen Analytics", "lumen"],
    ["Lumen", "lumen"],
    ["Cedar Health", "cedar"],
    ["Granite Supply", "granite"],
    ["Bluewater Distributors", "bluewater"],
    ["Blue Water", "bluewater"],
    ["FreshFare Markets", "freshfare"],
    ["Fresh Fair", "freshfare"],
    ["Northgate Warehousing", "northgate"],
    ["North Gate", "northgate"],
    ["Willow Pine Home", "willow"],
    ["Willow", "willow"],
    ["Summit Outdoor", "summit"],
    ["Summit", "summit"],
  ];
  for (const [said, id] of cases) assert.equal(customerFromCompany(said), id, said);
});

test("asks again when the company is not a customer", () => {
  assert.equal(customerFromCompany("Acme Trucking"), null);
  assert.equal(customerFromCompany("Logistics"), null);
  assert.equal(customerFromCompany(""), null);
});
