// Danh mục Quản lý Phòng Khám MedSched (Clinic Room Configuration)

export interface ClinicRoom {
  id: string;
  code: string;               // Ví dụ: P.101, P.205, P.208, P.209
  name: string;               // Ví dụ: Phòng Khám Nội Tổng Quát 1
  floor: string;              // Ví dụ: Tầng 1, Tầng 2
  medicalCenterName: string;  // Ví dụ: Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 1
  status: 'active' | 'maintenance'; // Hoạt động / Bảo trì
  note?: string;
}

export const DEFAULT_CLINIC_ROOMS: ClinicRoom[] = [
  {
    id: 'room-101',
    code: 'P.101',
    name: 'Phòng Khám Đa Khoa & Cấp Cứu Ban Đầu',
    floor: 'Tầng 1',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 7',
    status: 'active',
    note: 'Trang bị máy đo sinh hiệu, oxy khẩn cấp và giường khám đa năng',
  },
  {
    id: 'room-102',
    code: 'P.102',
    name: 'Phòng Khám Chuyên Khoa Da Liễu Thẩm Mỹ',
    floor: 'Tầng 1',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 7',
    status: 'active',
    note: 'Trang bị đèn soi da chuyên dụng Dermatoscope',
  },
  {
    id: 'room-205',
    code: 'P.205',
    name: 'Phòng Khám Tim Mạch & Can Thiệp Lâm Sàng',
    floor: 'Tầng 2',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 1',
    status: 'active',
    note: 'Trang bị máy điện tim ECG 12 chuyển đạo',
  },
  {
    id: 'room-208',
    code: 'P.208',
    name: 'Phòng Khám Nội Tổng Quát & Tiêu Hóa',
    floor: 'Tầng 2',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 1',
    status: 'active',
    note: 'Bàn khám lâm sàng chất lượng cao, màn hình đọc phim X-Quang kỹ thuật số',
  },
  {
    id: 'room-209',
    code: 'P.209',
    name: 'Phòng Khám Tư Vấn Chuyên Sâu & Tiền Phẫu',
    floor: 'Tầng 2',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Quận 1',
    status: 'active',
    note: 'Phòng khám tiêu chuẩn VIP, cách âm phục vụ tư vấn riêng tư',
  },
];

const STORAGE_KEY = 'medsched_clinic_rooms_v1';
export const ROOMS_UPDATED_EVENT = 'medsched_clinic_rooms_updated';

export function getClinicRooms(): ClinicRoom[] {
  if (typeof window === 'undefined') return DEFAULT_CLINIC_ROOMS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CLINIC_ROOMS));
      return DEFAULT_CLINIC_ROOMS;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CLINIC_ROOMS));
      return DEFAULT_CLINIC_ROOMS;
    }
    return parsed;
  } catch {
    return DEFAULT_CLINIC_ROOMS;
  }
}

export function saveClinicRooms(rooms: ClinicRoom[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
    window.dispatchEvent(new Event(ROOMS_UPDATED_EVENT));
  } catch (e) {
    console.error('Error saving clinic rooms:', e);
  }
}

export function addClinicRoom(room: Omit<ClinicRoom, 'id'>): ClinicRoom {
  const rooms = getClinicRooms();
  const newRoom: ClinicRoom = {
    ...room,
    id: 'room-' + Date.now(),
    code: room.code.trim().toUpperCase(),
  };
  rooms.push(newRoom);
  saveClinicRooms(rooms);
  return newRoom;
}

export function updateClinicRoom(id: string, updated: Partial<ClinicRoom>): void {
  const rooms = getClinicRooms();
  const index = rooms.findIndex((r) => r.id === id);
  if (index !== -1) {
    rooms[index] = { 
      ...rooms[index], 
      ...updated,
      code: updated.code ? updated.code.trim().toUpperCase() : rooms[index].code 
    };
    saveClinicRooms(rooms);
  }
}

export function deleteClinicRoom(id: string): void {
  const rooms = getClinicRooms();
  const filtered = rooms.filter((r) => r.id !== id);
  saveClinicRooms(filtered);
}

export function toggleClinicRoomStatus(id: string): void {
  const rooms = getClinicRooms();
  const target = rooms.find((r) => r.id === id);
  if (target) {
    target.status = target.status === 'active' ? 'maintenance' : 'active';
    saveClinicRooms(rooms);
  }
}
