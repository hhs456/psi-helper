"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, ShoppingCart, Calendar, Trash2, X, Edit2, Split } from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import type { SalesOrder, Product, ColorVariant } from "@/types";

interface OrderItem {
  color_variant_id: string;
  quantity: number;
  unit_price: number;
  product_name: string;
  color: string;
  size: string | null;
}

interface SplitItem {
  original_index: number;
  color_variant_id: string;
  original_quantity: number;
  keep_quantity: number;
  split_quantity: number;
  product_name: string;
  color: string;
  size: string | null;
}

type VariantWithProduct = ColorVariant & { product_name: string };

export function SalesClient({
  initialOrders,
  initialProducts,
  initialVariants,
  initialNextClientCode,
}: {
  initialOrders: SalesOrder[];
  initialProducts: Product[];
  initialVariants: VariantWithProduct[];
  initialNextClientCode: string;
}) {
  const [orders, setOrders] = useState<SalesOrder[]>(initialOrders);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [variants, setVariants] = useState<VariantWithProduct[]>(initialVariants);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SalesOrder | null>(null);
  const [splittingOrder, setSplittingOrder] = useState<SalesOrder | null>(null);
  const [nextClientCode, setNextClientCode] = useState(initialNextClientCode);

  const [formData, setFormData] = useState({
    customer_name: "",
    source: "manual" as "shopee" | "manual" | "other",
    shopee_order_id: "",
    order_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);
  const [itemUnitPrice, setItemUnitPrice] = useState(0);

  const [splitItems, setSplitItems] = useState<SplitItem[]>([]);
  const [splitClientCode, setSplitClientCode] = useState("");
  const [splitCustomerName, setSplitCustomerName] = useState("");

  const filteredVariants = selectedProductId
    ? variants.filter((v) => v.product_id === selectedProductId)
    : [];

  async function fetchData() {
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

    if (ordersRes.error || productsRes.error || variantsRes.error) {
      console.error("Error fetching data:", ordersRes.error || productsRes.error || variantsRes.error);
      return;
    }

    setOrders(ordersRes.data || []);
    setProducts(productsRes.data || []);

    const variantsWithProductName = (variantsRes.data || []).map((v: {
      id: string;
      product_id: string;
      color: string;
      size: string | null;
      purchased: number;
      defective: number;
      sold: number;
      sort_order: number;
      is_pinned: boolean;
      created_at: string;
      updated_at: string;
      product: { id: string; name: string } | null;
    }) => ({
      id: v.id,
      product_id: v.product_id,
      color: v.color,
      size: v.size,
      purchased: v.purchased,
      defective: v.defective,
      sold: v.sold,
      sort_order: v.sort_order,
      is_pinned: v.is_pinned,
      created_at: v.created_at,
      updated_at: v.updated_at,
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
  }

  function openModal() {
    setEditingOrder(null);
    setFormData({
      customer_name: "",
      source: "manual",
      shopee_order_id: "",
      order_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
    setOrderItems([]);
    setSelectedProductId("");
    setSelectedVariantId("");
    setItemQuantity(1);
    setItemUnitPrice(0);
    setIsModalOpen(true);
  }

  function openEditModal(order: SalesOrder) {
    setEditingOrder(order);
    const items = (order.sales_items || []) as {
      color_variant_id: string;
      quantity: number;
      unit_price: number;
      color_variant: {
        product?: { name: string };
        color: string;
        size: string | null;
      };
    }[];
    setFormData({
      customer_name: order.customer_name || "",
      source: order.source as "shopee" | "manual" | "other",
      shopee_order_id: order.shopee_order_id || "",
      order_date: order.order_date || format(new Date(), "yyyy-MM-dd"),
      notes: order.notes || "",
    });
    setOrderItems(
      items.map((item) => ({
        color_variant_id: item.color_variant_id,
        quantity: item.quantity,
        unit_price: item.unit_price || 0,
        product_name: item.color_variant?.product?.name || "",
        color: item.color_variant?.color || "",
        size: item.color_variant?.size || null,
      }))
    );
    setSelectedProductId("");
    setSelectedVariantId("");
    setItemQuantity(1);
    setItemUnitPrice(0);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingOrder(null);
  }

  function addItem() {
    if (!selectedVariantId || itemQuantity <= 0) return;

    const variant = variants.find((v) => v.id === selectedVariantId);
    if (!variant) return;

    const available = variant.purchased - variant.defective - variant.sold;
    const existingQty = orderItems
      .filter((item) => item.color_variant_id === selectedVariantId)
      .reduce((sum, item) => sum + item.quantity, 0);

    let originalOrderQty = 0;
    if (editingOrder) {
      originalOrderQty = (editingOrder.sales_items as { color_variant_id: string; quantity: number }[] | undefined)
        ?.filter((item) => item.color_variant_id === selectedVariantId)
        .reduce((sum, item) => sum + item.quantity, 0) || 0;
    }

    const effectiveAvailable = available + originalOrderQty - existingQty;
    if (itemQuantity > effectiveAvailable) {
      alert(`庫存不足！目前可用庫存為 ${effectiveAvailable}`);
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

  function handleProductChange(productId: string) {
    setSelectedProductId(productId);
    setSelectedVariantId("");
    setItemQuantity(1);
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

    if (editingOrder) {
      await handleUpdateOrder();
    } else {
      await handleCreateOrder();
    }
  }

  async function handleCreateOrder() {
    const supabase = createClient();
    const reference = formData.customer_name || nextClientCode;

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

        await supabase.from("stock_logs").insert([
          {
            color_variant_id: item.color_variant_id,
            type: "sale",
            quantity: item.quantity,
            reference: reference,
          },
        ]);
      }
    }

    closeModal();
    await fetchData();
  }

  async function handleUpdateOrder() {
    if (!editingOrder) return;
    const supabase = createClient();

    const oldItems = (editingOrder.sales_items || []) as {
      color_variant_id: string;
      quantity: number;
    }[];
    const oldItemsMap = new Map<string, number>();
    for (const item of oldItems) {
      oldItemsMap.set(item.color_variant_id, (oldItemsMap.get(item.color_variant_id) || 0) + item.quantity);
    }

    const newItemsMap = new Map<string, number>();
    for (const item of orderItems) {
      newItemsMap.set(item.color_variant_id, (newItemsMap.get(item.color_variant_id) || 0) + item.quantity);
    }

    const { error: orderError } = await supabase
      .from("sales_orders")
      .update({
        client_code: editingOrder.client_code,
        customer_name: formData.customer_name || null,
        source: formData.source,
        shopee_order_id: formData.shopee_order_id || null,
        order_date: formData.order_date,
        total_amount: totalAmount,
        notes: formData.notes || null,
      })
      .eq("id", editingOrder.id);

    if (orderError) {
      alert("更新失敗：" + orderError.message);
      return;
    }

    const { error: deleteItemsError } = await supabase
      .from("sales_items")
      .delete()
      .eq("sales_order_id", editingOrder.id);

    if (deleteItemsError) {
      alert("刪除舊明細失敗：" + deleteItemsError.message);
      return;
    }

    if (orderItems.length > 0) {
      const salesItems = orderItems.map((item) => ({
        sales_order_id: editingOrder.id,
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
    }

    const allVariantIds = new Set([...oldItemsMap.keys(), ...newItemsMap.keys()]);
    for (const variantId of allVariantIds) {
      const oldQty = oldItemsMap.get(variantId) || 0;
      const newQty = newItemsMap.get(variantId) || 0;
      const diff = newQty - oldQty;

      if (diff !== 0) {
        const variant = variants.find((v) => v.id === variantId);
        if (variant) {
          await supabase
            .from("color_variants")
            .update({ sold: variant.sold + diff })
            .eq("id", variantId);

          const reference = formData.customer_name || editingOrder.client_code;
          await supabase.from("stock_logs").insert([
            {
              color_variant_id: variantId,
              type: "sale",
              quantity: Math.abs(diff),
              reference: `${reference} (調整${diff > 0 ? "+" : ""}${diff})`,
            },
          ]);
        }
      }
    }

    closeModal();
    await fetchData();
  }

  async function updateStatus(id: string, status: "pending" | "completed" | "cancelled") {
    const supabase = createClient();
    const order = orders.find((o) => o.id === id);

    if (status === "cancelled" && order) {
      const items = (order.sales_items || []) as {
        color_variant_id: string;
        quantity: number;
      }[];
      const reference = order.customer_name || order.client_code;

      for (const item of items) {
        const variant = variants.find((v) => v.id === item.color_variant_id);
        if (variant) {
          await supabase
            .from("color_variants")
            .update({ sold: variant.sold - item.quantity })
            .eq("id", variant.id);

          await supabase.from("stock_logs").insert([
            {
              color_variant_id: variant.id,
              type: "sale",
              quantity: item.quantity,
              reference: `${reference} (取消訂單)`,
            },
          ]);
        }
      }
    }

    const { error } = await supabase
      .from("sales_orders")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("更新失敗：" + error.message);
      return;
    }

    await fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除此銷售訂單嗎？")) return;

    const supabase = createClient();
    const order = orders.find((o) => o.id === id);
    if (!order) return;

    const shouldRevert = order.status !== "cancelled";

    if (shouldRevert) {
      const items = (order.sales_items || []) as {
        color_variant_id: string;
        quantity: number;
      }[];
      const reference = order.customer_name || order.client_code;

      for (const item of items) {
        const variant = variants.find((v) => v.id === item.color_variant_id);
        if (variant) {
          await supabase
            .from("color_variants")
            .update({ sold: variant.sold - item.quantity })
            .eq("id", variant.id);

          await supabase.from("stock_logs").insert([
            {
              color_variant_id: variant.id,
              type: "sale",
              quantity: item.quantity,
              reference: `${reference} (刪除訂單)`,
            },
          ]);
        }
      }
    }

    const { error } = await supabase.from("sales_orders").delete().eq("id", id);

    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }

    await fetchData();
  }

  function openSplitModal(order: SalesOrder) {
    setSplittingOrder(order);
    const items = (order.sales_items || []) as {
      color_variant_id: string;
      quantity: number;
      color_variant: {
        product?: { name: string };
        color: string;
        size: string | null;
      };
    }[];
    setSplitItems(
      items.map((item, idx) => ({
        original_index: idx,
        color_variant_id: item.color_variant_id,
        original_quantity: item.quantity,
        keep_quantity: item.quantity,
        split_quantity: 0,
        product_name: item.color_variant?.product?.name || "",
        color: item.color_variant?.color || "",
        size: item.color_variant?.size || null,
      }))
    );
    setSplitClientCode(nextClientCode);
    setSplitCustomerName("");
    setIsSplitModalOpen(true);
  }

  function updateSplitItem(index: number, field: "keep_quantity" | "split_quantity", value: number) {
    setSplitItems((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (field === "keep_quantity") {
        const maxKeep = item.original_quantity;
        const newKeep = Math.min(Math.max(0, value), maxKeep);
        item.keep_quantity = newKeep;
        item.split_quantity = item.original_quantity - newKeep;
      } else {
        const maxSplit = item.original_quantity;
        const newSplit = Math.min(Math.max(0, value), maxSplit);
        item.split_quantity = newSplit;
        item.keep_quantity = item.original_quantity - newSplit;
      }
      return updated;
    });
  }

  async function handleSplit() {
    if (!splittingOrder) return;

    const hasSplit = splitItems.some((item) => item.split_quantity > 0);
    if (!hasSplit) {
      alert("沒有需要拆分的項目");
      return;
    }

    const supabase = createClient();

    const splitSalesItems = splitItems
      .filter((item) => item.split_quantity > 0)
      .map((item) => {
        const originalItem = (splittingOrder.sales_items as {
          unit_price: number;
        }[])[item.original_index];
        return {
          sales_order_id: null as string | null,
          color_variant_id: item.color_variant_id,
          quantity: item.split_quantity,
          unit_price: originalItem.unit_price || 0,
          amount: item.split_quantity * (originalItem.unit_price || 0),
        };
      });

    const { data: newOrderData, error: newOrderError } = await supabase
      .from("sales_orders")
      .insert([
        {
          client_code: splitClientCode,
          customer_name: splitCustomerName || null,
          source: splittingOrder.source,
          shopee_order_id: null,
          order_date: splittingOrder.order_date,
          total_amount: splitSalesItems.reduce((sum, item) => sum + item.amount, 0),
          notes: `從訂單 ${splittingOrder.client_code} 拆分`,
        },
      ])
      .select()
      .single();

    if (newOrderError) {
      alert("建立新訂單失敗：" + newOrderError.message);
      return;
    }

    for (const item of splitSalesItems) {
      item.sales_order_id = newOrderData.id;
    }

    const { error: itemsError } = await supabase.from("sales_items").insert(splitSalesItems);

    if (itemsError) {
      alert("新增拆分明細失敗：" + itemsError.message);
      return;
    }

    const keepItems = splitItems
      .filter((item) => item.keep_quantity > 0)
      .map((item) => {
        const originalItem = (splittingOrder.sales_items as {
          id: string;
          unit_price: number;
        }[])[item.original_index];
        return {
          id: originalItem.id,
          quantity: item.keep_quantity,
          amount: item.keep_quantity * (originalItem.unit_price || 0),
        };
      });

    for (const item of keepItems) {
      await supabase
        .from("sales_items")
        .update({ quantity: item.quantity, amount: item.amount })
        .eq("id", item.id);
    }

    const removeItems = splitItems
      .filter((item) => item.keep_quantity === 0)
      .map((item) => {
        const originalItem = (splittingOrder.sales_items as {
          id: string;
        }[])[item.original_index];
        return originalItem.id;
      });

    if (removeItems.length > 0) {
      await supabase.from("sales_items").delete().in("id", removeItems);
    }

    const newTotalAmount = splitItems.reduce((sum, item) => {
      const originalItem = (splittingOrder.sales_items as {
        unit_price: number;
      }[])[item.original_index];
      return sum + item.keep_quantity * (originalItem.unit_price || 0);
    }, 0);

    await supabase
      .from("sales_orders")
      .update({ total_amount: newTotalAmount })
      .eq("id", splittingOrder.id);

    setIsSplitModalOpen(false);
    setSplittingOrder(null);
    await fetchData();
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

  return (
    <>
      <div className="flex items-center justify-between mb-6">
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
    const items = (order.sales_items || []) as {
      color_variant_id: string;
      quantity: number;
      unit_price: number;
      color_variant: {
        product?: { name: string };
        color: string;
        size: string | null;
      };
    }[];
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
                        {items.map((item, idx) => (
                          <span key={idx}>
                            {item.color_variant?.product?.name} ({item.color_variant?.color}{item.color_variant?.size ? `/${item.color_variant.size}` : ""}) x{item.quantity}
                            {idx < items.length - 1 ? "、" : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-2 text-lg font-bold text-orange-600">${order.total_amount}</div>
                  </div>
                  <div className="flex gap-1">
                    {(order.status === "pending" || order.status === "completed") && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => openEditModal(order)}>
                          <Edit2 size={14} className="mr-1" />
                          編輯
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => openSplitModal(order)}>
                          <Split size={14} className="mr-1" />
                          拆單
                        </Button>
                      </>
                    )}
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

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingOrder ? "編輯銷售單" : "新增銷售單"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingOrder && (
            <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
              <span className="text-sm text-gray-600">客戶編號</span>
              <span className="font-mono font-bold text-gray-900">{nextClientCode}</span>
            </div>
          )}

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
                  value={selectedProductId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">選擇商品</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{p.code ? ` (${p.code})` : ""}
                    </option>
                  ))}
                </select>
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
                  disabled={!selectedProductId}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">
                    {selectedProductId ? "選擇顏色/款式" : "請先選擇商品"}
                  </option>
                  {filteredVariants.map((v) => {
                    const available = v.purchased - v.defective - v.sold;
                    return (
                      <option key={v.id} value={v.id} disabled={available <= 0}>
                        {v.color}{v.size ? `/${v.size}` : ""} (庫存: {available})
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
            <Button type="submit">{editingOrder ? "更新" : "新增"}</Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isSplitModalOpen}
        onClose={() => {
          setIsSplitModalOpen(false);
          setSplittingOrder(null);
        }}
        title="拆單"
      >
        <div className="space-y-4">
          {splittingOrder && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">
                從訂單 <span className="font-mono font-bold">{splittingOrder.client_code}</span> 拆分
              </p>
            </div>
          )}

          <div className="bg-orange-50 rounded-lg p-3 space-y-2">
            <h4 className="font-medium text-gray-900">新訂單客戶資訊</h4>
            <div className="bg-white rounded-lg p-2 flex items-center justify-between">
              <span className="text-sm text-gray-600">客戶編號</span>
              <span className="font-mono font-bold text-gray-900">{splitClientCode}</span>
            </div>
            <Input
              label="客戶名稱（選填）"
              value={splitCustomerName}
              onChange={(e) => setSplitCustomerName(e.target.value)}
              placeholder="留白將顯示客戶編號"
            />
          </div>

          <div>
            <h4 className="font-medium text-gray-900 mb-2">拆分明細</h4>
            <p className="text-xs text-gray-500 mb-3">
              調整每個項目的「保留數量」和「拆分數量」，拆分數量會移到新訂單
            </p>
            <div className="space-y-3">
              {splitItems.map((item, idx) => (
                <div key={idx} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">
                      {item.product_name} ({item.color}{item.size ? `/${item.size}` : ""})
                    </span>
                    <span className="text-xs text-gray-500">
                      原始數量：{item.original_quantity}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">保留數量</label>
                      <input
                        type="number"
                        min="0"
                        max={item.original_quantity}
                        value={item.keep_quantity}
                        onChange={(e) => updateSplitItem(idx, "keep_quantity", parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">拆分數量</label>
                      <input
                        type="number"
                        min="0"
                        max={item.original_quantity}
                        value={item.split_quantity}
                        onChange={(e) => updateSplitItem(idx, "split_quantity", parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsSplitModalOpen(false);
                setSplittingOrder(null);
              }}
            >
              取消
            </Button>
            <Button onClick={handleSplit}>確認拆分</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
