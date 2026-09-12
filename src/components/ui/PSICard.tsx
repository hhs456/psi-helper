"use client";

import Link from "next/link";
import Image from "next/image";
import { Package } from "lucide-react";

export interface PSICardVariant {
  color: string;
  size: string | null;
  purchased: number;
  defective: number;
  sold: number;
  available: number;
}

export interface PSICardData {
  id: string;
  name: string;
  code: string | null;
  image_url: string | null;
  supplier_name?: string;
  variants: PSICardVariant[];
}

export function PSICard({ product }: { product: PSICardData }) {
  const totals = product.variants.reduce(
    (acc, v) => ({
      purchased: acc.purchased + v.purchased,
      defective: acc.defective + v.defective,
      sold: acc.sold + v.sold,
      available: acc.available + v.available,
    }),
    { purchased: 0, defective: 0, sold: 0, available: 0 }
  );

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="flex">
        <Link href={`/products/${product.id}`} className="w-20 h-20 flex-shrink-0 bg-gray-100 block relative">
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="text-gray-400" size={24} />
            </div>
          )}
        </Link>
        <div className="flex-1 p-3 min-w-0">
          <Link href={`/products/${product.id}`}>
            <h3 className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors truncate">
              {product.name}
            </h3>
          </Link>
          {product.code && (
            <p className="text-xs text-gray-500 mt-0.5">{product.code}</p>
          )}
          {product.supplier_name && (
            <p className="text-xs text-gray-500 mt-0.5">{product.supplier_name}</p>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100">
        {product.variants.length > 0 ? (
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-2 py-1.5 text-left text-gray-500 font-medium">顏色/尺寸</th>
                <th className="px-2 py-1.5 text-right text-gray-500 font-medium">進貨</th>
                <th className="px-2 py-1.5 text-right text-gray-500 font-medium">瑕疵</th>
                <th className="px-2 py-1.5 text-right text-gray-500 font-medium">銷售</th>
                <th className="px-2 py-1.5 text-right text-gray-500 font-medium">庫存</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant, idx) => (
                <tr key={idx} className="border-t border-gray-50">
                  <td className="px-2 py-1.5 text-gray-700">
                    {variant.color}
                    {variant.size && <span className="text-gray-400">/{variant.size}</span>}
                  </td>
                  <td className="px-2 py-1.5 text-right text-blue-600">{variant.purchased}</td>
                  <td className="px-2 py-1.5 text-right text-red-600">{variant.defective}</td>
                  <td className="px-2 py-1.5 text-right text-green-600">{variant.sold}</td>
                  <td className={`px-2 py-1.5 text-right font-medium ${variant.available > 0 ? "text-gray-900" : "text-red-600"}`}>
                    {variant.available}
                  </td>
                </tr>
              ))}
              {product.variants.length > 1 && (
                <tr className="border-t border-gray-200 bg-gray-50 font-medium">
                  <td className="px-2 py-1.5 text-gray-700">合計</td>
                  <td className="px-2 py-1.5 text-right text-blue-600">{totals.purchased}</td>
                  <td className="px-2 py-1.5 text-right text-red-600">{totals.defective}</td>
                  <td className="px-2 py-1.5 text-right text-green-600">{totals.sold}</td>
                  <td className={`px-2 py-1.5 text-right ${totals.available > 0 ? "text-gray-900" : "text-red-600"}`}>
                    {totals.available}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <div className="px-3 py-2 text-xs text-gray-400 text-center">
            尚無規格資料
          </div>
        )}
      </div>
    </div>
  );
}
