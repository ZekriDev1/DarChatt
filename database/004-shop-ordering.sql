-- =============================================================
-- Dar Chatt — Public Shop Ordering (Phase 4) + RLS Re-run Fix
--
-- WHY THIS FILE:
--   Re-running database/admin-panel.sql fails with:
--     ERROR 42710: policy "products_public_read_active" already exists
--   and dropping policies on tables that don't exist yet fails with:
--     ERROR 42P01: relation "public.order_status_history" does not exist
--   This migration is SELF-CONTAINED and IDEMPOTENT: it creates the
--   tables first (if not exists), drops every policy (if exists),
--   recreates them, then adds the secure place_order RPC.
--
-- WHAT IT DOES:
--   1. Creates products / orders / order_items / order_status_history /
--      settings / admin_activity_logs tables (if not exists).
--   2. Drops and recreates every RLS policy (products, orders,
--      order_items, order_status_history, settings, admin_activity_logs,
--      storage buckets for products / site / categories).
--   3. Adds secure public.place_order() — customers place COD orders
--      through this RPC; prices/stock are validated server-side.
--
-- HOW TO RUN:
--   Run AFTER database/schema.sql and categories.sql (which create
--   profiles + categories + their policies). This file can be run
--   ANY number of times safely. Open the Supabase SQL Editor and
--   run this entire file.
-- =============================================================

-- -------------------------------------------------------------
-- 1. TABLES (idempotent — safe to re-run)
-- -------------------------------------------------------------

alter table public.profiles
    add column if not exists phone text;

alter table public.categories
    add column if not exists name_en text;

create table if not exists public.products (
    id                  uuid primary key default gen_random_uuid(),
    name_ar             text not null check (char_length(trim(name_ar)) > 0),
    name_en             text,
    description_ar      text,
    description_en      text,
    slug                text not null unique,
    sku                 text,
    category_id         uuid references public.categories (id) on delete restrict,
    price               numeric(12, 2) not null default 0 check (price >= 0),
    old_price           numeric(12, 2) check (old_price is null or old_price >= 0),
    is_sale             boolean not null default false,
    stock               integer not null default 0 check (stock >= 0),
    stock_status        text not null default 'in_stock'
                            check (stock_status in ('in_stock', 'low_stock', 'out_of_stock')),
    allow_out_of_stock  boolean not null default false,
    image_url           text,
    images              jsonb not null default '[]'::jsonb,
    is_active           boolean not null default true,
    is_featured         boolean not null default false,
    meta_title          text,
    meta_description    text,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    check (not is_sale or old_price is not null)
);

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx on public.products (is_active);
create index if not exists products_created_idx on public.products (created_at desc);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
    before update on public.products
    for each row execute function public.set_updated_at();

create sequence if not exists public.orders_number_seq;

