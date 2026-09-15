'use client';

import React, { useState } from 'react';
import { QrCode, CreditCard, CheckCircle2, ShieldCheck, Clock } from 'lucide-react';
import { api, AppointmentResponse } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

export default function ReceptionView() {
  const [bookingCode, setBookingCode] = useState('MED-2026-8899');
  const [cccdNumber, setCccdNumber] = useState('079095012345');
  const [method, setMethod] = useState<'QR_CODE' | 'CCCD_QR'>('QR_CODE');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      setError(err.message || 'Tiếp đón thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-wider bg-emerald-50 px-3 py-1 rounded-full mb-2">
          <ShieldCheck size={14} />
          <span>Quầy Lễ Tân Tiếp Đón</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Quầy Tiếp Đón Y Tế Siêu Tốc (1 Giây)</h1>
        <p className="text-slate-500 text-sm mt-1">
          Tiếp nhận bệnh nhân bằng cách quét mã QR vé hẹn hoặc đầu đọc quét mã QR thẻ CCCD gắn chip.
        </p>
      </div>

      {/* Method Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => { setMethod('QR_CODE'); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
            method === 'QR_CODE'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <QrCode size={18} />
          <span>Quét Mã QR Vé Hẹn</span>
        </button>
        <button
          type="button"
          onClick={() => { setMethod('CCCD_QR'); setError(null); }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
            method === 'CCCD_QR'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CreditCard size={18} />
          <span>Quét QR Thẻ CCCD Chip</span>
        </button>
      </div>

      {error && (
        <div className="mb-6">
          <AlertMessage type="error" message={error} onClose={() => setError(null)} />
        </div>
      )}

      {result ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 size={24} className="text-emerald-600 shrink-0" />
            <h3 className="text-lg font-bold">Đã Tiếp Đón Thành Công!</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-emerald-100">
            <div>
              <span className="text-xs text-slate-500 uppercase font-medium">Mã Hẹn</span>
              <div className="text-xl font-mono font-bold text-slate-800 mt-0.5">{result.bookingCode}</div>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-medium">Số Thứ Tự Vào Khám</span>
              <div className="text-2xl font-bold text-emerald-600 mt-0.5">{result.queueNumber}</div>
            </div>
          </div>

          <div className="flex items-center justify-between bg-white p-3.5 rounded-xl border border-emerald-100 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock size={16} />
              <span>Thời Điểm Tiếp Đón:</span>
            </div>
            <span className="font-semibold text-slate-800">
              {result.checkInTime ? new Date(result.checkInTime).toLocaleString('vi-VN') : 'Vừa xong'}
            </span>
          </div>

          <button
            onClick={() => setResult(null)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition cursor-pointer"
          >
            Tiếp đón ca tiếp theo
          </button>
        </div>
      ) : (
        <form onSubmit={handleCheckin} className="space-y-4">
          {method === 'QR_CODE' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Mã QR Vé Hẹn (Booking Code):
              </label>
              <div className="relative">
                <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={bookingCode}
                  onChange={(e) => setBookingCode(e.target.value)}
                  placeholder="Ví dụ: MED-2026-8899"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                * Máy quét barcode/QR USB hoặc không dây sẽ tự động bắn chuỗi ký tự này vào ô input.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Số CCCD Gắn Chip (12 số):
              </label>
              <div className="relative">
                <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={cccdNumber}
                  onChange={(e) => setCccdNumber(e.target.value)}
                  placeholder="Ví dụ: 079095012345"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono"
                />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                * Đầu đọc quét mã QR trên thẻ CCCD sẽ tự động bóc tách số định danh 12 số.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xử lý tiếp đón...</span>
              </>
            ) : (
              'Xác Nhận Tiếp Đón (Check-in)'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
