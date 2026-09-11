import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

async function listProducts(): Promise<{ image_url: string | null }[]> {
  const res = await fetch(`${supabaseUrl}/rest/v1/products?select=image_url`, {
    headers: { apikey: supabaseKey },
  });
  return res.json();
}

async function listStorageFiles(): Promise<{ name: string }[]> {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/list/product-images`, {
    method: "POST",
    headers: {
      apikey: supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ limit: 1000, prefix: "" }),
  });
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

async function deleteFiles(files: string[]): Promise<void> {
  const res = await fetch(`${supabaseUrl}/storage/v1/object/product-images`, {
    method: "DELETE",
    headers: {
      apikey: supabaseKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: files }),
  });
  if (!res.ok) {
    console.error("刪除失敗:", await res.text());
  }
}

async function cleanupOrphanedImages() {
  console.log("開始清理孤立的圖片...\n");

  const products = await listProducts();

  const usedUrls = new Set<string>();
  for (const product of products) {
    if (product.image_url) {
      const match = product.image_url.match(/\/storage\/v1\/object\/public\/product-images\/(.+)$/);
      if (match) {
        usedUrls.add(match[1]);
      }
    }
  }

  console.log(`找到 ${usedUrls.size} 張正在使用的圖片`);

  const files = await listStorageFiles();
  console.log(`Storage 中共有 ${files.length} 張圖片`);

  const orphanedFiles = files.filter((file) => !usedUrls.has(file.name));

  console.log(`找到 ${orphanedFiles.length} 張孤立圖片\n`);

  if (orphanedFiles.length === 0) {
    console.log("沒有需要清理的圖片");
    return;
  }

  console.log("以下圖片將被刪除:");
  for (const file of orphanedFiles) {
    console.log(`  - ${file.name}`);
  }

  console.log("\n開始刪除...");

  const batchSize = 50;
  for (let i = 0; i < orphanedFiles.length; i += batchSize) {
    const batch = orphanedFiles.slice(i, i + batchSize).map((f) => f.name);
    await deleteFiles(batch);
    console.log(`已刪除批次 ${Math.floor(i / batchSize) + 1} (${batch.length} 張)`);
  }

  console.log("\n清理完成！");
}

cleanupOrphanedImages().catch(console.error);
