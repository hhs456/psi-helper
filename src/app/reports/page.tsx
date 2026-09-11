"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/Card";
import { TrendingUp, Package, ShoppingCart, DollarSign } from "lucide-react";
import type { InventorySummary } from "@/types";

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalStock: 0,
    totalSales: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const supabase = createClient();

      const [productsRes, variantsRes, salesRes] = await Promise.all([
        supabase.from("products").select("id", { count: "exact" }),
        supabase.from("color_variants").select("purchased, defective, sold"),
        supabase
          .from("sales_orders")
          .select("total_amount")
          .eq("status", "completed"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (variantsRes.error) throw variantsRes.error;
      if (salesRes.error) throw salesRes.error;

      const totalStock = (variantsRes.data || []).reduce(
        (sum, v) => sum + (v.purchased - v.defective - v.sold),
        0
      );

      const totalSales = (variantsRes.data || []).reduce(
        (sum, v) => sum + v.sold,
        0
      );

      const totalRevenue = (salesRes.data || []).reduce(
        (sum, s) => sum + Number(s.total_amount),
        0
      );

      setStats({
        totalProducts: productsRes.count || 0,
        totalStock,
        totalSales,
        totalRevenue,
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  const statCards = [
    {
      title: "商品總數",
      value: stats.totalProducts,
      icon: Package,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      title: "當前庫存",
      value: stats.totalStock,
      icon: TrendingUp,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      title: "已售數量",
      value: stats.totalSales,
      icon: ShoppingCart,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      title: "銷售金額",
      value: `$${stats.totalRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">報表分析</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title} className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon size={24} className={stat.color} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          庫存健康度
        </h2>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600">庫存週轉率</span>
              <span className="font-medium">
                {stats.totalStock > 0
                  ? ((stats.totalSales / stats.totalStock) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-orange-500 h-2 rounded-full transition-all"
                style={{
                  width: `${
                    stats.totalStock > 0
                      ? Math.min((stats.totalSales / stats.totalStock) * 100, 100)
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
