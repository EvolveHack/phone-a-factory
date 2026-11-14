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

export const screenshotScript = `${LAUNCH}
try {
  const page = await browser.newPage({ viewport: { width: 700, height: 900 } });
  await page.setExtraHTTPHeaders(bypassHeaders());
  await page.goto(process.env.PAGE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector("[data-testid=board]", { timeout: 30000 });
  await page.locator("[data-testid=board]").screenshot({ path: process.env.OUT_PATH });
  await browser.close();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
`;
