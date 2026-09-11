import { createClient } from "@/lib/supabase/server";
import { HomeClient } from "@/components/HomeClient";
import { Pagination } from "@/components/ui/Pagination";
import { cacheLife } from "next/cache";
import type { InventorySummary } from "@/types";

const PAGE_SIZE = 20;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  "use cache: private";
  cacheLife("minutes");

  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page);
  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const supabase = await createClient();

  const [variantsRes, countRes] = await Promise.all([
    supabase
      .from("color_variants")
      .select(`
        id,
        color,
        size,
        purchased,
        defective,
        sold,
        product:product_id (
          id,
          name,
          code,
          image_url,
          supplier:supplier_id (
            name
          )
        )
      `)
      .order("created_at", { ascending: false })
      .range(from, to),
    supabase
      .from("color_variants")
      .select("product_id", { count: "exact", head: true }),
  ]);

  if (variantsRes.error) {
    console.error("Error fetching inventory:", variantsRes.error);
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">庫存總覽</h1>
        <div className="text-red-500">載入失敗：{variantsRes.error.message}</div>
      </div>
    );
  }

  const totalProducts = new Set((countRes.data || []).map((item) => item.product_id)).size;
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE) || 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grouped = (variantsRes.data || []).reduce((acc: Record<string, InventorySummary>, item: any) => {
    const productId = item.product.id;
    if (!acc[productId]) {
      const supplierName = Array.isArray(item.product.supplier)
        ? item.product.supplier[0]?.name || "未設定"
        : item.product.supplier?.name || "未設定";
      acc[productId] = {
        product_id: productId,
        product_name: item.product.name,
        product_code: item.product.code,
        supplier_name: supplierName,
        image_url: item.product.image_url,
        variants: [],
      };
    }
    acc[productId].variants.push({
      color: item.color,
      size: item.size,
      purchased: item.purchased,
      defective: item.defective,
      sold: item.sold,
      available: item.purchased - item.defective - item.sold,
    });
    return acc;
  }, {});

  const inventory = Object.values(grouped) as InventorySummary[];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">庫存總覽</h1>
      <HomeClient inventory={inventory} />
      <Pagination currentPage={currentPage} totalPages={totalPages} basePath="/" />
    </div>
  );
}