create table if not exists public.orders (
    id              uuid primary key default gen_random_uuid(),
    order_number    text not null unique default (
                        'DC-' || to_char(now(), 'YYYY') || '-' ||
                        lpad(nextval('public.orders_number_seq')::text, 4, '0')
                    ),
    customer_id     uuid references public.profiles (id) on delete set null,
    customer_name   text not null check (char_length(trim(customer_name)) > 0),
    customer_phone  text not null,
    customer_email  text,
    city            text not null,
    address         text not null,
    notes           text,
    subtotal        numeric(12, 2) not null default 0 check (subtotal >= 0),
    shipping_fee    numeric(12, 2) not null default 0 check (shipping_fee >= 0),
    discount        numeric(12, 2) not null default 0 check (discount >= 0),
    total           numeric(12, 2) not null default 0 check (total >= 0),
    payment_method  text not null default 'cod' check (payment_method = 'cod'),
    status          text not null default 'new' check (status in (
                        'new', 'confirmed', 'processing', 'ready_to_ship',
                        'shipped', 'completed', 'cancelled'
                    )),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
    before update on public.orders
    for each row execute function public.set_updated_at();

create table if not exists public.order_items (
    id              uuid primary key default gen_random_uuid(),
    order_id        uuid not null references public.orders (id) on delete cascade,
    product_id      uuid references public.products (id) on delete set null,
    product_name    text not null,
    product_image   text,
    unit_price      numeric(12, 2) not null check (unit_price >= 0),
    quantity        integer not null check (quantity > 0),
    subtotal        numeric(12, 2) not null check (subtotal >= 0),
    created_at      timestamptz not null default now()
);

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

create table if not exists public.order_status_history (
    id          uuid primary key default gen_random_uuid(),
    order_id    uuid not null references public.orders (id) on delete cascade,
    status      text not null,
    changed_by  uuid references public.profiles (id) on delete set null,
    changed_at  timestamptz not null default now()
);

create index if not exists order_status_history_order_idx
    on public.order_status_history (order_id);

create table if not exists public.settings (
    id          bigint generated always as identity primary key,
    key         text not null unique,
    value       jsonb not null default '{}'::jsonb,
    updated_at  timestamptz not null default now()
);

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
    before update on public.settings
    for each row execute function public.set_updated_at();

create table if not exists public.admin_activity_logs (
    id          uuid primary key default gen_random_uuid(),
    admin_id    uuid references public.profiles (id) on delete cascade,
    admin_email text,
    action      text not null,
    entity_type text,
    entity_id   text,
    details     jsonb,
    created_at  timestamptz not null default now()
);

create index if not exists admin_activity_logs_created_idx
    on public.admin_activity_logs (created_at desc);
create index if not exists admin_activity_logs_action_idx
    on public.admin_activity_logs (action);

-- -------------------------------------------------------------
-- 2. DROP OLD POLICIES (safe to re-run)
-- -------------------------------------------------------------

-- Products
drop policy if exists "products_public_read_active" on public.products;
drop policy if exists "products_admin_select" on public.products;
drop policy if exists "products_admin_insert" on public.products;
drop policy if exists "products_admin_update" on public.products;
drop policy if exists "products_admin_delete" on public.products;

-- Orders
drop policy if exists "orders_admin_select" on public.orders;
drop policy if exists "orders_customer_select_own" on public.orders;
drop policy if exists "orders_admin_insert" on public.orders;
drop policy if exists "orders_admin_update" on public.orders;
drop policy if exists "orders_admin_delete" on public.orders;

-- Order items
drop policy if exists "order_items_admin_all" on public.order_items;
drop policy if exists "order_items_customer_select_own" on public.order_items;

-- Order status history
drop policy if exists "order_status_history_admin_all" on public.order_status_history;

-- Settings
drop policy if exists "settings_admin_all" on public.settings;

-- Admin activity log
drop policy if exists "admin_activity_logs_admin_all" on public.admin_activity_logs;

-- Storage: products bucket
drop policy if exists "products_storage_public_read" on storage.objects;
drop policy if exists "products_storage_admin_insert" on storage.objects;
drop policy if exists "products_storage_admin_update" on storage.objects;
drop policy if exists "products_storage_admin_delete" on storage.objects;

-- Storage: site bucket
drop policy if exists "site_storage_public_read" on storage.objects;
drop policy if exists "site_storage_admin_insert" on storage.objects;
drop policy if exists "site_storage_admin_update" on storage.objects;
drop policy if exists "site_storage_admin_delete" on storage.objects;

-- Storage: categories bucket (from categories.sql — kept idempotent too)
drop policy if exists "categories_storage_public_read" on storage.objects;
drop policy if exists "categories_storage_admin_insert" on storage.objects;
drop policy if exists "categories_storage_admin_update" on storage.objects;
drop policy if exists "categories_storage_admin_delete" on storage.objects;

-- -------------------------------------------------------------
-- 3. PRODUCTS RLS
-- -------------------------------------------------------------

alter table public.products enable row level security;

create policy "products_public_read_active"
    on public.products for select
    to anon, authenticated
    using (is_active = true);

create policy "products_admin_select"
    on public.products for select
    to authenticated
    using (public.is_admin());

create policy "products_admin_insert"
    on public.products for insert
    to authenticated
    with check (public.is_admin());

create policy "products_admin_update"
    on public.products for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "products_admin_delete"
    on public.products for delete
    to authenticated
    using (public.is_admin());

-- -------------------------------------------------------------
-- 4. ORDERS RLS
-- -------------------------------------------------------------

alter table public.orders enable row level security;

create policy "orders_admin_select"
    on public.orders for select
    to authenticated
    using (public.is_admin());

create policy "orders_customer_select_own"
    on public.orders for select
    to authenticated
    using (customer_id = auth.uid());

create policy "orders_admin_insert"
    on public.orders for insert
    to authenticated
    with check (public.is_admin());

create policy "orders_admin_update"
    on public.orders for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "orders_admin_delete"
    on public.orders for delete
    to authenticated
    using (public.is_admin());

-- -------------------------------------------------------------
-- 5. ORDER ITEMS RLS
-- -------------------------------------------------------------

alter table public.order_items enable row level security;

create policy "order_items_admin_all"
    on public.order_items for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

create policy "order_items_customer_select_own"
    on public.order_items for select
    to authenticated
    using (
        exists (
            select 1
            from public.orders o
            where o.id = order_id
              and o.customer_id = auth.uid()
        )
    );

-- -------------------------------------------------------------
-- 6. ORDER STATUS HISTORY RLS
-- -------------------------------------------------------------

alter table public.order_status_history enable row level security;

create policy "order_status_history_admin_all"
    on public.order_status_history for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- -------------------------------------------------------------
-- 7. SETTINGS RLS
-- -------------------------------------------------------------

alter table public.settings enable row level security;

create policy "settings_admin_all"
    on public.settings for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- -------------------------------------------------------------
-- 8. ADMIN ACTIVITY LOG RLS
-- -------------------------------------------------------------

alter table public.admin_activity_logs enable row level security;

create policy "admin_activity_logs_admin_all"
    on public.admin_activity_logs for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- -------------------------------------------------------------
-- 9. STORAGE RLS (products + site + categories buckets)
-- -------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('site', 'site', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('categories', 'categories', true)
on conflict (id) do nothing;

-- products bucket
create policy "products_storage_public_read"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'products');

create policy "products_storage_admin_insert"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'products' and public.is_admin());

