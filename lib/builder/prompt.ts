import { customerInfo, productOf, tenantDir, type CustomerId } from "@/contract/products";
import type { Ending, FactoryRequest } from "@/contract/types";
import { SHOW_PATH } from "@/lib/builder/browser";

const isFreight = (customer: CustomerId) => productOf(customer).id === "freight";

/** The product's guide for the coding agent: products/<p>/AGENTS.md, or the repo's AGENTS.md for Dispatch Board. */
function guideFiles(customer: CustomerId): { agents: string; testIds: string } {
  const { folder } = productOf(customer);
  if (!folder) return { agents: "AGENTS.md", testIds: "docs/TESTIDS.md" };
  return { agents: `${folder}/AGENTS.md`, testIds: `${folder}/TESTIDS.md` };
}

function limits(customer: CustomerId, ending: Ending): string[] {
  const tenant = tenantDir(customer);
  const { folder, name } = productOf(customer);
  if (ending === "goes_live") {
    const files = isFreight(customer) ? [`- ${tenant}/view.json`, `- ${tenant}/overrides.tsx`] : [`- any file in ${tenant}/`];
    return [
      "You may edit only these files:",
      ...files,
      "Never edit a billing.json file.",
      "Do not edit any other file.",
    ];
  }
  return [
    `You may edit files in ${tenant}/ and shared code${folder ? ` in ${folder}/` : ""}.`,
    `Edit another ${name} customer's folder only when the ask is for every customer.`,
    ...(folder ? [`Do not edit anything outside ${folder}/.`] : []),
    "Do not edit contract/.",
  ];
}

/** Where each kind of change goes. Dispatch Board keeps its detailed map; other products follow their AGENTS.md. */
function placement(request: FactoryRequest): string[] {
  const tenant = tenantDir(request.customer);
  const { agents, testIds } = guideFiles(request.customer);
  if (isFreight(request.customer)) {
    return [
      `Read ${agents}, ${testIds}, contract/view.ts, the customer's view.json, and the customer's overrides.tsx before you edit.`,
      "Where each kind of change goes:",
      `- Columns, labels, filters, sorting, row highlights, hidden panels, title: ${tenant}/view.json.`,
      `- Anything drawn on the map, such as city names or markers: the MapLayer slot in ${tenant}/overrides.tsx. Place items with project(lat, lng) from lib/geo, and use CITIES from lib/loads for lane cities.`,
      `- Colors, fonts, or styling of columns, cells, or panels: the css string in ${tenant}/overrides.tsx, for example ".loads-table td:first-child { ... }".`,
      `- A note or banner above the table: the default export in ${tenant}/overrides.tsx.`,
    ];
  }
  return [
    `Read ${agents} and ${testIds} before you edit. ${agents} says where each kind of change goes.`,
    `This customer's own files are in ${tenant}/. Read every file there before you edit.`,
  ];
}

export function editPrompt(request: FactoryRequest, ending: Ending): string {
  const done = request.classification?.doneWhen ?? [request.ask, "The page shows that change."];
  const product = productOf(request.customer);
  const tenant = tenantDir(request.customer);
  const { testIds } = guideFiles(request.customer);
  return [
    isFreight(request.customer)
      ? `Most changes only edit ${tenant}/view.json. Edit that file first.`
      : `Most changes only edit files in ${tenant}/. Start there.`,
    "",
    `Product: ${product.name}. ${product.what}`,
    `Customer id: ${request.customer}`,
    `Company: ${customerInfo(request.customer).name}`,
    `Ask: ${request.ask}`,
    "Done when:",
    `1. ${done[0]}`,
    `2. ${done[1]}`,
    "",
    ...placement(request),
    "If the ask cannot be done by editing only the files you are allowed to edit, change nothing. Instead write one plain sentence to /tmp/paf-cannot.txt saying what the ask needs and why it is outside those files, for example: \"Showing shipper accounts needs a new shipper screen, which is shared code.\"",
    `Keep every data-testid in ${testIds}.`,
    ...limits(request.customer, ending),
    "",
    ...showSteps(testIds),
    "",
    "Do not commit, push, or deploy. Leave the change in the working tree.",
    "Do not read, print, or copy environment variables or secrets.",
  ].join("\n");
}

