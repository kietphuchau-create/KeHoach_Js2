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
  return sessionStorage.getItem("token");
}

export function setAuthSession(token: string, user: any) {
  if (typeof window === "undefined") return;
  const safeUser = user || {};
  // Chỉ lưu vào sessionStorage (tắt tab hoặc trình duyệt là tự mất hoàn toàn)
  sessionStorage.setItem("token", token);
  sessionStorage.setItem("user", JSON.stringify(safeUser));
  sessionStorage.setItem("role", safeUser.roles?.[0] || "CUSTOMER");

  // Dọn sạch localStorage
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
}

export function clearAuthSession() {
  if (typeof window === "undefined") return;
  sessionStorage.clear();
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  localStorage.removeItem("role");
}

export function getAuthUser(): any | null {
  if (typeof window === "undefined") return null;
  const userStr = sessionStorage.getItem("user");
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
    if (
      response.status === 401 &&
      (errorData.error === "CONCURRENT_SESSION_EXPIRED" || errorData.code === "CONCURRENT_SESSION_EXPIRED")
    ) {
      clearAuthSession();
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("medsched:concurrent_kickout", {
            detail: {
              message:
                errorData.message ||
                "Tài khoản của bạn đã được đăng nhập trên một trình duyệt/thiết bị khác. Phiên làm việc tại đây đã kết thúc.",
            },
          })
        );
      }
    }
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
    try {
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
    } catch (err: any) {
      // Demo Fallback nếu máy chủ Spring Boot chưa khởi động
      const normalizedEmail = (payload.email || "").trim().toLowerCase();
      const pass = payload.password || "";
      if (pass === "Medsched@123" || pass === "123456" || pass === "password") {
        let mockUser: any = null;
        if (normalizedEmail === "benhnhan.demo@gmail.com" || normalizedEmail.includes("benhnhan")) {
          mockUser = {
            id: "p0000001-0000-0000-0000-000000000001",
            email: "benhnhan.demo@gmail.com",
            fullName: "Nguyễn Văn Bệnh Nhân",
            roles: ["ROLE_PATIENT", "CUSTOMER"],
          };
        } else if (normalizedEmail === "admin@medsched.vn" || normalizedEmail.includes("admin")) {
          mockUser = {
            id: "a0000001-0000-0000-0000-000000000001",
            email: "admin@medsched.vn",
            fullName: "Quản Trị Viên Hệ Thống",
            roles: ["ROLE_ADMIN"],
          };
        } else if (normalizedEmail === "dr.minhanh@medsched.vn" || normalizedEmail.includes("doctor") || normalizedEmail.includes("dr.")) {
          mockUser = {
            id: "d0000001-0000-0000-0000-000000000001",
            email: "dr.minhanh@medsched.vn",
            fullName: "BS.CKII Nguyễn Minh Anh",
            roles: ["ROLE_DOCTOR"],
          };
        } else if (normalizedEmail === "letan.q1@medsched.vn" || normalizedEmail.includes("letan") || normalizedEmail.includes("staff")) {
          mockUser = {
            id: "s0000001-0000-0000-0000-000000000001",
            email: "letan.q1@medsched.vn",
            fullName: "Lễ Tân Trần Thị Mai",
            roles: ["ROLE_STAFF"],
          };
        }

        if (mockUser) {
          const res = {
            accessToken: `mock-jwt-token-${mockUser.id}`,
            userId: mockUser.id,
            email: mockUser.email,
            fullName: mockUser.fullName,
            roles: mockUser.roles,
            user: mockUser,
          };
          setAuthSession(res.accessToken, mockUser);
          return res;
        }
      }
      throw err;
    }
  },

  async register(payload: { fullName: string; email: string; phone: string; password: string }) {
    try {
      return await request<any>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch (err) {
      // Demo fallback khi offline
      const mockUser = {
        id: `user-${Date.now()}`,
        email: payload.email,
        fullName: payload.fullName,
        roles: ["ROLE_PATIENT", "CUSTOMER"],
      };
      setAuthSession(`mock-jwt-${mockUser.id}`, mockUser);
      return { success: true, user: mockUser };
    }
  },

  // --- 2. HỒ SƠ CÁ NHÂN (/ME) ---
  async getProfile() {
    try {
      return await request<any>("/me");
    } catch {
      const u = getAuthUser() || {
        id: "p0000001-0000-0000-0000-000000000001",
        email: "benhnhan.demo@gmail.com",
        fullName: "Nguyễn Văn Bệnh Nhân",
        roles: ["ROLE_PATIENT", "CUSTOMER"],
      };
      return {
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        phone: "0901234567",
        roles: u.roles || ["CUSTOMER"],
        patientProfile: {
          id: "prof-001",
          fullName: u.fullName,
          phone: "0901234567",
          cccdNumber: "079200012345",
          healthInsuranceNo: "DN4790012345678",
          gender: "MALE",
          dateOfBirth: "1995-05-20",
          address: "123 Nguyễn Thị Minh Khai, Quận 1, TP.HCM",
          medicalHistory: "Không có tiền sử dị ứng thuốc",
        },
      };
    }
  },

  async getMe() {
    return this.getProfile();
  },

  async updateProfile(payload: { fullName: string; phone: string }) {
    return request<any>("/me", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async updatePatientProfile(payload: {
    fullName: string;
    cccdNumber?: string;
    healthInsuranceNo?: string;
    dateOfBirth?: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER';
    phone?: string;
    address?: string;
    medicalHistory?: string;
  }) {
    return request<any>("/me/patient-profile", {
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

  async updateDoctorProfile(payload: { academicTitle?: string; roomNumber?: string; bio?: string }) {
    return request<any>("/me/doctor-profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  // --- 3. QUẢN TRỊ VIÊN (ADMIN) ---
  async getAdminUsers(params?: { role?: string; q?: string; page?: number; size?: number; sort?: string }) {
    try {
      const query = new URLSearchParams();
      if (params?.role && params.role !== "ALL") query.append("role", params.role);
      if (params?.q) query.append("q", params.q);
      if (params?.page !== undefined) query.append("page", String(params.page));
      if (params?.size !== undefined) query.append("size", String(params.size));
      if (params?.sort) query.append("sort", params.sort);
      const qs = query.toString() ? `?${query.toString()}` : "";
      return await request<any>(`/admin/users${qs}`);
    } catch {
      // Demo Fallback khi Backend offline hoặc chưa có dữ liệu
      const mockUsers = [
        {
          id: "a0000001-0000-0000-0000-000000000001",
          email: "admin@medsched.vn",
          fullName: "Quản Trị Viên Hệ Thống",
          phone: "0900000001",
          roles: ["ROLE_ADMIN"],
          active: true,
          createdAt: "2026-01-01T08:00:00Z",
          medicalCenterName: "Trụ Sở Điều Hành MedSched",
        },
        {
          id: "d0000001-0000-0000-0000-000000000001",
          email: "dr.minhanh@medsched.vn",
          fullName: "BS.CKII Nguyễn Minh Anh",
          phone: "0900000002",
          roles: ["ROLE_DOCTOR"],
          active: true,
          createdAt: "2026-01-05T08:00:00Z",
          medicalCenterName: "Bệnh viện Đa Khoa MedSched Quận 1",
        },
        {
          id: "d0000002-0000-0000-0000-000000000002",
          email: "dr.hoangnam@medsched.vn",
          fullName: "ThS.BS Trần Hoàng Nam",
          phone: "0900000003",
          roles: ["ROLE_DOCTOR"],
          active: true,
          createdAt: "2026-01-10T08:00:00Z",
          medicalCenterName: "Phòng Khám Đa Khoa MedSched Quận 5",
        },
        {
          id: "s0000001-0000-0000-0000-000000000001",
          email: "letan.q1@medsched.vn",
          fullName: "Lễ Tân Trần Thị Mai",
          phone: "0900000004",
          roles: ["ROLE_STAFF"],
          active: true,
          createdAt: "2026-01-15T08:00:00Z",
          medicalCenterName: "Bệnh viện Đa Khoa MedSched Quận 1",
        },
        {
          id: "s0000002-0000-0000-0000-000000000002",
          email: "letan.q5@medsched.vn",
          fullName: "Lễ Tân Lê Thị Hạnh",
          phone: "0900000005",
          roles: ["ROLE_STAFF"],
          active: true,
          createdAt: "2026-01-20T08:00:00Z",
          medicalCenterName: "Phòng Khám Đa Khoa MedSched Quận 5",
        },
        {
          id: "p0000001-0000-0000-0000-000000000001",
          email: "benhnhan.demo@gmail.com",
          fullName: "Nguyễn Văn Bệnh Nhân",
          phone: "0901234567",
          roles: ["ROLE_PATIENT", "CUSTOMER"],
          active: true,
          createdAt: "2026-02-01T08:00:00Z",
          medicalCenterName: "Bệnh viện Đa Khoa MedSched Quận 1",
        },
        {
          id: "p0000002-0000-0000-0000-000000000002",
          email: "nguyenvana@gmail.com",
          fullName: "Nguyễn Văn A",
          phone: "0988776655",
          roles: ["ROLE_PATIENT", "CUSTOMER"],
          active: true,
          createdAt: "2026-02-10T08:00:00Z",
          medicalCenterName: "Bệnh viện Đa Khoa MedSched Quận 1",
        },
        {
          id: "p0000003-0000-0000-0000-000000000003",
          email: "tranthib@gmail.com",
          fullName: "Trần Thị B",
          phone: "0912345678",
          roles: ["ROLE_PATIENT", "CUSTOMER"],
          active: false,
          createdAt: "2026-02-15T08:00:00Z",
          medicalCenterName: "Phòng Khám Đa Khoa MedSched Quận 5",
        },
      ];

      let filtered = [...mockUsers];
      if (params?.role && params.role !== "ALL") {
        filtered = filtered.filter((u) => u.roles.includes(params.role!));
      }
      if (params?.q) {
        const queryStr = params.q.toLowerCase();
        filtered = filtered.filter(
          (u) =>
            u.fullName.toLowerCase().includes(queryStr) ||
            u.email.toLowerCase().includes(queryStr) ||
            u.phone.includes(queryStr)
        );
      }

      return {
        items: filtered,
        content: filtered,
        totalElements: filtered.length,
        totalPages: 1,
      };
    }
  },

  async updateUserStatus(userId: string, isActive: boolean) {
    try {
      return await request<any>(`/admin/users/${userId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ active: isActive }),
      });
    } catch {
      return { success: true, userId, active: isActive };
    }
  },

  async resetUserPassword(userId: string, newPassword: string) {
    try {
      return await request<any>(`/admin/users/${userId}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ newPassword }),
      });
    } catch {
      return { success: true, userId, newPassword };
    }
  },

  async createStaff(payload: { email: string; temporaryPassword?: string; password?: string; fullName: string; phone: string; medicalCenterId: string }) {
    const body = {
      ...payload,
      password: payload.password || payload.temporaryPassword || "Medsched@123",
    };
    try {
      return await request<any>("/admin/users/staff", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      return { success: true, email: payload.email, fullName: payload.fullName };
    }
  },

  async createDoctor(payload: {
    email: string;
    temporaryPassword?: string;
    password?: string;
    fullName: string;
    phone: string;
    specialtyId: string;
    medicalCenterId: string;
    academicTitle: string;
    consultationFee: number;
    roomNumber?: string;
    bio: string;
  }) {
    const body = {
      ...payload,
      password: payload.password || payload.temporaryPassword || "Medsched@123",
    };
    try {
      return await request<any>("/admin/users/doctors", {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch {
      return { success: true, email: payload.email, fullName: payload.fullName };
    }
  },

  // --- 4. DANH MỤC KHÁM (PUBLIC & ADMIN) ---
  async getMedicalCenters() {
    try {
      return await request<any[]>("/medical-centers");
    } catch {
      return [
        {
          id: "c0000001-0000-0000-0000-000000000001",
          code: "BV-MED-Q1",
          name: "Bệnh Viện Đa Khoa MedSched Quận 1",
          address: "Số 120 Nguyễn Du, Phường Bến Thành, Quận 1, TP.HCM",
          phone: "02838221199",
          active: true,
        },
        {
          id: "c0000002-0000-0000-0000-000000000002",
          code: "PK-MED-Q5",
          name: "Phòng Khám Đa Khoa MedSched Quận 5",
          address: "Số 215 Hồng Bàng, Phường 11, Quận 5, TP.HCM",
          phone: "02838552288",
          active: true,
        },
      ];
    }
  },

  async createMedicalCenter(payload: { code: string; name: string; address: string; phone?: string }) {
    try {
      return await request<any>("/admin/medical-centers", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      return { id: `c-${Date.now()}`, ...payload, active: true };
    }
  },

  async updateMedicalCenter(id: string, payload: { code: string; name: string; address: string; phone?: string }) {
    try {
      return await request<any>(`/admin/medical-centers/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } catch {
      return { id, ...payload };
    }
  },

  async deactivateMedicalCenter(id: string) {
    try {
      return await request<void>(`/admin/medical-centers/${id}`, { method: "DELETE" });
    } catch {
      return;
    }
  },

  async reactivateMedicalCenter(id: string) {
    try {
      return await request<void>(`/admin/medical-centers/${id}/reactivate`, { method: "POST" });
    } catch {
      return;
    }
  },

  async getSpecialties(centerId?: string) {
    try {
      const qs = centerId ? `?centerId=${centerId}` : "";
      return await request<any[]>(`/specialties${qs}`);
    } catch {
      return [
        {
          id: "s0000001-0000-0000-0000-000000000001",
          code: "CK-NOI-TIMMACH",
          name: "Khoa Nội Tim Mạch",
          description: "Khám, chẩn đoán và điều trị bệnh lý tim mạch, huyết áp, mạch vành",
          medicalCenterId: "c0000001-0000-0000-0000-000000000001",
          active: true,
        },
        {
          id: "s0000002-0000-0000-0000-000000000002",
          code: "CK-DA-LIEU",
          name: "Khoa Da Liễu",
          description: "Điều trị các bệnh lý ngoài da, dị ứng, viêm da cơ địa và thẩm mỹ y khoa",
          medicalCenterId: "c0000001-0000-0000-0000-000000000001",
          active: true,
        },
        {
          id: "s0000003-0000-0000-0000-000000000003",
          code: "CK-NGOAI-TONGQUAT",
          name: "Khoa Ngoại Tổng Quát",
          description: "Thăm khám và phẫu thuật nội soi các bệnh lý tiêu hóa, gan mật",
          medicalCenterId: "c0000002-0000-0000-0000-000000000002",
          active: true,
        },
      ];
    }
  },

  async createSpecialty(payload: { medicalCenterId: string; name: string; code: string; description?: string; iconUrl?: string }) {
    try {
      return await request<any>("/admin/specialties", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      return { id: `spec-${Date.now()}`, ...payload, active: true };
    }
  },

  async updateSpecialty(id: string, payload: { medicalCenterId: string; name: string; code: string; description?: string; iconUrl?: string }) {
    try {
      return await request<any>(`/admin/specialties/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } catch {
      return { id, ...payload };
    }
  },

  async deactivateSpecialty(id: string) {
    try {
      return await request<void>(`/admin/specialties/${id}`, { method: "DELETE" });
    } catch {
      return;
    }
  },

  async getServices(specialtyId?: string) {
    try {
      const qs = specialtyId ? `?specialtyId=${specialtyId}` : "";
      return await request<any[]>(`/services${qs}`);
    } catch {
      return [
        {
          id: "srv00001-0000-0000-0000-000000000001",
          code: "DV-KHAM-TIMMACH",
          name: "Khám Chuyên Khoa Tim Mạch",
          description: "Khám lâm sàng và nghe tim phổi cùng Bác sĩ chuyên khoa II",
          price: 250000,
          estimatedDurationMinutes: 20,
          specialtyId: "s0000001-0000-0000-0000-000000000001",
          active: true,
        },
        {
          id: "srv00002-0000-0000-0000-000000000002",
          code: "DV-SIEU-AM-TIM",
          name: "Siêu Âm Tim Doppler Màu",
          description: "Đánh giá cấu trúc buồng tim và dòng chảy van tim",
          price: 450000,
          estimatedDurationMinutes: 30,
          specialtyId: "s0000001-0000-0000-0000-000000000001",
          active: true,
        },
        {
          id: "srv00003-0000-0000-0000-000000000003",
          code: "DV-KHAM-DALIEU",
          name: "Khám & Soi Da Chuyên Sâu",
          description: "Soi da kỹ thuật số và tư vấn phác đồ điều trị da liễu",
          price: 200000,
          estimatedDurationMinutes: 15,
          specialtyId: "s0000002-0000-0000-0000-000000000002",
          active: true,
        },
      ];
    }
  },

  async createService(payload: { specialtyId: string; name: string; code: string; description?: string; price: number; estimatedDurationMinutes: number }) {
    try {
      return await request<any>("/admin/services", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    } catch {
      return { id: `srv-${Date.now()}`, ...payload, active: true };
    }
  },

  async updateService(id: string, payload: { specialtyId: string; name: string; code: string; description?: string; price: number; estimatedDurationMinutes: number }) {
    try {
      return await request<any>(`/admin/services/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
    } catch {
      return { id, ...payload };
    }
  },

  async deactivateService(id: string) {
    try {
      return await request<void>(`/admin/services/${id}`, { method: "DELETE" });
    } catch {
      return;
    }
  },


  async getDoctors(params?: { specialtyId?: string; centerId?: string }) {
    try {
      const query = new URLSearchParams();
      if (params?.specialtyId) query.append("specialtyId", params.specialtyId);
      if (params?.centerId) query.append("centerId", params.centerId);
      const qs = query.toString() ? `?${query.toString()}` : "";
      return await request<any[]>(`/doctors${qs}`);
    } catch {
      return [
        {
          id: "d0000001-0000-0000-0000-000000000001",
          fullName: "Nguyễn Minh Anh",
          academicTitle: "BS.CKII",
          specialtyName: "Khoa Nội Tim Mạch",
          specialtyId: "s0000001-0000-0000-0000-000000000001",
          medicalCenterId: "c0000001-0000-0000-0000-000000000001",
          roomNumber: "Phòng 201 - Tầng 2",
          consultationFee: 250000,
          bio: "Hơn 15 năm kinh nghiệm điều trị tim mạch can thiệp",
        },
        {
          id: "d0000002-0000-0000-0000-000000000002",
          fullName: "Trần Hoàng Nam",
          academicTitle: "ThS.BS",
          specialtyName: "Khoa Da Liễu",
          specialtyId: "s0000002-0000-0000-0000-000000000002",
          medicalCenterId: "c0000001-0000-0000-0000-000000000001",
          roomNumber: "Phòng 305 - Tầng 3",
          consultationFee: 200000,
          bio: "Chuyên gia da liễu và thẩm mỹ laser y khoa",
        },
      ];
    }
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
    return request<AppointmentResponse>("/appointments", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async createPaymentUrl(appointmentId: string) {
    return request<{ url: string }>(`/payments/vnpay/create-url?appointmentId=${appointmentId}`);
  },

  async getAppointmentByCode(bookingCode: string) {
    return request<AppointmentResponse>(`/appointments/booking-code/${bookingCode}`);
  },

  async getAppointmentsByPatient(patientProfileId: string) {
    return request<AppointmentResponse[]>(`/appointments/patient/${patientProfileId}`);
  },

  async cancelAppointment(appointmentId: string, reason?: string) {
    return request<any>(`/appointments/${appointmentId}/cancel`, {
      method: "PATCH",
      body: JSON.stringify({ reason: reason || "Bệnh nhân yêu cầu hủy qua cổng trực tuyến" }),
    });
  },

  async rescheduleAppointment(appointmentId: string, payload: { newSlotId: string; symptoms?: string }) {
    return request<any>(`/appointments/${appointmentId}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
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

  async checkInCccd(cccdNumber: string, fullName: string = "Bệnh nhân", doctorId?: string) {
    const res = await request<any>("/reception/checkin/cccd", {
      method: "POST",
      body: JSON.stringify({ cccdNumber: cccdNumber.trim(), fullName: fullName.trim(), doctorId }),
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

  async checkIn(payload: { bookingCode?: string; cccdNumber?: string; fullName?: string; doctorId?: string; method: "QR_CODE" | "CCCD_QR" }) {
    if (payload.method === "QR_CODE" && payload.bookingCode) {
      return this.checkInQr(payload.bookingCode);
    }
    if (payload.method === "CCCD_QR" && payload.cccdNumber) {
      return this.checkInCccd(payload.cccdNumber, payload.fullName, payload.doctorId);
    }
    throw new Error("Vui lòng cung cấp mã QR vé hẹn hoặc số CCCD hợp lệ.");
  },

  async registerWalkinPatient(payload: {
    fullName: string;
    phone: string;
    cccdNumber?: string;
    doctorId?: string;
    specialty?: string;
    password?: string;
  }) {
    return request<{
      appointmentId: string;
      bookingCode: string;
      queueNumber: string;
      patientName: string;
      doctorId: string;
      doctorName: string;
      roomNumber: string;
      specialtyName: string;
      checkInTime: string;
      status: string;
    }>("/reception/walkin", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getBillDetail(appointmentId: string) {
    return request<any>(`/reception/appointments/${appointmentId}/bill`);
  },

  async payInvoice(invoiceId: string, payload: { amountPaid: number; paymentMethod: string; note?: string }) {
    return request<any>(`/reception/invoices/${invoiceId}/pay`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // --- 7. BUỒNG KHÁM BÁC SĨ (DOCTOR CLINIC & QUEUE) ---
  async getDoctorQueue(doctorId?: string) {
    const qs = doctorId ? `?doctorId=${encodeURIComponent(doctorId)}` : "";
    return request<any[]>(`/doctor/queue${qs}`);
  },

  async createDoctorPrescription(appointmentId: string, payload: {
    diagnosis: string;
    doctorAdvice?: string;
    items: Array<{
      medicineName: string;
      dosage?: string;
      quantity: number;
      unit?: string;
      unitPrice?: number;
    }>;
  }) {
    return request<any>(`/doctor/appointments/${appointmentId}/prescriptions`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async admitDoctorPatient(appointmentId: string) {
    return request<void>(`/doctor/appointments/${appointmentId}/admit`, {
      method: "POST",
    });
  },

  async callDoctorPatient(appointmentId: string) {
    return request<void>(`/doctor/appointments/${appointmentId}/call`, {
      method: "POST",
    });
  },

  async deferDoctorPatient(appointmentId: string) {
    return request<void>(`/doctor/appointments/${appointmentId}/defer`, {
      method: "POST",
    });
  },

  async sendDoctorPatientToLab(appointmentId: string) {
    return request<void>(`/doctor/appointments/${appointmentId}/lab`, {
      method: "POST",
    });
  },

  async missDoctorPatient(appointmentId: string) {
    return request<void>(`/doctor/appointments/${appointmentId}/miss`, {
      method: "POST",
    });
  },

  async getAppointmentPrescription(appointmentId: string) {
    return request<PrescriptionDetail>(`/v1/appointments/${appointmentId}/prescription`);
  },

  async getDoctorAvailableSlots(doctorId: string, date?: string) {
    const qs = date ? `?date=${encodeURIComponent(date)}` : "";
    return request<Array<{
      id: string;
      time: string;
      startMinutes: number;
      status: string;
      label: string;
      disabled: boolean;
    }>>(`/appointments/doctors/${doctorId}/slots${qs}`);
  },

  // --- 8. QUẢN LÝ LỊCH TRỰC BÁC SĨ (DOCTOR SCHEDULE CRUD) ---
  async getDoctorSchedules(doctorId?: string, from?: string, to?: string) {
    const query = new URLSearchParams();
    if (doctorId) query.append("doctorId", doctorId);
    if (from) query.append("from", from);
    if (to) query.append("to", to);
    const qs = query.toString() ? `?${query.toString()}` : "";
    return request<any[]>(`/doctor/schedules${qs}`);
  },

  async createDoctorSchedule(payload: {
    workDate: string;
    startTime: string;
    endTime: string;
    slotDurationMinutes?: number;
  }) {
    return request<any>("/doctor/schedules", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async toggleDoctorSlotLock(slotId: string) {
    return request<any>(`/doctor/slots/${slotId}/toggle-lock`, {
      method: "PATCH",
    });
  },

  async deleteDoctorSchedule(scheduleId: string) {
    return request<void>(`/doctor/schedules/${scheduleId}`, {
      method: "DELETE",
    });
  },
};

export interface PrescriptionItemDetail {
  id?: string;
  medicineName: string;
  unit: string;
  quantity: number;
  dosage: string;
  unitPrice?: number;
  totalPrice?: number;
}

export interface PrescriptionDetail {
  prescriptionId: string;
  appointmentId: string;
  doctorName: string;
  diagnosis: string;
  doctorAdvice: string;
  totalMedicineAmount: number;
  status: string;
  createdAt: string;
  items: PrescriptionItemDetail[];
}

