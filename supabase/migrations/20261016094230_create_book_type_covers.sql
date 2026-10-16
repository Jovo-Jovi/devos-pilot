-- OD-11, docs/DATA_MODEL.md §10. Forward-only: never edit this file once it is on main.

-- The link from a BookType to its cover (DATA_MODEL §10). The type lives in Firestore.
create table public.book_type_covers (
  book_type_id text primary key
    check (book_type_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  object_key text not null unique
    check (object_key ~ '^book-types/[a-z0-9]+(-[a-z0-9]+)*/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$'),
  check (starts_with(object_key, 'book-types/' || book_type_id || '/'))
);
alter table public.book_type_covers enable row level security;

revoke all on table public.book_type_covers from anon, authenticated;
grant select on table public.book_type_covers to anon;
grant select, insert, update, delete on table public.book_type_covers to authenticated;

create policy book_type_covers_select_all on public.book_type_covers
  for select to anon, authenticated
  using (true);
create policy book_type_covers_insert_staff on public.book_type_covers
  for insert to authenticated
  with check ((select private.is_staff_aal2()));
create policy book_type_covers_update_staff on public.book_type_covers
  for update to authenticated
  using ((select private.is_staff_aal2()))
  with check ((select private.is_staff_aal2()));
create policy book_type_covers_delete_staff on public.book_type_covers
  for delete to authenticated
  using ((select private.is_staff_aal2()));
