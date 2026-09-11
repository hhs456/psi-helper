import { ProductsClient } from "@/components/ProductsClient";

const PAGE_SIZE = 20;

export default function ProductsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">商品管理</h1>
      <ProductsClient pageSize={PAGE_SIZE} />
    </div>
  );
}
