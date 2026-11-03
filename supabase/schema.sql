-- Poring Planner's shared market prices and cloud backups, for a Supabase project (docs/shared-prices.md says how to set one up).
-- Paste the whole file into the project's SQL editor and run it. Running it again is safe: it keeps your data and settings.
--
-- The page talks to this with the project's public (anon / publishable) key, which anyone can read in the page. That's how Supabase
-- is meant to be used: the row level security policies and triggers below decide what that key can do, and they run on the server.
-- Never put the service_role (secret) key in the page or the repo: it skips every rule here.

-- ---- settings: change a value in the Table editor (settings) and it applies to the next read or report ----
create table if not exists public.settings (key text primary key, value numeric not null, about text);
insert into public.settings (key, value, about) values
  ('keep_days',      30,  'reports older than this many days no longer count'),
  ('fresh_days',     7,   'a copy reported by fresh_players or more players in this many days uses only those days'),
  ('fresh_players',  3,   'players needed in fresh_days for a copy to use only its latest reports'),
  ('min_players',    2,   'players needed before a shared price shows'),
  ('per_item_day',   10,  'reports one player can post for one item on one server in a day'),
  ('per_day',        200, 'reports one player can post in a day'),
  ('outlier_factor', 3,   'a player whose price is this many times over or under the median is left out of it')
on conflict (key) do nothing;
alter table public.settings enable row level security; -- no policies: only the dashboard and the functions below read it

-- ---- admins and banned accounts: add a row in the Table editor (the user id is under Authentication, Users) ----
create table if not exists public.admins (user_id uuid primary key references auth.users on delete cascade);
create table if not exists public.banned (
  user_id uuid primary key references auth.users on delete cascade,
  reason text,
  at timestamptz not null default now()
);
alter table public.admins enable row level security;
alter table public.banned enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
$$;

drop policy if exists "admins see admins" on public.admins;
create policy "admins see admins" on public.admins for select to authenticated using (public.is_admin());
drop policy if exists "admins manage bans" on public.banned;
create policy "admins manage bans" on public.banned for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "players see their own ban" on public.banned;
create policy "players see their own ban" on public.banned for select to authenticated using (user_id = (select auth.uid()));

-- ---- reports: one row per shop listing a player saw. A player can report the same item many times (several shops, refines) ----
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  server text not null check (server in ('skadi', 'odin', 'loki')),
  item_id integer not null check (item_id > 0),
  refine smallint not null default 0 check (refine between 0 and 20),
  opts jsonb not null default '[]'::jsonb,   -- random options: [{"k": option key, "v": value or null}], sorted by key
  opts_key text not null default '',         -- the options as one text ("atk=20;hit=5"), so the same copy groups together
  price bigint not null check (price between 1 and 1000000000000),
  created_at timestamptz not null default now()
);
-- selling: the poster sells this copy at this price (not just saw it) and lets buyers DM them about it on Discord
alter table public.reports add column if not exists selling boolean not null default false;
create index if not exists reports_item on public.reports (server, item_id, created_at);
create index if not exists reports_user on public.reports (user_id, created_at);
alter table public.reports enable row level security;

-- every new report: stamped with the poster's account and the time (whatever the page sent), its options checked and sorted,
-- refused for a banned account, and skipped (not an error) past the daily limits or when it repeats one from the last hour
create or replace function public.reports_check() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  per_item int := coalesce((select s.value from public.settings s where s.key = 'per_item_day'), 10);
  per_day  int := coalesce((select s.value from public.settings s where s.key = 'per_day'), 200);
  o jsonb;
