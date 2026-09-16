/**
 * MedSched API Client - Giao tiếp với Spring Boot 3 Backend
 * Base URL: http://localhost:8080/api/v1
 * Chuẩn kiến trúc: Shared API Client (Mục 10 TongHopQuyTacFN.md)
 */

import { AppointmentResponse } from '@/shared/types';
export type { AppointmentResponse };

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setAuthSession(token: string, user: any) {
  if (typeof window === "undefined") return;
  const safeUser = user || {};
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(safeUser));
  localStorage.setItem("role", safeUser.roles?.[0] || "CUSTOMER");
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
}

export function getAuthUser(): any | null {
  if (typeof window === "undefined") return null;
  const userStr = localStorage.getItem("user");
  if (!userStr) return null;
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Tự động phân luồng URL tương thích: /api/v1/... hoặc /api/...
  let targetUrl = `${API_BASE_URL}${endpoint}`;
  if (endpoint.startsWith("/appointments") || endpoint.startsWith("/reception") || endpoint.startsWith("/ai")) {
    const rootApiUrl = API_BASE_URL.replace(/\/v1\/?$/, "");
    targetUrl = `${rootApiUrl}${endpoint}`;
  }

  let response: Response;
  try {
    response = await fetch(targetUrl, {
      ...options,
      headers,
    });
    // Nếu 404 và targetUrl đã bị sửa, thử lại với API_BASE_URL gốc
    if (response.status === 404 && targetUrl !== `${API_BASE_URL}${endpoint}`) {
      response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });
    }
  } catch (err: any) {
    // Nếu kết nối tới backend thất bại, ném lỗi rõ ràng
    throw new Error(err.message || "Không thể kết nối đến máy chủ MedSched (Spring Boot).");
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.detail || errorData.message || `Yêu cầu thất bại (${response.status})`;
    throw new Error(message);
  }

  // Nếu HTTP 204 No Content
  if (response.status === 204) return {} as T;
  return response.json();
}

