import React from "react";
import Link from "next/link";
import { 
  Calendar, 
  QrCode, 
  ShieldCheck, 
  Stethoscope, 
  Building2, 
  ArrowRight,
  Bot,
  Zap,
  Lock
} from "lucide-react";
import HeroCarousel from "@/modules/home/components/HeroCarousel";

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Responsive Top Banner Hero Carousel */}
      <HeroCarousel />

      {/* Grid of 4 Role Portals */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Patient Booking */}
        <div className="bg-white p-6 rounded-2xl border border-mint-light shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-mint-light text-pine-teal flex items-center justify-center font-bold">
              <Calendar size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-primary block">Dành cho Bệnh nhân</span>
              <h3 className="font-bold text-pine-teal text-lg">Đặt Khám & Spring AI</h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Chọn cơ sở, chuyên khoa, bác sĩ, khung giờ thời gian thực và tự động tóm tắt triệu chứng bằng AI.
            </p>
          </div>
          <Link
            href="/booking"
            className="mt-5 inline-flex items-center justify-between text-xs font-semibold text-pine-teal hover:text-teal-primary pt-3 border-t border-slate-100"
          >
            <span>Trải nghiệm đặt lịch</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Card 2: Reception QR */}
        <div className="bg-white p-6 rounded-2xl border border-mint-light shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-mint-light text-pine-teal flex items-center justify-center font-bold">
              <QrCode size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-primary block">Dành cho Lễ tân</span>
              <h3 className="font-bold text-pine-teal text-lg">Quầy Tiếp Đón 1 Giây</h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Tiếp nhận bệnh nhân siêu tốc qua mã QR vé hẹn hoặc đầu đọc quét mã thẻ CCCD gắn chip (12 số).
            </p>
          </div>
          <Link
            href="/reception"
            className="mt-5 inline-flex items-center justify-between text-xs font-semibold text-pine-teal hover:text-teal-primary pt-3 border-t border-slate-100"
          >
            <span>Mở quầy tiếp đón</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Card 3: Doctor Clinic */}
        <div className="bg-white p-6 rounded-2xl border border-mint-light shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-mint-light text-pine-teal flex items-center justify-center font-bold">
              <Stethoscope size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-primary block">Dành cho Bác sĩ</span>
              <h3 className="font-bold text-pine-teal text-lg">Buồng Khám & Bệnh Án</h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Hàng đợi STT trước phòng khám, nút gọi ca khám một chạm và đọc tóm tắt lâm sàng từ Spring AI.
            </p>
          </div>
          <Link
            href="/doctor"
            className="mt-5 inline-flex items-center justify-between text-xs font-semibold text-pine-teal hover:text-teal-primary pt-3 border-t border-slate-100"
          >
            <span>Vào buồng khám bệnh</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Card 4: Admin Management */}
        <div className="bg-white p-6 rounded-2xl border border-mint-light shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-mint-light text-pine-teal flex items-center justify-center font-bold">
              <ShieldCheck size={24} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-teal-primary block">Dành cho Quản trị viên</span>
              <h3 className="font-bold text-pine-teal text-lg">Quản Trị Người Dùng</h3>
            </div>
            <p className="text-slate-500 text-xs leading-relaxed">
              Phân quyền RBAC, kích hoạt / khóa tài khoản tức thì, cấp tài khoản Bác sĩ và Nhân viên Lễ tân.
            </p>
          </div>
          <Link
            href="/admin"
            className="mt-5 inline-flex items-center justify-between text-xs font-semibold text-pine-teal hover:text-teal-primary pt-3 border-t border-slate-100"
          >
            <span>Trung tâm quản trị</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-mint-light shadow-sm">
        <h2 className="text-lg font-bold text-pine-teal mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-teal-primary" />
          <span>Kiến Trúc Kỹ Thuật Hệ Thống MedSched</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-4 rounded-xl bg-mint-soft border border-mint-light space-y-1.5">
            <span className="font-semibold text-pine-teal text-sm block">1. Spring Boot 3 Backend</span>
            <p>Kiến trúc Ports & Adapters (Hexagonal Architecture), Spring Security Stateless JWT, khóa lạc quan chống Double Booking.</p>
          </div>
          <div className="p-4 rounded-xl bg-mint-soft border border-mint-light space-y-1.5">
            <span className="font-semibold text-pine-teal text-sm block">2. Spring AI Integration</span>
            <p>Tự động phân luồng chuyên khoa tiếp nhận và tóm tắt bệnh sử 2 dòng giúp bác sĩ tiết kiệm thời gian đọc hồ sơ.</p>
          </div>
          <div className="p-4 rounded-xl bg-mint-soft border border-mint-light space-y-1.5">
            <span className="font-semibold text-pine-teal text-sm block">3. Tiếp Đón Siêu Tốc 1s</span>
            <p>Tích hợp đầu đọc thẻ CCCD gắn chip 12 số & máy quét mã QR vé hẹn điện tử, giảm tải 95% thời gian xếp hàng tại bệnh viện.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

