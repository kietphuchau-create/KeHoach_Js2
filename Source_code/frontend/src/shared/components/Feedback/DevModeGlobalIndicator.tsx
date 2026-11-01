'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Zap, X, ArrowRight, Settings, Sparkles, Move } from 'lucide-react';
import { getClinicScheduleConfig, saveClinicScheduleConfig, SCHEDULE_CONFIG_UPDATED_EVENT } from '@/shared/lib/scheduleConfig';
import { api } from '@/shared/lib/api';

const STORAGE_KEY_POS = 'medsched_dev_mode_btn_pos';
const BTN_SIZE = 54; // Kích thước nút (px)
const PADDING = 12; // Khoảng cách tối thiểu với mép màn hình (px)

export default function DevModeGlobalIndicator() {
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [showPopover, setShowPopover] = useState<boolean>(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragDataRef = useRef<{
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    hasMoved: boolean;
  }>({
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    hasMoved: false,
  });

  // 1. Khởi tạo vị trí từ localStorage hoặc góc dưới bên trái mặc định
  const getInitialPosition = useCallback(() => {
    if (typeof window === 'undefined') return { x: 20, y: 500 };
    try {
      const saved = localStorage.getItem(STORAGE_KEY_POS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed?.x === 'number' && typeof parsed?.y === 'number') {
          // Ràng buộc trong khung màn hình hiện tại
          const clampedX = Math.min(Math.max(PADDING, parsed.x), window.innerWidth - BTN_SIZE - PADDING);
          const clampedY = Math.min(Math.max(PADDING, parsed.y), window.innerHeight - BTN_SIZE - PADDING);
          return { x: clampedX, y: clampedY };
        }
      }
    } catch {}
    // Mặc định: Góc dưới bên trái (cách đáy 80px, cách mép trái 20px)
    return {
      x: 20,
      y: Math.max(PADDING, window.innerHeight - BTN_SIZE - 28),
    };
  }, []);

  useEffect(() => {
    setPosition(getInitialPosition());

    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return getInitialPosition();
        return {
          x: Math.min(Math.max(PADDING, prev.x), window.innerWidth - BTN_SIZE - PADDING),
          y: Math.min(Math.max(PADDING, prev.y), window.innerHeight - BTN_SIZE - PADDING),
        };
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [getInitialPosition]);

  // 2. Đồng bộ trạng thái Chế độ 24/7 (Dev Mode)
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

    syncState();

    const handleUpdate = () => syncState();
    window.addEventListener(SCHEDULE_CONFIG_UPDATED_EVENT, handleUpdate);

    const handleStorage = (e: StorageEvent) => {
      if (!e.key || e.key === 'medsched_clinic_schedule_config') {
        syncState();
      }
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', syncState);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('medsched_schedule_config_sync');
      bc.onmessage = (msg) => {
        if (msg.data?.type === 'SCHEDULE_CONFIG_UPDATED') {
          syncState();
        }
      };
    } catch {}

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

  // 3. Xử lý Kéo thả tự do (Pointer Events mượt mà cho cả Chuột và Cảm ứng)
  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return; // Chỉ nhận chuột trái
    e.currentTarget.setPointerCapture(e.pointerId);

    const curX = position ? position.x : 20;
    const curY = position ? position.y : window.innerHeight - BTN_SIZE - 28;

    dragDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: curX,
      initialY: curY,
      hasMoved: false,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;

    const deltaX = e.clientX - dragDataRef.current.startX;
    const deltaY = e.clientY - dragDataRef.current.startY;

    // Ngưỡng di chuyển tối thiểu 4px để phân biệt click thường và kéo thả
    if (!dragDataRef.current.hasMoved && (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4)) {
      dragDataRef.current.hasMoved = true;
      setShowPopover(false); // Đóng popover nếu đang kéo
    }

    if (dragDataRef.current.hasMoved) {
      const newX = Math.min(
        Math.max(PADDING, dragDataRef.current.initialX + deltaX),
        window.innerWidth - BTN_SIZE - PADDING
      );
      const newY = Math.min(
        Math.max(PADDING, dragDataRef.current.initialY + deltaY),
        window.innerHeight - BTN_SIZE - PADDING
      );
      setPosition({ x: newX, y: newY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!isDragging) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
    setIsDragging(false);

    if (dragDataRef.current.hasMoved) {
      // Đã kéo di chuyển -> Lưu vị trí mới vào localStorage
      if (position) {
        try {
          localStorage.setItem(STORAGE_KEY_POS, JSON.stringify(position));
        } catch {}
      }
    } else {
      // Chỉ click nhẹ tại chỗ -> Bật/tắt popover
      setShowPopover((prev) => !prev);
    }
  };

  if (!isDevMode) return null;

  // Tính toán vị trí bung Popover thông minh (tránh tràn mép màn hình khi kéo đi nơi khác)
  const isNearBottom = position ? position.y > window.innerHeight / 2 : true;
  const isNearRight = position ? position.x > window.innerWidth / 2 : false;

  const popoverClasses = [
    'absolute z-50 w-80 sm:w-96 bg-slate-900/95 text-white rounded-2xl shadow-2xl border border-amber-500/40 p-4 sm:p-5 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200',
    isNearBottom ? 'bottom-full mb-3' : 'top-full mt-3',
    isNearRight ? 'right-0' : 'left-0',
  ].join(' ');

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        left: position ? `${position.x}px` : '20px',
        top: position ? `${position.y}px` : 'auto',
        bottom: position ? 'auto' : '20px',
        zIndex: 9999, // Đảm bảo luôn nằm trên các input/form
        touchAction: 'none',
      }}
      className={`select-none ${isDragging ? '' : 'transition-[left,top] duration-75'}`}
    >
      {/* ── Nút Icon Nổi Chế Độ 24/7 (Kéo thả tự do bất kỳ đâu trên màn hình) ── */}
      <button
        type="button"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => setIsDragging(false)}
        className={`w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 text-white flex items-center justify-center shadow-xl shadow-orange-500/35 transition-transform duration-200 group relative ring-4 ring-amber-400/30 ${
          isDragging
            ? 'cursor-grabbing scale-110 shadow-2xl ring-amber-300'
            : 'cursor-grab hover:scale-110 active:scale-95'
        }`}
        title="Chế độ 24/7 đang BẬT — Giữ chuột để kéo di chuyển tự do, hoặc nhấp để xem chi tiết"
      >
        {/* Radar Ping Animation */}
        <span className="absolute -top-1 -right-1 flex h-4 w-4 pointer-events-none">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-80"></span>
          <span className="relative inline-flex items-center justify-center rounded-full h-4 w-4 bg-amber-400 text-[8px] font-black text-slate-950 border border-white shadow-xs">
            24h
          </span>
        </span>

        {/* Center Lightning Icon */}
        <Zap
          size={22}
          className="text-yellow-100 fill-yellow-200 animate-pulse group-hover:rotate-12 transition-transform drop-shadow pointer-events-none"
        />

        {/* Biểu tượng gợi ý kéo thả nhỏ */}
        <span className="absolute -bottom-1 -left-1 w-4 h-4 rounded-full bg-slate-900/90 text-amber-300 flex items-center justify-center border border-amber-400/40 text-[9px] pointer-events-none opacity-80 group-hover:opacity-100">
          <Move size={9} />
        </span>

        {/* Hover Tooltip (Chỉ hiện khi không kéo) */}
        {!isDragging && (
          <span
            className={`absolute px-3 py-1.5 rounded-xl bg-slate-950/95 text-white text-[11px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-xl border border-amber-500/40 flex items-center gap-1.5 backdrop-blur-md ${
              isNearRight ? 'right-full mr-3' : 'left-full ml-3'
            }`}
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>Kéo thả tự do • Click xem chi tiết</span>
          </span>
        )}
      </button>

      {/* ── Popover giải thích chi tiết & điều hướng nhanh (Tự căn chỉnh vị trí thông minh) ── */}
      {showPopover && (
        <div className={popoverClasses}>
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
              <span><strong>Kéo thả tự do:</strong> Bạn có thể giữ và kéo icon này sang bất kỳ vị trí nào để không che khuất ô chat hay biểu mẫu.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Xuyên đêm &amp; Ngoài giờ:</strong> Mở ca đêm (00:00 - 08:00) và ca tối (17:00 - 23:30) cho phép tiếp đón và đặt lịch tự do.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-amber-400 font-bold">•</span>
              <span><strong>Bác sĩ tự do mở lịch:</strong> Bỏ qua kiểm tra giờ hành chính và quy tắc tối thiểu 6 tiếng/ngày để tiện kiểm thử.</span>
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
