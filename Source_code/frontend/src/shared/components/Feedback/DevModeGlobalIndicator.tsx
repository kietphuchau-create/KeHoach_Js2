'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Zap, X, ArrowRight, Settings, Sparkles } from 'lucide-react';
import { getClinicScheduleConfig, saveClinicScheduleConfig, SCHEDULE_CONFIG_UPDATED_EVENT } from '@/shared/lib/scheduleConfig';
import { api } from '@/shared/lib/api';

export default function DevModeGlobalIndicator() {
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

    // 6. Đóng Popover khi click chuột ra ngoài
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener(SCHEDULE_CONFIG_UPDATED_EVENT, handleUpdate);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', syncState);
      document.removeEventListener('mousedown', handleClickOutside);
      if (bc) bc.close();
    };
  }, []);

  // Chỉ hiển thị khi Chế Độ 24/7 đang BẬT
  if (!isDevMode) return null;

  return (
    <div
      ref={containerRef}
      className="fixed bottom-3 left-2.5 sm:bottom-6 sm:left-5 z-40 select-none animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      {/* ── Nút Icon Nổi Chế Độ 24/7 (Floating Action Button ở góc dưới bên trái) ── */}
      <button
        type="button"
        onClick={() => setShowPopover((prev) => !prev)}
        className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 text-white flex items-center justify-center shadow-xl shadow-orange-500/35 hover:scale-110 active:scale-95 transition-all duration-300 group relative cursor-pointer ring-4 ring-amber-400/30"
        title="Chế độ Develop 24/7 đang BẬT — Nhấp để xem chi tiết"
      >
        {/* Radar Ping Animation */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-80"></span>
          <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-amber-400 text-[8px] font-black text-slate-950 border border-white shadow-xs">
            24h
          </span>
        </span>

        {/* Center Lightning Icon */}
        <Zap
          size={22}
          className="text-yellow-100 fill-yellow-200 animate-pulse group-hover:rotate-12 transition-transform drop-shadow"
        />

        {/* Hover Tooltip (Bung sang bên phải) */}
        <span className="absolute left-full ml-3 px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl border border-amber-500/40 flex items-center gap-1.5 backdrop-blur-md">
          <Sparkles size={13} className="text-amber-400" />
          <span>Chế Độ 24/7: ĐANG BẬT</span>
        </span>
      </button>

      {/* ── Popover giải thích chi tiết & điều hướng nhanh (Mở ngược lên trên từ góc trái) ── */}
      {showPopover && (
        <div className="absolute bottom-full left-0 mb-3 w-80 sm:w-96 bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-amber-500/40 p-4 sm:p-5 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-2 zoom-in-95 duration-200">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shadow-inner">
                <Zap size={18} className="fill-amber-300" />
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs transition cursor-pointer shadow-md shadow-amber-500/20"
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
  );
}
