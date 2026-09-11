import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { PWARegister } from "@/components/PWARegister";
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
        <Suspense fallback={<div className="w-64" />}>
          <Sidebar />
        </Suspense>
        <main className="flex-1 ml-0 md:ml-64 min-h-screen pt-14 md:pt-0">
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
