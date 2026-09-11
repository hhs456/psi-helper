import { createClient } from "@/lib/supabase/server";
import { ProductDetailClient } from "@/components/ProductDetailClient";
import { cacheLife } from "next/cache";
import { notFound } from "next/navigation";
import type { Product, ColorVariant } from "@/types";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  "use cache: private";
  cacheLife("minutes");

  const { id: productId } = await params;
  const supabase = await createClient();

  const [productRes, variantsRes, ordersRes] = await Promise.all([
    supabase.from("products").select("*").eq("id", productId).single(),
    supabase
      .from("color_variants")
      .select("*")
      .eq("product_id", productId)
      .order("is_pinned", { ascending: false })
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("sales_orders").select("client_code"),
  ]);

  if (productRes.error || !productRes.data) {
    notFound();
  }

  const maxCode = (ordersRes.data || [])
    .map((o) => {
      const match = o.client_code?.match(/^C(\d+)$/);
      return match ? parseInt(match[1]) : 0;
    })
    .reduce((max, curr) => Math.max(max, curr), 0);

  return (
    <ProductDetailClient
      initialProduct={productRes.data as Product}
      initialVariants={(variantsRes.data || []) as ColorVariant[]}
      initialNextClientCode={`C${String(maxCode + 1).padStart(3, "0")}`}
    />
  );
}
