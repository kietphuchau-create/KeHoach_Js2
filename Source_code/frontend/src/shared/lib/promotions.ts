import { api } from '@/shared/lib/api';
import { getLocalDateString } from '@/shared/lib/formatters';

export type DiscountType = 'FREE_DEPOSIT' | 'FIX_TO_2K' | 'PERCENT' | 'FIXED';

export interface Promotion {
  id: string;
  code: string;               // Mã voucher (VD: GIAOVIEN, MEDFREE, DEMO2K, HE2026, MEDVIP)
  name: string;               // Tên chương trình ưu đãi
  description: string;        // Mô tả chi tiết
  discountType: DiscountType; // FREE_DEPOSIT (0đ cọc), FIX_TO_2K (chỉ 2.000đ demo), PERCENT (giảm %), FIXED (giảm số tiền)
  discountValue: number;      // Giá trị (100 với FREE_DEPOSIT, 2000 với FIX_TO_2K, 20 với 20%, 30000 với 30.000đ)
  maxUses?: number;           // Số lượt dùng tối đa (null = không giới hạn)
  usedCount: number;          // Số lượt đã sử dụng
  startDate: string;          // Ngày bắt đầu (YYYY-MM-DD)
  endDate: string;            // Ngày kết thúc (YYYY-MM-DD)
  status: 'active' | 'inactive'; // Đang chạy / Tạm dừng
  targetAudience?: string;    // Đối tượng áp dụng (Toàn bộ bệnh nhân, Giảng viên...)
  createdAt: string;
}

export const DEFAULT_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-free',
    code: 'FREE',
    name: 'ĐẶC QUYỀN DEV',
    description: 'ĐẶC QUYỀN DEV',
    discountType: 'FREE_DEPOSIT',
    discountValue: 100,
    maxUses: 9999,
    usedCount: 0,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'active',
    targetAudience: 'Toàn bộ bệnh nhân',
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'promo-code2k',
    code: 'CODE2K',
    name: 'DÀNH CHO DEV',
    description: 'TOÀN BỘ CHUYỂN KHOẢN ĐỒNG GIÁ 2K',
    discountType: 'FIX_TO_2K',
    discountValue: 2000,
    maxUses: 9999,
    usedCount: 0,
    startDate: '2026-01-01',
    endDate: '2026-12-31',
    status: 'active',
    targetAudience: 'Toàn bộ bệnh nhân',
    createdAt: '2026-01-01T00:00:00Z',
  },
];

const PROMOTIONS_STORAGE_KEY = 'medsched_promotions';
export const PROMOTIONS_UPDATED_EVENT = 'medsched:promotions_updated';

// Lấy danh sách mã khuyến mãi
export function getPromotions(): Promotion[] {
  if (typeof window === 'undefined') return DEFAULT_PROMOTIONS;
  try {
    const raw = localStorage.getItem(PROMOTIONS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(PROMOTIONS_STORAGE_KEY, JSON.stringify(DEFAULT_PROMOTIONS));
      return DEFAULT_PROMOTIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PROMOTIONS;
  } catch (e) {
    console.error('Lỗi đọc danh sách mã khuyến mãi:', e);
    return DEFAULT_PROMOTIONS;
  }
}

// Lưu danh sách mã khuyến mãi
function savePromotions(promotions: Promotion[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PROMOTIONS_STORAGE_KEY, JSON.stringify(promotions));
    window.dispatchEvent(new CustomEvent(PROMOTIONS_UPDATED_EVENT, { detail: promotions }));
  } catch (e) {
    console.error('Lỗi ghi mã khuyến mãi vào localStorage:', e);
  }
}

// Thêm mã khuyến mãi mới
export function addPromotion(promo: Omit<Promotion, 'id' | 'usedCount' | 'createdAt'>): Promotion {
  const current = getPromotions();
  const normalizedCode = promo.code.trim().toUpperCase();
  
  // Kiểm tra trùng mã
  const exists = current.some((p) => p.code.toUpperCase() === normalizedCode);
  if (exists) {
    throw new Error(`Mã khuyến mãi "${normalizedCode}" đã tồn tại trên hệ thống.`);
  }

  const newPromo: Promotion = {
    ...promo,
    id: `promo-${Date.now()}`,
    code: normalizedCode,
    usedCount: 0,
    createdAt: new Date().toISOString(),
  };

  savePromotions([newPromo, ...current]);
  return newPromo;
}

