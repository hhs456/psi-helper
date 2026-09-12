import { PSIClient } from "@/components/PSIClient";

const PAGE_SIZE = 20;

export default function PSIPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">進銷明細</h1>
      <PSIClient pageSize={PAGE_SIZE} />
    </div>
  );
}
