'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Sparkles,
  QrCode,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  CheckCircle2,
  Pause,
  Play,
  Bot
} from 'lucide-react';

interface Slide {
  id: number;
  tag: string;
  tagIcon: React.ReactNode;
  title: string;
  titleHighlight: string;
  description: string;
  primaryCta: {
    text: string;
    href: string;
    icon: React.ReactNode;
  };
  secondaryCta: {
    text: string;
    href: string;
    icon: React.ReactNode;
  };
  stats: {
    icon: React.ReactNode;
    val: string;
    label: string;
  }[];
  accentBadge: {
    title: string;
    subtitle: string;
    icon: React.ReactNode;
  };
  bgGradient: string;
}

const slides: Slide[] = [
  {
    id: 1,
    tag: 'Tích hợp Spring AI 2026',
    tagIcon: <Sparkles size={14} className="text-amber-300 animate-pulse" />,
    title: 'Đặt Lịch Khám Thông Minh &',
    titleHighlight: 'Phân Loại Triệu Chứng AI',
    description:
      'Trợ lý Spring AI tự động phân loại chuyên khoa phù hợp và tóm tắt bệnh sử lâm sàng 2 dòng giúp Bác sĩ chuẩn bị trước ca khám, tiết kiệm 80% thời gian chờ đợi.',
    primaryCta: {
      text: 'Đặt Lịch Khám Ngay',
      href: '/booking',
      icon: <Calendar size={18} />,
    },
    secondaryCta: {
      text: 'Đăng Nhập Phân Quyền',
      href: '/login',
      icon: <ArrowRight size={16} />,
    },
    stats: [
      { icon: <Clock size={16} className="text-emerald-400" />, val: '15 phút', label: 'Khung giờ chính xác' },
      { icon: <Bot size={16} className="text-cyan-300" />, val: 'Spring AI', label: 'Trợ lý sàng lọc' },
      { icon: <CheckCircle2 size={16} className="text-amber-300" />, val: '100%', label: 'Xác thực tự động' },
    ],
    accentBadge: {
      title: 'Phân Luồng Tự Động AI',
      subtitle: 'Tóm tắt tiền sử bệnh án & gợi ý chuyên khoa',
      icon: <Bot size={28} className="text-cyan-300" />,
    },
    bgGradient: 'from-[#0A3C37] via-[#0E5C55] to-[#1D6066]',
  },
  {
    id: 2,
    tag: 'Tiếp Đón Siêu Tốc 1s',
    tagIcon: <Zap size={14} className="text-yellow-300" />,
    title: 'Check-in Tức Thì Với Mã',
    titleHighlight: 'QR & Thẻ CCCD Gắn Chip',
    description:
      'Lễ tân quét mã vé hẹn điện tử trên Smartphone hoặc thẻ căn cước 12 số để xác thực thông tin và cấp ngay số thứ tự phòng khám chỉ trong đúng 1 giây.',
    primaryCta: {
      text: 'Mở Quầy Tiếp Đón',
      href: '/reception',
      icon: <QrCode size={18} />,
    },
    secondaryCta: {
      text: 'Xem Quy Trình Quét',
      href: '/reception',
      icon: <ArrowRight size={16} />,
    },
    stats: [
      { icon: <Zap size={16} className="text-yellow-300" />, val: '< 1 Giây', label: 'Tốc độ quét check-in' },
      { icon: <ShieldCheck size={16} className="text-emerald-300" />, val: '12 Số', label: 'Chuẩn CCCD Gắn Chip' },
      { icon: <CheckCircle2 size={16} className="text-cyan-300" />, val: 'Zero Wait', label: 'Giảm 95% hàng chờ' },
    ],
    accentBadge: {
      title: 'Tiếp Đón 1-Click QR',
      subtitle: 'Xác nhận vé hẹn & cấp STT tự động',
      icon: <QrCode size={28} className="text-emerald-300" />,
    },
    bgGradient: 'from-[#0D4B46] via-[#1A6B6B] to-[#2A7F85]',
  },
  {
    id: 3,
    tag: 'Dành Cho Bác Sĩ & Quản Trị',
    tagIcon: <Stethoscope size={14} className="text-teal-200" />,
    title: 'Buồng Khám Điện Tử &',
    titleHighlight: 'Phân Quyền RBAC Bảo Mật',
    description:
      'Hàng đợi gọi tên thời gian thực tại buồng khám, tích hợp bệnh án điện tử và quản lý người dùng 4 vai trò (Bệnh nhân, Lễ tân, Bác sĩ, Quản trị viên).',
    primaryCta: {
      text: 'Vào Buồng Khám Bệnh',
      href: '/doctor',
      icon: <Stethoscope size={18} />,
    },
    secondaryCta: {
      text: 'Trung Tâm Quản Trị',
      href: '/admin',
      icon: <ShieldCheck size={16} />,
    },
    stats: [
      { icon: <Stethoscope size={16} className="text-cyan-300" />, val: 'Realtime', label: 'Gọi STT tự động' },
      { icon: <ShieldCheck size={16} className="text-emerald-300" />, val: 'RBAC', label: 'Phân quyền 4 cấp' },
      { icon: <CheckCircle2 size={16} className="text-amber-300" />, val: 'Hexagonal', label: 'Kiến trúc Spring 3' },
    ],
    accentBadge: {
      title: 'Bàn Khám Bác Sĩ EMR',
      subtitle: 'Gọi ca tiếp theo & xem tóm tắt triệu chứng',
      icon: <Stethoscope size={28} className="text-teal-200" />,
    },
    bgGradient: 'from-[#093531] via-[#0E5C55] to-[#184E56]',
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Auto-slide transition
  useEffect(() => {
    if (isPaused) return;

    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);

    return () => clearInterval(timer);
  }, [isPaused]);

  const handleNext = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  const handlePrev = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  // Touch Swipe logic for mobile responsiveness
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 50;

    if (distance > minSwipeDistance) {
      // Swiped left -> next slide
      handleNext();
    } else if (distance < -minSwipeDistance) {
      // Swiped right -> prev slide
      handlePrev();
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  const slide = slides[current];

  return (
    <div
      className="relative rounded-3xl overflow-hidden shadow-2xl border border-teal-800/40 select-none transition-all duration-700"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Dynamic Slide Background with Gradient */}
      <div
        className={`bg-gradient-to-r ${slide.bgGradient} text-white transition-all duration-700 p-6 sm:p-10 lg:p-12 min-h-[380px] sm:min-h-[420px] flex flex-col justify-between relative overflow-hidden`}
      >
        {/* Abstract Background Decorative Glow Circles */}
        <div className="absolute -right-16 -top-16 w-80 h-80 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Badge & Play/Pause controls */}
        <div className="relative z-10 flex items-center justify-between gap-4 mb-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-white/15 backdrop-blur-md text-mint-light border border-white/20 shadow-xs">
            {slide.tagIcon}
            <span>{slide.tag}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPaused(!isPaused)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white transition cursor-pointer text-xs flex items-center gap-1 px-2.5 border border-white/10"
              title={isPaused ? 'Tiếp tục tự động chuyển' : 'Tạm dừng carousel'}
            >
              {isPaused ? <Play size={12} /> : <Pause size={12} />}
              <span className="text-[11px] hidden sm:inline">{isPaused ? 'Tự động' : 'Tạm dừng'}</span>
            </button>
            <span className="text-xs font-mono font-medium text-white/70 bg-black/20 px-2 py-0.5 rounded-full border border-white/10">
              0{current + 1} / 0{slides.length}
            </span>
          </div>
        </div>

        {/* Main Content Grid (Responsive 2 Cols on lg) */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center my-auto py-2">
          {/* Left Text Column (8 cols) */}
          <div className="lg:col-span-7 space-y-4 text-left">
            <h1 className="text-2xl sm:text-4xl lg:text-4xl font-black tracking-tight leading-tight sm:leading-snug text-white">
              {slide.title}{' '}
              <span className="block sm:inline text-transparent bg-clip-text bg-gradient-to-r from-mint-light via-emerald-200 to-cyan-300">
                {slide.titleHighlight}
              </span>
            </h1>

            <p className="text-slate-200 text-xs sm:text-sm lg:text-base leading-relaxed max-w-2xl font-normal opacity-95">
              {slide.description}
            </p>

            {/* Action Buttons */}
            <div className="pt-2 flex flex-wrap gap-3 items-center">
              <Link
                href={slide.primaryCta.href}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold px-6 py-3 rounded-2xl transition-all duration-200 shadow-lg shadow-emerald-950/40 hover:scale-[1.02] text-sm active:scale-[0.98]"
              >
                {slide.primaryCta.icon}
                <span>{slide.primaryCta.text}</span>
              </Link>
              <Link
                href={slide.secondaryCta.href}
                className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/25 font-semibold px-5 py-3 rounded-2xl transition-all duration-200 backdrop-blur-md text-sm hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>{slide.secondaryCta.text}</span>
                {slide.secondaryCta.icon}
              </Link>
            </div>
          </div>

          {/* Right Floating Card / Visual Badge (5 cols, visible on md/lg) */}
          <div className="lg:col-span-5 hidden md:block">
            <div className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-xl space-y-4 hover:border-white/40 transition">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                  {slide.accentBadge.icon}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{slide.accentBadge.title}</h3>
                  <p className="text-xs text-mint-light/90">{slide.accentBadge.subtitle}</p>
                </div>
              </div>

              {/* Stats Bar inside Card */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/15 text-center">
                {slide.stats.map((st, i) => (
                  <div key={i} className="p-2 rounded-xl bg-black/20 border border-white/10 flex flex-col items-center">
                    <div className="mb-1">{st.icon}</div>
                    <span className="font-extrabold text-xs text-white">{st.val}</span>
                    <span className="text-[10px] text-slate-300 font-medium truncate w-full">{st.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar: Indicators & Navigation Arrows */}
        <div className="relative z-10 pt-4 mt-2 border-t border-white/10 flex items-center justify-between">
          {/* Slide Indicator Dots */}
          <div className="flex items-center gap-2">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrent(idx)}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  current === idx
                    ? 'w-8 bg-mint-light shadow-md shadow-mint-light/50'
                    : 'w-2.5 bg-white/30 hover:bg-white/60'
                }`}
                aria-label={`Chuyển đến slide ${idx + 1}`}
              />
            ))}
          </div>

          {/* Mobile Stats Pills (only on mobile screens) */}
          <div className="flex md:hidden items-center gap-2 text-[11px] text-white/90">
            <span className="bg-white/15 px-2.5 py-1 rounded-full border border-white/20 flex items-center gap-1 font-semibold">
              {slide.stats[0].icon} {slide.stats[0].val}
            </span>
          </div>

          {/* Prev / Next Arrows */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/35 text-white transition border border-white/20 cursor-pointer backdrop-blur-xs flex items-center justify-center"
              aria-label="Slide trước đó"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="p-2.5 rounded-full bg-white/10 hover:bg-white/25 active:bg-white/35 text-white transition border border-white/20 cursor-pointer backdrop-blur-xs flex items-center justify-center"
              aria-label="Slide tiếp theo"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
