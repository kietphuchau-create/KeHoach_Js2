'use client';

import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { 
  ArrowUpRight, 
  Calendar, 
  Sparkles, 
  Stethoscope, 
  User, 
  MapPin, 
  Search, 
  Filter, 
  ArrowUpDown, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Building2,
  Clock
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
  avatarUrl: string;
}

// Hàm gán ảnh chân dung bác sĩ chuẩn y khoa nếu trong CSDL chưa có ảnh upload
function resolveDoctorAvatar(name?: string, specialty?: string, existingUrl?: string): string {
  if (existingUrl && existingUrl.trim().startsWith('http')) {
    return existingUrl;
  }
  const spec = (specialty || '').toLowerCase();
  const docName = (name || '').toLowerCase();

  if (spec.includes('da liễu') || docName.includes('yến nhi') || docName.includes('thu hà') || docName.includes('minh anh')) {
    return 'https://images.unsplash.com/photo-1594824813637-43c292f7c006?w=500&auto=format&fit=crop&q=80';
  }
  if (spec.includes('mắt') || docName.includes('quỳnh chi')) {
    return 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80';
  }
  if (spec.includes('răng') || docName.includes('vũ minh đức')) {
    return 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&auto=format&fit=crop&q=80';
  }
  if (spec.includes('nội') || docName.includes('trần văn hùng')) {
    return 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80';
  }
  if (spec.includes('tai mũi họng') || docName.includes('bảo')) {
    return 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&auto=format&fit=crop&q=80';
  }
  if (spec.includes('nhi') || docName.includes('thảo my')) {
    return 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=500&auto=format&fit=crop&q=80';
  }

  return 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80';
}

// Danh sách bác sĩ chuẩn theo CSDL MedSched kèm ảnh đại diện chuyên gia
const FALLBACK_DOCTORS: DoctorDirectoryItem[] = [
  {
    id: '10b2c3d4-0001-4000-8000-000000000001',
    specialtyId: 'spec-01',
    specialtyName: 'Chuyên khoa Da liễu',
    description: 'Chuyên gia đầu ngành Da liễu với hơn 15 năm kinh nghiệm điều trị bệnh lý ngoài da và chăm sóc da.',
    doctorName: 'BS.CKII Nguyễn Minh Anh',
    academicTitle: 'BS.CKII',
    roomNumber: 'P.205',
    centerName: 'Chi nhánh Quận 1',
    consultationFee: 350000,
    avatarUrl: 'https://images.unsplash.com/photo-1594824813637-43c292f7c006?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '10b2c3d4-0003-4000-8000-000000000003',
    specialtyId: 'spec-02',
    specialtyName: 'Chuyên khoa Nội tổng quát',
    description: 'Chuyên gia Nội tổng quát, tim mạch học, huyết áp và các rối loạn chuyển hóa.',
    doctorName: 'PGS.TS Trần Văn Hùng',
    academicTitle: 'PGS.TS',
    roomNumber: 'P.208',
    centerName: 'Chi nhánh Quận 1',
    consultationFee: 450000,
    avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '10b2c3d4-0005-4000-8000-000000000005',
    specialtyId: 'spec-03',
    specialtyName: 'Chuyên khoa Răng Hàm Mặt',
    description: 'Bác sĩ Răng Hàm Mặt, phục hình thẩm mỹ và nha khoa kỹ thuật cao.',
    doctorName: 'ThS.BS Vũ Minh Đức',
    academicTitle: 'ThS.BS',
    roomNumber: 'P.101',
    centerName: 'Cơ sở MedSched',
    consultationFee: 300000,
    avatarUrl: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '10b2c3d4-0006-4000-8000-000000000006',
    specialtyId: 'spec-04',
    specialtyName: 'Chuyên khoa Mắt',
    description: 'Chuyên gia Mắt & Khúc xạ giác mạc, điều trị bệnh lý nhãn khoa và tật khúc xạ.',
    doctorName: 'BS.CKII Phạm Quỳnh Chi',
    academicTitle: 'BS.CKII',
    roomNumber: 'P.102',
    centerName: 'Cơ sở MedSched',
    consultationFee: 250000,
    avatarUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '10b2c3d4-0004-4000-8000-000000000004',
    specialtyId: 'spec-01',
    specialtyName: 'Chuyên khoa Da liễu',
    description: 'Bác sĩ chuyên khoa điều trị bệnh lý ngoài da và phục hồi da tại Chi nhánh Quận 7.',
    doctorName: 'ThS.BS Lê Thị Thu Hà',
    academicTitle: 'ThS.BS',
    roomNumber: 'P.102',
    centerName: 'Chi nhánh Quận 7',
    consultationFee: 280000,
    avatarUrl: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=500&auto=format&fit=crop&q=80',
  },
  {
    id: '10b2c3d4-0002-4000-8000-000000000002',
    specialtyId: 'spec-01',
    specialtyName: 'Chuyên khoa Da liễu & Thẩm mỹ',
    description: 'Chuyên gia Da liễu & Thẩm mỹ da công nghệ cao tại Chi nhánh Quận 7.',
    doctorName: 'ThS.BS Đỗ Quang Vinh',
    academicTitle: 'ThS.BS',
    roomNumber: 'P.102',
    centerName: 'Chi nhánh Quận 7',
    consultationFee: 550000,
    avatarUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&auto=format&fit=crop&q=80',
  },
];

