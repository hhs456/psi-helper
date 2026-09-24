-- Grant Data API access to existing tables
-- Required for Supabase's October 30, 2026 policy change
-- See: https://supabase.com/docs/guides/database/postgres/row-level-security

grant select on public.suppliers to anon;
grant select, insert, update, delete on public.suppliers to authenticated;
grant select, insert, update, delete on public.suppliers to service_role;

grant select on public.products to anon;
grant select, insert, update, delete on public.products to authenticated;
grant select, insert, update, delete on public.products to service_role;

grant select on public.color_variants to anon;
grant select, insert, update, delete on public.color_variants to authenticated;
grant select, insert, update, delete on public.color_variants to service_role;

grant select on public.stock_logs to anon;
grant select, insert, update, delete on public.stock_logs to authenticated;
grant select, insert, update, delete on public.stock_logs to service_role;

grant select on public.sales_orders to anon;
grant select, insert, update, delete on public.sales_orders to authenticated;
grant select, insert, update, delete on public.sales_orders to service_role;

grant select on public.sales_items to anon;
grant select, insert, update, delete on public.sales_items to authenticated;
grant select, insert, update, delete on public.sales_items to service_role;
