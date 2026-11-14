'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, Calendar, UserCheck, CreditCard, ArrowRight, X } from 'lucide-react';

interface MissingFields {
  dateOfBirth?: boolean;
  gender?: boolean;
  cccdNumber?: boolean;
}

interface IncompleteProfileModalProps {
  isOpen: boolean;
  onClose?: () => void;
  missingFields?: MissingFields;
  redirectUrl?: string;
}

export default function IncompleteProfileModal({
  isOpen,
  onClose,
  missingFields = { dateOfBirth: true, gender: true, cccdNumber: true },
  redirectUrl = '/booking',
}: IncompleteProfileModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const handleGoToProfile = () => {
    router.push(`/profile?redirect=${encodeURIComponent(redirectUrl)}&reason=incomplete_profile`);
    if (onClose) onClose();
  };

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    } else {
      router.push('/');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-amber-100 overflow-hidden transform transition-all animate-scale-up">
        {/* Top Accent Bar */}
        <div className="h-2 bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500" />

        {/* Close Button */}
        {onClose && (
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="p-6 md:p-8">
          {/* Header Icon & Title */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-sm border border-amber-200">
              <ShieldAlert className="w-7 h-7" />
            </div>
            <div>
              <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 mb-1">
                Yêu Cầu Bắt Buộc
              </span>
              <h3 className="text-lg md:text-xl font-bold text-slate-800">
                Cần Hoàn Tất Thông Tin Bệnh Nhân
              </h3>
            </div>
          </div>

          {/* Explanation */}
          <p className="text-sm text-slate-600 leading-relaxed mb-5">
            Để bác sĩ có đủ thông tin khám bệnh, phân luồng chuyên khoa và xuất hồ sơ bệnh án theo đúng quy chuẩn của Bộ Y Tế, quý khách vui lòng bổ sung các thông tin cá nhân còn thiếu trước khi tiến hành đặt lịch.
          </p>

          {/* Checklist of Missing Items */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 mb-6 space-y-2.5">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Danh mục thông tin cần bổ sung:
            </div>

            <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white border border-slate-100 shadow-xs">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <Calendar className="w-4 h-4 text-slate-400" />
                Ngày sinh
              </span>
              {missingFields.dateOfBirth ? (
                <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Chưa cập nhật
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Đã có
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white border border-slate-100 shadow-xs">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <UserCheck className="w-4 h-4 text-slate-400" />
                Giới tính
              </span>
              {missingFields.gender ? (
                <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  Chưa chọn
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Đã có
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white border border-slate-100 shadow-xs">
              <span className="flex items-center gap-2 font-medium text-slate-700">
                <CreditCard className="w-4 h-4 text-slate-400" />
                Số CCCD / CMND
              </span>
              {missingFields.cccdNumber ? (
                <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                  Chưa cập nhật
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Đã có
                </span>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleGoToProfile}
              className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-semibold text-sm shadow-md shadow-teal-600/20 transition cursor-pointer"
            >
              <span>Hoàn Tất Hồ Sơ Ngay</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="px-4 py-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-medium text-sm transition cursor-pointer text-center"
            >
              Để sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
