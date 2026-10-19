// Builds the deployed site: index.html with every local script and stylesheet given a ?v= of its own content hash, so a browser
// never runs a new page with an old cached file (or the other way round) after a deploy, plus a copy of each of those files and of img/.
// The committed index.html carries no stamps (they changed in nearly every PR and conflicted); the Pages workflow runs this.
// Run: node tools/stamp.mjs [outDir]  (default _site)
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { createHash } from "crypto";
import { fileURLToPath, pathToFileURL } from "url";

const root = new URL("../", import.meta.url);
// CRLF is read as LF, so a Windows checkout stamps the same hashes as the LF files that get deployed
export const hashOf = path => createHash("sha256").update(readFileSync(new URL(path, root), "utf8").replace(/\r\n/g, "\n")).digest("hex").slice(0, 10);
// each local src="…" / href="…" (not http, not #) on a script or link tag
const LOCAL = /(<(?:script|link)\b[^>]*?\b(?:src|href)=")(?![a-z]+:|\/\/|#)([^"?]+)(?:\?v=[^"]*)?"/g;
export const localFiles = html => [...html.matchAll(LOCAL)].map(m => m[2]);
// images the page loads from its scripts (the gear icon and card picture sheets, data/icons.js): copied as they are, every file in img/
export const assetFiles = () => readdirSync(new URL("img/", root)).map(f => `img/${f}`);
// the stamped page: each local file's ?v= set to that file's hash
export const stamp = html => html.replace(LOCAL, (_, pre, path) => `${pre}${path}?v=${hashOf(path)}"`);

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const out = process.argv[2] || "_site", html = readFileSync(new URL("index.html", root), "utf8");
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, "index.html"), stamp(html));
  // .nojekyll: serve the files as they are
  writeFileSync(join(out, ".nojekyll"), "");
  const files = [...localFiles(html), ...assetFiles()];
  for (const f of files) { mkdirSync(dirname(join(out, f)), { recursive: true }); copyFileSync(fileURLToPath(new URL(f, root)), join(out, f)) }
  console.log(`${out}: index.html and ${files.length} files, stamped`);
}
