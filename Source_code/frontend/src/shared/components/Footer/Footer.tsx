'use client';

import React, { useEffect, useState, useRef } from 'react';

export default function Footer() {
  const [isVisible, setIsVisible] = useState(false);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -20px 0px',
      }
    );

    if (footerRef.current) {
      observer.observe(footerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <footer
      ref={footerRef}
      className={`bg-white !rounded-none border-t border-slate-200/80 py-3 sm:py-4 text-xs text-slate-500 transition-all duration-700 ease-out ${
        isVisible
          ? 'opacity-100 translate-y-0 scale-100'
          : 'opacity-0 translate-y-6 scale-98'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 sm:gap-2">
        {/* Hàng 1: Logo & Thông tin hệ thống */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <img src="/logo.png" alt="MedSched Logo" className="w-4 h-4 sm:w-5 sm:h-5 object-contain shrink-0" />
          <span className="font-bold text-pine-teal shrink-0">MedSched</span>
          <span className="text-slate-600 text-[11px] sm:text-xs">
            <span className="hidden sm:inline">Hệ thống </span>Đặt lịch & Tiếp đón Thông minh
          </span>
        </div>

        {/* Hàng 2: Bản quyền (gióng thẳng hàng với mép trái logo) */}
        <p className="text-slate-400 text-[10px] sm:text-[11px] sm:whitespace-nowrap text-left break-words">
          © 2026 MedSched Healthcare System. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
