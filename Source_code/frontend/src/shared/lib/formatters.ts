// ==========================================================================
// MEDSCHED SYSTEM - CENTRALIZED FORMATTERS & UTILS
// Kế thừa chuẩn formatters tiện ích dùng chung
// ==========================================================================

/** Định dạng tiền tệ chuẩn VNĐ */
export const formatVND = (amount: number | string = 0): string => {
  const num = Number(amount) || 0;
  return num.toLocaleString('vi-VN') + ' đ';
};

/** Định dạng ngày tháng năm Tiếng Việt (DD/MM/YYYY) */
export const formatDateVN = (dateVal?: string | Date): string => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/** Định dạng giờ phút (HH:mm) */
export const formatTimeOnly = (dateVal?: string | Date): string => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

/** Định dạng số điện thoại đẹp (ví dụ: 0912 345 678) */
export const formatPhoneVN = (phone?: string): string => {
  if (!phone) return '';
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10) {
    return `${clean.slice(0, 4)} ${clean.slice(4, 7)} ${clean.slice(7)}`;
  }
  return phone;
};

/** Che bớt số CCCD để bảo mật thông tin (ví dụ: 0792 **** 8899) */
export const maskCCCD = (cccd?: string): string => {
  if (!cccd || cccd.length < 8) return cccd || '';
  return `${cccd.slice(0, 4)} **** ${cccd.slice(-4)}`;
};

/** Loại bỏ tiền tố học hàm/học vị bị lặp kép (ví dụ: BS.CKII BS.CKII -> BS.CKII) */
export const cleanDoctorFullName = (rawName?: string | null): string => {
  if (!rawName) return '';
  let str = rawName.trim();
  const titles = ['BS.CKII', 'BS.CKI', 'BS.CK1', 'BS.CK2', 'ThS.BS', 'TS.BS', 'PGS.TS', 'GS.TS', 'BS', 'ThS', 'TS', 'PGS', 'GS'];
  for (const t of titles) {
    const escaped = t.replace(/\./g, '\\.');
    const doubleRegex = new RegExp(`^(${escaped}\\s*)+`, 'i');
    if (doubleRegex.test(str)) {
      str = `${t} ` + str.replace(doubleRegex, '').trim();
      break;
    }
  }
  return str;
};

/** Định dạng tên bác sĩ kết hợp học hàm/học vị không bị trùng lặp (ví dụ: BS.CKII Nguyễn Minh Anh) */
export const formatDoctorFullName = (academicTitle?: string | null, fullName?: string | null): string => {
  const cleanName = (fullName || '').trim();
  const title = (academicTitle || '').trim();
  if (!cleanName) return title;
  if (!title) return cleanDoctorFullName(cleanName);
  if (cleanName.toLowerCase().startsWith(title.toLowerCase())) {
    return cleanDoctorFullName(cleanName);
  }
  return cleanDoctorFullName(`${title} ${cleanName}`);
};
