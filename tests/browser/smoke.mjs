// Opens the real page in Chromium and clicks through it: every tab, the search and details popup, the theme button, and a phone-width
// layout. Fails on any script error. Not a tests/*.test.mjs file, since it needs Playwright:
//   npm i --no-save playwright && npx playwright install chromium && node tests/browser/smoke.mjs
// (where Playwright is installed globally instead: NODE_PATH="$(npm root -g)" node tests/browser/smoke.mjs)
import { createRequire } from "module";
import { fileURLToPath } from "url";
import assert from "assert/strict";

const { chromium } = createRequire(import.meta.url)("playwright");
const page_url = new URL("../../index.html", import.meta.url).href;
let passed = 0;
const t = async (name, fn) => { await fn(); passed++; console.log("ok", name); };

const browser = await chromium.launch();
// a fresh page; errs collects uncaught errors and console errors (a font or image that can't load offline isn't one)
async function open(opts = {}) {
  const page = await browser.newPage({ viewport: { width: 1300, height: 850 }, ...opts }), errs = [];
  page.on("pageerror", e => errs.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource|net::ERR_/.test(m.text())) errs.push(m.text()); });
  await page.goto(page_url);
  await page.waitForSelector('[data-tabbtn="char"][aria-selected="true"]');
  return { page, errs };
}
const tabs = page => page.$$eval("[data-tabbtn]", bs => bs.map(b => b.dataset.tabbtn));

try {
  await t("every tab opens its own panel, with no script errors", async () => {
    const { page, errs } = await open();
    for (const tab of await tabs(page)) {
      await page.click(`[data-tabbtn="${tab}"]`);
      const shown = await page.$$eval("[data-tab]", els => [...new Set(els.filter(el => !el.hidden).map(el => el.dataset.tab))]);
      assert.deepEqual(shown, [tab], `tab ${tab}`);   // a tab can have several panels: only its own show
      assert.equal(await page.getAttribute(`[data-tabbtn="${tab}"]`, "aria-selected"), "true");
    }
    assert.deepEqual(errs, []);
    await page.close();
  });

  await t("Ctrl+K finds a monster and Enter opens its details popup", async () => {
    const { page, errs } = await open();
    await page.keyboard.press("Control+k");
    await page.waitForSelector("#jump[open]");
    await page.fill("#jumpInput", "Poring");
    await page.waitForSelector('#jumpList [aria-selected="true"]');
    await page.keyboard.press("Enter");
    await page.waitForSelector("#infoDlg[open]");
    assert.match(await page.textContent("#infoDlgTitle"), /Poring/);
    assert.deepEqual(errs, []);
    await page.close();
  });

  await t("the theme button cycles auto → light → dark, and the sidebar follows", async () => {
    const { page, errs } = await open({ colorScheme: "light" });
    // the sidebar's background brightness, 0 (black) to 255 (white)
    const sideLum = () => page.$eval(".side", el => {
      const [r, g, b] = getComputedStyle(el).backgroundColor.match(/\d+/g).map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    });
    assert.ok(await sideLum() > 200, "auto on a light device: light sidebar");
    await page.click("#themeBtn");
    assert.equal(await page.getAttribute("html", "data-theme"), "light");
    assert.ok(await sideLum() > 200, "light: light sidebar");
    await page.click("#themeBtn");
    assert.equal(await page.getAttribute("html", "data-theme"), "dark");
    assert.ok(await sideLum() < 40, "dark: dark sidebar");
    await page.click("#themeBtn");
    assert.equal(await page.getAttribute("html", "data-theme"), null);
    assert.deepEqual(errs, []);
    await page.close();
  });

  await t("phone width: no tab scrolls sideways", async () => {
    const { page, errs } = await open({ viewport: { width: 390, height: 800 } });
    for (const tab of await tabs(page)) {
      await page.click(`[data-tabbtn="${tab}"]`);
      const [sw, w] = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
      assert.ok(sw <= w, `tab ${tab} is ${sw}px wide in a ${w}px window`);
    }
    assert.deepEqual(errs, []);
    await page.close();
  });
} finally {
  await browser.close();
}
console.log(`${passed} tests passed`);
