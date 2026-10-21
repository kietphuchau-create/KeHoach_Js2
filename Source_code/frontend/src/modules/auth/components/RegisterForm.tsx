'use client';

import React, { useState } from 'react';
import { User, Mail, Lock, Phone, Eye, EyeOff, CheckCircle2, Circle, AlertCircle, ShieldCheck, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

// Hàm chuẩn hóa loại bỏ dấu tiếng Việt để so sánh chuỗi
function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

// Kiểm tra lỗi gõ nhầm tên miền email phổ biến
function checkEmailTypo(email: string): string | null {
  const parts = email.toLowerCase().trim().split('@');
  if (parts.length !== 2) return null;
  const domain = parts[1];
  const gmailTypos = ['gmai.com', 'gamil.com', 'gmaill.com', 'gmail.con', 'gmai.con', 'gmial.com', 'gmaill.vn'];
  if (gmailTypos.includes(domain)) return 'gmail.com';
  const yahooTypos = ['yaho.com', 'yahoo.con', 'yaho.com.vn'];
  if (yahooTypos.includes(domain)) return 'yahoo.com';
  return null;
}

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');

  // ─────────────────────────────────────────────────────────────
  // 1. RÀNG BUỘC HỌ VÀ TÊN THỜI GIAN THỰC
  // ─────────────────────────────────────────────────────────────
  const rawFullName = formData.fullName;
  const trimmedName = rawFullName.trim();
  const hasDigitInName = /\d/.test(rawFullName);
  const hasSpecialInName = /[!@#$%^&*()_+=\[\]{};':"\\|,.<>\/?~`\-]/.test(rawFullName);
  const isNameLengthValid = trimmedName.length >= 2 && trimmedName.length <= 50;
  const isNameValid = trimmedName.length > 0 && !hasDigitInName && !hasSpecialInName && isNameLengthValid;

  let nameHintError: string | null = null;
  if (rawFullName.length > 0) {
    if (hasDigitInName) {
      nameHintError = 'Họ và tên không được chứa chữ số.';
    } else if (hasSpecialInName) {
      nameHintError = 'Họ và tên không được chứa ký tự đặc biệt.';
    } else if (trimmedName.length < 2) {
      nameHintError = 'Họ và tên tối thiểu 2 ký tự.';
    } else if (trimmedName.length > 50) {
      nameHintError = 'Họ và tên tối đa 50 ký tự.';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. RÀNG BUỘC SỐ ĐIỆN THOẠI THỜI GIAN THỰC
  // ─────────────────────────────────────────────────────────────
  const rawPhone = formData.phone;
  const isPhoneStartedWithZero = rawPhone.length === 0 || rawPhone.startsWith('0');
  const isValidPhonePrefix = rawPhone.length < 2 || ['03', '05', '07', '08', '09'].includes(rawPhone.slice(0, 2));
  const isPhoneLengthValid = rawPhone.length === 10;
  const isPhoneValid = isPhoneLengthValid && isPhoneStartedWithZero && isValidPhonePrefix;

  let phoneHintError: string | null = null;
  if (rawPhone.length > 0) {
    if (!isPhoneStartedWithZero) {
      phoneHintError = 'Số điện thoại phải bắt đầu bằng số 0.';
    } else if (!isValidPhonePrefix) {
      phoneHintError = 'Đầu số chưa hợp lệ (hỗ trợ 03, 05, 07, 08, 09).';
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. RÀNG BUỘC EMAIL / GMAIL THỜI GIAN THỰC
  // ─────────────────────────────────────────────────────────────
  const rawEmail = formData.email.trim();
  const isEmailFormatValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail);
  const emailTypoSuggestion = checkEmailTypo(rawEmail);

  // ─────────────────────────────────────────────────────────────
  // 4. RÀNG BUỘC MẬT KHẨU KHÔNG TRÙNG / CHỨA THÔNG TIN CÁ NHÂN
  // ─────────────────────────────────────────────────────────────
  const pwd = formData.password;
  const hasMinLength = pwd.length >= 8 && pwd.length <= 72;
  const hasUpper = /[A-Z]/.test(pwd);
  const hasNumber = /[0-9]/.test(pwd);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(pwd);

  // Chuẩn hóa để kiểm tra trùng thông tin cá nhân
  const normPwd = removeVietnameseTones(pwd);
  const normName = removeVietnameseTones(trimmedName);
  const normNameNoSpace = normName.replace(/\s+/g, '');
  const nameTokens = normName.split(/\s+/).filter((w) => w.length >= 3);
  const emailPrefix = rawEmail.split('@')[0].trim().toLowerCase();

  let personalInfoViolation: string | null = null;
  if (pwd.length > 0) {
    // Kiểm tra trùng/chứa họ tên
    if (normNameNoSpace.length >= 3 && normPwd.includes(normNameNoSpace)) {
      personalInfoViolation = 'Mật khẩu không được chứa Họ và Tên của bạn';
    } else if (nameTokens.some((token) => normPwd.includes(token))) {
      personalInfoViolation = 'Mật khẩu không được chứa từ trong Họ và Tên';
    }
    // Kiểm tra chứa số điện thoại (từ 6 số liên tiếp trở lên)
    else if (rawPhone.length >= 6 && (pwd.includes(rawPhone) || (rawPhone.length === 10 && (pwd.includes(rawPhone.slice(-6)) || pwd.includes(rawPhone.slice(0, 6)))))) {
      personalInfoViolation = 'Mật khẩu không được chứa Số điện thoại của bạn';
    }
    // Kiểm tra chứa email username
    else if (emailPrefix.length >= 3 && normPwd.includes(emailPrefix)) {
      personalInfoViolation = 'Mật khẩu không được chứa tên tài khoản Email';
    }
  }

  const noPersonalInfo = !personalInfoViolation;

  // Tính điểm độ mạnh (0 - 4)
  let strengthScore = 0;
  if (pwd.length > 0) {
    if (!hasMinLength || !noPersonalInfo) {
      strengthScore = 1; // Quá ngắn hoặc vi phạm thông tin cá nhân
    } else {
      strengthScore = 1; // Đạt độ dài tối thiểu và an toàn thông tin
      if (hasUpper) strengthScore++;
      if (hasNumber) strengthScore++;
      if (hasSpecial) strengthScore++;
    }
  }

  // Nhãn và màu sắc thước đo độ mạnh
  const getStrengthMeta = () => {
    if (pwd.length === 0) return { label: 'Chưa nhập', color: 'text-slate-400', bar: 'bg-slate-200' };
    if (!noPersonalInfo) return { label: 'Không an toàn (Trùng thông tin)', color: 'text-rose-600', bar: 'bg-rose-500' };
    if (!hasMinLength) return { label: 'Rất yếu (Cần ≥ 8 ký tự)', color: 'text-rose-500', bar: 'bg-rose-500' };
    if (strengthScore <= 2) return { label: 'Trung bình (Đủ điều kiện)', color: 'text-amber-500', bar: 'bg-amber-500' };
    if (strengthScore === 3) return { label: 'Mạnh', color: 'text-sky-600', bar: 'bg-sky-500' };
    return { label: 'Rất an toàn', color: 'text-emerald-600', bar: 'bg-emerald-600' };
  };
  const strengthMeta = getStrengthMeta();

  // Kiểm tra khớp mật khẩu thời gian thực
  const confirmPwd = formData.confirmPassword;
  const isConfirmFilled = confirmPwd.length > 0;
  const isConfirmMatch = isConfirmFilled && confirmPwd === pwd;
  const isConfirmMismatch = isConfirmFilled && confirmPwd !== pwd;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;

    // Ngăn chặn gõ ký tự chữ vào ô Số điện thoại
    if (name === 'phone') {
      const cleanDigits = value.replace(/\D/g, '').slice(0, 10);
      setFormData((prev) => ({ ...prev, phone: cleanDigits }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }

    // Xóa lỗi của trường khi người dùng gõ lại
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // 1. Kiểm tra Họ và Tên
    if (!trimmedName) {
      errors.fullName = 'Vui lòng nhập họ và tên.';
    } else if (hasDigitInName) {
      errors.fullName = 'Họ và tên không được chứa chữ số.';
    } else if (hasSpecialInName) {
      errors.fullName = 'Họ và tên không được chứa ký tự đặc biệt.';
    } else if (trimmedName.length < 2) {
      errors.fullName = 'Họ và tên phải có ít nhất 2 ký tự.';
    } else if (trimmedName.length > 50) {
      errors.fullName = 'Họ và tên tối đa 50 ký tự.';
    }

    // 2. Kiểm tra Email
    if (!rawEmail) {
      errors.email = 'Vui lòng nhập email.';
    } else if (!isEmailFormatValid) {
      errors.email = 'Email không đúng định dạng (vd: user@gmail.com).';
    }

    // 3. Kiểm tra Số điện thoại
    if (!rawPhone) {
      errors.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!isPhoneValid) {
      errors.phone = 'Số điện thoại phải gồm 10 chữ số (bắt đầu bằng 03, 05, 07, 08, 09).';
    }

    // 4. Kiểm tra Mật khẩu
    if (!pwd) {
      errors.password = 'Vui lòng nhập mật khẩu.';
    } else if (pwd.length < 8 || pwd.length > 72) {
      errors.password = 'Mật khẩu phải từ 8 đến 72 ký tự.';
    } else if (!noPersonalInfo) {
      errors.password = personalInfoViolation || 'Mật khẩu không được chứa thông tin cá nhân.';
    }

    // 5. Kiểm tra Xác nhận mật khẩu
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Vui lòng xác nhận lại mật khẩu.';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Mật khẩu xác nhận không trùng khớp.';
    }

    // 6. Điều khoản
    if (!formData.agreeTerms) {
      errors.agreeTerms = 'Bạn cần đồng ý với Điều khoản & Dịch vụ khám chữa bệnh.';
    }

    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setError('Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ bên dưới.');
      return;
    }
    setFieldErrors({});

    setLoading(true);

    try {
      const res = await api.requestOtp({
        fullName: trimmedName,
        email: rawEmail,
        phone: rawPhone,
        password: formData.password,
      });

      // Lưu thông tin phiên tạm vào sessionStorage
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(
          'medsched_otp_session',
          JSON.stringify({
            sessionToken: res.sessionToken,
            phoneMasked: res.phoneMasked,
            emailMasked: res.emailMasked,
            expiresInSeconds: res.expiresInSeconds,
            devDemoOtp: res.devDemoOtp,
            fullName: trimmedName,
          })
        );
      }

      setSuccessMessage('Mã OTP 4 số đã được gửi tới Email của bạn! Đang chuyển sang trang xác thực...');
      setTimeout(() => {
        router.push(
          `/verify-otp?token=${encodeURIComponent(res.sessionToken)}&phone=${encodeURIComponent(res.phoneMasked)}&email=${encodeURIComponent(res.emailMasked)}`
        );
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Gửi mã xác thực không thành công. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-xl w-full max-w-sm sm:max-w-md border border-mint-light my-2 sm:my-auto">
      <div className="text-center mb-2 sm:mb-3">
        <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white shadow-xs border border-mint-light p-1 mb-1">
          <img src="/logo.png" alt="MedSched Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-lg sm:text-xl font-extrabold text-pine-teal">Tạo Tài Khoản</h1>
        <p className="text-slate-500 text-[10px] sm:text-[11px] mt-0.5">
          Đăng ký tài khoản Bệnh nhân để đặt lịch và theo dõi khám bệnh MedSched
        </p>
      </div>

      {error && <AlertMessage type="error" message={error} className="mb-2 py-1.5 text-xs" onClose={() => setError('')} />}
      {successMessage && <AlertMessage type="success" message={successMessage} className="mb-2 py-1.5 text-xs" />}

      <form onSubmit={handleSubmit} className="space-y-2 sm:space-y-2.5">
        {/* ── 1. HỌ VÀ TÊN ── */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[11px] font-semibold text-slate-700">Họ và Tên</label>
            {isNameValid && (
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                <CheckCircle2 size={11} /> Hợp lệ
              </span>
            )}
          </div>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              className={`w-full pl-8 pr-3 py-1.5 bg-mint-soft border rounded-xl outline-none text-xs transition ${
                fieldErrors.fullName || nameHintError
                  ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-200'
                  : isNameValid
                  ? 'border-emerald-500/80 bg-white'
                  : 'border-mint-light focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary'
              }`}
            />
          </div>
          {nameHintError && (
            <p className="text-[10px] text-rose-500 mt-0.5 flex items-center gap-1">
              <AlertCircle size={10} className="shrink-0" /> {nameHintError}
            </p>
          )}
          {fieldErrors.fullName && !nameHintError && (
            <p className="text-[10px] text-rose-500 mt-0.5">{fieldErrors.fullName}</p>
          )}
        </div>

        {/* ── 2. EMAIL / GMAIL ── */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[11px] font-semibold text-slate-700">Email</label>
            {isEmailFormatValid && !emailTypoSuggestion && (
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                <CheckCircle2 size={11} /> Email hợp lệ
              </span>
            )}
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="example@medsched.vn hoặc user@gmail.com"
              className={`w-full pl-8 pr-3 py-1.5 bg-mint-soft border rounded-xl outline-none text-xs transition ${
                fieldErrors.email
                  ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-200'
                  : isEmailFormatValid && !emailTypoSuggestion
                  ? 'border-emerald-500/80 bg-white'
                  : 'border-mint-light focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary'
              }`}
            />
          </div>
          {/* Gợi ý nếu gõ nhầm đuôi gmail phổ biến */}
          {emailTypoSuggestion && (
            <div className="mt-0.5 p-1 px-2 rounded-lg bg-amber-50 border border-amber-200 text-[10px] text-amber-800 flex items-center justify-between gap-1 animate-fadeIn">
              <span className="flex items-center gap-1">
                <Sparkles size={11} className="text-amber-600 shrink-0" />
                Có phải bạn muốn nhập <strong>@{emailTypoSuggestion}</strong>?
              </span>
              <button
                type="button"
                onClick={() => {
                  const prefix = rawEmail.split('@')[0];
                  setFormData((prev) => ({ ...prev, email: `${prefix}@${emailTypoSuggestion}` }));
                }}
                className="text-pine-teal hover:underline font-bold shrink-0 cursor-pointer"
              >
                Sửa nhanh
              </button>
            </div>
          )}
          {fieldErrors.email && <p className="text-[10px] text-rose-500 mt-0.5">{fieldErrors.email}</p>}
        </div>

        {/* ── 3. SỐ ĐIỆN THOẠI ── */}
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <label className="block text-[11px] font-semibold text-slate-700">Số Điện Thoại</label>
            <div className="flex items-center gap-2">
              {isPhoneValid ? (
                <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-0.5">
                  <CheckCircle2 size={11} /> SĐT hợp lệ
                </span>
              ) : rawPhone.length > 0 ? (
                <span className="text-[10px] text-slate-400 font-mono">
                  {rawPhone.length}/10 số
                </span>
              ) : null}
            </div>
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="0912345678 (Chỉ nhập 10 số)"
              maxLength={10}
              className={`w-full pl-8 pr-3 py-1.5 bg-mint-soft border rounded-xl outline-none text-xs transition ${
                fieldErrors.phone || phoneHintError
                  ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-200'
                  : isPhoneValid
                  ? 'border-emerald-500/80 bg-white'
                  : 'border-mint-light focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary'
              }`}
            />
          </div>
          {phoneHintError && (
            <p className="text-[10px] text-rose-500 mt-0.5 flex items-center gap-1">
              <AlertCircle size={10} className="shrink-0" /> {phoneHintError}
            </p>
          )}
          {fieldErrors.phone && !phoneHintError && (
            <p className="text-[10px] text-rose-500 mt-0.5">{fieldErrors.phone}</p>
          )}
        </div>

        {/* ── 4. MẬT KHẨU VÀ XÁC NHẬN MẬT KHẨU ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Ô Mật khẩu */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                onFocus={() => setPasswordFocused(true)}
                placeholder="Tối thiểu 8 ký tự"
                className={`w-full pl-7 pr-7 py-1.5 bg-mint-soft border rounded-xl outline-none text-xs transition ${
                  fieldErrors.password || personalInfoViolation
                    ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-200'
                    : hasMinLength && noPersonalInfo
                    ? 'border-emerald-500/80 bg-white focus:ring-2 focus:ring-emerald-500/20'
                    : 'border-mint-light focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {personalInfoViolation && (
              <p className="text-[10px] text-rose-600 mt-0.5 flex items-center gap-1 font-medium animate-fadeIn">
                <AlertCircle size={10} className="shrink-0 text-rose-500" /> {personalInfoViolation}
              </p>
            )}
            {fieldErrors.password && !personalInfoViolation && (
              <p className="text-[10px] text-rose-500 mt-0.5">{fieldErrors.password}</p>
            )}
          </div>

          {/* Ô Xác nhận Mật khẩu */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Xác nhận MK</label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại mật khẩu"
                className={`w-full pl-7 pr-7 py-1.5 bg-mint-soft border rounded-xl outline-none text-xs transition ${
                  fieldErrors.confirmPassword
                    ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-200'
                    : isConfirmMatch
                    ? 'border-emerald-500 bg-emerald-50/20 ring-1 ring-emerald-200'
                    : isConfirmMismatch
                    ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-200'
                    : 'border-mint-light focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>

            {/* Báo trạng thái khớp tức thì */}
            {isConfirmFilled && (
              <div className="mt-1">
                {isConfirmMatch ? (
                  <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium animate-fadeIn">
                    <CheckCircle2 size={11} className="shrink-0" /> Mật khẩu trùng khớp
                  </p>
                ) : (
                  <p className="text-[10px] text-rose-500 flex items-center gap-1 animate-fadeIn">
                    <AlertCircle size={11} className="shrink-0" /> Mật khẩu chưa khớp
                  </p>
                )}
              </div>
            )}
            {fieldErrors.confirmPassword && !isConfirmFilled && (
              <p className="text-[10px] text-rose-500 mt-0.5">{fieldErrors.confirmPassword}</p>
            )}
          </div>
        </div>

        {/* ── BỘ RÀNG BUỘC MẬT KHẨU TRỰC TIẾP (LIVE CHECKLIST & STRENGTH METER) ── */}
        {(passwordFocused || pwd.length > 0) && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs space-y-2 transition-all">
            {/* Thanh đo độ mạnh */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-500 font-medium flex items-center gap-1">
                  <ShieldCheck size={12} className="text-slate-400" />
                  Độ an toàn:
                </span>
                <span className={`font-bold ${strengthMeta.color}`}>{strengthMeta.label}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full bg-slate-200/80 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    strengthScore >= 1 ? strengthMeta.bar : 'bg-transparent'
                  }`}
                />
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    strengthScore >= 2 ? strengthMeta.bar : 'bg-transparent'
                  }`}
                />
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    strengthScore >= 3 ? strengthMeta.bar : 'bg-transparent'
                  }`}
                />
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    strengthScore >= 4 ? strengthMeta.bar : 'bg-transparent'
                  }`}
                />
              </div>
            </div>

            {/* Danh sách 5 tiêu chí kiểm tra trực tiếp */}
            <div className="space-y-1 pt-1.5 border-t border-slate-200/60 text-[10px] sm:text-[10.5px]">
              {/* Tiêu chí quan trọng: Không trùng Họ tên, SĐT, Email */}
              <div
                className={`flex items-center gap-1.5 transition-colors ${
                  pwd.length === 0
                    ? 'text-slate-400'
                    : noPersonalInfo
                    ? 'text-emerald-600 font-semibold'
                    : 'text-rose-600 font-bold'
                }`}
              >
                {pwd.length === 0 ? (
                  <Circle size={12} className="shrink-0 text-slate-300" />
                ) : noPersonalInfo ? (
                  <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                ) : (
                  <AlertCircle size={12} className="shrink-0 text-rose-500 animate-pulse" />
                )}
                <span>
                  {personalInfoViolation ? personalInfoViolation : 'Không chứa Họ tên, SĐT hoặc Email'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-0.5">
                {/* Tiêu chí 1: Độ dài >= 8 ký tự (bắt buộc) */}
                <div
                  className={`flex items-center gap-1 transition-colors ${
                    hasMinLength ? 'text-emerald-600 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {hasMinLength ? (
                    <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                  ) : (
                    <Circle size={12} className="shrink-0 text-slate-300" />
                  )}
                  <span>8 - 72 ký tự</span>
                </div>

                {/* Tiêu chí 2: Chữ hoa */}
                <div
                  className={`flex items-center gap-1 transition-colors ${
                    hasUpper ? 'text-emerald-600 font-medium' : 'text-slate-400'
                  }`}
                >
                  {hasUpper ? (
                    <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                  ) : (
                    <Circle size={12} className="shrink-0 text-slate-300" />
                  )}
                  <span>Chữ hoa (A-Z)</span>
                </div>

                {/* Tiêu chí 3: Chữ số */}
                <div
                  className={`flex items-center gap-1 transition-colors ${
                    hasNumber ? 'text-emerald-600 font-medium' : 'text-slate-400'
                  }`}
                >
                  {hasNumber ? (
                    <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                  ) : (
                    <Circle size={12} className="shrink-0 text-slate-300" />
                  )}
                  <span>Chữ số (0-9)</span>
                </div>

                {/* Tiêu chí 4: Ký tự đặc biệt */}
                <div
                  className={`flex items-center gap-1 transition-colors ${
                    hasSpecial ? 'text-emerald-600 font-medium' : 'text-slate-400'
                  }`}
                >
                  {hasSpecial ? (
                    <CheckCircle2 size={12} className="shrink-0 text-emerald-600" />
                  ) : (
                    <Circle size={12} className="shrink-0 text-slate-300" />
                  )}
                  <span>Ký tự đặc biệt (!@#)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── 5. ĐỒNG Ý ĐIỀU KHOẢN ── */}
        <div className="flex items-start pt-0.5">
          <input
            type="checkbox"
            id="agreeTerms"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onChange={handleChange}
            className="w-4 h-4 mt-0.5 text-pine-teal rounded border-slate-300 focus:ring-pine-teal cursor-pointer shrink-0"
          />
          <label htmlFor="agreeTerms" className="ml-2 text-[11px] text-slate-600 cursor-pointer leading-tight">
            Tôi đồng ý với các <span className="text-pine-teal font-semibold">Điều khoản</span> và chính sách MedSched
          </label>
        </div>
        {fieldErrors.agreeTerms && <p className="text-[10px] text-rose-500">{fieldErrors.agreeTerms}</p>}

        {/* ── NÚT ĐĂNG KÝ ── */}
        <button
          type="submit"
          disabled={loading || !!personalInfoViolation || !!nameHintError || !!phoneHintError}
          className="w-full bg-pine-teal hover:bg-pine-teal-hover text-white font-bold py-2 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 text-xs mt-1 cursor-pointer"
        >
          {loading ? 'Đang gửi mã xác thực...' : 'Đăng Ký & Nhận Mã OTP'}
        </button>
      </form>

      <div className="text-center mt-3 text-xs text-slate-600">
        Đã có tài khoản?{' '}
        <Link href="/login" className="text-pine-teal font-bold hover:underline">
          Đăng nhập tại đây
        </Link>
      </div>
    </div>
  );
}

