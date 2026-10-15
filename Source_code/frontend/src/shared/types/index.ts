export interface UserSession {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  roles: string[];
}

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
