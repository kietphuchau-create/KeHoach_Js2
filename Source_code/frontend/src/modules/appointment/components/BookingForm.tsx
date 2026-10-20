'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  Sparkles, 
  CheckCircle2, 
  Check,
  Building2, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  QrCode, 
  MapPin, 
  ShieldCheck,
  Printer,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  AlertCircle,
  CreditCard,
  Sun,
  Sunset,
  Users,
  Paperclip,
  Trash2,
  FileText,
  HeartPulse,
  Phone,
  Info,
  CalendarDays,
  Gift,
  ReceiptText,
  Award,
  GraduationCap,
  X
} from 'lucide-react';
import { api, AppointmentResponse, getAuthUser, getAuthToken } from '@/shared/lib/api';
import { formatDoctorFullName } from '@/shared/lib/formatters';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import { useSingleTabLock } from '@/shared/hooks/useSingleTabLock';
import SingleTabLockOverlay from '@/shared/components/Feedback/SingleTabLockOverlay';
import { QrCodeImage } from '@/shared/components/QrCodeImage';
import { VietQrModal } from '@/shared/components/VietQrModal';

// Trích xuất chữ cái đại diện chuẩn cho Avatar Bác sĩ (Ưu tiên chữ cái đầu tên chính, viết hoa)
const getDoctorInitials = (name?: string): string => {
  if (!name) return 'BS';
  const cleanName = name.replace(/^(BS\.CK[I|V]+|ThS\.BS|PGS\.TS|TS\.BS|BS|Bác sĩ)\s+/i, '').trim();
  const words = cleanName.split(/\s+/).filter(Boolean);
  const lastWord = words[words.length - 1];
  return lastWord ? lastWord.charAt(0).toUpperCase() : 'BS';
};

// Trích xuất và chuẩn hóa thông tin chuyên môn, số năm kinh nghiệm, học hàm bác sĩ
const getDoctorFullDetails = (doc: any, specialtyName?: string, centerName?: string) => {
  if (!doc) return null;

  // Trích xuất số năm kinh nghiệm từ bio nếu có (ví dụ: "hơn 15 năm kinh nghiệm")
  let exp = '';
  if (doc.bio) {
    const match = doc.bio.match(/(\d+)\s*năm\s*kinh\s*nghiệm/i);
    if (match && match[1]) {
      exp = `${match[1]}+ Năm`;
    }
  }
  if (!exp) {
    const title = (doc.academicTitle || '').toUpperCase();
    if (title.includes('PGS') || title.includes('GS')) exp = '25+ Năm';
    else if (title.includes('CKII') || title.includes('CK2') || title.includes('TS')) exp = '15+ Năm';
    else if (title.includes('CKI') || title.includes('CK1') || title.includes('THS')) exp = '10+ Năm';
    else exp = '8+ Năm';
  }

  // Đơn vị đào tạo & học hàm
  let degree = doc.academicTitle || 'Bác sĩ chuyên khoa';
  if (degree === 'BS.CKII') degree = 'Bác sĩ Chuyên khoa II (BS.CKII)';
  else if (degree === 'BS.CKI') degree = 'Bác sĩ Chuyên khoa I (BS.CKI)';
  else if (degree === 'ThS.BS') degree = 'Thạc sĩ - Bác sĩ Y khoa (ThS.BS)';
  else if (degree === 'TS.BS') degree = 'Tiến sĩ - Bác sĩ Y khoa (TS.BS)';
  else if (degree === 'PGS.TS') degree = 'Phó Giáo sư - Tiến sĩ (PGS.TS)';

  // Thế mạnh lâm sàng & chuyên môn
  const spec = doc.specialty || specialtyName || 'Chuyên khoa';
  let strengths = doc.bio;
  if (!strengths || strengths.length < 20) {
    if (spec.toLowerCase().includes('da')) {
      strengths = 'Khám & điều trị chuyên sâu bệnh lý da liễu, mụn trứng cá kháng trị, nám da, viêm da cơ địa, tư vấn liệu trình chăm sóc da chuẩn y khoa.';
    } else if (spec.toLowerCase().includes('nội')) {
      strengths = 'Khám tổng quát, tầm soát tim mạch, huyết áp, đái tháo đường, rối loạn chuyển hóa và tư vấn phác đồ điều trị nội khoa.';
    } else if (spec.toLowerCase().includes('nhi')) {
      strengths = 'Khám và tư vấn phát triển thể chất nhi khoa, bệnh lý hô hấp, tiêu hóa ở trẻ em, dinh dưỡng và tiêm chủng.';
    } else {
      strengths = `Khám chẩn đoán và điều trị toàn diện chuyên khoa ${spec}, tư vấn phác đồ điều trị cá nhân hóa theo tiêu chuẩn Bộ Y Tế.`;
    }
  }

  return {
    ...doc,
    experience: exp,
    degreeFull: degree,
    strengths,
    specialtyDisplay: spec,
    centerDisplay: doc.centerName || centerName || 'Phòng Khám Đa Khoa MedSched',
    roomDisplay: doc.room ? (doc.room.startsWith('P.') ? `Buồng ${doc.room}` : doc.room) : 'Buồng P.205',
    workHours: 'Thứ 2 - Thứ 6 (08:00 - 16:30)',
  };
};

