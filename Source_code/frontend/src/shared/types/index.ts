// ==========================================================================
// MEDSCHED SYSTEM - CENTRALIZED TYPE DEFINITIONS
// Kế thừa kiến trúc chuẩn Types từ hệ thống Baseline ITC
// ==========================================================================

export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  roles: string[];
}

export type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'WAITING'
  | 'IN_CONSULTATION'
  | 'WAITING_RESULTS'
  | 'COMPLETED'
  | 'DEFERRED'
  | 'CANCELLED'
  | 'MISSED_CALL'
  | 'TRANSFERRED';

export interface AppointmentResponse {
  id?: string;
  bookingCode: string;
  queueNumber?: number | string;
  aiSummary?: string;
  status?: AppointmentStatus | string;
  checkInTime?: string;
  doctorId?: string;
  patientProfileId?: string;
  slotId?: string;
  patientSymptoms?: string;
  [key: string]: any;
}

export interface PatientQueueItem {
  id: string;
  queueNumber: number;
  patientName: string;
  gender: string;
  birthYear: number;
  phone: string;
  cccd?: string;
  symptoms: string;
  aiSummary: string;
  status: AppointmentStatus;
  bookingCode: string;
  room?: string;
  doctorName?: string;
  timeSlot?: string;
  originalIndex?: number;
}

export interface MedicineItem {
  id?: string;
  medicineName: string;
  dosage: string;
  quantity: number | string;
  unit: string;
  unitPrice: number;
}

export interface PrescriptionDetail {
  prescriptionId?: string;
  diagnosis?: string;
  doctorAdvice?: string;
  createdAt?: string;
  items: MedicineItem[];
}

export interface MedicalCenterItem {
  id: string;
  name: string;
  address?: string;
  phone?: string;
}

export interface SpecialtyItem {
  id: string;
  name: string;
  code?: string;
  description?: string;
}

export interface MedicalServiceItem {
  id: string;
  name: string;
  price: number;
  category?: string;
}

// ── UI Design Tokens & Component Props Types ──
export type BadgeVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'purple'
  | 'secondary'
  | 'neutral';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'
  | 'success';

export type ComponentSize = 'sm' | 'md' | 'lg';
