"use client";

import { useState } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ProductCard } from "@/components/ui/ProductCard";
import { Plus, Edit2, Trash2, Package, X, Pin, PinOff, Search, Loader2 } from "lucide-react";
import { DndContext, closestCorners, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useProducts } from "@/lib/hooks";
import { useSortableList } from "@/lib/useSortableList";
import { usePin } from "@/lib/usePin";
import { useImageUpload } from "@/lib/useImageUpload";
import { Pagination } from "@/components/ui/Pagination";
import type { Product, Supplier } from "@/types";

type ProductWithSupplier = Omit<Product, "supplier"> & {
  supplier: Supplier | null;
  variants?: {
    color: string;
    size: string | null;
    purchased: number;
    defective: number;
    sold: number;
  }[];
};

export function ProductsClient({ pageSize }: { pageSize: number }) {
  const searchParams = useSearchParams();
  const currentPage = parseInt(searchParams.get("page") || "1");
  const { products, suppliers, totalPages, isLoading, error, mutate } = useProducts(currentPage, pageSize);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithSupplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    supplier_id: "",
    notes: "",
  });
  const [searchQuery, setSearchQuery] = useState("");
  const { imageFile, imagePreview, handleImageChange, uploadImage, clearImage, setImagePreviewFromUrl, deleteImage } = useImageUpload();

  const { sensors, handleDragEnd: handleSortableDragEnd } = useSortableList({
    items: products,
    tableName: "products",
    onReorder: (newProducts) => mutate({ products: newProducts, suppliers, totalPages }, { revalidate: false }),
    revalidate: mutate,
  });

  const { handlePin } = usePin({
    items: products,
    tableName: "products",
    onUpdate: (newProducts) => mutate({ products: newProducts, suppliers, totalPages }, { revalidate: false }),
  });

  async function handleDragEnd(event: DragEndEvent) {
    await handleSortableDragEnd(event);
  }

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

  function openModal(product?: ProductWithSupplier) {
    if (product) {
      setEditingProduct(product);
      setFormData({
        name: product.name,
        code: product.code || "",
        supplier_id: product.supplier_id,
        notes: product.notes || "",
      });
      setImagePreviewFromUrl(product.image_url);
    } else {
      setEditingProduct(null);
      setFormData({ name: "", code: "", supplier_id: "", notes: "" });
      clearImage();
    }
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ name: "", code: "", supplier_id: "", notes: "" });
    clearImage();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    let imageUrl = imagePreview;
    if (imageFile) {
      const uploadedUrl = await uploadImage();
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const productData = {
      ...formData,
      image_url: imageUrl,
      supplier_id: formData.supplier_id || null,
    };

    if (editingProduct) {
      const { error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", editingProduct.id);

      if (error) {
        alert("更新失敗：" + error.message);
        return;
      }
    } else {
      const maxOrder = Math.max(...products.map((p) => p.sort_order), 0);
      const { error } = await supabase.from("products").insert([{
        ...productData,
        sort_order: maxOrder + 1,
      }]);

      if (error) {
        alert("新增失敗：" + error.message);
        return;
      }
    }

    closeModal();
    await mutate();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除此商品嗎？")) return;

    const product = products.find((p) => p.id === id);
    if (product?.image_url) {
      await deleteImage(product.image_url);
    }

    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }

    await mutate();
  }

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(query) ||
      (product.code && product.code.toLowerCase().includes(query))
    );
  });

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <Button onClick={() => openModal()}>
          <Plus size={16} className="mr-2" />
          新增商品
        </Button>
      </div>

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

      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Package size={48} className="mb-4" />
          <p className="text-lg">{products.length === 0 ? "尚無商品資料" : "找不到符合條件的商品"}</p>
          {products.length === 0 && (
            <p className="text-sm mt-2">點擊上方按鈕新增第一個商品</p>
          )}
        </div>
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
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={{
                    ...product,
                    supplier_name: product.supplier?.name,
                    variants: product.variants?.map((v) => ({
                      color: v.color,
                      size: v.size,
                      available: v.purchased - v.defective - v.sold,
                    })),
                  }}
                  isSortable
                  showVariants
                  showSupplier
                  actions={
                    <>
                      <button
                        onClick={() => handlePin(product.id, product.is_pinned)}
                        className="p-1 rounded hover:bg-gray-100"
                        title={product.is_pinned ? "取消釘選" : "釘選"}
                      >
                        {product.is_pinned ? (
                          <PinOff size={14} className="text-orange-500" />
                        ) : (
                          <Pin size={14} className="text-gray-400" />
                        )}
                      </button>
                      <button
                        onClick={() => openModal(product)}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <Edit2 size={14} className="text-gray-600" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-1 rounded hover:bg-red-50"
                      >
                        <Trash2 size={14} className="text-red-500" />
                      </button>
                    </>
                  }
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingProduct ? "編輯商品" : "新增商品"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商品圖片
            </label>
            <div className="flex items-center gap-4">
              {imagePreview && (
                <div className="relative">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    width={80}
                    height={80}
                    className="object-cover rounded-lg"
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
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="商品編號"
            value={formData.code}
            onChange={(e) => setFormData({ ...formData, code: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              供應商
            </label>
            <select
              value={formData.supplier_id}
              onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">選擇供應商</option>
              {suppliers.map((supplier) => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              備註
            </label>
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
            <Button type="submit">{editingProduct ? "更新" : "新增"}</Button>
          </div>
        </form>
      </Modal>
      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/products" />
    </>
  );
}
