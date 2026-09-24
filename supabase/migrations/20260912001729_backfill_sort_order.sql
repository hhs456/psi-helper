-- 為既有資料補上 sort_order 值
-- 以 created_at 遞增排序（ROW_NUMBER），最新項目獲得最大值，在 DESC 排序中顯示在最前面
-- 已拖曳排序過（sort_order != 0）的項目不受影響

-- Products
UPDATE products
SET sort_order = sq.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM products
  WHERE sort_order = 0
) sq
WHERE products.id = sq.id;

-- Suppliers
UPDATE suppliers
SET sort_order = sq.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
  FROM suppliers
  WHERE sort_order = 0
) sq
WHERE suppliers.id = sq.id;

-- Color Variants（依 product_id 分組編號，各商品內的款式獨立排序）
UPDATE color_variants
SET sort_order = sq.rn
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY product_id ORDER BY created_at ASC) AS rn
  FROM color_variants
  WHERE sort_order = 0
) sq
WHERE color_variants.id = sq.id;