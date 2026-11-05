'use client';

import React, { useState } from 'react';
import { Mail, ArrowLeft, CheckCircle2, ShieldAlert, KeyRound } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [staffNotice, setStaffNotice] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setStaffNotice(null);
    setSuccessMessage('');
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setSuccessMessage(res.message || 'Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hộp thư của bạn.');
    } catch (err: any) {
      const msg = err.message || 'Không thể xử lý yêu cầu lúc này. Vui lòng thử lại sau.';
      // Nếu là tài khoản Bác sĩ / Nhân viên y tế / Cán bộ nội bộ
      if (
        msg.includes('Bác sĩ') ||
        msg.includes('Nhân viên y tế') ||
        msg.includes('chỉ áp dụng cho Bệnh nhân') ||
        msg.includes('Admin')
      ) {
        setStaffNotice(msg);
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <Link
          href="/login"
          className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 transition mb-6"
        >
          <ArrowLeft size={16} /> Quay lại Đăng nhập
        </Link>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-blue-600 mb-3">
            <KeyRound size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Quên Mật Khẩu</h1>
          <p className="text-slate-500 text-sm mt-1.5 leading-relaxed">
            Nhập email tài khoản của bạn. Hệ thống sẽ gửi cho bạn một liên kết bảo mật có thời hạn 15 phút để đặt lại mật khẩu.
          </p>
        </div>

        {/* Quy định cấp lại mật khẩu - Chỉ hiển thị khi người dùng nhập email của Bác sĩ / Nhân viên y tế */}
        {staffNotice && (
          <div className="mb-5 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <ShieldAlert size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-amber-950">Quy định cấp lại mật khẩu:</span>
              <div className="mt-1 text-[11px] text-amber-800 space-y-1">
                <div>• Tài khoản của bạn là <strong>Bác sĩ / Nhân viên y tế</strong>. Tính năng tự khôi phục mật khẩu chỉ áp dụng cho Bệnh nhân.</div>
                <div>• Vui lòng liên hệ trực tiếp <strong>Quản trị viên (Admin)</strong> để được cấp lại mật khẩu tập trung nhằm bảo vệ an toàn hồ sơ bệnh án.</div>
              </div>
            </div>
          </div>
        )}

        {/* Thông báo lỗi */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 flex items-center gap-2 text-red-700 text-sm rounded">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Thông báo thành công */}
        {successMessage ? (
          <div className="space-y-4">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 text-emerald-800 text-sm">
              <CheckCircle2 size={20} className="shrink-0 text-emerald-600 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-900">Đã tiếp nhận yêu cầu!</p>
                <p className="mt-1 text-emerald-700 leading-relaxed">{successMessage}</p>
                <p className="mt-2 text-xs text-slate-500 italic">
                  * Mẹo: Trong môi trường kiểm thử/cục bộ, kiểm tra liên kết đặt lại mật khẩu trong log hệ thống backend.
                </p>
              </div>
            </div>

            <Link
              href="/login"
              className="block w-full text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2.5 rounded-lg transition text-sm"
            >
              Trở về màn hình Đăng nhập
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email tài khoản
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errorMessage) setErrorMessage('');
                    if (staffNotice) setStaffNotice(null);
                  }}
                  placeholder="example@medsched.vn"
                  className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow transition disabled:bg-blue-300 flex justify-center items-center cursor-pointer text-sm"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                'Gửi liên kết đặt lại mật khẩu'
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
