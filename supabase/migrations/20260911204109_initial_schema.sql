-- Initial Database Schema
-- 建立所有資料表、索引、函數、觸發器和 RLS policies

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Suppliers table (工廠/供應商)
create table if not exists suppliers (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Products table (商品)
create table if not exists products (
  id uuid primary key default uuid_generate_v4(),
  supplier_id uuid references suppliers(id) on delete cascade,
  name text not null,
  code text,
  image_url text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Color variants table (顏色/款式)
create table if not exists color_variants (
  id uuid primary key default uuid_generate_v4(),
  product_id uuid references products(id) on delete cascade,
  color text not null,
  size text,
  purchased integer default 0,
  defective integer default 0,
  sold integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Stock logs table (庫存異動記錄)
create table if not exists stock_logs (
  id uuid primary key default uuid_generate_v4(),
  color_variant_id uuid references color_variants(id) on delete cascade,
  type text not null check (type in ('purchase', 'defect', 'sale')),
  quantity integer not null,
  reference text,
  created_at timestamptz default now()
);

-- Sales orders table (銷售訂單)
create table if not exists sales_orders (
  id uuid primary key default uuid_generate_v4(),
  client_code text not null,
  customer_name text,
  source text not null default 'manual' check (source in ('shopee', 'manual', 'other')),
  shopee_order_id text,
  order_date date not null default current_date,
  total_amount numeric(10, 2) default 0,
  status text not null default 'pending' check (status in ('pending', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Sales items table (銷售明細)
create table if not exists sales_items (
  id uuid primary key default uuid_generate_v4(),
  sales_order_id uuid references sales_orders(id) on delete cascade,
  color_variant_id uuid references color_variants(id) on delete cascade,
  quantity integer not null,
  unit_price numeric(10, 2) not null,
  amount numeric(10, 2) not null
);

-- Indexes for better query performance
create index if not exists idx_products_supplier_id on products(supplier_id);
create index if not exists idx_color_variants_product_id on color_variants(product_id);
create index if not exists idx_stock_logs_color_variant_id on stock_logs(color_variant_id);
create index if not exists idx_stock_logs_type on stock_logs(type);
create index if not exists idx_sales_items_sales_order_id on sales_items(sales_order_id);
create index if not exists idx_sales_items_color_variant_id on sales_items(color_variant_id);

-- Function to update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Triggers for auto-updating updated_at
drop trigger if exists update_suppliers_updated_at on suppliers;
create trigger update_suppliers_updated_at
  before update on suppliers
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_products_updated_at on products;
create trigger update_products_updated_at
  before update on products
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_color_variants_updated_at on color_variants;
create trigger update_color_variants_updated_at
  before update on color_variants
  for each row
  execute function update_updated_at_column();

drop trigger if exists update_sales_orders_updated_at on sales_orders;
create trigger update_sales_orders_updated_at
  before update on sales_orders
  for each row
  execute function update_updated_at_column();

-- Row Level Security (RLS) policies
alter table suppliers enable row level security;
alter table products enable row level security;
alter table color_variants enable row level security;
alter table stock_logs enable row level security;
alter table sales_orders enable row level security;
alter table sales_items enable row level security;

-- Allow all operations for authenticated users
drop policy if exists "Allow all for suppliers" on suppliers;
create policy "Allow all for suppliers" on suppliers for all using (true) with check (true);

drop policy if exists "Allow all for products" on products;
create policy "Allow all for products" on products for all using (true) with check (true);

drop policy if exists "Allow all for color_variants" on color_variants;
create policy "Allow all for color_variants" on color_variants for all using (true) with check (true);

drop policy if exists "Allow all for stock_logs" on stock_logs;
create policy "Allow all for stock_logs" on stock_logs for all using (true) with check (true);

drop policy if exists "Allow all for sales_orders" on sales_orders;
create policy "Allow all for sales_orders" on sales_orders for all using (true) with check (true);

drop policy if exists "Allow all for sales_items" on sales_items;
create policy "Allow all for sales_items" on sales_items for all using (true) with check (true);

-- Storage bucket for product images
insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Storage policies
drop policy if exists "Allow public read access to product images" on storage.objects;
create policy "Allow public read access to product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

drop policy if exists "Allow authenticated users to upload product images" on storage.objects;
create policy "Allow authenticated users to upload product images"
  on storage.objects for insert
  with check (bucket_id = 'product-images');

drop policy if exists "Allow authenticated users to delete product images" on storage.objects;
create policy "Allow authenticated users to delete product images"
  on storage.objects for delete
  using (bucket_id = 'product-images');

-- Grant Data API access to all tables
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
