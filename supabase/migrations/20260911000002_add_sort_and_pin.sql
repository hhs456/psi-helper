-- 增加排序和釘選功能
-- 為 products, suppliers, color_variants 增加 sort_order 和 is_pinned 欄位

-- Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Suppliers
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Color Variants
ALTER TABLE color_variants ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE color_variants ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- 建立索引以優化排序查詢
CREATE INDEX IF NOT EXISTS idx_products_sort ON products (is_pinned DESC, sort_order DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_sort ON suppliers (is_pinned DESC, sort_order DESC);
CREATE INDEX IF NOT EXISTS idx_color_variants_sort ON color_variants (is_pinned DESC, sort_order DESC);
