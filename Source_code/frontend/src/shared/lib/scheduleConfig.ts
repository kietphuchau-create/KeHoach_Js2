// Quản lý Cấu hình Giờ Khám & Ca Trực Toàn Viện MedSched (Clinic Shift Configuration)

export interface ShiftInfo {
  enabled: boolean;
  name: string;
  startTime: string; // HH:mm (VD: "07:30")
  endTime: string;   // HH:mm (VD: "11:30")
}

export interface OperatingDays {
  monday: boolean;
  tuesday: boolean;
  wednesday: boolean;
  thursday: boolean;
  friday: boolean;
  saturday: boolean;
  sunday: boolean;
}

export interface ClinicScheduleConfig {
  morningShift: ShiftInfo;
  afternoonShift: ShiftInfo;
  eveningShift: ShiftInfo;
  slotDurationMinutes: number;   // 15, 20, 30, 45, 60
  bufferMinutes: number;         // 0, 5, 10
  maxPatientsPerSlot: number;    // 1, 2
  operatingDays: OperatingDays;
  autoScheduleDaysAhead: number; // Sinh lịch trước bao nhiêu ngày (mặc định 7 ngày)

  // Cấu hình tiếp đón & xen kẽ khách vãng lai (Walk-in Interleaving Protocol)
  walkinInterleaveEnabled: boolean;     // Bật/tắt tính năng chen ngang/xen kẽ khách vãng lai
  walkinMinBufferMinutes: number;       // Khoảng trống tối thiểu trước ca hẹn kế tiếp để cho phép chen vãng lai (mặc định 15 phút)
  walkinMaxPerShift: number;            // Số ca vãng lai tối đa được phép chen trong mỗi ca trực (0 = không giới hạn, mặc định 6)

  // Chế độ xếp lịch: Tự động toàn viện vs Bác sĩ tự đặt thủ công (Demo)
  autoScheduleEnabled: boolean;         // true = Tự động sinh lịch 7 ngày; false = Bác sĩ tự đặt lịch thủ công
  minWorkHoursPerDay: number;           // Số giờ tối thiểu bác sĩ phải xếp trong 1 ngày trước khi mở ngày tiếp theo (mặc định 6)

  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_CLINIC_SCHEDULE_CONFIG: ClinicScheduleConfig = {
  morningShift: {
    enabled: true,
    name: 'Ca Sáng',
    startTime: '08:00',
    endTime: '12:00',
  },
  afternoonShift: {
    enabled: true,
    name: 'Ca Chiều',
    startTime: '13:30',
    endTime: '17:00',
  },
  eveningShift: {
    enabled: false,
    name: 'Ca Tối (Ngoài giờ)',
    startTime: '17:30',
    endTime: '20:30',
  },
  slotDurationMinutes: 30,
  bufferMinutes: 0,
  maxPatientsPerSlot: 1,
  operatingDays: {
    monday: true,
    tuesday: true,
    wednesday: true,
    thursday: true,
    friday: true,
    saturday: false,
    sunday: false,
  },
  autoScheduleDaysAhead: 7,
  walkinInterleaveEnabled: true,
  walkinMinBufferMinutes: 15,
  walkinMaxPerShift: 6,
  autoScheduleEnabled: false, // Mặc định mở chế độ Thủ công theo kịch bản demo
  minWorkHoursPerDay: 6,
  updatedAt: '2026-01-01T00:00:00Z',
  updatedBy: 'Hệ Thống MedSched',
};

const SCHEDULE_CONFIG_STORAGE_KEY = 'medsched_clinic_schedule_config';
export const SCHEDULE_CONFIG_UPDATED_EVENT = 'medsched:schedule_config_updated';

// Lấy cấu hình ca khám hiện tại
export function getClinicScheduleConfig(): ClinicScheduleConfig {
  if (typeof window === 'undefined') return DEFAULT_CLINIC_SCHEDULE_CONFIG;
  try {
    const raw = localStorage.getItem(SCHEDULE_CONFIG_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(SCHEDULE_CONFIG_STORAGE_KEY, JSON.stringify(DEFAULT_CLINIC_SCHEDULE_CONFIG));
      return DEFAULT_CLINIC_SCHEDULE_CONFIG;
    }
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CLINIC_SCHEDULE_CONFIG, ...parsed };
  } catch (e) {
    console.error('Lỗi đọc cấu hình ca khám:', e);
    return DEFAULT_CLINIC_SCHEDULE_CONFIG;
  }
}

// Lưu cấu hình ca khám mới
export function saveClinicScheduleConfig(
  config: Partial<ClinicScheduleConfig>,
  actorName: string = 'Quản Trị Viên'
): ClinicScheduleConfig {
  const current = getClinicScheduleConfig();
  const next: ClinicScheduleConfig = {
    ...current,
    ...config,
    updatedAt: new Date().toISOString(),
    updatedBy: actorName,
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SCHEDULE_CONFIG_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(SCHEDULE_CONFIG_UPDATED_EVENT, { detail: next }));
    } catch (e) {
      console.error('Lỗi ghi cấu hình ca khám vào localStorage:', e);
    }
  }

  return next;
}

// Hàm tiện ích: Tính toán danh sách khung giờ (slots) sinh ra từ một ca khám
export function calculateSlotsForShift(
  startTimeStr: string,
  endTimeStr: string,
  durationMinutes: number
): { startTime: string; endTime: string }[] {
  if (!startTimeStr || !endTimeStr || durationMinutes <= 0) return [];

  const [startH, startM] = startTimeStr.split(':').map(Number);
  const [endH, endM] = endTimeStr.split(':').map(Number);

  const startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  const slots: { startTime: string; endTime: string }[] = [];
  let current = startTotal;

  while (current + durationMinutes <= endTotal) {
    const slotStartH = Math.floor(current / 60);
    const slotStartM = current % 60;
    const slotEndH = Math.floor((current + durationMinutes) / 60);
    const slotEndM = (current + durationMinutes) % 60;

    const pad = (n: number) => String(n).padStart(2, '0');
    slots.push({
      startTime: `${pad(slotStartH)}:${pad(slotStartM)}`,
      endTime: `${pad(slotEndH)}:${pad(slotEndM)}`,
    });

    current += durationMinutes;
  }

  return slots;
}
