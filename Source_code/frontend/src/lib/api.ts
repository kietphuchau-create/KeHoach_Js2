/**
 * MedSched API Client - Giao tiếp với Spring Boot 3 Backend
 * Base URL: http://localhost:8080/api/v1
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

export interface AppointmentResponse {
  id?: string;
  bookingCode: string;
  queueNumber?: number | string;
  aiSummary?: string;
  status?: string;
  checkInTime?: string;
  doctorId?: string;
  patientProfileId?: string;
  slotId?: string;
  [key: string]: any;
}

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setAuthSession(token: string, user: any) {
  if (typeof window === "undefined") return;
  localStorage.setItem("token", token);
  localStorage.setItem("user", JSON.stringify(user));
  localStorage.setItem("role", user.roles?.[0] || "CUSTOMER");
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && token) {
      clearAuthSession();
    }
    const errorData = await response.json().catch(() => ({}));
    const message = errorData.detail || errorData.message || `Yêu cầu thất bại (${response.status})`;
    throw new Error(message);
  }

  // Nếu HTTP 204 No Content hoặc không có body
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
    setAuthSession(res.accessToken, res.user);
    return res;
  },

  async logout(refreshToken?: string) {
    try {
      await request<any>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refreshToken: refreshToken || "" }),
      });
    } catch (e) {
      console.warn("Backend logout notification failed:", e);
    } finally {
      clearAuthSession();
    }
  },

  async forgotPassword(email: string) {
    return request<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(payload: { token: string; newPassword: string }) {
    return request<{ message: string }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(payload),
    });
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
  async getAdminUsers(params?: { role?: string; q?: string; page?: number; size?: number }) {
    const query = new URLSearchParams();
    if (params?.role && params.role !== "ALL") query.append("role", params.role);
    if (params?.q) query.append("q", params.q);
    if (params?.page !== undefined) query.append("page", String(params.page));
    if (params?.size !== undefined) query.append("size", String(params.size));
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

  // --- 5. ĐẶT LỊCH & TIẾP ĐÓN ---
  async bookAppointment(payload: any) {
    return request<any>("/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async checkIn(payload: any) {
    return request<any>("/appointments/check-in", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};
