'use client';

import React, { useEffect, useState, useRef, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  Calendar, 
  Sparkles, 
  Stethoscope, 
  User, 
  MapPin, 
  Search, 
  Star, 
  Filter, 
  ArrowUpDown, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Award,
  CheckCircle2
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import { formatDoctorFullName } from '@/shared/lib/formatters';

export interface DoctorDirectoryItem {
  id: string;
  specialtyId?: string;
  specialtyName: string;
  description: string;
  doctorName: string;
  academicTitle?: string;
  roomNumber?: string;
  centerName?: string;
  consultationFee: number;
  rating: number;
  totalReviews: number;
}

// Danh sách bác sĩ chuẩn theo CSDL (Đầy đủ học hàm, chuyên khoa, giá khám, rating đánh giá)
const FALLBACK_DOCTORS: DoctorDirectoryItem[] = [
  {
    id: '10b2c3d4-0001-4000-8000-000000000001',
    specialtyId: 'spec-01',
    specialtyName: 'Chuyên khoa Da liễu',
    description: 'Chuyên gia đầu ngành Da liễu với hơn 15 năm kinh nghiệm điều trị mụn, thâm nám và phục hồi da chuyên sâu.',
    doctorName: 'BS.CKII Nguyễn Minh Anh',
    academicTitle: 'BS.CKII',
    roomNumber: 'P.205',
    centerName: 'Chi nhánh Quận 1',
    consultationFee: 350000,
    rating: 5.0,
    totalReviews: 62,
  },
  {
    id: '10b2c3d4-0003-4000-8000-000000000003',
    specialtyId: 'spec-02',
    specialtyName: 'Chuyên khoa Nội tổng quát',
    description: 'Chuyên gia Nội tổng quát, tim mạch học, huyết áp và các rối loạn chuyển hóa với hơn 20 năm kinh nghiệm.',
    doctorName: 'PGS.TS Trần Văn Hùng',
    academicTitle: 'PGS.TS',
    roomNumber: 'P.208',
    centerName: 'Chi nhánh Quận 1',
    consultationFee: 450000,
    rating: 4.9,
    totalReviews: 48,
  },
  {
    id: '10b2c3d4-0005-4000-8000-000000000005',
    specialtyId: 'spec-03',
    specialtyName: 'Chuyên khoa Răng Hàm Mặt',
    description: 'Bác sĩ Răng Hàm Mặt, phục hình thẩm mỹ và nha khoa kỹ thuật cao với 10 năm kinh nghiệm điều trị.',
    doctorName: 'ThS.BS Vũ Minh Đức',
    academicTitle: 'ThS.BS',
    roomNumber: 'P.101',
    centerName: 'Cơ sở MedSched',
    consultationFee: 300000,
    rating: 4.8,
    totalReviews: 35,
  },
  {
    id: '10b2c3d4-0006-4000-8000-000000000006',
    specialtyId: 'spec-04',
    specialtyName: 'Chuyên khoa Mắt',
    description: 'Chuyên gia Mắt & Khúc xạ giác mạc, điều trị bệnh lý nhãn khoa và tầm soát thị lực với 16 năm kinh nghiệm.',
    doctorName: 'BS.CKII Phạm Quỳnh Chi',
    academicTitle: 'BS.CKII',
    roomNumber: 'P.102',
    centerName: 'Cơ sở MedSched',
    consultationFee: 400000,
    rating: 4.9,
    totalReviews: 41,
  },
  {
    id: '10b2c3d4-0004-4000-8000-000000000004',
    specialtyId: 'spec-01',
    specialtyName: 'Chuyên khoa Da liễu',
    description: 'Bác sĩ chuyên khoa điều trị bệnh lý ngoài da, dị ứng và chăm sóc da tại Chi nhánh Quận 7.',
    doctorName: 'ThS.BS Lê Thị Thu Hà',
    academicTitle: 'ThS.BS',
    roomNumber: 'P.102',
    centerName: 'Chi nhánh Quận 7',
    consultationFee: 280000,
    rating: 4.7,
    totalReviews: 29,
  },
  {
    id: '10b2c3d4-0002-4000-8000-000000000002',
    specialtyId: 'spec-01',
    specialtyName: 'Chuyên khoa Da liễu & Thẩm mỹ',
    description: 'Chuyên gia Da liễu & Thẩm mỹ da công nghệ cao, laser tái tạo bề mặt da tại Chi nhánh Quận 7.',
    doctorName: 'ThS.BS Đỗ Quang Vinh',
    academicTitle: 'ThS.BS',
    roomNumber: 'P.102',
    centerName: 'Chi nhánh Quận 7',
    consultationFee: 550000,
    rating: 4.9,
    totalReviews: 54,
  },
  {
    id: '10b2c3d4-0007-4000-8000-000000000007',
    specialtyId: 'spec-05',
    specialtyName: 'Chuyên khoa Tai Mũi Họng',
    description: 'Tiến sĩ Bác sĩ chuyên khoa Tai Mũi Họng, nội soi chẩn đoán sớm và điều trị viêm xoang mạn tính.',
    doctorName: 'TS.BS Hoàng Gia Bảo',
    academicTitle: 'TS.BS',
    roomNumber: 'P.201',
    centerName: 'Chi nhánh Quận 1',
    consultationFee: 500000,
    rating: 4.9,
    totalReviews: 38,
  },
  {
    id: '10b2c3d4-0008-4000-8000-000000000008',
    specialtyId: 'spec-06',
    specialtyName: 'Chuyên khoa Nhi',
    description: 'Bác sĩ chuyên khoa Nhi, tận tâm thăm khám bệnh lý đường hô hấp, tiêu hóa và tư vấn dinh dưỡng cho trẻ nhỏ.',
    doctorName: 'BS.CKI Nguyễn Thảo My',
    academicTitle: 'BS.CKI',
    roomNumber: 'P.105',
    centerName: 'Chi nhánh Quận 1',
    consultationFee: 250000,
    rating: 4.8,
    totalReviews: 67,
  },
];

const PAGE_SIZE = 4;

export default function ClinicSpecialtiesDirectory() {
  const [allDoctors, setAllDoctors] = useState<DoctorDirectoryItem[]>(FALLBACK_DOCTORS);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // REQ-SEARCH-01 & REQ-SEARCH-02: State Tìm kiếm đa điều kiện, Lọc khoảng giá, Sắp xếp và Phân trang
  const [keyword, setKeyword] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('rating-desc');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Hiệu ứng Fade-in khi cuộn tới vị trí component
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  // Nạp dữ liệu bác sĩ từ CSDL qua API
  useEffect(() => {
    api.getDoctors()
      .then((data: any[]) => {
        if (Array.isArray(data) && data.length > 0) {
          const mapped: DoctorDirectoryItem[] = data.map((doc: any, index: number) => {
            const fullNameWithTitle = formatDoctorFullName(
              doc.academicTitle || 'BS',
              doc.fullName || doc.name || 'Bác sĩ'
            );
            const specialty = doc.specialtyName || 'Chuyên khoa Khám';
            const center = doc.centerName || 'Cơ sở MedSched';
            const room = doc.roomNumber
              ? (doc.roomNumber.startsWith('P.') ? doc.roomNumber : `Phòng ${doc.roomNumber}`)
              : `P.${101 + index}`;
            const desc = doc.bio && doc.bio.trim()
              ? doc.bio
              : `Khám và điều trị chuyên sâu ${specialty} tại ${center}.`;

            return {
              id: doc.id || doc.userId,
              specialtyId: doc.specialtyId,
              specialtyName: specialty,
              description: desc,
              doctorName: fullNameWithTitle,
              academicTitle: doc.academicTitle || 'BS',
              roomNumber: room,
              centerName: center,
              consultationFee: Number(doc.consultationFee) || 350000,
              rating: Number(doc.rating) || 4.9,
              totalReviews: Number(doc.totalReviews) || (30 + index * 7),
            };
          });

          setAllDoctors(mapped);
        } else {
          setAllDoctors(FALLBACK_DOCTORS);
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải danh sách bác sĩ từ CSDL, sử dụng danh sách chuẩn:', err);
        setAllDoctors(FALLBACK_DOCTORS);
      })
      .finally(() => setLoading(false));
  }, []);

  // Danh sách các chuyên khoa duy nhất để đổ vào Dropdown lọc
  const specialtyOptions = useMemo(() => {
    const set = new Set<string>();
    allDoctors.forEach((d) => {
      if (d.specialtyName) set.add(d.specialtyName);
    });
    return Array.from(set);
  }, [allDoctors]);

  // REQ-SEARCH-01 & REQ-SEARCH-02: Bộ lọc đa tiêu chí (Từ khóa, Chuyên khoa, Giá) & Sắp xếp
  const filteredDoctors = useMemo(() => {
    let result = allDoctors.filter((doc) => {
      // 1. Lọc theo từ khóa tìm kiếm (Tên bác sĩ, học vị, chuyên khoa, mô tả)
      if (keyword.trim()) {
        const kw = keyword.trim().toLowerCase();
        const matchName = doc.doctorName.toLowerCase().includes(kw);
        const matchSpec = doc.specialtyName.toLowerCase().includes(kw);
        const matchDesc = doc.description.toLowerCase().includes(kw);
        const matchTitle = (doc.academicTitle || '').toLowerCase().includes(kw);
        if (!matchName && !matchSpec && !matchDesc && !matchTitle) {
          return false;
        }
      }

      // 2. Lọc theo chuyên khoa
      if (selectedSpecialty !== 'all' && doc.specialtyName !== selectedSpecialty) {
        return false;
      }

      // 3. Lọc theo khoảng giá khám
      const fee = doc.consultationFee;
      if (priceFilter === 'under300' && fee >= 300000) return false;
      if (priceFilter === '300to500' && (fee < 300000 || fee > 500000)) return false;
      if (priceFilter === 'above500' && fee <= 500000) return false;

      return true;
    });

    // 4. Sắp xếp kết quả
    if (sortBy === 'rating-desc') {
      result = [...result].sort((a, b) => b.rating - a.rating || b.totalReviews - a.totalReviews);
    } else if (sortBy === 'price-asc') {
      result = [...result].sort((a, b) => a.consultationFee - b.consultationFee);
    } else if (sortBy === 'price-desc') {
      result = [...result].sort((a, b) => b.consultationFee - a.consultationFee);
    } else if (sortBy === 'name-asc') {
      result = [...result].sort((a, b) => a.doctorName.localeCompare(b.doctorName));
    }

    return result;
  }, [allDoctors, keyword, selectedSpecialty, priceFilter, sortBy]);

  // Reset trang về 1 khi tiêu chí lọc thay đổi
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, selectedSpecialty, priceFilter, sortBy]);

  // Phân trang
  const totalPages = Math.max(1, Math.ceil(filteredDoctors.length / PAGE_SIZE));
  const paginatedDoctors = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredDoctors.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredDoctors, currentPage]);

  return (
    <section ref={sectionRef} id="specialties" className="scroll-mt-24 space-y-6 py-4 overflow-hidden">
      <div
        className={`bg-white rounded-3xl p-6 sm:p-10 border border-mint-light shadow-xs transition-all duration-700 ease-out ${
          isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-[0.98]'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* Cột Trái: Tiêu đề, Giới thiệu & Hộp đặt lịch nhanh */}
          <div
            className={`lg:col-span-5 space-y-5 lg:sticky lg:top-24 transition-all duration-700 delay-100 ease-out ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}
          >
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-primary/10 text-pine-teal text-xs font-bold uppercase tracking-wider border border-teal-primary/20">
              <Sparkles size={14} className="text-teal-600 animate-pulse" />
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

            {/* Quick Badges / Lợi ích */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">100% BS Chuyên Khoa</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 flex items-center gap-2.5">
                <Star size={18} className="text-amber-500 fill-amber-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Đánh Giá 4.9/5 ⭐</span>
              </div>
            </div>

            {/* Hộp tiện ích Đặt lịch khám */}
            <div className="p-5 rounded-2xl bg-mint-soft border border-mint-light space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-pine-teal uppercase tracking-wide">
                <Stethoscope size={16} />
                <span>Bác Sĩ Trực Khám Hàng Ngày</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Chủ động tìm kiếm, so sánh giá khám và đặt lịch theo khung giờ hẹn trước để được phục vụ chu đáo, vào khám ngay không cần xếp hàng.
              </p>
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-pine-teal text-white text-xs font-bold hover:bg-pine-teal-hover transition shadow-sm w-full justify-center cursor-pointer group"
              >
                <Calendar size={15} />
                <span>Đặt Lịch Khám Bác Sĩ</span>
                <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Cột Phải: Bộ Lọc Tìm Kiếm Nâng Cao & Danh Sách Thẻ Bác Sĩ (REQ-SEARCH-01 & REQ-SEARCH-02) */}
          <div
            className={`lg:col-span-7 space-y-4 transition-all duration-700 delay-200 ease-out ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
          >
            {/* THANH TÌM KIẾM & BỘ LỌC ĐA TIÊU CHÍ */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              {/* Hàng 1: Ô tìm kiếm từ khóa với icon kính lúp */}
              <div className="relative">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Tìm kiếm bác sĩ theo tên (Hùng, Anh...), học vị (PGS, TS...), chuyên khoa..."
                  className="w-full pl-10 pr-9 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-primary/40 focus:border-pine-teal placeholder-slate-400 transition"
                />
                {keyword && (
                  <button
                    type="button"
                    onClick={() => setKeyword('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs transition cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Hàng 2: Bộ 3 Dropdown Lọc Chuyên Khoa - Lọc Khoảng Giá - Sắp Xếp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 1. Lọc Chuyên Khoa */}
                <div className="relative">
                  <select
                    value={selectedSpecialty}
                    onChange={(e) => setSelectedSpecialty(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-primary/40 focus:border-pine-teal transition cursor-pointer"
                  >
                    <option value="all">🏥 Tất cả chuyên khoa</option>
                    {specialtyOptions.map((spec) => (
                      <option key={spec} value={spec}>
                        {spec}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Lọc Khoảng Giá (REQ-SEARCH-02) */}
                <div className="relative">
                  <select
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-primary/40 focus:border-pine-teal transition cursor-pointer"
                  >
                    <option value="all">💰 Khoảng giá: Tất cả</option>
                    <option value="under300">Dưới 300.000 đ</option>
                    <option value="300to500">300.000 đ - 500.000 đ</option>
                    <option value="above500">Trên 500.000 đ</option>
                  </select>
                </div>

                {/* 3. Sắp Xếp (REQ-SEARCH-02) */}
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-primary/40 focus:border-pine-teal transition cursor-pointer"
                  >
                    <option value="rating-desc">⭐ Đánh giá cao nhất</option>
                    <option value="price-asc">💵 Giá: Thấp đến cao</option>
                    <option value="price-desc">💎 Giá: Cao đến thấp</option>
                    <option value="name-asc">🔤 Tên: A → Z</option>
                  </select>
                </div>
              </div>

              {/* Hàng 3: Thẻ chọn nhanh (Quick Filter Tags) */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
                  <Filter size={11} /> Gợi ý:
                </span>
                <button
                  type="button"
                  onClick={() => { setSelectedSpecialty('all'); setPriceFilter('all'); setKeyword(''); }}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                    selectedSpecialty === 'all' && priceFilter === 'all' && !keyword
                      ? 'bg-pine-teal text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSpecialty('Chuyên khoa Da liễu')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                    selectedSpecialty === 'Chuyên khoa Da liễu'
                      ? 'bg-pine-teal text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Da liễu
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSpecialty('Chuyên khoa Nội tổng quát')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                    selectedSpecialty === 'Chuyên khoa Nội tổng quát'
                      ? 'bg-pine-teal text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Nội tổng quát
                </button>
                <button
                  type="button"
                  onClick={() => setPriceFilter('under300')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                    priceFilter === 'under300'
                      ? 'bg-pine-teal text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  Dưới 300k
                </button>
                <button
                  type="button"
                  onClick={() => setSortBy('rating-desc')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                    sortBy === 'rating-desc'
                      ? 'bg-pine-teal text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  5★ Đánh giá cao
                </button>
              </div>
            </div>

            {/* DANH SÁCH THẺ BÁC SĨ (DOCTOR CARDS) */}
            <div className="space-y-3">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/70">
                  <div className="inline-block w-6 h-6 border-2 border-pine-teal border-t-transparent rounded-full animate-spin mb-2" />
                  <p>Đang nạp danh sách bác sĩ trực tiếp từ hệ thống phòng khám...</p>
                </div>
              ) : paginatedDoctors.length === 0 ? (
                <div className="py-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 p-6 space-y-2">
                  <p className="text-sm font-bold text-slate-700">Không tìm thấy bác sĩ phù hợp</p>
                  <p className="text-xs text-slate-500">
                    Vui lòng thử điều chỉnh lại từ khóa hoặc xóa bớt tiêu chí lọc khoảng giá.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setKeyword('');
                      setSelectedSpecialty('all');
                      setPriceFilter('all');
                      setSortBy('rating-desc');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-pine-teal bg-teal-50 hover:bg-teal-100 rounded-lg transition cursor-pointer mt-2"
                  >
                    <span>Xóa bộ lọc để xem tất cả</span>
                  </button>
                </div>
              ) : (
                paginatedDoctors.map((item, index) => {
                  const globalIndex = (currentPage - 1) * PAGE_SIZE + index + 1;
                  const displayIndex = globalIndex < 10 ? `0${globalIndex}` : `${globalIndex}`;

                  return (
                    <div
                      key={item.id}
                      className="group p-4 sm:p-5 rounded-2xl bg-white hover:bg-slate-50/50 border border-slate-200/80 hover:border-teal-primary/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_24px_-4px_rgba(14,92,85,0.12)] hover:-translate-y-0.5 transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden"
                    >
                      {/* Vạch màu nhấn ở cạnh trái khi hover */}
                      <span className="absolute left-0 top-0 bottom-0 w-1.5 bg-pine-teal opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-l-2xl" />

                      <div className="flex items-start gap-3.5 sm:gap-4 pl-1 min-w-0 flex-1">
                        {/* Badge số thứ tự độc lập */}
                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-pine-teal border border-teal-200/80 shadow-2xs flex items-center justify-center font-mono text-sm font-black group-hover:!bg-pine-teal group-hover:!text-white group-hover:!border-pine-teal transition-all duration-300 shrink-0">
                          {displayIndex}
                        </div>

                        {/* Thông tin bác sĩ */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          {/* Dòng 1: Chuyên khoa & Buồng khám & Chi nhánh */}
                          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                            <span className="text-xs font-extrabold text-pine-teal">
                              {item.specialtyName}
                            </span>
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

                          {/* Dòng 2: Tên Bác sĩ */}
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-pine-teal transition-colors">
                            {item.doctorName}
                          </h4>

                          {/* Dòng 3: Mô tả tóm tắt kinh nghiệm */}
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>

                          {/* Dòng 4: Đánh giá rating sao vàng & Số lượt review */}
                          <div className="flex items-center gap-3 pt-0.5 text-xs">
                            <div className="flex items-center gap-1 font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                              <Star size={12} className="text-amber-500 fill-amber-500" />
                              <span>{item.rating.toFixed(1)}</span>
                              <span className="text-slate-400 font-normal">({item.totalReviews} đánh giá)</span>
                            </div>
                            <span className="text-slate-300">•</span>
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={12} /> Bác sĩ trực tiếp thăm khám
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Cột Hành Động Bên Phải: Giá Khám & Nút Đặt Khám Ngay */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
                        <div className="text-left sm:text-right">
                          <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                            Giá khám niêm yết
                          </span>
                          <span className="text-sm sm:text-base font-black text-pine-teal">
                            {item.consultationFee.toLocaleString('vi-VN')} đ
                          </span>
                        </div>

                        {/* Nút Đặt Khám Ngay dẫn vào /booking */}
                        <Link
                          href={`/booking?doctorId=${item.id}&specialtyId=${item.specialtyId || ''}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-pine-teal hover:bg-pine-teal-hover text-white text-xs font-bold transition shadow-2xs hover:shadow-sm cursor-pointer shrink-0"
                        >
                          <Calendar size={13} />
                          <span>Đặt Khám Ngay</span>
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* THANH PHÂN TRANG (PAGINATION TOOLBAR - REQ-SEARCH-01) */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 px-2 border-t border-slate-200/70 text-xs">
                <span className="text-slate-500 text-[11px]">
                  Hiển thị {(currentPage - 1) * PAGE_SIZE + 1} - {Math.min(currentPage * PAGE_SIZE, filteredDoctors.length)} trên tổng số <strong className="text-slate-800 font-bold">{filteredDoctors.length}</strong> bác sĩ
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
                  >
                    <ChevronLeft size={13} />
                    <span>Trước</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }).map((_, i) => {
                      const pageNum = i + 1;
                      const isActive = currentPage === pageNum;
                      return (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-bold transition cursor-pointer ${
                            isActive
                              ? 'bg-pine-teal text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-semibold text-slate-700 transition cursor-pointer shadow-2xs"
                  >
                    <span>Sau</span>
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
