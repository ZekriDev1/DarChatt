-- =============================================================
-- Dar Chatt — Assign the FIRST Administrator
--
-- Run this AFTER database/schema.sql, inside the Supabase
-- SQL Editor. It is the ONLY secure way to grant the first
-- admin role: it runs with full privileges from your dashboard,
-- never from the client.
--
-- DO NOT share this file or run it from the website.
-- =============================================================

-- Step 1 — Find your auth user id (run this query first):
-- select id, email, created_at
-- from auth.users
-- order by created_at desc;

-- Step 2 — Replace the values below with your real user id and
-- email, then run the INSERT. If the profile row already exists
-- (e.g. created by the signup trigger), it is upgraded to admin.
-- =============================================================

insert into public.profiles (id, email, full_name, role)
values (
    '00000000-0000-0000-0000-000000000000',  -- <-- REPLACE: auth.users.id
    'admin@darchatt.ma',                     -- <-- REPLACE: your email
    'مدير المتجر',
    'admin'
)
on conflict (id) do update
set role = 'admin',
    email = excluded.email,
    updated_at = now();

-- Verify:
-- select id, email, role from public.profiles where role = 'admin';
-- =============================================================