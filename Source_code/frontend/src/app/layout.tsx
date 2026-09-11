import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "MedSched - Smart Healthcare Appointment & Reception",
  description: "Hệ thống Đặt lịch & Tiếp đón Y tế Thông minh Tích hợp Spring Boot 3, Spring AI và Quét thẻ CCCD",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#f8fafc", color: "#0f172a" }}>
        <header style={{ background: "#1e293b", color: "#fff", padding: "1rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "1.25rem", fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            🏥 MedSched
          </div>
          <nav style={{ display: "flex", gap: "1.5rem" }}>
            <a href="/" style={{ color: "#94a3b8", textDecoration: "none" }}>Trang Chủ</a>
            <a href="/booking" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: 600 }}>Đặt Lịch Khám</a>
            <a href="/reception" style={{ color: "#34d399", textDecoration: "none", fontWeight: 600 }}>Quầy Tiếp Đón QR</a>
          </nav>
        </header>
        <main style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
