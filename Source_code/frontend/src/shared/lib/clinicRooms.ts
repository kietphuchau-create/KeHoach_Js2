// Danh mục Quản lý Phòng Khám MedSched (Clinic Room Configuration)

export interface ClinicRoom {
  id: string;
  code: string;               // Ví dụ: P.101, P.205, P.208, P.209
  name: string;               // Ví dụ: Phòng Khám Nội Tổng Quát 1
  floor: string;              // Ví dụ: Tầng 1, Tầng 2
  medicalCenterName: string;  // Ví dụ: Phòng Khám Đa Khoa MedSched - Chi Nhánh Trần Đại Nghĩa
  status: 'active' | 'maintenance'; // Hoạt động / Bảo trì
  note?: string;
  assignedDoctorId?: string | null;     // ID bác sĩ phụ trách chính (hoặc null nếu là phòng dự phòng)
  assignedDoctorName?: string | null;   // Tên bác sĩ phụ trách
  specialtyName?: string | null;        // Chuyên khoa tương ứng của phòng (Da Liễu, Tim Mạch, Đa Khoa...)
  isBackupRoom?: boolean;               // true: Phòng dự phòng / chưa có bác sĩ
}

export const DEFAULT_CLINIC_ROOMS: ClinicRoom[] = [
  // 1. Chi Nhánh Trịnh Đình Thảo (ITC)
  {
    id: 'room-101',
    code: 'P.101',
    name: 'Phòng Khám Chuyên Khoa Răng Hàm Mặt',
    floor: 'Tầng 1',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trịnh Đình Thảo (ITC)',
    status: 'active',
    note: 'Bàn khám nha khoa kỹ thuật cao, máy siêu âm răng kỹ thuật số',
    assignedDoctorId: 'e1b2c3d4-0004-4000-8000-000000000004',
    assignedDoctorName: 'ThS.BS Vũ Minh Đức',
    specialtyName: 'Răng Hàm Mặt',
    isBackupRoom: false,
  },
  {
    id: 'room-102',
    code: 'P.102',
    name: 'Phòng Khám Chuyên Khoa Mắt',
    floor: 'Tầng 1',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trịnh Đình Thảo (ITC)',
    status: 'active',
    note: 'Máy đo khúc xạ giác mạc kỹ thuật số và đèn khám mắt sinh hiển vi',
    assignedDoctorId: 'e1b2c3d4-0005-4000-8000-000000000005',
    assignedDoctorName: 'BS.CKII Phạm Quỳnh Chi',
    specialtyName: 'Mắt',
    isBackupRoom: false,
  },
  {
    id: 'room-103',
    code: 'P.103',
    name: 'Phòng Khám Đa Khoa & Cấp Cứu Ban Đầu (Dự Phòng)',
    floor: 'Tầng 1',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trịnh Đình Thảo (ITC)',
    status: 'active',
    note: 'Trang bị máy đo sinh hiệu, oxy khẩn cấp và giường khám đa năng',
    assignedDoctorId: null,
    assignedDoctorName: null,
    specialtyName: 'Đa Khoa',
    isBackupRoom: true,
  },

  // 2. Chi Nhánh Trần Đại Nghĩa
  {
    id: 'room-205',
    code: 'P.205',
    name: 'Phòng Khám Chuyên Khoa Da Liễu',
    floor: 'Tầng 2',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trần Đại Nghĩa',
    status: 'active',
    note: 'Trang bị đèn soi da chuyên dụng Dermatoscope',
    assignedDoctorId: 'e1b2c3d4-0002-4000-8000-000000000002',
    assignedDoctorName: 'BS.CKII Nguyễn Minh Anh',
    specialtyName: 'Da Liễu',
    isBackupRoom: false,
  },
  {
    id: 'room-208',
    code: 'P.208',
    name: 'Phòng Khám Chuyên Khoa Nội Tổng Quát',
    floor: 'Tầng 2',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trần Đại Nghĩa',
    status: 'active',
    note: 'Bàn khám lâm sàng chất lượng cao, màn hình đọc phim X-Quang kỹ thuật số',
    assignedDoctorId: 'e1b2c3d4-0003-4000-8000-000000000003',
    assignedDoctorName: 'PGS.TS Trần Văn Hùng',
    specialtyName: 'Nội Tổng Quát',
    isBackupRoom: false,
  },
  {
    id: 'room-209',
    code: 'P.209',
    name: 'Phòng Khám Tư Vấn Chuyên Sâu & Tiền Phẫu (Dự Phòng)',
    floor: 'Tầng 2',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trần Đại Nghĩa',
    status: 'active',
    note: 'Phòng khám tiêu chuẩn VIP, cách âm phục vụ tư vấn riêng tư',
    assignedDoctorId: null,
    assignedDoctorName: null,
    specialtyName: 'Tư Vấn & Tiền Phẫu',
    isBackupRoom: true,
  },
];

const STORAGE_KEY = 'medsched_clinic_rooms_v3';
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

/**
 * Giải phóng phòng của bác sĩ sang trạng thái Phòng Dự Phòng khi Bác sĩ nghỉ việc / khóa tài khoản
 */
export function releaseDoctorRoomToBackup(doctorIdOrEmail: string, roomCode?: string): ClinicRoom | null {
  const rooms = getClinicRooms();
  let modifiedRoom: ClinicRoom | null = null;
  const targetId = (doctorIdOrEmail || '').trim().toLowerCase();
  const targetCode = (roomCode || '').trim().toUpperCase();

  const updatedRooms = rooms.map(room => {
    const isDocMatch = room.assignedDoctorId && room.assignedDoctorId.toLowerCase() === targetId;
    const isCodeMatch = targetCode && room.code.toUpperCase() === targetCode;
    
    if (isDocMatch || isCodeMatch) {
      modifiedRoom = {
        ...room,
        assignedDoctorId: null,
        assignedDoctorName: null,
        isBackupRoom: true,
      };
      return modifiedRoom;
    }
    return room;
  });

  if (modifiedRoom) {
    saveClinicRooms(updatedRooms);
  }
  return modifiedRoom;
}

/**
 * Gán Bác sĩ vào buồng khám phụ trách chính (Đảm bảo mỗi bác sĩ có 1 phòng riêng)
 */
export function assignDoctorToRoom(
  roomCode: string,
  doctor: { id?: string; fullName: string; specialtyName?: string }
): ClinicRoom | null {
  const rooms = getClinicRooms();
  let modifiedRoom: ClinicRoom | null = null;
  const cleanCode = roomCode.trim().toUpperCase();

  const updatedRooms = rooms.map(room => {
    // Nếu chính là phòng đích được gán
    if (room.code.toUpperCase() === cleanCode) {
      modifiedRoom = {
        ...room,
        assignedDoctorId: doctor.id || 'doc-' + Date.now(),
        assignedDoctorName: doctor.fullName,
        specialtyName: doctor.specialtyName || room.specialtyName,
        isBackupRoom: false,
      };
      return modifiedRoom;
    }
    // Nếu bác sĩ này trước đó đang giữ phòng khác, giải phóng phòng cũ thành dự phòng
    if (doctor.id && room.assignedDoctorId && room.assignedDoctorId === doctor.id) {
      return {
        ...room,
        assignedDoctorId: null,
        assignedDoctorName: null,
        isBackupRoom: true,
      };
    }
    return room;
  });

  saveClinicRooms(updatedRooms);
  return modifiedRoom;
}