const PAGE_SIZE = 4;

export default function ClinicSpecialtiesDirectory() {
  const [allDoctors, setAllDoctors] = useState<DoctorDirectoryItem[]>(FALLBACK_DOCTORS);
  const [loading, setLoading] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  // REQ-SEARCH-01 & REQ-SEARCH-02: Bộ lọc đa tiêu chí thực tế
  const [keyword, setKeyword] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Đồng bộ trạng thái giữa 3D Carousel (Khối Trái) và Danh Sách Tìm Kiếm (Khối Phải)
  const [carouselIndex, setCarouselIndex] = useState<number>(0);
  const [isHovered3D, setIsHovered3D] = useState<boolean>(false);

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

  // Nạp dữ liệu bác sĩ thực tế từ CSDL qua API
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

            const avatar = resolveDoctorAvatar(fullNameWithTitle, specialty, doc.avatarUrl);

            return {
              id: doc.id || doc.userId,
              specialtyId: doc.specialtyId,
              specialtyName: specialty,
              description: desc,
              doctorName: fullNameWithTitle,
              academicTitle: doc.academicTitle || 'BS',
              roomNumber: room,
              centerName: center,
              consultationFee: Number(doc.consultationFee) || 300000,
              avatarUrl: avatar,
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

  // Danh sách các chuyên khoa thực tế từ CSDL
  const specialtyOptions = useMemo(() => {
    const set = new Set<string>();
    allDoctors.forEach((d) => {
      if (d.specialtyName) set.add(d.specialtyName);
    });
    return Array.from(set);
  }, [allDoctors]);

  // Bộ lọc dữ liệu theo tiêu chí thực tế
  const filteredDoctors = useMemo(() => {
    let result = allDoctors.filter((doc) => {
      // 1. Lọc theo từ khóa tìm kiếm
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

      // 3. Lọc theo khoảng giá khám thực tế
      const fee = doc.consultationFee;
      if (priceFilter === 'under300' && fee >= 300000) return false;
      if (priceFilter === '300to500' && (fee < 300000 || fee > 500000)) return false;
      if (priceFilter === 'above500' && fee <= 500000) return false;

      return true;
    });

    // 4. Sắp xếp kết quả theo tiêu chí thực tế
    if (sortBy === 'price-asc') {
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

  // Danh sách bác sĩ hiển thị trên sân khấu 3D Carousel (Tối đa 5-6 bác sĩ tiêu biểu)
  const carouselDoctors = useMemo(() => {
    return allDoctors.slice(0, 5);
  }, [allDoctors]);

  const totalCarouselItems = carouselDoctors.length || 1;
  const anglePerItem = 360 / totalCarouselItems;
  const carouselRadius = 240; // Bán kính hình trụ 3D chuẩn không đè góc

  // Tự động xoay 3D Carousel sau mỗi 4 giây nếu người dùng không tương tác
  useEffect(() => {
    if (isHovered3D || totalCarouselItems <= 1) return;
    const timer = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % totalCarouselItems);
    }, 4000);
    return () => clearInterval(timer);
  }, [isHovered3D, totalCarouselItems]);

  const handlePrev3D = useCallback(() => {
    setCarouselIndex((prev) => (prev - 1 + totalCarouselItems) % totalCarouselItems);
  }, [totalCarouselItems]);

  const handleNext3D = useCallback(() => {
    setCarouselIndex((prev) => (prev + 1) % totalCarouselItems);
  }, [totalCarouselItems]);

  // Nắm kéo trên điện thoại (Touch) & Lăn chuột / Kéo chuột trên Laptop (Mouse)
  const [dragOffset, setDragOffset] = useState<number>(0);
  const isDraggingRef = useRef<boolean>(false);
  const startXRef = useRef<number>(0);
  const lastWheelTimeRef = useRef<number>(0);

  // Xử lý Lăn Chuột trên Laptop / Trackpad
  const handleWheel3D = useCallback((e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 280) return;
    if (Math.abs(e.deltaY) > 10 || Math.abs(e.deltaX) > 10) {
      lastWheelTimeRef.current = now;
      if (e.deltaY > 0 || e.deltaX > 0) {
        setCarouselIndex((prev) => (prev + 1) % totalCarouselItems);
      } else {
        setCarouselIndex((prev) => (prev - 1 + totalCarouselItems) % totalCarouselItems);
      }
    }
  }, [totalCarouselItems]);

  // Xử lý Vuốt chạm / Kéo trên Điện Thoại (Touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startXRef.current;
    const angleDiff = Math.max(-35, Math.min(35, (diff / 220) * anglePerItem));
    setDragOffset(angleDiff);
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (dragOffset < -8) {
      setCarouselIndex((prev) => (prev + 1) % totalCarouselItems);
    } else if (dragOffset > 8) {
      setCarouselIndex((prev) => (prev - 1 + totalCarouselItems) % totalCarouselItems);
    }
    setDragOffset(0);
  };

  // Xử lý Nắm Kéo Chuột trên Máy tính (Mouse Drag)
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    startXRef.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const diff = e.clientX - startXRef.current;
    const angleDiff = Math.max(-35, Math.min(35, (diff / 220) * anglePerItem));
    setDragOffset(angleDiff);
  };

  const handleMouseUp = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    if (dragOffset < -8) {
      setCarouselIndex((prev) => (prev + 1) % totalCarouselItems);
    } else if (dragOffset > 8) {
      setCarouselIndex((prev) => (prev - 1 + totalCarouselItems) % totalCarouselItems);
    }
    setDragOffset(0);
  };

  // Bác sĩ đang ở vị trí trung tâm của 3D Carousel
  const active3DDoctor = carouselDoctors[carouselIndex];

  return (
    <section ref={sectionRef} id="specialties" className="scroll-mt-24 space-y-6 py-4 overflow-hidden">
      <div
        className={`bg-white rounded-3xl p-5 sm:p-8 lg:p-10 border border-mint-light shadow-xs transition-all duration-700 ease-out ${
          isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-[0.98]'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          
          {/* ======================================================== */}
          {/* CỘT TRÁI: SÂN KHẤU 3D CAROUSEL BÁC SĨ (CÓ ẢNH CHÂN DUNG)  */}
          {/* ======================================================== */}
          <div
            className={`lg:col-span-5 space-y-3 lg:sticky lg:top-24 transition-all duration-700 delay-100 ease-out ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
            }`}
          >
            {/* SÂN KHẤU 3D CAROUSEL: HỖ TRỢ VUỐT TRÊN ĐIỆN THOẠI & LĂN CHUỘT / KÉO CHUỘT TRÊN LAPTOP */}
            <div 
              className="relative select-none cursor-grab active:cursor-grabbing touch-pan-y"
              onMouseEnter={() => setIsHovered3D(true)}
              onMouseLeave={() => {
                setIsHovered3D(false);
                if (isDraggingRef.current) handleMouseUp();
              }}
              onWheel={handleWheel3D}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
            >
              {/* VÙNG KHÔNG GIAN 3D (ĐÃ ẨN MẶT SAU BACKFACE-HIDDEN ĐỂ KHÔNG BỊ ĐÈ CHỮ) */}
              <div 
                className="h-[350px] sm:h-[370px] flex items-center justify-center relative select-none"
                style={{ perspective: '1100px' }}
              >
                <div 
                  className="w-[220px] sm:w-[240px] h-[310px] sm:h-[330px] relative transition-transform duration-500 ease-out"
                  style={{
                    transformStyle: 'preserve-3d',
                    transform: `rotateY(${-carouselIndex * anglePerItem + dragOffset}deg)`,
                  }}
                >
                  {carouselDoctors.map((doc, idx) => {
                    const itemAngle = idx * anglePerItem;
                    const isCurrent = idx === carouselIndex;

                    return (
                      <div
                        key={doc.id}
                        onClick={() => setCarouselIndex(idx)}
                        className={`absolute inset-0 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-500 cursor-pointer border ${
                          isCurrent
                            ? 'bg-white border-2 border-pine-teal shadow-xl ring-4 ring-teal-500/20 scale-100 z-30 opacity-100'
                            : 'bg-white border-slate-200 shadow-md scale-90 z-10 opacity-70 hover:opacity-95'
                        }`}
                        style={{
                          transform: `rotateY(${itemAngle}deg) translateZ(${carouselRadius}px)`,
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                        }}
                      >
                        {/* NỬA TRÊN: ẢNH CHÂN DUNG BÁC SĨ THẬT */}
                        <div className="relative h-[180px] sm:h-[190px] w-full bg-slate-100 shrink-0 overflow-hidden">
                          <img
                            src={doc.avatarUrl}
                            alt={doc.doctorName}
                            className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                          {/* Badge chuyên khoa đè lên góc ảnh */}
                          <div className="absolute top-2.5 left-2.5 max-w-[85%]">
                            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-white/95 text-pine-teal shadow-xs truncate block border border-teal-100">
                              {doc.specialtyName}
                            </span>
                          </div>
                          {doc.roomNumber && (
                            <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-600 text-white shadow-xs">
                              {doc.roomNumber}
                            </span>
                          )}
                        </div>

                        {/* NỬA DƯỚI: THÔNG TIN BÁC SĨ & NÚT ĐẶT LỊCH */}
                        <div className="p-3 sm:p-3.5 flex flex-col justify-between flex-1 bg-white">
                          <div className="space-y-1">
                            <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">
                              {doc.doctorName}
                            </h4>
                            <p className="text-[10px] text-slate-500 truncate flex items-center gap-1">
                              <Building2 size={11} className="shrink-0 text-slate-400" />
                              <span>{doc.centerName}</span>
                            </p>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 mt-1">
                            <div>
                              <span className="text-[8px] text-slate-400 block font-semibold uppercase tracking-wider">
                                Giá khám
                              </span>
                              <span className="text-xs font-black text-pine-teal">
                                {doc.consultationFee.toLocaleString('vi-VN')} đ
                              </span>
                            </div>
                            <Link
                              href={`/booking?doctorId=${doc.id}&specialtyId=${doc.specialtyId || ''}`}
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-pine-teal hover:bg-pine-teal-hover text-white text-[11px] font-bold transition shadow-2xs"
                            >
                              <span>Đặt khám</span>
                              <ArrowUpRight size={11} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* CỘT PHẢI: BỘ LỌC TÌM KIẾM ĐA ĐIỀU KIỆN & DANH SÁCH BÁC SĨ */}
          {/* ======================================================== */}
          <div
            className={`lg:col-span-7 space-y-4 transition-all duration-700 delay-200 ease-out ${
              isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'
            }`}
          >
            {/* THANH TÌM KIẾM & BỘ LỌC ĐA TIÊU CHÍ */}
            <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
              {/* Ô tìm kiếm từ khóa */}
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

              {/* Bộ 3 Dropdown Lọc Chuyên Khoa - Lọc Khoảng Giá - Sắp Xếp */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                {/* 1. Lọc Chuyên Khoa */}
                <div>
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
                <div>
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

                {/* 3. Sắp Xếp Thực Tế (REQ-SEARCH-02) */}
                <div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 font-medium focus:outline-hidden focus:ring-2 focus:ring-teal-primary/40 focus:border-pine-teal transition cursor-pointer"
                  >
                    <option value="default">📋 Sắp xếp: Mặc định</option>
                    <option value="price-asc">💵 Giá: Thấp đến cao</option>
                    <option value="price-desc">💎 Giá: Cao đến thấp</option>
                    <option value="name-asc">🔤 Tên: A → Z</option>
                  </select>
                </div>
              </div>

              {/* Thẻ gợi ý nhanh */}
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
                  onClick={() => setPriceFilter('300to500')}
                  className={`text-[11px] px-2.5 py-1 rounded-lg transition font-medium cursor-pointer ${
                    priceFilter === '300to500'
                      ? 'bg-pine-teal text-white shadow-2xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  300k - 500k
                </button>
              </div>
            </div>

            {/* DANH SÁCH THẺ BÁC SĨ (ĐỒNG BỘ VỚI 3D CAROUSEL BÊN TRÁI) */}
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
                      setSortBy('default');
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
                  const isMatching3D = active3DDoctor?.id === item.id;

                  return (
                    <div
                      key={item.id}
                      onMouseEnter={() => {
                        const foundIdx = carouselDoctors.findIndex((d) => d.id === item.id);
                        if (foundIdx !== -1) {
                          setCarouselIndex(foundIdx);
                        }
                      }}
                      className={`group p-4 sm:p-5 rounded-2xl transition-all duration-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden ${
                        isMatching3D
                          ? 'bg-emerald-50/40 border-2 border-pine-teal shadow-[0_8px_20px_-4px_rgba(14,92,85,0.15)] ring-2 ring-teal-500/20'
                          : 'bg-white hover:bg-slate-50/60 border border-slate-200/80 hover:border-teal-primary/60 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5'
                      }`}
                    >
                      {/* Vạch màu nhấn ở cạnh trái */}
                      <span className={`absolute left-0 top-0 bottom-0 w-1.5 transition-opacity duration-300 rounded-l-2xl ${
                        isMatching3D ? 'bg-pine-teal opacity-100' : 'bg-pine-teal opacity-0 group-hover:opacity-100'
                      }`} />

                      <div className="flex items-start gap-3.5 sm:gap-4 pl-1 min-w-0 flex-1">
                        {/* Avatar ảnh Bác sĩ tròn chuyên nghiệp */}
                        <div className="relative w-12 h-12 rounded-2xl overflow-hidden border-2 border-teal-200/80 shrink-0 shadow-2xs bg-slate-100">
                          <img
                            src={item.avatarUrl}
                            alt={item.doctorName}
                            className="w-full h-full object-cover object-top"
                            loading="lazy"
                          />
                          <span className="absolute bottom-0 right-0 bg-pine-teal text-white text-[9px] font-mono px-1 rounded-tl-md font-bold">
                            {displayIndex}
                          </span>
                        </div>

                        {/* Thông tin bác sĩ thực tế */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          {/* Chuyên khoa, Buồng khám, Cơ sở & Badge đồng bộ 3D */}
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
                            {isMatching3D && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300 shadow-2xs flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Đang hiển thị ở sân khấu 3D
                              </span>
                            )}
                          </div>

                          {/* Họ tên bác sĩ + Học vị */}
                          <h4 className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-pine-teal transition-colors">
                            {item.doctorName}
                          </h4>

                          {/* Mô tả thế mạnh lâm sàng */}
                          <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                            {item.description}
                          </p>

                          {/* Cam kết thăm khám thực tế */}
                          <div className="flex items-center gap-2 pt-0.5 text-xs text-emerald-700 font-medium">
                            <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                            <span>Bác sĩ trực tiếp thăm khám theo giờ hẹn</span>
                          </div>
                        </div>
                      </div>

                      {/* Giá Khám Niêm Yết & Nút Đặt Khám Ngay */}
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

            {/* THANH PHÂN TRANG (REQ-SEARCH-01) */}
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
