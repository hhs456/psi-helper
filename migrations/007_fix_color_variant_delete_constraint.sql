-- Fix foreign key constraint to allow deleting color variants
-- Change from ON DELETE RESTRICT to ON DELETE CASCADE

ALTER TABLE sales_items
DROP CONSTRAINT sales_items_color_variant_id_fkey;

ALTER TABLE sales_items
ADD CONSTRAINT sales_items_color_variant_id_fkey
FOREIGN KEY (color_variant_id)
REFERENCES color_variants(id)
ON DELETE CASCADE;
