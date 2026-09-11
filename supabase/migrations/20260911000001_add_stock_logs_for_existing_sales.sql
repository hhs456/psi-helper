-- 資料遷移：為舊的銷售單補建 stock_logs 記錄
-- 版本：0.2.0
-- 日期：2026-09-11
-- 
-- 說明：
-- 在 0.2.0 版本之前，從銷售頁面建立的訂單不會產生 stock_logs 記錄
-- 此遷移腳本會為這些訂單補建記錄，確保庫存異動記錄的完整性
--
-- 執行前請先備份資料庫！
-- 在 Supabase SQL Editor 中執行此腳本

-- 為舊的銷售單補建 stock_logs 記錄
INSERT INTO stock_logs (id, color_variant_id, type, quantity, reference, created_at)
SELECT 
  gen_random_uuid(),
  si.color_variant_id,
  'sale',
  si.quantity,
  COALESCE(so.customer_name, so.client_code),
  so.order_date::timestamptz
FROM sales_items si
JOIN sales_orders so ON si.sales_order_id = so.id
WHERE NOT EXISTS (
  SELECT 1 FROM stock_logs sl 
  WHERE sl.color_variant_id = si.color_variant_id 
  AND sl.type = 'sale'
  AND sl.quantity = si.quantity
  AND COALESCE(sl.reference, '') = COALESCE(COALESCE(so.customer_name, so.client_code), '')
  AND sl.created_at::date = so.order_date::date
);

-- 驗證：檢查補建的記錄數量
SELECT COUNT(*) as "補建的 stock_logs 記錄數"
FROM stock_logs sl
WHERE sl.type = 'sale'
  AND sl.reference IS NOT NULL;
