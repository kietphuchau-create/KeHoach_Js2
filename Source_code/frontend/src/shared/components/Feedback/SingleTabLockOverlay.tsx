'use client';

import React from 'react';
import { AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

interface SingleTabLockOverlayProps {
  isBlocked: boolean;
  moduleName: string;
  onTakeOver: () => void;
  description?: string;
}

export default function SingleTabLockOverlay({
  isBlocked,
  moduleName,
  onTakeOver,
  description,
}: SingleTabLockOverlayProps) {
  if (!isBlocked) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-amber-200 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle size={36} />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-black text-slate-900">
            {moduleName} Đang Mở Tại Một Tab Khác!
          </h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {description ||
              `Để đảm bảo an toàn phiên làm việc, ngăn ngừa thao tác trùng lặp đồng thời và bảo vệ dữ liệu y tế của hệ thống MedSched, phân hệ này chỉ cho phép 1 tab duy nhất được quyền hoạt động.`}
          </p>
        </div>

        <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2 text-left">
          <ShieldCheck size={20} className="text-amber-700 shrink-0" />
          <span>Tab này hiện đang bị tạm khóa để bảo vệ phiên làm việc của bạn.</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              window.close();
              window.location.href = '/';
            }}
            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Đóng Tab Này
          </button>

          <button
            type="button"
            onClick={onTakeOver}
            className="flex-1 px-4 py-3 bg-pine-teal hover:bg-pine-teal-hover text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Chuyển Quyền Sang Tab Này</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
