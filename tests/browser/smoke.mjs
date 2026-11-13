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
// a tab, as a player opens it: in the top bar (full width off) its group's menu first, when the tab isn't showing
async function goTab(page, tab) {
  const b = page.locator(`[data-tabbtn="${tab}"]`);
  if (!(await b.isVisible())) await page.click(`.navSec:has([data-tabbtn="${tab}"]) > .navGrp`);
  await b.click();
}

try {
  await t("every tab opens its own panel, with no script errors", async () => {
    const { page, errs } = await open();
    for (const tab of await tabs(page)) {
      await goTab(page, tab);
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

  await t("a details link (#item/909) opens its popup, and closing it puts the tab's link back", async () => {
    const page = await browser.newPage(), errs = [];
    page.on("pageerror", e => errs.push(e.message));
    await page.goto(page_url + "#item/909");
    await page.waitForSelector("#infoDlg[open]");
    assert.equal(await page.textContent("#infoDlgTitle"), "Jellopy");
    assert.match(await page.getAttribute("#infoShare", "href"), /#item\/909$/);
    await page.click("#infoDlgClose");
    await page.waitForFunction(() => location.hash === "#home");
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
    await goTab(page, "char");                          // a new player starts on Home
    assert.ok(await page.isVisible("#acctSel") && await page.isVisible("#newAcct"));
    assert.ok(!await page.isVisible("#sessionSel"));
    await goTab(page, "track");
    assert.ok(await page.isVisible("#sessionSel") && !await page.isVisible("#acctSel"));
    assert.equal(await page.textContent("#sessionSel"), "No session yet");     // a new player has no session until they start one
    assert.ok(await page.isDisabled("#editSession"));
    await page.click("#newSession");                                   // a new session, then down to the Session tab's monster picker
    assert.equal(await page.evaluate("state.sessions.length"), 1);
    assert.equal(await page.textContent("#sessionSel"), "New session");
    assert.equal(await page.getAttribute('[data-tabbtn="track"]', "aria-selected"), "true");
    assert.ok(await page.isVisible("#farmCard"));
    assert.deepEqual(errs, []);
    await page.close();
  });

  await t("Monsters & maps switches the session Farm here goes to, or starts a new one", async () => {
    const { page, errs } = await open();
    await page.evaluate("C().mode='build';buildOf(C()).base.str=30;state.sessions.push({id:'sA',name:'Alpha',mobIds:[],entries:[]},{id:'sB',name:'Beta',mobIds:[],entries:[]});state.current='sA';save();renderAll()");
    await goTab(page, "maps");
    assert.ok(await page.isVisible("#mapSessSel"));
    assert.equal(await page.inputValue("#mapSessSel"), "sA");
    await page.selectOption("#mapSessSel", "sB");
    assert.equal(await page.evaluate("state.current"), "sB");
    assert.equal(await page.getAttribute('[data-tabbtn="maps"]', "aria-selected"), "true");     // stays on Monsters & maps
    await page.selectOption("#mapSessSel", "+new");
    assert.equal(await page.evaluate("state.sessions.length"), 3);
    assert.equal(await page.evaluate("cur().name"), "New session");
    assert.deepEqual(errs, []);
    await page.close();
  });

  await t("Where to farm: best spots by EXP and zeny, Farm here sets the session's map, one ranking at a time", async () => {
    const { page, errs } = await open();
    await page.evaluate("C().mode='build';buildOf(C()).base.str=30");                           // the spots show once there's a character
    await goTab(page, "track");                         // Where to farm is on the Session tab
    await page.click("#newSession");                                   // a session first: its first Farm here would re-rank the spots
    assert.equal(await page.$$eval("#spots .spot", s => s.length), 6);              // top 3 by EXP, top 3 by zeny
    // the ranking starts after the best spots' 3 (no map twice); folded, Best spots gives them back to the table
    const ranks = () => page.$$eval("#bestTable tbody tr[data-map]", rs => rs.map(r => +r.cells[0].textContent));
    assert.equal((await ranks())[0], 4);
    assert.match(await page.textContent("#bestTable tbody tr"), /#1–3 are in Best for EXP above/);
    await page.click("#spotsMore > summary");
    await page.waitForFunction(() => document.querySelector("#bestTable tbody tr[data-map] td").textContent === "1");
    assert.ok(!await page.isVisible("#spots") && await page.evaluate("state.collapsed['Where to farm: best spots']"));
    await page.click("#spotsMore > summary");
    await page.waitForFunction(() => document.querySelector("#bestTable tbody tr[data-map] td").textContent === "4");
    const mp = await page.getAttribute("#spots .spot [data-farm]", "data-farm");
    await page.click("#spots .spot [data-farm]");
    assert.equal(await page.evaluate("sessMap(cur())"), mp);
    assert.ok(await page.isVisible("#toast"));
    assert.match(await page.textContent("#spots .spot"), /✓ farming/);
    // Your numbers on the Character tab: the map's kill time, damage per second, EXP and zeny, then the time per attack and SP
    await goTab(page, "char");
    const keys = await page.$$eval("#charTiles .tile .k", ks => ks.map(k => k.textContent));
    assert.deepEqual(keys.slice(1), ["Damage / s", "EXP / min", "Zeny / hr", "Time per attack", "SP use vs regen"]);
    assert.match(await page.getAttribute("#charTiles .tile", "title"), /walk/);
    await goTab(page, "track");
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
    // the world map farms the box clicked, the ranking's maps numbered on it
    const wm = await page.getAttribute('#farmWorld .wmBox[data-rank="1"]', "data-wm");
    await page.click('#farmWorld .wmBox[data-rank="1"]');
    assert.ok(wm.split(",").includes(await page.evaluate("sessMap(cur())")));
    // Farming on lists every other open map too: picking one farms it with its monsters
    const other = await page.$eval("#sessMapSel optgroup option", o => o.value);
    await page.selectOption("#sessMapSel", other);
    assert.equal(await page.evaluate("sessMap(cur())"), other);
    assert.equal(await page.inputValue("#sessMapSel"), other);
    assert.deepEqual(errs, []);
    await page.close();
  });

  await t("main nav: a desktop sidebar with the open tab's sections, other groups unfolding in place; menus along the top on a phone", async () => {
    const { page, errs } = await open();
    // a desktop window: Monsters & maps' group is listed, with its sections under it, and not again on the page
    await goTab(page, "maps");
    assert.deepEqual(await page.$$eval(".navSubs a", as => as.map(a => a.textContent)), ["Map", "Monsters"]);
    assert.equal(await page.isVisible("#pageNav"), false);
    // another group: folded to its heading, which unfolds it in the sidebar (not a menu)
    assert.equal(await page.isVisible('[data-tabbtn="news"]'), false);
    await page.click('.navSec:has([data-tabbtn="news"]) > .navGrp');
    assert.equal(await page.isVisible('[data-tabbtn="news"]'), true);
    assert.equal(await page.$eval('[data-tabbtn="news"]', b => getComputedStyle(b.parentNode).position), "static");
    assert.equal(await page.getAttribute('.navSec:has([data-tabbtn="news"]) > .navGrp', "aria-expanded"), "true");
    await page.click('[data-tabbtn="news"]');
    assert.equal(await page.getAttribute('[data-tabbtn="news"]', "aria-selected"), "true");
    assert.equal(await page.locator(".navSec.open").count(), 0);
    // a phone: Home and a menu for each group along the top, no sections in it
    await page.setViewportSize({ width: 390, height: 800 });
    assert.equal(await page.isVisible('.navSec:has([data-tabbtn="items"]) > .navGrp'), true);
    assert.equal(await page.isVisible('[data-tabbtn="items"]'), false);
    await page.click('.navSec:has([data-tabbtn="items"]) > .navGrp');
    // the menu is in the top layer, so the sideways-scrolling row can't clip it (iOS Safari did), and placed under its heading
    assert.equal(await page.$eval('.navSec:has([data-tabbtn="items"]) > .navItems', m => m.matches(":popover-open")), true);
    const [hd, mn] = await Promise.all(['.navSec:has([data-tabbtn="items"]) > .navGrp', '.navSec:has([data-tabbtn="items"]) > .navItems']
      .map(s => page.$eval(s, e => { const r = e.getBoundingClientRect(); return { bottom: r.bottom, top: r.top, h: r.height }; })));
    assert.ok(mn.top >= hd.bottom && mn.top - hd.bottom < 12 && mn.h > 100, JSON.stringify({ hd, mn }));
    await page.click('[data-tabbtn="items"]');
    assert.equal(await page.getAttribute('[data-tabbtn="items"]', "aria-selected"), "true");
    assert.equal(await page.locator("[popover]").count(), 0);
    assert.equal(await page.locator(".navSubs").count(), 0);
    assert.deepEqual(errs, []);
    await page.close();
  });

  await t("Home's search bar: typing in it opens the search with what you typed; the sidebar's Search opens it empty", async () => {
    const { page, errs } = await open();
    await page.click("#searchBtn");
    assert.equal(await page.inputValue("#jumpInput"), "");
    await page.keyboard.press("Escape");
    await page.click("#homeSearch");
    assert.equal(await page.isVisible("#jump"), true);
    await page.keyboard.press("Escape");
    await page.focus("#homeSearch");
    await page.keyboard.type("poring");
    assert.equal(await page.inputValue("#jumpInput"), "poring");
    assert.match(await page.textContent("#jumpList"), /Poring/);
    assert.deepEqual(errs, []);
    await page.close();
  });

  await t("phone width: no tab scrolls sideways", async () => {
    const { page, errs } = await open({ viewport: { width: 390, height: 800 } });
    for (const tab of await tabs(page)) {
      await goTab(page, tab);
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
