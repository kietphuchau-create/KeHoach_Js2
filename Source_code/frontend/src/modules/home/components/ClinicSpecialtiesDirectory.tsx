'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Calendar, Sparkles, Stethoscope, User, MapPin } from 'lucide-react';
import { api } from '@/shared/lib/api';
import { formatDoctorFullName } from '@/shared/lib/formatters';

interface DoctorDirectoryItem {
  id: string;
  specialtyName: string;
  description: string;
  doctorName: string;
  roomNumber?: string;
  centerName?: string;
}

// Danh sách bác sĩ chuẩn theo CSDL (Dự phòng khi chưa tải xong hoặc mạng chập chờn)
const FALLBACK_DOCTORS: DoctorDirectoryItem[] = [
  {
    id: '10b2c3d4-0003-4000-8000-000000000003',
    specialtyName: 'Chuyên khoa Nội tổng quát',
    description: 'Chuyên gia Nội tổng quát, tim mạch học, huyết áp và các rối loạn chuyển hóa.',
    doctorName: 'PGS.TS Trần Văn Hùng',
    roomNumber: 'P.208',
    centerName: 'Chi nhánh Quận 1',
  },
  {
    id: '10b2c3d4-0001-4000-8000-000000000001',
    specialtyName: 'Chuyên khoa Da liễu',
    description: 'Chuyên gia đầu ngành Da liễu với hơn 15 năm kinh nghiệm điều trị và phục hồi da.',
    doctorName: 'BS.CKII Nguyễn Minh Anh',
    roomNumber: 'P.205',
    centerName: 'Chi nhánh Quận 1',
  },
  {
    id: '10b2c3d4-0004-4000-8000-000000000004',
    specialtyName: 'Chuyên khoa Da liễu',
    description: 'Bác sĩ chuyên khoa điều trị bệnh lý ngoài da và chăm sóc da tại Chi nhánh Quận 7.',
    doctorName: 'ThS.BS Lê Thị Thu Hà',
    roomNumber: 'P.102',
    centerName: 'Chi nhánh Quận 7',
  },
  {
    id: '10b2c3d4-0002-4000-8000-000000000002',
    specialtyName: 'Chuyên khoa Da liễu & Thẩm mỹ',
    description: 'Chuyên gia Da liễu & Thẩm mỹ da công nghệ cao tại Chi nhánh Quận 7.',
    doctorName: 'ThS.BS Đỗ Quang Vinh',
    roomNumber: 'P.102',
    centerName: 'Chi nhánh Quận 7',
  },
];

