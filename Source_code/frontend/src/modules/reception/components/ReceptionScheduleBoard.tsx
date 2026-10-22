'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Calendar, 
  Clock, 
  Search, 
  Stethoscope, 
  DoorOpen, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Filter, 
  Zap, 
  RefreshCw, 
  Building2, 
  Sun, 
  Sunset, 
  Info,
  CalendarDays,
  UserCheck,
  Lock,
  Tag,
  Sparkles,
  Phone,
  PhoneCall,
  Printer,
  Copy,
  Check,
  X,
  FileText,
  Mail
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import { formatDoctorFullName } from '@/shared/lib/formatters';
import { getClinicScheduleConfig } from '@/shared/lib/scheduleConfig';

interface ReceptionScheduleBoardProps {
  onSelectSlotForWalkin?: (doctor: any, slot: any, date: string) => void;
  specialties?: any[];
  doctors?: any[];
}

export default function ReceptionScheduleBoard({
  onSelectSlotForWalkin,
  specialties = [],
  doctors = []
}: ReceptionScheduleBoardProps) {
  const getTodayISODate = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
  };

  const getTomorrowISODate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  };

  // Logic hệ thống thông minh: Sau 17:00, tất cả ca khám hôm nay đã kết thúc!
  // Hệ thống tự động ưu tiên chọn NGÀY MAI để Lễ tân tư vấn và tiếp nhận bệnh nhân.
  const getSmartInitialDate = () => {
    const now = new Date();
    if (now.getHours() >= 17) {
      return getTomorrowISODate();
    }
    return getTodayISODate();
  };

  const [selectedDate, setSelectedDate] = useState<string>(getSmartInitialDate);
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterAvailability, setFilterAvailability] = useState<'ALL' | 'ONLY_AVAILABLE'>('ALL');

  const [loading, setLoading] = useState<boolean>(true);
  const [syncingTomorrow, setSyncingTomorrow] = useState<boolean>(false);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [doctorSlotsMap, setDoctorSlotsMap] = useState<Record<string, any[]>>({});

  const isToday = selectedDate === getTodayISODate();
  const isTomorrow = selectedDate === getTomorrowISODate();
  const isAfter17h = new Date().getHours() >= 17;

  const formatDisplayDateVN = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const handleShiftDate = (offset: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + offset);
    const day = String(current.getDate()).padStart(2, '0');
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const year = current.getFullYear();
    setSelectedDate(`${year}-${month}-${day}`);
  };

  // Kích hoạt thủ công tác vụ đồng bộ lịch 7 ngày tới (1 tuần)
  const handleSyncTomorrowSchedule = async () => {
    try {
      setSyncingTomorrow(true);
      setSyncSuccessMsg(null);
      const res = await api.triggerAutoScheduleWeek();
      setSelectedDate(getTomorrowISODate());
      await loadSlotsForAllDoctors();
      setSyncSuccessMsg(res?.message || 'Đã đồng bộ lịch trực 7 ngày tới (1 tuần) cho toàn bộ bác sĩ thành công!');
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    } catch (e: any) {
      console.warn('Lỗi kích hoạt auto schedule 7 ngày:', e);
      setSyncSuccessMsg('Đã yêu cầu làm mới dữ liệu ca trực.');
      setTimeout(() => setSyncSuccessMsg(null), 4000);
    } finally {
      setSyncingTomorrow(false);
    }
  };

  // Modal Đặt Lịch Khám Nhanh Qua Điện Thoại & Tiếp Nhận
  const [quickBookingModal, setQuickBookingModal] = useState<{
    doctor: any;
    slot: any;
    date: string;
  } | null>(null);

  const [bookingFullName, setBookingFullName] = useState<string>('');
  const [bookingPhone, setBookingPhone] = useState<string>('');
  const [bookingEmail, setBookingEmail] = useState<string>('');
  const [bookingSymptoms, setBookingSymptoms] = useState<string>('');
  const [bookingType, setBookingType] = useState<'PHONE' | 'WALKIN'>('PHONE');
  const [bookingSubmitting, setBookingSubmitting] = useState<boolean>(false);
  const [bookingError, setBookingError] = useState<string | null>(null);

  // Modal Báo Đặt Lịch Thành Công & Phiếu Khám
  const [bookingSuccessData, setBookingSuccessData] = useState<{
    appointmentId: string;
    bookingCode: string;
    queueNumber: string;
    patientName: string;
    phone: string;
    email?: string;
    doctorName: string;
    roomNumber: string;
    specialtyName: string;
    appointmentDate: string;
    slotTime: string;
    symptoms: string;
    bookingType: 'PHONE' | 'WALKIN';
    message: string;
  } | null>(null);

  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedSms, setCopiedSms] = useState<boolean>(false);

  const handleSlotClick = (doc: any, slot: any) => {
    setQuickBookingModal({
      doctor: doc,
      slot: slot,
      date: selectedDate,
    });
    setBookingFullName('');
    setBookingPhone('');
    setBookingEmail('');
    setBookingSymptoms('');
    setBookingType('PHONE');
    setBookingError(null);
  };

  // Ràng buộc và kiểm tra từng ký tự hiển thị trực quan theo thời gian thực (CLAB-118)
  const phoneValidation = useMemo(() => {
    const p = bookingPhone.trim();
    if (!p) return { isValid: false, message: 'Bắt buộc nhập số điện thoại người bệnh' };
    for (let i = 0; i < p.length; i++) {
      if (!/[0-9]/.test(p[i])) {
        return { isValid: false, message: `Ký tự '${p[i]}' tại vị trí ${i + 1} không hợp lệ. Chỉ được nhập số 0-9.` };
      }
    }
    if (p.length < 10) {
      return { isValid: false, message: `Số điện thoại còn thiếu (${p.length}/10 số). Vui lòng nhập đủ 10 chữ số.` };
    }
    if (p.length > 10) {
      return { isValid: false, message: `Số điện thoại vượt quá 10 chữ số (${p.length}/10 số).` };
    }
    if (!/^(0[3|5|7|8|9])/.test(p)) {
      return { isValid: false, message: `Đầu số '${p.slice(0, 2)}' không hợp lệ (phải bắt đầu bằng 03, 05, 07, 08 hoặc 09).` };
    }
    return { isValid: true, message: 'Số điện thoại hợp lệ (10 số)' };
  }, [bookingPhone]);

  const nameValidation = useMemo(() => {
    const n = bookingFullName.trim();
    if (!n) return { isValid: false, message: 'Bắt buộc nhập họ và tên người bệnh' };
    if (n.length < 2) return { isValid: false, message: `Họ và tên quá ngắn (${n.length}/2 ký tự tối thiểu).` };
    if (n.length > 100) return { isValid: false, message: `Họ và tên quá dài (${n.length}/100 ký tự tối đa).` };
    for (let i = 0; i < n.length; i++) {
      const c = n[i];
      if (/[0-9]/.test(c)) {
        return { isValid: false, message: `Họ tên không được chứa chữ số ('${c}' tại vị trí ${i + 1}).` };
      }
      if (!/^[\p{L}\s]$/u.test(c)) {
        return { isValid: false, message: `Ký tự đặc biệt '${c}' tại vị trí ${i + 1} không được phép. Chỉ dùng chữ cái tiếng Việt.` };
      }
    }
    return { isValid: true, message: 'Họ và tên hợp lệ' };
  }, [bookingFullName]);

  const emailValidation = useMemo(() => {
    const e = bookingEmail.trim();
    if (!e) return { isValid: true, message: 'Tùy chọn (nhận thông báo lịch khám qua Gmail)' };
    if (e.length > 255) return { isValid: false, message: 'Email không được vượt quá 255 ký tự.' };
    for (let i = 0; i < e.length; i++) {
      const c = e[i];
      if (/\s/.test(c)) return { isValid: false, message: 'Email không được chứa khoảng trắng.' };
      if (/[<>'";()\\{}]/.test(c)) return { isValid: false, message: `Ký tự '${c}' tại vị trí ${i + 1} không được phép trong email.` };
    }
    if (e.includes('..')) return { isValid: false, message: 'Email không được có hai dấu chấm liên tiếp (..).' };
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,63}$/.test(e)) {
      return { isValid: false, message: 'Định dạng email chưa đúng (VD: nguyenvana@gmail.com).' };
    }
    return { isValid: true, message: 'Gmail/Email hợp lệ' };
  }, [bookingEmail]);

  const symptomsValidation = useMemo(() => {
    const s = bookingSymptoms.trim();
    if (!s) return { isValid: true, message: 'Tối đa 500 ký tự' };
    if (s.length > 500) return { isValid: false, message: `Triệu chứng quá dài (${s.length}/500 ký tự).` };
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (/[<>'`\\{}]/.test(c)) {
        return { isValid: false, message: `Ký tự '${c}' tại vị trí ${i + 1} không an toàn. Vui lòng xóa đi.` };
      }
    }
    return { isValid: true, message: `${s.length}/500 ký tự` };
  }, [bookingSymptoms]);

  const handleConfirmQuickBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickBookingModal) return;

    if (!phoneValidation.isValid) {
      setBookingError(`Lỗi số điện thoại: ${phoneValidation.message}`);
      return;
    }
    if (!nameValidation.isValid) {
      setBookingError(`Lỗi họ và tên: ${nameValidation.message}`);
      return;
    }
    if (!emailValidation.isValid) {
      setBookingError(`Lỗi Gmail/Email: ${emailValidation.message}`);
      return;
    }
    if (!symptomsValidation.isValid) {
      setBookingError(`Lỗi triệu chứng: ${symptomsValidation.message}`);
      return;
    }

    const cleanPhone = bookingPhone.trim();
    const cleanName = bookingFullName.trim();

    try {
      setBookingSubmitting(true);
      setBookingError(null);

      const res = await api.quickBookAppointment({
        fullName: cleanName,
        phone: cleanPhone,
        email: bookingEmail.trim() || undefined,
        symptoms: bookingSymptoms.trim(),
        doctorId: quickBookingModal.doctor.id,
        slotId: quickBookingModal.slot.id,
        slotTime: quickBookingModal.slot.time,
        appointmentDate: quickBookingModal.date,
        specialty: quickBookingModal.doctor.specialtyName,
        bookingType: bookingType,
      });

      // 1. Cập nhật ngay slot đó thành đã đặt (BOOKED) trên Bảng điều phối
      setDoctorSlotsMap((prev) => {
        const docId = quickBookingModal.doctor.id;
        const currentSlots = prev[docId] || [];
        const updated = currentSlots.map((s) => {
          if (s.id === quickBookingModal.slot.id || s.time === quickBookingModal.slot.time) {
            return {
              ...s,
              status: 'booked',
              disabled: true,
            };
          }
          return s;
        });
        return {
          ...prev,
          [docId]: updated,
        };
      });

      // 2. Phát BroadcastChannel để buồng khám Bác sĩ và Live Feed cập nhật tức thì
      try {
        const syncChannel = new BroadcastChannel('medsched_queue_sync');
        syncChannel.postMessage({ type: 'QUEUE_UPDATED', doctorId: quickBookingModal.doctor.id });
        syncChannel.close();
      } catch {}

      // 3. Mở Modal thông báo thành công
      setBookingSuccessData({
        appointmentId: res.appointmentId,
        bookingCode: res.bookingCode,
        queueNumber: res.queueNumber,
        patientName: res.patientName || cleanName,
        phone: res.phone || cleanPhone,
        email: res.email || bookingEmail.trim(),
        doctorName: res.doctorName || quickBookingModal.doctor.fullName,
        roomNumber: res.roomNumber || quickBookingModal.doctor.roomNumber,
        specialtyName: res.specialtyName || quickBookingModal.doctor.specialtyName,
        appointmentDate: res.appointmentDate || quickBookingModal.date,
        slotTime: res.slotTime || quickBookingModal.slot.time,
        symptoms: res.symptoms || bookingSymptoms.trim(),
        bookingType: bookingType,
        message: res.message,
      });

      // Đóng modal nhập liệu
      setQuickBookingModal(null);
    } catch (err: any) {
      setBookingError(err?.message || 'Có lỗi khi đặt lịch khám. Vui lòng kiểm tra lại.');
    } finally {
      setBookingSubmitting(false);
    }
  };

  const handleCopyBookingCode = () => {
    if (!bookingSuccessData) return;
    navigator.clipboard.writeText(bookingSuccessData.bookingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleCopySmsMessage = () => {
    if (!bookingSuccessData) return;
    const msg = `[MEDSCHED] Xác nhận lịch khám:\n- Mã hẹn: ${bookingSuccessData.bookingCode}\n- Bệnh nhân: ${bookingSuccessData.patientName}\n- Bác sĩ: ${bookingSuccessData.doctorName} (${bookingSuccessData.roomNumber})\n- Thời gian: ${bookingSuccessData.slotTime}, ngày ${formatDisplayDateVN(bookingSuccessData.appointmentDate)}\n- Triệu chứng: ${bookingSuccessData.symptoms || 'Khám tổng quát'}\nQuý khách vui lòng có mặt trước 10 phút. Hotline hỗ trợ: 1900 8888.`;
    navigator.clipboard.writeText(msg);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2500);
  };

  // Tải danh sách slots cho tất cả bác sĩ trong ngày đang chọn
  const loadSlotsForAllDoctors = useCallback(async () => {
    if (!doctors || doctors.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const slotsMap: Record<string, any[]> = {};

    try {
      // Gọi song song danh sách slot của các bác sĩ
      const promises = doctors.map(async (doc) => {
        try {
          const slots = await api.getDoctorAvailableSlots(doc.id, selectedDate);
          if (Array.isArray(slots)) {
            slotsMap[doc.id] = slots;
          } else {
            slotsMap[doc.id] = [];
          }
        } catch {
          slotsMap[doc.id] = [];
        }
      });

      await Promise.all(promises);
      setDoctorSlotsMap(slotsMap);
    } catch (e) {
      console.warn('Lỗi khi tải danh sách slots toàn viện:', e);
    } finally {
      setLoading(false);
    }
  }, [doctors, selectedDate]);

  useEffect(() => {
    loadSlotsForAllDoctors();
  }, [loadSlotsForAllDoctors]);

  // Kiểm tra thời gian slot còn cách hiện tại bao nhiêu phút (Quy tắc đệm an toàn vãng lai - A3)
  const getSlotTimingInfo = useCallback((timeStr: string) => {
    if (!isToday) {
      return { isPast: false, isUrgentTooClose: false, minutesDiff: 999 };
    }

    const clinicCfg = typeof window !== 'undefined' ? getClinicScheduleConfig() : null;
    const minBuffer = clinicCfg?.walkinMinBufferMinutes ?? 15;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Giả sử timeStr là "08:00 - 08:30"
    const startPart = timeStr.split('-')[0]?.trim() || '';
    const [startH, startM] = startPart.split(':').map(Number);
    const slotStartMinutes = (startH || 0) * 60 + (startM || 0);

    const minutesDiff = slotStartMinutes - currentMinutes;

    if (minutesDiff <= 0) {
      return { isPast: true, isUrgentTooClose: false, minutesDiff };
    } else if (minutesDiff < minBuffer) {
      // Dưới ngưỡng đệm an toàn: Quá sát giờ tiếp đón, không đủ thời gian chuẩn bị hồ sơ
      return { isPast: false, isUrgentTooClose: true, minutesDiff };
    } else {
      // Đủ điều kiện tiếp nhận (>= minBuffer)
      return { isPast: false, isUrgentTooClose: false, minutesDiff };
    }
  }, [isToday]);

  // Lọc danh sách bác sĩ theo chuyên khoa, tên, phòng khám
  const filteredDoctors = useMemo(() => {
    return doctors.filter((doc) => {
      // Lọc chuyên khoa
      if (selectedSpecialtyId !== 'ALL' && doc.specialtyId !== selectedSpecialtyId && doc.specialtyName !== selectedSpecialtyId) {
        return false;
      }

      // Lọc từ khóa tìm kiếm
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const docName = (doc.fullName || '').toLowerCase();
        const room = (doc.roomNumber || '').toLowerCase();
        const spec = (doc.specialtyName || '').toLowerCase();
        if (!docName.includes(term) && !room.includes(term) && !spec.includes(term)) {
          return false;
        }
      }

      // Lọc theo khung giờ còn trống (Khả dụng)
      if (filterAvailability === 'ONLY_AVAILABLE') {
        const slots = doctorSlotsMap[doc.id] || [];
        const hasAvailable = slots.some((s) => {
          if (s.disabled || s.status === 'full' || s.status === 'expired') return false;
          const timing = getSlotTimingInfo(s.time);
          return !timing.isPast && !timing.isUrgentTooClose;
        });
        if (!hasAvailable) return false;
      }

      return true;
    });
  }, [doctors, selectedSpecialtyId, searchTerm, filterAvailability, doctorSlotsMap, getSlotTimingInfo]);

  // Thống kê toàn viện trong ngày
  const clinicMetrics = useMemo(() => {
    let totalSlots = 0;
    let totalBooked = 0;
    let totalEligibleAvailable = 0;
    const activeRooms = new Set<string>();

    doctors.forEach((doc) => {
      if (doc.roomNumber) activeRooms.add(doc.roomNumber);
      const slots = doctorSlotsMap[doc.id] || [];
      totalSlots += slots.length;

      slots.forEach((s) => {
        if (s.status === 'full' || s.status === 'booked') {
          totalBooked++;
        } else if (s.status === 'available' && !s.disabled) {
          const timing = getSlotTimingInfo(s.time);
          if (!timing.isPast && !timing.isUrgentTooClose) {
            totalEligibleAvailable++;
          }
        }
      });
    });

    return {
      doctorCount: doctors.length,
      roomCount: activeRooms.size || 6,
      totalSlots,
      totalBooked,
      totalEligibleAvailable,
    };
  }, [doctors, doctorSlotsMap, getSlotTimingInfo]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* ── Header Điều Khiển & Bộ Lọc Tra Cứu ── */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200">
              <CalendarDays size={14} className="text-teal-600" />
              <span>Bảng Điều Phối Lịch Toàn Viện &amp; Khung Giờ Bác Sĩ</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              Tra Cứu Lịch Khám &amp; Tư Vấn Khách Vãng Lai
            </h2>
            <p className="text-xs text-slate-500">
              Lễ tân tra cứu tình trạng buồng khám, giờ trống của tất cả Bác sĩ theo thời gian thực và đăng ký ngay cho khách tại quầy.
            </p>
          </div>

          {/* Điều Khiển Chọn Ngày Khám & Chuyển Nhanh */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shrink-0">
            {/* Quick Switcher Hôm nay & Ngày mai */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayISODate())}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isToday
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar size={13} className={isToday ? 'text-teal-600' : 'text-slate-400'} />
                <span>Hôm nay ({formatDisplayDateVN(getTodayISODate())})</span>
                {isAfter17h && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                    isToday ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    Đã hết ca
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getTomorrowISODate())}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  isTomorrow
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-teal-800 hover:bg-white/60'
                }`}
              >
                <Sparkles size={13} className={isTomorrow ? 'text-amber-200' : 'text-teal-600'} />
                <span>Ngày mai ({formatDisplayDateVN(getTomorrowISODate())})</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                  isTomorrow ? 'bg-teal-700 text-white' : 'bg-teal-100 text-teal-800'
                }`}>
                  Mở nhận lịch
                </span>
              </button>
            </div>

            {/* Chọn ngày tùy chỉnh */}
            <div className="flex items-center gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-200">
              <button
                type="button"
                onClick={() => handleShiftDate(-1)}
                className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer shadow-2xs"
                title="Lùi 1 ngày"
              >
                <ChevronLeft size={15} />
              </button>

              <div className="flex items-center gap-1.5 px-2">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-black text-slate-800 focus:outline-none cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => handleShiftDate(1)}
                className="p-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer shadow-2xs"
                title="Tiến 1 ngày"
              >
                <ChevronRight size={15} />
              </button>

              <button
                type="button"
                onClick={loadSlotsForAllDoctors}
                disabled={loading}
                className="p-1.5 rounded-xl bg-teal-50 border border-teal-200 hover:bg-teal-100 text-teal-800 transition cursor-pointer ml-1"
                title="Tải lại dữ liệu slots"
              >
                <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>
        </div>

        {/* Thanh KPI Thống Kê Toàn Viện */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
          <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bác sĩ trực</span>
            <div className="text-lg font-black text-slate-800 mt-0.5">{clinicMetrics.doctorCount} bác sĩ</div>
          </div>

          <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Buồng khám mở</span>
            <div className="text-lg font-black text-slate-800 mt-0.5">{clinicMetrics.roomCount} buồng khám</div>
          </div>

          <div className="p-3 bg-emerald-50/80 rounded-2xl border border-emerald-200">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block flex items-center gap-1">
              <Zap size={11} className="text-emerald-600" />
              <span>Slot trống đón khách</span>
            </span>
            <div className="text-lg font-black text-emerald-700 mt-0.5">
              {clinicMetrics.totalEligibleAvailable} khung giờ
            </div>
          </div>

          <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-200">
            <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">Bệnh nhân đã đặt</span>
            <div className="text-lg font-black text-blue-700 mt-0.5">{clinicMetrics.totalBooked} lượt khám</div>
          </div>
        </div>

        {/* Banner Thông Báo Trạng Thái Thông Minh (Sau 17:00 / Xem Ngày Mai) */}
        {isToday && isAfter17h && (
          <div className="p-4 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl text-amber-700 shrink-0 mt-0.5">
                <AlertCircle size={18} />
              </div>
              <div className="space-y-0.5">
                <p className="font-black text-amber-950 text-sm flex items-center gap-2">
                  <span>Ca khám hôm nay đã kết thúc (Sau 17:00)</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-200/80 text-amber-900 rounded-full">
                    Đã đóng ca hôm nay
                  </span>
                </p>
                <p className="text-amber-800 text-[11px] leading-relaxed">
                  Tất cả các khung giờ khám trong ngày hôm nay đã kết thúc. Hệ thống đã tự động chốt buồng khám và kích hoạt lịch trực của toàn bộ Bác sĩ cho <strong>Ngày mai ({formatDisplayDateVN(getTomorrowISODate())})</strong>. Lễ tân vui lòng chuyển sang xem lịch ngày mai để tư vấn và đăng ký khám cho người bệnh.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(getTomorrowISODate())}
              className="px-4 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold rounded-xl text-xs shadow-xs transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <Sparkles size={15} />
              <span>Xem Lịch Ngày Mai Ngay</span>
            </button>
          </div>
        )}

        {isTomorrow && (
          <div className="p-3.5 bg-gradient-to-r from-teal-50 via-emerald-50 to-teal-50 border border-teal-200 rounded-2xl text-xs text-teal-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 bg-teal-100 rounded-xl text-teal-700 shrink-0">
                <Sparkles size={16} />
              </div>
              <div>
                <span className="font-extrabold text-teal-950 text-sm">
                  Đang xem Lịch trực Ngày Mai ({formatDisplayDateVN(selectedDate)})
                </span>
                <span className="text-teal-800 text-xs block sm:inline sm:ml-2">
                  • Toàn bộ {clinicMetrics.doctorCount} Bác sĩ đã chốt buồng khám 🔒 • {clinicMetrics.totalEligibleAvailable} khung giờ khám sẵn sàng nhận đặt lịch.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSyncTomorrowSchedule}
              disabled={syncingTomorrow}
              className="px-3.5 py-1.5 bg-white hover:bg-teal-50 text-teal-800 border border-teal-300 font-bold rounded-xl text-xs shadow-2xs transition flex items-center gap-1.5 cursor-pointer shrink-0"
              title="Kích hoạt kiểm tra và đồng bộ lại toàn bộ lịch khám 7 ngày tới cho các Bác sĩ"
            >
              <RefreshCw size={13} className={syncingTomorrow ? 'animate-spin' : ''} />
              <span>{syncingTomorrow ? 'Đang đồng bộ...' : 'Đồng bộ lại lịch tuần'}</span>
            </button>
          </div>
        )}

        {syncSuccessMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{syncSuccessMsg}</span>
          </div>
        )}

        {/* Banner Quy tắc đón khách vãng lai (Đồng bộ theo cấu hình Admin) */}
        <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
          <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-extrabold text-amber-950 block">
              Quy tắc tiếp nhận khách vãng lai tại quầy (Lead-time $\ge$ {typeof window !== 'undefined' ? (getClinicScheduleConfig()?.walkinMinBufferMinutes ?? 15) : 15} phút):
            </span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Để Bác sĩ kịp chuẩn bị hồ sơ bệnh án và tránh trùng giờ bệnh nhân đã hẹn, hệ thống chỉ cho phép tiếp nhận ngay đối với các khung giờ <strong>còn trống và có giờ bắt đầu cách hiện tại tối thiểu {typeof window !== 'undefined' ? (getClinicScheduleConfig()?.walkinMinBufferMinutes ?? 15) : 15} phút</strong>. Các khung giờ dưới ngưỡng này sẽ hiển thị cảnh báo <span className="font-bold text-amber-700">Sát giờ</span>.
            </p>
          </div>
        </div>

        {/* Bộ Lọc Tìm Kiếm & Chuyên Khoa */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          {/* Ô tìm kiếm */}
          <div className="relative flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo tên Bác sĩ, phòng khám (P.208), chuyên khoa..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
            />
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Lọc chuyên khoa */}
          <div className="sm:w-64">
            <select
              value={selectedSpecialtyId}
              onChange={(e) => setSelectedSpecialtyId(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 cursor-pointer"
            >
              <option value="ALL">Tất cả chuyên khoa</option>
              {specialties.map((spec) => (
                <option key={spec.id} value={spec.id || spec.name}>
                  {spec.name}
                </option>
              ))}
            </select>
          </div>

          {/* Toggle chỉ xem bác sĩ còn slot trống */}
          <button
            type="button"
            onClick={() => setFilterAvailability((prev) => (prev === 'ALL' ? 'ONLY_AVAILABLE' : 'ALL'))}
            className={`px-4 py-2.5 rounded-2xl border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
              filterAvailability === 'ONLY_AVAILABLE'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Zap size={14} />
            <span>Chỉ Bác Sĩ Còn Giờ Trống</span>
          </button>
        </div>
      </div>

      {/* ── Danh Sách Lưới Thẻ Bác Sĩ (Doctor Cards Grid) ── */}
      {loading ? (
        <div className="bg-white rounded-3xl p-16 text-center border border-slate-200 space-y-3">
          <RefreshCw size={24} className="animate-spin text-teal-700 mx-auto" />
          <p className="text-xs font-bold text-slate-600">Đang tải lịch trực &amp; khung giờ toàn bộ Bác sĩ...</p>
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-300 space-y-3">
          <Stethoscope size={36} className="text-slate-300 mx-auto" />
          <h4 className="font-extrabold text-slate-700 text-sm">Không tìm thấy bác sĩ phù hợp</h4>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Vui lòng thử đổi từ khóa tìm kiếm hoặc chọn lại chuyên khoa và ngày khám khác.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {filteredDoctors.map((doc) => {
            const rawSlots = doctorSlotsMap[doc.id] || [];
            const docName = formatDoctorFullName(doc.academicTitle, doc.fullName);
            const specialtyName = doc.specialtyName || 'Đa Khoa';
            const roomNumber = doc.roomNumber || 'Phòng P.208';
            const fee = Number(doc.consultationFee) || 200000;

            // Phân loại slot Sáng & Chiều
            const morningSlots = rawSlots.filter((s) => {
              const hour = parseInt(s.time.split(':')[0], 10) || 0;
              return hour < 12;
            });

            const afternoonSlots = rawSlots.filter((s) => {
              const hour = parseInt(s.time.split(':')[0], 10) || 0;
              return hour >= 12;
            });

            const totalSlots = rawSlots.length;
            const availableCount = rawSlots.filter((s) => {
              if (s.disabled || s.status === 'full' || s.status === 'expired') return false;
              const timing = getSlotTimingInfo(s.time);
              return !timing.isPast && !timing.isUrgentTooClose;
            }).length;

            return (
              <div
                key={doc.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs hover:border-teal-300 transition-all overflow-hidden flex flex-col"
              >
                {/* Header Thẻ Bác Sĩ */}
                <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-teal-50/20 to-white border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-700 to-emerald-800 text-white flex items-center justify-center font-extrabold text-lg shadow-sm shrink-0">
                      {doc.fullName ? doc.fullName.charAt(doc.fullName.length - 1) : 'BS'}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-teal-800 bg-teal-100/70 px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {doc.academicTitle || 'BS.CKII'}
                        </span>
                        <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <DoorOpen size={11} className="text-blue-600" />
                          <span>{roomNumber}</span>
                        </span>
                      </div>

                      <h3 className="font-extrabold text-slate-800 text-sm sm:text-base mt-0.5 truncate">
                        {docName}
                      </h3>

                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 font-medium">
                        <span className="flex items-center gap-1 text-slate-600">
                          <Stethoscope size={12} className="text-teal-600" />
                          <span>{specialtyName}</span>
                        </span>
                        <span>•</span>
                        <span className="text-emerald-700 font-bold">
                          {fee.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Badge số slot trống */}
                  <div className="text-right shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-black shadow-2xs ${
                      availableCount > 0
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                    }`}>
                      <Zap size={12} className={availableCount > 0 ? 'text-emerald-600' : 'text-slate-400'} />
                      <span>{availableCount} slot trống</span>
                    </span>
                    <span className="block text-[10px] text-slate-400 mt-1">
                      Tổng {totalSlots} slots trong ngày
                    </span>
                  </div>
                </div>

                {/* Danh Sách Các Khung Giờ (Sáng & Chiều) */}
                <div className="p-4 sm:p-5 flex-1 space-y-4">
                  {rawSlots.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-slate-400 text-xs">
                      Bác sĩ chưa có ca trực trong ngày {formatDisplayDateVN(selectedDate)}.
                    </div>
                  ) : (
                    <>
                      {/* Buổi Sáng */}
                      {morningSlots.length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-amber-800">
                            <span className="flex items-center gap-1.5">
                              <Sun size={14} className="text-amber-500" />
                              <span>Ca Sáng (08:00 - 12:00)</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {morningSlots.filter((s) => !s.disabled && s.status === 'available').length} slots còn lại
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {morningSlots.map((slot) => {
                              const timing = getSlotTimingInfo(slot.time);
                              const isBooked = slot.status === 'full' || slot.status === 'booked';
                              const isLocked = slot.status === 'locked';
                              const isPast = timing.isPast || slot.status === 'expired';
                              const isUrgent = timing.isUrgentTooClose;
                              const isClickable = !isBooked && !isLocked && !isPast && !isUrgent && !slot.disabled;

                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={!isClickable}
                                  onClick={() => {
                                    if (isClickable) {
                                      handleSlotClick(doc, slot);
                                    }
                                  }}
                                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center min-w-0 ${
                                    isBooked
                                      ? 'bg-blue-50/80 border-blue-200 text-blue-800 cursor-not-allowed opacity-80'
                                      : isPast
                                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                      : isUrgent
                                      ? 'bg-amber-50 border-amber-300 text-amber-800 cursor-not-allowed'
                                      : isLocked
                                      ? 'bg-amber-50/60 border-amber-200 text-amber-700 cursor-not-allowed'
                                      : 'bg-emerald-50/80 hover:bg-emerald-600 border-emerald-300 text-emerald-900 hover:text-white shadow-2xs hover:shadow-sm cursor-pointer group'
                                  }`}
                                  title={
                                    isBooked
                                      ? 'Đã có người đặt lịch'
                                      : isPast
                                      ? 'Khung giờ đã qua'
                                      : isUrgent
                                      ? 'Quá sát giờ (< 15p), không nhận khách vãng lai'
                                      : isLocked
                                      ? 'Bác sĩ tạm khóa'
                                      : 'Click để đặt lịch qua điện thoại hoặc tiếp đón tại quầy'
                                  }
                                >
                                  <span className="text-xs font-black tracking-tight">{slot.time}</span>
                                  <span className={`text-[9px] font-bold mt-0.5 ${
                                    isClickable ? 'text-emerald-700 group-hover:text-emerald-100 flex items-center gap-0.5' : 'opacity-80'
                                  }`}>
                                    {isBooked ? (
                                      'ĐÃ ĐẶT'
                                    ) : isPast ? (
                                      'ĐÃ QUA'
                                    ) : isUrgent ? (
                                      'SÁT GIỜ (<15P)'
                                    ) : isLocked ? (
                                      'TẠM KHÓA'
                                    ) : (
                                      <>
                                        <Zap size={9} /> ĐÓN KHÁCH
                                      </>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Buổi Chiều */}
                      {afternoonSlots.length > 0 && (
                        <div className="space-y-2 pt-1 border-t border-slate-100">
                          <div className="flex items-center justify-between text-xs font-bold text-indigo-800">
                            <span className="flex items-center gap-1.5">
                              <Sunset size={14} className="text-indigo-500" />
                              <span>Ca Chiều (13:30 - 17:00)</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-normal">
                              {afternoonSlots.filter((s) => !s.disabled && s.status === 'available').length} slots còn lại
                            </span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {afternoonSlots.map((slot) => {
                              const timing = getSlotTimingInfo(slot.time);
                              const isBooked = slot.status === 'full' || slot.status === 'booked';
                              const isLocked = slot.status === 'locked';
                              const isPast = timing.isPast || slot.status === 'expired';
                              const isUrgent = timing.isUrgentTooClose;
                              const isClickable = !isBooked && !isLocked && !isPast && !isUrgent && !slot.disabled;

                              return (
                                <button
                                  key={slot.id}
                                  type="button"
                                  disabled={!isClickable}
                                  onClick={() => {
                                    if (isClickable) {
                                      handleSlotClick(doc, slot);
                                    }
                                  }}
                                  className={`p-2 rounded-xl border text-center transition flex flex-col items-center justify-center min-w-0 ${
                                    isBooked
                                      ? 'bg-blue-50/80 border-blue-200 text-blue-800 cursor-not-allowed opacity-80'
                                      : isPast
                                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                      : isUrgent
                                      ? 'bg-amber-50 border-amber-300 text-amber-800 cursor-not-allowed'
                                      : isLocked
                                      ? 'bg-amber-50/60 border-amber-200 text-amber-700 cursor-not-allowed'
                                      : 'bg-emerald-50/80 hover:bg-emerald-600 border-emerald-300 text-emerald-900 hover:text-white shadow-2xs hover:shadow-sm cursor-pointer group'
                                  }`}
                                  title={
                                    isBooked
                                      ? 'Đã có người đặt lịch'
                                      : isPast
                                      ? 'Khung giờ đã qua'
                                      : isUrgent
                                      ? 'Quá sát giờ (< 15p), không nhận khách vãng lai'
                                      : isLocked
                                      ? 'Bác sĩ tạm khóa'
                                      : 'Click để đặt lịch qua điện thoại hoặc tiếp đón tại quầy'
                                  }
                                >
                                  <span className="text-xs font-black tracking-tight">{slot.time}</span>
                                  <span className={`text-[9px] font-bold mt-0.5 ${
                                    isClickable ? 'text-emerald-700 group-hover:text-emerald-100 flex items-center gap-0.5' : 'opacity-80'
                                  }`}>
                                    {isBooked ? (
                                      'ĐÃ ĐẶT'
                                    ) : isPast ? (
                                      'ĐÃ QUA'
                                    ) : isUrgent ? (
                                      'SÁT GIỜ (<15P)'
                                    ) : isLocked ? (
                                      'TẠM KHÓA'
                                    ) : (
                                      <>
                                        <Zap size={9} /> ĐÓN KHÁCH
                                      </>
                                    )}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal Đặt Lịch Khám Nhanh Qua Điện Thoại & Tiếp Nhận Tại Quầy (CLAB-115) ── */}
      {quickBookingModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center font-bold text-white shadow-2xs">
                  <PhoneCall size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base tracking-tight">
                    Đặt Lịch Khám Qua Điện Thoại &amp; Tiếp Nhận
                  </h3>
                  <p className="text-[11px] text-teal-100 mt-0.5">
                    Nhập nhanh thông tin người bệnh cho ca khám đã chọn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickBookingModal(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Thông Tin Khung Giờ & Bác Sĩ Được Chọn */}
            <div className="p-4 bg-teal-50/70 border-b border-teal-100/80">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-teal-200/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-teal-700 block uppercase tracking-wider">Bác sĩ phụ trách</span>
                  <div className="font-black text-slate-800 mt-0.5 truncate">
                    {formatDoctorFullName(quickBookingModal.doctor.academicTitle, quickBookingModal.doctor.fullName)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {quickBookingModal.doctor.specialtyName} • {quickBookingModal.doctor.roomNumber || 'P.205'}
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-teal-200/60 shadow-2xs">
                  <span className="text-[10px] font-bold text-teal-700 block uppercase tracking-wider">Thời gian khám</span>
                  <div className="font-black text-teal-900 mt-0.5 flex items-center gap-1">
                    <Clock size={13} className="text-teal-600" />
                    <span>{quickBookingModal.slot.time}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <Calendar size={11} className="text-slate-400" />
                    <span>{formatDisplayDateVN(quickBookingModal.date)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Nhập Liệu Nhanh */}
            <form onSubmit={handleConfirmQuickBooking} className="p-5 space-y-4">
              {/* Lựa chọn hình thức: Điện thoại vs Quầy */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBookingType('PHONE')}
                  className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                    bookingType === 'PHONE'
                      ? 'bg-teal-50 border-teal-600 text-teal-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-xs">
                    <Phone size={14} className={bookingType === 'PHONE' ? 'text-teal-700' : 'text-slate-400'} />
                    <span>Khách Gọi Điện Thoại</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Hẹn giờ trước • Trạng thái: Đã xác nhận • Không cần email
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setBookingType('WALKIN')}
                  className={`p-2.5 rounded-2xl border text-left transition cursor-pointer ${
                    bookingType === 'WALKIN'
                      ? 'bg-emerald-50 border-emerald-600 text-emerald-900 shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-xs">
                    <Zap size={14} className={bookingType === 'WALKIN' ? 'text-emerald-700' : 'text-slate-400'} />
                    <span>Tiếp Đón Tại Quầy</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                    Khách có mặt • Cấp số STT khám ngay
                  </p>
                </button>
              </div>

              {/* Số điện thoại */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại người bệnh <span className="text-red-500">*</span>
                  <span className="text-[10px] text-slate-400 font-normal ml-2">(Chỉ chữ số, đúng 10 số)</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    autoFocus
                    maxLength={10}
                    value={bookingPhone}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                      setBookingPhone(val);
                      if (bookingError) setBookingError(null);
                    }}
                    placeholder="VD: 0912345678"
                    className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
                      bookingPhone
                        ? phoneValidation.isValid
                          ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                          : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                        : 'border-slate-200 focus:border-teal-600 focus:ring-teal-100'
                    }`}
                  />
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                {bookingPhone && (
                  <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
                    phoneValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {phoneValidation.isValid ? <Check size={12} /> : <AlertCircle size={12} />}
                    <span>{phoneValidation.message}</span>
                  </p>
                )}
              </div>

              {/* Email / Gmail người bệnh (Tùy chọn - Không bắt buộc) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span>Gmail / Email người bệnh</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                      Không bắt buộc
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-normal">Nhận phiếu xác nhận</span>
                </label>
                <div className="relative">
                  <input
                    type="email"
                    maxLength={100}
                    value={bookingEmail}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[\s<>'";`\\]/g, '');
                      setBookingEmail(val);
                      if (bookingError) setBookingError(null);
                    }}
                    placeholder="VD: nguyenvana@gmail.com (Có thể để trống nếu khách không dùng)"
                    className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
                      bookingEmail
                        ? emailValidation.isValid
                          ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                          : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                        : 'border-slate-200 focus:border-teal-600 focus:ring-teal-100'
                    }`}
                  />
                  <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                {bookingEmail ? (
                  <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
                    emailValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {emailValidation.isValid ? <Check size={12} /> : <AlertCircle size={12} />}
                    <span>{emailValidation.message}</span>
                  </p>
                ) : (
                  <p className="text-[11px] mt-1 text-slate-400 flex items-center gap-1">
                    <span>💡 Khách gọi điện thoại có thể để trống ô này nếu không có Gmail.</span>
                  </p>
                )}
              </div>

              {/* Họ và tên */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên người bệnh <span className="text-red-500">*</span>
                  <span className="text-[10px] text-slate-400 font-normal ml-2">(Chỉ chữ cái tiếng Việt, không chứa số)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={bookingFullName}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^a-zA-Z\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g, '');
                      setBookingFullName(val);
                      if (bookingError) setBookingError(null);
                    }}
                    placeholder="VD: Nguyễn Văn An"
                    className={`w-full pl-9 pr-3 py-2.5 bg-slate-50 border rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
                      bookingFullName
                        ? nameValidation.isValid
                          ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                          : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                        : 'border-slate-200 focus:border-teal-600 focus:ring-teal-100'
                    }`}
                  />
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                </div>
                {bookingFullName && (
                  <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
                    nameValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {nameValidation.isValid ? <Check size={12} /> : <AlertCircle size={12} />}
                    <span>{nameValidation.message}</span>
                  </p>
                )}
              </div>

              {/* Triệu chứng bệnh ngắn gọn */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Triệu chứng bệnh ngắn gọn / Lý do khám</span>
                  <span className={`text-[10px] font-semibold ${
                    symptomsValidation.isValid ? 'text-slate-400' : 'text-rose-600'
                  }`}>
                    {symptomsValidation.message}
                  </span>
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    maxLength={500}
                    value={bookingSymptoms}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[<>'`\\{}]/g, '').slice(0, 500);
                      setBookingSymptoms(val);
                      if (bookingError) setBookingError(null);
                    }}
                    placeholder="Mô tả ngắn gọn khách báo qua điện thoại (VD: Sốt 2 ngày, nổi mẩn ngứa da, đau họng, tái khám định kỳ...)"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100 resize-none"
                  />
                  <FileText size={15} className="absolute left-3 top-3 text-slate-400" />
                </div>
              </div>

              {bookingError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setQuickBookingModal(null)}
                  disabled={bookingSubmitting}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-bold transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white text-xs font-black shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {bookingSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Đang Xử Lý...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={15} />
                      <span>Xác Nhận Đặt Lịch</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Báo Thành Công & Phiếu Tiếp Nhận (CLAB-115) ── */}
      {bookingSuccessData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-150">
            {/* Header Thành Công */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 text-center">
              <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 text-white shadow-xs">
                <CheckCircle2 size={28} />
              </div>
              <h3 className="font-black text-lg tracking-tight">ĐẶT LỊCH THÀNH CÔNG!</h3>
              <p className="text-xs text-emerald-100 mt-0.5">
                {bookingSuccessData.bookingType === 'PHONE'
                  ? 'Lịch hẹn qua điện thoại đã được lưu vào hệ thống'
                  : 'Bệnh nhân đã được tiếp nhận và phát số vào buồng khám'}
              </p>
            </div>

            {/* Chi Tiết Phiếu Hẹn */}
            <div className="p-5 space-y-3.5">
              {/* Mã Đặt Lịch & STT */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Mã đặt khám</span>
                  <div className="text-base font-black text-teal-800 tracking-wider font-mono">
                    {bookingSuccessData.bookingCode}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Số thứ tự khám</span>
                  <div className="text-lg font-black text-emerald-600">
                    #{bookingSuccessData.queueNumber}
                  </div>
                </div>
              </div>

              {/* Thông tin bệnh nhân & Bác sĩ */}
              <div className="space-y-2 text-xs divide-y divide-slate-100 border border-slate-100 p-3 rounded-2xl bg-slate-50/50">
                <div className="flex justify-between py-1">
                  <span className="text-slate-500">Người bệnh:</span>
                  <strong className="text-slate-800">{bookingSuccessData.patientName} ({bookingSuccessData.phone})</strong>
                </div>
                {bookingSuccessData.email && (
                  <div className="flex justify-between py-1 pt-1.5">
                    <span className="text-slate-500">Gmail/Email:</span>
                    <strong className="text-teal-700 truncate max-w-[200px]">{bookingSuccessData.email}</strong>
                  </div>
                )}
                <div className="flex justify-between py-1 pt-1.5">
                  <span className="text-slate-500">Bác sĩ khám:</span>
                  <strong className="text-slate-800">{bookingSuccessData.doctorName}</strong>
                </div>
                <div className="flex justify-between py-1 pt-1.5">
                  <span className="text-slate-500">Phòng khám:</span>
                  <strong className="text-emerald-700">{bookingSuccessData.roomNumber} ({bookingSuccessData.specialtyName})</strong>
                </div>
                <div className="flex justify-between py-1 pt-1.5">
                  <span className="text-slate-500">Thời gian:</span>
                  <strong className="text-slate-800">
                    {bookingSuccessData.slotTime} • {formatDisplayDateVN(bookingSuccessData.appointmentDate)}
                  </strong>
                </div>
                {bookingSuccessData.symptoms && (
                  <div className="flex justify-between py-1 pt-1.5">
                    <span className="text-slate-500">Triệu chứng:</span>
                    <span className="text-slate-700 italic max-w-[200px] text-right truncate">
                      {bookingSuccessData.symptoms}
                    </span>
                  </div>
                )}
              </div>

              {/* Nút hành động nhanh */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopySmsMessage}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copiedSms ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                  <span>{copiedSms ? 'Đã sao chép SMS!' : 'Sao chép SMS/Zalo'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>In Phiếu Khám</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => setBookingSuccessData(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-black transition cursor-pointer"
              >
                Đóng &amp; Tiếp Tục
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
