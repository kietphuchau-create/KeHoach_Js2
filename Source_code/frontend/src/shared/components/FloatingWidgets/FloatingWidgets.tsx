'use client';

import React, { useState, useEffect } from 'react';
import { Phone, ArrowUp, Bot } from 'lucide-react';
import { usePathname } from 'next/navigation';
import UniversalAiAssistantModal from '@/shared/components/Feedback/UniversalAiAssistantModal';
import { getAuthUser } from '@/shared/lib/api';

type InternalAssistantRole = 'STAFF' | 'DOCTOR' | 'ADMIN';

export default function FloatingWidgets() {
  const pathname = usePathname();
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [assistantRole, setAssistantRole] = useState<InternalAssistantRole | null>(null);

  useEffect(() => {
    const syncAssistantRole = () => {
      const user = getAuthUser();
      const roles: string[] = user?.roles || [];
      const legacyRole = String(user?.role || '').toUpperCase();
      const hasRole = (role: string) => roles.some(value => value === role || value.startsWith(`${role}@`));

      if (hasRole('ROLE_ADMIN') || legacyRole === 'ADMIN' || legacyRole === 'ROLE_ADMIN') {
        setAssistantRole('ADMIN');
      } else if (hasRole('ROLE_DOCTOR') || legacyRole === 'DOCTOR' || legacyRole === 'ROLE_DOCTOR') {
        setAssistantRole('DOCTOR');
      } else if (hasRole('ROLE_STAFF') || legacyRole === 'STAFF' || legacyRole === 'ROLE_STAFF') {
        setAssistantRole('STAFF');
      } else {
        setAssistantRole(null);
        setShowAiModal(false);
      }
    };

    syncAssistantRole();
    window.addEventListener('auth-change', syncAssistantRole);
    return () => window.removeEventListener('auth-change', syncAssistantRole);
  }, [pathname]);

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  return (
    <>
      <div className="fixed bottom-3 right-2.5 sm:bottom-6 sm:right-5 z-40 flex flex-col items-center gap-2 sm:gap-2.5 select-none">

        {/* Trợ lý AI nội bộ cho Bác sĩ, Lễ tân và Quản trị viên */}
        {assistantRole && (
          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            title={assistantRole === 'DOCTOR'
              ? 'Mở Trợ lý AI Bác sĩ'
              : assistantRole === 'STAFF'
                ? 'Mở Trợ lý AI Lễ tân'
                : 'Mở Trợ lý AI Quản trị viên'}
            aria-label="Mở Trợ lý AI MedSched"
            className="w-11 h-11 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-teal-600 via-teal-700 to-slate-900 text-white flex items-center justify-center shadow-xl shadow-teal-900/25 hover:scale-110 active:scale-95 transition-all duration-300 group relative cursor-pointer border-2 border-white/80"
          >
            <Bot className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white animate-pulse" />
            <span className="absolute right-full mr-2.5 px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-md">
              Trợ lý AI {assistantRole === 'DOCTOR' ? 'Bác sĩ' : assistantRole === 'STAFF' ? 'Lễ tân' : 'Quản trị'}
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

      {assistantRole && (
        <UniversalAiAssistantModal
          isOpen={showAiModal}
          onClose={() => setShowAiModal(false)}
          defaultRole={assistantRole}
        />
      )}

    </>
  );
}