// Cập nhật mã khuyến mãi
export function updatePromotion(id: string, updates: Partial<Promotion>): Promotion | null {
  const current = getPromotions();
  let updatedPromo: Promotion | null = null;

  const next = current.map((p) => {
    if (p.id === id) {
      updatedPromo = {
        ...p,
        ...updates,
        code: updates.code ? updates.code.trim().toUpperCase() : p.code,
      };
      return updatedPromo;
    }
    return p;
  });

  if (updatedPromo) {
    savePromotions(next);
  }
  return updatedPromo;
}

// Bật / Tắt trạng thái mã khuyến mãi
export function togglePromotionStatus(id: string): Promotion | null {
  const current = getPromotions();
  let updatedPromo: Promotion | null = null;

  const next = current.map((p) => {
    if (p.id === id) {
      updatedPromo = {
        ...p,
        status: (p.status === 'active' ? 'inactive' : 'active') as 'active' | 'inactive',
      };
      return updatedPromo;
    }
    return p;
  });

  if (updatedPromo) {
    savePromotions(next);
  }
  return updatedPromo;
}

// Xóa mã khuyến mãi
export function deletePromotion(id: string): boolean {
  const current = getPromotions();
  const next = current.filter((p) => p.id !== id);
  if (next.length !== current.length) {
    savePromotions(next);
    return true;
  }
  return false;
}

// ========================================================
// CÁC HÀM GỌI TRỰC TIẾP TỪ CSDL MYSQL (BACKEND SPRING BOOT)
// ========================================================

export async function getPromotionsFromDb(): Promise<Promotion[]> {
  try {
    const list = await api.getAdminPromotions();
    if (Array.isArray(list)) {
      savePromotions(list);
      return list;
    }
  } catch (e) {
    console.warn('Không thể tải khuyến mãi từ MySQL, sử dụng cache cục bộ:', e);
  }
  return getPromotions();
}

export async function addPromotionToDb(
  promo: Omit<Promotion, 'id' | 'usedCount' | 'createdAt'>
): Promise<Promotion> {
  const normalizedCode = promo.code.trim().toUpperCase();
  try {
    const created = await api.createAdminPromotion({
      code: normalizedCode,
      name: promo.name.trim(),
      description: promo.description,
      discountType: promo.discountType,
      discountValue: Number(promo.discountValue),
      maxUses: promo.maxUses,
      startDate: promo.startDate,
      endDate: promo.endDate,
      targetAudience: promo.targetAudience,
      status: promo.status,
    });
    if (created && created.id) {
      const current = getPromotions().filter((p) => p.id !== created.id && p.code !== created.code);
      savePromotions([created, ...current]);
      return created;
    }
  } catch (e) {
    console.error('Lỗi lưu khuyến mãi vào MySQL:', e);
    throw e;
  }
  return addPromotion(promo);
}

export async function updatePromotionInDb(
  id: string,
  updates: Partial<Promotion>
): Promise<Promotion | null> {
  try {
    const updated = await api.updateAdminPromotion(id, updates);
    if (updated && updated.id) {
      const current = getPromotions().map((p) => (p.id === id ? updated : p));
      savePromotions(current);
      return updated;
    }
  } catch (e: any) {
    console.warn('Lỗi cập nhật khuyến mãi trong MySQL:', e);
    const msg = e?.message || '';
    if (!msg.includes('404') && !msg.includes('Không tìm thấy') && !msg.includes('not found')) {
      throw e;
    }
  }
  return updatePromotion(id, updates);
}

export async function togglePromotionStatusInDb(id: string): Promise<Promotion | null> {
  try {
    const toggled = await api.toggleAdminPromotionStatus(id);
    if (toggled && toggled.id) {
      const current = getPromotions().map((p) => (p.id === id ? toggled : p));
      savePromotions(current);
      return toggled;
    }
  } catch (e: any) {
    console.warn('Lỗi toggle trạng thái khuyến mãi trong MySQL:', e);
    const msg = e?.message || '';
    if (!msg.includes('404') && !msg.includes('Không tìm thấy') && !msg.includes('not found')) {
      throw e;
    }
  }
  return togglePromotionStatus(id);
}

export async function deletePromotionFromDb(id: string): Promise<boolean> {
  try {
    await api.deleteAdminPromotion(id);
  } catch (e: any) {
    console.warn('Lỗi xóa khuyến mãi khỏi MySQL (có thể là mã cục bộ hoặc đã bị xóa):', e);
    const msg = e?.message || '';
    if (!msg.includes('404') && !msg.includes('Không tìm thấy') && !msg.includes('not found')) {
      throw e;
    }
  }
  const current = getPromotions().filter((p) => p.id !== id);
  savePromotions(current);
  return true;
}

