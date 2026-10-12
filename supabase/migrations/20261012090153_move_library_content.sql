-- OD-10 §5, docs/DATA_MODEL.md §2 and §9: the signed content of content/library-notices.json and
-- content/opening-slots.json, field for field. Forward-only: never edit this file once it is on main.
-- The JSON files stay in the tree as the record of what moved; the app reads them until T13.

insert into public.library_notices (id, status, published_on, title_ar, title_en, body_ar, body_en) values
  ('reading-club-october', 'published', '2026-10-04', 'نادي القراءة يعود في أكتوبر', 'The reading club returns in October', 'يجتمع نادي القراءة كل خميس في الساعة 17:00 في قاعة الطابق الأول.', 'The reading club meets every Thursday at 17:00 in the first-floor hall.'),
  ('new-arabic-arrivals', 'published', '2026-09-21', 'وصول كتب عربية جديدة', 'New Arabic titles have arrived', 'أضفنا 120 عنوانًا جديدًا إلى قسم الأدب العربي.', 'We added 120 new titles to the Arabic literature section.'),
  ('national-holiday-closure', 'published', '2026-10-01', 'إغلاق المكتبة يوم 6 أكتوبر', 'Library closed on 6 October', 'تغلق المكتبة أبوابها يوم 6 أكتوبر وتعود للعمل في اليوم التالي.', 'The library is closed on 6 October and reopens the next day.'),
  ('maker-space-draft', 'draft', '2026-10-20', 'مساحة الصناع (مسودة)', 'Maker space (draft)', 'مسودة لا تُعرض.', 'A draft that must never render.')
on conflict (id) do nothing;

insert into public.opening_slots (id, day_of_week, opens_at, closes_at, note_ar, note_en) values
  ('sat-morning', 6, '09:00', '14:00', null, null),
  ('sat-evening', 6, '17:00', '21:00', null, null),
  ('sun', 0, '09:00', '21:00', null, null),
  ('mon', 1, '09:00', '21:00', null, null),
  ('tue', 2, '09:00', '21:00', null, null),
  ('wed', 3, '09:00', '21:00', null, null),
  ('thu', 4, '09:00', '15:00', 'يوم مختصر', 'Short day')
on conflict (id) do nothing;
