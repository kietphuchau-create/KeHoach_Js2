// Danh mục Quản lý Kho Thuốc & Dược Phẩm MedSched (Medicine & Pharmacy Inventory Configuration)

export interface MedicineInventoryItem {
  id: string;
  medicalCenterId: string;
  medicalCenterName: string;
  code: string;
  name: string;
  activeIngredient: string;
  unit: string; // VIÊN, CHAI, LỌ, TUÝP, GÓI, HỘP
  unitPrice: number; // Đơn giá bán lẻ niêm yết (VNĐ)
  stockQuantity: number; // Số lượng tồn kho khả dụng
  isActive: boolean;
  updatedAt: string;
  note?: string;
}

export const MEDICINES_STORAGE_KEY = 'medsched_medicines_inventory';
export const MEDICINES_UPDATED_EVENT = 'medsched_medicines_updated';

export const DEFAULT_MEDICINES: MedicineInventoryItem[] = [
  // 1. Chi Nhánh Trần Đại Nghĩa (Bình Tân)
  {
    id: '80b2c3d4-0001-4000-8000-000000000001',
    medicalCenterId: 'a1b2c3d4-0001-4000-8000-000000000001',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trần Đại Nghĩa',
    code: 'MED_PARACET_1',
    name: 'Paracetamol 500mg',
    activeIngredient: 'Paracetamol',
    unit: 'VIÊN',
    unitPrice: 3000,
    stockQuantity: 450,
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '80b2c3d4-0002-4000-8000-000000000001',
    medicalCenterId: 'a1b2c3d4-0001-4000-8000-000000000001',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trần Đại Nghĩa',
    code: 'MED_CETIRIZIN_1',
    name: 'Cetirizine 10mg',
    activeIngredient: 'Cetirizine hydrochloride',
    unit: 'VIÊN',
    unitPrice: 5000,
    stockQuantity: 25, // Sắp hết (< 30)
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '80b2c3d4-0003-4000-8000-000000000001',
    medicalCenterId: 'a1b2c3d4-0001-4000-8000-000000000001',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trần Đại Nghĩa',
    code: 'MED_AMOX_1',
    name: 'Amoxicillin 500mg',
    activeIngredient: 'Amoxicillin trihydrate',
    unit: 'VIÊN',
    unitPrice: 8000,
    stockQuantity: 220,
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '80b2c3d4-0004-4000-8000-000000000001',
    medicalCenterId: 'a1b2c3d4-0001-4000-8000-000000000001',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trần Đại Nghĩa',
    code: 'MED_VITC_1',
    name: 'Vitamin C 500mg (Dạng viên sủi)',
    activeIngredient: 'Acid ascorbic',
    unit: 'VIÊN',
    unitPrice: 4000,
    stockQuantity: 380,
    isActive: true,
    updatedAt: new Date().toISOString(),
  },

  // 2. Chi Nhánh Trịnh Đình Thảo (Tân Phú - ITC)
  {
    id: '80b2c3d4-0001-4000-8000-000000000002',
    medicalCenterId: 'a1b2c3d4-0002-4000-8000-000000000002',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trịnh Đình Thảo (ITC)',
    code: 'MED_PARACET_2',
    name: 'Paracetamol 500mg',
    activeIngredient: 'Paracetamol',
    unit: 'VIÊN',
    unitPrice: 3000,
    stockQuantity: 350,
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '80b2c3d4-0002-4000-8000-000000000002',
    medicalCenterId: 'a1b2c3d4-0002-4000-8000-000000000002',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trịnh Đình Thảo (ITC)',
    code: 'MED_TOBRADEX_2',
    name: 'Tobradex Nhỏ Mắt 5ml',
    activeIngredient: 'Tobramycin, Dexamethasone',
    unit: 'LỌ',
    unitPrice: 45000,
    stockQuantity: 0, // Hết hàng
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '80b2c3d4-0003-4000-8000-000000000002',
    medicalCenterId: 'a1b2c3d4-0002-4000-8000-000000000002',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trịnh Đình Thảo (ITC)',
    code: 'MED_CHLORHEX_2',
    name: 'Nước súc miệng Chlorhexidine 0.12%',
    activeIngredient: 'Chlorhexidine gluconate',
    unit: 'CHAI',
    unitPrice: 35000,
    stockQuantity: 15, // Sắp hết (< 30)
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: '80b2c3d4-0004-4000-8000-000000000002',
    medicalCenterId: 'a1b2c3d4-0002-4000-8000-000000000002',
    medicalCenterName: 'Phòng Khám Đa Khoa MedSched - Chi Nhánh Trịnh Đình Thảo (ITC)',
    code: 'MED_VITC_2',
    name: 'Vitamin C 500mg',
    activeIngredient: 'Acid ascorbic',
    unit: 'VIÊN',
    unitPrice: 4000,
    stockQuantity: 222,
    isActive: true,
    updatedAt: new Date().toISOString(),
  },
];

