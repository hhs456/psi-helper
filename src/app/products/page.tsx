import { ProductsClient } from "@/components/ProductsClient";

const PAGE_SIZE = 20;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page = "1" } = await searchParams;
  const currentPage = parseInt(page);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">商品管理</h1>
      <ProductsClient currentPage={currentPage} pageSize={PAGE_SIZE} />
    </div>
  );
}
