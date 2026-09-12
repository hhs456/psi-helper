"use client";

import { useState, useMemo } from "react";
import { ProductCard } from "@/components/ui/ProductCard";
import { Package, Search, Loader2, ArrowUpDown } from "lucide-react";
import { useInventory } from "@/lib/hooks";

type SortOption = "default" | "stock-asc" | "stock-desc" | "variants-desc" | "variants-asc";

export function HomeClient() {
  const { inventory, isLoading, error } = useInventory();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");
  const [minStock, setMinStock] = useState("");
  const [maxStock, setMaxStock] = useState("");
  const [showOutOfStockVariants, setShowOutOfStockVariants] = useState(false);

  const getStock = (item: typeof inventory[0]) =>
    item.variants.reduce((sum, v) => sum + v.available, 0);

  const stats = useMemo(() => {
    const total = inventory.length;
    const inStock = inventory.filter((item) => getStock(item) > 0).length;
    const outOfStock = total - inStock;
    let hasOutOfStockVariant = 0;

    inventory.forEach((item) => {
      if (item.variants.length === 0) return;
      const someOutOfStock = item.variants.some((v) => v.available <= 0);
      if (someOutOfStock) {
        hasOutOfStockVariant++;
      }
    });

    return { total, inStock, outOfStock, hasOutOfStockVariant };
  }, [inventory]);

  const filteredInventory = useMemo(() => {
    const result = inventory.filter((item) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        item.product_name.toLowerCase().includes(query) ||
        (item.product_code && item.product_code.toLowerCase().includes(query)) ||
        item.supplier_name.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      const stock = getStock(item);
      if (minStock !== "" && stock < Number(minStock)) return false;
      if (maxStock !== "" && stock > Number(maxStock)) return false;

      if (showOutOfStockVariants) {
        if (item.variants.length === 0) return false;
        const someOutOfStock = item.variants.some((v) => v.available <= 0);
        if (!someOutOfStock) return false;
      }

      return true;
    });

    switch (sortBy) {
      case "stock-asc":
        result.sort((a, b) => getStock(a) - getStock(b));
        break;
      case "stock-desc":
        result.sort((a, b) => getStock(b) - getStock(a));
        break;
      case "variants-desc":
        result.sort((a, b) => b.variants.length - a.variants.length);
        break;
      case "variants-asc":
        result.sort((a, b) => a.variants.length - b.variants.length);
        break;
    }
    return result;
  }, [inventory, searchQuery, sortBy, minStock, maxStock, showOutOfStockVariants]);

  const setQuickFilter = (filter: string) => {
    switch (filter) {
      case "all":
        setMinStock("");
        setMaxStock("");
        break;
      case "out-of-stock":
        setMinStock("0");
        setMaxStock("0");
        break;
      case "low-stock":
        setMinStock("1");
        setMaxStock("5");
        break;
      case "normal":
        setMinStock("6");
        setMaxStock("10");
        break;
      case "high-stock":
        setMinStock("11");
        setMaxStock("");
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500">載入失敗：{error.message}</div>;
  }

  if (inventory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Package size={48} className="mb-4" />
        <p className="text-lg">尚無庫存資料</p>
        <p className="text-sm mt-2">請先新增供應商和商品</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-xs text-gray-500">總品項</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">{stats.inStock}</p>
            <p className="text-xs text-gray-500">有庫存</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-red-600">{stats.outOfStock}</p>
            <p className="text-xs text-gray-500">無庫存</p>
          </div>
        </div>
      </div>

      <div className="mb-4">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋商品名稱、編號或供應商..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown size={16} className="text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="default">預設排序</option>
            <option value="stock-asc">庫存：低 → 高</option>
            <option value="stock-desc">庫存：高 → 低</option>
            <option value="variants-desc">品項：多 → 少</option>
            <option value="variants-asc">品項：少 → 多</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">庫存篩選：</span>
          <input
            type="number"
            min="0"
            placeholder="最小"
            value={minStock}
            onChange={(e) => setMinStock(e.target.value)}
            className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          <span className="text-gray-400">~</span>
          <input
            type="number"
            min="0"
            placeholder="最大"
            value={maxStock}
            onChange={(e) => setMaxStock(e.target.value)}
            className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setQuickFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              minStock === "" && maxStock === ""
                ? "bg-orange-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            全部
          </button>
          <button
            onClick={() => setQuickFilter("out-of-stock")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              minStock === "0" && maxStock === "0"
                ? "bg-red-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            無庫存 (0)
          </button>
          <button
            onClick={() => setQuickFilter("low-stock")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              minStock === "1" && maxStock === "5"
                ? "bg-yellow-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            1-5
          </button>
          <button
            onClick={() => setQuickFilter("normal")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              minStock === "6" && maxStock === "10"
                ? "bg-green-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            6-10
          </button>
          <button
            onClick={() => setQuickFilter("high-stock")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              minStock === "11" && maxStock === ""
                ? "bg-blue-500 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            11+
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOutOfStockVariants(!showOutOfStockVariants)}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${
              showOutOfStockVariants ? "bg-orange-500" : "bg-gray-200"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                showOutOfStockVariants ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <span className="text-sm text-gray-600">含缺貨品項 ({stats.hasOutOfStockVariant})</span>
        </div>
      </div>

      {filteredInventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Package size={48} className="mb-4" />
          <p className="text-lg">找不到符合條件的商品</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => (
            <ProductCard
              key={item.product_id}
              product={{
                id: item.product_id,
                name: item.product_name,
                code: item.product_code,
                image_url: item.image_url,
                supplier_name: item.supplier_name,
                variants: item.variants.map((v) => ({
                  color: v.color,
                  size: v.size,
                  available: v.available,
                })),
              }}
              showVariants
              showSupplier
            />
          ))}
        </div>
      )}
    </>
  );
}
