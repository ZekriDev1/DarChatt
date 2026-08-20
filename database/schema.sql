-- =============================================================
-- Dar Chatt — Supabase Database Schema
-- Admin Panel — Phase 1 (Authentication + Authorization)
--
-- HOW TO RUN:
--   1. Open your Supabase project dashboard.
--   2. Go to SQL Editor.
--   3. Paste this entire file and run it.
--   4. Then run database/set-first-admin.sql to assign the
--      first administrator.
--
-- SECURITY MODEL:
--   * profiles.id  -> auth.users(id)   (1:1, cascade delete)
--   * role          -> 'admin' | 'customer'  (default: 'customer')
--   * RLS enabled. No insert policy: profiles are created ONLY by
--     the auth trigger, never by the user themselves.
--   * A trigger HARD-BLOCKS any non-admin from changing the role
--     column (defense in depth on top of RLS policies).
-- =============================================================

-- -------------------------------------------------------------
-- 1. PROFILES — user roles table
-- -------------------------------------------------------------

create table if not exists public.profiles (
    id          uuid primary key references auth.users (id) on delete cascade,
    email       text,
    full_name   text not null default '',
    role        text not null default 'customer'
                    check (role in ('admin', 'customer')),
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

comment on table public.profiles is 'مستخدميدار الشاط
مع صلاحياتهم';
comment on column public.profiles.role is 'admin أو customer فقط';

-- Keep updated_at current on every change
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
    before update on public.profiles
    for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 2. AUTO-CREATE PROFILE ON SIGNUP
-- Every new auth user gets a profile with role = 'customer'.
-- No user can insert their own profile row, so the role default
-- is always enforced by this trigger.
-- -------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name)
    values (
        new.id,
        new.email,
        coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), '')
    )
    on conflict (id) do nothing;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- -------------------------------------------------------------
-- 3. IS_ADMIN() HELPER
-- SECURITY DEFINER: safe to call from policies and triggers.
-- Returns true only when the CURRENT session user has role='admin'.
-- A user cannot pass arguments; it always checks auth.uid().
-- -------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1
        from public.profiles
        where id = auth.uid()
          and role = 'admin'
    );
$$;

-- -------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
-- -------------------------------------------------------------

alter table public.profiles enable row level security;

-- 4.1 Read: every authenticated user may read ONLY their own profile.
create policy "profiles_select_own"
    on public.profiles for select
    to authenticated
    using (auth.uid() = id);

-- 4.2 Read: admins may read all profiles (customers list, etc.).
create policy "profiles_select_admin"
    on public.profiles for select
    to authenticated
    using (public.is_admin());

-- 4.3 NO insert policy.
-- Users can never insert a row into profiles — not even their own.
-- Profiles are created exclusively by the handle_new_user() trigger.

-- 4.4 Update: users may update only their own row.
-- Changing the role column is additionally blocked by the
-- guard trigger below, so self-promotion is impossible.
create policy "profiles_update_self"
    on public.profiles for update
    to authenticated
    using (auth.uid() = id)
    with check (auth.uid() = id);

-- 4.5 Update: admins may update any profile (role management).
create policy "profiles_update_admin"
    on public.profiles for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- 4.6 No delete policy. Deletion happens via auth.users cascade.

-- -------------------------------------------------------------
-- 5. HARD GUARD AGAINST SELF-PROMOTION
-- Even if a policy is ever misconfigured, this trigger rejects
-- any role change made by a non-admin.
-- -------------------------------------------------------------

create or replace function public.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    if new.role is distinct from old.role and not public.is_admin() then
        raise exception 'تغيير الصلاحية مسموح للإداريين فقط';
    end if;
    return new;
end;
$$;

drop trigger if exists profiles_guard_role on public.profiles;
create trigger profiles_guard_role
    before update on public.profiles
    for each row execute function public.guard_profile_role();

-- -------------------------------------------------------------
-- 6. FUTURE ADMIN TABLES (Phase 2+)
-- When products / orders / categories tables are created, they
-- must be protected exactly like this so ONLY admins can touch
-- them (public visitors get nothing):
--
--     alter table public.products enable row level security;
--     create policy "products_admin_all"
--         on public.products for all
--         to authenticated
--         using (public.is_admin())
--         with check (public.is_admin());
--
-- Never create policies that grant 'customer' roles write access
-- to administrative data.
-- -------------------------------------------------------------