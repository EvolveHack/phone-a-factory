import type { FactoryRequest } from "@/contract/types";
import { allowedFileList, customerName, otherCustomer } from "@/lib/builder/env";
import type { Ending } from "@/contract/types";
import type { CustomerId } from "@/contract/view";

function limits(customer: CustomerId, ending: Ending): string[] {
  const files = allowedFileList(customer, ending).map((file) => `- ${file}`);
  if (ending === "goes_live") {
    return [
      "You may edit only these files:",
      ...files,
      "Do not edit any other file.",
    ];
  }
  return [
    "You may edit these files:",
    ...files,
    "You may also edit shared code.",
    `Do not edit tenants/${otherCustomer(customer)}/.`,
    "Do not edit contract/.",
  ];
}

export function editPrompt(request: FactoryRequest, ending: Ending): string {
  const done = request.classification?.doneWhen ?? [request.ask, "The board shows that change."];
  return [
    `Most changes only edit tenants/${request.customer}/view.json. Edit that file first.`,
    "",
    `Customer id: ${request.customer}`,
    `Company: ${customerName(request.customer)}`,
    `Ask: ${request.ask}`,
    "Done when:",
    `1. ${done[0]}`,
    `2. ${done[1]}`,
    "",
    "Read AGENTS.md, docs/TESTIDS.md, contract/view.ts, and the customer's view.json before you edit.",
    "Keep every data-testid in docs/TESTIDS.md.",
    ...limits(request.customer, ending),
    "Do not commit, push, or deploy. Leave the change in the working tree.",
    "Do not read, print, or copy environment variables or secrets.",
  ].join("\n");
}

export function fixPrompt(request: FactoryRequest, ending: Ending, buildOutput: string): string {
  return [
    "The build failed. Fix the error in the files you are allowed to edit.",
    `Most fixes belong in tenants/${request.customer}/view.json.`,
    ...limits(request.customer, ending),
    "Do not commit, push, or deploy.",
    "Do not read, print, or copy environment variables or secrets.",
    "",
    "Build output:",
    buildOutput.slice(-4000),
  ].join("\n");
}

export function checkPrompt(request: FactoryRequest, previewPage: string): string {
  const done = request.classification?.doneWhen ?? [request.ask, "The board shows that change."];
  return [
    "Write the file /tmp/check-caller.mjs and no other file.",
    "Write JavaScript only. Do not use markdown.",
    "The script is an ES module. It checks the caller's board and then exits.",
    "Exit 0 when both done-when lines are true.",
    "When a done-when line is false, print ASSERT_FAIL and that line, then exit 1.",
    "Use the test ids in docs/TESTIDS.md. The important ones are:",
    "- [data-testid=board]",
    "- [data-testid=loads-table]",
    "- [data-testid^=column-header-] for column labels, in display order",
    "- [data-testid^=load-row-] for rows, in display order, with data-highlight",
    "- [data-testid^=filter-] for filters",
    "- [data-testid=exceptions-panel] and [data-testid^=exception-] with data-detention-minutes and data-detention-charge",
    "",
    `Open this page: ${previewPage}`,
    "Done when:",
    `1. ${done[0]}`,
    `2. ${done[1]}`,
    "",
    "Start from this script and replace the check section:",
    CHECK_SKELETON,
  ].join("\n");
}

export function fixCheckPrompt(error: string): string {
  return [
    "The Playwright script at /tmp/check-caller.mjs failed before it could judge the board.",
    "Rewrite /tmp/check-caller.mjs only. Do not edit the product.",
    "Write JavaScript only. Do not use markdown.",
    "Keep the same exit rules: print ASSERT_FAIL and exit 1 when a done-when line is false, exit 0 when both pass.",
    "",
    "Error:",
    error.slice(-2000),
  ].join("\n");
}

const CHECK_SKELETON = `import { createRequire } from "node:module";

const require = createRequire(process.env.BOARD_PACKAGE_JSON);
const { chromium } = require("playwright");
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
const page = await browser.newPage({ viewport: { width: 700, height: 900 } });
const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
if (secret) {
  await page.setExtraHTTPHeaders({
    "x-vercel-protection-bypass": secret,
    "x-vercel-set-bypass-cookie": "true",
  });
}
await page.goto(process.env.PAGE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForSelector("[data-testid=board]", { timeout: 30000 });

// Check both done-when lines here.
// Read rows with: await page.locator("[data-testid^=load-row-]").evaluateAll((els) => els.map((el) => ({
//   id: el.getAttribute("data-testid"),
//   highlight: el.getAttribute("data-highlight") || "",
//   text: (el.textContent || "").replace(/\\\\s+/g, " ").trim(),
// })));

await browser.close();
process.exit(0);
`;
