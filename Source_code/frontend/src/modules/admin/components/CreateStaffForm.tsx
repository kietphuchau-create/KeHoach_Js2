'use client';

import React, { useState } from 'react';
import { 
  UserCheck, 
  Building2, 
  Mail, 
  Lock, 
  Phone, 
  User, 
  UserPlus 
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

interface CreateStaffFormProps {
  medicalCenters: Array<{ id: string; name: string; address?: string }>;
  onSuccess?: () => void;
}

export default function CreateStaffForm({ medicalCenters, onSuccess }: CreateStaffFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    temporaryPassword: '',
    medicalCenterId: medicalCenters[0]?.id || '',
  });

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
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Tạo tài khoản Lễ tân thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleCreateStaff} className="space-y-4">
      {message && (
        <AlertMessage type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

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
                  {center.name} {center.address ? `- ${center.address}` : ''}
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
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus size={18} />
          <span>{loading ? 'Đang tạo tài khoản...' : 'Xác Nhận Tạo Tài Khoản Lễ Tân'}</span>
        </button>
      </div>
    </form>
  );
}
