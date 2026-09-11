-- Migration: Add client_code to sales_orders
-- Run this in Supabase SQL Editor

ALTER TABLE sales_orders
  ADD COLUMN IF NOT EXISTS client_code text;

ALTER TABLE sales_orders
  ALTER COLUMN customer_name DROP NOT NULL;

DO $$
DECLARE
  rec record;
  counter int := 1;
BEGIN
  FOR rec IN SELECT id FROM sales_orders WHERE client_code IS NULL ORDER BY created_at ASC
  LOOP
    UPDATE sales_orders
    SET client_code = 'C' || lpad(counter::text, 3, '0')
    WHERE id = rec.id;
    counter := counter + 1;
  END LOOP;
END $$;

ALTER TABLE sales_orders
  ALTER COLUMN client_code SET NOT NULL;
