'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  UserPlus, 
  Stethoscope, 
  UserCheck, 
  Building2, 
  Mail, 
  Lock, 
  Phone, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Briefcase,
  DollarSign,
  DoorOpen
} from 'lucide-react';
import { api, getAuthToken } from '@/lib/api';

export default function CreateUserPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'staff' | 'doctor'>('staff');
  const [medicalCenters, setMedicalCenters] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Staff Form
  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    temporaryPassword: '',
    medicalCenterId: '',
  });

  // Doctor Form
  const [doctorForm, setDoctorForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    temporaryPassword: '',
    medicalCenterId: '',
    specialtyId: '',
    academicTitle: 'ThS.BS',
    experienceYears: 5,
    consultationFee: 300000,
    roomNumber: 'P.101',
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
        const [centers, specs] = await Promise.all([
          api.getMedicalCenters().catch(() => []),
          api.getSpecialties().catch(() => []),
        ]);
        setMedicalCenters(centers);
        setSpecialties(specs);

        if (centers.length > 0) {
          setStaffForm(prev => ({ ...prev, medicalCenterId: centers[0].id }));
          setDoctorForm(prev => ({ ...prev, medicalCenterId: centers[0].id }));
        }
        if (specs.length > 0) {
          setDoctorForm(prev => ({ ...prev, specialtyId: specs[0].id }));
        }
      } catch (err) {
        console.error('Lỗi khi tải danh mục cơ sở/chuyên khoa:', err);
      } finally {
        setFetchingData(false);
      }
    }
    loadData();
  }, []);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await api.createStaff({
        fullName: staffForm.fullName.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim(),
        temporaryPassword: staffForm.temporaryPassword || undefined,
        medicalCenterId: staffForm.medicalCenterId,
      });

      setMessage({
        type: 'success',
        text: `Tạo tài khoản Lễ tân thành công cho: ${staffForm.email}! Mật khẩu mặc định: ${staffForm.temporaryPassword || 'Medsched@123'}`,
      });

      setStaffForm({
        fullName: '',
        email: '',
        phone: '',
        temporaryPassword: '',
        medicalCenterId: medicalCenters[0]?.id || '',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Tạo tài khoản Lễ tân thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await api.createDoctor({
        fullName: doctorForm.fullName.trim(),
        email: doctorForm.email.trim(),
        phone: doctorForm.phone.trim(),
        temporaryPassword: doctorForm.temporaryPassword || undefined,
        medicalCenterId: doctorForm.medicalCenterId,
        specialtyId: doctorForm.specialtyId,
        academicTitle: doctorForm.academicTitle,
        experienceYears: Number(doctorForm.experienceYears) || 1,
        consultationFee: Number(doctorForm.consultationFee) || 200000,
        roomNumber: doctorForm.roomNumber.trim(),
        bio: doctorForm.bio.trim(),
      });

      setMessage({
        type: 'success',
        text: `Tạo tài khoản Bác sĩ thành công cho: ${doctorForm.email}! Mật khẩu mặc định: ${doctorForm.temporaryPassword || 'Medsched@123'}`,
      });

      setDoctorForm({
        fullName: '',
        email: '',
        phone: '',
        temporaryPassword: '',
        medicalCenterId: medicalCenters[0]?.id || '',
        specialtyId: specialties[0]?.id || '',
        academicTitle: 'ThS.BS',
        experienceYears: 5,
        consultationFee: 300000,
        roomNumber: 'P.101',
        bio: '',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Tạo tài khoản Bác sĩ thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm transition"
        >
          <ArrowLeft size={16} />
          <span>Quay lại Quản trị</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">Quyền: Quản Trị Viên (Admin)</span>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Thêm Thành Viên Nội Bộ</h1>
          <p className="text-slate-500 text-sm mt-1">
            Cấp tài khoản đăng nhập hệ thống cho Đội ngũ Bác sĩ chuyên khoa và Nhân viên Lễ tân.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => { setActiveTab('staff'); setMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'staff'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck size={18} />
            <span>Thêm Nhân Viên Lễ Tân</span>
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('doctor'); setMessage(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition ${
              activeTab === 'doctor'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope size={18} />
            <span>Thêm Bác Sĩ Chuyên Khoa</span>
          </button>
        </div>

        {/* Status Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 border ${
            message.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Tab 1: Staff Form */}
        {activeTab === 'staff' && (
          <form onSubmit={handleCreateStaff} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Họ và Tên Nhân Viên <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={staffForm.fullName}
                  onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                  placeholder="Ví dụ: Lê Thị Hạnh"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Email Đăng Nhập <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    placeholder="letan01@medsched.vn"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Số Điện Thoại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="tel"
                    required
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    placeholder="0912345678"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Mật Khẩu Tạm Thời (Tùy chọn, mặc định: Medsched@123)
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  value={staffForm.temporaryPassword}
                  onChange={(e) => setStaffForm({ ...staffForm, temporaryPassword: e.target.value })}
                  placeholder="Để trống sẽ tự tạo Medsched@123"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Cơ Sở Y Tế Tiếp Đón Làm Việc <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <select
                  required
                  value={staffForm.medicalCenterId}
                  onChange={(e) => setStaffForm({ ...staffForm, medicalCenterId: e.target.value })}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                >
                  {medicalCenters.length === 0 ? (
                    <option value="">Không có cơ sở y tế nào</option>
                  ) : (
                    medicalCenters.map(center => (
                      <option key={center.id} value={center.id}>
                        {center.name} - {center.address}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <UserPlus size={18} />
                <span>{loading ? 'Đang tạo tài khoản...' : 'Xác Nhận Tạo Tài Khoản Lễ Tân'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab 2: Doctor Form */}
        {activeTab === 'doctor' && (
          <form onSubmit={handleCreateDoctor} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                Họ và Tên Bác Sĩ <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  required
                  value={doctorForm.fullName}
                  onChange={(e) => setDoctorForm({ ...doctorForm, fullName: e.target.value })}
                  placeholder="Ví dụ: PGS.TS Nguyễn Văn Bình"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Email Đăng Nhập <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="email"
                    required
                    value={doctorForm.email}
                    onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                    placeholder="doctor.binh@medsched.vn"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Số Điện Thoại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="tel"
                    required
                    value={doctorForm.phone}
                    onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
                    placeholder="0987654321"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Chuyên Khoa Khám <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={doctorForm.specialtyId}
                  onChange={(e) => setDoctorForm({ ...doctorForm, specialtyId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  {specialties.length === 0 ? (
                    <option value="">Không có chuyên khoa nào</option>
                  ) : (
                    specialties.map(spec => (
                      <option key={spec.id} value={spec.id}>
                        {spec.name}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Cơ Sở Y Tế Công Tác <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={doctorForm.medicalCenterId}
                  onChange={(e) => setDoctorForm({ ...doctorForm, medicalCenterId: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                >
                  {medicalCenters.length === 0 ? (
                    <option value="">Không có cơ sở y tế nào</option>
                  ) : (
                    medicalCenters.map(center => (
                      <option key={center.id} value={center.id}>
                        {center.name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Học Hàm / Học Vị</label>
                <input
                  type="text"
                  value={doctorForm.academicTitle}
                  onChange={(e) => setDoctorForm({ ...doctorForm, academicTitle: e.target.value })}
                  placeholder="GS, PGS, ThS, BS.CKII..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Số Năm Kinh Nghiệm</label>
                <input
                  type="number"
                  min="0"
                  value={doctorForm.experienceYears}
                  onChange={(e) => setDoctorForm({ ...doctorForm, experienceYears: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Phòng Khám Số</label>
                <input
                  type="text"
                  value={doctorForm.roomNumber}
                  onChange={(e) => setDoctorForm({ ...doctorForm, roomNumber: e.target.value })}
                  placeholder="P.102, Khu A..."
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Giá Khám Tư Vấn (VND)</label>
                <input
                  type="number"
                  step="10000"
                  value={doctorForm.consultationFee}
                  onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Mật Khẩu Tạm Thời (Tùy chọn)
                </label>
                <input
                  type="text"
                  value={doctorForm.temporaryPassword}
                  onChange={(e) => setDoctorForm({ ...doctorForm, temporaryPassword: e.target.value })}
                  placeholder="Để trống: Medsched@123"
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Tiểu Sử / Giới Thiệu Ngắn</label>
              <textarea
                rows={3}
                value={doctorForm.bio}
                onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })}
                placeholder="Giới thiệu về quá trình đào tạo, chuyên môn điều trị mũi nhọn..."
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Stethoscope size={18} />
                <span>{loading ? 'Đang tạo tài khoản...' : 'Xác Nhận Tạo Tài Khoản Bác Sĩ'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
