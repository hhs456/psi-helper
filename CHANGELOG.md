# Changelog

本專案的所有重大變更都會記錄在此文件中。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
並且本專案遵循 [語義化版本](https://semver.org/lang/zh-TW/)。

## [0.2.0] - 2026-09-11

### 新增功能

- **銷售單編輯功能**：pending/completed 狀態的銷售單可以編輯客戶資訊和明細
- **拆單功能**：可以將銷售單的明細拆分到新訂單，支援不同客戶的數量分配
- **供應商檢視頁面**：新增 `/suppliers/[id]` 頁面，顯示供應商詳情和相關商品列表
- **銷售記錄同步 stock_logs**：銷售單的新增、編輯、刪除都會同步更新庫存異動記錄

### 改進

- **商品詳情頁異動記錄**：修正查詢邏輯，只顯示該商品的記錄（而非所有商品）
- **銷售頁面商品選擇**：改為先選商品再選顏色/款式的兩步驟下拉選單
- **商品 variant 分組顯示**：按尺碼分組，再按顏色顯示，支援折疊/展開
- **商品管理列表**：顯示供應商名稱
- **供應商列表**：新增檢視按鈕，可跳轉到供應商詳情頁

### 資料遷移

此版本需要執行資料遷移，為舊的銷售單補建 `stock_logs` 記錄。請執行以下 SQL：

```sql
-- 為舊的銷售單補建 stock_logs 記錄
-- 執行前請先備份資料庫

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
WHERE so.created_at < '2026-09-11'::timestamptz
  AND NOT EXISTS (
    SELECT 1 FROM stock_logs sl 
    WHERE sl.color_variant_id = si.color_variant_id 
    AND sl.type = 'sale'
    AND sl.quantity = si.quantity
    AND sl.reference = COALESCE(so.customer_name, so.client_code)
    AND sl.created_at::date = so.order_date::date
  );
```

**注意**：此遷移腳本會為 2026-09-11 之前建立的銷售單補建記錄。如果在此日期之後有手動從銷售頁面建立訂單，可能需要調整日期條件。

## [0.1.0] - 2024-01-01

### 初始版本

- 供應商管理
- 商品管理（含圖片上傳）
- 庫存管理（顏色/款式變體）
- 庫存異動記錄（進貨、瑕疵、銷售）
- 銷售記錄管理
- 報表分析
- PWA 支援
