import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import HeaderNav from "@/shared/components/HeaderNav/HeaderNav";
import Footer from "@/shared/components/Footer/Footer";
import FloatingWidgets from "@/shared/components/FloatingWidgets/FloatingWidgets";
import ConcurrentSessionModal from "@/shared/components/Feedback/ConcurrentSessionModal";
import AppMainLayout from "@/shared/components/Layout/AppMainLayout";
import BookingMethodModal from "@/shared/components/BookingMethodModal/BookingMethodModal";

export const metadata: Metadata = {
  title: "MedSched - Hệ Thống Y Khoa Chuyên Sâu Quốc Tế & Đặt Lịch Tiếp Đón 1S",
  description: "Hệ thống Phòng khám Tư nhân Thông minh MedSched: Đặt lịch khám đa chuyên khoa, phân loại AI Triage, tiếp đón 1 giây bằng QR/CCCD",
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
    <html lang="vi" className="scroll-smooth overflow-x-hidden" suppressHydrationWarning>
      <body className="min-h-screen w-full bg-mint-soft text-slate-800 flex flex-col antialiased overflow-x-hidden font-sans">
        <ConcurrentSessionModal />
        <BookingMethodModal />
        <HeaderNav />
        <AppMainLayout>
          {children}
        </AppMainLayout>
        <Footer />
        <FloatingWidgets />
      </body>
    </html>
  );
}
