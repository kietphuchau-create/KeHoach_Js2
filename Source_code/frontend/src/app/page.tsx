import React from "react";
import Link from "next/link";
import { 
  Calendar, 
  QrCode, 
  ShieldCheck, 
  User, 
  LogIn, 
  Stethoscope, 
  CheckCircle2, 
  Bot, 
  Building2, 
  ArrowRight,
  Sparkles
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950 text-white p-8 sm:p-12 rounded-3xl shadow-xl border border-slate-700/50">
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <Sparkles size={14} className="text-cyan-400" />
            <span>Đồ án Java Spring 2 - Kiến Trúc Lục Giác & Spring AI</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Xin chào <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">Nhi</span>
          </h1>

          <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
            Nền tảng tích hợp toàn diện quy trình khám chữa bệnh: Đăng nhập & phân quyền JWT (Admin, Bác sĩ, Lễ tân, Bệnh nhân), phân luồng triệu chứng tự động bằng <strong>Spring AI</strong>, đặt lịch theo khung giờ thời gian thực và tiếp đón siêu tốc qua <strong>Mã QR vé hẹn & Thẻ CCCD gắn chip</strong>.
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              href="/booking"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-3 rounded-xl transition shadow-lg shadow-blue-600/30 text-sm"
            >
              <Calendar size={18} />
              <span>Đặt Lịch Khám Ngay</span>
              <ArrowRight size={16} />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold px-5 py-3 rounded-xl transition text-sm"
            >
              <LogIn size={18} />
              <span>Đăng Nhập Tài Khoản</span>
            </Link>
          </div>
        </div>

        {/* Decorative subtle element */}
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-gradient-to-l from-blue-500/10 to-transparent pointer-events-none hidden lg:block" />
      </div>

      {/* Grid of 4 Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Booking */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Calendar size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Đặt Lịch & Triệu Chứng</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Chọn chuyên khoa, bác sĩ, khung giờ khám và để Spring AI phân loại mức độ ưu tiên bệnh án.
            </p>
          </div>
          <Link
            href="/booking"
            className="mt-5 inline-flex items-center justify-between text-xs font-semibold text-blue-600 hover:text-blue-700 pt-3 border-t border-slate-100"
          >
            <span>Trải nghiệm đặt lịch</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Card 2: Reception QR */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <QrCode size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Quầy Tiếp Đón QR</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Tiếp nhận bệnh nhân tự động trong 1 giây qua mã QR vé hẹn hoặc đầu đọc quét thẻ CCCD gắn chip.
            </p>
          </div>
          <Link
            href="/reception"
            className="mt-5 inline-flex items-center justify-between text-xs font-semibold text-emerald-600 hover:text-emerald-700 pt-3 border-t border-slate-100"
          >
            <span>Vào quầy tiếp đón</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Card 3: Admin & Nhân sự */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Quản Trị Phân Quyền</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Quản lý danh sách người dùng, kích hoạt / khóa tài khoản và tạo hồ sơ cho Bác sĩ, Nhân viên Lễ tân.
            </p>
          </div>
          <Link
            href="/admin"
            className="mt-5 inline-flex items-center justify-between text-xs font-semibold text-purple-600 hover:text-purple-700 pt-3 border-t border-slate-100"
          >
            <span>Vào trang quản trị</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {/* Card 4: Hồ sơ cá nhân */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between hover:shadow-md transition">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <User size={24} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Hồ Sơ & Đổi Mật Khẩu</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Cập nhật thông tin cá nhân, số điện thoại, đổi mật khẩu và quản lý thông tin chuyên môn bác sĩ.
            </p>
          </div>
          <Link
            href="/profile"
            className="mt-5 inline-flex items-center justify-between text-xs font-semibold text-amber-600 hover:text-amber-700 pt-3 border-t border-slate-100"
          >
            <span>Xem hồ sơ</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {/* Architecture Highlights */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-blue-600" />
          <span>Kiến Trúc Kỹ Thuật Hệ Thống</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <span className="font-semibold text-slate-800 text-sm block">1. Spring Boot 3 Backend</span>
            <p>Kiến trúc Lục giác (Hexagonal) phân tách Ports & Adapters, Spring Security 6 với JWT Stateless, JPA Hibernate và MySQL XAMPP.</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <span className="font-semibold text-slate-800 text-sm block">2. Tích hợp Spring AI</span>
            <p>Phân tích triệu chứng người bệnh theo thời gian thực (Clinical Triage, 2-line Medical Summary & Sentiment Analysis).</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
            <span className="font-semibold text-slate-800 text-sm block">3. Next.js 15 & Tailwind v4</span>
            <p>Giao diện hiện đại, tối ưu SEO & SSR, kết nối mượt mà RESTful API và quản lý gói bằng pnpm đồng bộ.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
