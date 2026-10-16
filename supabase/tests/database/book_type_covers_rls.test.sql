-- OD-11, docs/DATA_MODEL.md §10: who can read and write book_type_covers. The fixtures are
-- synthetic and rolled back. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(36);

-- Structure (7): the table, RLS on, exactly the four policies and their roles.
select has_table('public', 'book_type_covers', 'book_type_covers exists');
select ok((select relrowsecurity from pg_class where oid = 'public.book_type_covers'::regclass), 'book_type_covers has row level security');
select policies_are('public', 'book_type_covers', array['book_type_covers_select_all', 'book_type_covers_insert_staff', 'book_type_covers_update_staff', 'book_type_covers_delete_staff']::name[], 'book_type_covers has exactly its four policies');
select policy_roles_are('public', 'book_type_covers', 'book_type_covers_select_all', array['anon', 'authenticated']::name[], 'covers: anon and authenticated');
select policy_roles_are('public', 'book_type_covers', 'book_type_covers_insert_staff', array['authenticated']::name[], 'insert a cover: authenticated only');
select policy_roles_are('public', 'book_type_covers', 'book_type_covers_update_staff', array['authenticated']::name[], 'update a cover: authenticated only');
select policy_roles_are('public', 'book_type_covers', 'book_type_covers_delete_staff', array['authenticated']::name[], 'delete a cover: authenticated only');

-- Privileges (2): anon reads; authenticated reads and writes. No write for anon.
select table_privs_are('public', 'book_type_covers', 'anon', array['SELECT']::name[], 'anon has exactly SELECT');
select table_privs_are('public', 'book_type_covers', 'authenticated', array['DELETE', 'INSERT', 'SELECT', 'UPDATE']::name[], 'authenticated has exactly DELETE, INSERT, SELECT, UPDATE');

-- Synthetic fixtures, inserted as the table owner.
insert into public.book_type_covers (book_type_id, object_key) values
  ('rls-novels', 'book-types/rls-novels/11111111-1111-4111-8111-111111111111.webp'),
  ('rls-poetry', 'book-types/rls-poetry/22222222-2222-4222-8222-222222222222.webp');

-- Table rules, as the owner (4).
select throws_ok($$ insert into public.book_type_covers (book_type_id, object_key) values ('RLS-novels', 'book-types/rls-novels/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.webp') $$, '23514', null, 'an uppercase book_type_id is refused');
select throws_ok($$ insert into public.book_type_covers (book_type_id, object_key) values ('rls-essays', 'book-types/rls-essays/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.png') $$, '23514', null, 'a key that is not book-types/<id>/<uuid>.webp is refused');
select throws_ok($$ insert into public.book_type_covers (book_type_id, object_key) values ('rls-essays', 'book-types/rls-poetry/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.webp') $$, '23514', null, 'a well-formed key whose folder is another type id is refused');
select throws_ok($$ insert into public.book_type_covers (book_type_id, object_key) values ('rls-novels', 'book-types/rls-novels/11111111-1111-4111-8111-111111111111.webp') $$, '23505', null, 'a second row with an existing object_key is refused');

-- Anonymous visitor (4).
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select results_eq($$ select book_type_id from public.book_type_covers where book_type_id like 'rls-%' order by book_type_id $$, $$ values ('rls-novels'), ('rls-poetry') $$, 'anon reads both fixture rows');
select throws_ok($$ insert into public.book_type_covers (book_type_id, object_key) values ('rls-essays', 'book-types/rls-essays/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp') $$, '42501', null, 'anon cannot insert a cover');
select throws_ok($$ update public.book_type_covers set object_key = 'book-types/rls-novels/99999999-9999-4999-8999-999999999999.webp' where book_type_id = 'rls-novels' $$, '42501', null, 'anon cannot update a cover');
select throws_ok($$ delete from public.book_type_covers where book_type_id = 'rls-poetry' $$, '42501', null, 'anon cannot delete a cover');

-- Signed in at AAL2 but without the staff claim (4).
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2", "app_metadata": {}}';
select results_eq($$ select book_type_id from public.book_type_covers where book_type_id like 'rls-%' order by book_type_id $$, $$ values ('rls-novels'), ('rls-poetry') $$, 'no staff claim: reads both fixture rows');
select throws_ok($$ insert into public.book_type_covers (book_type_id, object_key) values ('rls-essays', 'book-types/rls-essays/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp') $$, '42501', null, 'no staff claim: cannot insert a cover');
select lives_ok($$ update public.book_type_covers set object_key = 'book-types/rls-novels/99999999-9999-4999-8999-999999999999.webp' where book_type_id = 'rls-novels' $$, 'no staff claim: the update runs but matches no row');
select lives_ok($$ delete from public.book_type_covers where book_type_id = 'rls-poetry' $$, 'no staff claim: the delete runs but matches no row');

