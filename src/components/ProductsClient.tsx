"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Edit2, Trash2, Package, X, Pin, PinOff, GripVertical, Search, Loader2 } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useProducts } from "@/lib/hooks";
import { Pagination } from "@/components/ui/Pagination";
import type { Product, Supplier } from "@/types";

type ProductWithSupplier = Omit<Product, "supplier"> & {
  supplier: Supplier | null;
};

function SortableProductCard({
  product,
  onPin,
  onEdit,
  onDelete,
}: {
  product: ProductWithSupplier;
  onPin: (id: string, isPinned: boolean) => void;
  onEdit: (product: ProductWithSupplier) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: product.id,
    data: { isPinned: product.is_pinned },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden ${product.is_pinned ? "ring-2 ring-orange-400 bg-orange-50" : ""}`}
    >
      <div className="flex">
        <div
          className="w-8 flex-shrink-0 flex items-center justify-center bg-gray-50 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 hover:bg-gray-100 touch-none"
          title="拖曳排序"
          {...attributes}
          {...listeners}
        >
          <GripVertical size={16} />
        </div>
        <Link href={`/products/${product.id}`} className="w-20 h-20 flex-shrink-0 bg-gray-100 block relative">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="text-gray-400" size={24} />
            </div>
          )}
        </Link>
        <div className="flex-1 p-3">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 text-sm">
                {product.name}
              </h3>
              {product.code && (
                <p className="text-xs text-gray-500 mt-0.5">{product.code}</p>
              )}
              {product.supplier?.name && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {product.supplier.name}
                </p>
              )}
            </div>
            <div className="flex gap-1">
              <button
                onClick={() => onPin(product.id, product.is_pinned)}
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
                onClick={() => onEdit(product)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <Edit2 size={14} className="text-gray-600" />
              </button>
              <button
                onClick={() => onDelete(product.id)}
                className="p-1 rounded hover:bg-red-50"
              >
                <Trash2 size={14} className="text-red-500" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

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
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      setImagePreview(product.image_url);
    } else {
      setEditingProduct(null);
      setFormData({ name: "", code: "", supplier_id: "", notes: "" });
      setImagePreview(null);
    }
    setImageFile(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingProduct(null);
    setFormData({ name: "", code: "", supplier_id: "", notes: "" });
    setImageFile(null);
    setImagePreview(null);
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function uploadImage(): Promise<string | null> {
    if (!imageFile) return null;

    const supabase = createClient();

    let fileToUpload: Blob = imageFile;
    try {
      fileToUpload = await compressImage(imageFile, {
        maxWidth: 1200,
        maxHeight: 1200,
        quality: 0.8,
      });
    } catch (err) {
      console.warn("Image compression failed, using original:", err);
    }

    const fileName = `${Date.now()}.jpg`;
    const filePath = `${fileName}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(filePath, fileToUpload, {
        contentType: "image/jpeg",
      });

    if (error) {
      alert("圖片上傳失敗：" + error.message);
      return null;
    }

    const { data } = supabase.storage.from("product-images").getPublicUrl(filePath);
    return data.publicUrl;
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

    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }

    await mutate();
  }

  async function handlePin(id: string, currentIsPinned: boolean) {
    const supabase = createClient();

    const updateData: Record<string, boolean | number> = {
      is_pinned: !currentIsPinned,
    };
    if (!currentIsPinned) {
      const maxOrder = Math.max(...products.map((p) => p.sort_order), 0);
      updateData.sort_order = maxOrder + 1;
    }

    const { error } = await supabase
      .from("products")
      .update(updateData)
      .eq("id", id);

    if (error) {
      alert("操作失敗：" + error.message);
      return;
    }

    await mutate();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeItem = products.find((p) => p.id === active.id);
    const overItem = products.find((p) => p.id === over.id);

    if (!activeItem || !overItem) return;

    if (activeItem.is_pinned !== overItem.is_pinned) return;

    const oldIndex = products.findIndex((p) => p.id === active.id);
    const newIndex = products.findIndex((p) => p.id === over.id);

    const newProducts = arrayMove(products, oldIndex, newIndex);

    const supabase = createClient();
    const pinnedGroup = newProducts.filter((p) => p.is_pinned);
    const unpinnedGroup = newProducts.filter((p) => !p.is_pinned);

    const updates = [...pinnedGroup, ...unpinnedGroup].map((item, idx) => ({
      id: item.id,
      sort_order: newProducts.length - idx,
    }));

    const { error } = await supabase.rpc("batch_update_sort_order", {
      p_table_name: "products",
      p_items: updates,
    });

    if (error) {
      console.error("排序更新失敗:", error);
    } else {
      await mutate();
    }
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
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredProducts.map((p) => p.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <SortableProductCard
                  key={product.id}
                  product={product}
                  onPin={handlePin}
                  onEdit={openModal}
                  onDelete={handleDelete}
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
                    onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                    }}
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
