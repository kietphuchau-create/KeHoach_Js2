'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';

interface BannerSlide {
  id: number;
  image: string;
  title: string;
  href: string;
}

interface FeatureCard {
  id: number;
  image: string;
  tag: string;
  tagColor: string;
  title: string;
  description: string;
  href: string;
  actionText: string;
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

const featureCards: FeatureCard[] = [
  {
    id: 1,
    image: '/cards/card2.png',
    tag: 'Đặt Khám 24/7',
    tagColor: 'bg-emerald-600',
    title: 'Đặt Lịch Khám Trực Tuyến',
    description: 'Chủ động chọn bác sĩ, chi nhánh và giờ khám nhanh chóng qua ứng dụng hoặc website mà không cần xếp hàng chờ đợi.',
    href: '/booking',
    actionText: 'Đặt Lịch Ngay',
  },
  {
    id: 2,
    image: '/cards/card1.png',
    tag: 'Chuyên Gia Tận Tâm',
    tagColor: 'bg-pine-teal',
    title: 'Tư Vấn & Khám Bác Sĩ',
    description: 'Đội ngũ bác sĩ chuyên khoa giàu kinh nghiệm trực tiếp thăm khám, tư vấn giải pháp điều trị tối ưu và theo dõi hồ sơ liên tục.',
    href: '/booking',
    actionText: 'Tìm Bác Sĩ',
  },
  {
    id: 3,
    image: '/cards/card3.png',
    tag: 'Y Tế Thông Minh',
    tagColor: 'bg-teal-700',
    title: 'Hồ Sơ Sức Khỏe & Tiếp Đón QR',
    description: 'Tiếp đón tự động bằng mã QR và CCCD gắn chip trong 1 giây, quản lý bệnh án điện tử an toàn và tra cứu kết quả tức thì.',
    href: '/reception',
    actionText: 'Khám Phá Ngay',
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
    <div className="w-full space-y-8">
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

        {/* Nút Đặt Lịch Khám xanh lá đè lên góc dưới bên trái Carousel */}
        <div className="absolute left-4 sm:left-6 bottom-4 sm:bottom-6 z-20">
          <Link
            href="/booking"
            className="inline-flex items-center gap-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-pine-teal hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold px-5 sm:px-6 py-2.5 sm:py-3.5 rounded-2xl transition-all duration-300 shadow-xl shadow-black/50 hover:shadow-emerald-900/60 hover:scale-105 active:scale-95 border border-white/40 text-xs sm:text-sm backdrop-blur-xs group/btn"
          >
            <Calendar size={18} className="group-hover/btn:rotate-12 transition-transform duration-300 text-mint-light" />
            <span>Đặt Lịch Khám Ngay</span>
          </Link>
        </div>

        {/* Góc dưới bên phải: Bộ đốm chuyển slide & Bộ đếm */}
        <div className="absolute right-4 sm:right-6 bottom-4 sm:bottom-6 z-20 flex items-center gap-2 pointer-events-auto">
          {/* Indicator Dots */}
          <div className="flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-2 rounded-full border border-white/20 shadow-lg">
            {bannerSlides.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrent(idx)}
                aria-label={`Chuyển tới slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  current === idx
                    ? 'w-7 bg-mint-light shadow-xs'
                    : 'w-2 bg-white/40 hover:bg-white'
                }`}
              />
            ))}
          </div>

          {/* Slide counter */}
          <div className="text-white text-xs font-bold bg-black/40 backdrop-blur-md px-2.5 py-1.5 rounded-full border border-white/20 shadow-lg hidden sm:block">
            {current + 1}/{bannerSlides.length}
          </div>
        </div>
      </div>

      {/* 3 Cards bên dưới Carousel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {featureCards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className="group bg-white rounded-3xl overflow-hidden border border-mint-light shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col cursor-pointer"
          >
            {/* Ảnh minh họa của card */}
            <div className="relative aspect-[16/10] overflow-hidden bg-mint-soft/50">
              <img
                src={card.image}
                alt={card.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <span className={`absolute top-3.5 left-3.5 ${card.tagColor} text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md backdrop-blur-xs`}>
                {card.tag}
              </span>
            </div>

            {/* Nội dung card */}
            <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-800 group-hover:text-pine-teal transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed mt-2 line-clamp-3">
                  {card.description}
                </p>
              </div>

              <div className="pt-3 flex items-center justify-between border-t border-slate-100 text-pine-teal font-bold text-xs sm:text-sm">
                <span>{card.actionText}</span>
                <span className="w-8 h-8 rounded-full bg-mint-light text-pine-teal flex items-center justify-center group-hover:bg-pine-teal group-hover:text-white transition-colors duration-200">
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
