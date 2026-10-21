'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Stethoscope, Cpu, Users, ChevronRight, Sparkles } from 'lucide-react';

export default function ClinicAboutSection() {
  const [activeTab, setActiveTab] = useState<'intro' | 'equipment' | 'doctors'>('intro');

  return (
    <section id="about" className="scroll-mt-24 space-y-6 pt-2">
      {/* Sub-navigation Tabs chuẩn phòng khám quốc tế */}
      <div className="flex items-center justify-center border-b border-mint-light/80 bg-white/70 backdrop-blur-md rounded-2xl p-1.5 shadow-xs max-w-2xl mx-auto">
        <button
          onClick={() => setActiveTab('intro')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
            activeTab === 'intro'
              ? 'bg-pine-teal text-white shadow-md shadow-pine-teal/20 scale-[1.02]'
              : 'text-slate-600 hover:text-pine-teal hover:bg-mint-soft'
          }`}
        >
          <Sparkles size={16} />
          <span>GIỚI THIỆU CHUNG</span>
        </button>

        <button
          onClick={() => setActiveTab('equipment')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
            activeTab === 'equipment'
              ? 'bg-pine-teal text-white shadow-md shadow-pine-teal/20 scale-[1.02]'
              : 'text-slate-600 hover:text-pine-teal hover:bg-mint-soft'
          }`}
        >
          <Cpu size={16} />
          <span>TRANG THIẾT BỊ HIỆN ĐẠI</span>
        </button>

        <button
          onClick={() => setActiveTab('doctors')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 cursor-pointer ${
            activeTab === 'doctors'
              ? 'bg-pine-teal text-white shadow-md shadow-pine-teal/20 scale-[1.02]'
              : 'text-slate-600 hover:text-pine-teal hover:bg-mint-soft'
          }`}
        >
          <Users size={16} />
          <span>ĐỘI NGŨ Y KHOA</span>
        </button>
      </div>

      {/* Banner Tiêu đề & Breadcrumb */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#f8faf7] via-[#f0f7f4] to-[#e8f4ef] border border-mint-light p-6 sm:p-10 shadow-xs">
        <div className="max-w-4xl space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
            <Link href="/" className="hover:text-pine-teal transition-colors">Trang chủ</Link>
            <ChevronRight size={14} className="text-slate-400" />
            <span className="text-pine-teal font-bold">Về MedSched</span>
          </div>

          <h2 className="text-xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight uppercase font-display">
            ĐA CHUYÊN KHOA CHUYÊN SÂU <br className="hidden sm:inline" />
            <span className="text-pine-teal">& ĐI SÂU TRONG TỪNG CHUYÊN KHOA</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
            Hệ thống phòng khám tư nhân thông minh MedSched kết hợp y học thực nghiệm và công nghệ chuyển đổi số, 
            tối ưu hóa quy trình từ khâu đặt lịch trước, sàng lọc bằng AI đến tiếp đón siêu tốc 1 giây tại quầy.
          </p>
        </div>
      </div>

      {/* Tab 1: GIỚI THIỆU CHUNG & TRANG THIẾT BỊ CHÍNH */}
      {activeTab === 'intro' && (
        <div className="space-y-6">
          <div className="text-center max-w-3xl mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-700 text-xs font-bold uppercase tracking-wider border border-amber-500/20">
              <span>Về Chúng Tôi</span>
            </div>
            <h3 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight">
              Mô Hình Khám Chữa Bệnh Ngoại Trú Đẳng Cấp & Bền Vững
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Hệ Thống Y Khoa Chuyên Sâu Quốc Tế MedSched phát triển theo mô hình đa chuyên khoa hiện đại, 
              lấy chất lượng chuyên môn y khoa làm nền tảng, kết hợp hệ thống trang thiết bị chẩn đoán cận lâm sàng thế hệ mới.
            </p>
          </div>

          {/* Ảnh Hệ thống Trang Thiết Bị Cận Lâm Sàng Cao Cấp */}
          <div className="relative rounded-3xl overflow-hidden border border-mint-light shadow-md bg-white group">
            <div className="relative aspect-[21/9] sm:aspect-[25/9] w-full overflow-hidden">
              <img
                src="/clinic/mri_equipment.png"
                alt="Hệ thống máy chụp cộng hưởng từ MRI SIGNA Creator tại MedSched"
                className="w-full h-full object-cover object-center group-hover:scale-[1.01] transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent flex items-end p-5 sm:p-8">
                <div className="text-white space-y-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-500/80 text-[11px] font-bold tracking-wide uppercase">
                    Công nghệ tiên tiến
                  </span>
                  <h4 className="text-base sm:text-xl font-bold">
                    Hệ Thống Cộng Hưởng Từ MRI SIGNA Creator & CT Đa Dãy Kỹ Thuật Số
                  </h4>
                  <p className="text-xs text-slate-200 hidden sm:block">
                    Hỗ trợ chẩn đoán hình ảnh chính xác từng chi tiết, giảm thiểu tối đa thời gian chờ đợi của bệnh nhân.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: TRANG THIẾT BỊ HIỆN ĐẠI */}
      {activeTab === 'equipment' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-mint-light shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-mint-light text-pine-teal flex items-center justify-center font-black text-lg">
              01
            </div>
            <h4 className="text-base font-bold text-slate-900">Máy Chụp MRI SIGNA Creator</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Công nghệ từ lực cao trường, tái tạo hình ảnh 3D giải phẫu học rõ nét các tổn thương thần kinh, cột sống và cơ xương khớp.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-mint-light shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-mint-light text-pine-teal flex items-center justify-center font-black text-lg">
              02
            </div>
            <h4 className="text-base font-bold text-slate-900">Nội Soi NBI Không Đau</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Dải tần ánh sáng hẹp phát hiện sớm ung thư đường tiêu hóa, dạ dày và đại tràng ở giai đoạn mầm mống.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-mint-light shadow-xs space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-mint-light text-pine-teal flex items-center justify-center font-black text-lg">
              03
            </div>
            <h4 className="text-base font-bold text-slate-900">Xét Nghiệm Tự Động Hóa</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Hệ thống máy sinh hóa - miễn dịch khép kín tự động trả kết quả nhanh chóng, kết nối trực tiếp vào bệnh án điện tử EMR.
            </p>
          </div>
        </div>
      )}

      {/* Tab 3: ĐỘI NGŨ Y KHOA */}
      {activeTab === 'doctors' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-mint-light shadow-xs flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-1/2 aspect-video rounded-2xl overflow-hidden border border-mint-light">
            <img
              src="/clinic/doctors_meeting.png"
              alt="Hội chẩn chuyên môn MedSched"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="w-full md:w-1/2 space-y-3">
            <span className="text-xs font-bold text-teal-primary uppercase tracking-wider">Hội đồng chuyên môn</span>
            <h4 className="text-xl font-bold text-slate-900">Các Chuyên Gia & Bác Sĩ Chuyên Khoa II Đầu Ngành</h4>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Đội ngũ bác sĩ tại MedSched đều có trên 15 năm kinh nghiệm công tác tại các bệnh viện tuyến đầu, 
              thường xuyên tổ chức các phiên hội chẩn liên chuyên khoa đa phương thức để đưa ra phác đồ điều trị tối ưu nhất.
            </p>
            <div className="pt-2">
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pine-teal text-white text-xs sm:text-sm font-bold hover:bg-pine-teal-hover transition shadow-sm"
              >
                <span>Xem Danh Sách & Lịch Khám Bác Sĩ</span>
                <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
