'use client';

import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Building2, 
  Mail, 
  Phone, 
  User,
  DoorOpen,
  Plus
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { getClinicRooms, ROOMS_UPDATED_EVENT, ClinicRoom } from '@/shared/lib/clinicRooms';

interface CreateDoctorFormProps {
  medicalCenters: Array<{ id: string; name: string }>;
  specialties: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export default function CreateDoctorForm({ medicalCenters, specialties, onSuccess }: CreateDoctorFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const initialCenterId = medicalCenters[0]?.id || '';
  const initialSpecs = specialties.filter((s: any) => s.medicalCenterId === initialCenterId);

  // Danh mục phòng khám lấy từ cấu hình
  const [availableRooms, setAvailableRooms] = useState<ClinicRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('P.208');
  const [isCustomRoom, setIsCustomRoom] = useState<boolean>(false);
  const [customRoomValue, setCustomRoomValue] = useState<string>('');

  useEffect(() => {
    const refreshRooms = () => {
      const rooms = getClinicRooms();
      setAvailableRooms(rooms);
      if (rooms.length > 0 && !selectedRoom) {
        setSelectedRoom(rooms[0].code);
      }
    };
    refreshRooms();

    window.addEventListener(ROOMS_UPDATED_EVENT, refreshRooms);
    return () => window.removeEventListener(ROOMS_UPDATED_EVENT, refreshRooms);
  }, []);

  const [doctorForm, setDoctorForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    temporaryPassword: '',
    medicalCenterId: initialCenterId,
    specialtyId: initialSpecs[0]?.id || '',
    academicTitle: 'ThS.BS',
    consultationFee: 300000,
    bio: '',
  });

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const finalRoomNumber = isCustomRoom 
      ? customRoomValue.trim().toUpperCase() 
      : selectedRoom;

    if (!finalRoomNumber) {
      setMessage({ type: 'error', text: 'Vui lòng chọn hoặc nhập phòng khám làm việc cho Bác sĩ.' });
      setLoading(false);
      return;
    }

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
        roomNumber: finalRoomNumber,
        bio: doctorForm.bio.trim(),
      });

      setMessage({
        type: 'success',
        text: `Tạo tài khoản Bác sĩ thành công cho: ${doctorForm.email} tại phòng [${finalRoomNumber}]! Mật khẩu mặc định: ${doctorForm.temporaryPassword || 'Medsched@123'}`,
      });

      const newInitialSpecs = specialties.filter((s: any) => s.medicalCenterId === initialCenterId);
      setDoctorForm({
        fullName: '',
        email: '',
        phone: '',
        temporaryPassword: '',
        medicalCenterId: initialCenterId,
        specialtyId: newInitialSpecs[0]?.id || '',
        academicTitle: 'ThS.BS',
        consultationFee: 300000,
        bio: '',
      });
      setIsCustomRoom(false);
      setCustomRoomValue('');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Tạo tài khoản Bác sĩ thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  const filteredSpecialties = specialties.filter((s: any) => s.medicalCenterId === doctorForm.medicalCenterId);

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
            {filteredSpecialties.length === 0 ? (
              <option value="">Không có chuyên khoa nào</option>
            ) : (
              filteredSpecialties.map(spec => (
                <option key={spec.id} value={spec.id}>
                  {spec.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
            Chi Nhánh Phòng Khám Công Tác <span className="text-red-500">*</span>
          </label>
          <select
            value={doctorForm.medicalCenterId}
            onChange={(e) => {
              const newCenterId = e.target.value;
              const newSpecs = specialties.filter((s: any) => s.medicalCenterId === newCenterId);
              setDoctorForm({ 
                ...doctorForm, 
                medicalCenterId: newCenterId,
                specialtyId: newSpecs.length > 0 ? newSpecs[0].id : ''
              });
            }}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          >
            {medicalCenters.length === 0 ? (
              <option value="">Không có chi nhánh phòng khám nào</option>
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

      {/* Cấu hình Phòng Khám cho Bác sĩ */}
      <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-bold text-blue-900 uppercase">
            <DoorOpen size={16} className="text-blue-600" />
            <span>Phòng Khám Làm Việc / Nơi Khám Bệnh <span className="text-red-500">*</span></span>
          </label>
          <span className="text-[11px] text-blue-600 font-medium">Admin chủ động cấu hình & gán phòng</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <select
              value={isCustomRoom ? 'CUSTOM' : selectedRoom}
              onChange={(e) => {
                if (e.target.value === 'CUSTOM') {
                  setIsCustomRoom(true);
                } else {
                  setIsCustomRoom(false);
                  setSelectedRoom(e.target.value);
                }
              }}
              className="w-full px-3 py-2.5 bg-white border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-slate-800"
            >
              <optgroup label="Danh mục phòng khám tiêu chuẩn">
                {availableRooms.map((room) => (
                  <option key={room.id} value={room.code}>
                    {room.code} - {room.name} ({room.floor})
                  </option>
                ))}
              </optgroup>
              <option value="CUSTOM" className="text-blue-600 font-bold">
                ➕ Mở phòng mới / Nhập mã phòng khác...
              </option>
            </select>
          </div>

          {isCustomRoom ? (
            <div>
              <input
                type="text"
                required
                value={customRoomValue}
                onChange={(e) => setCustomRoomValue(e.target.value)}
                placeholder="Nhập mã phòng (Ví dụ: P.209, P.301, P.210...)"
                className="w-full px-3 py-2.5 bg-white border-2 border-blue-400 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-bold text-blue-700 placeholder:text-slate-400 placeholder:font-normal"
                autoFocus
              />
            </div>
          ) : (
            <div className="flex items-center text-xs text-slate-600 bg-white/70 px-3 py-2 rounded-xl border border-blue-100">
              <span>Đang phân công: <strong>{selectedRoom}</strong> ({availableRooms.find(r => r.code === selectedRoom)?.name || 'Phòng khám chuyên khoa'})</span>
            </div>
          )}
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
