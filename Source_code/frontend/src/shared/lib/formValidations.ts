export interface ValidationResult {
  isValid: boolean;
  message: string;
}

/**
 * Ràng buộc họ và tên theo từng ký tự:
 * - Không cho phép chữ số
 * - Không cho phép ký tự đặc biệt ngoài dấu chấm (học hàm như PGS.TS, BS.CKII) và dấu cách
 * - Độ dài từ 2 đến 100 ký tự
 */
export function validateFullName(name: string): ValidationResult {
  const n = name.trim();
  if (!n) return { isValid: false, message: 'Bắt buộc nhập họ và tên' };
  if (n.length < 2) return { isValid: false, message: `Họ và tên quá ngắn (${n.length}/2 ký tự tối thiểu)` };
  if (n.length > 100) return { isValid: false, message: `Họ và tên quá dài (${n.length}/100 ký tự tối đa)` };

  for (let i = 0; i < n.length; i++) {
    const c = n[i];
    if (/[0-9]/.test(c)) {
      return { isValid: false, message: `Họ tên không được chứa chữ số ('${c}' tại vị trí ${i + 1})` };
    }
    if (!/^[\p{L}\s.]$/u.test(c)) {
      return { isValid: false, message: `Ký tự đặc biệt '${c}' tại vị trí ${i + 1} không được phép` };
    }
  }
  return { isValid: true, message: 'Họ và tên hợp lệ' };
}

/**
 * Ràng buộc số điện thoại theo từng ký tự:
 * - Đúng 10 chữ số
 * - Đầu số di động Việt Nam: 03, 05, 07, 08, 09
 */
export function validatePhone(phone: string): ValidationResult {
  const p = phone.trim();
  if (!p) return { isValid: false, message: 'Bắt buộc nhập số điện thoại (10 chữ số)' };
  if (!/^\d+$/.test(p)) {
    return { isValid: false, message: 'Số điện thoại chỉ được chứa các chữ số từ 0-9' };
  }
  if (p.length < 10) {
    return { isValid: false, message: `Số điện thoại còn thiếu (${p.length}/10 số)` };
  }
  if (p.length > 10) {
    return { isValid: false, message: `Số điện thoại quá dài (${p.length}/10 số)` };
  }
  const prefix = p.substring(0, 2);
  const validPrefixes = ['03', '05', '07', '08', '09'];
  if (!validPrefixes.includes(prefix)) {
    return { isValid: false, message: `Đầu số '${prefix}' không hợp lệ (phải bắt đầu bằng 03, 05, 07, 08 hoặc 09)` };
  }
  return { isValid: true, message: 'Số điện thoại hợp lệ (10/10 số)' };
}

/**
 * Ràng buộc email theo từng ký tự thời gian thực:
 * - Báo chi tiết: thiếu @, thiếu tên người dùng, thiếu tên miền, sai đuôi tên miền
 */
export function validateEmail(email: string): ValidationResult {
  const e = email.trim();
  if (!e) return { isValid: false, message: 'Bắt buộc nhập email đăng nhập' };
  if (/\s/.test(e)) {
    return { isValid: false, message: 'Email không được chứa khoảng trắng' };
  }
  if (!e.includes('@')) {
    return { isValid: false, message: "Email còn thiếu ký tự '@' (ví dụ: letan01@medsched.vn)" };
  }
  const parts = e.split('@');
  if (parts.length > 2) {
    return { isValid: false, message: "Email chỉ được có 1 ký tự '@'" };
  }
  if (!parts[0]) {
    return { isValid: false, message: "Email thiếu phần tên người dùng trước '@'" };
  }
  if (!parts[1]) {
    return { isValid: false, message: "Email thiếu tên miền sau '@' (ví dụ: medsched.vn)" };
  }
  if (!parts[1].includes('.')) {
    return { isValid: false, message: "Tên miền sau '@' phải có dấu chấm (ví dụ: .vn, .com)" };
  }
  const domainParts = parts[1].split('.');
  if (domainParts[domainParts.length - 1].length < 2) {
    return { isValid: false, message: "Đuôi tên miền email quá ngắn (tối thiểu 2 ký tự như .vn, .com)" };
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(e)) {
    return { isValid: false, message: 'Định dạng email chưa hợp lệ' };
  }
  return { isValid: true, message: 'Email hợp lệ' };
}

/**
 * Ràng buộc mật khẩu tạm thời:
 * - Để trống => hợp lệ (mặc định Medsched@123)
 * - Nếu nhập => tối thiểu 8 ký tự, không có khoảng trắng, tối đa 72 ký tự
 */
export function validateTemporaryPassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: true, message: 'Mặc định hệ thống: Medsched@123' };
  }
  if (/\s/.test(password)) {
    return { isValid: false, message: 'Mật khẩu không được chứa khoảng trắng' };
  }
  if (password.length < 8) {
    return { isValid: false, message: `Mật khẩu còn thiếu (${password.length}/8 ký tự tối thiểu)` };
  }
  if (password.length > 72) {
    return { isValid: false, message: `Mật khẩu quá dài (${password.length}/72 ký tự tối đa)` };
  }
  return { isValid: true, message: 'Mật khẩu tạm thời hợp lệ' };
}
