"use client";

import React, { useState } from "react";
import { api, AppointmentResponse } from "@/lib/api";

export default function BookingPage() {
  const [symptoms, setSymptoms] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Dùng dữ liệu mẫu từ seed data:
      // patientProfileId: Châu Tuấn Kiệt (p0000001-0000-0000-0000-000000000001)
      // doctorId: PGS.TS Trần Văn Hùng (d0000001-0000-0000-0000-000000000001)
      // slotId: slot 08:30 (sl000002-0000-0000-0000-000000000001)
      const res = await api.bookAppointment({
        patientProfileId: "p0000001-0000-0000-0000-000000000001",
        doctorId: "d0000001-0000-0000-0000-000000000001",
        slotId: "sl000002-0000-0000-0000-000000000001",
        symptoms: symptoms || "Đau ngực nhẹ, cần khám kiểm tra tim mạch định kỳ.",
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Đặt lịch thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", background: "#fff", padding: "2rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
      <h2 style={{ color: "#0f172a", marginTop: 0 }}>📅 Đặt Lịch Khám Trực Tuyến</h2>
      <p style={{ color: "#64748b" }}>Chọn bác sĩ, khung giờ và nhập triệu chứng để Spring AI hỗ trợ tóm tắt bệnh án.</p>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #f87171", color: "#991b1b", padding: "0.8rem 1rem", borderRadius: "8px", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      {result ? (
        <div style={{ background: "#ecfdf5", border: "1px solid #34d399", padding: "1.5rem", borderRadius: "8px" }}>
          <h3 style={{ color: "#065f46", marginTop: 0 }}>🎉 Đặt Lịch Thành Công!</h3>
          <p><strong>Mã Đặt Chỗ (Booking Code):</strong> <span style={{ color: "#0284c7", fontSize: "1.2rem", fontWeight: "bold" }}>{result.bookingCode}</span></p>
          <p><strong>Số Thứ Tự Hàng Đợi:</strong> <span style={{ color: "#059669", fontSize: "1.2rem", fontWeight: "bold" }}>{result.queueNumber}</span></p>
          <p><strong>Tóm Tắt Bệnh Án Từ Spring AI:</strong></p>
          <div style={{ background: "#fff", padding: "0.8rem", borderRadius: "6px", fontStyle: "italic", border: "1px solid #cbd5e1" }}>
            🤖 {result.aiSummary}
          </div>
          <button 
            onClick={() => setResult(null)} 
            style={{ marginTop: "1rem", background: "#059669", color: "#fff", border: "none", padding: "0.6rem 1.2rem", borderRadius: "6px", cursor: "pointer" }}>
            Đặt ca khám mới
          </button>
        </div>
      ) : (
        <form onSubmit={handleBook}>
          <div style={{ marginBottom: "1.2rem" }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem" }}>Bác Sĩ:</label>
            <select style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} disabled>
              <option>PGS.TS.BS Trần Văn Hùng - Khoa Nội Tim Mạch (P.201 - Lầu 2)</option>
            </select>
          </div>

          <div style={{ marginBottom: "1.2rem" }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem" }}>Khung Giờ Khám (Time Slot):</label>
            <select style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1" }} disabled>
              <option>08:30 - 09:00 (Hôm nay) - Khả dụng [AVAILABLE]</option>
            </select>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem" }}>Mô tả triệu chứng bệnh lý:</label>
            <textarea
              rows={4}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Ví dụ: Thỉnh thoảng khó thở nhẹ khi leo cầu thang, tim đập nhanh hồi hộp vào buổi tối..."
              style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: "#0284c7", color: "#fff", border: "none", padding: "0.8rem", borderRadius: "6px", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Đang xử lý khóa slot & gọi Spring AI..." : "Xác Nhận Đặt Khám"}
          </button>
        </form>
      )}
    </div>
  );
}
