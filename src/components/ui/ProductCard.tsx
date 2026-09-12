"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { Package } from "lucide-react";
import { SortableCard, DragHandle } from "@/components/ui/SortableCard";

export interface ProductCardVariant {
  color: string;
  size: string | null;
  available?: number;
}

export interface ProductCardData {
  id: string;
  name: string;
  code: string | null;
  image_url: string | null;
  supplier_name?: string;
  variants?: ProductCardVariant[];
  is_pinned?: boolean;
}

interface ProductCardProps {
  product: ProductCardData;
  href?: string;
  showVariants?: boolean;
  showSupplier?: boolean;
  isSortable?: boolean;
  actions?: ReactNode;
  className?: string;
}

function VariantTags({ variants }: { variants: ProductCardVariant[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {variants.map((variant, idx) => (
        <span
          key={idx}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            variant.available === undefined || variant.available > 0
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {variant.color}
          {variant.size && `/${variant.size}`}
          {variant.available !== undefined && `: ${variant.available}`}
        </span>
      ))}
    </div>
  );
}

export function ProductCard({
  product,
  href,
  showVariants = false,
  showSupplier = false,
  isSortable = false,
  actions,
  className = "",
}: ProductCardProps) {
  const cardContent = (
    <div className="flex">
      {isSortable && (
        <div className="w-8 flex-shrink-0 flex items-center justify-center bg-gray-50 hover:bg-gray-100">
          <DragHandle />
        </div>
      )}
      <Link href={href || `/products/${product.id}`} className="w-20 h-20 flex-shrink-0 bg-gray-100 block relative">
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
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <Link href={href || `/products/${product.id}`}>
              <h3 className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors truncate">
                {product.name}
              </h3>
            </Link>
            {product.code && (
              <p className="text-xs text-gray-500 mt-0.5">{product.code}</p>
            )}
            {showSupplier && product.supplier_name && (
              <p className="text-xs text-gray-500 mt-0.5">{product.supplier_name}</p>
            )}
            {showVariants && product.variants && product.variants.length > 0 && (
              <VariantTags variants={product.variants} />
            )}
          </div>
          {actions && (
            <div className="flex gap-1 ml-2 flex-shrink-0">
              {actions}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  if (isSortable) {
    return (
      <SortableCard id={product.id} isPinned={product.is_pinned} className={className}>
        {cardContent}
      </SortableCard>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {cardContent}
    </div>
  );
}
