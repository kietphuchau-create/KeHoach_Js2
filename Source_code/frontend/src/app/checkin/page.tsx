'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle2, 
  QrCode, 
  Clock, 
  MapPin, 
  Stethoscope, 
  User, 
  Printer, 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle,
  Building2,
  Calendar,
  Sparkles,
  Camera,
  ExternalLink,
  ShieldCheck,
  CreditCard
} from 'lucide-react';
import { api, AppointmentResponse } from '@/shared/lib/api';
import { cleanDoctorFullName } from '@/shared/lib/formatters';
import { QrCodeImage } from '@/shared/components/QrCodeImage';
import { QrCameraScannerModal, QrScanResult } from '@/shared/components/QrCameraScannerModal';

function CheckinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const codeParam = searchParams.get('code') || '';

  const [inputCode, setInputCode] = useState(codeParam);
  const [appointment, setAppointment] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);

  // Tự động tải thông tin ca khám nếu URL có param ?code=...
  useEffect(() => {
    if (codeParam) {
      setInputCode(codeParam);
      handleLookup(codeParam);
    }
  }, [codeParam]);

  const handleLookup = async (codeToSearch: string) => {
    const clean = codeToSearch.trim();
    if (!clean) return;

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const data = await api.getAppointmentByCode(clean);
      if (!data) {
        throw new Error(`Không tìm thấy lịch hẹn với mã: ${clean}`);
      }
      setAppointment(data);
      if (data.status === 'CHECKED_IN' || (data as any).status === 'IN_PROGRESS' || (data as any).status === 'COMPLETED') {
        setSuccessMessage('Lịch hẹn này đã được tiếp đón tại quầy trước đó.');
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tra cứu thông tin vé hẹn. Vui lòng thử lại.');
      setAppointment(null);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCheckin = async () => {
    if (!appointment && !inputCode) return;
    const targetCode = appointment?.bookingCode || inputCode.trim();

    setCheckingIn(true);
    setError(null);

    try {
      const res = await api.checkInQr(targetCode);
      setAppointment((prev: any) => ({
        ...(prev || {}),
        ...res,
        status: 'CHECKED_IN',
        checkInTime: res.checkInTime || new Date().toISOString(),
      }));

      setSuccessMessage('Tiếp đón thành công! Quý khách đã được đưa vào hàng đợi khám.');

      // Bắn tín hiệu đồng bộ buồng khám Bác sĩ & Quầy tiếp đón ngay lập tức
      try {
        const syncChannel = new BroadcastChannel('medsched_queue_sync');
        syncChannel.postMessage({ type: 'QUEUE_UPDATED', bookingCode: targetCode });
        syncChannel.close();
      } catch {}

      // Phát âm thanh bíp hoàn thành
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, ctx.currentTime);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.25);
        }
      } catch {}
    } catch (err: any) {
      setError(err?.message || 'Xác nhận tiếp đón thất bại. Vui lòng liên hệ nhân viên tại quầy.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleScannerSuccess = (scan: QrScanResult) => {
    if (scan.bookingCode) {
      setInputCode(scan.bookingCode);
      router.push(`/checkin?code=${encodeURIComponent(scan.bookingCode)}`);
      handleLookup(scan.bookingCode);
    } else if (scan.cccdNumber) {
      setError(`Mã quét là thẻ CCCD (${scan.cccdNumber}). Vui lòng xuất trình tại Quầy Tiếp Đón Lễ Tân để tiếp đón bằng CCCD.`);
    }
  };

  const isAlreadyCheckedIn = appointment?.status === 'CHECKED_IN' || appointment?.status === 'IN_PROGRESS' || appointment?.status === 'COMPLETED';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/my-appointments" className="flex items-center gap-2 text-slate-600 hover:text-emerald-700 text-xs font-bold transition">
            <ArrowLeft size={16} />
            <span>Lịch hẹn của tôi</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-sm shadow-emerald-600/30">
              M
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 leading-tight">MedSched Check-in</h1>
              <p className="text-[10px] text-slate-400 font-medium">Hệ thống Tiếp Đón &amp; Cấp Số Khám Tự Động</p>
            </div>
          </div>
          <Link
            href="/reception"
            className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg border border-emerald-200 transition"
          >
            Quầy Tiếp Đón
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-6 space-y-6">
        {/* Banner Giới Thiệu */}
        <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 opacity-10 pointer-events-none">
            <QrCode size={180} />
          </div>
          <div className="relative z-10 space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
              <Sparkles size={13} />
              <span>Điểm Danh Tiếp Đón Thông Minh</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Tiếp Đón 1-Chạm Bằng Mã QR
            </h2>
            <p className="text-xs text-slate-200 leading-relaxed max-w-md">
              Quét mã QR từ camera điện thoại hoặc nhập mã vé hẹn để hệ thống tự động xác nhận tiếp đón, cập nhật số thứ tự và chuyển thông tin tới Bác sĩ phụ trách.
            </p>
          </div>
        </div>

        {/* Form Tra Cứu / Quét Camera */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase">
              Mã Vé Hẹn Khám (Booking Code):
            </label>
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-bold bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition cursor-pointer"
            >
              <Camera size={14} />
              <span>Bật Camera Quét QR</span>
            </button>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLookup(inputCode);
            }}
            className="flex gap-2"
          >
            <div className="relative flex-1">
              <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                required
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Nhập mã vé, ví dụ: MED478011"
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-600 focus:bg-white focus:outline-none text-sm font-mono font-bold text-slate-800 tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !inputCode.trim()}
              className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              {loading ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <span>Tra cứu</span>
              )}
            </button>
          </form>
        </div>

        {/* Thông Báo Lỗi */}
        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle size={18} className="shrink-0 text-rose-500 mt-0.5" />
            <div>
              <strong className="block font-bold">Không thể tiếp đón:</strong>
              <span>{error}</span>
            </div>
          </div>
        )}

        {/* Chi Tiết Vé Khám & Nút Check-in */}
        {appointment && (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-md overflow-hidden animate-in fade-in duration-200">
            {/* Header Thẻ Vé */}
            <div className={`p-5 text-white ${
              isAlreadyCheckedIn ? 'bg-emerald-700' : 'bg-slate-900'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                  {isAlreadyCheckedIn ? '✓ ĐÃ TIẾP ĐÓN TẠI QUẦY' : 'CHỜ TIẾP ĐÓN'}
                </span>
                <span className="text-xs font-mono font-bold bg-white/20 px-2.5 py-0.5 rounded-full">
                  {appointment.bookingCode}
                </span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <span className="text-[11px] text-slate-300 block">Số thứ tự khám bệnh:</span>
                  <div className="text-4xl font-black tracking-tight text-white">
                    {appointment.queueNumber || 'STT-01'}
                  </div>
                </div>
                {isAlreadyCheckedIn && (
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-200 block">Giờ tiếp đón:</span>
                    <strong className="text-xs text-white">
                      {appointment.checkInTime ? new Date(appointment.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {/* Nội Dung Chi Tiết Ca Khám */}
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 block flex items-center gap-1">
                    <User size={13} /> Bệnh nhân:
                  </span>
                  <strong className="text-slate-900 text-sm block">
                    {appointment.patientName || 'Bệnh nhân đăng ký'}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 block flex items-center gap-1">
                    <Stethoscope size={13} /> Bác sĩ phụ trách:
                  </span>
                  <strong className="text-slate-900 text-sm block">
                    {cleanDoctorFullName(appointment.doctorName) || 'Bác sĩ chuyên khoa'}
                  </strong>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 block flex items-center gap-1">
                    <Building2 size={13} /> Buồng khám:
                  </span>
                  <strong className="text-emerald-700 text-sm font-bold block">
                    {appointment.roomNumber || 'Phòng khám chuyên khoa'}
                  </strong>
                  {appointment.specialtyName && (
                    <span className="text-[11px] text-slate-500 block">({appointment.specialtyName})</span>
                  )}
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-slate-400 block flex items-center gap-1">
                    <Clock size={13} /> Khung giờ khám:
                  </span>
                  <strong className="text-slate-900 text-sm block">
                    {appointment.slotTime || 'Theo thứ tự tiếp đón'}
                  </strong>
                  {appointment.appointmentDate && (
                    <span className="text-[11px] text-slate-500 block">Ngày {appointment.appointmentDate}</span>
                  )}
                </div>
              </div>

              {/* Mã QR Offline Cho Nhân Viên Quét Lại */}
              <div className="p-4 bg-emerald-50/50 border-2 border-dashed border-emerald-300/60 rounded-2xl text-center space-y-2">
                <QrCodeImage
                  value={typeof window !== 'undefined' ? `${window.location.origin}/checkin?code=${appointment.bookingCode}` : appointment.bookingCode}
                  size={140}
                  className="mx-auto rounded-lg shadow-xs"
                />
                <span className="text-[10px] text-emerald-800 font-bold block">
                  ✓ Mã QR vé hợp lệ (dùng để quét lại tại quầy hoặc buồng khám)
                </span>
              </div>

              {/* Lời Khuyên Hướng Dẫn */}
              <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1">
                  <ShieldCheck size={14} className="text-blue-600" />
                  <span>Hướng dẫn di chuyển:</span>
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  {isAlreadyCheckedIn
                    ? `Quý khách vui lòng đến trước cửa ${appointment.roomNumber || 'buồng khám'}. Khi tới lượt, Bác sĩ sẽ gọi số thứ tự #${appointment.queueNumber} trên màn hình hiển thị.`
                    : 'Bấm nút xác nhận tiếp đón dưới đây để hoàn tất thủ tục và lấy số thứ tự khám chính thức.'}
                </p>
              </div>

              {/* Nút Hành Động */}
              <div className="pt-2 space-y-2.5">
                {!isAlreadyCheckedIn ? (
                  <button
                    type="button"
                    onClick={handleConfirmCheckin}
                    disabled={checkingIn}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition cursor-pointer"
                  >
                    {checkingIn ? (
                      <>
                        <RefreshCw size={18} className="animate-spin" />
                        <span>Đang ghi nhận tiếp đón...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={20} />
                        <span>XÁC NHẬN TIẾP ĐÓN TẠI QUẦY (CHECK-IN)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-xl text-center border border-emerald-300">
                      ✓ ĐÃ TIẾP ĐÓN THÀNH CÔNG • SỐ THỨ TỰ #{appointment.queueNumber}
                    </div>
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="w-full py-3 bg-white border-2 border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Printer size={15} />
                      <span>In Phiếu Số Thứ Tự Khám (K80)</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modal Quét Mã QR Bằng Camera Thiết Bị */}
      <QrCameraScannerModal
        isOpen={showScanner}
        onClose={() => setShowScanner(false)}
        onScanSuccess={handleScannerSuccess}
        title="Quét Mã QR Vé Hẹn Khám Để Tiếp Đón"
      />
    </div>
  );
}

export default function CheckinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-400 text-xs font-semibold flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin text-emerald-600" />
          <span>Đang tải thông tin tiếp đón...</span>
        </div>
      </div>
    }>
      <CheckinContent />
    </Suspense>
  );
}