export function getMedicines(centerId?: string): MedicineInventoryItem[] {
  if (typeof window === 'undefined') return DEFAULT_MEDICINES;
  try {
    const raw = localStorage.getItem(MEDICINES_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(MEDICINES_STORAGE_KEY, JSON.stringify(DEFAULT_MEDICINES));
      return centerId && centerId !== 'ALL'
        ? DEFAULT_MEDICINES.filter((m) => m.medicalCenterId === centerId)
        : DEFAULT_MEDICINES;
    }
    const list: MedicineInventoryItem[] = JSON.parse(raw);
    return centerId && centerId !== 'ALL'
      ? list.filter((m) => m.medicalCenterId === centerId)
      : list;
  } catch (err) {
    console.error('Lỗi đọc kho thuốc từ localStorage:', err);
    return DEFAULT_MEDICINES;
  }
}

export function saveMedicines(list: MedicineInventoryItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MEDICINES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(MEDICINES_UPDATED_EVENT, { detail: list }));
  } catch (err) {
    console.error('Lỗi lưu kho thuốc vào localStorage:', err);
  }
}

export function getMedicineById(id: string): MedicineInventoryItem | undefined {
  const all = getMedicines();
  return all.find((m) => m.id === id);
}

export function addMedicine(
  item: Omit<MedicineInventoryItem, 'id' | 'updatedAt'>
): MedicineInventoryItem {
  const all = getMedicines();
  const newItem: MedicineInventoryItem = {
    ...item,
    id: 'med-' + Math.random().toString(36).substring(2, 10),
    updatedAt: new Date().toISOString(),
  };
  const updatedList = [newItem, ...all];
  saveMedicines(updatedList);
  return newItem;
}

export function updateMedicine(
  id: string,
  updates: Partial<MedicineInventoryItem>
): MedicineInventoryItem | null {
  const all = getMedicines();
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) return null;

  const updated: MedicineInventoryItem = {
    ...all[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  all[index] = updated;
  saveMedicines(all);
  return updated;
}

export function importMedicineStock(
  id: string,
  addQuantity: number,
  newUnitPrice?: number,
  note?: string
): MedicineInventoryItem | null {
  const all = getMedicines();
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) return null;

  const current = all[index];
  const newStock = Math.max(0, current.stockQuantity + addQuantity);
  const updated: MedicineInventoryItem = {
    ...current,
    stockQuantity: newStock,
    unitPrice: newUnitPrice !== undefined && newUnitPrice >= 0 ? newUnitPrice : current.unitPrice,
    note: note ? note : current.note,
    updatedAt: new Date().toISOString(),
  };

  all[index] = updated;
  saveMedicines(all);
  return updated;
}

export function deleteMedicine(id: string): boolean {
  const all = getMedicines();
  const filtered = all.filter((m) => m.id !== id);
  if (filtered.length === all.length) return false;
  saveMedicines(filtered);
  return true;
}

export function deductMedicineStock(id: string, quantity: number): boolean {
  const all = getMedicines();
  const index = all.findIndex((m) => m.id === id);
  if (index === -1) return false;

  const current = all[index];
  if (current.stockQuantity < quantity) return false;

  all[index] = {
    ...current,
    stockQuantity: current.stockQuantity - quantity,
    updatedAt: new Date().toISOString(),
  };
  saveMedicines(all);
  return true;
}
