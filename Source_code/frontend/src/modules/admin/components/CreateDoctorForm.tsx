'use client';

import React, { useState } from 'react';
import { 
  Stethoscope, 
  Building2, 
  Mail, 
  Phone, 
  User 
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

interface CreateDoctorFormProps {
  medicalCenters: Array<{ id: string; name: string }>;
  specialties: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export default function CreateDoctorForm({ medicalCenters, specialties, onSuccess }: CreateDoctorFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [doctorForm, setDoctorForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    temporaryPassword: '',
    medicalCenterId: medicalCenters[0]?.id || '',
    specialtyId: specialties[0]?.id || '',
    academicTitle: 'ThS.BS',
    consultationFee: 300000,
    bio: '',
  });

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
        consultationFee: Number(doctorForm.consultationFee) || 200000,
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
        consultationFee: 300000,
        bio: '',
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Tạo tài khoản Bác sĩ thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreateDoctor} className="space-y-4">
      {message && (
        <AlertMessage type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
          Họ và Tên Bác Sĩ <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            required
            value={doctorForm.fullName}
            onChange={(e) => setDoctorForm({ ...doctorForm, fullName: e.target.value })}
            placeholder="Ví dụ: PGS.TS Nguyễn Văn Bình"
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Email Đăng Nhập <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="email"
              required
              value={doctorForm.email}
              onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
              placeholder="doctor.binh@medsched.vn"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Số Điện Thoại <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="tel"
              required
              value={doctorForm.phone}
              onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
              placeholder="0987654321"
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm transition"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Giá Khám Tư Vấn (VND)</label>
          <input
            type="number"
            step="10000"
            value={doctorForm.consultationFee}
            onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: Number(e.target.value) })}
            className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-mono"
          />
        </div>
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
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Stethoscope size={18} />
          <span>{loading ? 'Đang tạo tài khoản...' : 'Xác Nhận Tạo Tài Khoản Bác Sĩ'}</span>
        </button>
      </div>
    </form>
  );
}
