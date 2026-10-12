-- OD-10 §5, docs/DATA_MODEL.md §2 and §9: the T12 migration moved every row of
-- content/library-notices.json and content/opening-slots.json, field for field. Run with `supabase test db`.
begin;
create extension if not exists pgtap with schema extensions;
select plan(17);

-- Counts (4): 4 notices (3 published, 1 draft) and 7 opening slots, as in the JSON files.
select results_eq($$ select count(*)::int from public.library_notices $$, $$ values (4) $$, 'four notices moved');
select results_eq($$ select count(*)::int from public.library_notices where status = 'published' $$, $$ values (3) $$, 'three of them are published');
select results_eq($$ select count(*)::int from public.library_notices where status = 'draft' $$, $$ values (1) $$, 'one of them is a draft');
select results_eq($$ select count(*)::int from public.opening_slots $$, $$ values (7) $$, 'seven opening slots moved');

-- Every notice, field for field (4).
select results_eq($$ select status, published_on::text, title_ar, title_en, body_ar, body_en from public.library_notices where id = 'reading-club-october' $$, $$ values ('published', '2026-10-04', 'نادي القراءة يعود في أكتوبر', 'The reading club returns in October', 'يجتمع نادي القراءة كل خميس في الساعة 17:00 في قاعة الطابق الأول.', 'The reading club meets every Thursday at 17:00 in the first-floor hall.') $$, 'reading-club-october, field for field');
select results_eq($$ select status, published_on::text, title_ar, title_en, body_ar, body_en from public.library_notices where id = 'new-arabic-arrivals' $$, $$ values ('published', '2026-09-21', 'وصول كتب عربية جديدة', 'New Arabic titles have arrived', 'أضفنا 120 عنوانًا جديدًا إلى قسم الأدب العربي.', 'We added 120 new titles to the Arabic literature section.') $$, 'new-arabic-arrivals, field for field');
select results_eq($$ select status, published_on::text, title_ar, title_en, body_ar, body_en from public.library_notices where id = 'national-holiday-closure' $$, $$ values ('published', '2026-10-01', 'إغلاق المكتبة يوم 6 أكتوبر', 'Library closed on 6 October', 'تغلق المكتبة أبوابها يوم 6 أكتوبر وتعود للعمل في اليوم التالي.', 'The library is closed on 6 October and reopens the next day.') $$, 'national-holiday-closure, field for field');
select results_eq($$ select status, published_on::text, title_ar, title_en, body_ar, body_en from public.library_notices where id = 'maker-space-draft' $$, $$ values ('draft', '2026-10-20', 'مساحة الصناع (مسودة)', 'Maker space (draft)', 'مسودة لا تُعرض.', 'A draft that must never render.') $$, 'maker-space-draft, field for field');

-- Every opening slot, field for field (7).
select results_eq($$ select day_of_week::int, opens_at, closes_at, note_ar, note_en from public.opening_slots where id = 'sat-morning' $$, $$ values (6, '09:00', '14:00', null::text, null::text) $$, 'sat-morning, field for field');
select results_eq($$ select day_of_week::int, opens_at, closes_at, note_ar, note_en from public.opening_slots where id = 'sat-evening' $$, $$ values (6, '17:00', '21:00', null::text, null::text) $$, 'sat-evening, field for field');
select results_eq($$ select day_of_week::int, opens_at, closes_at, note_ar, note_en from public.opening_slots where id = 'sun' $$, $$ values (0, '09:00', '21:00', null::text, null::text) $$, 'sun, field for field');
select results_eq($$ select day_of_week::int, opens_at, closes_at, note_ar, note_en from public.opening_slots where id = 'mon' $$, $$ values (1, '09:00', '21:00', null::text, null::text) $$, 'mon, field for field');
select results_eq($$ select day_of_week::int, opens_at, closes_at, note_ar, note_en from public.opening_slots where id = 'tue' $$, $$ values (2, '09:00', '21:00', null::text, null::text) $$, 'tue, field for field');
select results_eq($$ select day_of_week::int, opens_at, closes_at, note_ar, note_en from public.opening_slots where id = 'wed' $$, $$ values (3, '09:00', '21:00', null::text, null::text) $$, 'wed, field for field');
select results_eq($$ select day_of_week::int, opens_at, closes_at, note_ar, note_en from public.opening_slots where id = 'thu' $$, $$ values (4, '09:00', '15:00', 'يوم مختصر', 'Short day') $$, 'thu, field for field');

-- What an anonymous visitor reads of the moved rows (2).
set local role anon;
set local request.jwt.claims = '{"role": "anon"}';
select results_eq($$ select id from public.library_notices order by published_on desc $$, $$ values ('reading-club-october'), ('national-holiday-closure'), ('new-arabic-arrivals') $$, 'anon reads the three published notices, newest first, and never the draft');
select results_eq($$ select count(*)::int from public.opening_slots $$, $$ values (7) $$, 'anon reads all seven opening slots');

select * from finish();
rollback;
