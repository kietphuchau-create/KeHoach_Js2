"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuthToken, clearAuthSession, api } from "@/shared/lib/api";

export default function ConcurrentSessionModal() {
  const router = useRouter();
  const [isKickedOut, setIsKickedOut] = useState(false);
  const [kickoutMessage, setKickoutMessage] = useState(
    "Tài khoản của bạn vừa được đăng nhập trên một trình duyệt hoặc thiết bị khác."
  );

  const handleKickout = useCallback((msg?: string) => {
    setIsKickedOut(true);
    if (msg) setKickoutMessage(msg);
    clearAuthSession();
  }, []);

  useEffect(() => {
    // 1. Lắng nghe CustomEvent từ api client khi phát hiện 401 CONCURRENT_SESSION_EXPIRED
    const onKickoutEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      handleKickout(customEvent.detail?.message);
    };

    window.addEventListener("medsched:concurrent_kickout", onKickoutEvent);

    // 2. Heartbeat kiểm tra định kỳ phiên đăng nhập (mỗi 10s) và khi người dùng chuyển lại tab
    const checkSession = async () => {
      const token = getAuthToken();
      if (!token || isKickedOut) return;
      try {
        await api.getMe();
      } catch (err: any) {
        // Lỗi CONCURRENT_SESSION_EXPIRED đã được api client tự động dispatch event
      }
    };

    const intervalId = setInterval(checkSession, 10000);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkSession();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", checkSession);

    return () => {
      window.removeEventListener("medsched:concurrent_kickout", onKickoutEvent);
      clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", checkSession);
    };
  }, [handleKickout, isKickedOut]);

  if (!isKickedOut) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center transform transition-all scale-100">
        {/* Icon cảnh báo đăng nhập đa phiên */}
        <div className="mx-auto w-16 h-16 rounded-full bg-amber-50 border-4 border-amber-100 flex items-center justify-center text-amber-600 mb-4 shadow-sm">
          <svg
            className="w-8 h-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Tiêu đề & Nội dung */}
        <h2 className="text-xl font-bold text-slate-800 tracking-tight">
          Phiên Đăng Nhập Đã Kết Thúc
        </h2>

        <p className="mt-3 text-sm text-slate-600 leading-relaxed font-medium">
          {kickoutMessage}
        </p>

        <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-left space-y-1">
          <div className="flex items-start gap-2 font-medium text-slate-700">
            <svg
              className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
            <span>Cơ chế bảo mật phiên trực tuyến đơn lẻ (Single Active Session)</span>
          </div>
          <p className="pl-6 text-slate-500">
            Nhằm bảo đảm an toàn dữ liệu bệnh án và tránh thao tác nhầm lẫn, hệ thống chỉ duy trì 1 phiên làm việc trực tuyến duy nhất tại một thời điểm.
          </p>
        </div>

        {/* Nút hành động */}
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setIsKickedOut(false);
              router.push("/login");
            }}
            className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              />
            </svg>
            Đăng Nhập Lại
          </button>
        </div>
      </div>
    </div>
  );
}
