# PSI Helper - 庫存管理系統

簡易的 Purchase, Sales and Inventory (PSI) 管理系統，專為蝦皮賣家設計。

## 功能特色

- **庫存總覽** - 庫存分析與盤點，支援排序、篩選、統計摘要
- **進銷明細** - 檢視每個商品規格的進貨、瑕疵、銷售數量，支援分頁和排序
- **供應商管理** - 記錄進貨工廠/供應商資訊，支援釘選、拖曳排序、搜尋、顯示商品數量和庫存總數
- **商品管理** - 管理商品資料與圖片，支援釘選、拖曳排序、搜尋、顏色/尺寸庫存顯示
- **供應商詳情頁** - 檢視供應商資訊及其下所有商品，支援搜尋、釘選、拖曳排序，可直接新增/編輯/刪除商品
- **庫存追蹤** - 追蹤進貨、瑕疵、銷售數量，支援款式（顏色/尺寸）管理
- **PWA 支援** - 可安裝到手機主畫面，像原生 App 一樣使用
- **自動備份** - 每日自動備份資料庫和圖片至 GitHub Release

## 技術棧

- **前端**: Next.js 16 + TypeScript + Tailwind CSS
- **後端**: Supabase (PostgreSQL + Storage)
- **部署**: Vercel (免費)
- **PWA**: next-pwa
- **拖曳排序**: @dnd-kit（支援觸控裝置）

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `.env.example` 為 `.env.local`，並填入你的 Supabase 設定：

```bash
cp .env.example .env.local
```

編輯 `.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

### 3. 設定 Supabase

1. 前往 [Supabase](https://supabase.com) 建立新專案
2. 在 SQL Editor 中執行 `supabase/schema.sql` 建立資料庫結構
3. 在 Storage 中建立 `product-images` bucket（schema.sql 會自動建立）
4. 複製專案 URL 和 publishable key 到 `.env.local`

### 4. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000) 查看結果。

## 部署到 Vercel

1. 將程式碼推送到 GitHub
2. 前往 [Vercel](https://vercel.com) 匯入專案
3. 在專案設定中新增環境變數：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
4. 點擊 Deploy

## 專案結構

```
psi-helper/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── page.tsx           # 庫存總覽（首頁）
│   │   ├── login/             # 登入頁面
│   │   ├── suppliers/         # 供應商管理
│   │   │   └── [id]/          # 供應商詳情（含商品列表）
│   │   ├── products/          # 商品管理
│   │   │   └── [id]/          # 商品詳情（款式/庫存異動）
│   │   ├── psi/               # 進銷明細
│   │   └── api/               # API routes
│   ├── components/            # React 元件
│   │   ├── ui/                # UI 元件（Button, Card, Modal, Input, SortableCard, PSICard）
│   │   ├── Sidebar.tsx        # 側邊欄導航
│   │   ├── Footer.tsx         # 頁腳
│   │   └── PWARegister.tsx    # PWA 註冊
│   ├── lib/
│   │   ├── supabase/          # Supabase 客戶端
│   │   ├── image.ts           # 圖片壓縮工具
│   │   ├── hooks.ts           # SWR 資料 hooks
│   │   ├── useSortableList.ts # 拖曳排序 hook
│   │   ├── usePin.ts          # 釘選功能 hook
│   │   └── useImageUpload.ts  # 圖片上傳 hook
│   └── types/                 # TypeScript 型別定義
├── public/
│   ├── manifest.json          # PWA manifest
│   ├── sw.js                  # Service Worker
│   ├── icon-192.png           # PWA 圖示
│   ├── icon-512.png           # PWA 圖示
│   ├── icon-maskable-192.png  # Maskable PWA 圖示
│   └── icon-maskable-512.png  # Maskable PWA 圖示
├── scripts/                   # 工具腳本
│   ├── backup-db.ts           # 資料庫備份
│   ├── restore-db.ts          # 資料庫還原
│   └── cleanup-images.ts      # 清理孤立圖片
├── migrations/                # 資料庫遷移腳本
├── supabase/
│   └── schema.sql             # 資料庫 schema
└── .env.local                 # 環境變數（不要提交到 Git）
```

## 使用流程

### 基本流程

1. **新增供應商** - 記錄進貨的工廠/供應商
2. **新增商品** - 建立商品資料，上傳圖片（可在商品管理頁或供應商詳情頁新增）
3. **新增款式** - 在商品詳情頁新增尺寸和顏色
4. **記錄庫存異動** - 記錄進貨、瑕疵、銷售數量
5. **查看庫存總覽** - 在首頁查看所有商品的庫存狀況

### 操作功能

- **釘選** - 將常用項目釘選至頂部，顯示橙色邊框
- **拖曳排序** - 長按拖曳把手調整項目順序（支援觸控）
- **搜尋** - 快速篩選供應商、商品
- **快速進入** - 點擊供應商名稱或商品圖片可直接進入詳情頁

### 庫存異動說明

- **進貨 (Purchase)** - 增加庫存數量
- **瑕疵 (Defect)** - 記錄瑕疵品數量（不影響可售庫存計算）
- **銷售 (Sale)** - 減少庫存數量

可售庫存 = 進貨數量 - 瑕疵數量 - 銷售數量

## 免費方案限制

| 服務 | 免費額度 | 說明 |
|------|---------|------|
| Vercel | 無限部署、100GB 頻寬/月 | 綽綽有餘 |
| Supabase DB | 500MB PostgreSQL | 文字資料足夠 |
| Supabase Storage | 1GB 圖片儲存 | 可存數千張小圖片 |

## License

MIT
