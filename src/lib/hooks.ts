import useSWR from "swr";
import { createClient } from "@/lib/supabase/browser";
import type { Product, Supplier, InventorySummary, ColorVariant } from "@/types";

type ProductWithSupplier = Omit<Product, "supplier"> & {
  supplier: Supplier | null;
};

export function useInventory() {
  const fetcher = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
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
      .order("created_at", { ascending: false });

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grouped = (data || []).reduce((acc: Record<string, InventorySummary>, item: any) => {
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

    return Object.values(grouped) as InventorySummary[];
  };

  const { data, error, isLoading, mutate } = useSWR("inventory", fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 60000,
  });

  return {
    inventory: data || [],
    isLoading,
    error,
    mutate,
  };
}

export function useSuppliers() {
  const fetcher = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return (data || []) as Supplier[];
  };

  const { data, error, isLoading, mutate } = useSWR("suppliers", fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 60000,
  });

  return {
    suppliers: data || [],
    isLoading,
    error,
    mutate,
  };
}

export function useProductDetail(productId: string) {
  const fetcher = async () => {
    const supabase = createClient();

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
      throw new Error("Product not found");
    }

    const maxCode = (ordersRes.data || [])
      .map((o) => {
        const match = o.client_code?.match(/^C(\d+)$/);
        return match ? parseInt(match[1]) : 0;
      })
      .reduce((max, curr) => Math.max(max, curr), 0);

    return {
      product: productRes.data as Product,
      variants: (variantsRes.data || []) as ColorVariant[],
      nextClientCode: `C${String(maxCode + 1).padStart(3, "0")}`,
    };
  };

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    productId ? ["product-detail", productId] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      dedupingInterval: 60000,
    }
  );

  return {
    product: data?.product || null,
    variants: data?.variants || [],
    nextClientCode: data?.nextClientCode || "C001",
    isLoading,
    isValidating,
    error,
    mutate,
  };
}

export function useProducts(page: number = 1, pageSize: number = 20) {
  const fetcher = async () => {
    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const [productsRes, suppliersRes, countRes] = await Promise.all([
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
        .order("created_at", { ascending: true })
        .range(from, to),
      supabase.from("suppliers").select("*").order("name"),
      supabase.from("products").select("id", { count: "exact", head: true }),
    ]);

    if (productsRes.error) throw productsRes.error;
    
    const totalProducts = countRes.count || 0;
    const totalPages = Math.ceil(totalProducts / pageSize);

    return {
      products: (productsRes.data || []) as ProductWithSupplier[],
      suppliers: (suppliersRes.data || []) as Supplier[],
      totalPages,
    };
  };

  const { data, error, isLoading, mutate } = useSWR(["products", page, pageSize], fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 60000,
  });

  return {
    products: data?.products || [],
    suppliers: data?.suppliers || [],
    totalPages: data?.totalPages || 1,
    isLoading,
    error,
    mutate,
  };
}
