import useSWR from "swr";
import { createClient } from "@/lib/supabase/browser";
import type { Product, Supplier, InventorySummary } from "@/types";

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

export function useProducts() {
  const fetcher = async () => {
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
        .order("is_pinned", { ascending: false })
        .order("sort_order", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase.from("suppliers").select("*").order("name"),
    ]);

    if (productsRes.error) throw productsRes.error;
    return {
      products: (productsRes.data || []) as ProductWithSupplier[],
      suppliers: (suppliersRes.data || []) as Supplier[],
    };
  };

  const { data, error, isLoading, mutate } = useSWR("products", fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    dedupingInterval: 60000,
  });

  return {
    products: data?.products || [],
    suppliers: data?.suppliers || [],
    isLoading,
    error,
    mutate,
  };
}