export const api = {
  // --- 1. XÁC THỰC (AUTH) ---
  async login(payload: { email: string; password: string }) {
    const res = await request<any>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const user = res.user || {
      id: res.userId,
      email: res.email,
      fullName: res.fullName,
      roles: res.roles || [],
    };
    setAuthSession(res.accessToken, user);
    return { ...res, user };
  },

  async register(payload: { fullName: string; email: string; phone: string; password: string }) {
    return request<any>("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // --- 2. HỒ SƠ CÁ NHÂN (/ME) ---
  async getProfile() {
    return request<any>("/me");
  },

  async updateProfile(payload: { fullName: string; phone: string }) {
    return request<any>("/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async changePassword(payload: { currentPassword: string; newPassword: string }) {
    return request<any>("/me/change-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateDoctorProfile(payload: { academicTitle: string; experienceYears: number; roomNumber: string; bio: string }) {
    return request<any>("/me/doctor-profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // --- 3. QUẢN TRỊ VIÊN (ADMIN) ---
  async getAdminUsers(params?: { role?: string; q?: string; page?: number; size?: number; sort?: string }) {
    const query = new URLSearchParams();
    if (params?.role && params.role !== "ALL") query.append("role", params.role);
    if (params?.q) query.append("q", params.q);
    if (params?.page !== undefined) query.append("page", String(params.page));
    if (params?.size !== undefined) query.append("size", String(params.size));
    if (params?.sort) query.append("sort", params.sort);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<any>(`/admin/users${qs}`);
  },

  async updateUserStatus(userId: string, isActive: boolean) {
    return request<any>(`/admin/users/${userId}/status`, {
      method: "PATCH",
      body: JSON.stringify({ active: isActive }),
    });
  },

  async createStaff(payload: { email: string; temporaryPassword?: string; fullName: string; phone: string; medicalCenterId: string }) {
    return request<any>("/admin/users/staff", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async createDoctor(payload: {
    email: string;
    temporaryPassword?: string;
    fullName: string;
    phone: string;
    specialtyId: string;
    medicalCenterId: string;
    academicTitle: string;
    experienceYears: number;
    consultationFee: number;
    roomNumber: string;
    bio: string;
  }) {
    return request<any>("/admin/users/doctors", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // --- 4. DANH MỤC KHÁM (PUBLIC) ---
  async getMedicalCenters() {
    return request<any[]>("/medical-centers");
  },

  async getSpecialties() {
    return request<any[]>("/specialties");
  },

  async getServices() {
    return request<any[]>("/services");
  },

  // --- 5. ĐẶT LỊCH (APPOINTMENTS) & SPRING AI TRIAGE ---
  async bookAppointment(payload: {
    medicalCenterId?: string;
    patientProfileId: string;
    doctorId: string;
    slotId: string;
    symptoms?: string;
    medicalHistory?: string;
  }) {
    // Đảm bảo medicalCenterId có giá trị nếu backend yêu cầu
    const body = {
      medicalCenterId: payload.medicalCenterId || "mc000001-0000-0000-0000-000000000001",
      ...payload,
    };
    return request<AppointmentResponse>("/appointments", {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  async getAppointmentByCode(bookingCode: string) {
    return request<AppointmentResponse>(`/appointments/booking-code/${bookingCode}`);
  },

  async triageSymptoms(symptoms: string) {
    try {
      return await request<{ specialty: string; summary: string }>("/ai/triage", {
        method: "POST",
        body: JSON.stringify({ symptoms }),
      });
    } catch {
      // Fallback rule-based nếu chưa bật endpoint AI
      let specialty = "Nội Khoa Tổng Quát";
      const s = symptoms.toLowerCase();
      if (s.includes("tim") || s.includes("ngực") || s.includes("khó thở")) specialty = "Khoa Nội Tim Mạch";
      else if (s.includes("da") || s.includes("ngứa") || s.includes("mụn")) specialty = "Khoa Da Liễu";
      else if (s.includes("răng") || s.includes("nướu")) specialty = "Khoa Răng Hàm Mặt";
      else if (s.includes("mắt") || s.includes("nhìn mờ")) specialty = "Khoa Mắt";

      return {
        specialty,
        summary: `Triệu chứng: ${symptoms.slice(0, 100)}... | Định hướng chuyên khoa: ${specialty}`,
      };
    }
  },

  // --- 6. QUẦY TIẾP ĐÓN LỄ TÂN (RECEPTION CHECK-IN) ---
  async checkInQr(bookingCode: string) {
    const res = await request<any>("/reception/checkin/qr", {
      method: "POST",
      body: JSON.stringify({ bookingCode: bookingCode.trim() }),
    });
    // Chuẩn hóa response về dạng AppointmentResponse
    return {
      ...(res.appointment || {}),
      bookingCode: res.appointment?.bookingCode || bookingCode,
      queueNumber: res.queueNumber || res.appointment?.queueNumber || "STT-01",
      status: res.appointment?.status || "CHECKED_IN",
      checkInTime: res.appointment?.checkInTime || new Date().toISOString(),
      message: res.message || "Tiếp đón thành công",
    };
  },

  async checkInCccd(cccdNumber: string, fullName: string = "Bệnh nhân") {
    const res = await request<any>("/reception/checkin/cccd", {
      method: "POST",
      body: JSON.stringify({ cccdNumber: cccdNumber.trim(), fullName: fullName.trim() }),
    });
    return {
      ...(res.appointment || {}),
      bookingCode: res.appointment?.bookingCode || `MED-${cccdNumber.slice(-4)}`,
      queueNumber: res.queueNumber || res.appointment?.queueNumber || "STT-01",
      status: res.appointment?.status || "CHECKED_IN",
      checkInTime: res.appointment?.checkInTime || new Date().toISOString(),
      message: res.message || "Tiếp đón thành công",
    };
  },

  async checkIn(payload: { bookingCode?: string; cccdNumber?: string; method: "QR_CODE" | "CCCD_QR" }) {
    if (payload.method === "QR_CODE" && payload.bookingCode) {
      return this.checkInQr(payload.bookingCode);
    }
    if (payload.method === "CCCD_QR" && payload.cccdNumber) {
      return this.checkInCccd(payload.cccdNumber);
    }
    throw new Error("Vui lòng cung cấp mã QR vé hẹn hoặc số CCCD hợp lệ.");
  },
};
