'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Stethoscope, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, AppointmentResponse } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

export default function BookingForm() {
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.bookAppointment({
        patientProfileId: 'p0000001-0000-0000-0000-000000000001',
        doctorId: 'd0000001-0000-0000-0000-000000000001',
        slotId: 'sl000002-0000-0000-0000-000000000001',
        symptoms: symptoms || 'Đau ngực nhẹ, cần khám kiểm tra tim mạch định kỳ.',
      });
      setResult(res);
    } catch (err: any) {
      setError(err.message || 'Đặt lịch thất bại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 text-blue-600 font-semibold text-xs uppercase tracking-wider bg-blue-50 px-3 py-1 rounded-full mb-2">
          <Calendar size={14} />
          <span>Đặt Lịch Trực Tuyến</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Đặt Lịch Khám Trực Tuyến</h1>
        <p className="text-slate-500 text-sm mt-1">
          Chọn bác sĩ, khung giờ và nhập triệu chứng để Spring AI hỗ trợ tóm tắt bệnh án cho bác sĩ.
        </p>
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
            <h3 className="text-lg font-bold">Đặt Lịch Khám Thành Công!</h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-emerald-100">
            <div>
              <span className="text-xs text-slate-500 uppercase font-medium">Mã Đặt Chỗ (Booking Code)</span>
              <div className="text-xl font-mono font-bold text-blue-600 mt-0.5">{result.bookingCode}</div>
            </div>
            <div>
              <span className="text-xs text-slate-500 uppercase font-medium">Số Thứ Tự Hàng Đợi</span>
              <div className="text-xl font-bold text-emerald-600 mt-0.5">{result.queueNumber}</div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 mb-1.5">
              <Sparkles size={14} />
              <span>Tóm Tắt Bệnh Án Tự Động Từ Spring AI:</span>
            </div>
            <div className="bg-white p-4 rounded-xl text-sm italic text-slate-700 border border-purple-100 shadow-xs">
              🤖 {result.aiSummary}
            </div>
          </div>

          <button
            onClick={() => setResult(null)}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl transition cursor-pointer"
          >
            Đặt ca khám mới
          </button>
        </div>
      ) : (
        <form onSubmit={handleBook} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Bác Sĩ Chuyên Khoa:
            </label>
            <div className="relative">
              <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                disabled 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium cursor-not-allowed"
              >
                <option>PGS.TS.BS Trần Văn Hùng - Khoa Nội Tim Mạch (P.201 - Lầu 2)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Khung Giờ Khám (Time Slot):
            </label>
            <div className="relative">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <select 
                disabled 
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 font-medium cursor-not-allowed"
              >
                <option>08:30 - 09:00 (Hôm nay) - Khả dụng [AVAILABLE]</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
              Mô tả triệu chứng bệnh lý:
            </label>
            <textarea
              rows={4}
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              placeholder="Ví dụ: Thỉnh thoảng khó thở nhẹ khi leo cầu thang, tim đập nhanh hồi hộp vào buổi tối..."
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm text-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang xử lý khóa slot & gọi Spring AI...</span>
              </>
            ) : (
              'Xác Nhận Đặt Khám'
            )}
          </button>
        </form>
      )}
    </div>
  );
}
