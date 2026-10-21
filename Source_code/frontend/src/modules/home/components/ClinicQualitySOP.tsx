'use client';

import React from 'react';
import { ShieldCheck, FileCheck, RefreshCw } from 'lucide-react';

export default function ClinicQualitySOP() {
  const qualityCards = [
    {
      id: 1,
      image: '/clinic/sop_standard.png',
      badge: 'Chuẩn Hóa Quy Trình',
      icon: ShieldCheck,
      title: 'Quy trình vận hành chuẩn (SOP) đảm bảo sự đồng bộ trong dịch vụ',
      description: 'Mọi thao tác từ tiếp đón, phân luồng buồng khám, hội chẩn đến trả kết quả đều tuân thủ nghiêm ngặt theo bộ tiêu chuẩn y tế quốc tế.'
    },
    {
      id: 2,
      image: '/clinic/emr_records.png',
      badge: 'Lưu Trữ Dữ Liệu An Toàn',
      icon: FileCheck,
      title: 'Dữ liệu khách hàng và bệnh án chi tiết được lưu trữ dài hạn (10–15 năm)',
      description: 'Hồ sơ bệnh án điện tử số hóa 100%, bảo mật đa tầng theo chuẩn HIPAA và liên thông thuận tiện phục vụ theo dõi trọn đời.'
    },
    {
      id: 3,
      image: '/clinic/care_service.png',
      badge: 'Chăm Sóc Hậu Mãi',
      icon: RefreshCw,
      title: 'Dịch vụ theo dõi và chăm sóc khách hàng sau trải nghiệm dịch vụ',
      description: 'Đội ngũ chăm sóc khách hàng chủ động hỏi thăm tình trạng hồi phục, nhắc lịch tái khám và hỗ trợ giải đáp thắc mắc sức khỏe 24/7.'
    }
  ];

  return (
    <section id="workflow" className="scroll-mt-24 space-y-6 py-4">
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-800 text-xs font-bold uppercase tracking-wider border border-emerald-500/20">
          <span>Tiêu Chuẩn Vận Hành</span>
        </div>
        <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          QUY TRÌNH QUẢN LÝ CHẤT LƯỢNG NGHIÊM NGẶT
        </h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Đảm bảo tính nhất quán, an toàn tuyệt đối và sự hài lòng cao nhất cho mọi khách hàng khi đến khám tại MedSched.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {qualityCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className="group bg-white rounded-3xl overflow-hidden border border-mint-light shadow-xs hover:shadow-xl hover:-translate-y-1.5 transition-all duration-300 flex flex-col"
            >
              {/* Ảnh với Caption Overlay góc dưới */}
              <div className="relative aspect-[4/5] sm:aspect-[3/4] overflow-hidden bg-slate-900">
                <img
                  src={card.image}
                  alt={card.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                {/* Gradient phủ tối */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end p-5 text-white">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold w-fit mb-2 border border-white/20 text-mint-light">
                    <Icon size={13} />
                    <span>{card.badge}</span>
                  </div>
                  <h4 className="text-sm sm:text-base font-bold leading-snug text-white group-hover:text-mint-light transition-colors">
                    {card.title}
                  </h4>
                  <p className="text-xs text-slate-300 mt-2 line-clamp-3 leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
