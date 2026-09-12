"use client";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSWRConfig } from "swr";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProductCard } from "@/components/ui/ProductCard";
import { useImageUpload } from "@/lib/useImageUpload";
import { DndContext, closestCorners } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortableList } from "@/lib/useSortableList";
import { usePin } from "@/lib/usePin";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Warehouse,
  Plus,
  X,
  Search,
  Pin,
  PinOff,
  Loader2,
} from "lucide-react";
import type { Supplier, Product } from "@/types";

interface ProductWithVariants extends Product {
  variants: {
    id: string;
    color: string;
    size: string | null;
    purchased: number;
    defective: number;
    sold: number;
  }[];
}

export default function SupplierDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { mutate: globalMutate } = useSWRConfig();
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", contact: "", notes: "" });
  const [productForm, setProductForm] = useState({ name: "", code: "", notes: "" });
  const [isProductEdit, setIsProductEdit] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const { imageFile, imagePreview, handleImageChange, uploadImage, clearImage, setImagePreviewFromUrl, deleteImage } = useImageUpload();

  useEffect(() => {
    if (supplierId) {
      fetchData();
    }
  }, [supplierId]);

  const { sensors, handleDragEnd } = useSortableList({
    items: products,
    tableName: "products",
    onReorder: (newProducts) => setProducts(newProducts),
    revalidate: fetchData,
  });

  const { handlePin } = usePin({
    items: products,
    tableName: "products",
    onUpdate: (updatedProducts) => setProducts(updatedProducts),
  });

  async function fetchData() {
    try {
      const supabase = createClient();

      const [supplierRes, productsRes] = await Promise.all([
        supabase.from("suppliers").select("*").eq("id", supplierId).single(),
        supabase
          .from("products")
          .select(`
            *,
            variants:color_variants (
              id,
              color,
              size,
              purchased,
              defective,
              sold
            )
          `)
          .eq("supplier_id", supplierId)
          .order("is_pinned", { ascending: false })
          .order("sort_order", { ascending: false })
          .order("created_at", { ascending: true }),
      ]);

      if (supplierRes.error) throw supplierRes.error;
      if (productsRes.error) throw productsRes.error;

      setSupplier(supplierRes.data);
      setProducts(productsRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  function openEditModal() {
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact: supplier.contact || "",
        notes: supplier.notes || "",
      });
      setIsEditModalOpen(true);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    const { error } = await supabase
      .from("suppliers")
      .update(formData)
      .eq("id", supplierId);

    if (error) {
      alert("更新失敗：" + error.message);
      return;
    }

    setIsEditModalOpen(false);
    fetchData();
  }

  async function handleDelete() {
    if (!confirm("確定要刪除此供應商嗎？相關的商品也會一併刪除。")) return;

    const supabase = createClient();

    const { data: productsData } = await supabase
      .from("products")
      .select("image_url")
      .eq("supplier_id", supplierId);

    if (productsData) {
      for (const p of productsData) {
        await deleteImage(p.image_url);
      }
    }

    const { error } = await supabase.from("suppliers").delete().eq("id", supplierId);

    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }

    globalMutate((key) => Array.isArray(key) && key[0] === "products");
    router.push("/suppliers");
  }

  function openAddProductModal() {
    setProductForm({ name: "", code: "", notes: "" });
    clearImage();
    setIsProductEdit(false);
    setEditingProductId(null);
    setIsAddProductModalOpen(true);
  }

  function closeAddProductModal() {
    setIsAddProductModalOpen(false);
    setProductForm({ name: "", code: "", notes: "" });
    clearImage();
    setIsProductEdit(false);
    setEditingProductId(null);
  }

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    let imageUrl = imagePreview;
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const maxOrder = Math.max(...products.map((p) => p.sort_order), 0);

    const { error } = await supabase.from("products").insert([
      {
        name: productForm.name,
        code: productForm.code || null,
        notes: productForm.notes || null,
        image_url: imageUrl,
        supplier_id: supplierId,
        sort_order: maxOrder + 1,
      },
    ]);

    if (error) {
      alert("新增商品失敗：" + error.message);
      return;
    }

    closeAddProductModal();
    fetchData();
  }

  function openEditProductModal(product: Product) {
    setProductForm({
      name: product.name,
      code: product.code || "",
      notes: product.notes || "",
    });
    setImagePreviewFromUrl(product.image_url || null);
    setIsProductEdit(true);
    setEditingProductId(product.id);
    setIsAddProductModalOpen(true);
  }

  async function handleUpdateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!editingProductId) return;
    const supabase = createClient();

    let imageUrl = imagePreview;
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const { error } = await supabase
      .from("products")
      .update({
        name: productForm.name,
        code: productForm.code || null,
        notes: productForm.notes || null,
        image_url: imageUrl,
      })
      .eq("id", editingProductId);

    if (error) {
      alert("更新商品失敗：" + error.message);
      return;
    }

    closeAddProductModal();
    fetchData();
  }

  async function handleDeleteProduct(productId: string) {
    if (!confirm("確定要刪除此商品嗎？")) return;

    const product = products.find((p) => p.id === productId);
    if (product?.image_url) {
      await deleteImage(product.image_url);
    }

    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", productId);

    if (error) {
      alert("刪除商品失敗：" + error.message);
      return;
    }

    globalMutate((key) => Array.isArray(key) && key[0] === "products");
    fetchData();
  }

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const query = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.code && p.code.toLowerCase().includes(query))
    );
  }, [products, searchQuery]);

  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => {
    const variants = p.variants || [];
    return (
      sum +
      variants.reduce(
        (vSum, v) => vSum + (v.purchased - v.defective - v.sold),
        0
      )
    );
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <Warehouse size={48} className="mb-4" />
        <p>找不到供應商</p>
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

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
            {supplier.contact && (
              <p className="text-gray-600 mt-2">聯絡方式：{supplier.contact}</p>
            )}
            {supplier.notes && (
              <p className="text-gray-600 mt-1">備註：{supplier.notes}</p>
            )}
            <div className="flex gap-6 mt-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-900">{totalProducts}</p>
                <p className="text-xs text-gray-500">商品數量</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{totalStock}</p>
                <p className="text-xs text-gray-500">總庫存</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={openEditModal}>
              <Edit2 size={16} />
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">商品列表</h2>
          <Button size="sm" onClick={openAddProductModal}>
            <Plus size={16} className="mr-1" />
            新增商品
          </Button>
        </div>

        {products.length > 0 && (
          <div className="mb-4">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="搜尋商品名稱或編號..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>
        )}

        {products.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            此供應商尚無商品
          </Card>
        ) : filteredProducts.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            找不到符合條件的商品
          </Card>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredProducts.map((p) => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => {
                  const variants = product.variants || [];
                  return (
                    <ProductCard
                      key={product.id}
                      product={{
                        ...product,
                        variants: variants.map((v) => ({
                          color: v.color,
                          size: v.size,
                          available: v.purchased - v.defective - v.sold,
                        })),
                      }}
                      isSortable
                      showVariants
                      actions={
                        <>
                          <button
                            onClick={() => handlePin(product.id, product.is_pinned)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            title={product.is_pinned ? "取消釘選" : "釘選"}
                          >
                            {product.is_pinned ? (
                              <PinOff size={14} className="text-orange-500" />
                            ) : (
                              <Pin size={14} className="text-gray-400" />
                            )}
                          </button>
                          <button
                            onClick={() => openEditProductModal(product)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                          >
                            <Edit2 size={14} className="text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} className="text-red-500" />
                          </button>
                        </>
                      }
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="編輯供應商"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <Input
            label="供應商名稱"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <Input
            label="聯絡方式"
            value={formData.contact}
            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備註
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              取消
            </Button>
            <Button type="submit">更新</Button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isAddProductModalOpen}
        onClose={closeAddProductModal}
        title={isProductEdit ? "編輯商品" : "新增商品"}
      >
        <form onSubmit={isProductEdit ? handleUpdateProduct : handleAddProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商品圖片
            </label>
            <div className="flex items-center gap-4">
              {imagePreview && (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={clearImage}
                    className="absolute -top-2 -right-2 p-1 bg-white rounded-full shadow-md hover:bg-gray-100"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="text-sm"
              />
            </div>
          </div>

          <Input
            label="商品名稱"
            value={productForm.name}
            onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
            required
          />

          <Input
            label="商品編號"
            value={productForm.code}
            onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備註
            </label>
            <textarea
              value={productForm.notes}
              onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex gap-2 justify-between pt-4">
            {isProductEdit ? (
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (editingProductId) handleDeleteProduct(editingProductId);
                }}
              >
                <Trash2 size={16} />
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={closeAddProductModal}>
                取消
              </Button>
              <Button type="submit">{isProductEdit ? "更新" : "新增"}</Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
