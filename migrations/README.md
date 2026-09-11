# 資料庫遷移指南

本目錄包含資料庫結構變更的遷移腳本。

## 執行遷移

### 0.2.0 版本遷移

此版本需要為舊的銷售單補建 `stock_logs` 記錄。

**步驟：**

1. **備份資料庫**
   - 在 Supabase Dashboard 中，進入 Database > Backups
   - 建立新的備份

2. **執行遷移腳本**
   - 在 Supabase Dashboard 中，進入 SQL Editor
   - 複製 `002_add_stock_logs_for_existing_sales.sql` 的內容
   - 點擊 Run 執行

3. **驗證結果**
   - 腳本會顯示補建的記錄數量
   - 檢查銷售頁面的訂單，確認庫存記錄正確

## 遷移腳本列表

| 版本 | 檔案 | 說明 |
|------|------|------|
| 0.2.0 | `002_add_stock_logs_for_existing_sales.sql` | 為舊銷售單補建 stock_logs |

## 注意事項

- 執行遷移前請務必備份資料庫
- 如果已經手動執行過類似操作，可能會產生重複記錄
- 遷移腳本會嘗試避免重複，但無法完全保證