// Kiểm tra và áp dụng mã khuyến mãi khi đặt lịch khám
export function validatePromotion(
  code: string,
  baseDeposit: number = 100000
): {
  valid: boolean;
  isFree: boolean;
  discountAmount: number;
  finalDeposit: number;
  message: string;
  promo?: Promotion;
} {
  const cleanCode = (code || '').trim().toUpperCase();
  if (!cleanCode) {
    return {
      valid: false,
      isFree: false,
      discountAmount: 0,
      finalDeposit: baseDeposit,
      message: 'Vui lòng nhập mã khuyến mãi.',
    };
  }

  const list = getPromotions();
  const found = list.find((p) => p.code.toUpperCase() === cleanCode);

  if (!found) {
    // Fallback cho các mã đặc quyền chấm thi & tester nếu chưa tạo trong CSDL MySQL
    if (cleanCode === 'GIAOVIEN' || cleanCode === 'MEDFREE') {
      return {
        valid: true,
        isFree: true,
        discountAmount: baseDeposit,
        finalDeposit: 0,
        message: '✓ Áp dụng thành công mã đặc quyền: Miễn 100% tiền đặt cọc giữ chỗ (0 đ).',
      };
    }
    if (cleanCode === 'DEMO2K') {
      return {
        valid: true,
        isFree: false,
        discountAmount: Math.max(0, baseDeposit - 2000),
        finalDeposit: 2000,
        message: '✓ Áp dụng thành công mã trải nghiệm: Giảm tiền cọc xuống đúng 2.000 đ để quét VietQR thật.',
      };
    }
    return {
      valid: false,
      isFree: false,
      discountAmount: 0,
      finalDeposit: baseDeposit,
      message: `Mã "${cleanCode}" không tồn tại hoặc đã hết hạn.`,
    };
  }

  if (found.status !== 'active') {
    return {
      valid: false,
      isFree: false,
      discountAmount: 0,
      finalDeposit: baseDeposit,
      message: `Mã ưu đãi "${cleanCode}" hiện đang tạm dừng áp dụng.`,
    };
  }

  const today = getLocalDateString();
  if (found.endDate && found.endDate < today) {
    return {
      valid: false,
      isFree: false,
      discountAmount: 0,
      finalDeposit: baseDeposit,
      message: `Mã ưu đãi "${cleanCode}" đã hết hạn sử dụng vào ngày ${found.endDate}.`,
    };
  }

  if (found.maxUses && found.usedCount >= found.maxUses) {
    return {
      valid: false,
      isFree: false,
      discountAmount: 0,
      finalDeposit: baseDeposit,
      message: `Mã ưu đãi "${cleanCode}" đã đạt giới hạn tối đa số lượt sử dụng.`,
    };
  }

  let discountAmount = 0;
  let isFree = false;
  let finalDeposit = baseDeposit;

  if (found.discountType === 'FREE_DEPOSIT') {
    discountAmount = baseDeposit;
    isFree = true;
    finalDeposit = 0;
  } else if (found.discountType === 'FIX_TO_2K') {
    finalDeposit = 2000;
    discountAmount = Math.max(0, baseDeposit - 2000);
    isFree = false;
  } else if (found.discountType === 'PERCENT') {
    discountAmount = Math.round((baseDeposit * Math.min(100, found.discountValue)) / 100);
    isFree = discountAmount >= baseDeposit;
    finalDeposit = Math.max(0, baseDeposit - discountAmount);
  } else if (found.discountType === 'FIXED') {
    discountAmount = Math.min(baseDeposit, found.discountValue);
    isFree = discountAmount >= baseDeposit;
    finalDeposit = Math.max(0, baseDeposit - discountAmount);
  }

  return {
    valid: true,
    isFree,
    discountAmount,
    finalDeposit,
    message: isFree
      ? `✓ Áp dụng thành công mã [${found.code}]: Miễn 100% tiền đặt cọc giữ chỗ (0 đ).`
      : found.discountType === 'FIX_TO_2K'
      ? `✓ Áp dụng thành công mã [${found.code}]: Giảm tiền cọc xuống đúng 2.000 đ để quét chuyển khoản VietQR thật.`
      : `✓ Áp dụng thành công mã [${found.code}]: Giảm ${discountAmount.toLocaleString('vi-VN')} đ tiền đặt cọc.`,
    promo: found,
  };
}

// Đánh dấu mã đã được dùng (tăng usedCount lên 1)
export function recordPromotionUsage(code: string): void {
  const cleanCode = (code || '').trim().toUpperCase();
  const current = getPromotions();
  const next = current.map((p) => {
    if (p.code.toUpperCase() === cleanCode) {
      return { ...p, usedCount: p.usedCount + 1 };
    }
    return p;
  });
  savePromotions(next);
}
