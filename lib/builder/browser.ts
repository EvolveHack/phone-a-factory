const LAUNCH = `import { createRequire } from "node:module";

const require = createRequire(process.env.BOARD_PACKAGE_JSON);
const { chromium } = require("playwright");

function bypassHeaders() {
  const secret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (!secret) return {};
  return {
    "x-vercel-protection-bypass": secret,
    "x-vercel-set-bypass-cookie": "true",
  };
}

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
`;

export const compareScript = `${LAUNCH}
async function readTable(url) {
  const page = await browser.newPage({ viewport: { width: 700, height: 900 } });
  await page.setExtraHTTPHeaders(bypassHeaders());
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("[data-testid=board]", { timeout: 30000 });
  const table = await page.evaluate(() => {
    const root = document.querySelector("[data-testid=loads-table]");
    if (!root) return { headers: [], rows: [] };
    const headers = [...root.querySelectorAll("[data-testid^=column-header-]")].map((el) => ({
      id: el.getAttribute("data-testid"),
      text: (el.textContent || "").replace(/\\s+/g, " ").trim(),
    }));
    const rows = [...root.querySelectorAll("[data-testid^=load-row-]")].map((el) => ({
      id: el.getAttribute("data-testid"),
      highlight: el.getAttribute("data-highlight") || "",
    }));
    return { headers, rows };
  });
  await page.close();
  return table;
}

try {
  const production = await readTable(process.env.PROD_URL);
  const preview = await readTable(process.env.PREVIEW_URL);
  await browser.close();
  if (JSON.stringify(production) === JSON.stringify(preview)) {
    console.log("SAME");
  } else {
    console.log("DIFFERENT");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
`;

/** ROOT_SELECTOR set (Dispatch Board): shoot that element. Not set: shoot the page once it has loaded. */
export const screenshotScript = `${LAUNCH}
try {
  const page = await browser.newPage({ viewport: { width: 700, height: 900 } });
  await page.setExtraHTTPHeaders(bypassHeaders());
  await page.goto(process.env.PAGE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  const root = process.env.ROOT_SELECTOR;
  if (root) {
    await page.waitForSelector(root, { timeout: 30000 });
    await page.locator(root).screenshot({ path: process.env.OUT_PATH });
  } else {
    await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => undefined);
    await page.screenshot({ path: process.env.OUT_PATH });
  }
  await browser.close();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
`;

/** For a change to view.json only: the preview must show exactly the new columns, in order, and every filter. */
export const fastCheckScript = `${LAUNCH}
import { readFileSync } from "node:fs";
try {
  const view = JSON.parse(readFileSync(process.env.VIEW_PATH, "utf8"));
  const page = await browser.newPage({ viewport: { width: 700, height: 900 } });
  await page.setExtraHTTPHeaders(bypassHeaders());
  await page.goto(process.env.PAGE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("[data-testid=loads-table]", { timeout: 30000 });
  const headers = await page.locator("[data-testid^=column-header-]").evaluateAll((els) =>
    els.map((el) => ({ id: el.getAttribute("data-testid"), text: (el.textContent || "").replace(/\\s+/g, " ").trim() })));
  const want = (view.columns || []).map((c) => ({ id: "column-header-" + c.key, text: String(c.label).trim() }));
  if (JSON.stringify(headers) !== JSON.stringify(want)) {
    console.log("ASSERT_FAIL columns " + JSON.stringify(headers) + " expected " + JSON.stringify(want));
    process.exit(1);
  }
  for (const f of view.filters || []) {
    if ((await page.locator("[data-testid=filter-" + f.key + "]").count()) === 0) {
      console.log("ASSERT_FAIL missing filter " + f.key);
      process.exit(1);
    }
  }
  if (view.title && !(await page.locator("[data-testid=board-title]").innerText()).includes(view.title)) {
    console.log("ASSERT_FAIL title");
    process.exit(1);
  }
  await browser.close();
  console.log("PASS");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
`;
