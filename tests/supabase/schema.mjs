// Runs supabase/schema.sql in PGlite (Postgres in Node) with a stand-in for Supabase's auth schema and roles, then checks the rules
// as each kind of user: anyone, a player, a banned player, an admin. It needs PGlite, so it isn't a *.test.mjs file:
//   npm i --no-save @electric-sql/pglite && node tests/supabase/schema.mjs
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "fs";
import assert from "assert/strict";

const db = new PGlite();
const schema = readFileSync(new URL("../../supabase/schema.sql", import.meta.url), "utf8");
await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; grant usage on schema auth to anon, authenticated;
  create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}');
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  grant execute on function auth.uid() to anon, authenticated;
  grant usage on schema public to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on sequences to anon, authenticated;
`);
await db.exec(schema);
await db.exec(schema); // running it twice is safe
const U = n => `00000000-0000-0000-0000-00000000000${n}`;
for (let i = 1; i <= 6; i++) await db.query(`insert into auth.users (id, raw_user_meta_data) values ($1, $2)`, [U(i), { full_name: "p" + i }]);
// as a role: anon, or authenticated as user n
const as = async (n, sql, params = []) => {
  await db.exec(`reset role; select set_config('request.jwt.claim.sub', '${n ? U(n) : ""}', false); set role ${n ? "authenticated" : "anon"};`);
  try { return (await db.query(sql, params)).rows } finally { await db.exec("reset role") }
};
const fails = async (n, sql, params, re) => { await assert.rejects(as(n, sql, params), re) };
const ins = (n, item, price, refine = 0, opts = "[]", srv = "skadi") =>
  as(n, `insert into public.reports (server, item_id, refine, opts, price) values ($1, $2, $3, $4::jsonb, $5) returning id, user_id, opts, opts_key`, [srv, item, refine, opts, price]);
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log("ok", name) };

await t("anon can't post, read reports or backups", async () => {
  await fails(0, `insert into public.reports (server, item_id, price) values ('skadi', 909, 10)`, [], /permission denied|row-level security|Log in/);
  assert.equal((await as(0, `select * from public.reports`)).length, 0);
  await fails(0, `select * from public.backups`, [], /permission denied/);
  await fails(0, `select * from public.flagged_accounts`, [], /permission denied/);
});
await t("a report is stamped with the poster, whatever user_id the page sends; options sorted", async () => {
  const r = await as(1, `insert into public.reports (user_id, server, item_id, refine, opts, price) values ($1, 'skadi', 28028, 7, '[{"k":"hit","v":5},{"k":"atk","v":20}]', 3000000) returning user_id, opts, opts_key`, [U(2)]);
  assert.equal(r[0].user_id, U(1));
  assert.deepEqual(r[0].opts, [{ k: "atk", v: 20 }, { k: "hit", v: 5 }]);
  assert.equal(r[0].opts_key, "atk=20;hit=5");
});
await t("bad options, prices and servers are refused", async () => {
  await fails(1, `insert into public.reports (server, item_id, opts, price) values ('skadi', 1, '{"k":1}', 5)`, [], /Bad random options/);
  await fails(1, `insert into public.reports (server, item_id, opts, price) values ('skadi', 1, '[{"v":1}]', 5)`, [], /Bad random options/);
  await fails(1, `insert into public.reports (server, item_id, opts, price) values ('skadi', 1, '[{"k":"atk","v":"<b>"}]', 5)`, [], /Bad random options/);
  await fails(1, `insert into public.reports (server, item_id, price) values ('mars', 1, 5)`, [], /check constraint/);
  await fails(1, `insert into public.reports (server, item_id, price) values ('skadi', 1, 0)`, [], /check constraint/);
});
await t("a repeat within the hour is skipped; a player can post the same item several times", async () => {
  assert.equal((await ins(1, 909, 30)).length, 1);
  assert.equal((await ins(1, 909, 30)).length, 0);   // same copy, same price: skipped
  assert.equal((await ins(1, 909, 32)).length, 1);   // another shop
  assert.equal((await as(1, `insert into public.reports (server, item_id, price, selling) values ('skadi', 909, 30, true) returning id`)).length, 1); // now selling it: not a repeat
  assert.equal((await ins(1, 909, 30, 0, "[]", "odin")).length, 1);
});
await t("players see only their own reports and can't edit them", async () => {
  await ins(2, 909, 40);
  assert.ok((await as(2, `select user_id from public.reports`)).every(r => r.user_id === U(2)));
  await as(2, `update public.reports set price = 1`).catch(() => {});
  assert.ok((await as(2, `select price from public.reports`)).every(r => r.price !== "1" && r.price !== 1));
  await as(2, `delete from public.reports where user_id <> $1`, [U(2)]);
  assert.ok((await as(1, `select count(*)::int c from public.reports`))[0].c >= 3); // player 1's still there
});
await t("per item per day cap skips the rest", async () => {
  for (let i = 0; i < 12; i++) await ins(3, 4001, 100000 + i);
  assert.equal((await as(3, `select count(*)::int c from public.reports where item_id = 4001`))[0].c, 10);
});
await t("shared price: median of each player's own median, needs 2 players, outliers left out", async () => {
  // item 1201: p4 posts 10 cheap reports, p5 one, p6 a troll price
  for (let i = 0; i < 8; i++) await ins(4, 1201, 1000 + i);
  await ins(5, 1201, 2000);
  let s = await as(0, `select * from public.shared_prices('skadi') where item_id = 1201`);
  assert.equal(s.length, 1);
  assert.equal(s[0].players, 2);
  assert.equal(s[0].reports, 9);
  assert.equal(Number(s[0].price), 1502);            // median of 1003.5 and 2000 = 1501.75
  await ins(6, 1201, 999999999);
  s = await as(0, `select * from public.shared_prices('skadi') where item_id = 1201`);
  assert.equal(s[0].players, 2);                     // the troll is left out
  assert.equal((await as(0, `select * from public.shared_prices('skadi') where item_id = 28028`)).length, 0); // one player only
  assert.equal((await as(0, `select * from public.shared_prices('odin') where item_id = 1201`)).length, 0);
});
await t("refined / optioned copies are their own price", async () => {
  await ins(4, 28028, 2800000, 7, '[{"k":"atk","v":20},{"k":"hit","v":5}]');
  const s = await as(0, `select refine, opts, price, players from public.shared_prices('skadi') where item_id = 28028`);
  assert.equal(s.length, 1);
  assert.deepEqual(s[0].opts, [{ k: "atk", v: 20 }, { k: "hit", v: 5 }]);
  assert.equal(Number(s[0].price), 2900000);
});
await t("old reports expire; fresh ones win when enough players reported lately", async () => {
  await db.exec(`update public.reports set created_at = now() - interval '40 days' where item_id = 909`);
  assert.equal((await as(0, `select * from public.shared_prices('skadi') where item_id = 909`)).length, 0);
  // item 2301: 3 players 20 days ago at 100, then 3 players this week at 200
  for (const p of [1, 2, 3]) await ins(p, 2301, 100);
  await db.exec(`update public.reports set created_at = now() - interval '20 days' where item_id = 2301`);
  let s = await as(0, `select price, players from public.shared_prices('skadi') where item_id = 2301`);
  assert.equal(Number(s[0].price), 100);
  for (const p of [4, 5]) await ins(p, 2301, 200);
  s = await as(0, `select price, players from public.shared_prices('skadi') where item_id = 2301`);
  assert.equal(s[0].players, 5);                     // only 2 recent: still the whole 30 days
  await ins(6, 2301, 200);
  s = await as(0, `select price, players from public.shared_prices('skadi') where item_id = 2301`);
  assert.equal(s[0].players, 3);
  assert.equal(Number(s[0].price), 200);
});
await t("banned: can't post, and their reports leave the median; only admins ban", async () => {
  await fails(4, `insert into public.banned (user_id) values ($1)`, [U(5)], /row-level security/);
  await db.query(`insert into public.admins values ($1)`, [U(1)]);
  await as(1, `insert into public.banned (user_id, reason) values ($1, 'test')`, [U(5)]);
  await fails(5, `insert into public.reports (server, item_id, price) values ('skadi', 1, 5)`, [], /can't share/);
  const s = await as(0, `select * from public.shared_prices('skadi') where item_id = 1201`);
  assert.equal(s.length, 0);                         // p5 gone, p6 troll alone with p4 → p4 kept, troll out → 1 player
  assert.ok((await as(1, `select count(*)::int c from public.reports where user_id = $1`, [U(4)]))[0].c > 0); // admins see all
});
await t("flagged accounts list the troll", async () => {
  for (const p of [1, 2, 3]) await ins(p, 5005, 50000);
  await ins(6, 5005, 9e9);
  const f = await db.query(`select user_id, outliers from public.flagged_accounts`);
  assert.ok(f.rows.some(r => r.user_id === U(6) && r.outliers >= 1));
});
await t("backups: one each, only your own, upsert", async () => {
  await as(1, `insert into public.backups (data) values ('abc') on conflict (user_id) do update set data = excluded.data`);
  await as(1, `insert into public.backups (data) values ('def') on conflict (user_id) do update set data = excluded.data`);
  await as(2, `insert into public.backups (user_id, data) values ($1, 'evil') on conflict (user_id) do update set data = excluded.data`, [U(1)]);
  assert.deepEqual((await as(1, `select data from public.backups`)).map(r => r.data), ["def"]);
  assert.deepEqual((await as(2, `select data from public.backups`)).map(r => r.data), ["evil"]); // written as player 2's own
  await as(2, `delete from public.backups`);
  assert.equal((await as(1, `select count(*)::int c from public.backups`))[0].c, 1);
});
await t("sellers: only reports marked selling, with the name from the poster's login; deleting them takes the seller off", async () => {
  await db.query(`update auth.users set raw_user_meta_data = $2 where id = $1`, [U(2), { full_name: "seller2", name: "seller2", provider_id: "11112222", custom_claims: { global_name: "Seller Two" } }]);
  await as(4, `insert into public.reports (server, item_id, price) values ('skadi', 7001, 1000)`);               // just saw it
  assert.equal((await as(0, `select * from public.sellers('skadi', 7001)`)).length, 0);
  await as(2, `insert into public.reports (server, item_id, price, selling) values ('skadi', 7001, 900, true)`);
  const s = await as(0, `select * from public.sellers('skadi', 7001)`);
  assert.deepEqual(s.map(x => [x.discord_id, x.discord_name, x.username, Number(x.price)]), [["11112222", "Seller Two", "seller2", 900]]);
  assert.equal((await as(0, `select * from public.sellers('odin', 7001)`)).length, 0);
  await as(3, `insert into public.reports (server, item_id, price, selling) values ('skadi', 7001, 950, true)`);
  const sp = await as(0, `select sellers, players from public.shared_prices('skadi') where item_id = 7001`);
  assert.equal(sp[0].sellers, 2);
  await as(2, `delete from public.reports where item_id = 7001 and selling`);
  assert.deepEqual((await as(0, `select * from public.sellers('skadi', 7001)`)).map(x => Number(x.price)), [950]);
});
console.log(n, "tests passed");
