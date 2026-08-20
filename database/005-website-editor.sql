-- =============================================================
-- Dar Chatt — Website Editor (Phase 5)
--
-- Adds the "website editor" feature: the admin can change the
-- homepage hero section (images + heading + subheading) from a
-- new admin page.
--
-- WHAT THIS FILE DOES:
--   1. Opens a PUBLIC read policy on settings so the homepage
--      can load the hero content (images/text) for visitors.
--      NOTE: only SELECT — writes stay admin-only.
--   2. Seeds a default 'hero' settings row so the editor and
--      homepage always have something to render.
--
-- HOW TO RUN:
--   Run AFTER database/schema.sql, categories.sql and
--   004-shop-ordering.sql. Safe to re-run (drop + if not exists).
--   Open the Supabase SQL Editor and run this entire file.
-- =============================================================

-- -------------------------------------------------------------
-- 1. SETTINGS — PUBLIC READ (hero needs it on the homepage)
-- -------------------------------------------------------------

drop policy if exists "settings_public_read" on public.settings;

create policy "settings_public_read"
    on public.settings for select
    to anon, authenticated
    using (true);

-- -------------------------------------------------------------
-- 2. DEFAULT HERO SETTINGS
--
-- Stored under settings key 'hero' as JSON:
--   {
--     "heading":    "أهلاً بكم في دار الشاط",
--     "subheading": "تشكيلة فاخرة من العطور والإكسسوارات",
--     "images":     ["https://.../hero/slide-1.jpg", ...]
--   }
-- Images live in the 'site' storage bucket under hero/ (already
-- public-read, admin-write from admin-panel.sql).
-- -------------------------------------------------------------

insert into public.settings (key, value)
values (
    'hero',
    '{"heading":"أهلاً بكم في دار الشاط","subheading":"تشكيلة فاخرة من العطور والإكسسوارات","images":[]}'::jsonb
)
on conflict (key) do nothing;

-- =============================================================
-- DONE — the admin can now open /admin/website-editor.html.
-- =============================================================