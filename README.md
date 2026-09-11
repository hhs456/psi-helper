# PSI Helper - 庫存管理系統

簡易的 Purchase, Sales and Inventory (PSI) 管理系統，專為蝦皮賣家設計。

## 功能特色

- **供應商管理** - 記錄進貨工廠/供應商資訊
- **商品管理** - 管理商品資料與圖片
- **庫存追蹤** - 追蹤進貨、瑕疵、銷售數量
- **銷售記錄** - 記錄銷售訂單（支援蝦皮訂單）
- **報表分析** - 庫存統計與銷售分析
- **PWA 支援** - 可安裝到手機主畫面，像原生 App 一樣使用

## 技術棧

- **前端**: Next.js 16 + TypeScript + Tailwind CSS
- **後端**: Supabase (PostgreSQL + Storage)
- **部署**: Vercel (免費)
- **PWA**: next-pwa

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
│   │   ├── suppliers/         # 供應商管理
│   │   ├── products/          # 商品管理
│   │   │   └── [id]/          # 商品詳情（庫存異動）
│   │   ├── sales/             # 銷售記錄
│   │   └── reports/           # 報表分析
│   ├── components/            # React 元件
│   │   ├── ui/                # UI 元件（Button, Card, Modal 等）
│   │   └── Sidebar.tsx        # 側邊欄導航
│   ├── lib/
│   │   └── supabase/          # Supabase 客戶端
│   └── types/                 # TypeScript 型別定義
── public/
│   ├── manifest.json          # PWA manifest
│   └── sw.js                  # Service Worker
├── supabase/
│   └── schema.sql             # 資料庫 schema
└── .env.local                 # 環境變數（不要提交到 Git）
```

## 使用流程

### 基本流程

1. **新增供應商** - 記錄進貨的工廠/供應商
2. **新增商品** - 建立商品資料，上傳圖片
3. **新增顏色/款式** - 在商品詳情頁新增不同顏色和尺寸
4. **記錄庫存異動** - 記錄進貨、瑕疵、銷售數量
5. **查看庫存總覽** - 在首頁查看所有商品的庫存狀況

### 庫存異動說明

- **進貨 (Purchase)** - 增加庫存數量
- **瑕疵 (Defect)** - 記錄瑕疵品數量（不影響可售庫存計算）
- **銷售 (Sale)** - 減少庫存數量

可售庫存 = 進貨數量 - 瑕疵數量 - 銷售數量

## 免費方案限制

| 服務 | 免費額度 | 說明 |
|------|---------|------|
| Vercel | 無限部署、100GB 頻寬/月 | 綽有餘 |
| Supabase DB | 500MB PostgreSQL | 文字資料足夠 |
| Supabase Storage | 1GB 圖片儲存 | 可存數千張小圖片 |

## 後續發展

- [ ] 蝦皮訂單 CSV 匯入
- [ ] 利潤計算功能
- [ ] 庫存報表匯出（Excel/PDF）
- [ ] 低庫存警示
- [ ] 多用戶支援

## License

MIT
