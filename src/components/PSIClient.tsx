"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PSICard } from "@/components/ui/PSICard";
import { Pagination } from "@/components/ui/Pagination";
import { Package, Search, Loader2, ArrowUpDown } from "lucide-react";
import { usePSI, PSIItem } from "@/lib/hooks";

type SortOption = "default" | "purchased-desc" | "purchased-asc" | "sold-desc" | "sold-asc" | "stock-desc" | "stock-asc";

export function PSIClient({ pageSize }: { pageSize: number }) {
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") || "1");
  const { items, totalPages, isLoading, error } = usePSI(currentPage, pageSize);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("default");

  const getTotal = (item: PSIItem, field: "purchased" | "defective" | "sold" | "available") =>
    item.variants.reduce((sum, v) => sum + v[field], 0);

  const filteredItems = useMemo(() => {
    const result = items.filter((item) => {
      const query = searchQuery.toLowerCase();
      return (
        item.product_name.toLowerCase().includes(query) ||
        (item.product_code && item.product_code.toLowerCase().includes(query)) ||
        item.supplier_name.toLowerCase().includes(query)
      );
    });

    switch (sortBy) {
      case "purchased-desc":
        result.sort((a, b) => getTotal(b, "purchased") - getTotal(a, "purchased"));
        break;
      case "purchased-asc":
        result.sort((a, b) => getTotal(a, "purchased") - getTotal(b, "purchased"));
        break;
      case "sold-desc":
        result.sort((a, b) => getTotal(b, "sold") - getTotal(a, "sold"));
        break;
      case "sold-asc":
        result.sort((a, b) => getTotal(a, "sold") - getTotal(b, "sold"));
        break;
      case "stock-desc":
        result.sort((a, b) => getTotal(b, "available") - getTotal(a, "available"));
        break;
      case "stock-asc":
        result.sort((a, b) => getTotal(a, "available") - getTotal(b, "available"));
        break;
    }
    return result;
  }, [items, searchQuery, sortBy]);

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

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Package size={48} className="mb-4" />
        <p className="text-lg">尚無進銷資料</p>
        <p className="text-sm mt-2">請先新增供應商和商品</p>
      </div>
    );
  }

  return (
    <>
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

      <div className="mb-4">
        <div className="flex items-center gap-2">
          <ArrowUpDown size={16} className="text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="default">預設排序</option>
            <option value="purchased-desc">進貨：多 → 少</option>
            <option value="purchased-asc">進貨：少 → 多</option>
            <option value="sold-desc">銷售：多 → 少</option>
            <option value="sold-asc">銷售：少 → 多</option>
            <option value="stock-desc">庫存：多 → 少</option>
            <option value="stock-asc">庫存：少 → 多</option>
          </select>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Package size={48} className="mb-4" />
          <p className="text-lg">找不到符合條件的商品</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <PSICard
              key={item.product_id}
              product={{
                id: item.product_id,
                name: item.product_name,
                code: item.product_code,
                image_url: item.image_url,
                supplier_name: item.supplier_name,
                variants: item.variants,
              }}
            />
          ))}
        </div>
      )}

      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/psi" />
    </>
  );
}
