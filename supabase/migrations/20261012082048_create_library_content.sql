-- OD-10, docs/DATA_MODEL.md §2–§4. Forward-only: never edit this file once it is on main.

-- The staff check (DATA_MODEL §4): the staff claim app_metadata.staff = true, which only the
-- service role can set, and a session at AAL2 (password and TOTP).
create schema if not exists private;
grant usage on schema private to authenticated;

create function private.is_staff_aal2()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' -> 'staff') = 'true'::jsonb, false)
     and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;
revoke execute on function private.is_staff_aal2() from public;
grant execute on function private.is_staff_aal2() to authenticated;

-- LibraryNotice (DATA_MODEL §2.1). Nobody deletes a notice: staff unpublish it.
create table public.library_notices (
  id text primary key default (gen_random_uuid()::text)
    check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  status text not null default 'draft' check (status in ('published', 'draft')),
  published_on date not null,
  title_ar text not null check (btrim(title_ar) <> ''),
  title_en text not null check (btrim(title_en) <> ''),
  body_ar text not null check (btrim(body_ar) <> ''),
  body_en text not null check (btrim(body_en) <> '')
);
alter table public.library_notices enable row level security;

revoke all on table public.library_notices from anon, authenticated;
grant select on table public.library_notices to anon;
grant select, insert, update on table public.library_notices to authenticated;

create policy library_notices_select_published on public.library_notices
  for select to anon, authenticated
  using (status = 'published');
create policy library_notices_select_staff on public.library_notices
  for select to authenticated
  using ((select private.is_staff_aal2()));
create policy library_notices_insert_staff on public.library_notices
  for insert to authenticated
  with check ((select private.is_staff_aal2()));
create policy library_notices_update_staff on public.library_notices
  for update to authenticated
  using ((select private.is_staff_aal2()))
  with check ((select private.is_staff_aal2()));

-- OpeningSlot (DATA_MODEL §2.2)
create table public.opening_slots (
  id text primary key default (gen_random_uuid()::text)
    check (id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  day_of_week smallint not null check (day_of_week between 0 and 6),
  opens_at text not null check (opens_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  closes_at text not null check (closes_at ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  note_ar text check (note_ar is null or btrim(note_ar) <> ''),
  note_en text check (note_en is null or btrim(note_en) <> ''),
  check (opens_at collate "C" < closes_at collate "C"),
  check ((note_ar is null) = (note_en is null))
);
alter table public.opening_slots enable row level security;

revoke all on table public.opening_slots from anon, authenticated;
grant select on table public.opening_slots to anon;
grant select, insert, update, delete on table public.opening_slots to authenticated;

create policy opening_slots_select_all on public.opening_slots
  for select to anon, authenticated
  using (true);
create policy opening_slots_insert_staff on public.opening_slots
  for insert to authenticated
  with check ((select private.is_staff_aal2()));
create policy opening_slots_update_staff on public.opening_slots
  for update to authenticated
  using ((select private.is_staff_aal2()))
  with check ((select private.is_staff_aal2()));
create policy opening_slots_delete_staff on public.opening_slots
  for delete to authenticated
  using ((select private.is_staff_aal2()));
