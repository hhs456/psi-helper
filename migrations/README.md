# 資料庫遷移指南

本專案使用 [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) 管理資料庫遷移。

## Migration 檔案位置

- `supabase/migrations/` - Supabase CLI migration 檔案（主要使用）
- `migrations/` - 舊版手動遷移腳本（僅供參考）

## 使用 Supabase CLI 管理 Migration

### 前置作業

1. 安裝 Supabase CLI：
   ```bash
   npm install -g supabase
   ```

2. 登入並連結專案：
   ```bash
   supabase login
   supabase link --project-ref <your-project-ref>
   ```

### 建立新 Migration

```bash
supabase migration new <migration_name>
```

這會在 `supabase/migrations/` 建立一個新的 migration 檔案，檔名會包含時間戳記。

### 推送 Migration 到遠端

```bash
supabase db push
```

這會將所有未執行的 migration 推送到 Supabase 專案。

### 查看 Migration 狀態

```bash
supabase migration list
```

顯示 Local 和 Remote 的 migration 狀態。

## 注意事項

- Migration 檔名包含時間戳記，用於決定執行順序
- 請勿手動修改已執行的 migration 檔案
- 如需修改已執行的 migration，請建立新的 migration
- 執行 `supabase db push` 前請確認 migration 內容正確

## 舊版遷移腳本

`migrations/` 目錄包含舊版手動執行的遷移腳本，這些腳本已整合到 `supabase/migrations/` 中，僅供歷史參考。
