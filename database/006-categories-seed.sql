-- =============================================================
-- Dar Chatt — Seed Categories (Phase 6)
--
-- Creates the store's product categories (root-level, no parent).
-- Safe to re-run: matching rows are updated by slug, new slugs
-- are inserted, and nothing is deleted.
--
-- HOW TO RUN:
--   Run AFTER database/schema.sql, categories.sql,
--   004-shop-ordering.sql and 005-website-editor.sql.
--   Open the Supabase SQL Editor and run this entire file.
-- =============================================================

insert into public.categories (name, slug, sort_order)
values
    ('عطور', 'perfumes', 10),
    ('البخور وخشب العود', 'incense-oud', 20),
    ('معطرات', 'fresheners', 30),
    ('مبخرات', 'burners', 40),
    ('سجادات', 'prayer-rugs', 50),
    ('لوازم الحج والعمرة', 'hajj-umrah', 60),
    ('توزيعات و هديا', 'gifts-favors', 70),
    ('أقمصة', 'shirts', 80),
    ('الملابس التقليدية المغربية', 'moroccan-clothing', 90),
    ('مصاحف', 'mushafs', 100),
    ('ساعات الأذان', 'adhan-clocks', 110),
    ('الكفن', 'kafan', 120),
    ('أحذية', 'shoes', 130),
    ('الكحل', 'kohl', 140),
    ('الأمساك', 'musk', 150)
on conflict (slug) do update
    set name = excluded.name,
        sort_order = excluded.sort_order,
        is_active = true;

-- =============================================================
-- DONE — verify with:
--   select name, slug, sort_order from public.categories order by sort_order;
-- =============================================================