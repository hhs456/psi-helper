"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Package,
  Menu,
  X,
  Warehouse,
  LogOut,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navigation = [
  { name: "庫存總覽", href: "/", icon: LayoutDashboard },
  { name: "供應商", href: "/suppliers", icon: Warehouse },
  { name: "商品管理", href: "/products", icon: Package },
  { name: "進銷明細", href: "/psi", icon: BarChart3 },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved !== null) return saved === "true";
    return window.innerWidth < 1024;
  });

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--sidebar-width",
      isCollapsed ? "4rem" : "16rem"
    );
  }, [isCollapsed]);

  const toggleCollapse = () => {
    const next = !isCollapsed;
    setIsCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-white shadow-md border border-gray-200"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 h-full bg-white border-r border-gray-200 transform transition-all duration-200 ease-in-out md:translate-x-0 ${
          isCollapsed ? "w-16" : "w-64"
        } ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 border-b border-gray-200 relative">
            {!isCollapsed && (
              <h1 className="text-xl font-bold text-orange-500">PSI Helper</h1>
            )}
            {isCollapsed && (
              <span className="text-lg font-bold text-orange-500">P</span>
            )}
          </div>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={toggleCollapse}
            className="hidden md:flex absolute -right-3 top-20 z-50 items-center justify-center w-6 h-6 rounded-full bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          {/* Navigation */}
          <nav className={`flex-1 ${isCollapsed ? "px-2" : "px-4"} py-4 space-y-1`}>
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center ${isCollapsed ? "justify-center px-2" : "px-3"} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-orange-50 text-orange-600"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  title={isCollapsed ? item.name : undefined}
                >
                  <item.icon size={20} className={isCollapsed ? "" : "mr-3"} />
                  {!isCollapsed && item.name}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className={`${isCollapsed ? "px-2" : "px-4"} py-4 border-t border-gray-200`}>
            <button
              onClick={async () => {
                await fetch("/api/auth", { method: "DELETE" });
                window.location.href = "/login";
              }}
              className={`flex items-center ${isCollapsed ? "justify-center px-2" : "justify-center px-3"} py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors w-full`}
              title={isCollapsed ? "登出" : undefined}
            >
              <LogOut size={16} />
              {!isCollapsed && <span className="ml-2">登出</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
