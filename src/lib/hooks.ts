import useSWR from "swr";
import { createClient } from "@/lib/supabase/browser";
import type { Product, Supplier, InventorySummary, ColorVariant } from "@/types";

const swrOptions = {
  revalidateOnFocus: true,
  revalidateIfStale: true,
  dedupingInterval: 2000,
};

type ProductWithSupplier = Omit<Product, "supplier"> & {
  supplier: Supplier | null;
};

export type ProductWithSupplierAndVariants = ProductWithSupplier & {
  variants: {
    color: string;
    size: string | null;
    purchased: number;
    defective: number;
    sold: number;
  }[];
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

  const { data, error, isLoading, mutate } = useSWR("inventory", fetcher, swrOptions);

  return {
    inventory: data || [],
    isLoading,
    error,
    mutate,
  };
}

export interface SupplierWithStats extends Supplier {
  product_count: number;
  total_stock: number;
  total_purchased: number;
  total_defective: number;
}

export function useSuppliers() {
  const fetcher = async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("suppliers")
      .select(`
        *,
        products:products (
          id,
          variants:color_variants (
            purchased,
            defective,
            sold
          )
        )
      `)
      .order("is_pinned", { ascending: false })
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const suppliersWithStats: SupplierWithStats[] = (data || []).map((s: any) => {
      const products = s.products || [];
      const productCount = products.length;
      let totalStock = 0;
      let totalPurchased = 0;
      let totalDefective = 0;
      for (const p of products) {
        const variants = p.variants || [];
        for (const v of variants) {
          totalPurchased += v.purchased;
          totalDefective += v.defective;
          totalStock += v.purchased - v.defective - v.sold;
        }
      }
      return {
        id: s.id,
        name: s.name,
        contact: s.contact,
        notes: s.notes,
        sort_order: s.sort_order,
        is_pinned: s.is_pinned,
        created_at: s.created_at,
        updated_at: s.updated_at,
        product_count: productCount,
        total_stock: totalStock,
        total_purchased: totalPurchased,
        total_defective: totalDefective,
      };
    });

    return suppliersWithStats;
  };

  const { data, error, isLoading, mutate } = useSWR("suppliers", fetcher, swrOptions);

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
    swrOptions
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

export type ProductFilter = "all" | "no-stock" | "partial" | "no-image" | "no-variants";

export interface ProductFilters {
  searchQuery?: string;
  productFilter?: ProductFilter;
}

