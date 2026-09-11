import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  basePath: string;
}

export function Pagination({ currentPage, totalPages, basePath }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    if (currentPage <= 3) {
      pages.push(1, 2, 3, 4, "...", totalPages);
    } else if (currentPage >= totalPages - 2) {
      pages.push(1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <Link
        href={`${basePath}?page=${currentPage - 1}`}
        className={`p-2 rounded-lg border ${
          currentPage === 1
            ? "border-gray-200 text-gray-300 cursor-not-allowed"
            : "border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
        aria-disabled={currentPage === 1}
      >
        <ChevronLeft size={16} />
      </Link>

      {pages.map((page, idx) => {
        if (page === "...") {
          return (
            <span key={`ellipsis-${idx}`} className="px-2 text-gray-500">
              ...
            </span>
          );
        }

        return (
          <Link
            key={page}
            href={`${basePath}?page=${page}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              currentPage === page
                ? "bg-orange-500 text-white"
                : "border border-gray-300 text-gray-700 hover:bg-gray-50"
            }`}
          >
            {page}
          </Link>
        );
      })}

      <Link
        href={`${basePath}?page=${currentPage + 1}`}
        className={`p-2 rounded-lg border ${
          currentPage === totalPages
            ? "border-gray-200 text-gray-300 cursor-not-allowed"
            : "border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
        aria-disabled={currentPage === totalPages}
      >
        <ChevronRight size={16} />
      </Link>
    </div>
  );
}
