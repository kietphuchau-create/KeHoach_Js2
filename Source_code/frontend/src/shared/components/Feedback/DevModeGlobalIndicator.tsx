'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, X, ShieldAlert, ArrowRight, Settings } from 'lucide-react';
import { getClinicScheduleConfig, saveClinicScheduleConfig, SCHEDULE_CONFIG_UPDATED_EVENT } from '@/shared/lib/scheduleConfig';
import { api } from '@/shared/lib/api';

export default function DevModeGlobalIndicator() {
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  useEffect(() => {
    const syncState = () => {
      const localCfg = getClinicScheduleConfig();
      setIsDevMode(Boolean(localCfg.devMode247));
      api.getDevMode()
        .then((res) => {
          if (typeof res?.enabled === 'boolean') {
            setIsDevMode(res.enabled);
            if (Boolean(localCfg.devMode247) !== res.enabled) {
              saveClinicScheduleConfig({ devMode247: res.enabled });
            }
          }
        })
        .catch(() => {});
    };

    // 1. Kiểm tra ban đầu
    syncState();

    // 2. Lắng nghe sự kiện cập nhật cấu hình toàn cục trong tab
    const handleUpdate = () => syncState();
    window.addEventListener(SCHEDULE_CONFIG_UPDATED_EVENT, handleUpdate);

    // 3. Lắng nghe sự kiện storage khi tab khác thay đổi localStorage
    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'medsched_clinic_schedule_config') {
        syncState();
      }
    };
    window.addEventListener('storage', handleStorage);

    // 4. Lắng nghe khi người dùng chuyển tab quay lại (focus)
    window.addEventListener('focus', syncState);

    // 5. Lắng nghe BroadcastChannel xuyên tab tức thì
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('medsched_schedule_config_sync');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'SCHEDULE_CONFIG_UPDATED') {
          syncState();
        }
      };
    } catch {}

    return () => {
      window.removeEventListener(SCHEDULE_CONFIG_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', syncState);
      if (bc) bc.close();
    };
  }, []);

  if (!isDevMode) return null;

  return (
    <>
      {/* ── Nút ghim cố định toàn viện ở góc trên bên phải ── */}
      <div className="fixed top-2.5 right-2.5 sm:top-3.5 sm:right-5 z-50 animate-in fade-in slide-in-from-top-3 duration-300">
        {isMinimized ? (
          <button
            type="button"
            onClick={() => {
              setIsMinimized(false);
              setShowPopover(true);
            }}
            className="group relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30 border border-amber-300/60 backdrop-blur-md cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95"
            title="Chế độ 24/7 đang bật — Bấm để mở rộng"
          >
            <span className="relative flex h-2 w-2 absolute -top-0.5 -right-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-200"></span>
            </span>
            <Zap size={15} className="text-yellow-100 fill-yellow-200 animate-pulse" />
          </button>
        ) : (
          <div className="inline-flex items-center rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 shadow-lg shadow-amber-500/30 border border-amber-300/60 backdrop-blur-md transition-all duration-200 hover:scale-102">
            <button
              type="button"
              onClick={() => setShowPopover((prev) => !prev)}
              className="group relative inline-flex items-center gap-2 pl-3.5 pr-2 py-1.5 sm:pl-4 sm:pr-2.5 sm:py-2 text-white font-extrabold text-[11px] sm:text-xs cursor-pointer select-none"
              title="Bấm để xem chi tiết Chế độ Develop 24/7"
            >
              {/* Animated beacon dot */}
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-80"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-yellow-200"></span>
              </span>

              <Zap size={14} className="text-yellow-100 fill-yellow-200 animate-pulse" />
              <span className="tracking-wide uppercase font-black">Chế Độ 24/7: ĐANG BẬT</span>
              <span className="hidden md:inline bg-black/25 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Thử nghiệm
              </span>
            </button>
            <button
              type="button"
              onClick={() => setIsMinimized(true)}
              className="pr-2.5 pl-1 py-1.5 text-white/70 hover:text-white hover:scale-110 transition cursor-pointer text-[10px] font-bold"
              title="Thu nhỏ nút"
            >
              ✕
            </button>
          </div>
        )}

        {/* ── Popover giải thích chi tiết & điều hướng nhanh ── */}
        {showPopover && (
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-amber-500/40 p-4 sm:p-5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center">
                  <Zap size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
                    Chế Độ Develop 24/7
                  </h3>
                  <p className="text-[10px] text-slate-400">
                    Đang hoạt động trên toàn bộ hệ thống
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPopover(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="py-3 space-y-2 text-xs text-slate-300 leading-relaxed">
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Xuyên đêm &amp; Ngoài giờ:</strong> Mở ca đêm (00:00 - 08:00) và ca tối (17:00 - 23:30) cho phép tiếp đón và đặt lịch tự do.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Bác sĩ tự do mở lịch:</strong> Bỏ qua kiểm tra giờ hành chính và quy tắc tối thiểu 6 tiếng/ngày để tiện kiểm thử.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Quầy tiếp đón 24/7:</strong> Bỏ qua ràng buộc giờ hành chính ngoại trú (08:00-12:00, 13:30-17:00).</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
              <Link
                href="/admin/schedule-config"
                onClick={() => setShowPopover(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer"
              >
                <Settings size={13} />
                <span>Cấu Hình &amp; Tắt 24/7</span>
                <ArrowRight size={13} />
              </Link>
              <button
                type="button"
                onClick={() => setShowPopover(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
