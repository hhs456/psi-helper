# Changelog

本專案的所有重大變更都會記錄在此文件中。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
並且本專案遵循 [語義化版本](https://semver.org/lang/zh-TW/)。

## [0.3.1] - 2026-09-11

### 改進

- **取消訂單記錄顯示**：取消訂單的庫存異動記錄以灰色顯示並標註「+數量」，與一般銷售記錄區隔

## [0.3.0] - 2026-09-11

### 新增功能

- **編輯款式**：可修改已建立的顏色和尺寸

### 改進

- **商品詳情頁款式結構**：改為以尺寸為折疊父項，顏色為子項，更符合服飾類商品的操作習慣
- **新增尺寸 Modal**：可從預設尺寸列表選擇，並可選填顏色
- **新增顏色 Modal**：在尺寸區塊內新增顏色時會自動帶入該尺寸
- **手機版漢堡選鈕**：修正懸浮按鈕遮擋返回按鈕和標題的問題
- **圖片壓縮優化**：將壓縮尺寸從 1200x1200 調整為 600x600，品質從 0.8 提升至 0.85，节省儲存空間
- **庫存異動備註**：簡化欄位標籤為「備註（選填）」，移除不必要的提示文字

### 變更

- **登入機制**：Cookie 改為 session cookie，關閉瀏覽器後需重新輸入密碼（不再保留 30 天）

## [0.2.1] - 2026-09-11

### 修復

- **登入跳轉**：改用 `window.location.href` 取代 `router.push` + `router.refresh`，解決登入後偶爾不跳轉的問題
- **取消訂單庫存回退**：取消訂單時現在會正確回退 `color_variants.sold` 並新增 `stock_logs` 記錄
- **刪除已取消訂單**：刪除狀態為 cancelled 的訂單時不會重複回退庫存

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
