-- =============================================================
-- Dar Chatt — Public Order Tracking (Phase 8)
--
-- Lets visitors check an order by its number without logging
-- in. The function is SECURITY DEFINER: it bypasses RLS inside
-- the function body but returns ONLY non-sensitive fields
-- (never phone / email / address).
--
-- HOW TO RUN:
--   Run AFTER 004-shop-ordering.sql and 007-customer-addresses.sql.
--   Safe to re-run (drop + create). Open the Supabase SQL Editor
--   and run this entire file.
-- =============================================================

create or replace function public.track_order(p_order_number text)
returns table (
    id           uuid,
    order_number text,
    status       text,
    total        numeric,
    created_at   timestamptz
)
language sql
security definer
set search_path = public
as $$
    select
        o.id,
        o.order_number,
        o.status,
        o.total,
        o.created_at
    from public.orders o
    where o.order_number = p_order_number
    limit 1;
$$;

revoke all on function public.track_order(text) from public;
grant execute on function public.track_order(text) to anon, authenticated;

-- =============================================================
-- DONE — visitors can now track orders by number.
-- =============================================================