"use client";

import { useState, useMemo } from "react";
import { PSICard } from "@/components/ui/PSICard";
import { Package, Search, Loader2 } from "lucide-react";
import { useInventory } from "@/lib/hooks";

export function PSIClient() {
  const { inventory, isLoading, error } = useInventory();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredInventory = useMemo(() => {
    return inventory.filter((item) => {
      const query = searchQuery.toLowerCase();
      return (
        item.product_name.toLowerCase().includes(query) ||
        (item.product_code && item.product_code.toLowerCase().includes(query)) ||
        item.supplier_name.toLowerCase().includes(query)
      );
    });
  }, [inventory, searchQuery]);

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

      {filteredInventory.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Package size={48} className="mb-4" />
          <p className="text-lg">找不到符合條件的商品</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => (
            <PSICard
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
                  purchased: v.purchased,
                  defective: v.defective,
                  sold: v.sold,
                  available: v.available,
                })),
              }}
            />
          ))}
        </div>
      )}
    </>
  );
}
