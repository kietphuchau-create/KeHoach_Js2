'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  Search, 
  QrCode, 
  Printer, 
  Copy, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  Stethoscope, 
  PlusCircle, 
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { api, getAuthToken, AppointmentResponse } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';

const SLOT_MAP: Record<string, { time: string; date?: string }> = {
  '99999999-9999-9999-9999-999999999991': { time: '09:00 - 09:30', date: '10/09/2026' },
  '99999999-9999-9999-9999-999999999992': { time: '14:00 - 14:30', date: '21/09/2026' },
  'sl000001-0000-0000-0000-000000000001': { time: '08:00 - 08:30' },
  'sl000002-0000-0000-0000-000000000001': { time: '08:30 - 09:00' },
  'sl000003-0000-0000-0000-000000000001': { time: '09:00 - 09:30' },
  'sl000004-0000-0000-0000-000000000001': { time: '09:30 - 10:00' },
  'sl000005-0000-0000-0000-000000000001': { time: '14:00 - 14:30' },
  'sl000006-0000-0000-0000-000000000001': { time: '14:30 - 15:00' },
};

const formatDisplayDate = (dateVal?: string | Date) => {
  if (!dateVal) {
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    return `Ngày ${d}/${m}/${y}`;
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) {
    const str = String(dateVal).replace('(Hôm nay)', '').replace('Hôm nay,', '').trim();
    return str.startsWith('Ngày') ? str : `Ngày ${str}`;
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `Ngày ${day}/${month}/${year}`;
};

const resolveAppointmentDate = (apt: AppointmentResponse): string => {
  if (apt.appointmentDate) return formatDisplayDate(apt.appointmentDate);

  // 1. Nếu slot có ngày được định nghĩa cụ thể
  if (apt.slotId && SLOT_MAP[apt.slotId]?.date) {
    return `Ngày ${SLOT_MAP[apt.slotId].date}`;
  }

  // 2. Nếu ca đã hoàn tất hoặc có checkInTime, ngày khám là ngày tiếp đón/hoàn tất trong quá khứ
  if (apt.checkInTime) {
    return formatDisplayDate(apt.checkInTime);
  }

  // 3. Nếu booking code theo chuẩn MS + YYMMDD
  if (apt.bookingCode && /^MS\d{6}/i.test(apt.bookingCode)) {
    const yy = apt.bookingCode.slice(2, 4);
    const mm = apt.bookingCode.slice(4, 6);
    const dd = apt.bookingCode.slice(6, 8);
    return `Ngày ${dd}/${mm}/20${yy}`;
  }

  return formatDisplayDate(apt.createdAt);
};

const resolveSlotTime = (apt: AppointmentResponse): string => {
  if (apt.slotTime) return apt.slotTime;
  if (apt.slotId && SLOT_MAP[apt.slotId]?.time) {
    return SLOT_MAP[apt.slotId].time;
  }
  return '08:30 - 09:00';
};

export default function MyAppointmentsView() {
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchedAppointment, setSearchedAppointment] = useState<AppointmentResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED' | 'CANCELLED'>('ALL');
  
  // QR Modal state
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Cancellation state
  const [cancelingAppointment, setCancelingAppointment] = useState<AppointmentResponse | null>(null);
  const [cancelReason, setCancelReason] = useState('Bận việc đột xuất không thể đến khám');
  const [cancelingLoading, setCancelingLoading] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  // Load patient appointments
  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      if (!token) return;

      let patientId = '';
      try {
        const profile = await api.getProfile();
        if (profile?.patientProfile?.profileId) {
          patientId = profile.patientProfile.profileId;
        }
      } catch {
        // fallback to default patient id
      }

      if (!patientId) {
        setAppointments([]);
        return;
      }

      // Fetch appointments, doctors and centers concurrently from backend
      const [data, docList, centerList] = await Promise.all([
        api.getAppointmentsByPatient(patientId).catch(() => []),
        api.getDoctors().catch(() => []),
        api.getMedicalCenters().catch(() => []),
      ]);

      const docMap = new Map((docList || []).map((d: any) => [d.id, d]));
      const centerMap = new Map((centerList || []).map((c: any) => [c.id, c]));

      const enriched = (data || []).map((apt: any) => {
        const doc = docMap.get(apt.doctorId);
        const center = centerMap.get(apt.medicalCenterId);
        return {
          ...apt,
          doctorName: apt.doctorName || (doc ? `${doc.academicTitle ? doc.academicTitle + ' ' : ''}${doc.fullName}` : undefined),
          specialtyName: apt.specialtyName || doc?.specialtyName,
          roomNumber: apt.roomNumber || doc?.roomNumber,
          medicalCenterName: apt.medicalCenterName || center?.name,
        };
      });

      setAppointments(enriched);
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách phiếu khám.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login?redirect=/my-appointments&reason=auth_required');
      return;
    }
    setAuthChecking(false);
    fetchAppointments();
  }, [router]);

  // Handle Search by Booking Code
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchCode.trim().toUpperCase();
    if (!query) {
      setSearchedAppointment(null);
      return;
    }
    setSearching(true);
    setError(null);

    // 1. Kiểm tra trong danh sách hiện tại trước
    const foundLocal = appointments.find(
      (a) => a.bookingCode?.toUpperCase() === query || a.id?.toUpperCase() === query
    );
    if (foundLocal) {
      setSearchedAppointment(foundLocal);
      setSearching(false);
      return;
    }

    // 2. Tra cứu từ API backend
    try {
      const res = await api.getAppointmentByCode(query);
      if (res && res.bookingCode) {
        setSearchedAppointment(res);
      } else {
        throw new Error('Không tìm thấy');
      }
    } catch {
      setSearchedAppointment(null);
      setError(`Không tìm thấy phiếu khám với mã "${searchCode.trim()}". Vui lòng kiểm tra lại.`);
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelingAppointment?.id) return;
    setCancelingLoading(true);
    setError(null);
    setCancelSuccessMsg(null);
    try {
      await api.cancelAppointment(cancelingAppointment.id, cancelReason);
      setCancelSuccessMsg(`Đã hủy lịch khám cho phiếu "${cancelingAppointment.bookingCode}" thành công!`);
      // Cập nhật trạng thái sang CANCELLED
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === cancelingAppointment.id || a.bookingCode === cancelingAppointment.bookingCode
            ? { ...a, status: 'CANCELLED' }
            : a
        )
      );
      if (searchedAppointment && (searchedAppointment.id === cancelingAppointment.id || searchedAppointment.bookingCode === cancelingAppointment.bookingCode)) {
        setSearchedAppointment((prev) => prev ? { ...prev, status: 'CANCELLED' } : null);
      }
      setCancelingAppointment(null);
    } catch (err: any) {
      setError(err.message || 'Hủy lịch hẹn thất bại. Vui lòng thử lại.');
    } finally {
      setCancelingLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const handlePrint = (apt: AppointmentResponse) => {
    setSelectedAppointment(apt);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Filter items
  const displayList = searchedAppointment 
    ? [searchedAppointment]
    : appointments.filter((apt) => {
        if (activeTab === 'ALL') return true;
        return apt.status === activeTab;
      });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Đã Xác Nhận Hẹn
          </span>
        );
      case 'CHECKED_IN':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            Đã Tiếp Nhận Quầy
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Check size={13} className="text-purple-600" />
            Khám Hoàn Tất
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <X size={13} className="text-rose-600" />
            Đã Hủy Lịch
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
            {status || 'ĐANG XỬ LÝ'}
          </span>
        );
    }
  };

  if (authChecking) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center py-20">
        <LoadingSpinner size={36} message="Đang kiểm tra quyền truy cập phiếu khám..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Header Title Section */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl border border-mint-light shadow-xs">
          <div>
            <div className="flex items-center gap-2 text-teal-primary text-xs font-bold uppercase tracking-wider mb-1">
              <Calendar size={16} />
              <span>Hồ Sơ Y Tế Cá Nhân</span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Phiếu Khám Của Tôi & Lịch Sử Hẹn
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Theo dõi lịch hẹn khám bệnh, lấy mã QR check-in tại quầy tiếp đón MedSched.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchAppointments}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-pine-teal bg-mint-soft hover:bg-mint-light px-3.5 py-2 rounded-xl transition border border-mint-light cursor-pointer"
              title="Tải lại danh sách"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              <span>Làm mới</span>
            </button>
            <Link
              href="/booking"
              className="flex items-center gap-2 text-xs font-bold text-white bg-pine-teal hover:bg-pine-teal-hover px-4 py-2 rounded-xl shadow-xs transition cursor-pointer"
            >
              <PlusCircle size={15} />
              <span>Đặt Lịch Khám Mới</span>
            </Link>
          </div>
        </div>

        {/* Quick Search By Booking Code */}
        <div className="bg-gradient-to-r from-mint-soft via-white to-mint-soft p-5 rounded-2xl border border-mint-light shadow-xs">
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchCode}
                onChange={(e) => setSearchCode(e.target.value)}
                placeholder="Tra cứu nhanh theo Mã đặt lịch (Ví dụ: MED-748921 hoặc MED-519203)..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-mint-light rounded-xl text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-primary/30 focus:border-teal-primary transition"
              />
              {searchCode && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchCode('');
                    setSearchedAppointment(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={searching}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-teal-primary hover:bg-pine-teal text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
            >
              {searching ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Search size={15} />
              )}
              <span>Tra Cứu Phiếu Hẹn</span>
            </button>
          </form>
          {searchedAppointment && (
            <div className="mt-3 flex items-center justify-between text-xs bg-mint-light/60 text-pine-teal px-3.5 py-2 rounded-xl border border-mint-light font-medium">
              <span>Đang hiển thị kết quả tìm kiếm cho mã: <strong>{searchedAppointment.bookingCode}</strong></span>
              <button
                onClick={() => {
                  setSearchCode('');
                  setSearchedAppointment(null);
                }}
                className="text-xs font-bold underline hover:text-pine-teal-hover cursor-pointer"
              >
                Xem tất cả phiếu khám
              </button>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        {!searchedAppointment && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {[
              { key: 'ALL', label: 'Tất Cả Phiếu Khám' },
              { key: 'CONFIRMED', label: 'Sắp Tới (Đã Xác Nhận)' },
              { key: 'CHECKED_IN', label: 'Đã Tiếp Nhận Quầy' },
              { key: 'COMPLETED', label: 'Đã Hoàn Tất' },
              { key: 'CANCELLED', label: 'Đã Hủy Lịch' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-pine-teal text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:text-pine-teal hover:bg-mint-soft border border-mint-light'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Success Alert */}
        {cancelSuccessMsg && (
          <AlertMessage
            type="success"
            message={cancelSuccessMsg}
            onClose={() => setCancelSuccessMsg(null)}
          />
        )}

        {/* Error Alert */}
        {error && (
          <AlertMessage
            type="error"
            message={error}
            onClose={() => setError(null)}
          />
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="py-16">
            <LoadingSpinner size={36} message="Đang tải danh sách phiếu khám của bạn..." />
          </div>
        )}

        {/* Empty State */}
        {!loading && displayList.length === 0 && (
          <div className="bg-white rounded-2xl border border-mint-light p-12 text-center shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-mint-soft text-teal-primary flex items-center justify-center mx-auto">
              <Calendar size={32} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800">Chưa có phiếu khám nào</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                {activeTab !== 'ALL'
                  ? `Không có cuộc hẹn nào ở trạng thái ${activeTab}.`
                  : 'Bạn chưa đặt lịch hẹn khám nào hoặc chưa có phiếu khám trong danh mục.'}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/booking"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-pine-teal hover:bg-pine-teal-hover text-white text-xs font-bold transition shadow-xs"
              >
                <PlusCircle size={15} />
                <span>Đặt Lịch Khám Ngay</span>
              </Link>
            </div>
          </div>
        )}

        {/* Appointments List */}
        {!loading && displayList.length > 0 && (
          <div className="space-y-4">
            {displayList.map((apt) => {
              const doctorTitle = apt.doctorName || 'Bác sĩ chuyên khoa';
              const specialty = apt.specialtyName || 'Chuyên khoa';
              const room = apt.roomNumber || 'Phòng khám chuyên khoa';
              const center = apt.medicalCenterName || 'Cơ sở Y tế MedSched';
              const slotTime = resolveSlotTime(apt);
              const appointmentDateStr = resolveAppointmentDate(apt);

              return (
                <div
                  key={apt.id || apt.bookingCode}
                  className="bg-white rounded-2xl border border-mint-light hover:border-teal-primary/40 shadow-xs hover:shadow-sm transition-all overflow-hidden"
                >
                  {/* Top Bar of Card */}
                  <div className="bg-mint-soft/70 px-6 py-3 border-b border-mint-light flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-400 font-medium">Mã đặt lịch:</span>
                        <span className="font-mono font-bold text-pine-teal text-sm bg-white px-2 py-0.5 rounded border border-mint-light shadow-2xs">
                          {apt.bookingCode}
                        </span>
                        <button
                          onClick={() => copyToClipboard(apt.bookingCode)}
                          className="text-slate-400 hover:text-teal-primary p-1 rounded transition cursor-pointer"
                          title="Sao chép mã"
                        >
                          {copiedCode === apt.bookingCode ? (
                            <Check size={14} className="text-emerald-600" />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      </div>

                      {/* Queue Number Badge */}
                      <span className="text-xs font-extrabold bg-teal-primary text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                        {apt.queueNumber || 'STT-01'}
                      </span>
                    </div>

                    <div>
                      {getStatusBadge(apt.status)}
                    </div>
                  </div>

                  {/* Body of Card */}
                  <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    {/* Left & Middle Info (2 Cols) */}
                    <div className="lg:col-span-2 space-y-4">
                      {/* Doctor & Clinic */}
                      <div className="flex items-start gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-mint-light text-pine-teal flex items-center justify-center shrink-0 border border-teal-primary/20">
                          <Stethoscope size={24} />
                        </div>
                        <div className="space-y-1">
                          <div className="text-xs font-bold text-teal-primary uppercase tracking-wide">
                            {specialty}
                          </div>
                          <h3 className="text-base font-extrabold text-slate-900 leading-tight">
                            {doctorTitle}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 pt-0.5">
                            <span className="flex items-center gap-1 font-semibold text-slate-700">
                              <Building2 size={13} className="text-teal-primary" />
                              {room}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock size={13} className="text-blue-600" />
                              <strong className="text-blue-700 font-bold">{slotTime}</strong>
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-pine-teal">
                              <Calendar size={13} className="text-teal-primary" />
                              <strong>{appointmentDateStr}</strong>
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 pt-0.5">{center}</p>
                        </div>
                      </div>

                      {/* Symptoms */}
                      {apt.patientSymptoms && (
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                          <span className="font-bold text-slate-800 block text-[11px] uppercase tracking-wider text-slate-500">
                            Triệu chứng ban đầu:
                          </span>
                          <p className="italic">{apt.patientSymptoms}</p>
                        </div>
                      )}

                      {/* Spring AI Clinical Assessment */}
                      {apt.aiSummary && (
                        <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-purple-50 p-3.5 rounded-xl border border-purple-200 text-xs text-purple-900 space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-purple-800 text-[11px] uppercase tracking-wider">
                            <Sparkles size={14} className="text-purple-600" />
                            <span>Tóm tắt lâm sàng từ Spring AI:</span>
                          </div>
                          <p className="text-slate-700 leading-relaxed text-xs">
                            {apt.aiSummary}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Actions & QR Voucher Button (1 Col) */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-center justify-center gap-3 p-4 bg-mint-soft/50 rounded-2xl border border-mint-light h-full">
                      {/* Interactive QR Button */}
                      <button
                        onClick={() => setSelectedAppointment(apt)}
                        className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white hover:bg-mint-light text-pine-teal border border-teal-primary/30 rounded-xl font-bold text-xs shadow-2xs transition group cursor-pointer"
                      >
                        <QrCode size={18} className="text-teal-primary group-hover:scale-110 transition" />
                        <span>Mã QR Check-in Quầy</span>
                      </button>

                      <button
                        onClick={() => handlePrint(apt)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-semibold text-xs shadow-2xs transition cursor-pointer"
                      >
                        <Printer size={15} />
                        <span>In Phiếu Khám</span>
                      </button>

                      {apt.status === 'CONFIRMED' && (
                        <button
                          onClick={() => setCancelingAppointment(apt)}
                          className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold text-xs transition cursor-pointer"
                        >
                          <X size={14} />
                          <span>Hủy Lịch Hẹn Này</span>
                        </button>
                      )}

                      <div className="text-[11px] text-center text-slate-400 pt-1">
                        Quét mã QR tại Quầy Tiếp Đón để vào khám không cần xếp hàng lấy số
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Code Check-in Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-mint-light flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-pine-teal to-teal-primary text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck size={22} className="text-mint-light" />
                <div>
                  <h3 className="font-extrabold text-sm tracking-wide uppercase">Vé Khám Bệnh Điện Tử</h3>
                  <p className="text-[10px] text-mint-soft">MedSched Smart Hospital System</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 text-center space-y-4">
              
              {/* STT & Code */}
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Số thứ tự tiếp đón</span>
                <div className="text-3xl font-black text-pine-teal mt-0.5 tracking-tight">
                  {selectedAppointment.queueNumber || 'STT-01'}
                </div>
                <div className="inline-flex items-center gap-1.5 mt-1 bg-mint-soft px-3 py-1 rounded-full border border-mint-light">
                  <span className="text-xs font-mono font-bold text-teal-primary">
                    {selectedAppointment.bookingCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(selectedAppointment.bookingCode)}
                    className="text-slate-400 hover:text-teal-primary transition cursor-pointer"
                  >
                    {copiedCode === selectedAppointment.bookingCode ? (
                      <Check size={12} className="text-emerald-600" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>

              {/* High-res Scannable QR Code */}
              <div className="p-4 bg-white border-2 border-dashed border-teal-primary/30 rounded-2xl inline-block shadow-inner">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    selectedAppointment.bookingCode
                  )}`}
                  alt={`QR Code ${selectedAppointment.bookingCode}`}
                  className="w-48 h-48 object-contain rounded-lg mx-auto"
                />
              </div>

              {/* Instructions */}
              <div className="bg-mint-soft p-3.5 rounded-xl border border-mint-light text-left text-xs space-y-1 text-slate-700">
                <div className="font-bold text-pine-teal flex items-center gap-1">
                  <Clock size={13} />
                  <span>Hướng dẫn tiếp đón:</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Khi đến phòng khám, vui lòng xuất trình mã QR này tại <strong>Quầy Tiếp Đón</strong> (hoặc Kiosk tự phục vụ) để hệ thống tự động in số thứ tự khám và thông báo tới Bác sĩ phụ trách.
                </p>
              </div>

              {/* Details */}
              <div className="text-xs text-slate-600 space-y-1 border-t border-slate-100 pt-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Bác sĩ phụ trách:</span>
                  <strong className="text-slate-800">{selectedAppointment.doctorName || 'Bác sĩ chuyên khoa'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Buồng khám:</span>
                  <strong className="text-slate-800">{selectedAppointment.roomNumber || 'Phòng khám chuyên khoa'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Khung giờ &amp; Ngày hẹn:</span>
                  <strong className="text-teal-primary font-bold">
                    {resolveSlotTime(selectedAppointment)} • {resolveAppointmentDate(selectedAppointment)}
                  </strong>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Printer size={15} />
                <span>In Vé Này</span>
              </button>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="flex-1 px-4 py-2.5 bg-pine-teal hover:bg-pine-teal-hover text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Đã Hiểu & Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {cancelingAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-rose-100 flex flex-col p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600 font-bold text-sm">
                <AlertCircle size={20} />
                <span>Xác Nhận Hủy Lịch Khám</span>
              </div>
              <button
                onClick={() => setCancelingAppointment(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <div className="text-xs text-slate-600 space-y-2">
              <p>
                Bạn có chắc chắn muốn hủy lịch hẹn mã <strong className="font-mono text-slate-800">{cancelingAppointment.bookingCode}</strong> ({cancelingAppointment.doctorName || 'Bác sĩ chuyên khoa'}) không?
              </p>
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-100 text-[11px] text-rose-700">
                Lưu ý: Sau khi hủy, khung giờ khám này sẽ được mở lại cho người bệnh khác. Thao tác này không thể hoàn tác.
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">Lý do hủy hẹn:</label>
              <select
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-rose-500/20"
              >
                <option value="Bận việc đột xuất không thể đến khám">Bận việc đột xuất không thể đến khám</option>
                <option value="Sức khỏe đã ổn định, không cần khám nữa">Sức khỏe đã ổn định, không cần khám nữa</option>
                <option value="Đã đặt trùng hoặc muốn đổi bác sĩ / ngày khác">Đã đặt trùng hoặc muốn đổi bác sĩ / ngày khác</option>
                <option value="Lý do cá nhân khác">Lý do cá nhân khác</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelingAppointment(null)}
                disabled={cancelingLoading}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
              >
                Giữ Lại Lịch Hẹn
              </button>
              <button
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelingLoading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {cancelingLoading ? 'Đang Xử Lý...' : 'Xác Nhận Hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
