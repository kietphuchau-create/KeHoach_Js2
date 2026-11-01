'use client';

import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  Mail, 
  Lock, 
  Phone, 
  User, 
  UserPlus,
  Check,
  AlertCircle
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { 
  validateFullName, 
  validatePhone, 
  validateEmail, 
  validateTemporaryPassword 
} from '@/shared/lib/formValidations';

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

  // Ràng buộc từng ký tự thời gian thực (Real-time Validation)
  const fullNameValidation = useMemo(() => validateFullName(staffForm.fullName), [staffForm.fullName]);
  const emailValidation = useMemo(() => validateEmail(staffForm.email), [staffForm.email]);
  const phoneValidation = useMemo(() => validatePhone(staffForm.phone), [staffForm.phone]);
  const passwordValidation = useMemo(() => validateTemporaryPassword(staffForm.temporaryPassword), [staffForm.temporaryPassword]);

  const isFormValid = useMemo(() => {
    return fullNameValidation.isValid &&
      emailValidation.isValid &&
      phoneValidation.isValid &&
      passwordValidation.isValid &&
      Boolean(staffForm.medicalCenterId);
  }, [fullNameValidation, emailValidation, phoneValidation, passwordValidation, staffForm.medicalCenterId]);

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setMessage({ type: 'error', text: 'Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ theo hướng dẫn bên dưới mỗi ô.' });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      await api.createStaff({
        fullName: staffForm.fullName.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim(),
        temporaryPassword: staffForm.temporaryPassword.trim() || undefined,
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
        <AlertMessage pinned type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      {/* Họ và Tên Nhân Viên */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center justify-between">
          <span>Họ và Tên Nhân Viên <span className="text-red-500">*</span></span>
          <span className="text-[10px] text-slate-400 font-normal">Chữ cái tiếng Việt</span>
        </label>
        <div className="relative">
          <User className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            required
            maxLength={100}
            value={staffForm.fullName}
            onChange={(e) => {
              const val = e.target.value.replace(/[^a-zA-Z\s.àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g, '');
              setStaffForm({ ...staffForm, fullName: val });
            }}
            placeholder="Ví dụ: Lê Thị Hạnh"
            className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 ${
              staffForm.fullName
                ? fullNameValidation.isValid
                  ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                  : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
            }`}
          />
        </div>
        {staffForm.fullName && (
          <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
            fullNameValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {fullNameValidation.isValid ? <Check size={12} /> : <AlertCircle size={12} />}
            <span>{fullNameValidation.message}</span>
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Email Đăng Nhập */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center justify-between">
            <span>Email Đăng Nhập <span className="text-red-500">*</span></span>
            <span className="text-[10px] text-slate-400 font-normal">Định dạng email</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="email"
              required
              maxLength={120}
              value={staffForm.email}
              onChange={(e) => {
                const val = e.target.value.replace(/\s/g, '').toLowerCase();
                setStaffForm({ ...staffForm, email: val });
              }}
              placeholder="letan01@medsched.vn"
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 ${
                staffForm.email
                  ? emailValidation.isValid
                    ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                    : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
              }`}
            />
          </div>
          {staffForm.email && (
            <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
              emailValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {emailValidation.isValid ? <Check size={12} /> : <AlertCircle size={12} />}
              <span>{emailValidation.message}</span>
            </p>
          )}
        </div>

        {/* Số Điện Thoại */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center justify-between">
            <span>Số Điện Thoại <span className="text-red-500">*</span></span>
            <span className="text-[10px] text-slate-400 font-normal">Đúng 10 chữ số</span>
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
            <input
              type="tel"
              required
              maxLength={10}
              value={staffForm.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                setStaffForm({ ...staffForm, phone: val });
              }}
              placeholder="0912345678"
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 ${
                staffForm.phone
                  ? phoneValidation.isValid
                    ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                    : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
              }`}
            />
          </div>
          {staffForm.phone && (
            <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
              phoneValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {phoneValidation.isValid ? <Check size={12} /> : <AlertCircle size={12} />}
              <span>{phoneValidation.message}</span>
            </p>
          )}
        </div>
      </div>

      {/* Mật Khẩu Tạm Thời */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center justify-between">
          <span>Mật Khẩu Tạm Thời (Tùy chọn, mặc định: Medsched@123)</span>
          <span className="text-[10px] text-slate-400 font-normal">Tối thiểu 8 ký tự</span>
        </label>
        <div className="relative">
          <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
          <input
            type="text"
            maxLength={72}
            value={staffForm.temporaryPassword}
            onChange={(e) => {
              const val = e.target.value.replace(/\s/g, '');
              setStaffForm({ ...staffForm, temporaryPassword: val });
            }}
            placeholder="Để trống sẽ tự tạo Medsched@123"
            className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 ${
              staffForm.temporaryPassword
                ? passwordValidation.isValid
                  ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                  : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-100'
            }`}
          />
        </div>
        {staffForm.temporaryPassword && (
          <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
            passwordValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {passwordValidation.isValid ? <Check size={12} /> : <AlertCircle size={12} />}
            <span>{passwordValidation.message}</span>
          </p>
        )}
      </div>

      {/* Chi Nhánh Phòng Khám Tiếp Đón */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
          Chi Nhánh Phòng Khám Tiếp Đón <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <Building2 className="absolute left-3 top-3 text-slate-400" size={18} />
          <select
            required
            value={staffForm.medicalCenterId}
            onChange={(e) => setStaffForm({ ...staffForm, medicalCenterId: e.target.value })}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
          >
            {medicalCenters.length === 0 ? (
              <option value="">Không có chi nhánh phòng khám nào</option>
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
          disabled={loading || !isFormValid}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          <UserPlus size={18} />
          <span>{loading ? 'Đang tạo tài khoản...' : 'Xác Nhận Tạo Tài Khoản Lễ Tân'}</span>
        </button>
      </div>
    </form>
  );
}
