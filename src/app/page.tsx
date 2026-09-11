import { HomeClient } from "@/components/HomeClient";

export default function Home() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">庫存總覽</h1>
      <HomeClient />
    </div>
  );
}
