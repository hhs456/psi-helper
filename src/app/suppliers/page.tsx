import { SuppliersClient } from "@/components/SuppliersClient";

export default function SuppliersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">供應商管理</h1>
      <SuppliersClient />
    </div>
  );
}
