// The committed index.html carries no ?v= stamps (they conflicted in nearly every PR); the Pages deploy adds them with
// tools/stamp.mjs, giving each script and stylesheet its content hash so a deploy never mixes a new page with old cached files.
// Run: node tests/stamp.test.mjs
import { readFileSync } from "fs";
import assert from "assert/strict";
import { existsSync } from "fs";
import { stamp, hashOf, localFiles, assetFiles } from "../tools/stamp.mjs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const local = localFiles(html);
assert.ok(local.length > 20, `only ${local.length} local files found`);
for (const u of local) assert.doesNotMatch(u, /\?/, `${u} carries a query: leave the stamps to the deploy`);
assert.doesNotMatch(html.replace(/<!--[\s\S]*?-->/g, ""), /\?v=/, "index.html has a ?v= stamp: leave the stamps to the deploy");
// every local file exists (hashOf reads it) and gets its own hash in the deployed page
const out = stamp(html);
for (const u of local) assert.ok(out.includes(`"${u}?v=${hashOf(u)}"`), `${u} not stamped`);
assert.equal(stamp(out), out, "stamping is stable");
assert.notEqual(hashOf("js/events.js"), hashOf("js/state.js"));
// the sprite sheets data/icons.js names are deployed (img/ is copied as it is)
const sheets = [...readFileSync(new URL("../data/icons.js", import.meta.url), "utf8").matchAll(/"file":"([^"]+)"/g)].map(m => m[1]);
assert.equal(sheets.length, 5);                                     // gear icons, item icons, card pictures, monster pictures, skill icons
for (const f of sheets) { assert.ok(assetFiles().includes(f), `${f} isn't deployed`); assert.ok(existsSync(new URL(`../${f}`, import.meta.url)), `${f} missing`) }
// so are the map pictures data/minimaps.js names (img/maps/, a folder inside img/)
const mapsSrc = readFileSync(new URL("../data/minimaps.js", import.meta.url), "utf8");
const minimaps = Object.keys(JSON.parse(mapsSrc.match(/MINIMAPS=(\{.*\});/)[1])).map(k => `img/maps/${k}.png`);
assert.ok(minimaps.length > 100, `only ${minimaps.length} map pictures`);
// and the world maps (Midgard, Nordfeld)
const worlds = JSON.parse(mapsSrc.match(/WORLDMAPS=(\[.*\]);/)[1]);
assert.ok(worlds.length >= 2 && Object.keys(worlds[0].maps).length > 50, `only ${worlds.length} world maps, ${Object.keys(worlds[0].maps).length} maps on the first`);
for (const f of [...minimaps, ...worlds.map(w => w.file)]) assert.ok(assetFiles().includes(f), `${f} isn't deployed`);
console.log(`ok ${local.length} files unstamped in index.html and stamped with their hash on deploy`);
console.log("1 tests passed");
