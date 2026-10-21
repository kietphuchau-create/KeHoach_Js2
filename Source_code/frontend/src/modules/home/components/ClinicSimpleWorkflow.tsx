'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Calendar, QrCode, FileText, ArrowRight } from 'lucide-react';

export default function ClinicSimpleWorkflow() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.15,
        rootMargin: '0px 0px -60px 0px',
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const steps = [
    {
      step: '01',
      icon: Calendar,
      title: 'Đặt Lịch Trực Tuyến',
      desc: 'Chọn bác sĩ, chuyên khoa và khung giờ 30 phút phù hợp ngay trên website mà không cần đến sớm xếp hàng.',
      color: 'bg-gradient-to-br from-emerald-500 to-emerald-700',
      tag: 'Chủ động thời gian',
      href: '/booking',
    },
    {
      step: '02',
      icon: QrCode,
      title: 'Check-in QR Trong 3 Giây',
      desc: 'Đến phòng khám, đưa mã QR trên điện thoại vào máy quét tại quầy lễ tân để nhận số phòng khám ngay lập tức.',
      color: 'bg-gradient-to-br from-teal-500 to-pine-teal',
      tag: 'Không cần bốc số',
      href: '/booking',
    },
    {
      step: '03',
      icon: FileText,
      title: 'Khám & Nhận Đơn Điện Tử',
      desc: 'Gặp bác sĩ đúng giờ hẹn thăm khám tận tình. Toàn bộ đơn thuốc và kết quả khám được lưu an toàn trên hồ sơ trực tuyến.',
      color: 'bg-gradient-to-br from-teal-600 to-teal-800',
      tag: 'Minh bạch & An tâm',
      href: '/my-appointments',
    }
  ];

  return (
    <section ref={sectionRef} id="workflow" className="scroll-mt-24 space-y-6 py-4 overflow-hidden">
      {/* Tiêu đề hiệu ứng trượt xuất hiện */}
      <div
        className={`text-center max-w-2xl mx-auto transition-all duration-800 ease-out ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 -translate-y-10 scale-95'
        }`}
      >
        <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          QUY TRÌNH KHÁM BỆNH NHANH CHÓNG
        </h3>
      </div>

      {/* 3 Thẻ quy trình hiệu ứng 3D bồng bềnh xuất hiện lần lượt khi lăn chuột tới */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          const delayMs = idx === 0 ? 100 : idx === 1 ? 260 : 420;

          return (
            <Link
              key={item.step}
              href={item.href}
              style={{ transitionDelay: `${delayMs}ms` }}
              className={`clay-floating-card p-6 sm:p-7 relative group flex flex-col justify-between cursor-pointer overflow-hidden ${
                isVisible
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 translate-y-16 scale-90'
              }`}
            >
              {/* Lớp ánh sáng nền 3D mờ bồng bềnh */}
              <div className="absolute -top-12 -right-12 w-28 h-28 bg-teal-400/15 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${item.color} text-white flex items-center justify-center shadow-[0_10px_20px_-3px_rgba(14,92,85,0.35),inset_2px_2px_4px_rgba(255,255,255,0.5),inset_-2px_-2px_4px_rgba(0,0,0,0.18)] group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300`}>
                    <Icon size={22} className="drop-shadow-xs" />
                  </div>
                  <span className="font-mono text-2xl font-black text-slate-200 group-hover:text-pine-teal/40 transition-colors">
                    {item.step}
                  </span>
                </div>

                <span className="inline-block text-[10px] font-bold text-pine-teal uppercase tracking-wider px-2.5 py-1 rounded-full bg-mint-light/80 border border-mint-light mb-2.5">
                  {item.tag}
                </span>

                <h4 className="text-base sm:text-lg font-bold text-slate-900 mb-2 group-hover:text-pine-teal transition-colors">
                  {item.title}
                </h4>

                <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100/80 flex items-center text-xs font-semibold text-pine-teal group-hover:translate-x-1.5 transition-transform relative z-10">
                <span>Trải nghiệm ngay</span>
                <ArrowRight size={14} className="ml-1" />
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
