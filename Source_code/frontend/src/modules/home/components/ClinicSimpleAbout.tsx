'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Clock, HeartHandshake, ShieldCheck, Sparkles, CheckCircle2 } from 'lucide-react';

export default function ClinicSimpleAbout() {
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

  return (
    <section ref={sectionRef} id="about" className="scroll-mt-20 py-2 sm:py-3 overflow-hidden">
      {/* Khối Giới Thiệu Chung - Bỏ khung trắng bao ngoài, hiển thị tự nhiên trực tiếp trên nền */}
      <div
        className={`space-y-8 sm:space-y-10 transition-all duration-800 ease-out ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-12 scale-[0.98]'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center">
          {/* Cột trái: Ảnh phòng khám thân thiện, gần gũi */}
          <div
            className={`lg:col-span-5 flex justify-center transition-all duration-800 delay-100 ease-out ${
              isVisible ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 -translate-x-12 scale-95'
            }`}
          >
            <div className="relative w-full max-w-md aspect-[16/11] rounded-2xl overflow-hidden border border-mint-light shadow-md group">
              <img
                src="/clinic/care_service.png"
                alt="Phòng khám MedSched chăm sóc tận tâm"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/20 to-transparent flex items-end p-4 text-white">
                <div>
                  <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">
                    Chăm Sóc Sức Khỏe Ban Đầu
                  </span>
                  <p className="text-sm sm:text-base font-extrabold mt-0.5">
                    Phòng Khám Đa Khoa MedSched
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Cột phải: Thông điệp cốt lõi */}
          <div
            className={`lg:col-span-7 space-y-3 transition-all duration-800 delay-150 ease-out ${
              isVisible ? 'opacity-100 translate-x-0 scale-100' : 'opacity-0 translate-x-12 scale-95'
            }`}
          >
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-primary/10 text-pine-teal text-xs font-bold uppercase tracking-wider">
              <Sparkles size={13} />
              <span>Về Chúng Tôi</span>
            </div>

            <h3 className="text-xl sm:text-2xl lg:text-[26px] font-extrabold text-slate-900 tracking-tight leading-tight">
              PHÒNG KHÁM MEDSCHED <br />
              <span className="text-pine-teal">TẬN TÂM – GẦN GŨI – KHÔNG CHỜ ĐỢI</span>
            </h3>

            <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
              MedSched là phòng khám tư nhân quy mô vừa và nhỏ, chuyên cung cấp dịch vụ khám chữa bệnh ngoại trú 
              và chăm sóc sức khỏe thiết yếu cho cá nhân và gia đình. Chúng tôi hướng tới mô hình y tế thông minh, 
              nơi người bệnh được chăm sóc ân cần, nhanh chóng mà không phải mệt mỏi chen lấn hay chờ đợi hàng giờ như tại các bệnh viện lớn.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5 pt-1">
              <div className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Bác sĩ khám kỹ càng, tư vấn rõ ràng</span>
              </div>
              <div className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Đặt hẹn đúng giờ, tiếp đón trong 5 phút</span>
              </div>
              <div className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Hồ sơ bệnh án & đơn thuốc điện tử</span>
              </div>
              <div className="flex items-start gap-2 text-xs sm:text-[13px] text-slate-700">
                <CheckCircle2 size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Chi phí khám chữa bệnh minh bạch 100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Thẻ Tiêu Chí Phục Vụ - Từng Card 3D Bồng Bềnh Độc Lập */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 pt-1">
          {/* Card 1: Tiết kiệm thời gian */}
          <div
            style={{ transitionDelay: '100ms' }}
            className={`clay-floating-card p-6 sm:p-7 relative group overflow-hidden ${
              isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-90'
            }`}
          >
            {/* Lớp ánh sáng nền 3D mờ bồng bềnh */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-teal-400/15 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

            <div className="relative z-10 space-y-3">
              {/* Icon 3D phồng nổi bồng bềnh */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-pine-teal text-white flex items-center justify-center shadow-[0_10px_20px_-3px_rgba(14,92,85,0.38),inset_2px_2px_4px_rgba(255,255,255,0.5),inset_-2px_-2px_4px_rgba(0,0,0,0.18)] group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                <Clock size={22} className="drop-shadow-xs" />
              </div>

              <h4 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-pine-teal transition-colors">
                Tiết Kiệm Thời Gian
              </h4>

              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                Chủ động đặt lịch theo khung giờ 30 phút. Quét mã QR làm thủ tục tức thì, không cần bốc số xếp hàng mệt mỏi.
              </p>
            </div>
          </div>

          {/* Card 2: Bác sĩ tận tình */}
          <div
            style={{ transitionDelay: '260ms' }}
            className={`clay-floating-card p-6 sm:p-7 relative group overflow-hidden ${
              isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-90'
            }`}
          >
            {/* Lớp ánh sáng nền 3D mờ bồng bềnh */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-teal-400/15 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

            <div className="relative z-10 space-y-3">
              {/* Icon 3D phồng nổi bồng bềnh */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-pine-teal text-white flex items-center justify-center shadow-[0_10px_20px_-3px_rgba(14,92,85,0.38),inset_2px_2px_4px_rgba(255,255,255,0.5),inset_-2px_-2px_4px_rgba(0,0,0,0.18)] group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                <HeartHandshake size={22} className="drop-shadow-xs" />
              </div>

              <h4 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-pine-teal transition-colors">
                Bác Sĩ Tận Tình
              </h4>

              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                Bác sĩ chuyên khoa trực tiếp thăm khám kỹ lưỡng, lắng nghe mọi thắc mắc và đồng hành cùng sức khỏe gia đình bạn.
              </p>
            </div>
          </div>

          {/* Card 3: Chi phí hợp lý & rõ ràng */}
          <div
            style={{ transitionDelay: '420ms' }}
            className={`clay-floating-card p-6 sm:p-7 relative group overflow-hidden ${
              isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-90'
            }`}
          >
            {/* Lớp ánh sáng nền 3D mờ bồng bềnh */}
            <div className="absolute -top-12 -right-12 w-28 h-28 bg-teal-400/15 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-500 pointer-events-none" />

            <div className="relative z-10 space-y-3">
              {/* Icon 3D phồng nổi bồng bềnh */}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-pine-teal text-white flex items-center justify-center shadow-[0_10px_20px_-3px_rgba(14,92,85,0.38),inset_2px_2px_4px_rgba(255,255,255,0.5),inset_-2px_-2px_4px_rgba(0,0,0,0.18)] group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300">
                <ShieldCheck size={22} className="drop-shadow-xs" />
              </div>

              <h4 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-pine-teal transition-colors">
                Chi Phí Hợp Lý & Rõ Ràng
              </h4>

              <p className="text-xs sm:text-[13px] text-slate-600 leading-relaxed">
                Giá dịch vụ và tiền thuốc được niêm yết công khai, không kê thêm thuốc không cần thiết, không phụ phí phát sinh.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
