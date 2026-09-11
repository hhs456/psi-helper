"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/browser";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Warehouse,
  Package,
  Plus,
  X,
} from "lucide-react";
import { compressImage } from "@/lib/image";
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
  const supplierId = params.id as string;

  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [products, setProducts] = useState<ProductWithVariants[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", contact: "", notes: "" });
  const [productForm, setProductForm] = useState({ name: "", code: "", notes: "" });
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (supplierId) {
      fetchData();
    }
  }, [supplierId]);

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
          .order("created_at", { ascending: false }),
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
      .update({
        ...formData,
        sort_order: supplier?.sort_order ?? 0,
        is_pinned: supplier?.is_pinned ?? false,
      })
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
    const { error } = await supabase.from("suppliers").delete().eq("id", supplierId);

    if (error) {
      alert("刪除失敗：" + error.message);
      return;
    }

    router.push("/suppliers");
  }

  function openAddProductModal() {
    setProductForm({ name: "", code: "", notes: "" });
    setProductImageFile(null);
    setProductImagePreview(null);
    setIsAddProductModalOpen(true);
  }

  function closeAddProductModal() {
    setIsAddProductModalOpen(false);
    setProductForm({ name: "", code: "", notes: "" });
    setProductImageFile(null);
    setProductImagePreview(null);
  }

  function handleProductImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setProductImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setProductImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  async function uploadProductImage(): Promise<string | null> {
    if (!productImageFile) return null;

    const supabase = createClient();

    let fileToUpload: Blob = productImageFile;
    try {
      fileToUpload = await compressImage(productImageFile, {
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

  async function handleAddProduct(e: React.FormEvent) {
    e.preventDefault();
    const supabase = createClient();

    let imageUrl = productImagePreview;
    if (productImageFile) {
      const uploadedUrl = await uploadProductImage();
      if (uploadedUrl) imageUrl = uploadedUrl;
    }

    const { error } = await supabase.from("products").insert([
      {
        name: productForm.name,
        code: productForm.code || null,
        notes: productForm.notes || null,
        image_url: imageUrl,
        supplier_id: supplierId,
      },
    ]);

    if (error) {
      alert("新增商品失敗：" + error.message);
      return;
    }

    closeAddProductModal();
    fetchData();
  }

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
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
              <Edit2 size={16} className="mr-1" />
              編輯
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 size={16} className="mr-1" />
              刪除
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

        {products.length === 0 ? (
          <Card className="p-6 text-center text-gray-500">
            此供應商尚無商品
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => {
              const variants = product.variants || [];
              const stock = variants.reduce(
                (sum, v) => sum + (v.purchased - v.defective - v.sold),
                0
              );
              return (
                <Link key={product.id} href={`/products/${product.id}`}>
                  <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
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
                        <h3 className="font-semibold text-gray-900 text-sm">
                          {product.name}
                        </h3>
                        {product.code && (
                          <p className="text-xs text-gray-500 mt-0.5">{product.code}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="text-gray-500">{variants.length} 款</span>
                          <span className={stock > 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                            庫存：{stock}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
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
        title="新增商品"
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              商品圖片
            </label>
            <div className="flex items-center gap-4">
              {productImagePreview && (
                <div className="relative">
                  <img
                    src={productImagePreview}
                    alt="Preview"
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setProductImagePreview(null);
                      setProductImageFile(null);
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
                onChange={handleProductImageChange}
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

          <div className="flex gap-2 justify-end pt-4">
            <Button type="button" variant="secondary" onClick={closeAddProductModal}>
              取消
            </Button>
            <Button type="submit">新增</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
