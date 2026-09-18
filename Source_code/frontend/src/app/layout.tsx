import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import HeaderNav from "@/shared/components/HeaderNav/HeaderNav";

export const metadata: Metadata = {
  title: "MedSched - Smart Healthcare Appointment & Reception",
  description: "Hệ thống Đặt lịch & Tiếp đón Y tế Thông minh Tích hợp Spring Boot 3, Spring AI và Quét thẻ CCCD",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen bg-mint-soft text-slate-800 flex flex-col font-sans antialiased">
        <HeaderNav />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="bg-white border-t border-mint-light py-6 text-center text-xs text-slate-500">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© 2026 MedSched Healthcare System. All rights reserved.</span>
            <span className="text-slate-400">Hệ thống Y tế Thông minh Spring Boot 3 + Next.js 15</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
