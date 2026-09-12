# 專有名詞表

本專案的術語定義，確保開發與溝通一致。

## 資料模型

| 中文術語 | 英文/程式碼 | 定義 | 對應資料表/欄位 |
|---------|------------|------|----------------|
| 供應商 | Supplier | 提供商品的廠商或品牌 | `suppliers` |
| 商品 | Product | 供應商提供的具體產品（如：某款 T-shirt） | `products` |
| 款式 | Variant / ColorVariant | 商品的顏色與尺寸組合（如：紅色/M） | `color_variants` |
| 顏色 | Color | 款式的顏色屬性 | `color_variants.color` |
| 尺寸 | Size | 款式的尺寸屬性（如：S、M、L、均碼） | `color_variants.size` |
| 均碼 | One Size | 無尺寸區分的預設值，資料庫儲存為 `NULL` | `color_variants.size = NULL` |

## 庫存操作

| 中文術語 | 英文 | 說明 | 對應欄位值 |
|---------|------|------|-----------|
| 進貨 | Purchase | 庫存增加的操作 | `stock_logs.type = 'purchase'` |
| 瑕疵 | Defect | 庫存減少（瑕疵品）的操作 | `stock_logs.type = 'defect'` |
| 銷售 | Sale | 庫存減少（售出）的操作 | `stock_logs.type = 'sale'` |
| 庫存異動記錄 | StockLog | 記錄每次庫存變動的歷史 | `stock_logs` |
| 可用庫存 | Available Stock | 可銷售的數量 = 進貨 - 瑕疵 - 已售 | 計算值 |

## UI 概念

| 中文術語 | 說明 |
|---------|------|
| 釘選 | 將項目固定在列表頂端，`is_pinned = true` |
| 尺寸群組 | 相同尺寸的所有款式組合，UI 顯示概念 |
| 款式 Modal | 新增/編輯款式的彈出視窗 |
| 客戶編號 | 銷售單的客戶識別碼，格式：C001 |

## 資料結構關係

```
Supplier (供應商)
  └── Product (商品)
        └── ColorVariant (款式)
              ├── color: 顏色
              ├── size: 尺寸（NULL 表示均碼）
              ├── purchased: 進貨數量
              ├── defective: 瑕疵數量
              ├── sold: 已售數量
              └── StockLog[] (庫存異動記錄)
```

## 操作動作對照

| 操作 | 對應函數 | 說明 |
|------|---------|------|
| 新增尺寸 | `addSize()` | 建立新的尺寸群組（需同時指定顏色） |
| 新增顏色 | `addColor()` | 在現有尺寸群組下新增顏色 |
| 編輯款式 | `editVariant()` | 修改款式的顏色或尺寸 |
| 記錄庫存 | `addStockLog()` | 新增進貨/瑕疵/銷售記錄 |
| 釘選款式 | `handlePinVariant()` | 切換款式的釘選狀態 |
