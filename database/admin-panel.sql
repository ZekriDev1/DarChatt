-- =============================================================
-- Dar Chatt — Admin Panel Database (Phase 3: Full Admin System)
--
-- HOW TO RUN:
--   1. Must run AFTER database/schema.sql and database/categories.sql
--      (reuses public.is_admin(), public.set_updated_at()).
--   2. Open the Supabase SQL Editor and run this entire file.
--
-- WHAT THIS FILE ADDS:
--   * profiles.phone            -> customer phone (customers page)
--   * categories.name_en        -> English category name
--   * products                  -> full product catalog
--   * orders + order_items      -> COD orders (الدفع عند الاستلام)
--   * settings                  -> key/value site settings (JSONB)
--   * admin_activity_logs       -> admin actions audit trail
--   * storage buckets: products, site
--
-- SECURITY MODEL:
--   Admin-only writes on every business table, enforced by RLS
--   using public.is_admin(). Customers can only read their own
--   orders (for the future public "my orders" page).
-- =============================================================

-- -------------------------------------------------------------
-- 1. SMALL ALTERS TO EXISTING TABLES
-- -------------------------------------------------------------

alter table public.profiles
    add column if not exists phone text;

alter table public.categories
    add column if not exists name_en text;

-- -------------------------------------------------------------
-- 2. PRODUCTS
-- -------------------------------------------------------------

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
    -- old_price is only meaningful when the sale toggle is on.
    check (not is_sale or old_price is not null)
);

comment on table public.products is 'منتجات دار شاط';
comment on column public.products.images is 'مصفوفة روابط صور المنتج بالترتيب (الأولى هي الرئيسية)';

create index if not exists products_category_idx on public.products (category_id);
create index if not exists products_active_idx on public.products (is_active);
create index if not exists products_created_idx on public.products (created_at desc);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
    before update on public.products
    for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 3. ORDERS (الدفع عند الاستلام only)
-- -------------------------------------------------------------

create sequence if not exists public.orders_number_seq;

create table if not exists public.orders (
    id              uuid primary key default gen_random_uuid(),
    -- Example: DC-2026-0001 (unique, human friendly)
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

comment on table public.orders is 'طلباتدار الشاط
— الدفع عند الاستلام فقط';
comment on column public.orders.status is 'حالة الطلب: جديد/مؤكد/قيد التجهيز/جاهز للشحن/تم الشحن/مكتمل/ملغى';

create index if not exists orders_customer_idx on public.orders (customer_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
    before update on public.orders
    for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 4. ORDER ITEMS
-- -------------------------------------------------------------

create table if not exists public.order_items (
    id              uuid primary key default gen_random_uuid(),
    order_id        uuid not null references public.orders (id) on delete cascade,
    product_id      uuid references public.products (id) on delete set null,
    -- Snapshot: keep the name/image even if the product changes later.
    product_name    text not null,
    product_image   text,
    unit_price      numeric(12, 2) not null check (unit_price >= 0),
    quantity        integer not null check (quantity > 0),
    subtotal        numeric(12, 2) not null check (subtotal >= 0),
    created_at      timestamptz not null default now()
);

comment on table public.order_items is 'تفاصيل منتجات الطلب';

create index if not exists order_items_order_idx on public.order_items (order_id);
create index if not exists order_items_product_idx on public.order_items (product_id);

-- -------------------------------------------------------------
-- 4b. ORDER STATUS HISTORY
-- Every status change is recorded (audit trail for orders).
-- -------------------------------------------------------------

create table if not exists public.order_status_history (
    id          uuid primary key default gen_random_uuid(),
    order_id    uuid not null references public.orders (id) on delete cascade,
    status      text not null,
    changed_by  uuid references public.profiles (id) on delete set null,
    changed_at  timestamptz not null default now()
);

comment on table public.order_status_history is 'سجل تغييرات حالة الطلب';

create index if not exists order_status_history_order_idx
    on public.order_status_history (order_id);

-- -------------------------------------------------------------
-- 5. SETTINGS (key/value, JSONB)
-- -------------------------------------------------------------

create table if not exists public.settings (
    id          bigint generated always as identity primary key,
    key         text not null unique,
    value       jsonb not null default '{}'::jsonb,
    updated_at  timestamptz not null default now()
);

comment on table public.settings is 'إعدادات الموقع المركزية';

drop trigger if exists settings_set_updated_at on public.settings;
create trigger settings_set_updated_at
    before update on public.settings
    for each row execute function public.set_updated_at();

-- -------------------------------------------------------------
-- 6. ADMIN ACTIVITY LOG
-- -------------------------------------------------------------

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

comment on table public.admin_activity_logs is 'سجل نشاط الإداريين (أمان وتتبع)';
comment on column public.admin_activity_logs.action is 'auth.login / category.create / category.update / category.delete / product.create / product.update / product.delete / order.status / settings.update';

create index if not exists admin_activity_logs_created_idx
    on public.admin_activity_logs (created_at desc);
create index if not exists admin_activity_logs_action_idx
    on public.admin_activity_logs (action);

-- -------------------------------------------------------------
-- 7. ROW LEVEL SECURITY
-- -------------------------------------------------------------

-- 7.1 Products: admins full access; public reads active only.
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

-- 7.2 Orders: admins full access; customers read their own only.
alter table public.orders enable row level security;

create policy "orders_admin_select"
    on public.orders for select
    to authenticated
    using (public.is_admin());

create policy "orders_customer_select_own"
    on public.orders for select
    to authenticated
    using (customer_id = auth.uid());

-- Admins manage orders (status changes, cancellation, ...).
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

-- 7.3 Order items: admins full access; customers read items of
--     their own orders only.
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

-- 7.3b Order status history: admins only.
alter table public.order_status_history enable row level security;

create policy "order_status_history_admin_all"
    on public.order_status_history for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- 7.4 Settings: admins only (no public read — the public site may
--     be given a dedicated read policy later if needed).
alter table public.settings enable row level security;

create policy "settings_admin_all"
    on public.settings for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- 7.5 Admin activity log: admins only.
alter table public.admin_activity_logs enable row level security;

create policy "admin_activity_logs_admin_all"
    on public.admin_activity_logs for all
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- -------------------------------------------------------------
-- 8. STORAGE
-- -------------------------------------------------------------

-- 8.1 Product images
insert into storage.buckets (id, name, public)
values ('products', 'products', true)
on conflict (id) do nothing;

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

-- 8.2 Site assets (logo, favicon)
insert into storage.buckets (id, name, public)
values ('site', 'site', true)
on conflict (id) do nothing;

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

-- =============================================================
-- DONE — after running, assign the first admin if not done yet
-- (database/set-first-admin.sql), then open /admin/login.html.
-- =============================================================