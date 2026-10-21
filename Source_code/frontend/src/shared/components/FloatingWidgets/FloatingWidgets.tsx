'use client';

import React, { useState, useEffect } from 'react';
import { Phone, ArrowUp, MessageCircle, Bot, Sparkles } from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import UniversalAiAssistantModal from '@/shared/components/Feedback/UniversalAiAssistantModal';
import { getAuthToken } from '@/shared/lib/api';

export default function FloatingWidgets() {
  const router = useRouter();
  const pathname = usePathname();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Dọn dẹp cờ cũ nếu còn sót lại để tránh tự động hiện khung chat không mong muốn
  useEffect(() => {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('medsched_open_ai');
    }
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenAi = () => {
    const token = getAuthToken();
    if (!token) {
      router.push(`/login?reason=ai_required&redirect=${encodeURIComponent(pathname || '/')}`);
      return;
    }
    setShowAiModal(true);
  };

  // Không hiển thị nút nổi trên các trang xác thực, chọn phương thức đặt lịch
  const isExcluded = 
    pathname === '/login' || 
    pathname === '/register' || 
    pathname === '/forgot-password' ||
    pathname === '/booking-method';

  if (isExcluded) {
    return null;
  }

  // Xác định vai trò mặc định theo URL
  const defaultRole = pathname.startsWith('/reception')
    ? 'STAFF'
    : pathname.startsWith('/doctor')
    ? 'DOCTOR'
    : pathname.startsWith('/admin') || pathname.startsWith('/statistics')
    ? 'ADMIN'
    : 'PATIENT';

  return (
    <>
      <div className="fixed bottom-3 right-2.5 sm:bottom-6 sm:right-5 z-40 flex flex-col items-center gap-2 sm:gap-2.5 select-none">
        {/* Nút Trợ Lý AI Thông Minh (MCP) - Không hiển thị ở trang đặt lịch khám thủ công để trải nghiệm thuần tuý */}
        {!pathname?.startsWith('/booking') && (
          <button
            type="button"
            onClick={handleOpenAi}
            title="Trợ lý AI MedSched (MCP Protocol)"
            className="w-10 h-10 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-teal-700 to-teal-500 text-white flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all duration-300 group relative cursor-pointer ring-4 ring-teal-400/30 animate-bounce hover:animate-none"
          >
            <Bot size={22} className="group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
            </span>
            <span className="absolute right-full mr-2.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              Trợ Lý AI (Lễ tân, Bác sĩ, Admin)
            </span>
          </button>
        )}

        {/* 1. Nút Zalo Chat */}
        <a
          href="https://zalo.me"
          target="_blank"
          rel="noreferrer"
          title="Chat Zalo với tư vấn viên MedSched"
          className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-[#0068ff] text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 group relative cursor-pointer"
        >
          <span className="font-extrabold text-[11px] sm:text-sm tracking-tighter">Zalo</span>
          <span className="absolute right-full mr-2.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md">
            Chat Zalo 24/7
          </span>
        </a>

        {/* 2. Nút Gọi Hotline Ngay */}
        <a
          href="tel:02835352468"
          title="Gọi điện hotline hỗ trợ y tế"
          className="w-9 h-9 sm:w-12 sm:h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-all duration-300 group relative animate-pulse cursor-pointer"
        >
          <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="absolute right-full mr-2.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md">
            Hotline: (028) 3535 2468
          </span>
        </a>

        {/* 3. Nút Cuộn Lên Đầu Trang (Scroll to Top) */}
        {showScrollTop && (
          <button
            type="button"
            onClick={scrollToTop}
            title="Cuộn lên đầu trang"
            aria-label="Cuộn lên đầu trang"
            className="w-8 h-8 sm:w-11 sm:h-11 rounded-full bg-slate-800/90 hover:bg-pine-teal text-white flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer backdrop-blur-xs"
          >
            <ArrowUp className="w-3.5 h-3.5 sm:w-[18px] sm:h-[18px]" />
          </button>
        )}
      </div>

      <UniversalAiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        defaultRole={defaultRole as any}
      />
    </>
  );
}
