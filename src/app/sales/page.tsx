"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, ShoppingCart, Calendar, Trash2, X, Package } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import type { SalesOrder, Product, ColorVariant, SalesItem } from "@/types";

interface OrderItem {
  color_variant_id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
  color: string;
  size: string | null;
}

export default function SalesPage() {
  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [variants, setVariants] = useState<(ColorVariant & { product_name: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [nextClientCode, setNextClientCode] = useState("");

  const [formData, setFormData] = useState({
    customer_name: "",
    source: "manual" as "shopee" | "manual" | "other",
    shopee_order_id: "",
    order_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const supabase = createClient();

      const [ordersRes, productsRes, variantsRes] = await Promise.all([
        supabase
          .from("sales_orders")
          .select(`
            *,
            sales_items (
              *,
              color_variant:color_variant_id (
                id,
                color,
                size,
                product:product_id (
                  id,
                  name,
                  code
                )
              )
            )
          `)
          .order("order_date", { ascending: false }),
        supabase.from("products").select("*").order("name"),
        supabase
          .from("color_variants")
          .select(`
            *,
            product:product_id (
              id,
              name
            )
          `)
          .order("created_at"),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (productsRes.error) throw productsRes.error;
      if (variantsRes.error) throw variantsRes.error;

      setOrders(ordersRes.data || []);
      setProducts(productsRes.data || []);

      const variantsWithProductName = (variantsRes.data || []).map((v: any) => ({
        ...v,
        product_name: v.product?.name || "",
      }));
      setVariants(variantsWithProductName);

      const maxCode = (ordersRes.data || [])
        .map((o) => {
          const match = o.client_code?.match(/^C(\d+)$/);
          return match ? parseInt(match[1]) : 0;
        })
        .reduce((max, curr) => Math.max(max, curr), 0);
      setNextClientCode(`C${String(maxCode + 1).padStart(3, "0")}`);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  function openModal() {
    setFormData({
      customer_name: "",
      source: "manual",
      shopee_order_id: "",
      order_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
    setOrderItems([]);
    setSelectedVariantId("");
    setItemQuantity(1);
    setItemUnitPrice(0);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  function addItem() {
    if (!selectedVariantId || itemQuantity <= 0) return;

    const variant = variants.find((v) => v.id === selectedVariantId);
    if (!variant) return;

    const available = variant.purchased - variant.defective - variant.sold;
    if (itemQuantity > available) {
      alert(`庫存不足！目前可用庫存為 ${available}`);
      return;
    }

    const existingIdx = orderItems.findIndex((item) => item.color_variant_id === selectedVariantId);
    if (existingIdx >= 0) {
      const updated = [...orderItems];
      updated[existingIdx].quantity += itemQuantity;
      setOrderItems(updated);
    } else {
      setOrderItems([
        ...orderItems,
        {
          color_variant_id: selectedVariantId,
          quantity: itemQuantity,
          unit_price: itemUnitPrice,
          product_name: variant.product_name,
          color: variant.color,
          size: variant.size,
        },
      ]);
    }

    setSelectedVariantId("");
    setItemQuantity(1);
    setItemUnitPrice(0);
  }

  function removeItem(index: number) {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  }

  const totalAmount = orderItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (orderItems.length === 0) {
      alert("請至少新增一項商品");
      return;
    }

    const supabase = createClient();

    const { data: orderData, error: orderError } = await supabase
      .from("sales_orders")
      .insert([
        {
          client_code: nextClientCode,
          customer_name: formData.customer_name || null,
          source: formData.source,
          shopee_order_id: formData.shopee_order_id || null,
          order_date: formData.order_date,
          total_amount: totalAmount,
          notes: formData.notes || null,
        },
      ])
      .select()
      .single();

    if (orderError) {
      alert("新增失敗：" + orderError.message);
      return;
    }

    const salesItems = orderItems.map((item) => ({
      sales_order_id: orderData.id,
      color_variant_id: item.color_variant_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      amount: item.quantity * item.unit_price,
    }));

    const { error: itemsError } = await supabase.from("sales_items").insert(salesItems);

    if (itemsError) {
      alert("新增明細失敗：" + itemsError.message);
      return;
    }

    for (const item of orderItems) {
      const variant = variants.find((v) => v.id === item.color_variant_id);
      if (variant) {
        await supabase
          .from("color_variants")
          .update({ sold: variant.sold + item.quantity })
          .eq("id", variant.id);
      }
    }

    closeModal();
    fetchData();
  }

  async function updateStatus(id: string, status: "pending" | "completed" | "cancelled") {
    const supabase = createClient();
    const { error } = await supabase
      .from("sales_orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("更新失敗：" + error.message);
      return;
    }

    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除此銷售訂單嗎？")) return;

    const supabase = createClient();
    const { error } = await supabase.from("sales_orders").delete().eq("id", id);

    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }

    fetchData();
  }

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statusLabels = {
    pending: "待處理",
    completed: "已完成",
    cancelled: "已取消",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">銷售記錄</h1>
        <Button onClick={openModal}>
          <Plus size={16} className="mr-2" />
          新增銷售單
        </Button>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <ShoppingCart size={48} className="mb-4" />
          <p className="text-lg">尚無銷售記錄</p>
          <p className="text-sm mt-2">點擊上方按鈕新增第一筆銷售</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const displayName = order.customer_name || order.client_code;
            const items = (order.sales_items || []) as any[];
            return (
              <Card key={order.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{displayName}</h3>
                      <span className="text-xs text-gray-400">{order.client_code}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status]}`}>
                        {statusLabels[order.status]}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {format(new Date(order.order_date), "yyyy/MM/dd", { locale: zhTW })}
                      </span>
                      <span>來源：{order.source === "shopee" ? "蝦皮" : order.source === "manual" ? "手動" : "其他"}</span>
                      {order.shopee_order_id && <span>訂單號：{order.shopee_order_id}</span>}
                    </div>
                    {items.length > 0 && (
                      <div className="mt-2 text-sm text-gray-600">
                        {items.map((item, idx) => {
                          const variant = item.color_variant as any;
                          return (
                            <span key={idx}>
                              {variant?.product?.name} ({variant?.color}{variant?.size ? `/${variant.size}` : ""}) x{item.quantity}
                              {idx < items.length - 1 ? "、" : ""}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <div className="mt-2 text-lg font-bold text-orange-600">${order.total_amount}</div>
                  </div>
                  <div className="flex gap-1">
                    {order.status === "pending" && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => updateStatus(order.id, "completed")}>
                          完成
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => updateStatus(order.id, "cancelled")}>
                          取消
                        </Button>
                      </>
                    )}
                    <button onClick={() => handleDelete(order.id)} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      <Trash2 size={16} className="text-red-500" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title="新增銷售單">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
            <span className="text-sm text-gray-600">客戶編號</span>
            <span className="font-mono font-bold text-gray-900">{nextClientCode}</span>
          </div>

          <Input
            label="客戶名稱（選填，留白顯示編號）"
            value={formData.customer_name}
            onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
            placeholder="留白將顯示客戶編號"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">來源</label>
            <select
              value={formData.source}
              onChange={(e) => setFormData({ ...formData, source: e.target.value as "shopee" | "manual" | "other" })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="manual">手動輸入</option>
              <option value="shopee">蝦皮</option>
              <option value="other">其他</option>
            </select>
          </div>

          {formData.source === "shopee" && (
            <Input
              label="蝦皮訂單編號"
              value={formData.shopee_order_id}
              onChange={(e) => setFormData({ ...formData, shopee_order_id: e.target.value })}
            />
          )}

          <Input
            label="訂單日期"
            type="date"
            value={formData.order_date}
            onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
            required
          />

          <div className="border-t pt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">商品明細</label>

            <div className="bg-gray-50 rounded-lg p-3 space-y-2">
              <div className="grid grid-cols-1 gap-2">
                <select
                  value={selectedVariantId}
                  onChange={(e) => {
                    setSelectedVariantId(e.target.value);
                    const v = variants.find((v) => v.id === e.target.value);
                    if (v) {
                      const available = v.purchased - v.defective - v.sold;
                      setItemQuantity(Math.min(1, available));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">選擇商品/顏色</option>
                  {variants.map((v) => {
                    const available = v.purchased - v.defective - v.sold;
                    return (
                      <option key={v.id} value={v.id} disabled={available <= 0}>
                        {v.product_name} - {v.color}{v.size ? `/${v.size}` : ""} (庫存: {available})
                      </option>
                    );
                  })}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    label="數量"
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(parseInt(e.target.value) || 0)}
                  />
                  <Input
                    label="單價"
                    type="number"
                    step="0.01"
                    value={itemUnitPrice}
                    onChange={(e) => setItemUnitPrice(parseFloat(e.target.value) || 0)}
                  />
                </div>
                <Button type="button" size="sm" onClick={addItem} disabled={!selectedVariantId}>
                  <Plus size={14} className="mr-1" />
                  加入明細
                </Button>
              </div>
            </div>

            {orderItems.length > 0 && (
              <div className="mt-3 space-y-2">
                {orderItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white border rounded-lg p-2">
                    <div className="flex-1 text-sm">
                      <span className="font-medium">{item.product_name}</span>
                      <span className="text-gray-500 ml-1">
                        {item.color}{item.size ? `/${item.size}` : ""}
                      </span>
                      <span className="text-gray-400 ml-2">x{item.quantity}</span>
                      <span className="text-gray-400 ml-2">@${item.unit_price}</span>
                      <span className="font-medium ml-2">=${item.quantity * item.unit_price}</span>
                    </div>
                    <button type="button" onClick={() => removeItem(idx)} className="p-1 hover:bg-red-50 rounded">
                      <X size={14} className="text-red-500" />
                    </button>
                  </div>
                ))}
                <div className="text-right font-bold text-orange-600 text-lg pt-2 border-t">
                  總計：${totalAmount}
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={closeModal}>
              取消
            </Button>
            <Button type="submit">新增</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
