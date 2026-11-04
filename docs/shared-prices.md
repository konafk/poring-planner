# Shared prices and cloud backup

[← Back to README](../README.md)

Players log in with Discord to share the market prices they typed, and to keep a backup of every account online. Both run on a free [Supabase](https://supabase.com) project that the site owner sets up once. Until `js/shared.js` has the project's address and key, the page hides both and works as before.

## How it keeps junk out

- **Anyone can read, only logged-in players can post.** Every report is stamped by the database with the poster's Discord account and the time, whatever the page sends.
- **Each copy has its own price.** Refine, cards (in any order), the slot 4 enchant, a Taming Ring's egg and affixes all count, so a +7 Katar with two Hydra Cards never mixes with an empty one.
- **One player counts once.** A player can post the same item many times (several shops, refines, options), but their reports for one copy become their own median first. The shared price is the median of those, one per player.
- **Outliers are left out.** Once 3 or more players reported a copy, a player whose price is over 3× or under ⅓ of its median doesn't count, so a fake 999m Jellopy changes nothing. With 1 or 2 players there's no telling who's off, so both count; the list shows the player count and the lowest price beside the median.
- **Every item shows, even with one player.** The Market lists everyone's items, so one player's post shows too, with how many players and reports it comes from and how old the newest one is.
- **Reports count for 30 days.** When 3 or more players reported a copy in the last 7 days, only those days count, so the price follows the market.
- **Limits:** 10 reports per player, per item, per server a day, and 200 a day in all. A repeat of the same copy at the same price within an hour counts once. Past a limit the extra reports are skipped.
- **Bans:** a banned account can't post, and its reports leave every median at once.
- Players see and delete only their own reports, and nobody can edit one.

All of these are rules in the database (`supabase/schema.sql`), so changing the page or calling the API directly doesn't get around them. The numbers are in the `settings` table, so you can change them without touching the site.

**Buyers can DM sellers (optional, per item):** a player who ticks **DM me** on a price (or on a refined / optioned copy) and shares it shows up under that item for buyers: their Discord name and @username, the copy, price and when, with a link to their Discord profile. Nothing else of theirs is shown. Unticking it takes that item's listing back at once (Delete my shared reports takes back all of them). The name and id come from the Discord login itself, never from the page, so nobody can show someone else's. These reports still count in the shared price like any other.

**Cloud backup:** one per Discord account, only that player's to read, write or delete. It's the Copy backup text (every account), compressed, up to 2 MB. Load from cloud puts it in the backup box, and Restore from text (twice) uses it, as with a pasted backup. While a player is logged in it syncs on its own: a browser with no character takes the cloud copy, changes go up every 30 seconds, and when both the browser and the cloud changed the player chooses which to keep.

**The keys:** the page uses the project's **public** key (anon / publishable). Anyone can read it in the page, and that's how Supabase is meant to work: the rules above decide what it can do. The **service_role** (secret) key skips every rule: never put it in the page, the repo or a chat.

The login is kept in its own browser storage, apart from the accounts, so backups and share links never carry it.

## Setting it up

1. **Make a Supabase project** at [supabase.com](https://supabase.com) (the free plan is enough). In **Settings → Billing**, keep the **spend cap** on, so abuse can never cost money.
2. **Make the tables:** open **SQL Editor**, paste all of [`supabase/schema.sql`](../supabase/schema.sql) and run it. Running it again later (after an update) is safe.
3. **Make a Discord app** at the [Discord Developer Portal](https://discord.com/developers/applications): **New Application**, then **OAuth2**. Copy its **Client ID** and **Client Secret**. Under **Redirects**, add the callback URL that Supabase shows in the next step (`https://<project>.supabase.co/auth/v1/callback`).
4. **Turn on Discord in Supabase:** **Authentication → Sign In / Providers → Discord**: switch it on, paste the Client ID and Client Secret, save.
5. **Allow only this site:** **Authentication → URL Configuration**: set **Site URL** to the site (`https://konafk.github.io/poring-planner/`) and add it under **Redirect URLs** too (add `http://localhost:8765/` as well to try it locally).
6. **Point the page at the project:** in **Settings → API**, copy the **Project URL** and the **anon / publishable** key into `SHARED` at the top of `js/shared.js`:

   ```js
   const SHARED={url:"https://<project>.supabase.co",key:"<anon or publishable key>"};
   ```

7. **Make yourself an admin:** log in on the site once with Discord, then in **Authentication → Users** copy your user id, and in **Table Editor → admins** insert a row with it.

## Moderating

- **Who looks like a troll:** in the SQL Editor, `select * from public.flagged_accounts;` lists accounts with reports left out as outliers, with their Discord name.
- **Ban:** insert their user id into **Table Editor → banned** (with a reason if you like), or in the SQL Editor: `insert into public.banned (user_id, reason) values ('<user id>', 'fake prices');`. Delete the row to unban.
- **Change a limit:** edit the value in **Table Editor → settings** (each row says what it does).
- **Clear old reports** (they stop counting after 30 days, but stay in the table): `delete from public.reports where created_at < now() - interval '90 days';`

## Testing the rules

`tests/supabase/schema.mjs` runs `supabase/schema.sql` in [PGlite](https://pglite.dev) (Postgres in Node) with a stand-in for Supabase's login, and checks each rule as anyone, a player, a banned player and an admin:

```sh
npm i --no-save @electric-sql/pglite && node tests/supabase/schema.mjs
```
