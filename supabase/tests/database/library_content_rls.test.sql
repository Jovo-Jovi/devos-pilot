-- OD-10, docs/DATA_MODEL.md §3: who can read and write each table. The fixtures are synthetic and
-- rolled back. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(46);

-- Structure (14): both tables, RLS on, exactly the eight policies and their roles.
select has_table('public', 'library_notices', 'library_notices exists');
select has_table('public', 'opening_slots', 'opening_slots exists');
select ok((select relrowsecurity from pg_class where oid = 'public.library_notices'::regclass), 'library_notices has row level security');
select ok((select relrowsecurity from pg_class where oid = 'public.opening_slots'::regclass), 'opening_slots has row level security');
select policies_are('public', 'library_notices', array['library_notices_select_published', 'library_notices_select_staff', 'library_notices_insert_staff', 'library_notices_update_staff']::name[], 'library_notices has exactly its four policies');
select policies_are('public', 'opening_slots', array['opening_slots_select_all', 'opening_slots_insert_staff', 'opening_slots_update_staff', 'opening_slots_delete_staff']::name[], 'opening_slots has exactly its four policies');
select policy_roles_are('public', 'library_notices', 'library_notices_select_published', array['anon', 'authenticated']::name[], 'published notices: anon and authenticated');
select policy_roles_are('public', 'library_notices', 'library_notices_select_staff', array['authenticated']::name[], 'every notice: authenticated only');
select policy_roles_are('public', 'library_notices', 'library_notices_insert_staff', array['authenticated']::name[], 'insert a notice: authenticated only');
select policy_roles_are('public', 'library_notices', 'library_notices_update_staff', array['authenticated']::name[], 'update a notice: authenticated only');
select policy_roles_are('public', 'opening_slots', 'opening_slots_select_all', array['anon', 'authenticated']::name[], 'opening slots: anon and authenticated');
select policy_roles_are('public', 'opening_slots', 'opening_slots_insert_staff', array['authenticated']::name[], 'insert a slot: authenticated only');
select policy_roles_are('public', 'opening_slots', 'opening_slots_update_staff', array['authenticated']::name[], 'update a slot: authenticated only');
select policy_roles_are('public', 'opening_slots', 'opening_slots_delete_staff', array['authenticated']::name[], 'delete a slot: authenticated only');

-- Synthetic fixtures, inserted as the table owner.
insert into public.library_notices (id, status, published_on, title_ar, title_en, body_ar, body_en) values
  ('rls-published', 'published', '2026-01-02', 'إعلان منشور للاختبار', 'A published test notice', 'نص تجريبي', 'Test text'),
  ('rls-draft', 'draft', '2026-01-03', 'مسودة للاختبار', 'A draft test notice', 'نص تجريبي', 'Test text');
insert into public.opening_slots (id, day_of_week, opens_at, closes_at) values
  ('rls-slot', 2, '10:00', '12:00');

-- Anonymous visitor (8).
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select results_eq($$ select id from public.library_notices where id like 'rls-%' order by id $$, $$ values ('rls-published') $$, 'anon reads the published notice and not the draft');
select is_empty($$ select id from public.library_notices where status = 'draft' $$, 'anon reads no draft at all');
select throws_ok($$ insert into public.library_notices (published_on, title_ar, title_en, body_ar, body_en) values ('2026-01-04', 'أ', 'b', 'ج', 'd') $$, '42501', null, 'anon cannot insert a notice');
select throws_ok($$ update public.library_notices set title_en = 'changed' where id = 'rls-published' $$, '42501', null, 'anon cannot update a notice');
select throws_ok($$ delete from public.library_notices where id = 'rls-published' $$, '42501', null, 'anon cannot delete a notice');
select results_eq($$ select id from public.opening_slots where id = 'rls-slot' $$, $$ values ('rls-slot') $$, 'anon reads opening slots');
select throws_ok($$ insert into public.opening_slots (day_of_week, opens_at, closes_at) values (3, '10:00', '11:00') $$, '42501', null, 'anon cannot insert an opening slot');
select throws_ok($$ delete from public.opening_slots where id = 'rls-slot' $$, '42501', null, 'anon cannot delete an opening slot');

