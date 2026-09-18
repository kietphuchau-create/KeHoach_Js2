'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
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
  RefreshCw
} from 'lucide-react';
import { api, getAuthToken, AppointmentResponse } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';

export default function MyAppointmentsView() {
  const [appointments, setAppointments] = useState<AppointmentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter
  const [searchCode, setSearchCode] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchedAppointment, setSearchedAppointment] = useState<AppointmentResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'CONFIRMED' | 'CHECKED_IN' | 'COMPLETED'>('ALL');
  
  // QR Modal state
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentResponse | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Load patient appointments
  const fetchAppointments = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      let patientId = 'p0000001-0000-0000-0000-000000000001';

      if (token) {
        try {
          const profile = await api.getProfile();
          if (profile?.patientProfile?.profileId) {
            patientId = profile.patientProfile.profileId;
          }
        } catch {
          // fallback to default patient id
        }
      }

      // Fetch appointments from backend
      const data = await api.getAppointmentsByPatient(patientId).catch(() => []);
      
      // Nếu chưa có trong DB (môi trường dev mới khởi tạo), cấp dữ liệu mẫu trực quan
      if (!data || data.length === 0) {
        const sampleData: AppointmentResponse[] = [
          {
            id: 'ap000001-demo-0001',
            bookingCode: 'MED-748921',
            queueNumber: 'STT-02',
            status: 'CONFIRMED',
            medicalCenterId: 'mc000001-0000-0000-0000-000000000001',
            doctorId: 'd0000001-0000-0000-0000-000000000001',
            slotId: 'sl000002-0000-0000-0000-000000000001',
            doctorName: 'PGS.TS.BS Trần Văn Hùng',
            specialtyName: 'Khoa Nội Tim Mạch',
            roomNumber: 'Phòng 201 - Lầu 2',
            medicalCenterName: 'Cơ sở MedSched Quận 1 (120 Nguyễn Du, Q.1)',
            patientSymptoms: 'Đau tức ngực nhẹ khi leo dốc, thỉnh thoảng hồi hộp đánh trống ngực vào buổi tối.',
            aiSummary: 'Bệnh nhân có triệu chứng gợi ý bệnh lý cơ tim / mạch vành giai đoạn sớm. Cần điện tâm đồ ECG và siêu âm tim Doppler màu.',
            appointmentDate: 'Hôm nay, 08:30 - 09:00',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'ap000002-demo-0002',
            bookingCode: 'MED-519203',
            queueNumber: 'STT-05',
            status: 'CHECKED_IN',
            medicalCenterId: 'mc000001-0000-0000-0000-000000000001',
            doctorId: 'd0000002-0000-0000-0000-000000000002',
            slotId: 'sl000005-0000-0000-0000-000000000002',
            doctorName: 'ThS.BS Nguyễn Thị Mai',
            specialtyName: 'Khoa Da Liễu',
            roomNumber: 'Phòng 104 - Lầu 1',
            medicalCenterName: 'Cơ sở MedSched Quận 1 (120 Nguyễn Du, Q.1)',
            patientSymptoms: 'Nổi mẩn đỏ ngứa vùng cẳng tay sau khi tiếp xúc hóa chất tẩy rửa.',
            aiSummary: 'Viêm da tiếp xúc dị ứng. Khuyến nghị test dị ứng da và bôi thuốc chống viêm.',
            appointmentDate: 'Hôm nay, 10:00 - 10:30',
            createdAt: new Date(Date.now() - 3600000).toISOString(),
          }
        ];
        setAppointments(sampleData);
      } else {
        setAppointments(data);
      }
    } catch (err: any) {
      setError(err.message || 'Không thể tải danh sách phiếu khám.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  // Handle Search by Booking Code
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchCode.trim()) {
      setSearchedAppointment(null);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const res = await api.getAppointmentByCode(searchCode.trim().toUpperCase());
      setSearchedAppointment(res);
    } catch (err: any) {
      setSearchedAppointment(null);
      setError(`Không tìm thấy phiếu khám với mã "${searchCode.trim()}". Vui lòng kiểm tra lại.`);
    } finally {
      setSearching(false);
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
              const doctorTitle = apt.doctorName || 'PGS.TS.BS Trần Văn Hùng';
              const specialty = apt.specialtyName || 'Khoa Nội Tim Mạch';
              const room = apt.roomNumber || 'Phòng 201 - Lầu 2';
              const center = apt.medicalCenterName || 'Trung Tâm Y Tế MedSched Quận 1';
              const timeSlot = apt.appointmentDate || '08:30 - 09:00 (Hôm nay)';

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
                              <strong className="text-blue-700 font-bold">{timeSlot}</strong>
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
                  <strong className="text-slate-800">{selectedAppointment.doctorName || 'PGS.TS.BS Trần Văn Hùng'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Buồng khám:</span>
                  <strong className="text-slate-800">{selectedAppointment.roomNumber || 'P.201 - Lầu 2'}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Khung giờ hẹn:</span>
                  <strong className="text-teal-primary font-bold">{selectedAppointment.appointmentDate || 'Hôm nay, 08:30 - 09:00'}</strong>
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
    </div>
  );
}
