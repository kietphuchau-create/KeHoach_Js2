"use client";

import React, { useState } from "react";
import { api, AppointmentResponse } from "@/lib/api";

export default function ReceptionPage() {
  const [bookingCode, setBookingCode] = useState("MED-2026-8899");
  const [cccdNumber, setCccdNumber] = useState("079095012345");
  const [method, setMethod] = useState<"QR_CODE" | "CCCD_QR">("QR_CODE");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.checkIn({
        bookingCode: method === "QR_CODE" ? bookingCode : undefined,
        cccdNumber: method === "CCCD_QR" ? cccdNumber : undefined,
        method: method,
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || "Tiếp đón thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: "700px", margin: "0 auto", background: "#fff", padding: "2rem", borderRadius: "12px", border: "1px solid #e2e8f0" }}>
      <h2 style={{ color: "#059669", marginTop: 0 }}>📟 Quầy Tiếp Đón Y Tế Siêu Tốc (1 Giây)</h2>
      <p style={{ color: "#64748b" }}>Tiếp nhận bệnh nhân bằng cách quét mã QR vé hẹn hoặc đầu đọc quét mã QR thẻ CCCD gắn chip.</p>

      {/* Tabs chọn phương thức */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem" }}>
        <button
          type="button"
          onClick={() => setMethod("QR_CODE")}
          style={{
            flex: 1,
            padding: "0.8rem",
            borderRadius: "6px",
            border: "1px solid #059669",
            background: method === "QR_CODE" ? "#059669" : "#fff",
            color: method === "QR_CODE" ? "#fff" : "#059669",
            fontWeight: 600,
            cursor: "pointer",
          }}>
          📱 Quét Mã QR Vé Hẹn
        </button>
        <button
          type="button"
          onClick={() => setMethod("CCCD_QR")}
          style={{
            flex: 1,
            padding: "0.8rem",
            borderRadius: "6px",
            border: "1px solid #059669",
            background: method === "CCCD_QR" ? "#059669" : "#fff",
            color: method === "CCCD_QR" ? "#fff" : "#059669",
            fontWeight: 600,
            cursor: "pointer",
          }}>
          🪪 Quét Mã QR Thẻ CCCD Chip
        </button>
      </div>

      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #f87171", color: "#991b1b", padding: "0.8rem 1rem", borderRadius: "8px", marginBottom: "1rem" }}>
          ⚠️ {error}
        </div>
      )}

      {result ? (
        <div style={{ background: "#ecfdf5", border: "1px solid #34d399", padding: "1.5rem", borderRadius: "8px" }}>
          <h3 style={{ color: "#065f46", marginTop: 0 }}>✅ Đã Tiếp Đón Thành Công!</h3>
          <p><strong>Mã Hẹn:</strong> {result.bookingCode}</p>
          <p><strong>Số Thứ Tự Vào Khám:</strong> <span style={{ color: "#059669", fontSize: "1.3rem", fontWeight: "bold" }}>{result.queueNumber}</span></p>
          <p><strong>Trạng Thái Mới:</strong> <span style={{ background: "#10b981", color: "#fff", padding: "0.2rem 0.6rem", borderRadius: "4px" }}>{result.status}</span></p>
          <p><strong>Thời Điểm Tiếp Đón:</strong> {new Date(result.checkInTime).toLocaleString("vi-VN")}</p>
          <button
            onClick={() => setResult(null)}
            style={{ marginTop: "1rem", background: "#059669", color: "#fff", border: "none", padding: "0.6rem 1.2rem", borderRadius: "6px", cursor: "pointer" }}>
            Tiếp đón ca tiếp theo
          </button>
        </div>
      ) : (
        <form onSubmit={handleCheckin}>
          {method === "QR_CODE" ? (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem" }}>Mã QR Vé Hẹn (Booking Code):</label>
              <input
                type="text"
                value={bookingCode}
                onChange={(e) => setBookingCode(e.target.value)}
                placeholder="Ví dụ: MED-2026-8899"
                style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
              />
              <small style={{ color: "#64748b" }}>* Máy quét barcode/QR sẽ tự động bắn chuỗi ký tự này vào ô input.</small>
            </div>
          ) : (
            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontWeight: 600, marginBottom: "0.4rem" }}>Số CCCD Gắn Chip (12 số):</label>
              <input
                type="text"
                value={cccdNumber}
                onChange={(e) => setCccdNumber(e.target.value)}
                placeholder="Ví dụ: 079095012345"
                style={{ width: "100%", padding: "0.6rem", borderRadius: "6px", border: "1px solid #cbd5e1", boxSizing: "border-box" }}
              />
              <small style={{ color: "#64748b" }}>* Đầu đọc quét mã QR trên thẻ CCCD sẽ tự động bóc tách số định danh 12 số.</small>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", background: "#059669", color: "#fff", border: "none", padding: "0.8rem", borderRadius: "6px", fontSize: "1rem", fontWeight: 600, cursor: "pointer" }}>
            {loading ? "Đang xử lý tiếp đón..." : "Xác Nhận Tiếp Đón (Check-in)"}
          </button>
        </form>
      )}
    </div>
  );
}
