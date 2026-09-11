import { createClient } from "@/lib/supabase/server";
import { ProductsClient } from "@/components/ProductsClient";
import type { Product, Supplier } from "@/types";

type ProductWithSupplier = Omit<Product, "supplier"> & {
  supplier: Supplier | null;
};

export default async function ProductsPage() {
  const supabase = await createClient();

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
      .order("is_pinned", { ascending: false })
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("suppliers").select("*").order("name"),
  ]);

  if (productsRes.error) {
    console.error("Error fetching products:", productsRes.error);
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">商品管理</h1>
        <div className="text-red-500">載入失敗：{productsRes.error.message}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">商品管理</h1>
      <ProductsClient
        initialProducts={(productsRes.data || []) as ProductWithSupplier[]}
        initialSuppliers={(suppliersRes.data || []) as Supplier[]}
      />
    </div>
  );
}
