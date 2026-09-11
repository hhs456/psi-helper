import { createClient } from "@/lib/supabase/server";
import { SalesClient } from "@/components/SalesClient";
import type { SalesOrder, Product, ColorVariant } from "@/types";

type VariantWithProduct = ColorVariant & { product_name: string };

export default async function SalesPage() {
  const supabase = await createClient();

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
    console.error("Error fetching sales data:", ordersRes.error || productsRes.error || variantsRes.error);
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">銷售記錄</h1>
        <div className="text-red-500">載入失敗</div>
      </div>
    );
  }

  const orders = (ordersRes.data || []) as SalesOrder[];
  const products = (productsRes.data || []) as Product[];
  const variantsWithProductName = (variantsRes.data || []).map((v: {
    id: string;
    product_id: string;
    color: string;
    size: string | null;
    purchased: number;
    defective: number;
    sold: number;
    product: { id: string; name: string } | null;
  }) => ({
    id: v.id,
    product_id: v.product_id,
    color: v.color,
    size: v.size,
    purchased: v.purchased,
    defective: v.defective,
    sold: v.sold,
    created_at: "",
    product_name: v.product?.name || "",
  })) as VariantWithProduct[];

  const maxCode = orders
    .map((o) => {
      const match = o.client_code?.match(/^C(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .reduce((max, curr) => Math.max(max, curr), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">銷售記錄</h1>
      <SalesClient
        initialOrders={orders}
        initialProducts={products}
        initialVariants={variantsWithProductName}
        initialNextClientCode={`C${String(maxCode + 1).padStart(3, "0")}`}
      />
    </div>
  );
}
