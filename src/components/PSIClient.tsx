"use client";

import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PSICard } from "@/components/ui/PSICard";
import { Pagination } from "@/components/ui/Pagination";
import { Package, Search, Loader2, ArrowUpDown, Filter } from "lucide-react";
import { usePSI, useSuppliers, PSISortOption } from "@/lib/hooks";

export function PSIClient({ pageSize }: { pageSize: number }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const currentPage = parseInt(searchParams.get("page") || "1");
  const { suppliers } = useSuppliers();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<PSISortOption>("default");
  const [selectedSupplier, setSelectedSupplier] = useState("");

  const { items, totalPages, isLoading, error } = usePSI(currentPage, pageSize, {
    searchQuery,
    supplierName: selectedSupplier,
    sortBy,
  });

  const prevFilterRef = useRef({ searchQuery, selectedSupplier, sortBy });
  useEffect(() => {
    const prev = prevFilterRef.current;
    if (prev.searchQuery !== searchQuery || prev.selectedSupplier !== selectedSupplier || prev.sortBy !== sortBy) {
      prevFilterRef.current = { searchQuery, selectedSupplier, sortBy };
      if (currentPage > 1) {
        router.replace("/psi?page=1");
      }
    }
  }, [searchQuery, selectedSupplier, sortBy, currentPage, router]);

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

  const hasNoFilters = !searchQuery && !selectedSupplier;

  if (items.length === 0 && hasNoFilters) {
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

      <div className="mb-4 flex items-center gap-2">
        <div className="flex items-center gap-2 flex-1">
          <Filter size={16} className="text-gray-500" />
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="">全部供應商</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2 flex-1">
          <ArrowUpDown size={16} className="text-gray-500" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as PSISortOption)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          >
            <option value="default">預設排序</option>
            <option value="purchased-asc">進貨：低 → 高</option>
            <option value="purchased-desc">進貨：高 → 低</option>
            <option value="sold-asc">銷售：低 → 高</option>
            <option value="sold-desc">銷售：高 → 低</option>
            <option value="stock-asc">庫存：低 → 高</option>
            <option value="stock-desc">庫存：高 → 低</option>
          </select>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Package size={48} className="mb-4" />
          <p className="text-lg">找不到符合條件的商品</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
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
