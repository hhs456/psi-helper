# Changelog

本專案的所有重大變更都會記錄在此文件中。

格式基於 [Keep a Changelog](https://keepachangelog.com/zh-TW/1.0.0/)，
並且本專案遵循 [語義化版本](https://semver.org/lang/zh-TW/)。

## [0.8.0] - 2026-09-11

### 效能優化

- **頁面改為 Server Component**：所有主要頁面（首頁、商品、銷售、供應商、報表）改為 Server Component，資料在伺服器端預先載入，消除頁面切換時的 loading spinner
- **新增骨架屏 loading.tsx**：每個頁面新增 `loading.tsx`，在資料載入時顯示骨架屏動畫，提供更流暢的載入體驗
- **圖片優化**：使用 Next.js `<Image>` 元件取代原生 `<img>`，自動進行圖片 lazy loading 和格式優化
- **Next.js Image 配置**：設定 `next.config.ts` 允許 Supabase Storage 域名

### 架構改進

- 將頁面資料抓取邏輯移至 Server Component，互動功能拆分為獨立的 Client Component
- 新增 Client Components：`HomeClient`、`ProductsClient`、`SalesClient`、`SuppliersClient`

## [0.7.0] - 2026-09-11

### UX 改善

- **供應商列表**：供應商名稱可直接點擊進入詳情頁，移除小圖示連結按鈕
- **商品列表**：商品圖片可直接點擊進入詳情頁，移除小圖示連結按鈕
- **供應商詳情頁**：
  - 編輯/刪除按鈕改為 icon-only（移除文字），節省空間
  - 商品卡片新增編輯和刪除按鈕，可直接修改或刪除商品，無需切換頁面
  - 編輯商品 Modal 支援修改名稱、編號、備註、圖片
  - 編輯模式下 Modal 底部顯示刪除按鈕

## [0.6.1] - 2026-09-11

### 修復

- **排序位置改變 BUG**：全面修復各種操作導致 `sort_order` 被錯誤覆寫的問題
  - 拖曳排序後 React state 同步：拖曳完成後同步更新 state 中的 `sort_order`，確保後續操作拿到正確值
  - 庫存異動：不再寫入 `sort_order`/`is_pinned`，只更新庫存欄位（`addStockLog`、`deleteStockLog`、銷售頁 4 處更新）
  - 編輯款式/商品/供應商：不再寫入 `sort_order`/`is_pinned`，只更新表單欄位（`editVariant`、商品頁編輯、供應商頁編輯、供應商詳情編輯）
  - 取消釘選：保留原本的 `sort_order` 不變，不再強制設為 `0`（`handlePinVariant`、`handlePin` x3）
- **排序不確定性修復**：新增查詢加上 `created_at` 作為第三排序條件，避免相同 `sort_order` 值時順序隨機跳動
- **新項目排序**：新增款式、商品、供應商時，給予遞增的 `sort_order`，不再全部為 `0`
- **既有資料補償**：新增 migration `005_backfill_sort_order.sql`，為 `sort_order = 0` 的既有資料依 `created_at` 賦予遞增值

## [0.6.0] - 2026-09-11

### 改進

- **拖曳排序支援觸控裝置**：改用 `@dnd-kit` 套件取代 HTML5 Drag and Drop API
  - 支援手機和平板的觸控操作
  - 拖曳錨點新增 `touch-none` class 避免與滾動衝突
  - 更流暢的拖曳動畫和視覺回饋

## [0.5.1] - 2026-09-11

### 修復

- **排序位置改變 BUG**：修復編輯項目或變更庫存時，`sort_order` 被重置導致排序位置改變的問題
  - 所有更新 `color_variants`、`products`、`suppliers` 的操作現在都會明確保留 `sort_order` 和 `is_pinned` 欄位
  - 影響的函式：`addStockLog`、`deleteStockLog`、`editVariant`、`handleSubmit`、`handleUpdate`、銷售頁的庫存更新

## [0.5.0] - 2026-09-11

### 新增功能

- **拖曳排序**：商品、供應商、款式列表支援拖曳排序，取代原本的上下箭頭
  - 每個項目左側新增拖曳錨點（GripVertical 圖示）
  - 拖曳時顯示藍色邊框和縮放效果作為視覺回饋
  - 釘選/非釘選項目只能在同群組內拖曳
- **搜尋功能**：
  - 供應商列表：可搜尋供應商名稱
  - 商品列表：可搜尋商品名稱或編號
  - 庫存總覽：可搜尋商品名稱、編號或供應商名稱

### 修復

- **排序 BUG**：修復編輯項目後排序位置改變的問題，現在拖曳完成後會重新計算所有項目的 sort_order

### 技術改進

- **Card 元件**：支援 HTML draggable 屬性，可傳入拖曳相關事件處理器

## [0.4.0] - 2026-09-11

### 新增功能

- **釘選與排序功能**：商品、供應商、款式都支援釘選和上下箭頭排序
  - 釘選的項目會顯示橙色邊框和背景，優先顯示在列表最上方
  - 同一群組（釘選/未釘選）內可用上下箭頭調整順序
  - 資料庫增加 `sort_order` 和 `is_pinned` 欄位
- **供應商詳情頁新增商品**：在供應商商品列表頁可直接新增商品，無需切換到商品管理頁

### 改進

- **記錄銷售表單簡化**：客戶編號、客戶名稱、單價等欄位預設折疊，可展開查看，與進貨/瑕疵操作一致
- **異動記錄區塊折疊**：商品詳情頁的異動記錄預設收合，點擊標題展開
- **圖示優化**：商品管理和供應商列表的「進入詳情」圖示從眼睛改為 ExternalLink，更直覺表示前往另一頁

### 資料遷移

此版本需要執行資料遷移。請執行以下 SQL：

```sql
-- 增加排序和釘選功能
ALTER TABLE products ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

ALTER TABLE color_variants ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
ALTER TABLE color_variants ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_products_sort ON products (is_pinned DESC, sort_order DESC);
CREATE INDEX IF NOT EXISTS idx_suppliers_sort ON suppliers (is_pinned DESC, sort_order DESC);
CREATE INDEX IF NOT EXISTS idx_color_variants_sort ON color_variants (is_pinned DESC, sort_order DESC);
```

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