-- Staff claim, password only: AAL1 (4).
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated", "aal": "aal1", "app_metadata": {"staff": true}}';
select results_eq($$ select book_type_id from public.book_type_covers where book_type_id like 'rls-%' order by book_type_id $$, $$ values ('rls-novels'), ('rls-poetry') $$, 'staff at aal1: reads both fixture rows');
select throws_ok($$ insert into public.book_type_covers (book_type_id, object_key) values ('rls-essays', 'book-types/rls-essays/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp') $$, '42501', null, 'staff at aal1: cannot insert a cover');
select lives_ok($$ update public.book_type_covers set object_key = 'book-types/rls-novels/99999999-9999-4999-8999-999999999999.webp' where book_type_id = 'rls-novels' $$, 'staff at aal1: the update runs but matches no row');
select lives_ok($$ delete from public.book_type_covers where book_type_id = 'rls-poetry' $$, 'staff at aal1: the delete runs but matches no row');

-- Claims that only look like staff, at AAL2 (2).
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-000000000003", "role": "authenticated", "aal": "aal2", "app_metadata": {"staff": "true"}}';
select throws_ok($$ insert into public.book_type_covers (book_type_id, object_key) values ('rls-essays', 'book-types/rls-essays/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp') $$, '42501', null, 'a string "true" is not the staff claim');
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-000000000004", "role": "authenticated", "aal": "aal2", "user_metadata": {"staff": true}}';
select throws_ok($$ insert into public.book_type_covers (book_type_id, object_key) values ('rls-essays', 'book-types/rls-essays/cccccccc-cccc-4ccc-8ccc-cccccccccccc.webp') $$, '42501', null, 'user_metadata never grants staff');

-- Back to the owner: nothing above changed the fixtures (2).
reset role;
select results_eq($$ select object_key from public.book_type_covers where book_type_id = 'rls-novels' $$, $$ values ('book-types/rls-novels/11111111-1111-4111-8111-111111111111.webp') $$, 'the rls-novels key is unchanged');
select results_eq($$ select book_type_id from public.book_type_covers where book_type_id in ('rls-novels', 'rls-poetry') order by book_type_id $$, $$ values ('rls-novels'), ('rls-poetry') $$, 'both fixture rows still exist');

-- Staff claim and TOTP: AAL2 (7).
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-000000000005", "role": "authenticated", "aal": "aal2", "app_metadata": {"staff": true}}';
select results_eq($$ select book_type_id from public.book_type_covers where book_type_id like 'rls-%' order by book_type_id $$, $$ values ('rls-novels'), ('rls-poetry') $$, 'staff at aal2 reads both fixture rows');
select lives_ok($$ insert into public.book_type_covers (book_type_id, object_key) values ('rls-essays', 'book-types/rls-essays/33333333-3333-4333-8333-333333333333.webp') $$, 'staff at aal2 inserts a cover');
select lives_ok($$ update public.book_type_covers set object_key = 'book-types/rls-novels/44444444-4444-4444-8444-444444444444.webp' where book_type_id = 'rls-novels' $$, 'staff at aal2 updates the rls-novels key');
select results_eq($$ select object_key from public.book_type_covers where book_type_id = 'rls-novels' $$, $$ values ('book-types/rls-novels/44444444-4444-4444-8444-444444444444.webp') $$, 'the rls-novels key is the new one');
select lives_ok($$ delete from public.book_type_covers where book_type_id = 'rls-poetry' $$, 'staff at aal2 deletes the rls-poetry cover');
select is_empty($$ select book_type_id from public.book_type_covers where book_type_id = 'rls-poetry' $$, 'rls-poetry is gone');
select throws_ok($$ update public.book_type_covers set object_key = 'book-types/rls-poetry/55555555-5555-4555-8555-555555555555.webp' where book_type_id = 'rls-novels' $$, '23514', null, 'staff at aal2 cannot set a key outside the type folder');

select * from finish();
rollback;
