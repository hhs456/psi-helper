import { ProductsClient } from "@/components/ProductsClient";

export default function ProductsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">商品管理</h1>
      <ProductsClient />
    </div>
  );
}