begin
  new.user_id := auth.uid();
  if new.user_id is null then raise exception 'Log in to share prices'; end if;
  if exists (select 1 from public.banned b where b.user_id = new.user_id) then raise exception 'This account can''t share prices'; end if;
  new.created_at := now();
  if jsonb_typeof(new.opts) is distinct from 'array' or jsonb_array_length(new.opts) > 5 then raise exception 'Bad random options'; end if;
  if exists (select 1 from jsonb_array_elements(new.opts) e where jsonb_typeof(e) <> 'object' or coalesce(e->>'k', '') = '' or length(e->>'k') > 60
             or jsonb_typeof(e->'v') not in ('number', 'null')) then raise exception 'Bad random options'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('k', e->>'k', 'v', coalesce(e->'v', 'null'::jsonb)) order by e->>'k'), '[]'::jsonb)
    into o from jsonb_array_elements(new.opts) e;
  new.opts := o;
  new.opts_key := coalesce((select string_agg((e->>'k') || '=' || coalesce(e->>'v', ''), ';' order by e->>'k') from jsonb_array_elements(o) e), '');
  if (select count(*) from public.reports r where r.user_id = new.user_id and r.created_at > now() - interval '1 day') >= per_day then return null; end if;
  if (select count(*) from public.reports r where r.user_id = new.user_id and r.server = new.server and r.item_id = new.item_id
      and r.created_at > now() - interval '1 day') >= per_item then return null; end if;
  if exists (select 1 from public.reports r where r.user_id = new.user_id and r.server = new.server and r.item_id = new.item_id
             and r.refine = new.refine and r.opts_key = new.opts_key and r.price = new.price and r.selling = new.selling
             and r.created_at > now() - interval '1 hour') then return null; end if;
  return new;
end $$;
drop trigger if exists reports_check on public.reports;
create trigger reports_check before insert on public.reports for each row execute function public.reports_check();

-- players post and delete their own reports and see only those; admins see and delete any. Nobody edits a report
drop policy if exists "post as yourself" on public.reports;
create policy "post as yourself" on public.reports for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists "see your own" on public.reports;
create policy "see your own" on public.reports for select to authenticated using (user_id = (select auth.uid()) or public.is_admin());
drop policy if exists "delete your own" on public.reports;
create policy "delete your own" on public.reports for delete to authenticated using (user_id = (select auth.uid()) or public.is_admin());
revoke update on public.reports from anon, authenticated;

-- an account-wide DM switch from an earlier version: the selling mark on each report replaced it
drop table if exists public.profiles;
drop function if exists public.profiles_stamp();

