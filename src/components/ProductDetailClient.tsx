"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { SortableCard, DragHandle } from "@/components/ui/SortableCard";
import { VariantFormModal, VariantFormMode } from "@/components/ui/VariantFormModal";
import {
  ArrowLeft,
  Plus,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trash2,
  Edit2,
  ChevronDown,
  ChevronRight,
  Pin,
  PinOff,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useProductDetail } from "@/lib/hooks";
import { useSortableList } from "@/lib/useSortableList";
import { usePin } from "@/lib/usePin";
import type { ColorVariant, StockLog } from "@/types";

function VariantCard({
  variant,
  onPin,
  onLog,
  onEdit,
  onDelete,
}: {
  variant: ColorVariant;
  onPin: (id: string, isPinned: boolean) => void;
  onLog: (variant: ColorVariant) => void;
  onEdit: (variant: ColorVariant) => void;
  onDelete: (id: string) => void;
}) {
  const available = variant.purchased - variant.defective - variant.sold;

  return (
    <SortableCard id={variant.id} isPinned={variant.is_pinned} className="p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <DragHandle className="-ml-1 p-1" iconSize={14} />
          <h3 className="font-semibold text-gray-900">{variant.color}</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onPin(variant.id, variant.is_pinned)}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title={variant.is_pinned ? "取消釘選" : "釘選"}
          >
            {variant.is_pinned ? (
              <PinOff size={14} className="text-orange-500" />
            ) : (
              <Pin size={14} className="text-gray-400" />
            )}
          </button>
          <Button size="sm" variant="secondary" onClick={() => onLog(variant)}>
            記錄
          </Button>
          <button
            onClick={() => onEdit(variant)}
            className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <Edit2 size={14} className="text-blue-500" />
          </button>
          <button
            onClick={() => onDelete(variant.id)}
            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
          >
            <Trash2 size={14} className="text-red-500" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <p className="text-lg font-bold">{variant.purchased}</p>
          <p className="text-xs text-gray-500">進貨</p>
        </div>
        <div>
          <p className="text-lg font-bold text-yellow-600">{variant.defective}</p>
          <p className="text-xs text-gray-500">瑕疵</p>
        </div>
        <div>
          <p className="text-lg font-bold text-red-600">{variant.sold}</p>
          <p className="text-xs text-gray-500">已售</p>
        </div>
        <div>
          <p className={`text-lg font-bold ${available > 0 ? "text-green-600" : "text-red-600"}`}>
            {available}
          </p>
          <p className="text-xs text-gray-500">庫存</p>
        </div>
      </div>
    </SortableCard>
  );
}

