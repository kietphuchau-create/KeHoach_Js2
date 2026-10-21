'use client';

import React from 'react';
import { HeartHandshake, ShieldCheck, Award, Heart, CheckCircle2 } from 'lucide-react';

export default function ClinicBrandStory() {
  return (
    <section id="about" className="scroll-mt-24 space-y-12 py-4">
      {/* 1. CẢM HỨNG THƯƠNG HIỆU (2 Cột) */}
      <div className="bg-white rounded-3xl p-6 sm:p-10 border border-mint-light shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Cột trái: Ảnh Chân Dung Danh Nhân Y Học */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-64 sm:w-72 aspect-[4/5] rounded-3xl overflow-hidden border-2 border-mint-light shadow-lg group">
              <img
                src="/clinic/claude_bernard.png"
                alt="Chân dung danh nhân y học Claude Bernard"
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/90 via-slate-900/50 to-transparent p-4 text-center text-white">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-widest">
                  Danh nhân Y học thế giới
                </span>
                <p className="text-sm font-extrabold">Bác sĩ Claude Bernard (1813 – 1878)</p>
              </div>
            </div>
          </div>

          {/* Cột phải: Câu Chuyện Triết Lý Nhân Văn */}
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-primary/10 text-pine-teal text-xs font-bold uppercase tracking-wider">
              <span>Triết Lý Y Khoa</span>
            </div>

            <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              CẢM HỨNG THƯƠNG HIỆU <br />
              <span className="text-pine-teal">Y HỌC THỰC NGHIỆM & PHỤNG SỰ NHÂN SINH</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tên gọi và sứ mệnh của MedSched kế thừa tư tưởng sâu sắc từ bác sĩ Claude Bernard – một trong những nhà khoa học vĩ đại 
              đặt nền móng cho Y học Thực nghiệm thế giới. Ông khẳng định y học phải luôn dựa trên chứng cứ khoa học chính xác, 
              nhưng trên hết phải xuất phát từ trái tim nhân ái và tôn trọng sinh mệnh con người.
            </p>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Nhằm tri ân và tiếp nối giá trị cao đẹp đó, MedSched lấy chất lượng chuyên môn làm trọng tâm, ứng dụng công nghệ số 
              để xóa bỏ sự chờ đợi mệt mỏi, mang lại trải nghiệm y tế dịch vụ tư nhân minh bạch, chuẩn mực và nhân văn nhất cho cộng đồng.
            </p>
          </div>
        </div>

        {/* 3 FEATURE CARDS (Giá Trị Cốt Lõi 1) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 mt-10 border-t border-slate-100">
          <div className="bg-mint-soft/50 rounded-2xl p-6 border border-mint-light space-y-3 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-pine-teal text-white flex items-center justify-center shadow-sm">
              <HeartHandshake size={22} />
            </div>
            <h4 className="text-base font-bold text-slate-900">Triết Lý Nhân Văn</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Lấy người bệnh làm trung tâm, luôn trân quý và nỗ lực nâng cao chất lượng sức khỏe thể chất lẫn tinh thần cho từng khách hàng.
            </p>
          </div>

          <div className="bg-mint-soft/50 rounded-2xl p-6 border border-mint-light space-y-3 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-pine-teal text-white flex items-center justify-center shadow-sm">
              <ShieldCheck size={22} />
            </div>
            <h4 className="text-base font-bold text-slate-900">Sự Chính Trực & Chuẩn Mực</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Thể hiện qua cách giao tiếp tận tình, chẩn đoán dựa trên chứng cứ lâm sàng, kê đúng thuốc và minh bạch 100% về viện phí.
            </p>
          </div>

          <div className="bg-mint-soft/50 rounded-2xl p-6 border border-mint-light space-y-3 hover:shadow-md hover:-translate-y-1 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-pine-teal text-white flex items-center justify-center shadow-sm">
              <Award size={22} />
            </div>
            <h4 className="text-base font-bold text-slate-900">Uy Tín & Đồng Hành Dài Lâu</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Đề cao tính chính xác của dữ liệu bệnh án điện tử, đồng hành theo dõi và chăm sóc sức khỏe gia đình bạn qua từng năm tháng.
            </p>
          </div>
        </div>
      </div>

      {/* 2. GIÁ TRỊ CỐT LÕI & SỨ MỆNH Y KHOA (Zigzag Layout) */}
      <div className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold uppercase tracking-wider">
            <span>Sứ Mệnh & Trách Nhiệm</span>
          </div>
          <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            GIÁ TRỊ CỐT LÕI: NHÂN VĂN – CHÍNH TRỰC – MINH BẠCH
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Cặp ảnh đan xen: Phẫu thuật & Hội chẩn */}
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-mint-light shadow-sm aspect-video">
              <img
                src="/clinic/surgery_team.png"
                alt="Đội ngũ bác sĩ phẫu thuật MedSched"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full">
                Ekip can thiệp chuyên sâu
              </span>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-mint-light shadow-sm aspect-video">
              <img
                src="/clinic/doctors_meeting.png"
                alt="Hội đồng chuyên môn hội chẩn"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-3 left-3 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-3 py-1 rounded-full">
                Hội chẩn đa chuyên khoa
              </span>
            </div>
          </div>

          {/* Nội dung Sứ mệnh */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-mint-light shadow-xs space-y-5">
            <div className="space-y-2">
              <span className="text-xs font-bold text-pine-teal uppercase tracking-wider">SỨ MỆNH CÔNG NGHỆ & Y TẾ</span>
              <h4 className="text-lg sm:text-2xl font-bold text-slate-900">
                Đưa Trang Thiết Bị Hiện Đại & Trí Tuệ Nhân Tạo (AI) Vào Khám Chữa Bệnh
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                MedSched tiên phong đưa hệ thống cận lâm sàng thế hệ mới cùng giải pháp **Spring AI Triage** vào sàng lọc triệu chứng, 
                hỗ trợ bác sĩ phân luồng chuyên khoa chuẩn xác, đồng thời cung cấp bản tóm tắt bệnh án lâm sàng tức thì trước khi bệnh nhân bước vào phòng khám.
              </p>
            </div>

            <ul className="space-y-3 pt-2">
              <li className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Tiết kiệm 80% thời gian chờ đợi qua đặt hẹn theo Time-slot 30 phút.</span>
              </li>
              <li className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Tiếp đón tự động trong 1 giây qua mã QR vé hẹn hoặc thẻ CCCD gắn chip.</span>
              </li>
              <li className="flex items-start gap-3 text-xs sm:text-sm text-slate-700">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>Hệ thống đơn thuốc điện tử và hóa đơn minh bạch không phát sinh phụ phí.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. TINH THẦN DỊCH VỤ OMOTENASHI (NHẬT BẢN) */}
        <div className="relative rounded-3xl overflow-hidden border border-mint-light shadow-sm bg-white">
          <div className="grid grid-cols-1 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 aspect-[16/10] sm:aspect-[16/9] w-full overflow-hidden">
              <img
                src="/clinic/omotenashi_service.png"
                alt="Dịch vụ chăm sóc khách hàng theo tinh thần Omotenashi Nhật Bản"
                className="w-full h-full object-cover object-center"
              />
            </div>
            <div className="lg:col-span-5 p-6 sm:p-8 space-y-3 bg-gradient-to-br from-amber-50/80 via-white to-mint-soft/30">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/15 text-amber-800 text-[11px] font-bold uppercase tracking-wider">
                <Heart size={14} className="text-amber-600" />
                <span>Nghệ Thuật Dịch Vụ</span>
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                NGHỆ THUẬT DỊCH VỤ KHÁCH HÀNG THEO TINH THẦN OMOTENASHI (NHẬT BẢN)
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Đến với MedSched, khách hàng được đón tiếp bằng sự chân thành, tinh tế và chu đáo xuất phát từ trái tim. 
                Không gian phòng chờ thoáng đãng, phục vụ trà thanh nhiệt, quầy tiếp đón thân thiện giúp xua tan mọi âu lo khi đi khám bệnh.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