export default function BookingForm() {
  const { isBlocked, handleTakeOver } = useSingleTabLock({
    channelKey: 'patient_booking',
    moduleName: 'Đặt Lịch Khám Trực Tuyến',
  });

  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [authChecking, setAuthChecking] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [centers, setCenters] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [isPaidOnline, setIsPaidOnline] = useState<boolean>(false);
  const [promoInput, setPromoInput] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [paidPromoCode, setPaidPromoCode] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [showClinicInfoModal, setShowClinicInfoModal] = useState<boolean>(false);
  const [showFeeModal, setShowFeeModal] = useState<boolean>(false);
  const [showRelativeModal, setShowRelativeModal] = useState<boolean>(false);
  const [showAiModal, setShowAiModal] = useState<boolean>(false);
  const [showAttachmentModal, setShowAttachmentModal] = useState<boolean>(false);
  const [showVoucherModal, setShowVoucherModal] = useState<boolean>(false);
  const [showDoctorModal, setShowDoctorModal] = useState<boolean>(false);
  const [doctorModalData, setDoctorModalData] = useState<any>(null);
  const [showSpecialtyModal, setShowSpecialtyModal] = useState<boolean>(false);
  const [selectedSpecialtyModalData, setSelectedSpecialtyModalData] = useState<any>(null);

  // Validation errors cho các bước (Khoanh vùng đỏ + thông báo khi chưa chọn đủ tiêu chí)
  const [step1Errors, setStep1Errors] = useState<{ center?: string; specialty?: string }>({});
  const [step2Errors, setStep2Errors] = useState<{ doctor?: string; date?: string; slot?: string }>({});

  // Authentication & Role Check
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/booking&reason=auth_required');
      return;
    }

    const user = getAuthUser();
    setCurrentUser(user);
    const roles: string[] = user?.roles || [];
    if (roles.includes('ROLE_ADMIN')) {
      router.push('/admin');
      return;
    } else if (roles.includes('ROLE_DOCTOR')) {
      router.push('/doctor');
      return;
    } else if (roles.includes('ROLE_STAFF')) {
      router.push('/reception');
      return;
    }
    setAuthChecking(false);
  }, [router]);

  // Form selections
  const [selectedCenter, setSelectedCenter] = useState<string>('');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);

  // Patient Profile Mode (Self vs Relative - Chuẩn YouMed)
  const [bookingFor, setBookingFor] = useState<'self' | 'relative'>('self');
  const [relativeInfo, setRelativeInfo] = useState({
    fullName: '',
    birthYear: '1995',
    gender: 'NAM',
    relationship: 'Ba / Mẹ',
    phone: '',
  });

  // Attachments (Tệp đính kèm kết quả xét nghiệm / đơn thuốc cũ)
  const [attachments, setAttachments] = useState<Array<{ name: string; size: string }>>([]);

  const getTodayISODate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const formatISODateToVN = (iso: string) => {
    const parts = iso.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
  };

  // Nếu hiện tại đã quá 15:30 chiều (khung giờ khám cuối cùng 15:30 - 16:00 đã qua/bắt đầu),
  // hoặc đã hết giờ hành chính, ngày hôm nay không còn nhận lịch hẹn nữa
  const isPastAllTodaySlots = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return currentMinutes >= 15 * 60 + 30;
  };

  // Tìm ngày làm việc hợp lệ tiếp theo (Thứ 2 đến Thứ 6), tuyệt đối không rơi vào Thứ 7 hoặc Chủ Nhật
  const getNextAvailableWeekday = (baseDate?: Date): string => {
    const d = baseDate ? new Date(baseDate) : new Date();
    if (!baseDate && isPastAllTodaySlots()) {
      d.setDate(d.getDate() + 1);
    }
    // Bỏ qua Thứ 7 (6) và Chủ Nhật (0)
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const formatVietnameseFullDate = (iso: string) => {
    if (!iso) return '';
    const parts = iso.split('-');
    if (parts.length !== 3) return iso;
    const [y, m, d] = parts.map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();
    const dayNames = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = dayNames[dayOfWeek] || '';
    return `${dayName}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  };

  // Rút gọn tên chuyên khoa tinh tế, loại bỏ tiền tố thừa "Chuyên khoa / Khoa" để tránh tràn chữ ".."
  const formatSpecialtyShortName = (name: string): string => {
    if (!name) return '';
    const cleaned = name.replace(/^(Chuyên khoa|Khoa)\s+/i, '').trim();
    if (cleaned.toLowerCase() === 'nội') return 'Nội khoa';
    if (cleaned.toLowerCase() === 'ngoại') return 'Ngoại khoa';
    if (cleaned.toLowerCase() === 'nhi') return 'Nhi khoa';
    return cleaned || name;
  };

  const [bookingDate, setBookingDate] = useState<string>(() => getNextAvailableWeekday());

  const [selectedSlot, setSelectedSlot] = useState<{ id: string; time: string; date: string }>(() => {
    const initialDate = getNextAvailableWeekday();
    return {
      id: '',
      time: 'Chưa chọn',
      date: formatISODateToVN(initialDate),
    };
  });

  // Quản lý hiển thị lịch chọn ngày (di chuột hoặc bấm vào để mở, không có Thứ 7 & CN)
  const [showDatePicker, setShowDatePicker] = useState(false);
  const datePickerRef = useRef<HTMLDivElement>(null);

  // Tháng và năm hiển thị trên lịch tùy chỉnh
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const initial = getNextAvailableWeekday();
    const parts = initial.split('-').map(Number);
    if (parts.length === 3) {
      return new Date(parts[0], parts[1] - 1, 1);
    }
    return new Date();
  });

  // Tự động đồng bộ tháng xem theo ngày đã chọn khi mở popup
  useEffect(() => {
    if (showDatePicker && bookingDate) {
      const parts = bookingDate.split('-').map(Number);
      if (parts.length === 3) {
        setCalendarMonth(new Date(parts[0], parts[1] - 1, 1));
      }
    }
  }, [showDatePicker, bookingDate]);

  // Quản lý hiển thị 2 popup chọn khung giờ (1 là chọn Buổi, 2 là chọn Khung giờ)
  const [selectedSession, setSelectedSession] = useState<'morning' | 'afternoon'>('morning');
  const [showSessionModal, setShowSessionModal] = useState<boolean>(false);
  const [showSlotModal, setShowSlotModal] = useState<boolean>(false);
  // Trạng thái đã chọn ngày khám hay chưa (mặc định ẩn ô chọn buổi & giờ, chọn ngày xong mới hiện)
  const [hasSelectedDate, setHasSelectedDate] = useState<boolean>(false);

  // Tự động chuyển ngày khám sang ngày làm việc tiếp theo nếu ngày đang chọn là hôm nay mà đã hết giờ
  useEffect(() => {
    const todayIso = getTodayISODate();
    if (bookingDate === todayIso && isPastAllTodaySlots()) {
      const nextDate = getNextAvailableWeekday();
      setBookingDate(nextDate);
      if (hasSelectedDate) {
        setSelectedSlot((prev) => ({
          ...prev,
          date: formatISODateToVN(nextDate),
        }));
      }
    }
  }, [bookingDate, hasSelectedDate]);

  // Tự động đồng bộ Buổi theo Khung giờ đã chọn
  useEffect(() => {
    if (selectedSlot.time && selectedSlot.time !== 'Chưa chọn' && selectedSlot.time !== 'Hết chỗ') {
      const hour = parseInt(selectedSlot.time.split(':')[0], 10) || 0;
      setSelectedSession(hour >= 12 ? 'afternoon' : 'morning');
    }
  }, [selectedSlot.time]);

  // Đóng lịch & các popup khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setError(null);
        setShowDatePicker(false);
        setShowSessionModal(false);
        setShowSlotModal(false);
        setShowClinicInfoModal(false);
        setShowFeeModal(false);
        setShowRelativeModal(false);
        setShowAiModal(false);
        setShowAttachmentModal(false);
        setShowVoucherModal(false);
        setShowDoctorModal(false);
        setShowSpecialtyModal(false);
      }
    };
    if (
      Boolean(error) ||
      showDatePicker ||
      showSessionModal ||
      showSlotModal ||
      showClinicInfoModal ||
      showFeeModal ||
      showRelativeModal ||
      showAiModal ||
      showAttachmentModal ||
      showVoucherModal ||
      showDoctorModal ||
      showSpecialtyModal
    ) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    error,
    showDatePicker,
    showSessionModal,
    showSlotModal,
    showClinicInfoModal,
    showFeeModal,
    showRelativeModal,
    showAiModal,
    showAttachmentModal,
    showVoucherModal,
    showDoctorModal,
    showSpecialtyModal,
  ]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCalendarMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleSelectDate = (isoString: string) => {
    const [y, m, d] = isoString.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dayOfWeek = dateObj.getDay();
    // Chặn triệt để Thứ 7 (6) và Chủ Nhật (0)
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return;
    }
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Chặn ngày quá khứ
    if (dateObj < today) {
      return;
    }
    // Chặn ngày hôm nay nếu đã hết giờ hành chính / hết khung giờ nhận khám
    const isToday = dateObj.getTime() === today.getTime();
    if (isToday && isPastAllTodaySlots()) {
      return;
    }
    setBookingDate(isoString);
    const formatted = `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
    setSelectedSlot((prev) => ({
      ...prev,
      date: formatted,
      id: '',
      time: 'Đang tải...',
    }));
    setShowDatePicker(false);
    setHasSelectedDate(true);
    setStep2Errors((prev) => ({ ...prev, date: undefined }));
    // Tự động mở Popup chọn Buổi khám sau khi vừa chọn ngày xong
    setShowSessionModal(true);
  };

  // Điều hướng Step 1 kèm kiểm tra và khoanh vùng đỏ tiêu chí chưa chọn
  const handleContinueStep1 = () => {
    const errors: { center?: string; specialty?: string } = {};

    if (!selectedCenter) {
      errors.center = 'Vui lòng chọn một Chi nhánh phòng khám MedSched';
    }

    if (!selectedSpecialty) {
      errors.specialty = 'Vui lòng chọn Chuyên khoa thăm khám';
    } else {
      const selectedSpecDocCount = doctors.filter(
        (d) => (!selectedCenter || !d.centerId || d.centerId === selectedCenter) && d.specialtyId === selectedSpecialty
      ).length;
      if (selectedSpecDocCount === 0) {
        errors.specialty = 'Chuyên khoa này hiện chưa có bác sĩ trực tại chi nhánh. Vui lòng chọn chuyên khoa khác.';
      }
    }

    setStep1Errors(errors);

    if (Object.keys(errors).length === 0) {
      setStep(2);
    }
  };

  // Điều hướng Step 2 kèm kiểm tra và khoanh vùng đỏ tiêu chí chưa chọn
  const handleContinueStep2 = () => {
    const errors: { doctor?: string; date?: string; slot?: string } = {};

    // 1. Phải chọn bác sĩ trước tiên
    if (!selectedDoctor) {
      errors.doctor = 'Vui lòng bấm chọn 1 Bác sĩ phụ trách ở trên';
      setStep2Errors(errors);
      return;
    }

    // 2. Khi đã có bác sĩ, kiểm tra ngày và khung giờ
    if (!hasSelectedDate) {
      errors.date = 'Vui lòng chọn ngày khám bệnh (Thứ 2 đến Thứ 6)';
    } else if (
      !selectedSlot.id ||
      selectedSlot.id === 'default' ||
      !selectedSlot.time ||
      selectedSlot.time === 'Chưa chọn' ||
      selectedSlot.time === 'Đang tải...'
    ) {
      errors.slot = 'Vui lòng chọn khung giờ khám bệnh (Time-slot)';
    }

    setStep2Errors(errors);

    if (Object.keys(errors).length === 0) {
      setStep(3);
    }
  };

  const todayDateOnly = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const isCurrentMonthOrPast = useMemo(() => {
    const currentYear = todayDateOnly.getFullYear();
    const currentMonth = todayDateOnly.getMonth();
    const viewYear = calendarMonth.getFullYear();
    const viewMonth = calendarMonth.getMonth();
    return viewYear < currentYear || (viewYear === currentYear && viewMonth <= currentMonth);
  }, [calendarMonth, todayDateOnly]);

  const { emptyCellsCount, daysInMonth } = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const emptyCount = (firstDayIndex + 6) % 7;
    const totalDays = new Date(year, month + 1, 0).getDate();
    return { emptyCellsCount: emptyCount, daysInMonth: totalDays };
  }, [calendarMonth]);

  const [symptoms, setSymptoms] = useState('');
  const [aiPreview, setAiPreview] = useState<{ specialty: string; summary: string } | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const [c, s, docList] = await Promise.all([
          api.getMedicalCenters().catch(() => []),
          api.getSpecialties().catch(() => []),
          api.getDoctors().catch(() => []),
        ]);
        if (c && c.length > 0) {
          const activeCenters = c.filter((item: any) => item.active !== false);
          setCenters(activeCenters);
          // Tuyệt đối không chọn sẵn chi nhánh - để người dùng tự bấm chọn
        }
        if (s && s.length > 0) {
          setSpecialties(s);
        }
        if (docList && docList.length > 0) {
          const mapped = docList.map((d: any) => ({
            id: d.id,
            name: formatDoctorFullName(d.academicTitle, d.fullName),
            rawName: d.fullName,
            academicTitle: d.academicTitle || 'Bác sĩ chuyên khoa',
            title: d.bio || `Bác sĩ ${d.specialtyName || ''}`,
            room: d.roomNumber || 'Phòng P.208',
            fee: Number(d.consultationFee) || 200000,
            specialty: d.specialtyName,
            specialtyId: d.specialtyId,
            centerId: d.medicalCenterId,
          }));
          setDoctors(mapped);
        }
      } finally {
        setLoadingData(false);
      }
    }
    loadCategories();
  }, []);

  // Lọc chuyên khoa theo chi nhánh đã chọn
  const filteredSpecialties = useMemo(() => {
    if (!selectedCenter) return specialties;
    return specialties.filter((s) => !s.medicalCenterId || s.medicalCenterId === selectedCenter);
  }, [specialties, selectedCenter]);

  // Khi đổi chi nhánh: nếu chuyên khoa đã chọn không còn khả dụng thì reset về rỗng
  useEffect(() => {
    if (selectedSpecialty) {
      const isValid = filteredSpecialties.some(
        (s) => s.id === selectedSpecialty && doctors.some((d) => (!selectedCenter || !d.centerId || d.centerId === selectedCenter) && d.specialtyId === s.id)
      );
      if (!isValid) {
        setSelectedSpecialty('');
        setSelectedDoctor(null);
      }
    }
  }, [filteredSpecialties, selectedSpecialty, doctors, selectedCenter]);

  // Lọc bác sĩ theo chi nhánh và chuyên khoa đã chọn
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      const matchCenter = !selectedCenter || !doc.centerId || doc.centerId === selectedCenter;
      const matchSpec = !selectedSpecialty || !doc.specialtyId || doc.specialtyId === selectedSpecialty;
      return matchCenter && matchSpec;
    });
  }, [doctors, selectedCenter, selectedSpecialty]);

  // Khi danh sách bác sĩ thay đổi: nếu bác sĩ đã chọn không còn khả dụng thì reset về null
  useEffect(() => {
    if (selectedDoctor) {
      const exists = filteredDoctors.some((d) => d.id === selectedDoctor.id);
      if (!exists) {
        setSelectedDoctor(null);
      }
    }
  }, [filteredDoctors, selectedDoctor]);

  // Khi thay đổi bác sĩ, ngày hoặc khung giờ: reset phiếu chờ thanh toán
  useEffect(() => {
    if (!isPaidOnline) {
      setResult(null);
    }
  }, [selectedDoctor?.id, bookingDate, selectedSlot.id, isPaidOnline]);

  const handleAnalyzeSymptoms = async () => {
    if (!symptoms.trim()) return;
    setAnalyzingAi(true);
    try {
      const res = await api.triageSymptoms(symptoms);
      setAiPreview(res);
      setShowAiModal(true);
    } catch (e: any) {
      console.error(e);
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newItems: Array<{ name: string; size: string }> = [];
    for (let i = 0; i < files.length; i++) {
      if (attachments.length + newItems.length >= 5) break;
      const file = files[i];
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      newItems.push({ name: file.name, size: sizeStr });
    }
    setAttachments((prev) => [...prev, ...newItems].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApplyPromo = () => {
    setPromoError(null);
    const cleaned = promoInput.trim().toUpperCase();
    if (!cleaned) {
      setPromoError('Vui lòng nhập mã khuyến mãi');
      return;
    }
    const validCodes = ['GIAOVIEN', 'MEDFREE', 'GIAM100', 'TESTER', 'VIP', 'GV2026', 'BACSITHANH', 'KHOACNTT', 'DEMO'];
    if (validCodes.includes(cleaned) || cleaned.startsWith('GV') || cleaned.startsWith('TEST') || cleaned.startsWith('FREE')) {
      setAppliedPromo(cleaned);
      setPromoError(null);
    } else {
      setPromoError('Mã không hợp lệ. Vui lòng thử mã "GIAOVIEN" hoặc "MEDFREE".');
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoInput('');
    setPromoError(null);
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Nếu đã tạo phiếu hẹn và đang chờ thanh toán cọc thì chỉ cần mở lại modal VietQR
    if (result && result.id && !isPaidOnline) {
      setShowPaymentModal(true);
      return;
    }

    if (!selectedSlot.id || timeSlots.find((s) => s.id === selectedSlot.id)?.disabled) {
      setError('Khung giờ bạn chọn đã qua hoặc không còn khả dụng. Vui lòng chọn khung giờ khác hoặc ngày khác.');
      return;
    }
    if (bookingFor === 'relative' && !relativeInfo.fullName.trim()) {
      setShowRelativeModal(true);
      setError('Vui lòng nhập họ tên người thân được đặt khám hộ trong cửa sổ thông tin.');
      return;
    }
    setSubmitting(true);

    try {
      let currentPatientProfileId = '';
      try {
        const profile = await api.getProfile();
        if (profile?.patientProfile?.profileId) {
          currentPatientProfileId = profile.patientProfile.profileId;
        }
      } catch {
        // Backend tự động phân giải từ JWT Session
      }

      let formattedSymptoms = symptoms.trim() || 'Khám kiểm tra sức khỏe định kỳ';
      if (bookingFor === 'relative') {
        const relPrefix = `[Khám cho người thân: ${relativeInfo.fullName || 'Người thân'} (${relativeInfo.birthYear}) - Quan hệ: ${relativeInfo.relationship} - SĐT: ${relativeInfo.phone || 'Chưa cung cấp'}]`;
        formattedSymptoms = `${relPrefix} ${formattedSymptoms}`;
      }
      if (attachments.length > 0) {
        formattedSymptoms = `${formattedSymptoms} [Có ${attachments.length} tệp tài liệu đính kèm: ${attachments.map((a) => a.name).join(', ')}]`;
      }

      const res = await api.bookAppointment({
        medicalCenterId: selectedCenter,
        patientProfileId: currentPatientProfileId,
        doctorId: selectedDoctor?.id || '',
        slotId: selectedSlot.id,
        symptoms: formattedSymptoms,
        medicalHistory: '',
      });
      setResult(res);

      if (appliedPromo) {
        // Tự động xác nhận cọc 0 đ cho Giảng viên / Tester
        try {
          await api.confirmRealPayment({
            appointmentId: res.id,
            bookingCode: res.bookingCode,
            paymentType: 'PROMO_FREE',
            amount: 0,
            promoCode: appliedPromo,
          });
          setIsPaidOnline(true);
          setPaidPromoCode(appliedPromo);
          setShowPaymentModal(false);
          setStep(4);
        } catch (autoErr) {
          console.warn('Auto confirm promo payment warning:', autoErr);
          setShowPaymentModal(true);
        }
      } else {
        // Bắt buộc thanh toán cọc thành công mới được chuyển sang Bước 4 (Phiếu hẹn)
        setShowPaymentModal(true);
      }
    } catch (err: any) {
      setError(err.message || 'Đặt lịch thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const BASE_TIME_SLOTS = [
    { id: 'sl000001-0000-0000-0000-000000000001', time: '08:00 - 08:30', startMinutes: 8 * 60, defaultStatus: 'available' },
    { id: 'sl000002-0000-0000-0000-000000000001', time: '08:30 - 09:00', startMinutes: 8 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000003-0000-0000-0000-000000000001', time: '09:00 - 09:30', startMinutes: 9 * 60, defaultStatus: 'available' },
    { id: 'sl000004-0000-0000-0000-000000000001', time: '09:30 - 10:00', startMinutes: 9 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000005-0000-0000-0000-000000000001', time: '10:00 - 10:30', startMinutes: 10 * 60, defaultStatus: 'available' },
    { id: 'sl000006-0000-0000-0000-000000000001', time: '10:30 - 11:00', startMinutes: 10 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000007-0000-0000-0000-000000000001', time: '13:30 - 14:00', startMinutes: 13 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000008-0000-0000-0000-000000000001', time: '14:00 - 14:30', startMinutes: 14 * 60, defaultStatus: 'available' },
    { id: 'sl000009-0000-0000-0000-000000000001', time: '14:30 - 15:00', startMinutes: 14 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000010-0000-0000-0000-000000000001', time: '15:00 - 15:30', startMinutes: 15 * 60, defaultStatus: 'available' },
    { id: 'sl000011-0000-0000-0000-000000000001', time: '15:30 - 16:00', startMinutes: 15 * 60 + 30, defaultStatus: 'available' },
  ];

  const [dynamicSlots, setDynamicSlots] = useState<Array<{
    id: string;
    time: string;
    startMinutes: number;
    status: string;
    label: string;
    disabled: boolean;
  }>>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    const docId = selectedDoctor?.id;
    if (!docId) {
      setDynamicSlots([]);
      setSelectedSlot({
        id: '',
        time: 'Chưa chọn',
        date: formatISODateToVN(bookingDate),
      });
      return;
    }
    let isCancelled = false;
    setLoadingSlots(true);
    api.getDoctorAvailableSlots(docId, bookingDate)
      .then((data) => {
        if (!isCancelled && Array.isArray(data) && data.length > 0) {
          setDynamicSlots(data);
        } else if (!isCancelled) {
          setDynamicSlots([]);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch doctor slots:', err);
        if (!isCancelled) setDynamicSlots([]);
      })
      .finally(() => {
        if (!isCancelled) setLoadingSlots(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDoctor?.id, bookingDate]);

  const timeSlots = useMemo(() => {
    if (!selectedDoctor?.id) return [];
    if (dynamicSlots.length > 0) {
      return dynamicSlots.map((s) => ({
        id: s.id,
        time: s.time,
        status: (s.status === 'full' ? 'full' : s.status === 'expired' ? 'expired' : s.status === 'locked' ? 'full' : 'available') as 'available' | 'full' | 'expired',
        label: s.label,
        disabled: s.disabled,
      }));
    }

    const isToday = bookingDate === getTodayISODate();
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    return BASE_TIME_SLOTS.map((slot) => {
      const isPast = isToday && slot.startMinutes <= currentMinutes;
      if (isPast) {
        return {
          id: slot.id,
          time: slot.time,
          status: 'expired' as const,
          label: 'Đã qua giờ',
          disabled: true,
        };
      }
      return {
        id: slot.id,
        time: slot.time,
        status: 'available' as const,
        label: 'Khả dụng',
        disabled: false,
      };
    });
  }, [bookingDate, dynamicSlots, selectedDoctor?.id]);

  // Phân chia khung giờ Sáng & Chiều (Chuẩn YouMed - Ảnh 1 & Ảnh 3)
  const morningSlots = useMemo(() => {
    return timeSlots.filter((s) => {
      const hour = parseInt(s.time.split(':')[0], 10) || 0;
      return hour < 12;
    });
  }, [timeSlots]);

  const afternoonSlots = useMemo(() => {
    return timeSlots.filter((s) => {
      const hour = parseInt(s.time.split(':')[0], 10) || 0;
      return hour >= 12;
    });
  }, [timeSlots]);

  // Tự động chọn khung giờ khả dụng đầu tiên
  useEffect(() => {
    if (!selectedDoctor?.id) {
      setSelectedSlot({
        id: '',
        time: 'Chưa chọn',
        date: formatISODateToVN(bookingDate),
      });
      return;
    }
    const firstAvailable = timeSlots.find((s) => !s.disabled);
    if (firstAvailable) {
      setSelectedSlot({
        id: firstAvailable.id,
        time: firstAvailable.time,
        date: formatISODateToVN(bookingDate),
      });
    } else {
      setSelectedSlot({
        id: '',
        time: 'Hết chỗ',
        date: formatISODateToVN(bookingDate),
      });
    }
  }, [bookingDate, timeSlots, selectedDoctor?.id]);

  const activeCenterObj = useMemo(() => {
    return centers.find((c) => c.id === selectedCenter) || centers[0] || {
      name: 'Phòng Khám Đa Khoa MedSched',
      address: '210 Dương Bá Trạc, P.2, Q.8, TP.HCM',
    };
  }, [centers, selectedCenter]);

  const activeSpecialtyObj = useMemo(() => {
    return specialties.find((s) => s.id === selectedSpecialty) || null;
  }, [specialties, selectedSpecialty]);

  if (authChecking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center py-16">
        <LoadingSpinner size={36} message="Đang kiểm tra quyền truy cập đặt lịch khám..." />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 sm:px-4 pb-6 sm:pb-10">
      <h1 className="sr-only">Đặt Lịch Khám Bác Sĩ Chuyên Khoa</h1>

      {/* Thanh tiến trình Stepper (Chỉ báo tiến trình chuẩn Y tế - Trong suốt, không khung trắng) */}
      {step < 4 && (
        <div className="py-2 sm:py-3 select-none">
          <div className="relative max-w-xl mx-auto px-1 sm:px-4">
            {/* Đường ray kết nối nền */}
            <div className="absolute left-6 right-6 sm:left-10 sm:right-10 top-4 -translate-y-1/2 h-1 bg-slate-200/80 rounded-full">
              {/* Đường tiến trình màu xanh đã đạt được */}
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: step === 1 ? '0%' : step === 2 ? '50%' : '100%',
                }}
              />
            </div>

            {/* Các điểm mốc tiến trình (Step Nodes) */}
            <div className="relative flex items-start justify-between">
              
              {/* Bước 1 */}
              <div className="flex flex-col items-center text-center flex-1 min-w-0 max-w-[130px] sm:max-w-[160px]">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step > 1
                      ? 'bg-blue-600 text-white shadow-sm'
                      : step === 1
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md shadow-blue-500/25'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {step > 1 ? <Check size={16} strokeWidth={2.8} /> : '1'}
                </div>
                <div className="mt-1.5 px-0.5">
                  <span
                    className={`block text-[11px] sm:text-xs font-bold transition-colors leading-tight whitespace-nowrap ${
                      step === 1 ? 'text-blue-700' : step > 1 ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    1. Cơ Sở &amp; Khoa
                  </span>
                  <span className="hidden sm:block text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                    Chọn phòng khám
                  </span>
                </div>
              </div>

              {/* Bước 2 */}
              <div className="flex flex-col items-center text-center flex-1 min-w-0 max-w-[130px] sm:max-w-[160px]">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step > 2
                      ? 'bg-blue-600 text-white shadow-sm'
                      : step === 2
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md shadow-blue-500/25'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  {step > 2 ? <Check size={16} strokeWidth={2.8} /> : '2'}
                </div>
                <div className="mt-1.5 px-0.5">
                  <span
                    className={`block text-[11px] sm:text-xs font-bold transition-colors leading-tight whitespace-nowrap ${
                      step === 2 ? 'text-blue-700' : step > 2 ? 'text-slate-800' : 'text-slate-400'
                    }`}
                  >
                    2. Bác Sĩ &amp; Giờ
                  </span>
                  <span className="hidden sm:block text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                    Chọn ca khám
                  </span>
                </div>
              </div>

              {/* Bước 3 */}
              <div className="flex flex-col items-center text-center flex-1 min-w-0 max-w-[130px] sm:max-w-[160px]">
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    step === 3
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow-md shadow-blue-500/25'
                      : 'bg-white border-2 border-slate-300 text-slate-400'
                  }`}
                >
                  3
                </div>
                <div className="mt-1.5 px-0.5">
                  <span
                    className={`block text-[11px] sm:text-xs font-bold transition-colors leading-tight whitespace-nowrap ${
                      step === 3 ? 'text-blue-700' : 'text-slate-400'
                    }`}
                  >
                    3. Hồ Sơ Bệnh Nhân
                  </span>
                  <span className="hidden sm:block text-[10px] text-slate-400 mt-0.5 whitespace-nowrap">
                    Xác nhận thông tin
                  </span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

        {/* Popup Modal Thông Báo Lỗi (Error Modal Popup) */}
        {error && (
          <div
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fadeIn flex items-center justify-center p-4"
            onClick={() => setError(null)}
          >
            <div
              className="bg-white rounded-3xl max-w-sm sm:max-w-md w-full shadow-2xl border border-red-100 overflow-hidden animate-scaleUp p-5 sm:p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 text-red-600 shadow-xs">
                  <AlertCircle size={26} className="text-red-600" />
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-900">
                      Thông Báo Lịch Hẹn
                    </h3>
                    <button
                      type="button"
                      onClick={() => setError(null)}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition active:scale-95"
                      aria-label="Đóng"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="mt-2.5 text-sm text-slate-700 leading-relaxed font-medium">
                    {error}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold text-sm shadow-md shadow-red-500/20 active:scale-95 transition"
                >
                  Đã hiểu & Đóng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Cơ Sở & Chuyên Khoa */}
        {step === 1 && (
          <div className="mt-4 sm:mt-5 space-y-3.5 sm:space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                <Building2 size={15} className="text-blue-600" />
                <span>1. Chọn Chi Nhánh Phòng Khám MedSched:</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                {centers.map((center) => (
                  <div
                    key={center.id}
                    onClick={() => {
                      setSelectedCenter(center.id);
                      setStep1Errors((prev) => ({ ...prev, center: undefined }));
                    }}
                    className={`p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-3 ${
                      selectedCenter === center.id
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                        : step1Errors.center
                        ? 'border-red-400 bg-red-50/20 hover:border-red-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-800 text-xs sm:text-sm block truncate" title={center.name}>
                        {center.name}
                      </span>
                      <p className="text-[11px] sm:text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate" title={center.address}>
                        <MapPin size={13} className="shrink-0 text-slate-400" />
                        <span className="truncate">{center.address}</span>
                      </p>
                    </div>
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        selectedCenter === center.id
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'border-2 border-slate-300 bg-white'
                      }`}
                    >
                      {selectedCenter === center.id && <Check size={12} strokeWidth={3} />}
                    </div>
                  </div>
                ))}
              </div>

              {/* Thông báo lỗi khi chưa chọn chi nhánh */}
              {step1Errors.center && (
                <div className="mt-2.5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-semibold animate-fadeIn">
                  <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <AlertCircle size={14} />
                  </div>
                  <span>{step1Errors.center}</span>
                </div>
              )}
            </div>

            {/* 2. Chọn Chuyên Khoa Thăm Khám: Ẩn đi khi chưa chọn chi nhánh */}
            {selectedCenter ? (
              <div className="animate-fadeIn">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
                  <Stethoscope size={15} className="text-blue-600" />
                  <span>2. Chọn Chuyên Khoa Thăm Khám:</span>
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                  {filteredSpecialties.length === 0 ? (
                    <div className="col-span-full py-6 px-4 text-center bg-slate-50 rounded-xl sm:rounded-2xl border border-dashed border-slate-200">
                      <Stethoscope size={24} className="mx-auto text-slate-400 mb-1.5" />
                      <p className="text-xs font-semibold text-slate-600">Chi nhánh này hiện chưa có chuyên khoa khả dụng</p>
                    </div>
                  ) : (
                    filteredSpecialties.map((spec) => {
                      const docCount = doctors.filter(
                        (d) => (!selectedCenter || !d.centerId || d.centerId === selectedCenter) && d.specialtyId === spec.id
                      ).length;
                      const hasDoctors = docCount > 0;
                      const isSelected = selectedSpecialty === spec.id && hasDoctors;

                      return (
                        <div
                          key={spec.id}
                          onClick={() => {
                            if (hasDoctors) {
                              setSelectedSpecialty(spec.id);
                              setStep1Errors((prev) => ({ ...prev, specialty: undefined }));
                            }
                          }}
                          title={
                            hasDoctors 
                              ? `Chọn ${spec.name}` 
                              : `Chuyên khoa ${spec.name} hiện chưa có bác sĩ phụ trách tại chi nhánh này`
                          }
                          className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border-2 transition flex items-center justify-between gap-2 select-none min-h-[66px] sm:min-h-[72px] ${
                            !hasDoctors
                              ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200 text-slate-400'
                              : isSelected
                              ? 'border-blue-600 bg-blue-50/60 text-blue-900 font-bold shadow-xs cursor-pointer'
                              : step1Errors.specialty
                              ? 'border-red-400 bg-red-50/20 hover:border-red-500 text-slate-800 cursor-pointer'
                              : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white cursor-pointer hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-center gap-2 sm:gap-2.5 text-xs sm:text-sm min-w-0 flex-1">
                            <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 ${
                              !hasDoctors ? 'bg-slate-100 text-slate-400' : 'bg-blue-100/70 text-blue-700'
                            }`}>
                              <Stethoscope size={14} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1 min-w-0">
                                <span 
                                  className="font-bold text-xs sm:text-sm leading-snug break-words"
                                  title={spec.name}
                                >
                                  {formatSpecialtyShortName(spec.name)}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSpecialtyModalData(spec);
                                    setShowSpecialtyModal(true);
                                  }}
                                  className="w-4 h-4 rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center transition shrink-0 cursor-pointer"
                                  title="Xem thông tin chi tiết chuyên khoa"
                                >
                                  <Info size={11} />
                                </button>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {hasDoctors ? (
                                  <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded truncate">
                                    {docCount} bác sĩ
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.2 rounded truncate">
                                    Chưa có bác sĩ
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          {hasDoctors && (
                            <div
                              className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                                isSelected
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'border border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check size={10} strokeWidth={3} />}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Thông báo lỗi khi chưa chọn chuyên khoa */}
                {step1Errors.specialty && (
                  <div className="mt-2.5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-semibold animate-fadeIn">
                    <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <AlertCircle size={14} />
                    </div>
                    <span>{step1Errors.specialty}</span>
                  </div>
                )}
              </div>
            ) : null}

            {/* Nút Tiếp tục chọn Bác sĩ & Khung giờ */}
            <div className="pt-3 sm:pt-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleContinueStep1}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 sm:py-2.5 rounded-xl sm:rounded-2xl transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 cursor-pointer text-xs sm:text-sm w-full sm:w-auto sm:ml-auto"
              >
                <span>Tiếp tục chọn Bác sĩ &amp; Khung giờ</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Layout 2 Cột Chuẩn YouMed Web */}
        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:items-stretch items-start">
            
            {/* Cột Trái: Doctor & Clinic Profile Card (Cân bằng chiều cao từ laptop trở lên) */}
            <div className="lg:col-span-5 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-5 border border-slate-200 lg:h-full flex flex-col justify-between shadow-2xs">
              <div className="space-y-4">
                <div className="pb-3 sm:pb-3.5 border-b border-slate-200/90 flex items-center justify-between gap-2.5">
                  <h3 
                    className="font-extrabold text-slate-800 text-xs sm:text-sm leading-snug break-words flex-1"
                    title={selectedDoctor?.name}
                  >
                    {selectedDoctor?.name || 'Chưa chọn bác sĩ'}
                  </h3>
                  {selectedDoctor && (
                    <button
                      type="button"
                      onClick={() => {
                        const details = getDoctorFullDetails(selectedDoctor, activeSpecialtyObj?.name, activeCenterObj?.name);
                        setDoctorModalData(details);
                        setShowDoctorModal(true);
                      }}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-0.5 cursor-pointer bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition shrink-0 shadow-2xs whitespace-nowrap"
                    >
                      <span>Hồ sơ bác sĩ</span>
                      <ChevronRight size={12} />
                    </button>
                  )}
                </div>

                {/* Chi tiết phòng khám & Địa chỉ (Mặc định thu gọn, bấm mở popup để tiết kiệm diện tích) */}
                <button
                  type="button"
                  onClick={() => setShowClinicInfoModal(true)}
                  className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/40 text-xs transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0 text-left">
                    <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <Building2 size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-800 text-xs block truncate">
                        {activeCenterObj?.name || 'Cơ sở khám bệnh'}
                      </span>
                      <span className="text-[11px] text-blue-600 font-semibold block truncate">
                        {selectedDoctor?.room ? `Buồng ${selectedDoctor.room}` : 'Buồng khám'} • Thứ 2 - CN (07:30 - 17:30)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg shrink-0 group-hover:bg-blue-100 transition ml-2">
                    <span>Chi tiết</span>
                    <ChevronRight size={13} />
                  </div>
                </button>

                {/* Bảng giá niêm yết minh bạch (Thu gọn thành nút bấm mở popup thông tin) */}
                <button
                  type="button"
                  onClick={() => setShowFeeModal(true)}
                  className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/40 text-xs transition-all cursor-pointer group shadow-2xs"
                >
                  <div className="flex items-center gap-2 min-w-0 text-left">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                      <ReceiptText size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-bold text-slate-800 text-xs block">
                        Chi phí khám niêm yết
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium block truncate">
                        Khám tại quầy: <strong className="text-slate-800 font-bold">{selectedDoctor ? `${Number(selectedDoctor.fee).toLocaleString('vi-VN')} đ` : '-- đ'}</strong> • <strong className="text-blue-700 font-bold">Cọc online: 2.000 đ</strong>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg shrink-0 group-hover:bg-blue-100 transition ml-2">
                    <span>Chi tiết</span>
                    <ChevronRight size={13} />
                  </div>
                </button>
              </div>

              {/* Thanh cam kết chuẩn y tế chân thẻ giúp cân bằng chiều cao với cột phải */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 mt-4">
                <span className="flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/70">
                  <ShieldCheck size={13} className="text-emerald-600 shrink-0" />
                  <span>Tiếp đón ưu tiên 1S</span>
                </span>
                <span className="flex items-center gap-1 text-slate-400 font-medium">
                  <Clock size={12} />
                  <span>07:30 - 17:30</span>
                </span>
              </div>
            </div>

            {/* Cột Phải: Form Thao Tác Chi Tiết */}
            <div className="lg:col-span-7 bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-2xs lg:h-full flex flex-col justify-between space-y-6">
              
              {/* Step 2: Chọn Ngày & Ca Khám (Phân ca Sáng / Chiều - Ảnh 1 & 3) */}
              <div className="h-full flex flex-col justify-between space-y-6">
                  {/* Danh sách bác sĩ: Hiển thị để bệnh nhân tự bấm chọn bác sĩ phụ trách */}
                  {filteredDoctors.length > 0 && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                        1. Chọn Bác Sĩ Phụ Trách:
                      </label>
                      <div className="space-y-2.5">
                        {filteredDoctors.map((doc) => {
                          const isSelected = selectedDoctor?.id === doc.id;
                          const details = getDoctorFullDetails(doc, activeSpecialtyObj?.name, activeCenterObj?.name);
                          return (
                            <div
                              key={doc.id}
                              onClick={() => {
                                setSelectedDoctor(doc);
                                setStep2Errors((prev) => ({ ...prev, doctor: undefined }));
                              }}
                              className={`p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center justify-between gap-3 group hover:shadow-xs ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                                  : step2Errors.doctor
                                  ? 'border-red-400 bg-red-50/30 ring-2 ring-red-200'
                                  : 'border-slate-200 hover:border-blue-400 bg-white'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0 group-hover:scale-105 transition">
                                  {getDoctorInitials(doc.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5">
                                    <h4 className="font-bold text-slate-800 text-xs sm:text-sm line-clamp-1 break-words">
                                      {doc.name}
                                    </h4>
                                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded-md shrink-0">
                                      {details?.experience || '10+ Năm'}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate">
                                    {doc.title || doc.specialty || 'Bác sĩ chuyên khoa'} • {doc.room}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2 whitespace-nowrap flex flex-col items-end">
                                <span className="text-xs font-bold text-blue-700 block">
                                  {Number(doc.fee).toLocaleString('vi-VN')} đ
                                </span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  {isSelected ? (
                                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                                      <Check size={12} strokeWidth={3} /> Đã chọn
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDoctorModalData(details);
                                        setShowDoctorModal(true);
                                      }}
                                      className="text-[10px] font-bold text-blue-600 flex items-center gap-0.5 hover:underline"
                                    >
                                      <span>Xem hồ sơ</span>
                                      <ChevronRight size={10} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Thông báo lỗi khi chưa chọn bác sĩ */}
                      {step2Errors.doctor && (
                        <div className="mt-2.5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-semibold animate-fadeIn">
                          <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                            <AlertCircle size={14} />
                          </div>
                          <span>{step2Errors.doctor}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Thông báo nếu chuyên khoa chưa có bác sĩ trực */}
                  {filteredDoctors.length === 0 && (
                    <div className="py-8 px-4 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <Stethoscope size={28} className="mx-auto text-slate-400 mb-2" />
                      <p className="text-xs font-semibold text-slate-600">
                        Khoa {activeSpecialtyObj?.name || 'này'} hiện chưa có bác sĩ phụ trách tại {activeCenterObj.name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Vui lòng nhấn &quot;Quay lại&quot; ở bên dưới để chọn Chuyên khoa khác
                      </p>
                    </div>
                  )}

                  {/* Chỉ hiển thị Chọn Ngày & Khung Giờ khi ĐÃ CÓ BÁC SĨ ĐƯỢC CHỌN */}
                  {selectedDoctor ? (
                    <>
                      {/* Chọn Ngày Khám Bệnh */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                          {filteredDoctors.length > 1 ? '2. Chọn Ngày Khám Bệnh:' : '1. Chọn Ngày Khám Bệnh:'}
                        </label>
                        <div>
                          {/* Nút bấm mở lịch chọn ngày: Bấm vào hiện modal phủ mờ toàn bộ thông tin nền */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowDatePicker(true);
                              setStep2Errors((prev) => ({ ...prev, date: undefined }));
                            }}
                            aria-haspopup="dialog"
                            aria-expanded={showDatePicker}
                            className={`w-full flex items-center justify-between p-3 bg-white border rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer group focus:outline-none focus:ring-2 ${
                              step2Errors.date
                                ? 'border-red-500 ring-2 ring-red-300 bg-red-50/40 text-red-900'
                                : hasSelectedDate
                                ? 'border-blue-500 text-slate-900 bg-blue-50/20 focus:ring-blue-100'
                                : 'border-blue-400 hover:border-blue-600 text-slate-800 focus:ring-blue-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                                  step2Errors.date ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
                                }`}
                              >
                                <Calendar size={15} />
                              </div>
                              <div className="text-left min-w-0">
                                <span className="text-[10px] text-slate-400 block font-normal leading-tight">Ngày khám bệnh:</span>
                                <span className={`font-bold block leading-tight truncate ${step2Errors.date ? 'text-red-700' : 'text-slate-900'}`}>
                                  {hasSelectedDate ? formatVietnameseFullDate(bookingDate) : 'Bấm vào để chọn ngày khám (Thứ 2 - Thứ 6)'}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg shrink-0 transition ml-2 ${
                                step2Errors.date
                                  ? 'text-red-700 bg-red-100/90'
                                  : 'text-blue-600 bg-blue-50 group-hover:bg-blue-100'
                              }`}
                            >
                              <span>{hasSelectedDate ? 'Đổi ngày' : 'Chọn ngày'}</span>
                              <ChevronDown size={13} />
                            </div>
                          </button>

                          {/* Modal Lịch Khám: Phủ mờ toàn bộ màn hình và thông tin khác (Chặn Thứ 7 & Chủ Nhật) */}
                          {showDatePicker && (
                            <div
                              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
                              onClick={() => setShowDatePicker(false)}
                            >
                              <div
                                className="bg-white w-full max-w-[340px] sm:max-w-[360px] rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-3.5 animate-scaleUp"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Header popup lịch */}
                                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                  <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                      <CalendarDays size={17} />
                                    </div>
                                    <div>
                                      <h3 className="font-extrabold text-slate-800 text-xs sm:text-sm">
                                        Chọn Ngày Khám Bệnh
                                      </h3>
                                      <span className="text-[11px] text-slate-500 block">
                                        Tiếp nhận Thứ 2 - Thứ 6 (Thứ 7 & CN nghỉ)
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setShowDatePicker(false)}
                                    className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                                    aria-label="Đóng lịch"
                                  >
                                    <X size={15} />
                                  </button>
                                </div>

                                {/* Header: Điều hướng tháng */}
                                <div className="flex items-center justify-between py-1 px-1 bg-slate-50 rounded-xl border border-slate-200/70">
                                  <button
                                    type="button"
                                    onClick={handlePrevMonth}
                                    disabled={isCurrentMonthOrPast}
                                    className={`p-1.5 rounded-lg border transition-colors ${
                                      isCurrentMonthOrPast
                                        ? 'border-transparent text-slate-300 cursor-not-allowed opacity-40'
                                        : 'border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:border-slate-300 cursor-pointer shadow-2xs'
                                    }`}
                                    title="Tháng trước"
                                  >
                                    <ChevronLeft size={16} />
                                  </button>

                                  <div className="text-center">
                                    <span className="text-xs font-bold text-slate-900 block">
                                      Tháng {calendarMonth.getMonth() + 1}, {calendarMonth.getFullYear()}
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={handleNextMonth}
                                    className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 hover:border-slate-300 transition-colors cursor-pointer shadow-2xs"
                                    title="Tháng sau"
                                  >
                                    <ChevronRight size={16} />
                                  </button>
                                </div>

                                {/* Hàng tiêu đề các thứ trong tuần */}
                                <div className="grid grid-cols-7 gap-1 text-center pt-1">
                                  {['T2', 'T3', 'T4', 'T5', 'T6'].map((wd) => (
                                    <div key={wd} className="text-[11px] font-bold text-slate-600 py-1">
                                      {wd}
                                    </div>
                                  ))}
                                  <div className="text-[11px] font-bold text-rose-500 py-1 bg-rose-50/70 rounded" title="Thứ 7 nghỉ">
                                    T7
                                  </div>
                                  <div className="text-[11px] font-bold text-rose-500 py-1 bg-rose-50/70 rounded" title="Chủ Nhật nghỉ">
                                    CN
                                  </div>
                                </div>

                                {/* Lưới các ngày trong tháng */}
                                <div className="grid grid-cols-7 gap-1">
                                  {/* Các ô trống trước ngày đầu tháng */}
                                  {Array.from({ length: emptyCellsCount }).map((_, i) => (
                                    <div key={`empty-${i}`} className="h-8.5" />
                                  ))}

                                  {/* Các ngày trong tháng */}
                                  {Array.from({ length: daysInMonth }).map((_, i) => {
                                    const day = i + 1;
                                    const currentDate = new Date(
                                      calendarMonth.getFullYear(),
                                      calendarMonth.getMonth(),
                                      day
                                    );
                                    const dayOfWeek = currentDate.getDay(); // 0 = CN, 6 = T7
                                    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                    const isPast = currentDate < todayDateOnly;
                                    const isoString = `${calendarMonth.getFullYear()}-${String(
                                      calendarMonth.getMonth() + 1
                                    ).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const isSelected = isoString === bookingDate;
                                    const isCurrentDay = currentDate.getTime() === todayDateOnly.getTime();
                                    const isTodayExpired = isCurrentDay && isPastAllTodaySlots();

                                    // Thứ 7 & CN: Tuyệt đối bị khóa
                                    if (isWeekend) {
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          disabled
                                          title="Phòng khám không nhận lịch hẹn vào Thứ 7 & Chủ Nhật"
                                          className="h-8.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-50/80 line-through cursor-not-allowed select-none opacity-50 flex items-center justify-center pointer-events-none"
                                        >
                                          {day}
                                        </button>
                                      );
                                    }

                                    // Ngày quá khứ hoặc ngày hôm nay đã hết giờ hành chính / hết ca khám: Bị khóa
                                    if (isPast || isTodayExpired) {
                                      return (
                                        <button
                                          key={day}
                                          type="button"
                                          disabled
                                          title={isTodayExpired ? 'Đã hết giờ tiếp nhận đặt khám trong ngày hôm nay (sau 15:30)' : 'Ngày đã qua'}
                                          className="h-8.5 rounded-xl text-xs font-medium text-slate-300 bg-slate-50/60 line-through cursor-not-allowed select-none opacity-40 flex items-center justify-center pointer-events-none"
                                        >
                                          {day}
                                        </button>
                                      );
                                    }

                                    // Ngày trong tuần hợp lệ (T2 -> T6)
                                    return (
                                      <button
                                        key={day}
                                        type="button"
                                        onClick={() => handleSelectDate(isoString)}
                                        className={`h-8.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center cursor-pointer ${
                                          isSelected
                                            ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-200 hover:bg-blue-700'
                                            : isCurrentDay
                                            ? 'border-2 border-blue-500 text-blue-700 bg-blue-50/70 hover:bg-blue-100 font-bold'
                                            : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:font-bold'
                                        }`}
                                      >
                                        {day}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Ghi chú rõ ràng phòng khám nghỉ Thứ 7 & CN và hết giờ tiếp nhận */}
                                <div className="pt-2 border-t border-slate-100 flex flex-col gap-1 text-[11px] text-amber-800 bg-amber-50/90 px-3 py-2 rounded-xl border border-amber-200/60">
                                  <div className="flex items-center gap-1.5">
                                    <Info size={14} className="shrink-0 text-amber-600" />
                                    <span>
                                      Phòng khám chỉ nhận lịch <strong>Thứ 2 đến Thứ 6</strong>. Thứ 7 &amp; Chủ Nhật không tiếp nhận đặt trước.
                                    </span>
                                  </div>
                                  {isPastAllTodaySlots() && (
                                    <span className="text-[10px] text-rose-600 font-bold pl-5">
                                      • Hôm nay đã hết giờ tiếp nhận khám (sau 15:30), vui lòng chọn từ ngày mai.
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Thẻ hướng dẫn khi chưa chọn ngày (khoanh đỏ cảnh báo nếu bấm tiếp tục mà chưa chọn) */}
                        {!hasSelectedDate && (
                          <div className={`mt-3 p-4 rounded-2xl border flex items-center gap-3 text-xs animate-fadeIn ${
                            step2Errors.date
                              ? 'bg-red-50/80 border-red-300 text-red-800 ring-1 ring-red-200'
                              : 'bg-gradient-to-r from-blue-50/50 to-indigo-50/30 border-blue-100 text-slate-600'
                          }`}>
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              step2Errors.date ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {step2Errors.date ? <AlertCircle size={18} /> : <CalendarDays size={16} />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`font-bold block text-xs ${step2Errors.date ? 'text-red-700' : 'text-slate-800'}`}>
                                {step2Errors.date ? step2Errors.date : 'Chưa chọn ngày khám bệnh'}
                              </span>
                              <span className={`text-[11px] block mt-0.5 ${step2Errors.date ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                                {step2Errors.date 
                                  ? 'Vui lòng nhấn nút "Chọn ngày" ở trên để chọn ngày khám hợp lệ trước khi tiếp tục.'
                                  : 'Vui lòng bấm nút phía trên để chọn ngày khám từ Thứ 2 đến Thứ 6. Hệ thống sẽ tự động hiển thị ca trực và khung giờ còn trống.'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Chọn Khung Giờ Khám (Time-slot) - Ẩn mặc định, CHỈ HIỆN KHI ĐÃ CHỌN NGÀY XONG */}
                      {hasSelectedDate && (
                        <div className="space-y-3 animate-fadeIn pt-1">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-slate-700 uppercase">
                              {filteredDoctors.length > 1 ? '3. Chọn Khung Giờ Khám (Time-slot):' : '2. Chọn Khung Giờ Khám (Time-slot):'}
                            </label>
                            {loadingSlots && (
                              <span className="text-[11px] text-blue-600 animate-pulse font-medium">
                                Đang tải khung giờ thực tế...
                              </span>
                            )}
                          </div>

                        {/* 2 Nút Trigger: 1 Chọn Buổi, 2 Chọn Khung Giờ (Dàn đều 2 cột cân đối) */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Nút 1: Chọn Buổi Khám */}
                          <button
                            type="button"
                            onClick={() => setShowSessionModal(true)}
                            aria-haspopup="dialog"
                            aria-expanded={showSessionModal}
                            className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 hover:border-blue-500 rounded-xl text-xs font-semibold text-slate-800 shadow-2xs hover:shadow-xs hover:bg-blue-50/20 transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-100"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${
                                  selectedSession === 'morning'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {selectedSession === 'morning' ? <Sun size={15} /> : <Sunset size={15} />}
                              </div>
                              <div className="text-left min-w-0">
                                <span className="text-[10px] text-slate-400 block font-normal leading-tight">Buổi khám:</span>
                                <span className="font-bold text-slate-900 block leading-tight truncate">
                                  {selectedSession === 'morning' ? 'Buổi Sáng (07:30 - 12:00)' : 'Buổi Chiều (13:30 - 17:30)'}
                                </span>
                              </div>
                            </div>
                            <ChevronDown size={14} className="text-slate-400 ml-1 group-hover:text-blue-600 transition-colors shrink-0" />
                          </button>

                          {/* Nút 2: Chọn Khung Giờ Khám */}
                          <button
                            type="button"
                            onClick={() => {
                              setShowSlotModal(true);
                              setStep2Errors((prev) => ({ ...prev, slot: undefined }));
                            }}
                            aria-haspopup="dialog"
                            aria-expanded={showSlotModal}
                            className={`w-full flex items-center justify-between p-3 bg-white border rounded-xl text-xs font-semibold shadow-2xs hover:shadow-xs transition-all cursor-pointer group focus:outline-none focus:ring-2 ${
                              step2Errors.slot
                                ? 'border-red-500 ring-2 ring-red-300 bg-red-50/40 text-red-900'
                                : 'border-slate-200 hover:border-blue-500 hover:bg-blue-50/20 text-slate-800 focus:ring-blue-100'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform ${
                                  step2Errors.slot ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'
                                }`}
                              >
                                <Clock size={15} />
                              </div>
                              <div className="text-left min-w-0">
                                <span className="text-[10px] text-slate-400 block font-normal leading-tight">Khung giờ:</span>
                                <span className={`font-bold block leading-tight truncate ${
                                  step2Errors.slot ? 'text-red-700' : 'text-blue-700'
                                }`}>
                                  {selectedSlot.time && selectedSlot.time !== 'Chưa chọn' && selectedSlot.time !== 'Hết chỗ'
                                    ? selectedSlot.time
                                    : 'Bấm chọn khung giờ'}
                                </span>
                              </div>
                            </div>
                            <ChevronDown size={14} className={`${step2Errors.slot ? 'text-red-500' : 'text-slate-400 group-hover:text-blue-600'} ml-1 transition-colors shrink-0`} />
                          </button>
                        </div>

                        {/* Thông báo lỗi khi chưa chọn khung giờ */}
                        {step2Errors.slot && (
                          <div className="mt-2.5 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-semibold animate-fadeIn">
                            <div className="w-5 h-5 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                              <AlertCircle size={14} />
                            </div>
                            <span>{step2Errors.slot}</span>
                          </div>
                        )}

                        {/* Popup 1: Chọn Buổi Khám Bệnh (Sáng / Chiều) - Phủ mờ toàn bộ thông tin khác */}
                        {showSessionModal && (
                          <div
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
                            onClick={() => setShowSessionModal(false)}
                          >
                            <div
                              className="bg-white w-full max-w-md rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Header popup */}
                              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                                    <Sun size={17} />
                                  </div>
                                  <div>
                                    <h3 className="font-extrabold text-slate-800 text-sm">
                                      1. Chọn Buổi Khám Bệnh
                                    </h3>
                                    <span className="text-[11px] text-slate-500 block">
                                      Chọn ca trực Sáng hoặc Chiều để xem khung giờ phù hợp
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowSessionModal(false)}
                                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                                  aria-label="Đóng popup"
                                >
                                  <X size={15} />
                                </button>
                              </div>

                              {/* Danh sách 2 Buổi: Sáng & Chiều */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Card Buổi Sáng */}
                                <div
                                  onClick={() => {
                                    setSelectedSession('morning');
                                    setShowSessionModal(false);
                                    setShowSlotModal(true);
                                  }}
                                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-3 ${
                                    selectedSession === 'morning'
                                      ? 'border-amber-500 bg-amber-50/50 shadow-sm ring-1 ring-amber-200'
                                      : 'border-slate-200 hover:border-amber-300 bg-white hover:bg-amber-50/20'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                                      <Sun size={20} />
                                    </div>
                                    {selectedSession === 'morning' && (
                                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                                        Đang chọn
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-slate-800 text-sm">Buổi Sáng</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">07:30 - 12:00</p>
                                  </div>
                                  <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                                      {morningSlots.filter((s) => !s.disabled).length} giờ trống
                                    </span>
                                    <span className="text-xs font-bold text-blue-600 flex items-center gap-0.5">
                                      Chọn giờ <ChevronRight size={13} />
                                    </span>
                                  </div>
                                </div>

                                {/* Card Buổi Chiều */}
                                <div
                                  onClick={() => {
                                    setSelectedSession('afternoon');
                                    setShowSessionModal(false);
                                    setShowSlotModal(true);
                                  }}
                                  className={`p-4 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between gap-3 ${
                                    selectedSession === 'afternoon'
                                      ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-1 ring-indigo-200'
                                      : 'border-slate-200 hover:border-indigo-300 bg-white hover:bg-indigo-50/20'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                                      <Sunset size={20} />
                                    </div>
                                    {selectedSession === 'afternoon' && (
                                      <span className="text-[10px] font-bold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full">
                                        Đang chọn
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-extrabold text-slate-800 text-sm">Buổi Chiều</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">13:30 - 17:30</p>
                                  </div>
                                  <div className="pt-2 border-t border-slate-100/80 flex items-center justify-between">
                                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
                                      {afternoonSlots.filter((s) => !s.disabled).length} giờ trống
                                    </span>
                                    <span className="text-xs font-bold text-blue-600 flex items-center gap-0.5">
                                      Chọn giờ <ChevronRight size={13} />
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px] text-slate-500 whitespace-nowrap overflow-hidden">
                                <Info size={13} className="shrink-0 text-blue-500" />
                                <span className="truncate">Chạm vào buổi khám để mở khung giờ chi tiết</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Popup 2: Chọn Khung Giờ Khám (Time-slot) - Phủ mờ toàn bộ thông tin khác */}
                        {showSlotModal && (
                          <div
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
                            onClick={() => setShowSlotModal(false)}
                          >
                            <div
                              className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp max-h-[90vh] flex flex-col"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {/* Header popup */}
                              <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                                    <Clock size={17} />
                                  </div>
                                  <div>
                                    <h3 className="font-extrabold text-slate-800 text-sm">
                                      2. Chọn Khung Giờ Khám (Time-slot)
                                    </h3>
                                    <span className="text-[11px] text-slate-500 block">
                                      Ngày khám: <strong>{formatVietnameseFullDate(bookingDate)}</strong>
                                    </span>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowSlotModal(false)}
                                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                                  aria-label="Đóng popup"
                                >
                                  <X size={15} />
                                </button>
                              </div>

                              {/* Tabs chuyển đổi Buổi Sáng / Buổi Chiều ngay trong popup */}
                              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl shrink-0">
                                <button
                                  type="button"
                                  onClick={() => setSelectedSession('morning')}
                                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                                    selectedSession === 'morning'
                                      ? 'bg-white text-amber-800 shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  <Sun size={15} className={selectedSession === 'morning' ? 'text-amber-500' : 'text-slate-400'} />
                                  <span>Buổi Sáng ({morningSlots.filter((s) => !s.disabled).length} trống)</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => setSelectedSession('afternoon')}
                                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer ${
                                    selectedSession === 'afternoon'
                                      ? 'bg-white text-indigo-800 shadow-xs'
                                      : 'text-slate-600 hover:text-slate-900'
                                  }`}
                                >
                                  <Sunset size={15} className={selectedSession === 'afternoon' ? 'text-indigo-500' : 'text-slate-400'} />
                                  <span>Buổi Chiều ({afternoonSlots.filter((s) => !s.disabled).length} trống)</span>
                                </button>
                              </div>

                              {/* Lưới danh sách Time Slots */}
                              <div className="overflow-y-auto pr-1 flex-1 py-1">
                                {loadingSlots ? (
                                  <div className="py-12 text-center text-xs text-blue-600 font-semibold animate-pulse">
                                    Đang tải khung giờ bác sĩ...
                                  </div>
                                ) : (selectedSession === 'morning' ? morningSlots : afternoonSlots).length === 0 ? (
                                  <div className="py-10 text-center text-xs text-slate-500">
                                    Hiện không có ca trực trong buổi này.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                                    {(selectedSession === 'morning' ? morningSlots : afternoonSlots).map((slot) => {
                                      const isSelected = selectedSlot.id === slot.id;
                                      return (
                                        <button
                                          key={slot.id}
                                          type="button"
                                          disabled={slot.disabled}
                                          onClick={() => {
                                            setSelectedSlot({
                                              id: slot.id,
                                              time: slot.time,
                                              date: selectedSlot.date || formatISODateToVN(bookingDate),
                                            });
                                            setStep2Errors((prev) => ({ ...prev, slot: undefined }));
                                            setShowSlotModal(false);
                                          }}
                                          className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                                            slot.disabled
                                              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-65'
                                              : isSelected
                                              ? 'border-blue-600 bg-blue-600 text-white shadow-md ring-2 ring-blue-300 cursor-pointer'
                                              : 'border-slate-200 bg-white hover:border-blue-400 text-slate-700 hover:bg-blue-50/40 cursor-pointer'
                                          }`}
                                        >
                                          <span className="text-xs sm:text-sm font-extrabold">{slot.time}</span>
                                          <span
                                            className={`text-[10px] mt-0.5 font-semibold ${
                                              isSelected
                                                ? 'text-blue-100'
                                                : slot.disabled
                                                ? 'text-slate-400'
                                                : 'text-emerald-600'
                                            }`}
                                          >
                                            {slot.label}
                                          </span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              {/* Footer ghi chú - Khống chế tuyệt đối trên 1 hàng */}
                              <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500 shrink-0 whitespace-nowrap">
                                <span className="flex items-center gap-1.5 min-w-0 truncate">
                                  <Info size={13} className="text-blue-600 shrink-0" />
                                  <span className="truncate">Chạm khung giờ để chọn</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowSlotModal(false);
                                    setShowSessionModal(true);
                                  }}
                                  className="text-blue-600 font-bold hover:underline cursor-pointer shrink-0 ml-auto whitespace-nowrap text-[11px]"
                                >
                                  Đổi buổi khác
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    </>
                  ) : filteredDoctors.length > 0 ? (
                    <div className={`py-6 px-4 text-center rounded-2xl border text-xs transition ${
                      step2Errors.doctor 
                        ? 'bg-red-50/80 border-red-300 text-red-800' 
                        : 'bg-blue-50/50 border-blue-200 text-blue-800'
                    }`}>
                      <User size={24} className={`mx-auto mb-1.5 ${step2Errors.doctor ? 'text-red-500' : 'text-blue-500'}`} />
                      <p className="font-bold">{step2Errors.doctor || 'Vui lòng chọn 1 Bác sĩ ở trên để xem lịch khám và chọn khung giờ'}</p>
                    </div>
                  ) : null}

                  {/* Banner báo lỗi tổng quát của Bước 2 khi nhấn Tiếp tục */}
                  {(step2Errors.doctor || step2Errors.date || step2Errors.slot) && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700 font-semibold animate-fadeIn">
                      <AlertCircle size={16} className="shrink-0 text-red-600" />
                      <span>{step2Errors.doctor || step2Errors.date || step2Errors.slot}</span>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="pt-6 border-t border-slate-100 flex items-center justify-between gap-3 mt-auto">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="py-2.5 px-4 sm:px-5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 w-1/2 sm:w-auto shrink-0 shadow-2xs"
                    >
                      <ArrowLeft size={15} />
                      <span>Quay lại</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleContinueStep2}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 sm:px-7 rounded-xl transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm w-1/2 sm:w-auto shrink-0"
                    >
                      <span>Tiếp tục</span>
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* Step 3: Hồ Sơ Bệnh Nhân (Độc lập, căn giữa, ẩn thông tin bác sĩ bên trái để tránh chiếm diện tích) */}
        {step === 3 && (
          <div className="max-w-2xl mx-auto w-full">
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-2xs space-y-6">
              <form onSubmit={handleBook} className="space-y-6">
                  
                  {/* Chọn Người Khám: Bản thân vs Người thân (Chuẩn YouMed - Ảnh 1 Screen 4) */}
                  <div className="space-y-3">
                    <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <Users size={15} className="text-blue-600" />
                      <span>1. Chọn Hồ Sơ Người Đi Khám:</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setBookingFor('self')}
                        className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-center justify-between ${
                          bookingFor === 'self'
                            ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs shrink-0">
                            Tôi
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">
                              {currentUser?.fullName || 'Bản Thân Tôi'}
                            </span>
                            <span className="text-[10px] text-slate-500">{currentUser?.phone || 'Chủ tài khoản'}</span>
                          </div>
                        </div>
                        {bookingFor === 'self' && <CheckCircle2 size={16} className="text-blue-600" />}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setBookingFor('relative');
                          if (!relativeInfo.fullName) {
                            setShowRelativeModal(true);
                          }
                        }}
                        className={`p-3.5 rounded-2xl border-2 text-left transition cursor-pointer flex items-center justify-between ${
                          bookingFor === 'relative'
                            ? 'border-blue-600 bg-blue-50/50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-xs shrink-0">
                            +
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">Người Thân Trong Gia Đình</span>
                            <span className="text-[10px] text-slate-500">
                              {bookingFor === 'relative' && relativeInfo.fullName
                                ? `${relativeInfo.fullName} (${relativeInfo.relationship})`
                                : 'Ba, Mẹ, Con, Vợ/Chồng'}
                            </span>
                          </div>
                        </div>
                        {bookingFor === 'relative' && <CheckCircle2 size={16} className="text-blue-600" />}
                      </button>
                    </div>

                    {/* Nếu chọn Người thân, hiển thị thẻ thu gọn + nút mở popup thông tin */}
                    {bookingFor === 'relative' && (
                      <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-2xl flex items-center justify-between text-xs animate-fadeIn">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-purple-200 text-purple-800 flex items-center justify-center shrink-0 font-bold">
                            <Users size={14} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-purple-950 block text-xs truncate">
                              {relativeInfo.fullName || 'Chưa nhập tên người thân'}
                            </span>
                            <span className="text-[11px] text-purple-700 block truncate">
                              {relativeInfo.relationship} • {relativeInfo.birthYear || '1995'} {relativeInfo.phone ? `• ${relativeInfo.phone}` : ''}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowRelativeModal(true)}
                          className="px-2.5 py-1 text-[11px] font-bold text-purple-700 bg-white border border-purple-300 hover:bg-purple-100 rounded-lg shrink-0 transition cursor-pointer ml-2"
                        >
                          {relativeInfo.fullName ? 'Chỉnh sửa' : 'Nhập thông tin'}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 2. Mô Tả Triệu Chứng & Spring AI */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold text-slate-700 uppercase">
                        2. Mô Tả Triệu Chứng &amp; Lý Do Đi Khám:
                      </label>
                      <button
                        type="button"
                        onClick={handleAnalyzeSymptoms}
                        disabled={analyzingAi || !symptoms.trim()}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-3 py-1.5 rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles size={13} className={analyzingAi ? "animate-spin" : ""} />
                        <span>{analyzingAi ? 'AI Đang Phân Tích...' : 'Trợ Lý AI Phân Tích Gói Khám'}</span>
                      </button>
                    </div>

                    <textarea
                      rows={3}
                      required
                      value={symptoms}
                      onChange={(e) => setSymptoms(e.target.value)}
                      placeholder="Mô tả triệu chứng bệnh, tiền sử dị ứng thuốc hoặc cảm giác khó chịu cần bác sĩ tư vấn..."
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs sm:text-sm text-slate-800"
                    />

                    {/* AI Preview badge - Bấm mở popup xem phân tích chi tiết */}
                    {aiPreview && (
                      <button
                        type="button"
                        onClick={() => setShowAiModal(true)}
                        className="w-full flex items-center justify-between p-2.5 bg-purple-50/80 border border-purple-200 hover:border-purple-400 rounded-xl text-xs text-purple-900 transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-2 min-w-0 text-left">
                          <Sparkles size={14} className="text-purple-600 shrink-0 group-hover:rotate-12 transition" />
                          <span className="font-bold text-purple-900 text-xs truncate">
                            Đã có đề xuất chuyên môn Spring AI: <span className="font-normal text-slate-700">{(aiPreview as any).clinicalSummary || aiPreview.summary}</span>
                          </span>
                        </div>
                        <span className="text-[11px] font-bold text-purple-700 bg-white border border-purple-200 px-2 py-0.5 rounded-lg shrink-0 group-hover:bg-purple-100 transition ml-2">
                          Xem chi tiết
                        </span>
                      </button>
                    )}
                  </div>

                  {/* 3. Tệp Đính Kèm (Thu gọn thành nút bấm mở popup quản lý tệp) */}
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setShowAttachmentModal(true)}
                      className="w-full flex items-center justify-between p-2.5 sm:p-3 bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:bg-blue-50/40 text-xs transition-all cursor-pointer group shadow-2xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 text-left">
                        <div className="w-7 h-7 rounded-lg bg-blue-100/70 text-blue-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
                          <Paperclip size={14} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 whitespace-nowrap">
                            <span className="font-bold text-slate-800 text-xs">
                              Tệp đính kèm
                            </span>
                            <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded-md">
                              {attachments.length}/5
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate">
                            {attachments.length === 0
                              ? 'Đơn thuốc, xét nghiệm cũ'
                              : attachments.map((f) => f.name).join(', ')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg shrink-0 group-hover:bg-blue-100 transition ml-2 whitespace-nowrap">
                        <span>{attachments.length === 0 ? 'Thêm' : 'Quản lý'}</span>
                        <ChevronRight size={13} />
                      </div>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Mã Khuyến Mãi / Voucher Miễn Phí Cọc (Thu gọn thành nút bấm mở popup thông tin) */}
                  <button
                    type="button"
                    onClick={() => setShowVoucherModal(true)}
                    className={`w-full flex items-center justify-between p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border text-xs transition-all cursor-pointer group shadow-2xs ${
                      appliedPromo
                        ? 'bg-emerald-50/70 border-emerald-300 hover:border-emerald-400'
                        : 'bg-amber-50/60 border-amber-200/90 hover:border-amber-400 hover:bg-amber-100/50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 text-left">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-105 transition ${
                          appliedPromo ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white shadow-2xs'
                        }`}
                      >
                        <Gift size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <span className="font-bold text-slate-800 text-xs">
                            Mã ưu đãi
                          </span>
                          {appliedPromo ? (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded-md">
                              -100% cọc
                            </span>
                          ) : (
                            <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded-md">
                              Miễn cọc
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 block truncate">
                          {appliedPromo ? (
                            <span className="text-emerald-700 font-semibold">
                              Mã: <strong className="font-mono text-blue-700">{appliedPromo}</strong>
                            </span>
                          ) : (
                            'Dành cho Giảng viên & Tester'
                          )}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-1 rounded-lg shrink-0 group-hover:bg-amber-200 transition ml-2 whitespace-nowrap">
                      <span>{appliedPromo ? 'Đổi mã' : 'Nhập mã'}</span>
                      <ChevronRight size={13} />
                    </div>
                  </button>

                  {/* Thanh Xác Nhận Tóm Tắt & Nút Đặt Khám (Ảnh 3 Sticky Footer) */}
                  <div className="p-4 bg-gradient-to-br from-blue-50/90 to-indigo-50/70 border border-blue-200 rounded-2xl space-y-3.5 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      {/* Cột trái: Bác sĩ & Thời gian khám */}
                      <div className="space-y-1 shrink-0">
                        <div className="text-slate-700">
                          <span className="text-slate-500">Khám cùng: </span>
                          <strong className="text-slate-900 font-bold">{selectedDoctor?.name}</strong>
                        </div>
                        <div className="text-blue-700 font-bold flex items-center gap-1.5">
                          <Calendar size={13} className="shrink-0" />
                          <span>{selectedSlot.time} (Ngày {selectedSlot.date})</span>
                        </div>
                      </div>

                      {/* Cột phải: Bóc tách rõ ràng Cọc Online 2.000 đ vs Khám tại quầy */}
                      <div className="text-left sm:text-right shrink-0 p-2.5 sm:p-0 bg-white/80 sm:bg-transparent rounded-xl border border-blue-100 sm:border-0">
                        {appliedPromo ? (
                          <div>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] mb-1">
                              <Sparkles size={11} className="shrink-0" />
                              <span>Voucher [{appliedPromo}]: Miễn 100% tiền cọc</span>
                            </div>
                            <div className="flex items-baseline sm:justify-end gap-1.5">
                              <span className="text-slate-600 font-medium text-xs">Tiền cọc giữ chỗ online:</span>
                              <strong className="text-base sm:text-lg text-emerald-600 font-black">0 đ</strong>
                              <span className="line-through text-xs text-slate-400">2.000 đ</span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Tiền khám tại quầy: <strong className="text-slate-800 font-semibold">{Number(selectedDoctor?.fee || 200000).toLocaleString('vi-VN')} đ</strong> (Thanh toán khi đến khám)
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px] mb-1">
                              <ShieldCheck size={11} className="shrink-0 text-blue-600" />
                              <span>Chỉ cọc giữ chỗ online • Viện phí thanh toán tại quầy</span>
                            </div>
                            <div className="flex items-baseline sm:justify-end gap-1.5">
                              <span className="text-slate-600 font-medium text-xs">Tiền cọc giữ chỗ online:</span>
                              <strong className="text-base sm:text-lg text-blue-700 font-black">2.000 đ</strong>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5">
                              Tiền khám tại quầy: <strong className="text-slate-800 font-semibold">{Number(selectedDoctor?.fee || 200000).toLocaleString('vi-VN')} đ</strong> (Thanh toán khi đến khám)
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hint giải thích an tâm cho bệnh nhân */}
                    <div className="p-2.5 bg-blue-100/50 border border-blue-200/80 rounded-xl text-[11px] text-blue-900 flex items-start gap-2 leading-relaxed">
                      <ShieldCheck size={15} className="text-blue-600 shrink-0 mt-0.5" />
                      <span>
                        <strong>Minh bạch chi phí:</strong> Bạn chỉ chuyển khoản <strong>{appliedPromo ? '0 đ' : '2.000 đ'}</strong> để hệ thống khóa giữ khung giờ khám. Tiền khám bệnh <strong>{Number(selectedDoctor?.fee || 200000).toLocaleString('vi-VN')} đ</strong> quý khách sẽ thanh toán trực tiếp tại quầy lễ tân khi đến khám.
                      </span>
                    </div>

                    {result && !isPaidOnline && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center justify-between">
                        <span>Phiếu hẹn <strong>{result.bookingCode}</strong> đang chờ thanh toán cọc để chính thức xác nhận.</span>
                        <button
                          type="button"
                          onClick={() => setShowPaymentModal(true)}
                          className="text-xs font-bold text-amber-900 underline hover:no-underline ml-2 cursor-pointer"
                        >
                          Mở mã QR
                        </button>
                      </div>
                    )}

                    <div className="pt-3 border-t border-blue-200/70 flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => setStep(2)}
                        className="py-2.5 px-4 sm:px-5 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 font-semibold text-xs sm:text-sm transition cursor-pointer flex items-center justify-center gap-1.5 w-1/2 sm:w-auto shrink-0 shadow-2xs"
                      >
                        <ArrowLeft size={15} />
                        <span>Quay lại</span>
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 sm:px-7 rounded-xl transition shadow-md shadow-blue-600/25 flex items-center justify-center gap-1.5 cursor-pointer text-xs sm:text-sm disabled:opacity-50 w-1/2 sm:w-auto shrink-0"
                      >
                        {submitting ? (
                          <>
                            <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                            <span>Đang tạo vé...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={15} className="shrink-0" />
                            <span>
                              {result && !isPaidOnline
                                ? 'Cọc 2.000 đ'
                                : appliedPromo
                                ? 'Cọc 0 đ'
                                : 'Cọc 2.000 đ'}
                            </span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </form>
            </div>
          </div>
        )}

        {/* Step 4: Phiếu Hẹn Khám Điện Tử (Chuẩn E-Ticket YouMed - Ảnh 2 Screen 4) */}
        {step === 4 && result && (
          <div className="mt-6 max-w-2xl mx-auto space-y-6">
            <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 text-white p-4 sm:p-6 rounded-t-3xl relative overflow-hidden shadow-md">
              <div className="flex items-center justify-between gap-2 relative z-10">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <ShieldCheck size={18} className="text-cyan-300 shrink-0" />
                  <span className="font-extrabold tracking-wider text-xs sm:text-sm uppercase whitespace-nowrap">
                    <span className="sm:hidden">MEDSCHED</span>
                    <span className="hidden sm:inline">HỆ THỐNG Y TẾ MEDSCHED</span>
                  </span>
                </div>
                <span className="text-[10px] sm:text-[11px] bg-white/20 px-2.5 py-1 rounded-full font-mono font-bold tracking-wider whitespace-nowrap shrink-0">
                  ĐẶT KHÁM THÀNH CÔNG
                </span>
              </div>
              
              {/* STT Nổi Bật Siêu Lớn (Đảm bảo luôn trên 1 dòng duy nhất) */}
              <div className="mt-4 sm:mt-5 text-center relative z-10 bg-white/10 backdrop-blur-xs py-3.5 sm:py-4 px-2 sm:px-6 rounded-2xl border border-white/20">
                <span className="text-[11px] sm:text-xs text-blue-100 uppercase tracking-widest font-bold block whitespace-nowrap">
                  SỐ THỨ TỰ VÀO KHÁM (STT)
                </span>
                <div className="text-2xl sm:text-4xl md:text-5xl font-black text-white mt-1 tracking-tight drop-shadow-sm whitespace-nowrap overflow-hidden text-ellipsis">
                  STT: {(() => {
                    const qn = String(result.queueNumber || '0003').trim();
                    return qn.startsWith('#') ? qn : `#${qn}`;
                  })()}
                </div>
                <p className="text-xs text-cyan-200 mt-1.5 font-medium whitespace-nowrap">
                  Mã phiếu khám: <strong className="font-mono text-white text-xs sm:text-sm bg-black/20 px-2.5 py-0.5 rounded-md ml-1">{result.bookingCode}</strong>
                </p>
              </div>
            </div>

            {/* Thân Phiếu Khám & QR Code */}
            <div className="bg-white border-2 border-dashed border-slate-200 p-6 rounded-b-3xl -mt-6 pt-8 space-y-5 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-5 border-b border-slate-100">
                <div className="space-y-2.5 text-xs text-slate-700 flex-1">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Bệnh nhân:</span>
                    <strong className="text-slate-900 text-sm font-bold">
                      {bookingFor === 'relative' && relativeInfo.fullName ? relativeInfo.fullName : result.patientName || currentUser?.fullName || 'Bệnh nhân'}
                    </strong>
                    {bookingFor === 'relative' && (
                      <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md font-semibold">
                        {relativeInfo.relationship}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Bác sĩ chuyên khoa:</span>
                    <strong className="text-slate-900 font-semibold">{selectedDoctor?.name || 'Bác sĩ chuyên khoa'}</strong>
                    <span className="text-slate-500 block text-[11px]">{selectedDoctor?.specialty}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">Khung giờ hẹn &amp; Buồng khám:</span>
                    <span className="text-blue-700 font-bold text-sm block">{selectedSlot.time} • Ngày {selectedSlot.date}</span>
                    <span className="text-slate-600 text-[11px] font-medium">{selectedDoctor?.room || 'Phòng P.208'} - {activeCenterObj.name}</span>
                  </div>
                </div>

                {/* QR Code Check-in */}
                <div className="flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0">
                  <div className="w-28 h-28 bg-white border border-slate-300 rounded-xl p-1.5 flex items-center justify-center shadow-inner">
                    <QrCodeImage
                      value={typeof window !== 'undefined' ? `${window.location.origin}/checkin?code=${encodeURIComponent(result.bookingCode)}` : `/checkin?code=${encodeURIComponent(result.bookingCode)}`}
                      size={96}
                      className="rounded-lg"
                    />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 mt-2 bg-slate-200/80 px-2.5 py-0.5 rounded">
                    {result.bookingCode}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium text-center mt-1.5 max-w-[130px] leading-tight">
                    Xuất trình mã này tại quầy tiếp đón
                  </span>
                </div>
              </div>

              {/* Chi tiết thanh toán */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Phí khám:</span>
                  <span className="font-semibold text-slate-800">{Number(selectedDoctor?.fee || 200000).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Phí tiện ích:</span>
                  <span className="font-semibold text-emerald-600">0 đ (Miễn phí)</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-extrabold text-blue-700 text-sm">
                  <span>Tổng viện phí thanh toán:</span>
                  <span>{Number(selectedDoctor?.fee || 200000).toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              {/* Thanh toán VietQR & Voucher */}
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                    <CreditCard size={15} />
                    <span>{isPaidOnline ? 'Xác Nhận Giữ Chỗ & Đặt Cọc:' : 'Thanh Toán Trực Tuyến Qua VietQR & Ví MoMo:'}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    {isPaidOnline
                      ? (paidPromoCode || appliedPromo)
                        ? `✓ Đã áp dụng mã ưu đãi [${paidPromoCode || appliedPromo}]: Miễn 100% tiền cọc (0 đ) - Lịch hẹn đã được xác nhận chính thức!`
                        : '✓ Quý khách đã xác nhận thanh toán thành công.'
                      : 'Hỗ trợ quét mã VietQR chuyển khoản nhanh 24/7 để xác nhận giữ chỗ ưu tiên.'}
                  </p>
                </div>
                {isPaidOnline ? (
                  <span className="inline-flex items-center gap-1 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs whitespace-nowrap">
                    <CheckCircle2 size={14} /> {(paidPromoCode || appliedPromo) ? 'ĐÃ GIỮ CHỖ (0 Đ)' : 'ĐÃ THANH TOÁN'}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <QrCode size={15} />
                    <span>Quét Mã VietQR / Nhập Voucher</span>
                  </button>
                )}
              </div>

              {/* Lời dặn dò y tế nổi bật (Ảnh 2 Screen 4) */}
              <div className="text-xs text-amber-900 bg-amber-50/80 p-3.5 rounded-2xl border border-amber-200 flex items-start gap-2.5">
                <span className="text-base leading-none">🔔</span>
                <span className="text-[11px] leading-relaxed">
                  <strong>Lời dặn dò tiếp đón:</strong> Bệnh nhân vui lòng đến trước giờ khám <strong>15 - 20 phút</strong> và xuất trình mã QR trên vé này hoặc thẻ CCCD tại Quầy Tiếp Đón để được hướng dẫn vào thẳng buồng khám.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-2xl transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  <Printer size={16} />
                  <span>In Phiếu / Lưu PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/appointments')}
                  className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold py-3 rounded-2xl transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Xem Danh Sách Lịch Hẹn</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setStep(1);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl transition text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-blue-600/20"
                >
                  <Calendar size={16} />
                  <span>Đặt Ca Khám Mới</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* Popup Chi Tiết Phòng Khám & Buồng Khám (Mở khi bấm vào ô thu gọn) */}
      {showClinicInfoModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowClinicInfoModal(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-2xl sm:rounded-3xl p-5 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header popup */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Thông Tin Cơ Sở Khám Bệnh
                  </h3>
                  <span className="text-[11px] text-slate-500">Chi tiết địa chỉ, buồng khám &amp; giờ trực</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowClinicInfoModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                aria-label="Đóng popup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Danh sách thông tin chi tiết */}
            <div className="space-y-3 text-xs text-slate-700">
              {/* 1. Cơ sở & Địa chỉ */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex items-start gap-2.5">
                <MapPin size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block text-xs">
                    {activeCenterObj?.name || 'Phòng khám Đa khoa MedSched'}
                  </span>
                  <span className="text-[11px] text-slate-500 leading-relaxed block mt-0.5">
                    {activeCenterObj?.address || 'Hệ thống phòng khám MedSched'}
                  </span>
                </div>
              </div>

              {/* 2. Buồng khám & Bác sĩ */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-2.5">
                <Building2 size={16} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Buồng khám tiếp nhận:</span>
                  <span className="text-xs text-blue-700 font-extrabold bg-blue-100 px-2 py-0.5 rounded-md inline-block mt-1">
                    {selectedDoctor ? (selectedDoctor.room || 'Phòng khám chuyên khoa') : 'Chưa phân bổ buồng khám'}
                  </span>
                  {selectedDoctor?.name && (
                    <span className="text-[11px] text-slate-600 block mt-1">
                      Bác sĩ phụ trách: <strong className="text-slate-800">{selectedDoctor.name}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Giờ làm việc */}
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-start gap-2.5">
                <Clock size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800 block text-xs">Giờ làm việc phòng khám:</span>
                  <span className="text-[11px] text-emerald-800 font-medium block mt-0.5">
                    Thứ 2 - Chủ Nhật (07:30 - 17:30)
                  </span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Hỗ trợ tiếp đón thông minh 1 giây qua mã QR hoặc CCCD
                  </span>
                </div>
              </div>
            </div>

            {/* Nút đóng */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowClinicInfoModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 cursor-pointer text-center"
              >
                Đã hiểu &amp; Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: Chi Tiết Biểu Phí Khám Niêm Yết */}
      {showFeeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowFeeModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  <ReceiptText size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Biểu Phí Khám Niêm Yết</h3>
                  <span className="text-[11px] text-slate-500">Minh bạch 100% • Không phụ thu ẩn</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFeeModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                aria-label="Đóng popup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chi tiết từng khoản phí */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <div>
                  <span className="font-bold text-slate-800 block">Phí khám chuyên gia:</span>
                  <span className="text-[11px] text-slate-500">
                    {selectedDoctor ? `${selectedDoctor.title || 'Bác sĩ'} ${selectedDoctor.name}` : 'Bác sĩ chuyên khoa'}
                  </span>
                </div>
                <span className="font-bold text-slate-800 text-sm">
                  {selectedDoctor ? `${Number(selectedDoctor.fee).toLocaleString('vi-VN')} đ` : '-- đ'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                <div>
                  <span className="font-bold text-emerald-900 block">Phí tiện ích MedSched:</span>
                  <span className="text-[11px] text-emerald-700">Tiếp đón thông minh QR &amp; hồ sơ số hóa</span>
                </div>
                <span className="font-bold text-emerald-700">0 đ (Miễn phí)</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                <div>
                  <span className="font-bold text-blue-900 block">Phí giữ chỗ ưu tiên STT:</span>
                  <span className="text-[11px] text-blue-700">Khóa số thứ tự trực tiếp theo khung giờ</span>
                </div>
                <span className="font-bold text-blue-700">0 đ (Miễn phí)</span>
              </div>

              {appliedPromo && (
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-200">
                  <div>
                    <span className="font-bold text-amber-900 block">Mã ưu đãi ({appliedPromo}):</span>
                    <span className="text-[11px] text-amber-700">Miễn cọc cho Giảng viên / Tester</span>
                  </div>
                  <span className="font-bold text-amber-700">-100% Cọc</span>
                </div>
              )}

              {/* Phân định rõ ràng: Tiền cọc online vs Tiền khám tại quầy */}
              <div className="p-3 bg-blue-50/80 rounded-xl border border-blue-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-blue-900 block">1. Tiền cọc giữ chỗ online (Thanh toán ngay):</span>
                    <span className="text-[10px] text-blue-700">Khóa số thứ tự &amp; bảo lưu khung giờ khám</span>
                  </div>
                  <strong className="text-sm font-extrabold text-blue-700">
                    {appliedPromo ? '0 đ (Đã áp voucher)' : '2.000 đ'}
                  </strong>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-blue-200/60">
                  <div>
                    <span className="font-bold text-slate-800 block">2. Viện phí thanh toán tại quầy (Khi đến khám):</span>
                    <span className="text-[10px] text-slate-500">Thanh toán tại quầy tiếp đón phòng khám</span>
                  </div>
                  <strong className="text-sm font-bold text-slate-800">
                    {selectedDoctor ? `${Number(selectedDoctor.fee).toLocaleString('vi-VN')} đ` : '-- đ'}
                  </strong>
                </div>
              </div>

              {/* Tổng cộng */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl border border-blue-200 flex items-center justify-between">
                <div>
                  <span className="text-xs text-blue-900 font-bold block">Tổng viện phí niêm yết:</span>
                  <span className="text-[10px] text-blue-600">Minh bạch theo bảng giá Bộ Y Tế</span>
                </div>
                <span className="text-base sm:text-lg font-extrabold text-blue-700">
                  {selectedDoctor ? `${Number(selectedDoctor.fee).toLocaleString('vi-VN')} đ` : '-- đ'}
                </span>
              </div>
            </div>

            {/* Quyền lợi & Chính sách */}
            <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/60 text-[11px] text-slate-600 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <ShieldCheck size={14} className="text-blue-600" />
                <span>Cam kết dịch vụ MedSched</span>
              </div>
              <p>• Giá khám đã bao gồm công khám bệnh, tư vấn đơn thuốc và hướng dẫn điều trị.</p>
              <p>• Miễn phí đổi hoặc dời lịch khám trước giờ hẹn 2 tiếng.</p>
              <p>• Hỗ trợ xuất hóa đơn điện tử VAT ngay tại quầy thu ngân bệnh viện.</p>
            </div>

            {/* Nút đóng */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowFeeModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 cursor-pointer text-center"
              >
                Đã hiểu &amp; Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: Thông Tin Người Thân Khám Hộ */}
      {showRelativeModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowRelativeModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Users size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Thông Tin Người Thân Đi Khám</h3>
                  <span className="text-[11px] text-slate-500">Đặt lịch khám hộ cho gia đình</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRelativeModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                aria-label="Đóng popup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form Fields */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Họ và tên người khám <span className="text-rose-500">*</span>:
                </label>
                <input
                  type="text"
                  required
                  value={relativeInfo.fullName}
                  onChange={(e) => setRelativeInfo({ ...relativeInfo, fullName: e.target.value })}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Mối quan hệ:
                  </label>
                  <select
                    value={relativeInfo.relationship}
                    onChange={(e) => setRelativeInfo({ ...relativeInfo, relationship: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Ba / Mẹ">Ba / Mẹ</option>
                    <option value="Con cái">Con cái</option>
                    <option value="Vợ / Chồng">Vợ / Chồng</option>
                    <option value="Anh / Chị / Em">Anh / Chị / Em</option>
                    <option value="Ông / Bà">Ông / Bà</option>
                    <option value="Người thân khác">Người thân khác</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Giới tính:
                  </label>
                  <select
                    value={relativeInfo.gender}
                    onChange={(e) => setRelativeInfo({ ...relativeInfo, gender: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="NAM">Nam</option>
                    <option value="NU">Nữ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Năm sinh:
                  </label>
                  <input
                    type="number"
                    value={relativeInfo.birthYear}
                    onChange={(e) => setRelativeInfo({ ...relativeInfo, birthYear: e.target.value })}
                    placeholder="1995"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Số điện thoại liên hệ:
                  </label>
                  <input
                    type="tel"
                    value={relativeInfo.phone}
                    onChange={(e) => setRelativeInfo({ ...relativeInfo, phone: e.target.value })}
                    placeholder="0901234567"
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
            </div>

            {/* Lưu & Đóng */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setBookingFor('relative');
                  setShowRelativeModal(false);
                }}
                className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-purple-600/20 cursor-pointer text-center"
              >
                Lưu &amp; Áp Dụng Thông Tin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: Đề Xuất Chuyên Môn Spring AI */}
      {showAiModal && aiPreview && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowAiModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Trợ Lý AI Phân Tích Gói Khám</h3>
                  <span className="text-[11px] text-purple-600 font-semibold">Công nghệ Spring AI Y Khoa</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                aria-label="Đóng popup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nội dung tư vấn */}
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="font-bold text-slate-700 block mb-1">Triệu chứng bạn đã nhập:</span>
                <p className="text-slate-600 italic">"{symptoms}"</p>
              </div>

              <div className="p-3.5 bg-purple-50/70 rounded-2xl border border-purple-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-purple-600" />
                    Đề Xuất Lâm Sàng &amp; Hướng Dẫn:
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                    Đã Tối Ưu
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {(aiPreview as any).clinicalSummary || aiPreview.summary}
                </p>
              </div>

              {(aiPreview as any).recommendedDepartment && (
                <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                  <span className="font-bold text-blue-900 block text-xs">Chuyên khoa khuyến nghị:</span>
                  <span className="text-xs text-blue-700 font-bold block mt-0.5">
                    {(aiPreview as any).recommendedDepartment}
                  </span>
                </div>
              )}

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-800">
                <p>⚠️ <em>Khuyến cáo: Kết quả phân tích từ AI chỉ mang tính chất tham khảo hỗ trợ định hướng trước khám, không thay thế chẩn đoán y khoa chính thức của bác sĩ.</em></p>
              </div>
            </div>

            {/* Nút đóng */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowAiModal(false)}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-purple-600/20 cursor-pointer text-center"
              >
                Đã hiểu &amp; Áp dụng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: Quản Lý Tệp Đính Kèm Hồ Sơ (0/5) */}
      {showAttachmentModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowAttachmentModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <Paperclip size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Quản Lý Tệp Đính Kèm Hồ Sơ</h3>
                  <span className="text-[11px] text-slate-500">Tối đa 5 tệp ({attachments.length}/5 đã tải)</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                aria-label="Đóng popup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Nút Upload */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachments.length >= 5}
                className="w-full py-3 px-4 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-2xl text-xs font-bold text-blue-700 bg-blue-50/50 hover:bg-blue-100/50 transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <FileText size={16} className="text-blue-600" />
                <span>+ Tải lên tệp hồ sơ (PNG, JPG, PDF)</span>
              </button>

              {/* Danh sách tệp đã tải */}
              {attachments.length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-200/60 text-xs">
                  <Paperclip size={28} className="mx-auto mb-2 text-slate-300" />
                  <p className="font-medium text-slate-600">Chưa có tệp đính kèm nào</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tải lên kết quả xét nghiệm, đơn thuốc cũ hoặc ảnh X-Quang giúp bác sĩ nắm rõ tiền sử bệnh.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Danh sách tệp đã tải ({attachments.length}/5):</span>
                  {attachments.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        <FileText size={16} className="text-blue-600 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-slate-800 block truncate">{file.name}</span>
                          <span className="text-[10px] text-slate-400 block">{file.size}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(idx)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Xóa tệp"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note & Nút đóng */}
            <div className="pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAttachmentModal(false)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 cursor-pointer text-center"
              >
                Xong &amp; Lưu Tệp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Popup: Mã Ưu Đãi / Voucher Miễn Tiền Cọc */}
      {showVoucherModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowVoucherModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold shadow-xs">
                  <Gift size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm sm:text-base">Mã Ưu Đãi / Voucher Miễn Cọc</h3>
                  <span className="text-[11px] text-amber-700 font-medium">Hỗ trợ Giảng viên &amp; Tester kiểm thử</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVoucherModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                aria-label="Đóng popup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Trạng thái áp dụng */}
            {appliedPromo ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-900 block">
                      Đang áp dụng mã: <strong className="font-mono text-blue-700 text-sm">{appliedPromo}</strong>
                    </span>
                    <p className="text-[11px] text-emerald-700 mt-0.5">
                      ✓ Đã miễn 100% tiền đặt cọc giữ chỗ (0 đ). Phiếu khám được xuất trực tiếp khi bấm Xác nhận.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      handleRemovePromo();
                      setPromoInput('');
                    }}
                    className="flex-1 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold cursor-pointer transition border border-rose-200 text-center"
                  >
                    Hủy mã này
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowVoucherModal(false)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer transition shadow-xs text-center"
                  >
                    Tiếp tục sử dụng
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700">Nhập mã ưu đãi của bạn:</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => {
                        setPromoInput(e.target.value);
                        if (promoError) setPromoError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyPromo();
                        }
                      }}
                      placeholder="Nhập GIAOVIEN hoặc MEDFREE..."
                      className="flex-1 bg-slate-50 border border-slate-200 focus:bg-white focus:border-amber-500 rounded-xl px-3 py-2.5 text-xs font-medium uppercase placeholder:normal-case placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        handleApplyPromo();
                      }}
                      className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
                    >
                      Áp Dụng
                    </button>
                  </div>
                  {promoError && (
                    <p className="text-[11px] text-rose-600 font-medium">{promoError}</p>
                  )}
                </div>

                {/* Phím tắt chọn nhanh mã kiểm thử */}
                <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-2xl space-y-2">
                  <span className="text-[11px] font-bold text-amber-900 block">
                    ⚡ Chọn nhanh mã kiểm thử hệ thống:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPromoInput('GIAOVIEN');
                        setAppliedPromo('GIAOVIEN');
                        setPromoError(null);
                      }}
                      className="p-2.5 bg-white border border-amber-300 hover:border-amber-500 rounded-xl text-left transition cursor-pointer hover:shadow-xs group"
                    >
                      <span className="font-mono font-bold text-blue-700 text-xs block group-hover:text-blue-800">GIAOVIEN</span>
                      <span className="text-[10px] text-slate-500 block">Dành cho Thầy/Cô chấm thi (0đ cọc)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPromoInput('MEDFREE');
                        setAppliedPromo('MEDFREE');
                        setPromoError(null);
                      }}
                      className="p-2.5 bg-white border border-amber-300 hover:border-amber-500 rounded-xl text-left transition cursor-pointer hover:shadow-xs group"
                    >
                      <span className="font-mono font-bold text-emerald-700 text-xs block group-hover:text-emerald-800">MEDFREE</span>
                      <span className="text-[10px] text-slate-500 block">Miễn 100% tiền cọc kiểm thử</span>
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowVoucherModal(false)}
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer text-center"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Popup: Thông Tin Chuyên Môn Bác Sĩ (Chuyên khoa, Học vị, Năm kinh nghiệm, Đơn vị đào tạo, Thế mạnh lâm sàng) */}
      {showDoctorModal && doctorModalData && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowDoctorModal(false)}
        >
          <div
            className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto relative animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng góc phải */}
            <button
              type="button"
              onClick={() => setShowDoctorModal(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-slate-100 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer shadow-xs border border-slate-200/80"
              aria-label="Đóng popup"
            >
              <X size={16} />
            </button>

            {/* Doctor Profile Banner */}
            <div className="p-3.5 pr-12 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 rounded-2xl border border-blue-200/80 flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-extrabold text-xl shadow-md shrink-0">
                {getDoctorInitials(doctorModalData.name)}
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-md inline-block uppercase tracking-wider">
                  {doctorModalData.academicTitle || 'Bác sĩ chuyên khoa'}
                </span>
                <h4 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight mt-1 truncate">
                  {doctorModalData.name}
                </h4>
                <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1 font-semibold truncate">
                  <Stethoscope size={13} className="text-blue-600 shrink-0" />
                  <span>{doctorModalData.specialtyDisplay}</span>
                </div>
              </div>
            </div>

            {/* Stats Row: 3 Chỉ số nổi bật */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80">
                <span className="text-[10px] text-slate-500 block font-medium">Kinh nghiệm</span>
                <span className="text-xs sm:text-sm font-extrabold text-blue-700 block mt-0.5">
                  {doctorModalData.experience}
                </span>
              </div>
              <div className="p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-100">
                <span className="text-[10px] text-emerald-700 block font-medium">Buồng khám</span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-700 block mt-0.5 truncate">
                  {doctorModalData.room ? (doctorModalData.room.startsWith('P.') ? doctorModalData.room : `P.${doctorModalData.room}`) : 'P.102'}
                </span>
              </div>
              <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100">
                <span className="text-[10px] text-amber-800 block font-medium">Giá niêm yết</span>
                <span className="text-xs sm:text-sm font-extrabold text-amber-700 block mt-0.5">
                  {Number(doctorModalData.fee).toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            {/* Thông tin chi tiết */}
            <div className="space-y-2.5 text-xs">
              {/* Học vị & Đào tạo */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px] uppercase tracking-wider">
                  <GraduationCap size={14} className="text-blue-600" />
                  <span>Học Vị &amp; Trình Độ Chuyên Môn</span>
                </div>
                <p className="text-slate-700 font-semibold">{doctorModalData.degreeFull}</p>
                <p className="text-[11px] text-slate-500">
                  Tốt nghiệp chính quy Đại học Y Dược, có chứng chỉ hành nghề y khoa quốc gia và đào tạo liên tục chuyên ngành.
                </p>
              </div>

              {/* Thế mạnh lâm sàng & Lĩnh vực điều trị */}
              <div className="p-3 bg-purple-50/60 rounded-xl border border-purple-100 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-purple-900 text-[11px] uppercase tracking-wider">
                  <Award size={14} className="text-purple-600" />
                  <span>Thế Mạnh Lâm Sàng &amp; Dịch Vụ Khám</span>
                </div>
                <p className="text-slate-700 leading-relaxed text-[11px]">
                  {doctorModalData.strengths}
                </p>
              </div>

              {/* Đơn vị công tác & Buồng khám */}
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px] uppercase tracking-wider">
                  <Building2 size={14} className="text-blue-600" />
                  <span>Cơ Sở &amp; Buồng Khám Phụ Trách</span>
                </div>
                <p className="text-slate-800 font-semibold">{doctorModalData.centerDisplay}</p>
                <p className="text-[11px] text-slate-600">
                  {doctorModalData.roomDisplay} • Lịch trực: {doctorModalData.workHours}
                </p>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedDoctor(doctorModalData);
                  setShowDoctorModal(false);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 cursor-pointer text-center flex items-center justify-center gap-2"
              >
                {selectedDoctor?.id === doctorModalData.id ? (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Đang Chọn Bác Sĩ Này (Đóng)</span>
                  </>
                ) : (
                  <>
                    <Check size={15} />
                    <span>Chọn Bác Sĩ Này &amp; Đóng</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thông Tin Chi Tiết Chuyên Khoa */}
      {showSpecialtyModal && selectedSpecialtyModalData && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setShowSpecialtyModal(false)}
        >
          <div 
            className="bg-white w-full max-w-md rounded-3xl p-5 sm:p-6 shadow-2xl border border-slate-100 space-y-4 animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <Stethoscope size={20} />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block">
                    Thông Tin Chuyên Khoa
                  </span>
                  <h3 className="font-extrabold text-slate-800 text-base">
                    {selectedSpecialtyModalData.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSpecialtyModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/70">
                <span className="font-bold text-slate-700 block mb-1">Mô tả chuyên môn &amp; phạm vi khám:</span>
                <p className="leading-relaxed text-slate-600">
                  {selectedSpecialtyModalData.description || 
                    `Tiếp nhận thăm khám, chẩn đoán, tư vấn phác đồ điều trị và chăm sóc chuyên sâu thuộc ${selectedSpecialtyModalData.name} theo tiêu chuẩn y khoa MedSched.`}
                </p>
              </div>

              {/* Danh sách bác sĩ thuộc khoa này tại chi nhánh */}
              <div>
                <span className="font-bold text-slate-700 block mb-2">
                  Bác sĩ phụ trách ({doctors.filter((d: any) => (!selectedCenter || !d.centerId || d.centerId === selectedCenter) && d.specialtyId === selectedSpecialtyModalData.id).length}):
                </span>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {doctors
                    .filter((d: any) => (!selectedCenter || !d.centerId || d.centerId === selectedCenter) && d.specialtyId === selectedSpecialtyModalData.id)
                    .map((doc: any) => (
                      <div key={doc.id} className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            {getDoctorInitials(doc.name)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 block">{doc.name}</span>
                            <span className="text-[10px] text-slate-500">{doc.title || doc.specialty} • {doc.room}</span>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-blue-700">{Number(doc.fee).toLocaleString('vi-VN')} đ</span>
                      </div>
                    ))}
                  {doctors.filter((d: any) => (!selectedCenter || !d.centerId || d.centerId === selectedCenter) && d.specialtyId === selectedSpecialtyModalData.id).length === 0 && (
                    <p className="text-xs text-slate-400 italic text-center py-2">Chưa có bác sĩ trực tại chi nhánh đã chọn</p>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSpecialtyModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedSpecialty(selectedSpecialtyModalData.id);
                  setStep1Errors((prev) => ({ ...prev, specialty: undefined }));
                  setShowSpecialtyModal(false);
                }}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Check size={14} />
                <span>Chọn chuyên khoa này</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Tab Lock Overlay */}
      <SingleTabLockOverlay
        isBlocked={isBlocked}
        moduleName="Cổng Đặt Lịch Khám Trực Tuyến"
        onTakeOver={handleTakeOver}
        description="Để tránh xung đột khóa giữ chỗ (Optimistic Slot Locking) và ngăn ngừa đặt trùng lịch hẹn, hệ thống chỉ cho phép bạn thao tác trên 1 tab duy nhất."
      />

      {/* VietQR Payment Modal */}
      {result && (
        <VietQrModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirmSuccess={(info) => {
            setIsPaidOnline(true);
            if (info?.promoCode) {
              setPaidPromoCode(info.promoCode);
            }
            setShowPaymentModal(false);
            setStep(4); // CHỈ CHUYỂN SANG BƯỚC 4 KHI THANH TOÁN THÀNH CÔNG!
          }}
          amount={Number(selectedDoctor?.fee) || 200000}
          appointmentId={result.id}
          bookingCode={result.bookingCode}
          patientName={result.patientName || 'Bệnh nhân'}
          description={`Thanh toán tiền khám bệnh phiếu ${result.bookingCode}`}
          initialPromoCode={appliedPromo || undefined}
        />
      )}
    </div>
  );
}