export function ProductDetailClient() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const { product, variants: fetchedVariants, nextClientCode: initialNextClientCode, isLoading, isValidating, error } = useProductDetail(productId);

  const [variants, setVariants] = useState<ColorVariant[]>(fetchedVariants);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [stockLogsLoading, setStockLogsLoading] = useState(false);
  const [prevProductId, setPrevProductId] = useState(productId);

  if (prevProductId !== productId) {
    setPrevProductId(productId);
    setVariants([]);
    setStockLogs([]);
  }

  // Sync local state with SWR data when it loads
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setVariants(fetchedVariants);
  }, [fetchedVariants]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [variantModalMode, setVariantModalMode] = useState<VariantFormMode | null>(null);
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ColorVariant | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<ColorVariant | null>(null);
  const [logForm, setLogForm] = useState({
    type: "purchase" as "purchase" | "defect" | "sale",
    quantity: 0,
    reference: "",
    customer_name: "",
    unit_price: 0,
  });
  const [nextClientCode, setNextClientCode] = useState(initialNextClientCode);
  const [expandedSizes, setExpandedSizes] = useState<Set<string>>(new Set());
  const [expandSaleDetails, setExpandSaleDetails] = useState(false);
  const [isLogSectionExpanded, setIsLogSectionExpanded] = useState(false);

  const { sensors, handleDragEnd: handleSortableDragEnd } = useSortableList({
    items: variants,
    tableName: "color_variants",
    getGroupKey: (v) => `${v.is_pinned}_${v.size || "均碼"}`,
    onReorder: setVariants,
  });

  const { handlePin: handlePinVariant } = usePin({
    items: variants,
    tableName: "color_variants",
    onUpdate: setVariants,
  });

  async function handleDragEnd(event: DragEndEvent) {
    await handleSortableDragEnd(event);
  }

  const variantsBySize = useMemo(() => {
    return variants.reduce<Record<string, ColorVariant[]>>((acc, v) => {
      const size = v.size || "均碼";
      if (!acc[size]) acc[size] = [];
      acc[size].push(v);
      return acc;
    }, {});
  }, [variants]);

  const sizeOrder = useMemo(() => {
    return Object.keys(variantsBySize).sort((a, b) => {
      if (a === "均碼") return 1;
      if (b === "均碼") return -1;
      return a.localeCompare(b, "zh-Hant-TW");
    });
  }, [variantsBySize]);

  const totalStats = useMemo(() => {
    return {
      purchased: variants.reduce((sum, v) => sum + v.purchased, 0),
      defective: variants.reduce((sum, v) => sum + v.defective, 0),
      sold: variants.reduce((sum, v) => sum + v.sold, 0),
      available: variants.reduce(
        (sum, v) => sum + (v.purchased - v.defective - v.sold),
        0
      ),
    };
  }, [variants]);

  async function fetchStockLogs() {
    const variantIds = variants.map((v) => v.id);
    if (variantIds.length === 0) return;

    setStockLogsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("stock_logs")
        .select(`
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
        `)
        .in("color_variant_id", variantIds)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setStockLogs(data);
      }
    } finally {
      setStockLogsLoading(false);
    }
  }

  function handleToggleLogSection() {
    const newState = !isLogSectionExpanded;
    setIsLogSectionExpanded(newState);
    if (newState && stockLogs.length === 0) {
      fetchStockLogs();
    }
  }

  if (isLoading || (isValidating && variants.length === 0)) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Package size={48} className="mb-4" />
        <p>找不到商品</p>
      </div>
    );
  }

  function toggleSize(size: string) {
    setExpandedSizes((prev) => {
      const next = new Set(prev);
      if (next.has(size)) {
        next.delete(size);
      } else {
        next.add(size);
      }
      return next;
    });
  }

  async function handleVariantSubmit(data: { color: string; size: string }) {
    if (!product) return;
    const supabase = createClient();

    const maxOrder = Math.max(...variants.map((v) => v.sort_order), 0);

    if (variantModalMode === "add-color" || variantModalMode === "add-size") {
      const sizeValue = data.size === "均碼" ? null : data.size;

      const { data: newData, error } = await supabase
        .from("color_variants")
        .insert([
          {
            product_id: product.id,
            color: data.color,
            size: sizeValue,
            sort_order: maxOrder + 1,
          },
        ])
        .select()
        .single();

      if (error) {
        alert("新增失敗：" + error.message);
        return;
      }

      if (newData) {
        setVariants([...variants, newData]);
      }

      setIsVariantModalOpen(false);
      setVariantModalMode(null);
      setSelectedSize(null);
    } else if (variantModalMode === "edit" && editingVariant) {
      const sizeValue = data.size === "均碼" ? null : data.size;

      const { error } = await supabase
        .from("color_variants")
        .update({
          color: data.color,
          size: sizeValue,
        })
        .eq("id", editingVariant.id);

      if (error) {
        alert("更新失敗：" + error.message);
        return;
      }

      setVariants(
        variants.map((v) =>
          v.id === editingVariant.id
            ? { ...v, color: data.color, size: sizeValue }
            : v
        )
      );

      setIsVariantModalOpen(false);
      setVariantModalMode(null);
      setEditingVariant(null);
    }
  }

  async function addStockLog(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVariant) return;

    const available = selectedVariant.purchased - selectedVariant.defective - selectedVariant.sold;

    if (logForm.type === "defect" && logForm.quantity > available) {
      alert(`庫存不足！可用庫存：${available}`);
      return;
    }

    if (logForm.type === "sale" && logForm.quantity > available) {
      alert(`庫存不足！可用庫存：${available}`);
      return;
    }

    const supabase = createClient();

    const { error: logError } = await supabase.from("stock_logs").insert([
      {
        color_variant_id: selectedVariant.id,
        type: logForm.type,
        quantity: logForm.quantity,
        reference: logForm.reference || null,
      },
    ]);

    if (logError) {
      alert("記錄失敗：" + logError.message);
      return;
    }

    const updateData: Record<string, number> = {};
    if (logForm.type === "purchase") {
      updateData.purchased = selectedVariant.purchased + logForm.quantity;
    } else if (logForm.type === "defect") {
      updateData.defective = selectedVariant.defective + logForm.quantity;
    } else if (logForm.type === "sale") {
      updateData.sold = selectedVariant.sold + logForm.quantity;
    }

    const { error: updateError } = await supabase
      .from("color_variants")
      .update(updateData)
      .eq("id", selectedVariant.id);

    if (updateError) {
      alert("更新失敗：" + updateError.message);
      return;
    }

    setVariants(
      variants.map((v) =>
        v.id === selectedVariant.id ? { ...v, ...updateData } : v
      )
    );

    if (logForm.type === "sale") {
      const { data: orderData, error: orderError } = await supabase
        .from("sales_orders")
        .insert([
          {
            client_code: nextClientCode,
            customer_name: logForm.customer_name || null,
            source: "manual",
            order_date: new Date().toISOString().split("T")[0],
            total_amount: logForm.quantity * logForm.unit_price,
          },
        ])
        .select()
        .single();

      if (orderError) {
        alert("建立銷售單失敗：" + orderError.message);
        return;
      }

      const { error: itemError } = await supabase.from("sales_items").insert([
        {
          sales_order_id: orderData.id,
          color_variant_id: selectedVariant.id,
          quantity: logForm.quantity,
          unit_price: logForm.unit_price,
          amount: logForm.quantity * logForm.unit_price,
        },
      ]);

      if (itemError) {
        alert("建立銷售明細失敗：" + itemError.message);
        return;
      }

      const maxCode = nextClientCode.match(/^C(\d+)$/);
      const newCode = maxCode ? parseInt(maxCode[1]) + 1 : 1;
      setNextClientCode(`C${String(newCode).padStart(3, "0")}`);
    }

    if (isLogSectionExpanded) {
      fetchStockLogs();
    }

    setLogForm({ type: "purchase", quantity: 0, reference: "", customer_name: "", unit_price: 0 });
    setSelectedVariant(null);
    setIsLogModalOpen(false);
    setExpandSaleDetails(false);
  }

  async function deleteStockLog(logId: string, logType: string, quantity: number, variantId: string) {
    if (!confirm("確定要刪除此筆記錄嗎？庫存數量也會一併回復。")) return;

    const supabase = createClient();

    const { error: logError } = await supabase
      .from("stock_logs")
      .delete()
      .eq("id", logId);

    if (logError) {
      alert("刪除失敗：" + logError.message);
      return;
    }

    setStockLogs(stockLogs.filter((log) => log.id !== logId));

    const variant = variants.find((v) => v.id === variantId);
    if (variant) {
      const updateData: Record<string, number> = {};
      if (logType === "purchase") {
        updateData.purchased = variant.purchased - quantity;
      } else if (logType === "defect") {
        updateData.defective = variant.defective - quantity;
      } else if (logType === "sale") {
        updateData.sold = variant.sold - quantity;
      }

      await supabase
        .from("color_variants")
        .update(updateData)
        .eq("id", variantId);

      setVariants(
        variants.map((v) =>
          v.id === variantId ? { ...v, ...updateData } : v
        )
      );
    }
  }

  async function deleteVariant(variantId: string) {
    if (!confirm("確定要刪除此款式嗎？相關的庫存記錄也會一併刪除。")) return;

    const previousVariants = variants;
    setVariants(variants.filter((v) => v.id !== variantId));

    const supabase = createClient();
    const { error } = await supabase
      .from("color_variants")
      .delete()
      .eq("id", variantId);

    if (error) {
      setVariants(previousVariants);
      alert("刪除失敗：" + error.message);
      return;
    }

    setStockLogs(stockLogs.filter((log) => log.color_variant_id !== variantId));
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
      >
        <ArrowLeft size={20} className="mr-1" />
        返回
      </button>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Package className="text-gray-400" size={32} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
            {product.code && (
              <p className="text-gray-500 mt-1">編號：{product.code}</p>
            )}
            <div className="flex gap-4 mt-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">
                  {totalStats.purchased}
                </p>
                <p className="text-xs text-gray-500">進貨</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {totalStats.defective}
                </p>
                <p className="text-xs text-gray-500">瑕疵</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {totalStats.sold}
                </p>
                <p className="text-xs text-gray-500">已售</p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-bold ${totalStats.available > 0 ? "text-green-600" : "text-red-600"}`}>
                  {totalStats.available}
                </p>
                <p className="text-xs text-gray-500">庫存</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">款式</h2>
          <Button size="sm" onClick={() => {
            setVariantModalMode("add-size");
            setIsVariantModalOpen(true);
          }}>
            <Plus size={16} className="mr-1" />
            新增尺寸
          </Button>
        </div>

        {variants.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            尚無款式資料
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="space-y-4">
              {sizeOrder.map((size) => {
                const isExpanded = expandedSizes.has(size);
                const sizeVariants = variantsBySize[size];
                const sizeStock = sizeVariants.reduce(
                  (sum, v) => sum + (v.purchased - v.defective - v.sold),
                  0
                );
                return (
                  <div key={size} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSize(size)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronDown size={18} className="text-gray-500" />
                        ) : (
                          <ChevronRight size={18} className="text-gray-500" />
                        )}
                        <span className="font-semibold text-gray-900">尺寸：{size}</span>
                        <span className="text-sm text-gray-500">({sizeVariants.length} 色)</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-gray-600">
                          庫存：
                          <span className="font-bold text-green-600">
                            {sizeStock}
                          </span>
                        </span>
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="p-3">
                        <SortableContext
                          items={sizeVariants.map((v) => v.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                            {sizeVariants.map((variant) => (
                              <VariantCard
                                key={variant.id}
                                variant={variant}
                                onPin={handlePinVariant}
                                onLog={(v) => {
                                  setSelectedVariant(v);
                                  setIsLogModalOpen(true);
                                }}
                                onEdit={(v) => {
                                  setEditingVariant(v);
                                  setVariantModalMode("edit");
                                  setIsVariantModalOpen(true);
                                }}
                                onDelete={deleteVariant}
                              />
                            ))}
                          </div>
                        </SortableContext>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSize(size);
                            setVariantModalMode("add-color");
                            setIsVariantModalOpen(true);
                          }}
                          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-orange-400 hover:text-orange-500 transition-colors"
                        >
                          <Plus size={14} className="inline mr-1" />
                          新增顏色
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </DndContext>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={handleToggleLogSection}
          className="w-full flex items-center justify-between mb-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">異動記錄</h2>
          {isLogSectionExpanded ? (
            <ChevronDown size={20} className="text-gray-500" />
          ) : (
            <ChevronRight size={20} className="text-gray-500" />
          )}
        </button>

        {isLogSectionExpanded && (
          <>
            {stockLogsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-500"></div>
              </div>
            ) : stockLogs.length === 0 ? (
              <Card className="p-6 text-center text-gray-500">尚無異動記錄</Card>
            ) : (
              <Card className="divide-y divide-gray-200">
                {stockLogs.map((log) => {
                  const variant = log.color_variant;
                  const isCancelled = log.reference?.includes("取消訂單");
                  const typeConfig = {
                    purchase: {
                      icon: TrendingUp,
                      color: isCancelled ? "text-gray-500" : "text-green-600",
                      bg: isCancelled ? "bg-gray-100" : "bg-green-50",
                      label: "進貨",
                    },
                    defect: {
                      icon: AlertTriangle,
                      color: "text-yellow-600",
                      bg: "bg-yellow-50",
                      label: "瑕疵",
                    },
                    sale: {
                      icon: TrendingDown,
                      color: isCancelled ? "text-gray-500" : "text-red-600",
                      bg: isCancelled ? "bg-gray-100" : "bg-red-50",
                      label: isCancelled ? "取消" : "銷售",
                    },
                  };
                  const config = typeConfig[log.type as keyof typeof typeConfig];
                  const Icon = config.icon;

                  return (
                    <div key={log.id} className="p-4 flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${config.bg}`}>
                        <Icon size={16} className={config.color} />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {variant?.color}
                          {variant?.size && ` / ${variant.size}`} - {config.label}
                        </p>
                        {log.reference && (
                          <p className="text-xs text-gray-500">{log.reference}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${config.color}`}>
                          {log.type === "purchase" || isCancelled ? "+" : "-"}
                          {log.quantity}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(log.created_at), "yyyy/MM/dd HH:mm", {
                            locale: zhTW,
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteStockLog(log.id, log.type, log.quantity, log.color_variant_id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </div>
                  );
                })}
              </Card>
            )}
          </>
        )}
      </div>

      <VariantFormModal
        key={`${variantModalMode}-${editingVariant?.id || ""}-${selectedSize || ""}`}
        mode={variantModalMode || "add-size"}
        isOpen={isVariantModalOpen}
        onClose={() => {
          setIsVariantModalOpen(false);
          setVariantModalMode(null);
          setSelectedSize(null);
          setEditingVariant(null);
        }}
        onSubmit={handleVariantSubmit}
        initialValues={
          variantModalMode === "edit" && editingVariant
            ? { color: editingVariant.color, size: editingVariant.size || "均碼" }
            : variantModalMode === "add-color" && selectedSize
            ? { color: "", size: selectedSize }
            : { color: "", size: "" }
        }
        lockedSize={variantModalMode === "add-color" ? selectedSize : null}
      />

      <Modal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setSelectedVariant(null);
          setExpandSaleDetails(false);
        }}
        title={`記錄庫存異動 - ${selectedVariant?.color}${selectedVariant?.size ? ` / ${selectedVariant.size}` : ""}`}
      >
        <form onSubmit={addStockLog} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              異動類型
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: "purchase", label: "進貨", color: "green" },
                { value: "defect", label: "瑕疵", color: "yellow" },
                { value: "sale", label: "銷售", color: "red" },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() =>
                    setLogForm({ ...logForm, type: type.value as "purchase" | "defect" | "sale" })
                  }
                  className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors ${
                    logForm.type === type.value
                      ? type.color === "green"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : type.color === "yellow"
                        ? "border-yellow-500 bg-yellow-50 text-yellow-700"
                        : "border-red-500 bg-red-50 text-red-700"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="數量"
            type="number"
            min="1"
            value={logForm.quantity}
            onChange={(e) =>
              setLogForm({
                ...logForm,
                quantity: parseInt(e.target.value) || 0,
              })
            }
            required
          />

          {logForm.type === "sale" && (
            <div>
              <button
                type="button"
                onClick={() => setExpandSaleDetails(!expandSaleDetails)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span>詳細資訊（客戶、價格）</span>
                {expandSaleDetails ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              </button>
              {expandSaleDetails && (
                <div className="mt-3 space-y-4">
                  <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between">
                    <span className="text-sm text-gray-600">客戶編號</span>
                    <span className="font-mono font-bold text-gray-900">{nextClientCode}</span>
                  </div>
                  <Input
                    label="客戶名稱（選填，留白顯示編號）"
                    value={logForm.customer_name}
                    onChange={(e) => setLogForm({ ...logForm, customer_name: e.target.value })}
                    placeholder="留白將顯示客戶編號"
                  />
                  <Input
                    label="單價"
                    type="number"
                    step="0.01"
                    value={logForm.unit_price}
                    onChange={(e) => setLogForm({ ...logForm, unit_price: parseFloat(e.target.value) || 0 })}
                  />
                  {logForm.quantity > 0 && (
                    <div className="text-right text-sm text-gray-600">
                      小計：<span className="font-bold text-orange-600">${logForm.quantity * logForm.unit_price}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <Input
            label="備註（選填）"
            value={logForm.reference}
            onChange={(e) =>
              setLogForm({ ...logForm, reference: e.target.value })
            }
          />

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                  setIsLogModalOpen(false);
                  setSelectedVariant(null);
                  setExpandSaleDetails(false);
                }}
            >
              取消
            </Button>
            <Button type="submit">記錄</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
