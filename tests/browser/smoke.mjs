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
  await page.waitForSelector('[data-tabbtn="home"][aria-selected="true"]');
  return { page, errs };
}
const tabs = page => page.$$eval("[data-tabbtn]", bs => bs.map(b => b.dataset.tabbtn));

try {
  await t("every tab opens its own panel, with no script errors", async () => {
    const { page, errs } = await open();
    for (const tab of await tabs(page)) {
      await page.click(`[data-tabbtn="${tab}"]`);
      const shown = await page.$$eval("[data-tab]", els => els.filter(el => !el.hidden).map(el => el.dataset.tab.split(" ")));
      assert.ok(shown.length && shown.every(ts => ts.includes(tab)), `tab ${tab}`);   // a tab can have several panels, and a panel several tabs: only its own show
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

  await t("Settings: the theme cycles auto → light → dark, the sidebar follows, and the menu stays open", async () => {
    const { page, errs } = await open({ colorScheme: "light" });
    // the sidebar's background brightness, 0 (black) to 255 (white)
    const sideLum = () => page.$eval(".side", el => {
      const [r, g, b] = getComputedStyle(el).backgroundColor.match(/\d+/g).map(Number);
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    });
    assert.ok(await sideLum() > 200, "auto on a light device: light sidebar");
    assert.ok(!await page.isVisible("#themeBtn"), "theme is in the closed Settings menu");
    await page.click("#setBtn");
    await page.click("#themeBtn");
    assert.equal(await page.getAttribute("html", "data-theme"), "light");
    assert.ok(await sideLum() > 200, "light: light sidebar");
    await page.click("#themeBtn");
    assert.equal(await page.getAttribute("html", "data-theme"), "dark");
    assert.ok(await sideLum() < 40, "dark: dark sidebar");
    await page.click("#themeBtn");
    assert.equal(await page.getAttribute("html", "data-theme"), null);
    assert.ok(await page.isVisible("#setMenu"), "picking a setting keeps the menu open");
    await page.keyboard.press("Escape");
    assert.ok(!await page.isVisible("#setMenu"), "Esc closes it");
    assert.deepEqual(errs, []);
    await page.close();
  });

  await t("the account picker is on the Character tab, the session picker on the Session tab, each with a + New button", async () => {
    const { page, errs } = await open();
    assert.ok(await page.isVisible("#acctSel") && await page.isVisible("#newAcct"));
    assert.ok(!await page.isVisible("#sessionSel"));
    await page.click('[data-tabbtn="track"]');
    assert.ok(await page.isVisible("#sessionSel") && !await page.isVisible("#acctSel"));
    const n = await page.$$eval("#sessionSel option", o => o.length);
    await page.click("#newSession");                                   // a new session, then off to pick its monster
    assert.equal(await page.$$eval("#sessionSel option", o => o.length), n + 1);
    assert.equal(await page.getAttribute('[data-tabbtn="maps"]', "aria-selected"), "true");
    assert.deepEqual(errs, []);
    await page.close();
  });

  await t("Where to farm: best spots by EXP and zeny, Farm here sets the session's map, one ranking at a time", async () => {
    const { page, errs } = await open();
    await page.click('[data-tabbtn="maps"]');
    assert.equal(await page.$$eval("#spots .spot", s => s.length), 6);              // top 3 by EXP, top 3 by zeny
    const mp = await page.getAttribute("#spots .spot [data-farm]", "data-farm");
    await page.click("#spots .spot [data-farm]");
    assert.equal(await page.evaluate("sessMap(cur())"), mp);
    assert.ok(await page.isVisible("#toast"));
    assert.match(await page.textContent("#spots .spot"), /✓ farming/);
    assert.ok(await page.isVisible("#bestTable") && !await page.isVisible("#huntTable"));
    await page.click('[data-farmby="zeny"]');
    assert.ok(!await page.isVisible("#bestTable") && await page.isVisible("#huntTable"));
    assert.ok(!await page.isVisible("#teleSec"), "options are folded");
    await page.click("#farmMore summary");
    assert.ok(await page.isVisible("#teleSec") && !await page.isVisible("#calOn"), "zeny options only");
    // Farm here on a row doesn't also open the row in the map planner
    const row = await page.getAttribute("#huntTable tbody [data-farm]", "data-farm");
    await page.click("#huntTable tbody [data-farm]");
    assert.equal(await page.evaluate("sessMap(cur())"), row);
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