-- Signed in at AAL2 but without the staff claim (5).
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-000000000001", "role": "authenticated", "aal": "aal2", "app_metadata": {}}';
select is_empty($$ select id from public.library_notices where id = 'rls-draft' $$, 'no staff claim: the draft is hidden');
select throws_ok($$ insert into public.library_notices (published_on, title_ar, title_en, body_ar, body_en) values ('2026-01-04', 'أ', 'b', 'ج', 'd') $$, '42501', null, 'no staff claim: cannot insert a notice');
select lives_ok($$ update public.library_notices set title_en = 'changed' where id = 'rls-published' $$, 'no staff claim: the update runs but matches no row');
select throws_ok($$ delete from public.library_notices where id = 'rls-published' $$, '42501', null, 'no staff claim: cannot delete a notice');
select throws_ok($$ insert into public.opening_slots (day_of_week, opens_at, closes_at) values (3, '10:00', '11:00') $$, '42501', null, 'no staff claim: cannot insert an opening slot');

-- Staff claim, password only: AAL1 (5).
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-000000000002", "role": "authenticated", "aal": "aal1", "app_metadata": {"staff": true}}';
select is_empty($$ select id from public.library_notices where id = 'rls-draft' $$, 'staff at aal1: the draft is hidden');
select throws_ok($$ insert into public.library_notices (published_on, title_ar, title_en, body_ar, body_en) values ('2026-01-04', 'أ', 'b', 'ج', 'd') $$, '42501', null, 'staff at aal1: cannot insert a notice');
select lives_ok($$ update public.library_notices set title_en = 'changed' where id = 'rls-published' $$, 'staff at aal1: the update runs but matches no row');
select throws_ok($$ insert into public.opening_slots (day_of_week, opens_at, closes_at) values (3, '10:00', '11:00') $$, '42501', null, 'staff at aal1: cannot insert an opening slot');
select lives_ok($$ delete from public.opening_slots where id = 'rls-slot' $$, 'staff at aal1: the delete runs but matches no row');

-- Claims that only look like staff, at AAL2 (2).
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-000000000003", "role": "authenticated", "aal": "aal2", "app_metadata": {"staff": "true"}}';
select throws_ok($$ insert into public.library_notices (published_on, title_ar, title_en, body_ar, body_en) values ('2026-01-04', 'أ', 'b', 'ج', 'd') $$, '42501', null, 'a string "true" is not the staff claim');
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-000000000004", "role": "authenticated", "aal": "aal2", "user_metadata": {"staff": true}}';
select throws_ok($$ insert into public.library_notices (published_on, title_ar, title_en, body_ar, body_en) values ('2026-01-04', 'أ', 'b', 'ج', 'd') $$, '42501', null, 'user_metadata never grants staff');

-- Back to the owner: nothing above changed the fixtures (2).
reset role;
select results_eq($$ select title_en from public.library_notices where id = 'rls-published' $$, $$ values ('A published test notice') $$, 'no write without the staff claim and aal2 changed the notice');
select results_eq($$ select count(*)::int from public.opening_slots where id = 'rls-slot' $$, $$ values (1) $$, 'no delete without aal2 removed the opening slot');

-- Staff claim and TOTP: AAL2 (10).
set local role authenticated;
set local request.jwt.claims = '{"sub": "00000000-0000-4000-8000-000000000005", "role": "authenticated", "aal": "aal2", "app_metadata": {"staff": true}}';
select results_eq($$ select id from public.library_notices where id like 'rls-%' order by id $$, $$ values ('rls-draft'), ('rls-published') $$, 'staff at aal2 reads drafts too');
select lives_ok($$ insert into public.library_notices (published_on, title_ar, title_en, body_ar, body_en) values ('2026-01-04', 'إعلان جديد', 'A new notice', 'نص', 'Text') $$, 'staff at aal2 inserts a notice (a draft by default)');
select lives_ok($$ update public.library_notices set status = 'published' where id = 'rls-draft' $$, 'staff at aal2 publishes a draft');
select results_eq($$ select status from public.library_notices where id = 'rls-draft' $$, $$ values ('published') $$, 'the draft is now published');
select throws_ok($$ delete from public.library_notices where id = 'rls-draft' $$, '42501', null, 'nobody deletes a notice: staff unpublish instead');
select lives_ok($$ insert into public.opening_slots (id, day_of_week, opens_at, closes_at) values ('rls-slot-new', 4, '16:00', '18:00') $$, 'staff at aal2 inserts an opening slot');
select lives_ok($$ update public.opening_slots set closes_at = '13:00' where id = 'rls-slot' $$, 'staff at aal2 updates an opening slot');
select results_eq($$ select closes_at from public.opening_slots where id = 'rls-slot' $$, $$ values ('13:00') $$, 'the opening slot now closes at 13:00');
select lives_ok($$ delete from public.opening_slots where id = 'rls-slot' $$, 'staff at aal2 deletes an opening slot');
select is_empty($$ select id from public.opening_slots where id = 'rls-slot' $$, 'the opening slot is gone');

select * from finish();
rollback;
