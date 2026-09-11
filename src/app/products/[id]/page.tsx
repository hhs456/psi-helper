"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
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
} from "lucide-react";
import { format } from "date-fns";
import { zhTW } from "date-fns/locale";
import type { Product, ColorVariant, StockLog } from "@/types";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<ColorVariant[]>([]);
  const [stockLogs, setStockLogs] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [isAddColorModalOpen, setIsAddColorModalOpen] = useState(false);
  const [isAddSizeModalOpen, setIsAddSizeModalOpen] = useState(false);
  const [isEditVariantModalOpen, setIsEditVariantModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ColorVariant | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [editingVariant, setEditingVariant] = useState<ColorVariant | null>(null);

  const [colorForm, setColorForm] = useState({ color: "", size: "" });
  const [sizeForm, setSizeForm] = useState({ size: "", color: "" });
  const [editForm, setEditForm] = useState({ color: "", size: "" });
  const [logForm, setLogForm] = useState({
    type: "purchase" as "purchase" | "defect" | "sale",
    quantity: 0,
    reference: "",
    customer_name: "",
    unit_price: 0,
  });
  const [nextClientCode, setNextClientCode] = useState("");
  const [expandedSizes, setExpandedSizes] = useState<Set<string>>(new Set());

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

  const variantsBySize = variants.reduce<Record<string, ColorVariant[]>>((acc, v) => {
    const size = v.size || "均碼";
    if (!acc[size]) acc[size] = [];
    acc[size].push(v);
    return acc;
  }, {});

  const sizeOrder = Object.keys(variantsBySize).sort((a, b) => {
    if (a === "均碼") return 1;
    if (b === "均碼") return -1;
    return a.localeCompare(b, "zh-Hant-TW");
  });

  const availableSizes = ["XS", "S", "M", "L", "XL", "2L", "3L", "4L", "均碼"];

  useEffect(() => {
    if (productId) {
      fetchData();
    }
  }, [productId]);

  async function fetchData() {
    try {
      const supabase = createClient();

      const [productRes, variantsRes, ordersRes] = await Promise.all([
        supabase.from("products").select("*").eq("id", productId).single(),
        supabase
          .from("color_variants")
          .select("*")
          .eq("product_id", productId)
          .order("created_at", { ascending: true }),
        supabase.from("sales_orders").select("client_code"),
      ]);

      if (productRes.error) throw productRes.error;
      if (variantsRes.error) throw variantsRes.error;
      if (ordersRes.error) throw ordersRes.error;

      setProduct(productRes.data);
      setVariants(variantsRes.data || []);

      const variantIds = (variantsRes.data || []).map((v) => v.id);
      let logsRes;
      if (variantIds.length > 0) {
        logsRes = await supabase
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
      } else {
        logsRes = { data: [], error: null };
      }

      if (logsRes.error) throw logsRes.error;
      setStockLogs(logsRes.data || []);

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

  async function addColor(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    const { error } = await supabase.from("color_variants").insert([
      {
        product_id: productId,
        color: colorForm.color,
        size: colorForm.size || null,
      },
    ]);

    if (error) {
      alert("新增失敗：" + error.message);
      return;
    }

    setColorForm({ color: "", size: "" });
    setIsAddColorModalOpen(false);
    setSelectedSize(null);
    fetchData();
  }

  async function addSize(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    const insertData: { product_id: string; color: string; size: string | null }[] = [];
    
    if (sizeForm.color) {
      insertData.push({
        product_id: productId,
        color: sizeForm.color,
        size: sizeForm.size || null,
      });
    }

    if (insertData.length > 0) {
      const { error } = await supabase.from("color_variants").insert(insertData);
      if (error) {
        alert("新增失敗：" + error.message);
        return;
      }
    }

    setSizeForm({ size: "", color: "" });
    setIsAddSizeModalOpen(false);
    fetchData();
  }

  async function addStockLog(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVariant) return;

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

    const updateData: any = {};
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
    }

    setLogForm({ type: "purchase", quantity: 0, reference: "", customer_name: "", unit_price: 0 });
    setSelectedVariant(null);
    setIsLogModalOpen(false);
    fetchData();
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
    }

    fetchData();
  }

  async function editVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!editingVariant) return;

    const supabase = createClient();

    const { error } = await supabase
      .from("color_variants")
      .update({
        color: editForm.color,
        size: editForm.size || null,
      })
      .eq("id", editingVariant.id);

    if (error) {
      alert("更新失敗：" + error.message);
      return;
    }

    setEditingVariant(null);
    setEditForm({ color: "", size: "" });
    setIsEditVariantModalOpen(false);
    fetchData();
  }

  async function deleteVariant(variantId: string) {
    if (!confirm("確定要刪除此款式嗎？相關的庫存記錄也會一併刪除。")) return;

    const supabase = createClient();
    const { error } = await supabase
      .from("color_variants")
      .delete()
      .eq("id", variantId);

    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }

    fetchData();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Package size={48} className="mb-4" />
        <p>找不到商品</p>
      </div>
    );
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

      {/* Product Header */}
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
                  {variants.reduce((sum, v) => sum + v.purchased, 0)}
                </p>
                <p className="text-xs text-gray-500">進貨</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {variants.reduce((sum, v) => sum + v.defective, 0)}
                </p>
                <p className="text-xs text-gray-500">瑕疵</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">
                  {variants.reduce((sum, v) => sum + v.sold, 0)}
                </p>
                <p className="text-xs text-gray-500">已售</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {variants.reduce(
                    (sum, v) => sum + (v.purchased - v.defective - v.sold),
                    0
                  )}
                </p>
                <p className="text-xs text-gray-500">庫存</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Color Variants by Size */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">款式</h2>
          <Button size="sm" onClick={() => setIsAddSizeModalOpen(true)}>
            <Plus size={16} className="mr-1" />
            新增尺寸
          </Button>
        </div>

        {variants.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            尚無款式資料
          </Card>
        ) : (
          <div className="space-y-4">
            {sizeOrder.map((size) => {
              const isExpanded = expandedSizes.has(size);
              const sizeVariants = variantsBySize[size];
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
                          {sizeVariants.reduce((sum, v) => sum + (v.purchased - v.defective - v.sold), 0)}
                        </span>
                      </span>
                    </div>
                  </button>
                  {isExpanded && (
                    <div className="p-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-3">
                        {sizeVariants.map((variant) => {
                          const available = variant.purchased - variant.defective - variant.sold;
                          return (
                            <Card key={variant.id} className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="font-semibold text-gray-900">
                                  {variant.color}
                                </h3>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => {
                                      setSelectedVariant(variant);
                                      setIsLogModalOpen(true);
                                    }}
                                  >
                                    記錄
                                  </Button>
                                  <button
                                    onClick={() => {
                                      setEditingVariant(variant);
                                      setEditForm({
                                        color: variant.color,
                                        size: variant.size || "",
                                      });
                                      setIsEditVariantModalOpen(true);
                                    }}
                                    className="p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                                  >
                                    <Edit2 size={14} className="text-blue-500" />
                                  </button>
                                  <button
                                    onClick={() => deleteVariant(variant.id)}
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
                                  <p className="text-lg font-bold text-yellow-600">
                                    {variant.defective}
                                  </p>
                                  <p className="text-xs text-gray-500">瑕疵</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-red-600">
                                    {variant.sold}
                                  </p>
                                  <p className="text-xs text-gray-500">已售</p>
                                </div>
                                <div>
                                  <p
                                    className={`text-lg font-bold ${
                                      available > 0 ? "text-green-600" : "text-red-600"
                                    }`}
                                  >
                                    {available}
                                  </p>
                                  <p className="text-xs text-gray-500">庫存</p>
                                </div>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSize(size);
                          setColorForm({ color: "", size: size === "均碼" ? "" : size });
                          setIsAddColorModalOpen(true);
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
        )}
      </div>

      {/* Stock Logs */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">異動記錄</h2>

        {stockLogs.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">尚無異動記錄</Card>
        ) : (
          <Card className="divide-y divide-gray-200">
            {stockLogs.map((log) => {
              const variant = log.color_variant as any;
              const typeConfig = {
                purchase: {
                  icon: TrendingUp,
                  color: "text-green-600",
                  bg: "bg-green-50",
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
                  color: "text-red-600",
                  bg: "bg-red-50",
                  label: "銷售",
                },
              };
              const config = typeConfig[log.type];
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
                      {log.type === "purchase" ? "+" : "-"}
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
      </div>

      {/* Add Color Modal */}
      <Modal
        isOpen={isAddColorModalOpen}
        onClose={() => {
          setIsAddColorModalOpen(false);
          setSelectedSize(null);
          setColorForm({ color: "", size: "" });
        }}
        title={`新增顏色${selectedSize ? ` - 尺寸：${selectedSize}` : ""}`}
      >
        <form onSubmit={addColor} className="space-y-4">
          <Input
            label="顏色"
            value={colorForm.color}
            onChange={(e) =>
              setColorForm({ ...colorForm, color: e.target.value })
            }
            required
          />
          <Input
            label="尺寸"
            value={colorForm.size}
            onChange={(e) =>
              setColorForm({ ...colorForm, size: e.target.value })
            }
            placeholder="例如：S、M、L、均碼"
          />
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddColorModalOpen(false);
                setSelectedSize(null);
                setColorForm({ color: "", size: "" });
              }}
            >
              取消
            </Button>
            <Button type="submit">新增</Button>
          </div>
        </form>
      </Modal>

      {/* Add Size Modal */}
      <Modal
        isOpen={isAddSizeModalOpen}
        onClose={() => {
          setIsAddSizeModalOpen(false);
          setSizeForm({ size: "", color: "" });
        }}
        title="新增尺寸"
      >
        <form onSubmit={addSize} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              尺寸
            </label>
            <select
              value={sizeForm.size}
              onChange={(e) => setSizeForm({ ...sizeForm, size: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              required
            >
              <option value="">選擇尺寸</option>
              {availableSizes.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <Input
            label="顏色（選填，可後續新增）"
            value={sizeForm.color}
            onChange={(e) => setSizeForm({ ...sizeForm, color: e.target.value })}
            placeholder="例如：紅色、藍色"
          />
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsAddSizeModalOpen(false);
                setSizeForm({ size: "", color: "" });
              }}
            >
              取消
            </Button>
            <Button type="submit">新增</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Variant Modal */}
      <Modal
        isOpen={isEditVariantModalOpen}
        onClose={() => {
          setIsEditVariantModalOpen(false);
          setEditingVariant(null);
          setEditForm({ color: "", size: "" });
        }}
        title="編輯款式"
      >
        <form onSubmit={editVariant} className="space-y-4">
          <Input
            label="顏色"
            value={editForm.color}
            onChange={(e) => setEditForm({ ...editForm, color: e.target.value })}
            required
          />
          <Input
            label="尺寸"
            value={editForm.size}
            onChange={(e) => setEditForm({ ...editForm, size: e.target.value })}
            placeholder="例如：S、M、L、均碼"
          />
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsEditVariantModalOpen(false);
                setEditingVariant(null);
                setEditForm({ color: "", size: "" });
              }}
            >
              取消
            </Button>
            <Button type="submit">更新</Button>
          </div>
        </form>
      </Modal>

      {/* Add Stock Log Modal */}
      <Modal
        isOpen={isLogModalOpen}
        onClose={() => {
          setIsLogModalOpen(false);
          setSelectedVariant(null);
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
                    setLogForm({ ...logForm, type: type.value as any })
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
            <>
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
            </>
          )}

          <Input
            label="備註/參考（選填）"
            value={logForm.reference}
            onChange={(e) =>
              setLogForm({ ...logForm, reference: e.target.value })
            }
            placeholder={logForm.type === "sale" ? "例如：蝦皮訂單號" : "例如：供應商名稱"}
          />

          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsLogModalOpen(false);
                setSelectedVariant(null);
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
