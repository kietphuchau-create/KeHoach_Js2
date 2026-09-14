'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldAlert, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuickFill = (email: string) => {
    setFormData({ email, password: 'Medsched@123' });
    setErrorMessage('');
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

      const roles = res.user?.roles || [];
      const roleName = roles[0] || 'CUSTOMER';
      setSuccessMessage(`Đăng nhập thành công! Vai trò: ${roleName}. Đang chuyển hướng...`);

      setTimeout(() => {
        if (roles.includes('ROLE_ADMIN')) {
          router.push('/admin');
        } else if (roles.includes('ROLE_STAFF')) {
          router.push('/reception');
        } else if (roles.includes('ROLE_DOCTOR')) {
          router.push('/profile');
        } else {
          router.push('/booking');
        }
      }, 1000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-blue-50 text-blue-600 mb-3">
            <Lock size={28} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Đăng Nhập</h1>
          <p className="text-slate-500 text-sm mt-1">
            Hệ thống MedSched dành cho Bệnh nhân, Bác sĩ, Lễ tân & Admin
          </p>
        </div>

        {/* Thông báo lỗi */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 flex items-center gap-2 text-red-700 text-sm rounded">
            <ShieldAlert size={18} className="shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Thông báo thành công */}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border-l-4 border-emerald-500 flex items-center gap-2 text-emerald-700 text-sm rounded">
            <CheckCircle2 size={18} className="shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Form Đăng nhập */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
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
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="example@medsched.vn"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Nút Đăng nhập */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow transition disabled:bg-blue-300 flex justify-center items-center mt-2 cursor-pointer"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Đăng nhập hệ thống'
            )}
          </button>
        </form>

        {/* Tài khoản mẫu tiện test nhanh cho giáo viên / nhóm */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">
            ⚡ Tài khoản mẫu thử nghiệm (Pass: Medsched@123):
          </p>
          <div className="grid grid-cols-2 gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@medsched.vn')}
              className="px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-left truncate transition"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('dr.minhanh@medsched.vn')}
              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded text-left truncate transition"
            >
              🩺 Bác sĩ
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('letan.q1@medsched.vn')}
              className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded text-left truncate transition"
            >
              📋 Lễ tân
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('benhnhan.demo@gmail.com')}
              className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-left truncate transition"
            >
              🧑 Bệnh nhân
            </button>
          </div>
        </div>

        {/* Link sang trang Đăng ký */}
        <div className="text-center mt-5 text-sm text-slate-600">
          Chưa có tài khoản Bệnh nhân?{' '}
          <Link href="/register" className="text-blue-600 font-semibold hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}
