'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  Stethoscope, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  User, 
  ArrowRight, 
  ArrowLeft, 
  QrCode, 
  MapPin, 
  ShieldCheck,
  Printer,
  ChevronRight,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { api, AppointmentResponse, getAuthUser, getAuthToken } from '@/shared/lib/api';
import { formatDoctorFullName } from '@/shared/lib/formatters';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import { useSingleTabLock } from '@/shared/hooks/useSingleTabLock';
import SingleTabLockOverlay from '@/shared/components/Feedback/SingleTabLockOverlay';
import { QrCodeImage } from '@/shared/components/QrCodeImage';
import { VietQrModal } from '@/shared/components/VietQrModal';

export default function BookingForm() {
  const { isBlocked, handleTakeOver } = useSingleTabLock({
    channelKey: 'patient_booking',
    moduleName: 'Đặt Lịch Khám Trực Tuyến',
  });

  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [centers, setCenters] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [isPaidOnline, setIsPaidOnline] = useState<boolean>(false);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/booking&reason=auth_required');
      return;
    }

    const user = getAuthUser();
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

  const formatISODateToVN = (iso: string) => {
    const parts = iso.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : iso;
  };

  // Nếu hiện tại đã quá 14:30 chiều (khung giờ cuối cùng của ngày), tự động khởi tạo ngày mai
  const isPastAllTodaySlots = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    return currentMinutes > 14 * 60 + 30;
  };

  const [bookingDate, setBookingDate] = useState<string>(
    isPastAllTodaySlots() ? getTomorrowISODate() : getTodayISODate()
  );

  const [selectedSlot, setSelectedSlot] = useState<{ id: string; time: string; date: string }>({
    id: '',
    time: 'Chưa chọn',
    date: formatISODateToVN(isPastAllTodaySlots() ? getTomorrowISODate() : getTodayISODate()),
  });
  const [symptoms, setSymptoms] = useState('');
  const [aiPreview, setAiPreview] = useState<{ specialty: string; summary: string } | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const [c, s, docList] = await Promise.all([
          api.getMedicalCenters().catch(() => []),
          api.getSpecialties().catch(() => []),
          api.getDoctors().catch(() => []),
        ]);
        if (c && c.length > 0) {
          setCenters(c);
          setSelectedCenter(c[0].id);
        }
        if (s && s.length > 0) {
          setSpecialties(s);
          setSelectedSpecialty(s[0].id);
        }
        if (docList && docList.length > 0) {
          const mapped = docList.map((d: any) => ({
            id: d.id,
            name: formatDoctorFullName(d.academicTitle, d.fullName),
            title: d.bio || `Bác sĩ ${d.specialtyName || ''}`,
            room: d.roomNumber || 'Phòng Khám Chuyên Khoa',
            fee: Number(d.consultationFee) || 200000,
            specialty: d.specialtyName,
            specialtyId: d.specialtyId,
            centerId: d.medicalCenterId,
          }));
          setDoctors(mapped);
          setSelectedDoctor(mapped[0]);
        }
      } finally {
        setLoadingData(false);
      }
    }
    loadCategories();
  }, []);

  const handleAnalyzeSymptoms = async () => {
    if (!symptoms.trim()) return;
    setAnalyzingAi(true);
    try {
      const res = await api.triageSymptoms(symptoms);
      setAiPreview(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedSlot.id || timeSlots.find((s) => s.id === selectedSlot.id)?.disabled) {
      setError('Khung giờ bạn chọn đã qua hoặc không còn khả dụng. Vui lòng chọn khung giờ khác hoặc ngày khác.');
      return;
    }
    setSubmitting(true);

    try {
      // Lấy patientProfileId thực tế của tài khoản hiện tại từ phiên đăng nhập
      let currentPatientProfileId = '';
      try {
        const profile = await api.getProfile();
        if (profile?.patientProfile?.profileId) {
          currentPatientProfileId = profile.patientProfile.profileId;
        }
      } catch {
        // Sẽ được Backend tự động phân giải từ JWT Session nếu để trống
      }

      const res = await api.bookAppointment({
        medicalCenterId: selectedCenter,
        patientProfileId: currentPatientProfileId,
        doctorId: selectedDoctor?.id || '',
        slotId: selectedSlot.id,
        symptoms: symptoms.trim() || 'Khám kiểm tra sức khỏe định kỳ',
        medicalHistory: '',
      });
      
      try {
        if (res.id) {
          const paymentRes = await api.createPaymentUrl(res.id);
          if (paymentRes.url) {
            window.location.href = paymentRes.url;
            return;
          }
        }
      } catch (paymentErr) {
        console.warn("Could not generate payment URL, falling back to direct success", paymentErr);
      }

      setResult(res);
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Đặt lịch thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const doctorList = doctors;

  const BASE_TIME_SLOTS = [
    { id: 'sl000001-0000-0000-0000-000000000001', time: '08:00 - 08:30', startMinutes: 8 * 60, defaultStatus: 'available' },
    { id: 'sl000002-0000-0000-0000-000000000001', time: '08:30 - 09:00', startMinutes: 8 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000003-0000-0000-0000-000000000001', time: '09:00 - 09:30', startMinutes: 9 * 60, defaultStatus: 'available' },
    { id: 'sl000004-0000-0000-0000-000000000001', time: '09:30 - 10:00', startMinutes: 9 * 60 + 30, defaultStatus: 'available' },
    { id: 'sl000005-0000-0000-0000-000000000001', time: '14:00 - 14:30', startMinutes: 14 * 60, defaultStatus: 'available' },
    { id: 'sl000006-0000-0000-0000-000000000001', time: '14:30 - 15:00', startMinutes: 14 * 60 + 30, defaultStatus: 'available' },
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
    if (!docId) return;
    let isCancelled = false;
    setLoadingSlots(true);
    api.getDoctorAvailableSlots(docId, bookingDate)
      .then((data) => {
        if (!isCancelled && Array.isArray(data) && data.length > 0) {
          setDynamicSlots(data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch doctor slots:', err);
      })
      .finally(() => {
        if (!isCancelled) setLoadingSlots(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedDoctor?.id, bookingDate]);

  // Tính toán trạng thái các time-slots theo thời gian thực tế:
  // Nếu có dữ liệu slot động từ DB của Bác sĩ -> Dùng dữ liệu thật 100%
  const timeSlots = useMemo(() => {
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
  }, [bookingDate, dynamicSlots]);

  // Tự động chọn khung giờ khả dụng đầu tiên khi đổi ngày hoặc đổi bác sĩ
  useEffect(() => {
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
  }, [bookingDate, timeSlots]);

  if (authChecking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center py-16">
        <LoadingSpinner size={36} message="Đang kiểm tra quyền truy cập đặt lịch khám..." />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
              <Calendar size={14} />
              <span>Cổng Dịch Vụ Khách Hàng MedSched</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Đặt Lịch Khám Trực Tuyến</h1>
            <p className="text-slate-500 text-sm mt-1">
              Quy trình 4 bước đặt trước ca khám theo thời gian thực kết hợp phân loại triệu chứng tự động bằng <strong>Spring AI</strong> (Tính năng AI đang trong quá trình phát triển).
            </p>
          </div>
          {step < 4 && (
            <div className="bg-slate-100 px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 shrink-0">
              Bước {step} / 3
            </div>
          )}
        </div>

        {/* Stepper Wizard Progress */}
        {step < 4 && (
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 pb-5 sm:pb-6 border-b border-slate-100">
            <button
              onClick={() => setStep(1)}
              className={`p-2 sm:p-2.5 rounded-xl text-left transition flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                step === 1 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === 1 ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
              }`}>1</div>
              <span className="text-[11px] sm:text-xs font-semibold truncate">Cơ Sở &amp; Khoa</span>
            </button>

            <button
              onClick={() => setStep(2)}
              className={`p-2 sm:p-2.5 rounded-xl text-left transition flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                step === 2 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === 2 ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
              }`}>2</div>
              <span className="text-[11px] sm:text-xs font-semibold truncate">Bác Sĩ &amp; Giờ</span>
            </button>

            <button
              onClick={() => setStep(3)}
              className={`p-2 sm:p-2.5 rounded-xl text-left transition flex items-center gap-1.5 sm:gap-2 cursor-pointer ${
                step === 3 ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step === 3 ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-700'
              }`}>3</div>
              <span className="text-[11px] sm:text-xs font-semibold truncate">Triệu Chứng</span>
            </button>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mt-4">
            <AlertMessage type="error" message={error} onClose={() => setError(null)} />
          </div>
        )}

        {/* Step 1: Cơ Sở & Chuyên Khoa */}
        {step === 1 && (
          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                1. Chọn Chi Nhánh Phòng Khám:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {centers.map((center) => (
                  <div
                    key={center.id}
                    onClick={() => setSelectedCenter(center.id)}
                    className={`p-4 rounded-xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      selectedCenter === center.id
                        ? 'border-blue-600 bg-blue-50/50'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-slate-800 text-sm">{center.name}</span>
                        {selectedCenter === center.id && <CheckCircle2 size={18} className="text-blue-600" />}
                      </div>
                      <p className="text-xs text-slate-500 flex items-start gap-1">
                        <MapPin size={14} className="shrink-0 mt-0.5" />
                        <span>{center.address}</span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                2. Chọn Chuyên Khoa Thăm Khám:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {specialties.map((spec) => (
                  <div
                    key={spec.id}
                    onClick={() => setSelectedSpecialty(spec.id)}
                    className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                      selectedSpecialty === spec.id
                        ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-semibold'
                        : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      <Stethoscope size={16} className="text-blue-600" />
                      <span>{spec.name}</span>
                    </div>
                    {selectedSpecialty === spec.id && <CheckCircle2 size={16} className="text-blue-600" />}
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <span>Tiếp tục chọn Bác sĩ</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Bác Sĩ & Khung Giờ */}
        {step === 2 && (
          <div className="mt-6 space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                1. Chọn Bác Sĩ Phụ Trách:
              </label>
              <div className="space-y-3">
                {doctorList.length === 0 ? (
                  <div className="py-8 px-4 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <Stethoscope size={32} className="mx-auto text-slate-400 mb-2" />
                    <p className="text-sm font-semibold text-slate-600">Chưa có bác sĩ khả dụng cho chuyên khoa này</p>
                    <p className="text-xs text-slate-400 mt-1">Vui lòng quay lại bước trước để chọn chuyên khoa hoặc chi nhánh phòng khám khác.</p>
                  </div>
                ) : (
                  doctorList.map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() => setSelectedDoctor(doc)}
                      className={`p-4 rounded-xl border-2 transition cursor-pointer flex items-start justify-between ${
                        selectedDoctor?.id === doc.id
                          ? 'border-blue-600 bg-blue-50/50'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                          {doc.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">{doc.name}</h4>
                            <span className="text-[11px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              {doc.room}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{doc.title}</p>
                          <div className="text-xs font-semibold text-emerald-600 mt-1">
                            Phí tư vấn: {doc.fee.toLocaleString('vi-VN')} đ
                          </div>
                        </div>
                      </div>
                      {selectedDoctor?.id === doc.id && <CheckCircle2 size={18} className="text-blue-600" />}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                2. Chọn Ngày Khám Bệnh:
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <input
                    type="date"
                    value={bookingDate}
                    min={getTodayISODate()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBookingDate(val);
                      const parts = val.split('-');
                      const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : val;
                      setSelectedSlot((prev) => ({ ...prev, date: formatted }));
                    }}
                    className="pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 cursor-pointer"
                  />
                  <Calendar size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
                <span className="text-xs text-blue-700 font-semibold bg-blue-50 px-3 py-2 rounded-xl border border-blue-200">
                  Ngày đã chọn: <strong>Ngày {selectedSlot.date}</strong>
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                3. Chọn Khung Giờ Khám (Time-slot):
              </label>

              {timeSlots.every((s) => s.disabled) && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-center gap-2 mb-3">
                  <AlertCircle size={16} className="text-amber-600 shrink-0" />
                  <span>
                    Hôm nay phòng khám đã kết thúc giờ nhận bệnh. Quý khách vui lòng chọn <strong>ngày mai ({formatISODateToVN(getTomorrowISODate())})</strong> hoặc các ngày tiếp theo để đặt lịch khám.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
                {timeSlots.map((slot) => {
                  const isSelected = selectedSlot.id === slot.id;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={slot.disabled}
                      onClick={() => setSelectedSlot({ id: slot.id, time: slot.time, date: selectedSlot.date })}
                      className={`p-2.5 sm:p-3 rounded-xl border text-center transition flex flex-col items-center justify-center min-w-0 ${
                        slot.disabled
                          ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-75'
                          : isSelected
                          ? 'border-blue-600 bg-blue-600 text-white shadow-sm cursor-pointer'
                          : 'border-slate-200 bg-white hover:border-blue-400 text-slate-700 cursor-pointer'
                      }`}
                    >
                      <span className="text-xs font-bold whitespace-nowrap tracking-tight">{slot.time}</span>
                      <span className={`text-[10px] mt-0.5 whitespace-nowrap font-medium ${isSelected ? 'text-blue-100' : slot.disabled ? 'text-slate-400' : 'text-emerald-600'}`}>
                        {slot.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>
              <button
                type="button"
                disabled={!selectedDoctor || !selectedSlot}
                onClick={() => setStep(3)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Tiếp tục nhập Triệu chứng</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Triệu Chứng & Spring AI Triage */}
        {step === 3 && (
          <form onSubmit={handleBook} className="mt-6 space-y-6">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Mô Tả Triệu Chứng & Cảm Giác Khó Chịu:
                </label>
                <button
                  type="button"
                  onClick={handleAnalyzeSymptoms}
                  disabled={analyzingAi || !symptoms.trim()}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 px-3 py-1.5 rounded-lg shadow-xs transition cursor-pointer disabled:opacity-50"
                  title="Nhận tư vấn chuyên khoa và gói khám phù hợp từ AI"
                >
                  <Sparkles size={13} className={analyzingAi ? "animate-spin" : ""} />
                  <span>{analyzingAi ? 'AI Đang Phân Tích...' : 'Trợ Lý AI Tư Vấn Gói Khám'}</span>
                </button>
              </div>
              <textarea
                rows={4}
                required
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                placeholder="Ví dụ: Nổi mẩn ngứa vùng cổ 2 ngày nay / Đau nhức răng hàm dưới / Bé 3 tuổi bị sốt nhẹ và biếng ăn..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-slate-800"
              />
              <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100 px-3 py-2 rounded-xl border border-slate-200 mt-2">
                <Sparkles size={14} className="text-purple-600 shrink-0" />
                <span>Trợ lý AI MedSched tự động phân tích triệu chứng để gợi ý đúng chuyên khoa, dịch vụ và lời dặn chuẩn bị trước khi đến khám.</span>
              </div>
            </div>

            {/* AI Summary Preview Card */}
            {aiPreview && (
              <div className={`border rounded-2xl p-4 space-y-3 ${
                (aiPreview as any).isEmergency 
                  ? 'bg-rose-50 border-rose-300' 
                  : 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200'
              }`}>
                {(aiPreview as any).isEmergency ? (
                  /* Emergency Warning Box */
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
                      <AlertCircle size={18} className="text-rose-600 shrink-0" />
                      <span>CẢNH BÁO AN TOÀN Y TẾ TỪ HỆ THỐNG PHÒNG KHÁM:</span>
                    </div>
                    <div className="bg-white p-3.5 rounded-xl border border-rose-200 text-xs text-rose-800 space-y-2">
                      <p className="font-semibold text-rose-900 leading-relaxed">
                        {(aiPreview as any).emergencyWarning || 'Phát hiện dấu hiệu cấp cứu đe dọa tính mạng! Phòng khám tư chỉ tiếp nhận ngoại trú. Vui lòng gọi 115 hoặc đến Bệnh viện Đa khoa gần nhất ngay lập tức.'}
                      </p>
                      <p className="text-[11px] text-slate-600 border-t border-rose-100 pt-1.5">
                        * Lời dặn sơ cứu: Giữ bệnh nhân ở tư thế an toàn, thông thoáng đường thở và không tự ý cho uống thuốc lạ.
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Normal Clinical Triage Evaluation */
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                        <Sparkles size={16} className="text-purple-600 shrink-0" />
                        <span>KẾT QUẢ TƯ VẤN TỪ TRỢ LÝ AI PHÒNG KHÁM MEDSCHED:</span>
                      </div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-300">
                        <CheckCircle2 size={11} className="text-emerald-600" />
                        Đã Phân Tích Xong
                      </span>
                    </div>
                    <div className="bg-white/90 backdrop-blur-xs p-3.5 rounded-xl text-xs text-slate-700 border border-purple-100 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-slate-100">
                        <div>
                          <span className="text-slate-500">Chuyên khoa phù hợp: </span>
                          <strong className="text-purple-900 font-bold">
                            {(aiPreview as any).specialtyName || (aiPreview as any).specialty || 'Nội Khoa Tổng Quát'}
                          </strong>
                        </div>
                        {(aiPreview as any).estimatedFee && (
                          <div className="bg-purple-100 text-purple-800 text-[11px] font-bold px-2 py-0.5 rounded-md">
                            Phí khám: {(aiPreview as any).estimatedFee}
                          </div>
                        )}
                      </div>

                      {(aiPreview as any).recommendedService && (
                        <div>
                          <span className="text-slate-500">Gói khám đề xuất: </span>
                          <strong className="text-indigo-800 font-semibold">{(aiPreview as any).recommendedService}</strong>
                        </div>
                      )}

                      {(aiPreview as any).preparationAdvice && (
                        <div className="bg-blue-50 border border-blue-200 text-blue-900 p-2.5 rounded-lg text-[11px] space-y-0.5">
                          <span className="font-bold block text-blue-950">📋 Dặn dò chuẩn bị trước khi đến khám:</span>
                          <p>{(aiPreview as any).preparationAdvice}</p>
                        </div>
                      )}

                      <div className="text-slate-600 italic text-[11px]">
                        <strong>Tóm tắt bệnh sử (gửi Bác sĩ):</strong> {(aiPreview as any).clinicalSummary || aiPreview.summary}
                      </div>

                      <p className="text-[10px] text-slate-500 pt-1">
                        * {(aiPreview as any).disclaimer || 'Kết quả tư vấn mang tính chất tham khảo dịch vụ, vui lòng trao đổi trực tiếp với bác sĩ khi thăm khám.'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Appointment Booking Summary Summary */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2 text-slate-600">
              <div className="font-bold text-slate-800 text-sm mb-1">Xác nhận thông tin đặt khám:</div>
              <div className="grid grid-cols-2 gap-2">
                <div>Bác sĩ: <strong className="text-slate-800">{selectedDoctor?.name || 'Bác sĩ chuyên khoa'}</strong></div>
                <div>Phòng khám: <strong className="text-slate-800">{selectedDoctor?.room || 'Phòng khám chuyên khoa'}</strong></div>
                <div>Khung giờ: <strong className="text-blue-600">{selectedSlot.time} • Ngày {selectedSlot.date}</strong></div>
                <div>Giá khám tư vấn: <strong className="text-emerald-600">{Number(selectedDoctor?.fee || 200000).toLocaleString('vi-VN')} đ</strong></div>
              </div>
            </div>

            <div className="pt-4 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-medium text-sm transition cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition shadow-sm flex items-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Đang khóa slot & tạo vé khám...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Xác Nhận & Xuất Vé Khám</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Vé Hẹn Khám Điện Tử (E-Ticket) */}
        {step === 4 && result && (
          <div className="mt-4 space-y-6">
            <div className="bg-gradient-to-b from-blue-600 to-indigo-700 text-white p-6 rounded-t-3xl relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={24} className="text-cyan-300" />
                  <span className="font-bold tracking-wider text-sm uppercase">Phòng Khám Đa Khoa MedSched</span>
                </div>
                <span className="text-xs bg-white/20 px-2.5 py-1 rounded-full font-mono font-bold">VÉ KHÁM ĐIỆN TỬ</span>
              </div>
              <div className="mt-4 text-center relative z-10">
                <span className="text-xs text-blue-200 uppercase tracking-wider">Số Thứ Tự Vào Khám</span>
                <div className="text-4xl font-extrabold text-white mt-0.5 tracking-tight">
                  STT #{result.queueNumber || '02'}
                </div>
                <div className="text-xs text-cyan-200 mt-1">Mã đặt chỗ: <strong className="font-mono text-white text-sm">{result.bookingCode}</strong></div>
              </div>
            </div>

            {/* Ticket body */}
            <div className="bg-white border-2 border-dashed border-slate-200 p-6 rounded-b-3xl -mt-6 pt-8 space-y-4 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-4 border-b border-slate-100">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-xs text-slate-400 block">Bác sĩ chuyên khoa:</span>
                    <strong className="text-slate-800 font-semibold">{selectedDoctor?.name || 'Bác sĩ chuyên khoa'}</strong>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Địa điểm & Phòng khám:</span>
                    <span className="text-slate-700 font-medium">{selectedDoctor?.room || 'Phòng khám chuyên khoa'}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 block">Khung giờ hẹn:</span>
                    <span className="text-blue-600 font-bold">{selectedSlot.time} • Ngày {selectedSlot.date}</span>
                  </div>
                </div>

                {/* Real Scannable Offline QR Code */}
                <div className="flex flex-col items-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="w-28 h-28 bg-white border border-slate-300 rounded-xl p-1.5 flex items-center justify-center shadow-inner">
                    <QrCodeImage value={result.bookingCode} size={96} className="rounded-lg" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-slate-700 mt-2 bg-slate-200/80 px-2.5 py-0.5 rounded">
                    {result.bookingCode}
                  </span>
                  <span className="text-[9px] text-emerald-600 font-bold mt-1">
                    ✓ Quét được bằng Camera
                  </span>
                </div>
              </div>

              {/* VietQR Payment Action Box */}
              <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-200 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <CreditCard size={15} />
                    <span>Thanh Toán Trực Tuyến Qua VietQR (Napas 247):</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {isPaidOnline
                      ? '✓ Quý khách đã xác nhận chuyển khoản chi phí khám thành công.'
                      : 'Thanh toán tiền khám trước (200.000đ) để nhận số khám ưu tiên không cần chờ quầy thu ngân.'}
                  </p>
                </div>
                {isPaidOnline ? (
                  <span className="inline-flex items-center gap-1 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs whitespace-nowrap">
                    <CheckCircle2 size={14} /> ĐÃ THANH TOÁN
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-700/20 transition cursor-pointer flex items-center justify-center gap-2 whitespace-nowrap"
                  >
                    <QrCode size={15} />
                    <span>Quét Mã VietQR (200.000đ)</span>
                  </button>
                )}
              </div>

              {/* AI Clinical Summary on ticket */}
              {result.aiSummary && (
                <div className="bg-purple-50 border border-purple-200 p-3 rounded-xl text-xs text-purple-900 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1 font-bold text-purple-800">
                      <Sparkles size={13} className="text-purple-600" />
                      <span>Tóm Tắt Bệnh Án Điện Tử Từ Spring AI:</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-300">
                      ✓ Đã Phân Tích
                    </span>
                  </div>
                  <p className="italic text-slate-700">🤖 {result.aiSummary}</p>
                </div>
              )}

              <div className="text-xs text-slate-500 bg-amber-50 p-3 rounded-xl border border-amber-200 flex items-start gap-2">
                <span className="text-base leading-none">💡</span>
                <span>
                  <strong>Hướng dẫn tiếp đón:</strong> Quý khách vui lòng có mặt trước 10 phút và quét mã QR vé này hoặc đưa thẻ CCCD gắn chip tại Quầy Tiếp Đón để vào thẳng buồng khám.
                </span>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 bg-slate-800 hover:bg-slate-900 text-white font-semibold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={16} />
                  <span>In Phiếu / Lưu PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResult(null);
                    setStep(1);
                  }}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Calendar size={16} />
                  <span>Đặt ca khám mới</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Overlay Khóa Đa Tab (Single Tab Enforcement) ── */}
      <SingleTabLockOverlay
        isBlocked={isBlocked}
        moduleName="Cổng Đặt Lịch Khám Trực Tuyến"
        onTakeOver={handleTakeOver}
        description="Để tránh xung đột khóa giữ chỗ (Optimistic Slot Locking) và ngăn ngừa đặt trùng lịch hẹn, hệ thống chỉ cho phép bạn thao tác trên 1 tab duy nhất."
      />

      {/* ── Modal Thanh Toán VietQR ── */}
      {result && (
        <VietQrModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onConfirmSuccess={() => setIsPaidOnline(true)}
          amount={200000}
          bookingCode={result.bookingCode}
          patientName={result.patientName || 'Bệnh nhân'}
          description={`Thanh toán tiền khám bệnh phiếu ${result.bookingCode}`}
        />
      )}
    </div>
  );
}