export default function ClinicSpecialtiesDirectory() {
  const [doctors, setDoctors] = useState<DoctorDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
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

  useEffect(() => {
    // Luôn nạp đồng bộ trực tiếp danh sách Bác sĩ từ CSDL qua API
    api.getDoctors()
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: DoctorDirectoryItem[] = data.map((doc: any) => {
            const fullNameWithTitle = formatDoctorFullName(
              doc.academicTitle || 'BS',
              doc.fullName || doc.name || 'Bác sĩ'
            );
            const specialty = doc.specialtyName || 'Chuyên khoa Khám';
            const center = doc.centerName || 'Cơ sở MedSched';
            const room = doc.roomNumber
              ? (doc.roomNumber.startsWith('P.') ? doc.roomNumber : `Phòng ${doc.roomNumber}`)
              : 'P.101';
            const desc = doc.bio && doc.bio.trim()
              ? doc.bio
              : `Khám và điều trị chuyên sâu ${specialty} tại ${center}.`;

            return {
              id: doc.id || doc.userId,
              specialtyName: specialty,
              description: desc,
              doctorName: fullNameWithTitle,
              roomNumber: room,
              centerName: center,
            };
          });

          // Quy tắc hệ thống: Tối đa chỉ hiển thị 5 bác sĩ dù danh sách trong CSDL có bao nhiêu
          setDoctors(mapped.slice(0, 5));
        } else {
          setDoctors(FALLBACK_DOCTORS.slice(0, 5));
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh sách bác sĩ từ CSDL, sử dụng danh sách chuẩn:', err);
        setDoctors(FALLBACK_DOCTORS.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <section ref={sectionRef} id="specialties" className="scroll-mt-24 space-y-6 py-2 overflow-hidden">
      {/* Khối danh mục - Hiệu ứng xuất hiện và biến mất khi lăn chuột */}
      <div
        className={`bg-white rounded-3xl p-6 sm:p-10 border border-mint-light shadow-xs transition-all duration-700 ease-out ${
          isVisible
            ? 'opacity-100 translate-y-0 scale-100'
            : 'opacity-0 translate-y-12 scale-[0.98]'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Cột Trái: Tiêu đề & Giới thiệu */}
          <div
            className={`lg:col-span-5 space-y-4 lg:sticky lg:top-24 transition-all duration-700 delay-100 ease-out ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-primary/10 text-pine-teal text-xs font-bold uppercase tracking-wider border border-teal-primary/20">
              <Sparkles size={14} />
              <span>Đội Ngũ Chuyên Khoa Đang Trực</span>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              CÁC BÁC SĨ CHUYÊN KHOA <br />
              <span className="text-pine-teal">ĐANG PHỤC VỤ KHÁCH HÀNG</span>
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Dữ liệu bác sĩ và chuyên khoa được đồng bộ trực tiếp từ hệ thống phòng khám MedSched. 
              Mỗi chuyên khoa có bác sĩ trực tiếp phụ trách tại buồng khám cố định ở từng chi nhánh.
            </p>

            <div className="p-4 rounded-2xl bg-mint-soft border border-mint-light space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-pine-teal">
                <Stethoscope size={15} />
                <span>Bác Sĩ Trực Khám Hàng Ngày</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chủ động đặt lịch khám theo khung giờ hẹn trước để được phục vụ chu đáo, vào khám ngay không cần chờ.
              </p>
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-pine-teal text-white text-xs font-bold hover:bg-pine-teal-hover transition shadow-xs w-full justify-center cursor-pointer"
              >
                <Calendar size={14} />
                <span>Đặt Lịch Khám Bác Sĩ</span>
              </Link>
            </div>
          </div>

          {/* Cột Phải: Danh Sách Bác Sĩ Chuyên Khoa - Từng Card Độc Lập Xuất Hiện Lần Lượt */}
          <div
            className={`lg:col-span-7 space-y-3 sm:space-y-3.5 transition-all duration-700 delay-200 ease-out ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
          >
            {loading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Đang nạp danh sách bác sĩ trực tiếp từ hệ thống...
              </div>
            ) : (
              doctors.map((item, index) => (
                <Link
                  key={item.id}
                  href="/booking"
                  style={{ transitionDelay: `${index * 80 + 200}ms` }}
                  className={`group p-4 sm:p-5 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/80 hover:border-teal-primary/50 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_-4px_rgba(14,92,85,0.15)] hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 flex items-start sm:items-center justify-between gap-4 cursor-pointer relative overflow-hidden ${
                    isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}
                >
                  {/* Vạch màu nhấn ở cạnh trái khi hover */}
                  <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-pine-teal opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-l-2xl" />

                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 pl-1">
                    {/* Badge số thứ tự độc lập */}
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-pine-teal border border-teal-200/80 shadow-2xs flex items-center justify-center font-mono text-sm font-black group-hover:!bg-pine-teal group-hover:!text-white group-hover:!border-pine-teal group-hover:scale-105 transition-all duration-300 shrink-0">
                      0{index + 1}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm sm:text-base font-bold text-slate-800 group-hover:text-pine-teal transition-colors">
                          {item.specialtyName}
                        </h4>
                        {item.roomNumber && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 shadow-2xs">
                            {item.roomNumber}
                          </span>
                        )}
                        {item.centerName && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium border border-slate-200/70 shadow-2xs">
                            {item.centerName}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                        {item.description}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-pine-teal font-medium pt-0.5">
                        <User size={13} className="text-teal-600 shrink-0" />
                        <span>Bác sĩ phụ trách: <strong className="text-slate-900 font-bold">{item.doctorName}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Nút hành động tròn bo góc bên phải */}
                  <span className="w-9 h-9 rounded-xl bg-emerald-50 text-pine-teal border border-teal-200/80 shadow-2xs flex items-center justify-center shrink-0 group-hover:!bg-pine-teal group-hover:!text-white group-hover:!border-pine-teal group-hover:scale-110 transition-all duration-300">
                    <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
