// Quản lý và lưu trữ tọa độ GPS chính xác của các chi nhánh phòng khám MedSched
// Hỗ trợ đồng bộ giữa Admin kéo thả bản đồ, Danh mục chi nhánh, AI Booking và Google Maps Navigation

export interface BranchLocation {
  lat: number;
  lng: number;
  address?: string;
  name?: string;
  code?: string;
  updatedAt?: string;
}

const STORAGE_KEY = 'medsched_branch_locations_v1';

// Tọa độ chi nhánh do Quản trị viên lưu từ bản đồ (Không lưu cứng bất kỳ địa chỉ nào trong code)
export const DEFAULT_BRANCH_LOCATIONS: Record<string, BranchLocation> = {};

/**
 * Lấy toàn bộ danh sách tọa độ chi nhánh từ LocalStorage
 */
export function getAllBranchLocations(): Record<string, BranchLocation> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Lỗi đọc tọa độ chi nhánh từ LocalStorage:', e);
    return {};
  }
}

/**
 * Lấy tọa độ GPS đã ghim của một cơ sở theo ID hoặc Mã cơ sở (Code) từ CSDL
 */
export function getBranchLocation(idOrCode?: string, name?: string, address?: string): BranchLocation | null {
  if (!idOrCode && !name && !address) return null;
  const all = getAllBranchLocations();

  // 1. Tìm theo ID hoặc Code trực tiếp từ bản ghi DB
  const cleanKey = (idOrCode || '').trim().toUpperCase();
  if (cleanKey && all[cleanKey]) {
    return all[cleanKey];
  }

  // 2. Tìm theo key phụ (trùng code hoặc ID đã lưu)
  for (const [k, v] of Object.entries(all)) {
    if (v.code && v.code.toUpperCase() === cleanKey) return v;
    if (k.toUpperCase() === cleanKey) return v;
  }

  return null;
}

/**
 * Lưu tọa độ chi nhánh khi Quản trị viên (Admin) kéo thả ghim trên bản đồ
 */
export function saveBranchLocation(
  idOrCode: string,
  data: {
    lat: number;
    lng: number;
    address?: string;
    name?: string;
    code?: string;
  }
): void {
  if (typeof window === 'undefined' || !idOrCode) return;
  try {
    const all = getAllBranchLocations();
    const cleanKey = idOrCode.trim();
    const entry: BranchLocation = {
      lat: Number(data.lat.toFixed(6)),
      lng: Number(data.lng.toFixed(6)),
      address: data.address?.trim() || '',
      name: data.name?.trim() || '',
      code: data.code?.trim() || cleanKey,
      updatedAt: new Date().toISOString()
    };

    // Lưu theo cả ID và Code để tra cứu 2 chiều
    all[cleanKey] = entry;
    if (data.code && data.code.trim() !== cleanKey) {
      all[data.code.trim()] = entry;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));

    // Bắn Custom Event để các giao diện khác (Bảng danh mục, Modal AI) tự động làm mới
    window.dispatchEvent(new CustomEvent('medsched_branch_location_updated', {
      detail: { idOrCode: cleanKey, location: entry }
    }));
  } catch (e) {
    console.error('Lỗi lưu tọa độ chi nhánh vào LocalStorage:', e);
  }
}

/**
 * Tạo URL Google Maps dẫn đến đúng vị trí tọa độ GPS đã ghim (hoặc fallback địa chỉ)
 */
export function getBranchGoogleMapsUrl(center?: {
  id?: string;
  code?: string;
  name?: string;
  address?: string;
}): string {
  if (!center) return 'https://www.google.com/maps';
  const loc = getBranchLocation(center.id || center.code, center.name, center.address);
  if (loc && loc.lat && loc.lng) {
    return `https://www.google.com/maps/search/?api=1&query=${loc.lat},${loc.lng}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(center.address || center.name || 'MedSched Clinic')}`;
}

/**
 * Tạo URL chỉ đường Google Maps Direction đến đúng tọa độ GPS của chi nhánh
 */
export function getBranchDirectionUrl(
  center?: { id?: string; code?: string; name?: string; address?: string },
  originAddress?: string
): string {
  if (!center) return 'https://www.google.com/maps';
  const loc = getBranchLocation(center.id || center.code, center.name, center.address);
  const dest = (loc && loc.lat && loc.lng)
    ? `${loc.lat},${loc.lng}`
    : encodeURIComponent(center.address || center.name || 'MedSched Clinic');

  const originParam = originAddress && originAddress.trim()
    ? `&origin=${encodeURIComponent(originAddress.trim())}`
    : '';

  return `https://www.google.com/maps/dir/?api=1&destination=${dest}${originParam}`;
}
