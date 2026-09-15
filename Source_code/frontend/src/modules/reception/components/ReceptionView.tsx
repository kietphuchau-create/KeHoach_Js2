'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  QrCode, 
  CreditCard, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Search, 
  UserCheck, 
  Users, 
  Building2, 
  Printer,
  Sparkles,
  RefreshCw,
  Bell
} from 'lucide-react';
import { api, AppointmentResponse } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

export default function ReceptionView() {
  const [method, setMethod] = useState<'QR_CODE' | 'CCCD_QR'>('QR_CODE');
  const [bookingCode, setBookingCode] = useState('MED-2026-8899');
  const [cccdNumber, setCccdNumber] = useState('079095012345');
  const [patientName, setPatientName] = useState('Châu Tuấn Kiệt');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live feed state of checked-in patients
  const [history, setHistory] = useState<any[]>([
    {
      queueNumber: '01',
      bookingCode: 'MED-2026-8890',
      patientName: 'Lê Thành Tài',
      doctor: 'PGS.TS.BS Trần Văn Hùng',
      room: 'P.201 - Lầu 2',
      checkInTime: '08:15:30',
      status: 'ĐÃ TIẾP ĐÓN',
    },
    {
      queueNumber: '02',
      bookingCode: 'MED-2026-8891',
      patientName: 'Trang Huỳnh',
      doctor: 'BS.CKII Nguyễn Minh Anh',
      room: 'P.104 - Lầu 1',
      checkInTime: '08:22:10',
      status: 'ĐÃ TIẾP ĐÓN',
    },
  ]);

  const qrInputRef = useRef<HTMLInputElement>(null);

  // Auto focus input on mount and tab switch
  useEffect(() => {
    qrInputRef.current?.focus();
  }, [method]);

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.checkIn({
        bookingCode: method === 'QR_CODE' ? bookingCode : undefined,
        cccdNumber: method === 'CCCD_QR' ? cccdNumber : undefined,
        method: method,
      });

      setResult(res);

      // Thêm vào bảng lịch sử tiếp đón trực tiếp (Live Feed)
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const newEntry = {
        queueNumber: res.queueNumber || `0${history.length + 1}`,
        bookingCode: res.bookingCode || (method === 'QR_CODE' ? bookingCode : `MED-${cccdNumber.slice(-4)}`),
        patientName: method === 'CCCD_QR' ? (patientName || 'Bệnh nhân CCCD') : 'Châu Tuấn Kiệt',
        doctor: 'PGS.TS.BS Trần Văn Hùng',
        room: 'P.201 - Lầu 2',
        checkInTime: timeStr,
        status: 'ĐÃ TIẾP ĐÓN',
      };

      setHistory((prev) => [newEntry, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Tiếp đón thất bại. Vui lòng kiểm tra lại mã hoặc thẻ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 mb-1 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={18} />
            <span>Phân Hệ Tiếp Đón Y Tế Siêu Tốc (Fast Check-In 1s)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Quầy Tiếp Nhận Bệnh Nhân Ngoại Trú</h1>
          <p className="text-slate-500 text-sm mt-1">
            Hỗ trợ đầu đọc quét mã QR vé hẹn điện tử và quét chip thẻ CCCD 12 số không cần nhập liệu thủ công.
          </p>
        </div>

        {/* Quick Stats Widget */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
          <div className="px-4 py-1.5 border-r border-slate-200 text-center">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Đã tiếp đón</span>
            <span className="text-lg font-bold text-emerald-600">{history.length} ca</span>
          </div>
          <div className="px-4 py-1.5 text-center">
            <span className="text-[10px] text-slate-400 font-semibold block uppercase">Tốc độ xử lý</span>
            <span className="text-lg font-bold text-blue-600">~1.2 giây</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            {/* Method Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setMethod('QR_CODE'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  method === 'QR_CODE'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode size={16} />
                <span>1. QR Vé Hẹn</span>
              </button>
              <button
                type="button"
                onClick={() => { setMethod('CCCD_QR'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  method === 'CCCD_QR'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard size={16} />
                <span>2. QR Thẻ CCCD</span>
              </button>
            </div>

            {error && (
              <div className="mb-4">
                <AlertMessage type="error" message={error} onClose={() => setError(null)} />
              </div>
            )}

            {/* Check-in Form */}
            <form onSubmit={handleCheckin} className="space-y-4">
              {method === 'QR_CODE' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mã Vé Hẹn Khám (Booking Code):
                  </label>
                  <div className="relative">
                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      ref={qrInputRef}
                      type="text"
                      required
                      value={bookingCode}
                      onChange={(e) => setBookingCode(e.target.value)}
                      placeholder="Quét mã QR hoặc nhập: MED-2026-8899"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none text-sm font-mono font-semibold text-slate-800"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                    <span>* Tương thích máy quét USB barcode 2D</span>
                    <button
                      type="button"
                      onClick={() => setBookingCode(`MED-2026-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="text-emerald-600 hover:underline font-medium cursor-pointer"
                    >
                      Tạo mã test
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Số Định Danh CCCD Gắn Chip (12 số):
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        ref={qrInputRef}
                        type="text"
                        required
                        value={cccdNumber}
                        onChange={(e) => setCccdNumber(e.target.value)}
                        placeholder="Ví dụ: 079095012345"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none text-sm font-mono font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Họ và Tên Bệnh Nhân (Khớp thẻ):
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Châu Tuấn Kiệt"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-sm"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Đang nạp dữ liệu & cấp STT...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Xác Nhận Tiếp Đón (Check-in 1 Giây)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Instant Result Card */}
          {result && (
            <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-lg shadow-emerald-600/30 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={22} className="text-emerald-200" />
                  <span className="font-bold text-sm tracking-wide uppercase">TIẾP ĐÓN THÀNH CÔNG</span>
                </div>
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">1-CLICK PRINT</span>
              </div>

              <div className="text-center bg-white/10 backdrop-blur-xs py-4 px-3 rounded-xl border border-white/20">
                <span className="text-xs text-emerald-100 uppercase tracking-widest font-semibold block">Số Thứ Tự Vào Khám</span>
                <div className="text-5xl font-black text-white tracking-tight mt-1">
                  STT #{result.queueNumber || '03'}
                </div>
                <div className="text-xs text-emerald-200 mt-1 font-mono">
                  Mã hẹn: {result.bookingCode}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-emerald-50">
                <div>Phòng khám: <strong className="text-white block text-sm">P.201 - Lầu 2</strong></div>
                <div>Bác sĩ phụ trách: <strong className="text-white block text-sm">PGS.TS Trần Văn Hùng</strong></div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 bg-white text-emerald-800 hover:bg-emerald-50 font-bold py-2 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={14} /> In Phiếu STT
                </button>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="px-4 bg-white/20 hover:bg-white/30 text-white font-semibold py-2 rounded-xl transition text-xs cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real-time Check-in Live Feed (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Clock size={18} className="text-blue-600" />
                  <span>Danh Sách Đã Tiếp Đón Hôm Nay (Live Feed)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động chuyển tiếp vào hàng đợi phòng khám của Bác sĩ sau khi check-in.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Trực tiếp</span>
              </span>
            </div>

            {/* Table Feed */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Bệnh Nhân</th>
                    <th className="py-2.5 px-3">Bác Sĩ & Phòng</th>
                    <th className="py-2.5 px-3">Giờ Check-in</th>
                    <th className="py-2.5 px-3 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {history.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3">
                        <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs">
                          {item.queueNumber}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{item.patientName}</div>
                        <div className="text-[11px] font-mono text-slate-400">{item.bookingCode}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700 font-medium">{item.doctor}</div>
                        <div className="text-[11px] text-blue-600 font-semibold">{item.room}</div>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {item.checkInTime}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={11} /> {item.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Tổng số: <strong className="text-slate-700">{history.length}</strong> ca tiếp nhận</span>
            <span>Hệ thống Lễ tân MedSched kết nối buồng khám 1s</span>
          </div>
        </div>
      </div>
    </div>
  );
}