-- the players selling one item on one server (reports marked selling): each one's latest price per copy, from the last keep_days
create or replace function public.sellers(srv text, item integer)
returns table (discord_id text, discord_name text, username text, refine smallint, opts jsonb, price bigint, at timestamptz)
language sql stable security definer set search_path = '' as $$
  select x.discord_id, x.discord_name, x.username, x.refine, x.opts, x.price, x.created_at from (
    select distinct on (r.user_id, r.refine, r.opts_key)
      coalesce(u.raw_user_meta_data->>'provider_id', u.raw_user_meta_data->>'sub') as discord_id,
      coalesce(u.raw_user_meta_data->'custom_claims'->>'global_name', u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name') as discord_name,
      coalesce(u.raw_user_meta_data->>'name', u.raw_user_meta_data->>'full_name') as username,
      r.refine, r.opts, r.price, r.created_at
    from public.reports r
    join auth.users u on u.id = r.user_id
    where r.server = srv and r.item_id = item and r.selling
      and r.created_at > now() - make_interval(days => coalesce((select s.value from public.settings s where s.key = 'keep_days'), 30)::int)
      and not exists (select 1 from public.banned b where b.user_id = r.user_id)
    order by r.user_id, r.refine, r.opts_key, r.created_at desc) x
  order by x.refine, x.price
  limit 50
$$;
revoke all on function public.sellers(text, integer) from public;
grant execute on function public.sellers(text, integer) to anon, authenticated;

-- ---- the shared prices of one server, for anyone: per copy (item, refine, options) the median of the players' prices ----
-- Each player counts once: their reports for a copy become their own median first. A player more than outlier_factor over or
-- under the copy's median is left out. Banned accounts and reports older than keep_days don't count; a copy with fresh_players
-- or more players in the last fresh_days uses only those days. A copy shows once min_players players are left.
drop function if exists public.shared_prices(text); -- its columns changed: sellers was added
create or replace function public.shared_prices(srv text)
returns table (item_id integer, refine smallint, opts jsonb, price bigint, players integer, reports integer, newest timestamptz, sellers integer)
language sql stable security definer set search_path = '' as $$
  with s as (
    select coalesce(max(value) filter (where key = 'keep_days'), 30) as keep, coalesce(max(value) filter (where key = 'fresh_days'), 7) as fresh,
           coalesce(max(value) filter (where key = 'fresh_players'), 3) as fresh_n, coalesce(max(value) filter (where key = 'min_players'), 2) as min_n,
           coalesce(max(value) filter (where key = 'outlier_factor'), 3) as factor
    from public.settings),
  live as (
    select r.item_id, r.refine, r.opts, r.opts_key, r.user_id, r.price, r.created_at, r.selling, r.created_at > now() - make_interval(days => s.fresh::int) as recent
    from public.reports r, s
    where r.server = srv and r.created_at > now() - make_interval(days => s.keep::int)
      and not exists (select 1 from public.banned b where b.user_id = r.user_id)),
  grp as (
    select l.item_id, l.refine, l.opts_key, count(distinct l.user_id) filter (where l.recent) as recent_n
    from live l group by l.item_id, l.refine, l.opts_key),
  used as (
    select l.* from live l join grp g on g.item_id = l.item_id and g.refine = l.refine and g.opts_key = l.opts_key, s
    where g.recent_n < s.fresh_n or l.recent),
  per as (
    select u.item_id, u.refine, u.opts_key, u.user_id, min(u.opts::text) as opts, percentile_cont(0.5) within group (order by u.price) as p,
           count(*) as n, max(u.created_at) as t, bool_or(u.selling) as selling
    from used u group by u.item_id, u.refine, u.opts_key, u.user_id),
  mid as (
    select p.item_id, p.refine, p.opts_key, percentile_cont(0.5) within group (order by p.p) as m
    from per p group by p.item_id, p.refine, p.opts_key),
  kept as (
    select p.* from per p join mid m on m.item_id = p.item_id and m.refine = p.refine and m.opts_key = p.opts_key, s
    where p.p <= m.m * s.factor and p.p >= m.m / s.factor)
  select k.item_id, k.refine, min(k.opts)::jsonb, round(percentile_cont(0.5) within group (order by k.p))::bigint,
         count(*)::int, sum(k.n)::int, max(k.t),
         count(*) filter (where k.selling)::int
  from kept k, s
  group by k.item_id, k.refine, k.opts_key, s.min_n
  having count(*) >= s.min_n
$$;
revoke all on function public.shared_prices(text) from public;
grant execute on function public.shared_prices(text) to anon, authenticated;

-- ---- for moderating, in the SQL editor: accounts with reports left out as outliers in the last keep_days ----
--   select * from public.flagged_accounts;    then ban one:  insert into public.banned (user_id, reason) values ('<user id>', 'fake prices');
create or replace view public.flagged_accounts as
  with per as (
    select r.server, r.item_id, r.refine, r.opts_key, r.user_id, percentile_cont(0.5) within group (order by r.price) as p
    from public.reports r
    where r.created_at > now() - make_interval(days => coalesce((select s.value from public.settings s where s.key = 'keep_days'), 30)::int)
    group by r.server, r.item_id, r.refine, r.opts_key, r.user_id),
  mid as (
    select server, item_id, refine, opts_key, percentile_cont(0.5) within group (order by p) as m, count(*) as players
    from per group by server, item_id, refine, opts_key)
  select p.user_id, u.raw_user_meta_data->>'full_name' as discord_name, count(*) filter (where m.players >= 3 and (p.p > m.m * f.v or p.p < m.m / f.v)) as outliers,
         count(*) as copies_reported
  from per p join mid m using (server, item_id, refine, opts_key)
  cross join (select coalesce((select s.value from public.settings s where s.key = 'outlier_factor'), 3) as v) f
  left join auth.users u on u.id = p.user_id
  group by p.user_id, u.raw_user_meta_data->>'full_name'
  having count(*) filter (where m.players >= 3 and (p.p > m.m * f.v or p.p < m.m / f.v)) > 0
  order by outliers desc;
revoke all on public.flagged_accounts from anon, authenticated;

-- ---- cloud backups: one per player, only theirs to read, write or delete. data = the page's Copy backup text, compressed ----
create table if not exists public.backups (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  data text not null check (octet_length(data) <= 2000000),
  updated_at timestamptz not null default now()
);
alter table public.backups enable row level security;
create or replace function public.backups_stamp() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.user_id := auth.uid();
  if new.user_id is null then raise exception 'Log in to back up'; end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists backups_stamp on public.backups;
create trigger backups_stamp before insert or update on public.backups for each row execute function public.backups_stamp();
drop policy if exists "your own backup" on public.backups;
create policy "your own backup" on public.backups for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke all on public.backups from anon;
