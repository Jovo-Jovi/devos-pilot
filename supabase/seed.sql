-- Synthetic seed for the local and CI database only (OD-10, docs/DATA_MODEL.md §8).
-- `supabase db push` never runs it, so nothing here reaches the hosted project.
-- Rules: reserved email domains only (example.com, example.org, example.net, .test), invented
-- names, never a real person's data (guard:data).
-- T14: three synthetic accounts on example.com. The password and the TOTP secret are named
-- test values, not anyone's credentials.
-- (a) staff, no factor. (b) staff with a verified totp factor. (c) no staff claim.
-- Idempotent under `db reset` (the database is empty) and under a second run of this file.

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change,
  created_at,
  updated_at,
  is_sso_user,
  is_anonymous
) values
  (
    '00000000-0000-0000-0000-000000000000',
    'a14a14a1-14a1-44a1-84a1-14a114a114a1',
    'authenticated',
    'authenticated',
    'staff-enrol@example.com',
    extensions.crypt('synthetic-test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"staff":true}'::jsonb,
    '{}'::jsonb,
    '',
    '',
    '',
    '',
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'b14b14b1-14b1-44b1-84b1-14b114b114b1',
    'authenticated',
    'authenticated',
    'staff-totp@example.com',
    extensions.crypt('synthetic-test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"],"staff":true}'::jsonb,
    '{}'::jsonb,
    '',
    '',
    '',
    '',
    now(),
    now(),
    false,
    false
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'c14c14c1-14c1-44c1-84c1-14c114c114c1',
    'authenticated',
    'authenticated',
    'visitor-account@example.com',
    extensions.crypt('synthetic-test-password', extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    '',
    '',
    '',
    '',
    now(),
    now(),
    false,
    false
  )
on conflict (id) do nothing;

-- email is generated from identity_data->>'email'; do not insert it.
insert into auth.identities (
  id,
  user_id,
  identity_data,
  provider,
  provider_id,
  created_at,
  updated_at
) values
  (
    'a14a14a1-14a1-44a1-84a1-14a114a114a2',
    'a14a14a1-14a1-44a1-84a1-14a114a114a1',
    jsonb_build_object('sub', 'a14a14a1-14a1-44a1-84a1-14a114a114a1', 'email', 'staff-enrol@example.com'),
    'email',
    'a14a14a1-14a1-44a1-84a1-14a114a114a1',
    now(),
    now()
  ),
  (
    'b14b14b1-14b1-44b1-84b1-14b114b114b2',
    'b14b14b1-14b1-44b1-84b1-14b114b114b1',
    jsonb_build_object('sub', 'b14b14b1-14b1-44b1-84b1-14b114b114b1', 'email', 'staff-totp@example.com'),
    'email',
    'b14b14b1-14b1-44b1-84b1-14b114b114b1',
    now(),
    now()
  ),
  (
    'c14c14c1-14c1-44c1-84c1-14c114c114c2',
    'c14c14c1-14c1-44c1-84c1-14c114c114c1',
    jsonb_build_object('sub', 'c14c14c1-14c1-44c1-84c1-14c114c114c1', 'email', 'visitor-account@example.com'),
    'email',
    'c14c14c1-14c1-44c1-84c1-14c114c114c1',
    now(),
    now()
  )
on conflict (id) do nothing;

insert into auth.mfa_factors (
  id,
  user_id,
  friendly_name,
  factor_type,
  status,
  created_at,
  updated_at,
  secret
) values (
  'b14b14b1-14b1-44b1-84b1-14b114b114b3',
  'b14b14b1-14b1-44b1-84b1-14b114b114b1',
  'Synthetic TOTP',
  'totp',
  'verified',
  now(),
  now(),
  'PILOTTOTPSECRETA'
)
on conflict (id) do nothing;
