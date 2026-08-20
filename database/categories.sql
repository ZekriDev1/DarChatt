-- =============================================================
-- Dar Chatt — Categories Database Structure
-- Category Management System (Phase 2)
--
-- HOW TO RUN:
--   1. This file must be run AFTER database/schema.sql
--      (it reuses public.is_admin()).
--   2. Open the Supabase SQL Editor and run this file.
--
-- SECURITY MODEL:
--   Visitor        -> read is_active = true only
--   Customer       -> read is_active = true only
--   Admin          -> full management (select all, insert, update,
--                     delete) — enforced by RLS + is_admin()
--   No policy ever grants customers write access.
-- =============================================================

-- -------------------------------------------------------------
-- 1. CATEGORIES TABLE
-- -------------------------------------------------------------

create table if not exists public.categories (
    id          uuid primary key default gen_random_uuid(),
    name        text not null check (char_length(trim(name)) > 0),
    slug        text not null unique,
    description text,
    image_url   text,
    parent_id   uuid references public.categories (id) on delete restrict,
    is_active   boolean not null default true,
    sort_order  integer not null default 0,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now(),
    -- A category can never be its own parent.
    check (parent_id <> id)
);

comment on table public.categories is 'تصنيفات دار شاط';
comment on column public.categories.slug is 'رابط مختصر فريد';
comment on column public.categories.parent_id is 'التصنيف الرئيسي (يدعم مستويات غير محدودة)';

-- Keep updated_at current (reuses the helper from schema.sql)
drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
    before update on public.categories
    for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 2. PREVENT CYCLES IN PARENT RELATIONSHIPS
-- A category can never become its own ancestor (a -> b -> a is
-- rejected), keeping the tree valid for unlimited nesting.
-- -------------------------------------------------------------

create or replace function public.prevent_category_cycle()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
    is_cycle boolean;
begin
    if new.parent_id is null then
        return new;
    end if;

    if new.parent_id = new.id then
        raise exception 'التصنيف لا يمكن أن يكون أباً لنفسه';
    end if;

    with recursive ancestors as (
        select c.id, c.parent_id
        from public.categories c
        where c.id = new.parent_id
        union all
        select c.id, c.parent_id
        from public.categories c
        join ancestors a on c.id = a.parent_id
    )
    select exists (select 1 from ancestors where id = new.id)
    into is_cycle;

    if is_cycle then
        raise exception 'لا يمكن جعل هذا التصنيف فرعياً لأنه سينشئ حلقة';
    end if;

    return new;
end;
$$;

drop trigger if exists categories_prevent_cycle on public.categories;
create trigger categories_prevent_cycle
    before insert or update of parent_id on public.categories
    for each row execute function public.prevent_category_cycle();

-- -------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- -------------------------------------------------------------

alter table public.categories enable row level security;

-- 3.1 Public visitors and customers: read ACTIVE categories only.
create policy "categories_public_read_active"
    on public.categories for select
    to anon, authenticated
    using (is_active = true);

-- 3.2 Admins: read every category (including inactive ones).
create policy "categories_admin_select"
    on public.categories for select
    to authenticated
    using (public.is_admin());

-- 3.3 Admins only: create.
create policy "categories_admin_insert"
    on public.categories for insert
    to authenticated
    with check (public.is_admin());

-- 3.4 Admins only: update (name, slug, status, order, ...).
create policy "categories_admin_update"
    on public.categories for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- 3.5 Admins only: delete.
create policy "categories_admin_delete"
    on public.categories for delete
    to authenticated
    using (public.is_admin());

-- NOTE: there is deliberately NO policy allowing customers to
-- create / edit / delete / toggle categories.

-- -------------------------------------------------------------
-- 4. CATEGORY IMAGES — SUPABASE STORAGE
-- Images are stored in a dedicated public bucket; the database
-- keeps only the URL. Write access is admin-only.
-- -------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('categories', 'categories', true)
on conflict (id) do nothing;

-- Public read (so public website images render).
create policy "categories_storage_public_read"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'categories');

-- Admin-only upload / replace / delete.
create policy "categories_storage_admin_insert"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'categories' and public.is_admin());

create policy "categories_storage_admin_update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'categories' and public.is_admin())
    with check (bucket_id = 'categories' and public.is_admin());

create policy "categories_storage_admin_delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'categories' and public.is_admin());

-- -------------------------------------------------------------
-- 5. SAMPLE DATA (optional)
-- Uncomment to seed the first categories:
--
-- insert into public.categories (name, slug, sort_order) values
--     ('العطور', 'parfums', 1),
--     ('العناية بالبشرة', 'skincare', 2),
--     ('الإكسسوارات', 'accessories', 3);
-- -------------------------------------------------------------