'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldAlert,
  Calendar,
  UserCheck,
  CreditCard,
  ArrowRight,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Home,
} from 'lucide-react';
import { api, getAuthUser } from '@/shared/lib/api';

export interface MissingFields {
  dateOfBirth?: boolean;
  gender?: boolean;
  cccdNumber?: boolean;
}

export interface IncompleteProfileModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onSuccess?: (updatedProfile: any) => void;
  currentProfile?: any;
  missingFields?: MissingFields;
  redirectUrl?: string;
}

export default function IncompleteProfileModal({
  isOpen,
  onClose,
  onSuccess,
  currentProfile,
  missingFields,
  redirectUrl = '/booking',
}: IncompleteProfileModalProps) {
  const router = useRouter();

  const [dob, setDob] = useState<string>('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | 'OTHER' | ''>('');
  const [cccdNumber, setCccdNumber] = useState<string>('');
  const [fullName, setFullName] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState<boolean>(false);

  // Ngày hiện tại làm mốc giới hạn trên
  const todayStr = new Date().toISOString().split('T')[0];

  // Đồng bộ dữ liệu hồ sơ hiện có khi mở popup
  useEffect(() => {
    if (!isOpen) return;

    setErrorMsg(null);
    setIsSaved(false);

    if (currentProfile) {
      if (currentProfile.dateOfBirth) setDob(currentProfile.dateOfBirth);
      if (currentProfile.gender) setGender(currentProfile.gender);
      if (currentProfile.cccdNumber) setCccdNumber(currentProfile.cccdNumber);
      if (currentProfile.fullName) setFullName(currentProfile.fullName);
    }

    // Đảm bảo luôn lấy họ tên đầy đủ của tài khoản để gửi kèm API update
    api
      .getProfile()
      .then((me) => {
        const p = me?.patientProfile;
        if (p?.fullName) setFullName(p.fullName);
        else if (me?.fullName) setFullName(me.fullName);

        if (!dob && p?.dateOfBirth) setDob(p.dateOfBirth);
        if (!gender && p?.gender) setGender(p.gender);
        if (!cccdNumber && p?.cccdNumber) setCccdNumber(p.cccdNumber);
      })
      .catch(() => {
        const authUser = getAuthUser();
        if (authUser?.fullName) setFullName(authUser.fullName);
      });
  }, [isOpen, currentProfile]);

  if (!isOpen) return null;

  // Tính tuổi từ ngày sinh
  const getAge = (dateString: string): number | null => {
    if (!dateString) return null;
    const birthDate = new Date(dateString);
    if (isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age >= 0 ? age : null;
  };

  const age = getAge(dob);

  // Ràng buộc từng ký tự & trường thông tin
  const isDobValid = Boolean(dob && dob <= todayStr && dob >= '1900-01-01');
  const isGenderValid = Boolean(gender === 'MALE' || gender === 'FEMALE' || gender === 'OTHER');
  const isCccdValid = cccdNumber.length === 12;

  // Tất cả điều kiện thỏa mãn thì kích hoạt nút Lưu
  const canSubmit = isDobValid && isGenderValid && isCccdValid;

  // Xử lý gõ CCCD: Lọc trực tiếp từng ký tự (chỉ nhận số, tối đa 12 số)
  const handleCccdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const digitsOnly = raw.replace(/\D/g, '').slice(0, 12);
    setCccdNumber(digitsOnly);
  };

  // Người dùng chọn "Để sau" hoặc bấm "X": Tự động quay về trang chủ, không cho tiếp tục đặt lịch
  const handleDismiss = () => {
    if (onClose) onClose();
    router.push('/');
  };

  // Lưu thông tin trực tiếp trên modal
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let resolvedName = fullName.trim();
      if (!resolvedName) {
        const me = await api.getProfile().catch(() => null);
        resolvedName =
          me?.patientProfile?.fullName || me?.fullName || getAuthUser()?.fullName || 'Bệnh nhân';
      }

      const updated = await api.updatePatientProfile({
        fullName: resolvedName,
        dateOfBirth: dob,
        gender: gender as 'MALE' | 'FEMALE' | 'OTHER',
        cccdNumber: cccdNumber,
      });

      setIsSaved(true);

      if (onSuccess) {
        onSuccess(updated);
      }

      // Đóng modal sau hiệu ứng thành công ngắn
      setTimeout(() => {
        if (onClose) onClose();
        setIsSaved(false);
      }, 700);
    } catch (err: any) {
      console.error('Lỗi cập nhật hồ sơ trực tiếp:', err);
      setErrorMsg(err.message || 'Không thể lưu hồ sơ bệnh nhân. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-amber-100 overflow-hidden transform transition-all animate-scale-up my-auto">
        {/* Thanh màu gradient trên đỉnh */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-teal-500 to-emerald-500" />

        {/* Nút đóng (X) -> Tự động quay về trang chủ */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
          aria-label="Đóng và quay về trang chủ"
          title="Quay về trang chủ"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-7">
          {/* Header Icon & Title */}
          <div className="flex items-start gap-3.5 mb-3">
            <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-xs border border-amber-200">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 mb-1">
                Yêu Cầu Bắt Buộc Của Bộ Y Tế
              </span>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 leading-snug">
                Bổ Sung Thông Tin Bệnh Nhân
              </h3>
            </div>
          </div>

          {/* Hướng dẫn ngắn gọn */}
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-4">
            Để tạo mã hồ sơ bệnh án và phân luồng phòng khám chính xác, quý khách vui lòng hoàn tất nhanh 3 thông tin bắt buộc dưới đây trước khi đặt lịch:
          </p>

          {/* Thông báo lỗi nếu có */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Thông báo thành công */}
          {isSaved && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span className="font-semibold">Đã lưu hồ sơ thành công! Đang chuyển tiếp phiên đặt lịch...</span>
            </div>
          )}

          {/* Form điền trực tiếp trên Popup */}
          <form onSubmit={handleSave} className="space-y-4 mb-6">
            {/* 1. Ngày sinh */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  Ngày sinh <span className="text-rose-500">*</span>
                </label>
                {dob && (
                  <span className="text-[11px] font-medium text-slate-500">
                    {age !== null ? `${age} tuổi` : ''}
                  </span>
                )}
              </div>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                max={todayStr}
                min="1900-01-01"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border transition outline-none ${
                  isDobValid
                    ? 'border-emerald-300 bg-emerald-50/20 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                    : dob && dob > todayStr
                    ? 'border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-2 focus:ring-rose-200'
                    : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200'
                }`}
              />
              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                {isDobValid ? (
                  <span className="text-emerald-600 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Ngày sinh hợp lệ ({age} tuổi)
                  </span>
                ) : dob && dob > todayStr ? (
                  <span className="text-rose-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Ngày sinh không được ở tương lai
                  </span>
                ) : (
                  <span className="text-slate-400">Chọn ngày sinh theo đúng giấy tờ tùy thân</span>
                )}
              </div>
            </div>

            {/* 2. Giới tính */}
            <div>
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <UserCheck className="w-3.5 h-3.5 text-teal-600" />
                Giới tính <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'MALE', label: 'Nam' },
                  { value: 'FEMALE', label: 'Nữ' },
                  { value: 'OTHER', label: 'Khác' },
                ].map((item) => {
                  const isSelected = gender === item.value;
                  return (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setGender(item.value as any)}
                      className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isSelected
                          ? 'border-teal-600 bg-teal-50 text-teal-800 shadow-xs ring-2 ring-teal-500/20'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                {isGenderValid ? (
                  <span className="text-emerald-600 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Đã chọn: {gender === 'MALE' ? 'Nam' : gender === 'FEMALE' ? 'Nữ' : 'Khác'}
                  </span>
                ) : (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Vui lòng chọn giới tính y tế
                  </span>
                )}
              </div>
            </div>

            {/* 3. Số CCCD / CMND (Ràng buộc từng ký tự) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-teal-600" />
                  Số CCCD / CMND <span className="text-rose-500">*</span>
                </label>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-colors ${
                    isCccdValid
                      ? 'bg-emerald-100 text-emerald-800'
                      : cccdNumber.length > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {cccdNumber.length}/12 số
                </span>
              </div>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={cccdNumber}
                  onChange={handleCccdChange}
                  placeholder="Nhập 12 chữ số CCCD gắn chip"
                  maxLength={12}
                  className={`w-full px-3.5 py-2.5 text-sm rounded-xl border transition outline-none font-mono ${
                    isCccdValid
                      ? 'border-emerald-300 bg-emerald-50/20 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200'
                      : cccdNumber.length > 0
                      ? 'border-amber-300 bg-amber-50/20 focus:border-amber-500 focus:ring-2 focus:ring-amber-200'
                      : 'border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200'
                  }`}
                />
                {isCccdValid && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px]">
                {isCccdValid ? (
                  <span className="text-emerald-600 flex items-center gap-1 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Số CCCD hợp lệ (12 chữ số chuẩn)
                  </span>
                ) : cccdNumber.length > 0 ? (
                  <span className="text-amber-600 flex items-center gap-1 font-medium">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Đang nhập: còn thiếu {12 - cccdNumber.length} số (yêu cầu đủ 12 chữ số)
                  </span>
                ) : (
                  <span className="text-slate-400">Chỉ cho phép nhập số, tối đa 12 chữ số</span>
                )}
              </div>
            </div>
          </form>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={!canSubmit || isSubmitting}
              onClick={() => handleSave()}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-md transition ${
                canSubmit && !isSubmitting
                  ? 'bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white shadow-teal-600/20 cursor-pointer active:scale-[0.99]'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Đang lưu thông tin...</span>
                </>
              ) : (
                <>
                  <span>Lưu & Tiếp Tục Đặt Lịch</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Nút Để sau: Tự động chuyển hướng về trang chủ */}
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-3 rounded-xl border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 font-medium text-sm transition cursor-pointer text-center flex items-center justify-center gap-1.5"
              title="Hủy đặt lịch và quay về trang chủ"
            >
              <Home className="w-4 h-4" />
              <span>Để sau (Về trang chủ)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
