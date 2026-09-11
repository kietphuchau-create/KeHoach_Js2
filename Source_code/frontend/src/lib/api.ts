/**
 * MedSched API Client - Giao tiếp với Spring Boot 3 Backend
 * Base URL: http://localhost:8080/api/v1
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export interface BookAppointmentPayload {
  patientProfileId: string;
  doctorId: string;
  slotId: string;
  symptoms?: string;
}

export interface CheckinPayload {
  bookingCode?: string;
  cccdNumber?: string;
  method?: "QR_CODE" | "CCCD_QR" | "MANUAL";
}

export interface AppointmentResponse {
  id: string;
  bookingCode: string;
  patientProfileId: string;
  doctorId: string;
  slotId: string;
  queueNumber: string;
  queueType: string;
  patientSymptoms: string;
  aiSummary: string;
  status: string;
  paymentStatus: string;
  checkinMethod: string;
  checkInTime: string;
  createdAt: string;
}

export const api = {
  // Đặt lịch khám
  async bookAppointment(payload: BookAppointmentPayload): Promise<AppointmentResponse> {
    const res = await fetch(`${API_BASE_URL}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Không thể đặt lịch khám.");
    }
    return res.json();
  },

  // Check-in tiếp đón (Vé QR hoặc CCCD gắn chip)
  async checkIn(payload: CheckinPayload): Promise<AppointmentResponse> {
    const res = await fetch(`${API_BASE_URL}/appointments/check-in`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.detail || "Không thể hoàn tất tiếp đón.");
    }
    return res.json();
  },
};
