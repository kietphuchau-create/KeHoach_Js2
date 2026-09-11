import React from "react";

export default function HomePage() {
  return (
    <div>
      <div style={{ background: "#ffffff", padding: "2.5rem", borderRadius: "12px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)", marginBottom: "2rem" }}>
        <h1 style={{ margin: "0 0 1rem 0", color: "#0f172a" }}>Hệ Thống Đặt Lịch & Tiếp Đón Bệnh Viện Thông Minh MedSched</h1>
        <p style={{ color: "#64748b", fontSize: "1.1rem", lineHeight: 1.6 }}>
          Dự án Capstone môn học <strong>Java Spring 2</strong>. Ứng dụng mô hình <strong>Kiến trúc Lục giác (Hexagonal Architecture)</strong> chuẩn doanh nghiệp, 
          kết nối cơ sở dữ liệu <strong>XAMPP (MySQL)</strong> và tích hợp <strong>Spring AI</strong> (Clinical Triage, 2-line Summary, Sentiment Analysis) cùng tiếp đón thẻ CCCD chip.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
        {/* Module Bệnh nhân */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <h2 style={{ color: "#0284c7", marginTop: 0 }}>🩺 Dành Cho Bệnh Nhân</h2>
          <p style={{ color: "#475569" }}>Đặt lịch trực tuyến, khảo sát triệu chứng với Chatbot Spring AI, chọn khung giờ trống và nhận vé khám điện tử kèm mã QR.</p>
          <a href="/booking" style={{ display: "inline-block", background: "#0284c7", color: "#fff", padding: "0.6rem 1.2rem", borderRadius: "6px", textDecoration: "none", fontWeight: 500 }}>
            Đặt lịch khám ngay →
          </a>
        </div>

        {/* Module Tiếp đón Lễ tân */}
        <div style={{ background: "#fff", padding: "1.5rem", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
          <h2 style={{ color: "#059669", marginTop: 0 }}>📟 Quầy Tiếp Đón Lễ Tân</h2>
          <p style={{ color: "#475569" }}>Quét mã QR vé hẹn trên điện thoại hoặc quét thẻ CCCD gắn chip (12 số) để hoàn tất thủ tục check-in trong 1 giây.</p>
          <a href="/reception" style={{ display: "inline-block", background: "#059669", color: "#fff", padding: "0.6rem 1.2rem", borderRadius: "6px", textDecoration: "none", fontWeight: 500 }}>
            Vào quầy tiếp đón QR →
          </a>
        </div>
      </div>
    </div>
  );
}
