'use client';

import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

export default function LoginForm() {
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

      const roles: string[] = res.user?.roles || res.roles || [];
      const roleName = roles[0] || 'CUSTOMER';
      setSuccessMessage(`Đăng nhập thành công! Vai trò: ${roleName}. Đang chuyển hướng...`);

      setTimeout(() => {
        if (roles.includes('ROLE_ADMIN')) {
          router.push('/admin');
        } else if (roles.includes('ROLE_STAFF')) {
          router.push('/reception');
        } else if (roles.includes('ROLE_DOCTOR')) {
          router.push('/doctor');
        } else {
          router.push('/booking');
        }
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-mint-light">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white shadow-sm border border-mint-light p-1 mb-3">
          <img src="/logo.png" alt="MedSched Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-3xl font-extrabold text-pine-teal">Đăng Nhập</h1>
        <p className="text-slate-500 text-sm mt-1">
          Hệ thống MedSched dành cho Bệnh nhân, Bác sĩ, Lễ tân & Admin
        </p>
      </div>

      {/* Thông báo lỗi / thành công */}
      {errorMessage && (
        <AlertMessage type="error" message={errorMessage} className="mb-4" onClose={() => setErrorMessage('')} />
      )}
      {successMessage && (
        <AlertMessage type="success" message={successMessage} className="mb-4" />
      )}

      {/* Form Đăng nhập */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Email tài khoản</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="nhap.email@medsched.vn"
              className="w-full pl-10 pr-4 py-2.5 bg-mint-soft border border-mint-light rounded-xl focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary outline-none text-sm transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-1">Mật khẩu</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full pl-10 pr-10 py-2.5 bg-mint-soft border border-mint-light rounded-xl focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary outline-none text-sm transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pine-teal hover:bg-pine-teal-hover text-white font-bold py-3 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 text-base mt-2 cursor-pointer"
        >
          {loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
        </button>
      </form>

      {/* Nút chọn nhanh tài khoản test */}
      <div className="mt-6 pt-5 border-t border-mint-light">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider text-center mb-3">
          ⚡ Tài khoản Demo có sẵn (Mật khẩu: Medsched@123)
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            type="button"
            onClick={() => handleQuickFill('admin@medsched.vn')}
            className="p-2.5 rounded-xl bg-mint-light text-pine-teal border border-teal-primary/30 hover:bg-mint-light/80 font-semibold transition text-left cursor-pointer flex flex-col"
          >
            <span className="font-bold">👑 Quản Trị Viên</span>
            <span className="text-[10px] text-teal-primary font-normal">admin@medsched.vn</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('dr.minhanh@medsched.vn')}
            className="p-2.5 rounded-xl bg-mint-light text-pine-teal border border-teal-primary/30 hover:bg-mint-light/80 font-semibold transition text-left cursor-pointer flex flex-col"
          >
            <span className="font-bold">🩺 Bác Sĩ</span>
            <span className="text-[10px] text-teal-primary font-normal">dr.minhanh@medsched.vn</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('letan.q1@medsched.vn')}
            className="p-2.5 rounded-xl bg-mint-light text-pine-teal border border-teal-primary/30 hover:bg-mint-light/80 font-semibold transition text-left cursor-pointer flex flex-col"
          >
            <span className="font-bold">📋 Lễ Tân</span>
            <span className="text-[10px] text-teal-primary font-normal">letan.q1@medsched.vn</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('benhnhan.demo@gmail.com')}
            className="p-2.5 rounded-xl bg-mint-light text-pine-teal border border-teal-primary/30 hover:bg-mint-light/80 font-semibold transition text-left cursor-pointer flex flex-col"
          >
            <span className="font-bold">🧑 Bệnh Nhân</span>
            <span className="text-[10px] text-teal-primary font-normal">benhnhan.demo@gmail.com</span>
          </button>
        </div>
      </div>

      {/* Footer link */}
      <div className="text-center mt-6 text-sm text-slate-600">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="text-pine-teal font-bold hover:underline">
          Đăng ký khám mới
        </Link>
      </div>
    </div>
  );
}
