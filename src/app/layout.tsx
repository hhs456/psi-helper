import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PWARegister } from "@/components/PWARegister";
import { Footer } from "@/components/Footer";
import { Suspense } from "react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PSI Helper - 庫存管理系統",
  description: "簡易的 Purchase, Sales and Inventory 管理系統",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "PSI Helper",
  },
  other: {
    "apple-touch-icon": "/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#f97316",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="zh-TW"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex">
        <PWARegister />
        <Suspense fallback={<div className="w-16 md:w-[var(--sidebar-width)]" />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 ml-0 md:ml-[var(--sidebar-width)] min-h-screen pt-14 md:pt-0 flex flex-col">
          <div className="p-4 md:p-6 lg:p-8 flex-1">
            {children}
          </div>
          <Footer />
        </main>
      </body>
    </html>
  );
}
