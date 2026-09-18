'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Stethoscope,
  Bot,
} from 'lucide-react';

interface BannerSlide {
  id: number;
  image: string;
  title: string;
  href: string;
}

const bannerSlides: BannerSlide[] = [
  {
    id: 1,
    image: '/banners/banner1.png',
    title: 'Dịch Vụ Y Tế Chất Lượng Cao - Chăm Sóc Toàn Diện Cho Gia Đình Bạn',
    href: '/booking',
  },
  {
    id: 2,
    image: '/banners/banner2.png',
    title: 'Kiểm Soát Huyết Áp Cao: 5 Bước Quan Trọng Để Bảo Vệ Sức Khỏe Của Bạn',
    href: '/booking',
  },
  {
    id: 3,
    image: '/banners/banner3.png',
    title: 'Bí Quyết Tăng Cường Sức Khỏe Tim Mạch - Sống Khỏe Mỗi Ngày',
    href: '/booking',
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-slide transition continuously every 5 seconds, pauses when mouse hovers
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % bannerSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrent((prev) => (prev - 1 + bannerSlides.length) % bannerSlides.length);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrent((prev) => (prev + 1) % bannerSlides.length);
  };

  return (
    <div className="space-y-6">
      {/* Banner Carousel Container */}
      <div
        className="relative group rounded-3xl overflow-hidden shadow-xl border border-mint-light select-none bg-slate-900"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Slides Track */}
        <div className="relative w-full aspect-[16/8.5] sm:aspect-[2/1] lg:aspect-[21/9] max-h-[480px] overflow-hidden">
          {bannerSlides.map((slide, idx) => {
            const isActive = current === idx;
            return (
              <div
                key={slide.id}
                className={`absolute inset-0 w-full h-full transition-opacity duration-700 ease-in-out ${
                  isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
                }`}
              >
                <Link href={slide.href} className="block w-full h-full relative cursor-pointer group/link">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover/link:scale-[1.01]"
                  />
                  {/* Subtle gradient overlay at bottom for controls readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-60 pointer-events-none" />
                </Link>
              </div>
            );
          })}
        </div>

        {/* Previous / Next Arrow Controls */}
        <button
          onClick={handlePrev}
          aria-label="Slide trước"
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-pine-teal text-white backdrop-blur-md flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg cursor-pointer hover:scale-110 active:scale-95"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={handleNext}
          aria-label="Slide kế tiếp"
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 hover:bg-pine-teal text-white backdrop-blur-md flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-lg cursor-pointer hover:scale-110 active:scale-95"
        >
          <ChevronRight size={24} />
        </button>

        {/* Bottom Bar: Indicators & Current Slide Number */}
        <div className="absolute bottom-4 left-0 right-0 z-20 px-6 flex items-center justify-between pointer-events-none">
          {/* Indicator Dots */}
          <div className="flex items-center gap-2 pointer-events-auto bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
            {bannerSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                aria-label={`Chuyển tới slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  current === idx
                    ? 'w-8 bg-mint-light shadow-sm'
                    : 'w-2 bg-white/50 hover:bg-white'
                }`}
              />
            ))}
          </div>

          {/* Slide counter */}
          <div className="text-white text-xs font-semibold bg-black/40 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10">
            {current + 1} / {bannerSlides.length}
          </div>
        </div>
      </div>

      {/* Quick Services Strip underneath Carousel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Link
          href="/booking"
          className="bg-white hover:bg-mint-soft/60 p-4 rounded-2xl border border-mint-light shadow-xs transition group flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-xl bg-teal-50 text-pine-teal flex items-center justify-center border border-teal-100 group-hover:scale-110 transition">
            <Calendar size={22} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm group-hover:text-pine-teal transition">Đặt Lịch Khám Online</h4>
            <p className="text-xs text-slate-500">Chọn bác sĩ, chuyên khoa & giờ khám</p>
          </div>
        </Link>

        <Link
          href="/reception"
          className="bg-white hover:bg-mint-soft/60 p-4 rounded-2xl border border-mint-light shadow-xs transition group flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 group-hover:scale-110 transition">
            <QrCode size={22} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition">Tiếp Đón Nhanh 1 Giây</h4>
            <p className="text-xs text-slate-500">Quét mã vé hẹn QR & thẻ CCCD gắn chip</p>
          </div>
        </Link>

        <Link
          href="/doctor"
          className="bg-white hover:bg-mint-soft/60 p-4 rounded-2xl border border-mint-light shadow-xs transition group flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 group-hover:scale-110 transition">
            <Stethoscope size={22} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition">Buồng Khám Bác Sĩ</h4>
            <p className="text-xs text-slate-500">Gọi số thứ tự & quản lý bệnh án điện tử</p>
          </div>
        </Link>

        <Link
          href="/booking"
          className="bg-white hover:bg-mint-soft/60 p-4 rounded-2xl border border-mint-light shadow-xs transition group flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-xl bg-cyan-50 text-cyan-700 flex items-center justify-center border border-cyan-100 group-hover:scale-110 transition">
            <Bot size={22} />
          </div>
          <div>
            <h4 className="font-bold text-slate-800 text-sm group-hover:text-cyan-700 transition">Trợ Lý Spring AI</h4>
            <p className="text-xs text-slate-500">Phân loại triệu chứng & gợi ý chuyên khoa</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