export function useProducts(page: number = 1, pageSize: number = 20, filters: ProductFilters = {}) {
  const { searchQuery = "", productFilter = "all" } = filters;

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
          ),
          variants:color_variants (
            color,
            size,
            purchased,
            defective,
            sold
          )
        `)
        .order("is_pinned", { ascending: false })
        .order("sort_order", { ascending: false })
        .order("created_at", { ascending: true }),
      supabase.from("suppliers").select("*").order("name"),
    ]);

    if (productsRes.error) throw productsRes.error;

    let allProducts = (productsRes.data || []) as ProductWithSupplierAndVariants[];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allProducts = allProducts.filter((p) =>
        p.name.toLowerCase().includes(query) ||
        (p.code && p.code.toLowerCase().includes(query))
      );
    }

    if (productFilter !== "all") {
      allProducts = allProducts.filter((product) => {
        if (productFilter === "no-stock") {
          if (!product.variants || product.variants.length === 0) return false;
          return product.variants.every((v) => v.purchased - v.defective - v.sold <= 0);
        } else if (productFilter === "partial") {
          if (!product.variants || product.variants.length === 0) return false;
          const someOutOfStock = product.variants.some((v) => v.purchased - v.defective - v.sold <= 0);
          const someInStock = product.variants.some((v) => v.purchased - v.defective - v.sold > 0);
          return someOutOfStock && someInStock;
        } else if (productFilter === "no-image") {
          return !product.image_url;
        } else if (productFilter === "no-variants") {
          return !product.variants || product.variants.length === 0;
        }
        return true;
      });
    }

    const totalProducts = allProducts.length;
    const totalPages = Math.ceil(totalProducts / pageSize);
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const paginatedProducts = allProducts.slice(from, to);

    return {
      products: paginatedProducts,
      suppliers: (suppliersRes.data || []) as Supplier[],
      totalPages,
      allProducts,
    };
  };

  const { data, error, isLoading, mutate } = useSWR(["products", page, pageSize, searchQuery, productFilter], fetcher, swrOptions);

  return {
    products: data?.products || [],
    suppliers: data?.suppliers || [],
    totalPages: data?.totalPages || 1,
    allProducts: data?.allProducts || [],
    isLoading,
    error,
    mutate,
  };
}

export interface PSIItem {
  product_id: string;
  product_name: string;
  product_code: string | null;
  supplier_name: string;
  image_url: string | null;
  variants: {
    color: string;
    size: string | null;
    purchased: number;
    defective: number;
    sold: number;
    available: number;
  }[];
}

export type PSISortOption = "default" | "purchased-desc" | "purchased-asc" | "sold-desc" | "sold-asc" | "stock-desc" | "stock-asc";

export interface PSIFilters {
  searchQuery?: string;
  supplierName?: string;
  sortBy?: PSISortOption;
}

export function usePSI(page: number = 1, pageSize: number = 20, filters: PSIFilters = {}) {
  const { searchQuery = "", supplierName = "", sortBy = "default" } = filters;

  const fetcher = async () => {
    const supabase = createClient();
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from("products")
      .select(`
        id,
        name,
        code,
        image_url,
        supplier:supplier_id (
          name
        ),
        variants:color_variants (
          color,
          size,
          purchased,
          defective,
          sold
        )
      `);

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%,supplier.name.ilike.%${searchQuery}%`);
    }

    if (supplierName) {
      query = query.eq("supplier.name", supplierName);
    }

    switch (sortBy) {
      case "purchased-desc":
      case "purchased-asc":
      case "sold-desc":
      case "sold-asc":
      case "stock-desc":
      case "stock-asc":
        break;
      default:
        query = query
          .order("is_pinned", { ascending: false })
          .order("sort_order", { ascending: false })
          .order("created_at", { ascending: true });
    }

    const [productsRes, countRes] = await Promise.all([
      query.range(from, to),
      searchQuery || supplierName
        ? supabase.from("products").select("id", { count: "exact", head: true }).then((res) => {
            let countQuery = supabase.from("products").select("id", { count: "exact", head: true });
            if (searchQuery) {
              countQuery = countQuery.or(`name.ilike.%${searchQuery}%,code.ilike.%${searchQuery}%,supplier.name.ilike.%${searchQuery}%`);
            }
            if (supplierName) {
              countQuery = countQuery.eq("supplier.name", supplierName);
            }
            return countQuery;
          })
        : supabase.from("products").select("id", { count: "exact", head: true }),
    ]);

    if (productsRes.error) throw productsRes.error;

    const totalProducts = countRes.count || 0;
    const totalPages = Math.ceil(totalProducts / pageSize);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let items: PSIItem[] = (productsRes.data || []).map((p: any) => {
      const supplierName = Array.isArray(p.supplier)
        ? p.supplier[0]?.name || "未設定"
        : p.supplier?.name || "未設定";
      return {
        product_id: p.id,
        product_name: p.name,
        product_code: p.code,
        supplier_name: supplierName,
        image_url: p.image_url,
        variants: (p.variants || []).map((v: { color: string; size: string | null; purchased: number; defective: number; sold: number }) => ({
          color: v.color,
          size: v.size,
          purchased: v.purchased,
          defective: v.defective,
          sold: v.sold,
          available: v.purchased - v.defective - v.sold,
        })),
      };
    });

    const getTotal = (item: PSIItem, field: "purchased" | "defective" | "sold" | "available") =>
      item.variants.reduce((sum, v) => sum + v[field], 0);

    switch (sortBy) {
      case "purchased-desc":
        items.sort((a, b) => getTotal(b, "purchased") - getTotal(a, "purchased"));
        break;
      case "purchased-asc":
        items.sort((a, b) => getTotal(a, "purchased") - getTotal(b, "purchased"));
        break;
      case "sold-desc":
        items.sort((a, b) => getTotal(b, "sold") - getTotal(a, "sold"));
        break;
      case "sold-asc":
        items.sort((a, b) => getTotal(a, "sold") - getTotal(b, "sold"));
        break;
      case "stock-desc":
        items.sort((a, b) => getTotal(b, "available") - getTotal(a, "available"));
        break;
      case "stock-asc":
        items.sort((a, b) => getTotal(a, "available") - getTotal(b, "available"));
        break;
    }

    return {
      items,
      totalPages,
    };
  };

  const { data, error, isLoading, mutate } = useSWR(["psi", page, pageSize, searchQuery, supplierName, sortBy], fetcher, swrOptions);

  return {
    items: data?.items || [],
    totalPages: data?.totalPages || 1,
    isLoading,
    error,
    mutate,
  };
}
