'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect') || '/booking';
  const isAuthRequired = searchParams.get('reason') === 'auth_required';

  const emailInputRef = React.useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (errorMessage) {
      setErrorMessage('');
    }
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.login({
        email: formData.email.trim(),
        password: formData.password,
      });

      const roles: string[] = res.user?.roles || res.roles || [];
      const priorityRoles = ['ROLE_ADMIN', 'ROLE_DOCTOR', 'ROLE_STAFF', 'ROLE_PATIENT'];
      const displayRole = priorityRoles.find((r) => roles.includes(r)) || roles[0] || 'CUSTOMER';
      setSuccessMessage(`Đăng nhập thành công! Vai trò: ${displayRole}. Đang chuyển hướng...`);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('auth-change'));
      }

      setTimeout(() => {
        let dest = redirectUrl;
        if (roles.includes('ROLE_ADMIN')) {
          dest = '/admin';
        } else if (roles.includes('ROLE_STAFF')) {
          dest = '/reception';
        } else if (roles.includes('ROLE_DOCTOR')) {
          dest = '/doctor';
        }
        window.location.href = dest;
      }, 500);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại email hoặc mật khẩu.');
      // Auto-focus back to email input for better mobile UX
      setTimeout(() => {
        emailInputRef.current?.focus();
        emailInputRef.current?.select();
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xl w-full max-w-sm sm:max-w-md border border-mint-light my-auto">
      {/* Header */}
      <div className="text-center mb-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-xs border border-mint-light p-1 mb-1.5">
          <img src="/logo.png" alt="MedSched Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-xl font-extrabold text-pine-teal">Đăng Nhập</h1>
        <p className="text-slate-500 text-[11px] mt-0.5">
          Hệ thống MedSched dành cho Bệnh nhân, Bác sĩ, Lễ tân & Admin
        </p>
      </div>

      {/* Thông báo yêu cầu đăng nhập nếu từ trang đặt lịch */}
      {isAuthRequired && !errorMessage && !successMessage && (
        <AlertMessage 
          type="info" 
          message="Vui lòng đăng nhập tài khoản bệnh nhân để tiếp tục đặt lịch khám." 
          className="mb-2.5 py-1.5 text-xs" 
        />
      )}

      {/* Thông báo lỗi / thành công */}
      {errorMessage && (
        <AlertMessage type="error" message={errorMessage} className="mb-2.5 py-1.5 text-xs animate-in fade-in zoom-in-95" onClose={() => setErrorMessage('')} />
      )}
      {successMessage && (
        <AlertMessage type="success" message={successMessage} className="mb-2.5 py-1.5 text-xs" />
      )}

      {/* Form Đăng nhập */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Email tài khoản</label>
          <div className="relative">
            <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 ${errorMessage ? 'text-rose-400' : 'text-slate-400'}`} size={15} />
            <input
              ref={emailInputRef}
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="nhap.email@medsched.vn"
              className={`w-full pl-8 pr-3 py-1.5 bg-mint-soft border rounded-xl outline-none text-xs transition ${
                errorMessage
                  ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-200 focus:border-rose-500'
                  : 'border-mint-light focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary'
              }`}
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Mật khẩu</label>
          <div className="relative">
            <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 ${errorMessage ? 'text-rose-400' : 'text-slate-400'}`} size={15} />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className={`w-full pl-8 pr-8 py-1.5 bg-mint-soft border rounded-xl outline-none text-xs transition ${
                errorMessage
                  ? 'border-rose-400 bg-rose-50/20 ring-1 ring-rose-200 focus:border-rose-500'
                  : 'border-mint-light focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {errorMessage && (
            <p className="text-[10px] text-rose-500 mt-1">Vui lòng kiểm tra lại email hoặc mật khẩu.</p>
          )}
        </div>

        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={() => setShowForgotModal(true)}
            className="text-[11px] text-teal-600 hover:text-pine-teal font-medium hover:underline cursor-pointer"
          >
            Quên mật khẩu?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pine-teal hover:bg-pine-teal-hover text-white font-bold py-2 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 text-xs mt-1 cursor-pointer"
        >
          {loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
        </button>
      </form>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-800 mb-2 flex items-center gap-2">
              <Lock className="text-pine-teal" size={18} />
              Quên & Đặt lại mật khẩu
            </h3>
            <p className="text-xs text-slate-600 mb-3">
              Để đảm bảo an toàn hồ sơ bệnh án điện tử, MedSched áp dụng quy trình cấp lại mật khẩu tập trung:
            </p>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-2 mb-4">
              <div>
                <span className="font-bold text-pine-teal">1. Bác sĩ / Nhân viên:</span>
                <p className="text-[11px] text-slate-500">Liên hệ Quản trị viên (Admin) để thực hiện đặt lại mật khẩu trực tiếp qua cổng Quản trị hệ thống.</p>
              </div>
              <div>
                <span className="font-bold text-emerald-700">2. Khách hàng / Bệnh nhân:</span>
                <p className="text-[11px] text-slate-500">Liên hệ Tổng đài tiếp đón <b>1900-6868</b> hoặc xuất trình CCCD tại quầy Lễ tân để được cấp lại mật khẩu ngay.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowForgotModal(false)}
              className="w-full py-2 bg-pine-teal text-white rounded-xl text-xs font-semibold hover:bg-pine-teal-hover transition cursor-pointer"
            >
              Đã hiểu, quay lại đăng nhập
            </button>
          </div>
        </div>
      )}

      {/* Footer link */}
      <div className="text-center mt-4 pt-3 border-t border-mint-light text-xs text-slate-600">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="text-pine-teal font-bold hover:underline">
          Đăng ký khám mới
        </Link>
      </div>
    </div>
  );
}