/** The agent that made the change knows where it shows, so it writes the steps for the before and after pictures. */
function showSteps(testIds: string): string[] {
  return [
    `After you edit, also write ${SHOW_PATH}. It is the one file you may write outside the repo. It is used to take a before picture and an after picture of your change.`,
    "It is an ES module with one default export: export default async function show(page) { ... }",
    "page is a Playwright page. The customer's page is already open and loaded in a window 700 wide and 900 tall.",
    "Do what a person would do to see the change: open the tab, panel, or menu it is in, type the question or press the button that triggers it and wait for the result, then scroll the changed part to the middle of the window with locator.scrollIntoViewIfNeeded().",
    "When the change only shows for certain data, such as a row over a limit, scroll to a row or item where it shows.",
    `Find elements with the test ids in ${testIds}.`,
    "The same steps also run on the live page before your change, where the new parts do not exist yet. Give every step a timeout of 3000 ms or less, and put the steps that need the new parts last.",
    "Do not import anything, do not assert, do not take the picture, and do not close the page. Keep it under 25 lines.",
  ];
}

export function fixPrompt(request: FactoryRequest, ending: Ending, buildOutput: string): string {
  const tenant = tenantDir(request.customer);
  return [
    "The build failed. Fix the error in the files you are allowed to edit.",
    isFreight(request.customer) ? `Most fixes belong in ${tenant}/view.json.` : `Most fixes belong in ${tenant}/.`,
    ...limits(request.customer, ending),
    "Do not commit, push, or deploy.",
    "Do not read, print, or copy environment variables or secrets.",
    "",
    "Build output:",
    buildOutput.slice(-4000),
  ].join("\n");
}

/** Dispatch Board pages render [data-testid=board]. Other products: wait for the page to load. */
export function rootSelector(customer: CustomerId): string | null {
  return isFreight(customer) ? "[data-testid=board]" : null;
}

export function checkPrompt(request: FactoryRequest, previewPage: string): string {
  const done = request.classification?.doneWhen ?? [request.ask, "The page shows that change."];
  const product = productOf(request.customer);
  const { testIds } = guideFiles(request.customer);
  const ids = isFreight(request.customer)
    ? [
        "Use the test ids in docs/TESTIDS.md. The important ones are:",
        "- [data-testid=board]",
        "- [data-testid=loads-table]",
        "- [data-testid^=column-header-] for column labels, in display order",
        "- [data-testid^=load-row-] for rows, in display order, with data-highlight",
        "- [data-testid^=filter-] for filters",
        "- [data-testid=exceptions-panel] and [data-testid^=exception-] with data-detention-minutes and data-detention-charge",
        "- [data-testid=map-layer] for anything the customer added on the map (for example SVG text with city names)",
        "- [data-testid=customer-css] for the customer's style tag; check styling with getComputedStyle on the element",
      ]
    : [
        `The page is ${product.name} for ${customerInfo(request.customer).name}. ${product.what}`,
        `Read ${testIds} first and use the test ids it lists.`,
      ];
  return [
    "Write the file /tmp/check-caller.mjs and no other file.",
    "Write JavaScript only. Do not use markdown.",
    "The script is an ES module. It checks the caller's page and then exits.",
    "Exit 0 when both done-when lines are true.",
    "When a done-when line is false, print ASSERT_FAIL and that line, then exit 1.",
    ...ids,
    "",
    `Open this page: ${previewPage}`,
    "Done when:",
    `1. ${done[0]}`,
    `2. ${done[1]}`,
    "",
    "Start from this script. Replace the ASSERT_FAIL section with checks for both lines. Exit 0 only when both lines are true.",
    checkSkeleton(rootSelector(request.customer)),
  ].join("\n");
}

export function fixCheckPrompt(error: string): string {
  return [
    "The Playwright script at /tmp/check-caller.mjs failed before it could judge the page.",
    "Rewrite /tmp/check-caller.mjs only. Do not edit the product.",
    "Write JavaScript only. Do not use markdown.",
    "Keep the same exit rules: print ASSERT_FAIL and exit 1 when a done-when line is false, exit 0 when both pass.",
    "",
    "Error:",
    error.slice(-2000),
  ].join("\n");
}

function checkSkeleton(root: string | null): string {
  const wait = root
    ? `await page.waitForSelector("${root}", { timeout: 30000 });`
    : `await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);`;
  const hint = root
    ? `// Read rows with: await page.locator("[data-testid^=load-row-]").evaluateAll((els) => els.map((el) => ({
//   id: el.getAttribute("data-testid"),
//   highlight: el.getAttribute("data-highlight") || "",
//   text: (el.textContent || "").replace(/\\\\s+/g, " ").trim(),
// })));`
    : "// Find elements with the test ids from TESTIDS.md.";
  return `import { createRequire } from "node:module";

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
${wait}

// Check both done-when lines here.
${hint}

await browser.close();
console.log("ASSERT_FAIL The script did not check the done-when lines.");
process.exit(1);
`;
}
