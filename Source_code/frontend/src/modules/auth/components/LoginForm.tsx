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

      {/* Thông báo lỗi / thành công */}
      {errorMessage && (
        <AlertMessage type="error" message={errorMessage} className="mb-2.5 py-1.5 text-xs" onClose={() => setErrorMessage('')} />
      )}
      {successMessage && (
        <AlertMessage type="success" message={successMessage} className="mb-2.5 py-1.5 text-xs" />
      )}

      {/* Form Đăng nhập */}
      <form onSubmit={handleSubmit} className="space-y-2.5">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Email tài khoản</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="nhap.email@medsched.vn"
              className="w-full pl-8 pr-3 py-1.5 bg-mint-soft border border-mint-light rounded-xl focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary outline-none text-xs transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Mật khẩu</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full pl-8 pr-8 py-1.5 bg-mint-soft border border-mint-light rounded-xl focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary outline-none text-xs transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pine-teal hover:bg-pine-teal-hover text-white font-bold py-2 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 text-xs mt-1 cursor-pointer"
        >
          {loading ? 'Đang xác thực...' : 'Đăng Nhập Ngay'}
        </button>
      </form>

      {/* Nút chọn nhanh tài khoản test */}
      <div className="mt-3 pt-2.5 border-t border-mint-light">
        <p className="text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider text-center mb-1.5">
          ⚡ Chọn nhanh tài khoản demo (Mật khẩu: Medsched@123)
        </p>
        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => handleQuickFill('admin@medsched.vn')}
            className="px-2.5 py-1.5 rounded-lg bg-mint-light text-pine-teal border border-teal-primary/20 hover:bg-mint-light/80 font-semibold transition text-left cursor-pointer flex items-center justify-between"
            title="admin@medsched.vn"
          >
            <span className="font-bold text-[11px]">👑 Admin</span>
            <span className="text-[9px] text-teal-primary font-mono opacity-80">admin</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('dr.minhanh@medsched.vn')}
            className="px-2.5 py-1.5 rounded-lg bg-mint-light text-pine-teal border border-teal-primary/20 hover:bg-mint-light/80 font-semibold transition text-left cursor-pointer flex items-center justify-between"
            title="dr.minhanh@medsched.vn"
          >
            <span className="font-bold text-[11px]">🩺 Bác Sĩ</span>
            <span className="text-[9px] text-teal-primary font-mono opacity-80">dr.minh</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('letan.q1@medsched.vn')}
            className="px-2.5 py-1.5 rounded-lg bg-mint-light text-pine-teal border border-teal-primary/20 hover:bg-mint-light/80 font-semibold transition text-left cursor-pointer flex items-center justify-between"
            title="letan.q1@medsched.vn"
          >
            <span className="font-bold text-[11px]">📋 Lễ Tân</span>
            <span className="text-[9px] text-teal-primary font-mono opacity-80">letan</span>
          </button>
          <button
            type="button"
            onClick={() => handleQuickFill('benhnhan.demo@gmail.com')}
            className="px-2.5 py-1.5 rounded-lg bg-mint-light text-pine-teal border border-teal-primary/20 hover:bg-mint-light/80 font-semibold transition text-left cursor-pointer flex items-center justify-between"
            title="benhnhan.demo@gmail.com"
          >
            <span className="font-bold text-[11px]">🧑 Bệnh Nhân</span>
            <span className="text-[9px] text-teal-primary font-mono opacity-80">benhnhan</span>
          </button>
        </div>
      </div>

      {/* Footer link */}
      <div className="text-center mt-2.5 text-xs text-slate-600">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="text-pine-teal font-bold hover:underline">
          Đăng ký khám mới
        </Link>
      </div>
    </div>
  );
}
