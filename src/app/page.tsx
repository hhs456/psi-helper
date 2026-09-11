"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/Card";
import { Package, AlertTriangle, Search } from "lucide-react";
import type { InventorySummary } from "@/types";

export default function Home() {
  const [inventory, setInventory] = useState<InventorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInventory();
  }, []);

  async function fetchInventory() {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("color_variants")
        .select(`
          id,
          color,
          size,
          purchased,
          defective,
          sold,
          product:product_id (
            id,
            name,
            code,
            image_url,
            supplier:supplier_id (
              name
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group by product
      const grouped = data.reduce((acc: Record<string, InventorySummary>, item: any) => {
        const productId = item.product.id;
        if (!acc[productId]) {
          acc[productId] = {
            product_id: productId,
            product_name: item.product.name,
            product_code: item.product.code,
            supplier_name: item.product.supplier?.name || "未設定",
            image_url: item.product.image_url,
            variants: [],
          };
        }
        acc[productId].variants.push({
          color: item.color,
          size: item.size,
          purchased: item.purchased,
          defective: item.defective,
          sold: item.sold,
          available: item.purchased - item.defective - item.sold,
        });
        return acc;
      }, {});

      setInventory(Object.values(grouped));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredInventory = inventory.filter((item) => {
    const query = searchQuery.toLowerCase();
    return (
      item.product_name.toLowerCase().includes(query) ||
      (item.product_code && item.product_code.toLowerCase().includes(query)) ||
      item.supplier_name.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">
          <AlertTriangle className="inline mr-2" />
          {error}
        </div>
      </div>
    );
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
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">庫存總覽</h1>
      
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
          <p className="text-lg">{inventory.length === 0 ? "尚無庫存資料" : "找不到符合條件的商品"}</p>
          {inventory.length === 0 && (
            <p className="text-sm mt-2">請先新增供應商和商品</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map((item) => (
          <Link key={item.product_id} href={`/products/${item.product_id}`}>
            <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex">
              {/* Product Image */}
              <div className="w-24 h-24 flex-shrink-0 bg-gray-100">
                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Package className="text-gray-400" size={32} />
                  </div>
                )}
              </div>

              {/* Product Info */}
              <div className="flex-1 p-4">
                <h3 className="font-semibold text-gray-900 text-sm">
                  {item.product_name}
                </h3>
                {item.product_code && (
                  <p className="text-xs text-gray-500 mt-0.5">{item.product_code}</p>
                )}
                <p className="text-xs text-gray-500 mt-1">{item.supplier_name}</p>

                {/* Color Variants */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.variants.map((variant, idx) => (
                    <span
                      key={idx}
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        variant.available > 0
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {variant.color}
                      {variant.size && `/${variant.size}`}: {variant.available}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            </Card>
          </Link>
        ))}
        </div>
      )}
    </div>
  );
}
