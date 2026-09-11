"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { compressImage } from "@/lib/image";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Plus, Edit2, Trash2, Package, X, Eye } from "lucide-react";
import type { Product, Supplier, ColorVariant } from "@/types";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    supplier_id: "",
    notes: "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const supabase = createClient();

      const [productsRes, suppliersRes] = await Promise.all([
        supabase
          .from("products")
          .select(`
            *,
            supplier:supplier_id (
              id,
              name
            )
          `)
          .order("created_at", { ascending: false }),
        supabase.from("suppliers").select("*").order("name"),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (suppliersRes.error) throw suppliersRes.error;

      setProducts(productsRes.data || []);
      setSuppliers(suppliersRes.data || []);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  function openModal(product?: Product) {
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
      const { error } = await supabase.from("products").insert([productData]);

      if (error) {
        alert("新增失敗：" + error.message);
        return;
      }
    }

    closeModal();
    fetchData();
  }

  async function handleDelete(id: string) {
    if (!confirm("確定要刪除此商品嗎？")) return;

    const supabase = createClient();
    const { error } = await supabase.from("products").delete().eq("id", id);

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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">商品管理</h1>
        <Button onClick={() => openModal()}>
          <Plus size={16} className="mr-2" />
          新增商品
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500">
          <Package size={48} className="mb-4" />
          <p className="text-lg">尚無商品資料</p>
          <p className="text-sm mt-2">點擊上方按鈕新增第一個商品</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <div className="flex">
                <div className="w-20 h-20 flex-shrink-0 bg-gray-100">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="text-gray-400" size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">
                        {product.name}
                      </h3>
                      {product.code && (
                        <p className="text-xs text-gray-500 mt-0.5">{product.code}</p>
                      )}
                      {(product as any).supplier?.name && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(product as any).supplier.name}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Link
                        href={`/products/${product.id}`}
                        className="p-1 rounded hover:bg-gray-100"
                      >
                        <Eye size={14} className="text-blue-600" />
                      </Link>
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
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
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
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg"
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
    </div>
  );
}