create policy "products_storage_admin_update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'products' and public.is_admin())
    with check (bucket_id = 'products' and public.is_admin());

create policy "products_storage_admin_delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'products' and public.is_admin());

-- site bucket
create policy "site_storage_public_read"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'site');

create policy "site_storage_admin_insert"
    on storage.objects for insert
    to authenticated
    with check (bucket_id = 'site' and public.is_admin());

create policy "site_storage_admin_update"
    on storage.objects for update
    to authenticated
    using (bucket_id = 'site' and public.is_admin())
    with check (bucket_id = 'site' and public.is_admin());

create policy "site_storage_admin_delete"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'site' and public.is_admin());

-- categories bucket
create policy "categories_storage_public_read"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'categories');

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
-- 10. PUBLIC ORDER PLACEMENT (secure RPC)
--
-- The orders table is admin-only under RLS. Customers place an
-- order through this security-definer function so prices and
-- stock are validated server-side from the database — the client
-- can never send its own totals. create or replace = re-runnable.
-- -------------------------------------------------------------

create or replace function public.place_order(
    p_items         jsonb,
    p_customer_name text,
    p_customer_phone text,
    p_customer_email text,
    p_city          text,
    p_address       text,
    p_notes         text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_order_id       uuid;
    v_order_number   text;
    v_subtotal       numeric(12, 2) := 0;
    v_shipping_fee   numeric(12, 2) := 0;
    v_free_threshold numeric(12, 2) := null;
    v_item           jsonb;
    v_product        public.products%rowtype;
    v_qty            integer;
    v_line_total     numeric(12, 2);
begin
    -- Basic validation -------------------------------------------------
    if p_items is null or jsonb_array_length(p_items) = 0 then
        raise exception 'السلة فارغة';
    end if;

    if p_customer_name is null or char_length(trim(p_customer_name)) = 0 then
        raise exception 'يرجى إدخال الاسم الكامل';
    end if;

    if p_customer_phone is null or char_length(trim(p_customer_phone)) = 0 then
        raise exception 'يرجى إدخال رقم الهاتف';
    end if;

    if p_city is null or char_length(trim(p_city)) = 0 then
        raise exception 'يرجى إدخال المدينة';
    end if;

    if p_address is null or char_length(trim(p_address)) = 0 then
        raise exception 'يرجى إدخال العنوان';
    end if;

    -- Shipping settings (currency is always MAD, COD only) ------------
    select (value ->> 'shipping_fee')::numeric
    into v_shipping_fee
    from public.settings
    where key = 'shipping'
    limit 1;

    v_shipping_fee := coalesce(v_shipping_fee, 0);

    select (value ->> 'free_shipping_threshold')::numeric
    into v_free_threshold
    from public.settings
    where key = 'shipping'
    limit 1;

    -- Create the order first ------------------------------------------
    insert into public.orders (
        customer_id,
        customer_name,
        customer_phone,
        customer_email,
        city,
        address,
        notes,
        subtotal,
        shipping_fee,
        discount,
        total,
        payment_method,
        status
    )
    values (
        auth.uid(),
        trim(p_customer_name),
        trim(p_customer_phone),
        nullif(trim(coalesce(p_customer_email, '')), ''),
        trim(p_city),
        trim(p_address),
        nullif(trim(coalesce(p_notes, '')), ''),
        0,
        0,
        0,
        0,
        'cod',
        'new'
    )
    returning id, order_number into v_order_id, v_order_number;

    -- Insert items, validating each against the real DB price ---------
    for v_item in select * from jsonb_array_elements(p_items)
    loop
        v_qty := (v_item ->> 'quantity')::integer;

        if v_qty is null or v_qty < 1 then
            raise exception 'كمية غير صالحة';
        end if;

        select *
        into v_product
        from public.products
        where id = (v_item ->> 'product_id')::uuid;

        if not found then
            raise exception 'منتج غير موجود في السلة';
        end if;

        if not v_product.is_active then
            raise exception 'المنتج غير متاح حالياً';
        end if;

        if v_product.stock_status = 'out_of_stock'
           or (v_product.stock < v_qty and not v_product.allow_out_of_stock) then
            raise exception '%', 'الكمية المطلوبة غير متوفرة من: ' || coalesce(v_product.name_ar, v_product.name_en, 'المنتج');
        end if;

        v_line_total := v_product.price * v_qty;
        v_subtotal := v_subtotal + v_line_total;

        insert into public.order_items (
            order_id,
            product_id,
            product_name,
            product_image,
            unit_price,
            quantity,
            subtotal
        )
        values (
            v_order_id,
            v_product.id,
            coalesce(v_product.name_ar, v_product.name_en, 'منتج'),
            v_product.image_url,
            v_product.price,
            v_qty,
            v_line_total
        );

        -- Decrement stock (respecting allow_out_of_stock) --------------
        if not v_product.allow_out_of_stock and v_product.stock_status <> 'out_of_stock' then
            update public.products
            set stock = stock - v_qty
            where id = v_product.id
              and stock >= v_qty;

            if not found then
                raise exception '%', 'الكمية المطلوبة غير متوفرة من: ' || coalesce(v_product.name_ar, v_product.name_en, 'المنتج');
            end if;
        end if;
    end loop;

    -- Free shipping when threshold reached ----------------------------
    if v_free_threshold is not null and v_subtotal >= v_free_threshold then
        v_shipping_fee := 0;
    end if;

    -- Finalize totals --------------------------------------------------
    update public.orders
    set subtotal     = v_subtotal,
        shipping_fee = v_shipping_fee,
        total        = v_subtotal + v_shipping_fee
    where id = v_order_id;

    insert into public.order_status_history (order_id, status, changed_by)
    values (v_order_id, 'new', auth.uid());

    return jsonb_build_object(
        'id',          v_order_id,
        'order_number', v_order_number,
        'total',       v_subtotal + v_shipping_fee,
        'status',      'new'
    );
end;
$$;

revoke all on function public.place_order(jsonb, text, text, text, text, text, text) from public;

grant execute on function public.place_order(jsonb, text, text, text, text, text, text) to anon, authenticated;

-- =============================================================
-- DONE — re-run safe. Next: /admin/login.html or open the shop.
-- =============================================================