'use client';

import React, { useState } from 'react';
import { User, Mail, Lock, Phone, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    if (!formData.agreeTerms) {
      setError('Bạn cần đồng ý với Điều khoản & Dịch vụ khám chữa bệnh.');
      return;
    }

    setLoading(true);

    try {
      await api.register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });

      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển sang trang Đăng nhập...');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Đăng ký không thành công. Email có thể đã được sử dụng.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-xl w-full max-w-sm sm:max-w-md border border-mint-light my-auto">
      <div className="text-center mb-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white shadow-xs border border-mint-light p-1 mb-1.5">
          <img src="/logo.png" alt="MedSched Logo" className="w-full h-full object-contain" />
        </div>
        <h1 className="text-xl font-extrabold text-pine-teal">Tạo Tài Khoản</h1>
        <p className="text-slate-500 text-[11px] mt-0.5">
          Đăng ký tài khoản Bệnh nhân để đặt lịch và theo dõi khám bệnh MedSched
        </p>
      </div>

      {error && <AlertMessage type="error" message={error} className="mb-2.5 py-1.5 text-xs" onClose={() => setError('')} />}
      {successMessage && <AlertMessage type="success" message={successMessage} className="mb-2.5 py-1.5 text-xs" />}

      <form onSubmit={handleSubmit} className="space-y-2">
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Họ và Tên</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              className="w-full pl-8 pr-3 py-1.5 bg-mint-soft border border-mint-light rounded-xl focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary outline-none text-xs transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="example@medsched.vn"
              className="w-full pl-8 pr-3 py-1.5 bg-mint-soft border border-mint-light rounded-xl focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary outline-none text-xs transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Số Điện Thoại</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="0912345678"
              className="w-full pl-8 pr-3 py-1.5 bg-mint-soft border border-mint-light rounded-xl focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary outline-none text-xs transition"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Mật khẩu</label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-7 pr-7 py-1.5 bg-mint-soft border border-mint-light rounded-xl focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary outline-none text-xs transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">Xác nhận MK</label>
            <div className="relative">
              <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Nhập lại MK"
                className="w-full pl-7 pr-3 py-1.5 bg-mint-soft border border-mint-light rounded-xl focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary outline-none text-xs transition"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center pt-0.5">
          <input
            type="checkbox"
            id="agreeTerms"
            name="agreeTerms"
            checked={formData.agreeTerms}
            onChange={handleChange}
            className="w-3.5 h-3.5 text-pine-teal rounded border-slate-300 focus:ring-pine-teal cursor-pointer"
          />
          <label htmlFor="agreeTerms" className="ml-2 text-[11px] text-slate-600 cursor-pointer">
            Tôi đồng ý với các <span className="text-pine-teal font-semibold">Điều khoản</span> và chính sách MedSched
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pine-teal hover:bg-pine-teal-hover text-white font-bold py-2 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 text-xs mt-2 cursor-pointer"
        >
          {loading ? 'Đang tạo tài khoản...' : 'Đăng Ký Khám Ngay'}
        </button>
      </form>

      <div className="text-center mt-3 text-xs text-slate-600">
        Đã có tài khoản?{' '}
        <Link href="/login" className="text-pine-teal font-bold hover:underline">
          Đăng nhập tại đây
        </Link>
      </div>
    </div>
  );
}
