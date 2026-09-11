import { createClient } from "@/lib/supabase/server";
import { SuppliersClient } from "@/components/SuppliersClient";
import type { Supplier } from "@/types";

export default async function SuppliersPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("is_pinned", { ascending: false })
    .order("sort_order", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Error fetching suppliers:", error);
    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-6">供應商管理</h1>
        <div className="text-red-500">載入失敗：{error.message}</div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">供應商管理</h1>
      <SuppliersClient initialSuppliers={(data || []) as Supplier[]} />
    </div>
  );
}
