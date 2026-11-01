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
  nightShift: ShiftInfo;         // Ca Đêm & Trực Cấp Cứu 24/7 (00:00 - 08:00)
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

  // Chế độ Develop 24/7: Hệ thống hoạt động liên tục 24/7 không kể giờ hành chính (mở ca đêm 00:00-08:00, ca tối 17:00-23:30, bác sĩ đặt lịch mọi lúc)
  devMode247: boolean;

  updatedAt: string;
  updatedBy?: string;
}

export const DEFAULT_CLINIC_SCHEDULE_CONFIG: ClinicScheduleConfig = {
  nightShift: {
    enabled: false,
    name: 'Ca Đêm (Trực 24/7)',
    startTime: '00:00',
    endTime: '08:00',
  },
  morningShift: {
    enabled: true,
    name: 'Ca Sáng',
    startTime: '08:00',
    endTime: '12:00',
  },
  afternoonShift: {
    enabled: true,
    name: 'Ca Chiều',
    startTime: '13:00',
    endTime: '17:00',
  },
  eveningShift: {
    enabled: false,
    name: 'Ca Tối (Ngoài giờ)',
    startTime: '17:00',
    endTime: '23:30',
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
  devMode247: false, // Mặc định tắt chế độ Develop 24/7
  updatedAt: '2026-01-01T00:00:00Z',
  updatedBy: 'Hệ Thống MedSched',
};

const SCHEDULE_CONFIG_STORAGE_KEY = 'medsched_clinic_schedule_config';
export const SCHEDULE_CONFIG_UPDATED_EVENT = 'medsched:schedule_config_updated';

// Tiện ích: Tạo danh sách 7 ngày mở đầy đủ cho chế độ 24/7
export const ALL_OPERATING_DAYS_247: OperatingDays = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: true,
  sunday: true,
};

export const STANDARD_OPERATING_DAYS: OperatingDays = {
  monday: true,
  tuesday: true,
  wednesday: true,
  thursday: true,
  friday: true,
  saturday: false,
  sunday: false,
};

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
    const merged: ClinicScheduleConfig = {
      ...DEFAULT_CLINIC_SCHEDULE_CONFIG,
      ...parsed,
      nightShift: parsed.nightShift || DEFAULT_CLINIC_SCHEDULE_CONFIG.nightShift,
    };

    // Khi chế độ Develop 24/7 đang mở, toàn bộ các khung thời gian (Đêm 00:00 - 08:00, Sáng, Chiều, Tối 17:00 - 23:30) và 7 ngày đều được tự động chọn
    if (merged.devMode247) {
      merged.operatingDays = { ...ALL_OPERATING_DAYS_247 };
      merged.nightShift = {
        ...merged.nightShift,
        enabled: true,
        startTime: merged.nightShift?.startTime || '00:00',
        endTime: merged.nightShift?.endTime || '08:00',
      };
      merged.morningShift = { ...merged.morningShift, enabled: true };
      merged.afternoonShift = { ...merged.afternoonShift, enabled: true };
      merged.eveningShift = {
        ...merged.eveningShift,
        enabled: true,
        startTime: merged.eveningShift.startTime || '17:00',
        endTime: (!merged.eveningShift.endTime || merged.eveningShift.endTime === '20:30') ? '23:30' : merged.eveningShift.endTime,
      };
    }

    return merged;
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

  // Nếu devMode247 được bật, tự động chọn tất cả 7 ngày và kích hoạt toàn bộ các ca (Đêm 00:00 - 08:00, Sáng, Chiều, Tối 17:00 - 23:30)
  if (next.devMode247) {
    next.operatingDays = { ...ALL_OPERATING_DAYS_247 };
    next.nightShift = {
      ...next.nightShift,
      enabled: true,
      startTime: next.nightShift?.startTime || '00:00',
      endTime: next.nightShift?.endTime || '08:00',
    };
    next.morningShift = { ...next.morningShift, enabled: true };
    next.afternoonShift = { ...next.afternoonShift, enabled: true };
    next.eveningShift = {
      ...next.eveningShift,
      enabled: true,
      startTime: next.eveningShift.startTime || '17:00',
      endTime: (!next.eveningShift.endTime || next.eveningShift.endTime === '20:30') ? '23:30' : next.eveningShift.endTime,
    };
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(SCHEDULE_CONFIG_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(SCHEDULE_CONFIG_UPDATED_EVENT, { detail: next }));
      try {
        const bc = new BroadcastChannel('medsched_schedule_config_sync');
        bc.postMessage({ type: 'SCHEDULE_CONFIG_UPDATED', config: next });
        bc.close();
      } catch {}
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
