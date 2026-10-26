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
    bio: '',
  });

  // Patient Profile Form (CCCD, BHYT, Ngày sinh, Giới tính, Tiền sử bệnh án)
  const [patientForm, setPatientForm] = useState({
    cccdNumber: '',
    healthInsuranceNo: '',
    dateOfBirth: '',
    gender: 'MALE' as 'MALE' | 'FEMALE' | 'OTHER',
    address: '',
    medicalHistory: '',
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
            bio: data.doctorProfile.bio || '',
          });
        }

        if (data.patientProfile) {
          setPatientForm({
            cccdNumber: data.patientProfile.cccdNumber || '',
            healthInsuranceNo: data.patientProfile.healthInsuranceNo || '',
            dateOfBirth: data.patientProfile.dateOfBirth || '',
            gender: data.patientProfile.gender || 'MALE',
            address: data.patientProfile.address || '',
            medicalHistory: data.patientProfile.medicalHistory || '',
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

  useEffect(() => {
    const handleUrlTarget = () => {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('tab') === 'password' || window.location.hash === '#doi-mat-khau') {
          setTimeout(() => {
            document.getElementById('doi-mat-khau')?.scrollIntoView({ behavior: 'smooth' });
          }, 150);
        }
      }
    };
    handleUrlTarget();
    window.addEventListener('popstate', handleUrlTarget);
    const handleScrollTarget = (e: any) => {
      if (e?.detail?.target === 'password' || e?.detail?.tab === 'password') {
        document.getElementById('doi-mat-khau')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('medsched:switch_profile_tab', handleScrollTarget);
    return () => {
      window.removeEventListener('popstate', handleUrlTarget);
      window.removeEventListener('medsched:switch_profile_tab', handleScrollTarget);
    };
  }, []);

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

      let updatedPatientProfile = profile.patientProfile;
      try {
        const pRes = await api.updatePatientProfile({
          fullName: profile.fullName.trim(),
          cccdNumber: patientForm.cccdNumber.trim() || undefined,
          healthInsuranceNo: patientForm.healthInsuranceNo.trim() || undefined,
          dateOfBirth: patientForm.dateOfBirth || undefined,
          gender: patientForm.gender,
          phone: profile.phone.trim() || undefined,
          address: patientForm.address.trim() || undefined,
          medicalHistory: patientForm.medicalHistory.trim() || undefined,
        });
        updatedPatientProfile = pRes || updatedPatientProfile;
      } catch (pErr: any) {
        console.warn('Lỗi lưu patient profile:', pErr);
      }

      setMessage('Cập nhật thông tin cá nhân và hồ sơ y tế bệnh nhân thành công!');
      setProfile((prev) => ({
        ...prev,
        fullName: res.fullName || prev.fullName,
        phone: res.phone || prev.phone,
        patientProfile: updatedPatientProfile,
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
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('medsched_doctor_active_room');
    }
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

  const roles = profile.roles || [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isDoctor = roles.includes('ROLE_DOCTOR');
  const isStaff = roles.includes('ROLE_STAFF');

  const backLinkHref = isDoctor ? "/doctor" : isAdmin ? "/admin" : isStaff ? "/reception" : "/";
  const backLinkLabel = isDoctor ? "Quay về Buồng khám" : isAdmin ? "Quay về Quản trị" : isStaff ? "Quay về Tiếp đón" : "Quay về Trang chủ";

  const getCleanRoleBadges = (roles: string[]) => {
    const badges = [];
    const isSpecialRole = roles.includes('ROLE_ADMIN') || roles.includes('ROLE_DOCTOR') || roles.includes('ROLE_STAFF');

    if (roles.includes('ROLE_ADMIN')) {
      badges.push({ label: '👑 Quản Trị Viên', bg: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/40' });
    }
    if (roles.includes('ROLE_DOCTOR')) {
      badges.push({ label: '🩺 Bác Sĩ', bg: 'bg-cyan-500/20 text-cyan-200 border-cyan-400/40' });
    }
    if (roles.includes('ROLE_STAFF')) {
      badges.push({ label: '📋 Lễ Tân', bg: 'bg-amber-500/20 text-amber-200 border-amber-400/40' });
    }
    if (!isSpecialRole) {
      badges.push({ label: '🧑 Bệnh Nhân', bg: 'bg-teal-500/20 text-teal-200 border-teal-400/40' });
    }
    return badges;
  };

  return (
    <div className="max-w-6xl mx-auto py-3 px-3 sm:px-6 space-y-3">
      {/* Banner Tóm tắt người dùng - Compact Horizontal */}
      <div className="bg-gradient-to-r from-pine-teal to-teal-primary px-5 py-3 rounded-2xl text-white shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-lg font-black border border-white/30 shadow-xs shrink-0 text-white">
            {(profile.fullName || 'U').charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base sm:text-lg font-extrabold tracking-tight truncate leading-tight">
                {profile.fullName || 'Người dùng'}
              </h2>
              <div className="flex flex-wrap items-center gap-1.5">
                {getCleanRoleBadges(profile.roles).map((badge) => (
                  <span
                    key={badge.label}
                    className={`border px-2 py-0.5 rounded-full text-[10px] font-semibold backdrop-blur-xs ${badge.bg}`}
                  >
                    {badge.label}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-mint-light/90 text-xs mt-0.5 truncate">
              {profile.email} {profile.phone ? `• ${profile.phone}` : ''}
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {message && (
        <AlertMessage pinned type="success" message={message} onClose={() => setMessage(null)} />
      )}
      {error && (
        <AlertMessage pinned type="error" message={error} onClose={() => setError(null)} />
      )}

      {/* Card Thông Tin Hồ Sơ */}
      <div className="bg-white rounded-2xl shadow-sm border border-mint-light p-4 sm:p-5">
        <form onSubmit={handleProfileSubmit} className="space-y-3">
          {/* Hàng 1: Họ tên + SĐT + Email */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Họ và tên *</label>
              <input
                type="text"
                required
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-mint-light bg-mint-soft rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-pine-teal focus:border-teal-primary transition text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Số điện thoại *</label>
              <input
                type="tel"
                required
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full px-3 py-2 border border-mint-light bg-mint-soft rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-pine-teal focus:border-teal-primary transition text-xs font-medium"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Email tài khoản</label>
              <input
                type="email"
                disabled
                value={profile.email}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg cursor-not-allowed text-xs font-medium"
              />
            </div>
          </div>

          {/* Hàng 2: CCCD + BHYT + Ngày sinh + Giới tính */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Số CCCD / CMND</label>
              <input
                type="text"
                maxLength={12}
                value={patientForm.cccdNumber}
                onChange={(e) => setPatientForm({ ...patientForm, cccdNumber: e.target.value.replace(/\D/g, '') })}
                placeholder="079201008899"
                className="w-full px-3 py-2 border border-mint-light bg-mint-soft rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-pine-teal focus:border-teal-primary transition text-xs font-mono"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mã thẻ BHYT</label>
              <input
                type="text"
                maxLength={15}
                value={patientForm.healthInsuranceNo}
                onChange={(e) => setPatientForm({ ...patientForm, healthInsuranceNo: e.target.value.toUpperCase() })}
                placeholder="DN4790123456789"
                className="w-full px-3 py-2 border border-mint-light bg-mint-soft rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-pine-teal focus:border-teal-primary transition text-xs font-mono uppercase"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Ngày sinh</label>
              <input
                type="date"
                value={patientForm.dateOfBirth}
                onChange={(e) => setPatientForm({ ...patientForm, dateOfBirth: e.target.value })}
                className="w-full px-3 py-2 border border-mint-light bg-mint-soft rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-pine-teal focus:border-teal-primary transition text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Giới tính</label>
              <select
                value={patientForm.gender}
                onChange={(e) => setPatientForm({ ...patientForm, gender: e.target.value as any })}
                className="w-full px-3 py-2 border border-mint-light bg-mint-soft rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-pine-teal focus:border-teal-primary transition text-xs cursor-pointer"
              >
                <option value="MALE">Nam</option>
                <option value="FEMALE">Nữ</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          {/* Hàng 3: Địa chỉ thường trú */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Địa chỉ thường trú / Tạm trú</label>
            <input
              type="text"
              value={patientForm.address}
              onChange={(e) => setPatientForm({ ...patientForm, address: e.target.value })}
              placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố..."
              className="w-full px-3 py-2 border border-mint-light bg-mint-soft rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-pine-teal focus:border-teal-primary transition text-xs"
            />
          </div>

          {/* Hàng 4: Tiền sử bệnh án */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tiền sử bệnh án & Dị ứng thuốc</label>
            <textarea
              rows={2}
              value={patientForm.medicalHistory}
              onChange={(e) => setPatientForm({ ...patientForm, medicalHistory: e.target.value })}
              placeholder="Ví dụ: Tăng huyết áp, dị ứng Penicillin..."
              className="w-full px-3 py-2 border border-mint-light bg-mint-soft rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-pine-teal focus:border-teal-primary transition text-xs"
            />
          </div>

          {/* Nút lưu */}
          <div className="pt-1 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-pine-teal hover:bg-pine-teal-hover text-white font-bold px-6 py-2.5 rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <Save size={15} />
              {loading ? 'Đang lưu...' : 'Lưu Thay Đổi Hồ Sơ'}
            </button>
          </div>
        </form>
      </div>

      {/* Card Bác sĩ (chỉ hiển thị nếu là Bác sĩ) */}
      {isDoctor && (
        <div className="bg-white rounded-2xl shadow-sm border border-mint-light p-4 sm:p-5">
          <div className="border-b border-mint-light pb-2 mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Stethoscope className="text-blue-600" size={16} />
              Hồ Sơ Chuyên Môn Bác Sĩ
            </h3>
          </div>

          <form onSubmit={handleDoctorSubmit} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Học vị / Chức danh *</label>
                <input
                  type="text"
                  required
                  value={doctorForm.academicTitle}
                  onChange={(e) => setDoctorForm({ ...doctorForm, academicTitle: e.target.value })}
                  placeholder="BS.CKI, ThS, PGS.TS..."
                  className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Tiểu sử & Giới thiệu</label>
                <textarea
                  rows={2}
                  value={doctorForm.bio}
                  onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })}
                  placeholder="Kinh nghiệm khám chữa bệnh, chứng chỉ hành nghề..."
                  className="w-full px-3 py-1.5 border border-slate-200 bg-slate-50 rounded-lg outline-none focus:bg-white focus:ring-1 focus:ring-emerald-500 text-xs"
                />
              </div>
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-5 py-2 rounded-xl shadow-xs transition disabled:bg-emerald-300 flex items-center gap-1.5 cursor-pointer text-xs"
              >
                <Save size={15} />
                {loading ? 'Đang lưu...' : 'Lưu hồ sơ Bác sĩ'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
