-- =============================================================
-- Dar Chatt — Customer Addresses (Phase 7)
--
-- Adds a per-customer address book so users can save delivery
-- addresses from their account area (account/addresses.html).
--
-- WHAT THIS FILE DOES:
--   1. Creates customer_addresses (owned by the auth user).
--   2. Enables RLS with strictly self-scoped policies:
--      a user can only SELECT/INSERT/UPDATE/DELETE their own rows.
--      Writes are validated by a WITH CHECK that forces
--      user_id = auth.uid() — nobody can write into someone
--      else's address book.
--   3. Keeps updated_at current (reuses public.set_updated_at()).
--
-- HOW TO RUN:
--   Run AFTER schema.sql, categories.sql, admin-panel.sql and
--   004-shop-ordering.sql. Safe to re-run (drop + create).
--   Open the Supabase SQL Editor and run this entire file.
-- =============================================================

-- -------------------------------------------------------------
-- 1. TABLE
-- -------------------------------------------------------------

create table if not exists public.customer_addresses (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references auth.users (id) on delete cascade,
    label       text not null default 'المنزل',
    full_name   text not null,
    phone       text not null,
    city        text not null,
    street      text not null,
    notes       text,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

create index if not exists customer_addresses_user_id_idx
    on public.customer_addresses (user_id);

-- -------------------------------------------------------------
-- 2. UPDATED_AT TRIGGER (reuses the helper from schema.sql)
-- -------------------------------------------------------------

drop trigger if exists customer_addresses_set_updated_at on public.customer_addresses;

create trigger customer_addresses_set_updated_at
    before update on public.customer_addresses
    for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 3. ROW LEVEL SECURITY — self-scoped only
-- -------------------------------------------------------------

alter table public.customer_addresses enable row level security;

drop policy if exists "customer_addresses_select_own" on public.customer_addresses;
create policy "customer_addresses_select_own"
    on public.customer_addresses for select
    to authenticated
    using (auth.uid() = user_id);

drop policy if exists "customer_addresses_insert_own" on public.customer_addresses;
create policy "customer_addresses_insert_own"
    on public.customer_addresses for insert
    to authenticated
    with check (auth.uid() = user_id);

drop policy if exists "customer_addresses_update_own" on public.customer_addresses;
create policy "customer_addresses_update_own"
    on public.customer_addresses for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

drop policy if exists "customer_addresses_delete_own" on public.customer_addresses;
create policy "customer_addresses_delete_own"
    on public.customer_addresses for delete
    to authenticated
    using (auth.uid() = user_id);

-- =============================================================
-- DONE — the account area can now manage saved addresses.
-- =============================================================