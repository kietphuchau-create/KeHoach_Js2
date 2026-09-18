'use client';

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Save, KeyRound, Stethoscope, LogOut, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, clearAuthSession, getAuthToken } from '@/shared/lib/api';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

export default function ProfileView() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'doctor'>('info');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User Profile
  const [profile, setProfile] = useState({
    id: '',
    fullName: '',
    email: '',
    phone: '',
    roles: [] as string[],
    rolesWithCenter: [] as any[],
    doctorProfile: null as any,
    patientProfile: null as any,
  });

  // Password Change
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Doctor Form
  const [doctorForm, setDoctorForm] = useState({
    academicTitle: '',
    experienceYears: 0,
    roomNumber: '',
    bio: '',
  });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    async function loadData() {
      try {
        const data = await api.getProfile();
        setProfile({
          id: data.id || '',
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          roles: data.roles || ['CUSTOMER'],
          rolesWithCenter: data.rolesWithCenter || [],
          doctorProfile: data.doctorProfile || null,
          patientProfile: data.patientProfile || null,
        });

        if (data.doctorProfile) {
          setDoctorForm({
            academicTitle: data.doctorProfile.academicTitle || 'BS.CKI',
            experienceYears: data.doctorProfile.experienceYears || 5,
            roomNumber: data.doctorProfile.roomNumber || 'P.101',
            bio: data.doctorProfile.bio || '',
          });
        }
      } catch (err: any) {
        setError(err.message || 'Không thể tải thông tin hồ sơ.');
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, [router]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await api.updateProfile({
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
      });
      setMessage('Cập nhật thông tin cá nhân thành công!');
      setProfile((prev) => ({
        ...prev,
        fullName: res.fullName || prev.fullName,
        phone: res.phone || prev.phone,
      }));
    } catch (err: any) {
      setError(err.message || 'Cập nhật thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }

    if (passwords.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    setLoading(true);

    try {
      await api.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setMessage('Đổi mật khẩu thành công!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'Mật khẩu hiện tại không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await api.updateDoctorProfile({
        academicTitle: doctorForm.academicTitle,
        experienceYears: Number(doctorForm.experienceYears),
        roomNumber: doctorForm.roomNumber,
        bio: doctorForm.bio,
      });
      setMessage('Cập nhật hồ sơ chuyên môn Bác sĩ thành công!');
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật hồ sơ bác sĩ.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    router.push('/login');
  };

  if (fetching) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <LoadingSpinner message="Đang nạp dữ liệu hồ sơ cá nhân..." />
      </div>
    );
  }

  const isDoctor = profile.roles.includes('ROLE_DOCTOR');

  const getCleanRoleBadges = (roles: string[]) => {
    const badges = [];
    if (roles.includes('ROLE_ADMIN')) {
      badges.push({ label: '👑 Quản Trị Viên', bg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' });
    }
    if (roles.includes('ROLE_DOCTOR')) {
      badges.push({ label: '🩺 Bác Sĩ', bg: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40' });
    }
    if (roles.includes('ROLE_STAFF')) {
      badges.push({ label: '📋 Lễ Tân', bg: 'bg-amber-500/20 text-amber-200 border-amber-400/40' });
    }
    if (badges.length === 0 || roles.includes('ROLE_PATIENT')) {
      badges.push({ label: '🧑 Bệnh Nhân', bg: 'bg-teal-500/20 text-teal-200 border-teal-400/40' });
    }
    return badges;
  };

  return (
    <div className="max-w-3xl mx-auto py-4 space-y-4">
      {/* Return button & Logout */}
      <div className="flex items-center justify-between">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-pine-teal font-medium transition">
          <ArrowLeft size={16} /> Quay về Trang chủ
        </Link>
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 font-semibold px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50 transition cursor-pointer"
        >
          <LogOut size={16} /> Đăng xuất
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-mint-light overflow-hidden">
        {/* Header Profile */}
        <div className="bg-gradient-to-r from-pine-teal to-teal-primary p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-2xl font-black border-2 border-white/40 shadow-sm text-white">
              {(profile.fullName || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight">{profile.fullName || 'Người dùng'}</h2>
              <div className="text-mint-light/90 text-sm mt-1 flex flex-wrap items-center gap-2">
                <span>{profile.email}</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {getCleanRoleBadges(profile.roles).map((badge) => (
                    <span
                      key={badge.label}
                      className={`border px-2.5 py-0.5 rounded-full text-xs font-semibold backdrop-blur-xs ${badge.bg}`}
                    >
                      {badge.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Switching */}
        <div className="flex border-b border-mint-light bg-mint-soft text-sm font-semibold">
          <button
            type="button"
            onClick={() => { setActiveTab('info'); setMessage(null); setError(null); }}
            className={`flex-1 py-3.5 text-center transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'info'
                ? 'border-b-2 border-pine-teal text-pine-teal bg-white font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User size={18} />
            Thông Tin Cá Nhân
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('password'); setMessage(null); setError(null); }}
            className={`flex-1 py-3.5 text-center transition flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'password'
                ? 'border-b-2 border-pine-teal text-pine-teal bg-white font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound size={18} />
            Đổi Mật Khẩu
          </button>
          {isDoctor && (
            <button
              type="button"
              onClick={() => { setActiveTab('doctor'); setMessage(null); setError(null); }}
              className={`flex-1 py-3.5 text-center transition flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'doctor'
                  ? 'border-b-2 border-pine-teal text-pine-teal bg-white font-bold'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Stethoscope size={18} />
              Hồ Sơ Bác Sĩ
            </button>
          )}
        </div>

        <div className="p-6">
          {/* Notifications */}
          {message && (
            <div className="mb-5">
              <AlertMessage type="success" message={message} onClose={() => setMessage(null)} />
            </div>
          )}

          {error && (
            <div className="mb-5">
              <AlertMessage type="error" message={error} onClose={() => setError(null)} />
            </div>
          )}

          {/* TAB 1: Sửa thông tin cá nhân */}
          {activeTab === 'info' && (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-mint-light bg-mint-soft rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email tài khoản (Chỉ xem)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-100 text-slate-500 rounded-xl cursor-not-allowed text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="tel"
                    required
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-mint-light bg-mint-soft rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary transition text-sm"
                  />
                </div>
              </div>

              {profile.patientProfile && (
                <div className="pt-2 border-t border-mint-light text-sm">
                  <p className="font-semibold text-slate-700 mb-2">Hồ sơ y tế bệnh nhân:</p>
                  <div className="grid grid-cols-2 gap-3 bg-mint-soft p-3 rounded-xl border border-mint-light text-slate-600">
                    <div>CCCD: <span className="font-medium text-slate-800">{profile.patientProfile.cccdNumber || 'Chưa cập nhật'}</span></div>
                    <div>BHYT: <span className="font-medium text-slate-800">{profile.patientProfile.healthInsuranceNo || 'Chưa cập nhật'}</span></div>
                    <div>Giới tính: <span className="font-medium text-slate-800">{profile.patientProfile.gender || 'Chưa cập nhật'}</span></div>
                    <div>Tiền sử: <span className="font-medium text-slate-800">{profile.patientProfile.medicalHistory || 'Bình thường'}</span></div>
                  </div>
                </div>
              )}

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-pine-teal hover:bg-pine-teal-hover text-white font-bold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2 cursor-pointer text-sm"
                >
                  <Save size={18} />
                  {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Đổi mật khẩu */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu hiện tại</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    placeholder="Nhập mật khẩu đang dùng"
                    className="w-full pl-10 pr-4 py-2.5 border border-mint-light bg-mint-soft rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-10 pr-4 py-2.5 border border-mint-light bg-mint-soft rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary transition text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-10 pr-4 py-2.5 border border-mint-light bg-mint-soft rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-pine-teal/30 focus:border-teal-primary transition text-sm"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-pine-teal hover:bg-pine-teal-hover text-white font-bold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2 cursor-pointer text-sm"
                >
                  <KeyRound size={18} />
                  {loading ? 'Đang xử lý...' : 'Xác nhận Đổi mật khẩu'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 3: Bác sĩ cập nhật hồ sơ chuyên môn */}
          {activeTab === 'doctor' && isDoctor && (
            <form onSubmit={handleDoctorSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Học vị / Chức danh</label>
                  <input
                    type="text"
                    required
                    value={doctorForm.academicTitle}
                    onChange={(e) => setDoctorForm({ ...doctorForm, academicTitle: e.target.value })}
                    placeholder="BS.CKI, BS.CKII, ThS, PGS.TS..."
                    className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-sm font-medium text-slate-700">Số năm kinh nghiệm</label>
                    <span className="text-xs text-emerald-600 font-medium">Tự động tăng theo năm</span>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      max="60"
                      required
                      value={doctorForm.experienceYears}
                      onChange={(e) => setDoctorForm({ ...doctorForm, experienceYears: Number(e.target.value) })}
                      className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm font-semibold"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">năm</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Hành nghề từ ~{new Date().getFullYear() - (doctorForm.experienceYears || 0)} (hệ thống tự động tăng thêm 1 năm kinh nghiệm sau mỗi năm làm việc).
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phòng khám trực</label>
                <input
                  type="text"
                  required
                  value={doctorForm.roomNumber}
                  onChange={(e) => setDoctorForm({ ...doctorForm, roomNumber: e.target.value })}
                  placeholder="P.205, Khu B..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Tiểu sử & Chuyên môn giới thiệu</label>
                <textarea
                  rows={3}
                  value={doctorForm.bio}
                  onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })}
                  placeholder="Giới thiệu kinh nghiệm khám chữa bệnh, chứng chỉ hành nghề..."
                  className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm"
                />
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm transition disabled:bg-emerald-300 flex items-center gap-2 cursor-pointer"
                >
                  <Save size={18} />
                  {loading ? 'Đang lưu...' : 'Lưu hồ sơ Bác sĩ'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
