'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Stethoscope, 
  Building2, 
  Mail, 
  Phone, 
  User, 
  DoorOpen, 
  Lock,
  Check, 
  AlertCircle,
  GraduationCap,
  Coins
} from 'lucide-react';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { 
  getClinicRooms, 
  ROOMS_UPDATED_EVENT, 
  ClinicRoom, 
  addClinicRoom, 
  assignDoctorToRoom 
} from '@/shared/lib/clinicRooms';
import { 
  validateFullName, 
  validatePhone, 
  validateEmail, 
  validateTemporaryPassword 
} from '@/shared/lib/formValidations';

export const MEDICAL_ACADEMIC_TITLES = [
  { value: 'BS', label: 'Bác sĩ (BS)', defaultFee: 200000 },
  { value: 'BS.CKI', label: 'Bác sĩ Chuyên khoa I (BS.CKI)', defaultFee: 250000 },
  { value: 'BS.CKII', label: 'Bác sĩ Chuyên khoa II (BS.CKII)', defaultFee: 350000 },
  { value: 'ThS.BS', label: 'Thạc sĩ - Bác sĩ (ThS.BS)', defaultFee: 300000 },
  { value: 'TS.BS', label: 'Tiến sĩ - Bác sĩ (TS.BS)', defaultFee: 400000 },
  { value: 'PGS.TS.BS', label: 'Phó Giáo sư, Tiến sĩ - Bác sĩ (PGS.TS.BS)', defaultFee: 500000 },
  { value: 'GS.TS.BS', label: 'Giáo sư, Tiến sĩ - Bác sĩ (GS.TS.BS)', defaultFee: 600000 },
  { value: 'BSNT', label: 'Bác sĩ Nội trú (BSNT)', defaultFee: 250000 },
  { value: 'CUSTOM', label: 'Khác (Nhập tùy chỉnh...)', defaultFee: 300000 },
];

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

  // Học hàm / học vị chuẩn y khoa
  const [isCustomTitle, setIsCustomTitle] = useState<boolean>(false);
  const [customTitleValue, setCustomTitleValue] = useState<string>('');

  useEffect(() => {
    const refreshRooms = () => {
      const rooms = getClinicRooms();
      setAvailableRooms(rooms);
      // Ưu tiên chọn phòng dự phòng đầu tiên nếu có
      const firstBackup = rooms.find(r => r.isBackupRoom || !r.assignedDoctorName);
      if (firstBackup) {
        setSelectedRoom(firstBackup.code);
      } else if (rooms.length > 0 && !selectedRoom) {
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

  const selectedCenter = medicalCenters.find(c => c.id === doctorForm.medicalCenterId);
  const selectedCenterName = selectedCenter?.name || '';

  // Lọc danh sách buồng khám theo đúng Chi Nhánh công tác của Bác Sĩ
  const branchRooms = useMemo(() => {
    if (!selectedCenterName) return availableRooms;
    const isTrinhDinhThao = selectedCenterName.toLowerCase().includes('trịnh đình thảo') || selectedCenterName.toLowerCase().includes('itc');
    const isTranDaiNghia = selectedCenterName.toLowerCase().includes('trần đại nghĩa');

    return availableRooms.filter(r => {
      if (isTrinhDinhThao) {
        return r.medicalCenterName.toLowerCase().includes('trịnh đình thảo') || r.medicalCenterName.toLowerCase().includes('itc');
      }
      if (isTranDaiNghia) {
        return r.medicalCenterName.toLowerCase().includes('trần đại nghĩa');
      }
      return r.medicalCenterName === selectedCenterName;
    });
  }, [availableRooms, selectedCenterName]);

  const backupRooms = useMemo(() => {
    return branchRooms.filter(r => r.isBackupRoom || !r.assignedDoctorName);
  }, [branchRooms]);

  const occupiedRooms = useMemo(() => {
    return branchRooms.filter(r => !r.isBackupRoom && r.assignedDoctorName);
  }, [branchRooms]);

  // Khi đổi Chi Nhánh, nếu phòng đang chọn không thuộc chi nhánh hoặc đã có bác sĩ, tự động chọn phòng dự phòng đầu tiên
  useEffect(() => {
    if (isCustomRoom) return;
    const currentRoomObj = branchRooms.find(r => r.code === selectedRoom);
    if (!currentRoomObj || (!currentRoomObj.isBackupRoom && currentRoomObj.assignedDoctorName)) {
      if (backupRooms.length > 0) {
        setSelectedRoom(backupRooms[0].code);
      } else {
        // Chi nhánh không còn buồng dự phòng -> Tự chuyển sang chế độ tạo số phòng mới
        setIsCustomRoom(true);
        setCustomRoomValue('');
      }
    }
  }, [branchRooms, backupRooms, selectedRoom, isCustomRoom]);

  // Ràng buộc từng ký tự thời gian thực (Real-time Validation)
  const fullNameValidation = useMemo(() => validateFullName(doctorForm.fullName), [doctorForm.fullName]);
  const emailValidation = useMemo(() => validateEmail(doctorForm.email), [doctorForm.email]);
  const phoneValidation = useMemo(() => validatePhone(doctorForm.phone), [doctorForm.phone]);
  const passwordValidation = useMemo(() => validateTemporaryPassword(doctorForm.temporaryPassword), [doctorForm.temporaryPassword]);

  const isFormValid = useMemo(() => {
    const isRoomOccupied = !isCustomRoom && occupiedRooms.some(r => r.code === selectedRoom);
    const roomValid = isCustomRoom 
      ? Boolean(customRoomValue.trim()) 
      : Boolean(selectedRoom && !isRoomOccupied);
    const titleValid = !isCustomTitle || (Boolean(customTitleValue.trim()) && customTitleValue.trim().length >= 2);
    return fullNameValidation.isValid &&
      emailValidation.isValid &&
      phoneValidation.isValid &&
      passwordValidation.isValid &&
      Boolean(doctorForm.medicalCenterId) &&
      Boolean(doctorForm.specialtyId) &&
      roomValid &&
      titleValid;
  }, [fullNameValidation, emailValidation, phoneValidation, passwordValidation, doctorForm.medicalCenterId, doctorForm.specialtyId, isCustomRoom, customRoomValue, selectedRoom, occupiedRooms, isCustomTitle, customTitleValue]);

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) {
      setMessage({ type: 'error', text: 'Vui lòng kiểm tra và sửa các thông tin chưa hợp lệ theo hướng dẫn bên dưới mỗi ô.' });
      return;
    }

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

    if (!isCustomRoom && occupiedRooms.some(r => r.code === finalRoomNumber)) {
      setMessage({ 
        type: 'error', 
        text: `Buồng khám [${finalRoomNumber}] đã có Bác sĩ phụ trách. Để đảm bảo mỗi bác sĩ một phòng riêng, vui lòng chọn Buồng Dự Phòng hoặc nhập mã buồng khám mới!` 
      });
      setLoading(false);
      return;
    }

    const finalAcademicTitle = isCustomTitle 
      ? customTitleValue.trim() 
      : (doctorForm.academicTitle || 'ThS.BS');

    if (!finalAcademicTitle) {
      setMessage({ type: 'error', text: 'Vui lòng chọn hoặc nhập học hàm / học vị cho Bác sĩ.' });
      setLoading(false);
      return;
    }

    try {
      await api.createDoctor({
        fullName: doctorForm.fullName.trim(),
        email: doctorForm.email.trim(),
        phone: doctorForm.phone.trim(),
        temporaryPassword: doctorForm.temporaryPassword.trim() || undefined,
        medicalCenterId: doctorForm.medicalCenterId,
        specialtyId: doctorForm.specialtyId,
        academicTitle: finalAcademicTitle,
        consultationFee: Number(doctorForm.consultationFee) || 200000,
        roomNumber: finalRoomNumber,
        bio: doctorForm.bio.trim(),
      });

      // Cập nhật cấu hình buồng khám: Gán phòng riêng cho bác sĩ mới tạo
      const selectedSpec = specialties.find((s: any) => s.id === doctorForm.specialtyId);
      const centerObj = medicalCenters.find(c => c.id === doctorForm.medicalCenterId);
      const existing = availableRooms.find(r => r.code.toUpperCase() === finalRoomNumber.toUpperCase());
      if (!existing) {
        addClinicRoom({
          code: finalRoomNumber,
          name: `Phòng Khám ${selectedSpec?.name || 'Chuyên Khoa'}`,
          floor: 'Tầng 1',
          medicalCenterName: centerObj?.name || 'Phòng Khám Đa Khoa MedSched',
          status: 'active',
          note: `Buồng khám riêng của BS. ${doctorForm.fullName.trim()}`,
          assignedDoctorName: doctorForm.fullName.trim(),
          specialtyName: selectedSpec?.name || 'Đa Khoa',
          isBackupRoom: false,
        });
      } else {
        assignDoctorToRoom(finalRoomNumber, {
          fullName: doctorForm.fullName.trim(),
          specialtyName: selectedSpec?.name,
        });
      }

      setMessage({
        type: 'success',
        text: `Tạo tài khoản Bác sĩ thành công cho: ${doctorForm.email} tại buồng [${finalRoomNumber}] (${finalAcademicTitle})! Phòng đã được gán quyền riêng cho Bác sĩ. Mật khẩu: ${doctorForm.temporaryPassword || 'Medsched@123'}`,
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
      setIsCustomTitle(false);
      setCustomTitleValue('');
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

      {/* Họ và Tên Bác Sĩ */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center justify-between">
          <span>Họ và Tên Bác Sĩ <span className="text-red-500">*</span></span>
          <span className="text-[10px] text-slate-400 font-normal">Chữ cái tiếng Việt</span>
        </label>
        <div className="relative">
          <User className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            required
            maxLength={100}
            value={doctorForm.fullName}
            onChange={(e) => {
              const val = e.target.value.replace(/[^a-zA-Z\s.àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g, '');
              setDoctorForm({ ...doctorForm, fullName: val });
            }}
            placeholder="Ví dụ: PGS.TS Nguyễn Văn Bình"
            className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 transition ${
              doctorForm.fullName
                ? fullNameValidation.isValid
                  ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                  : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
            }`}
          />
        </div>
        {doctorForm.fullName && (
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
            <Mail className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="email"
              required
              maxLength={120}
              value={doctorForm.email}
              onChange={(e) => {
                const val = e.target.value.replace(/\s/g, '').toLowerCase();
                setDoctorForm({ ...doctorForm, email: val });
              }}
              placeholder="doctor.binh@medsched.vn"
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 transition ${
                doctorForm.email
                  ? emailValidation.isValid
                    ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                    : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
          </div>
          {doctorForm.email && (
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
            <Phone className="absolute left-3.5 top-3 text-slate-400" size={18} />
            <input
              type="tel"
              required
              maxLength={10}
              value={doctorForm.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                setDoctorForm({ ...doctorForm, phone: val });
              }}
              placeholder="0987654321"
              className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 transition ${
                doctorForm.phone
                  ? phoneValidation.isValid
                    ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                    : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                  : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
              }`}
            />
          </div>
          {doctorForm.phone && (
            <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
              phoneValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {phoneValidation.isValid ? <Check size={12} /> : <AlertCircle size={12} />}
              <span>{phoneValidation.message}</span>
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Chuyên Khoa Khám */}
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

        {/* Chi Nhánh Phòng Khám Công Tác */}
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
              {backupRooms.length > 0 && (
                <optgroup label={`📦 Buồng khám Dự Phòng tại chi nhánh (${backupRooms.length} buồng trống khả dụng)`}>
                  {backupRooms.map((room) => (
                    <option key={room.id} value={room.code}>
                      🟢 {room.code} - {room.name} ({room.floor})
                    </option>
                  ))}
                </optgroup>
              )}
              {occupiedRooms.length > 0 && (
                <optgroup label="⛔ Buồng khám ĐANG BẬN (Đã có Bác sĩ phụ trách - BỊ KHÓA)">
                  {occupiedRooms.map((room) => (
                    <option 
                      key={room.id} 
                      value={room.code} 
                      disabled 
                      className="text-slate-400 bg-slate-100 cursor-not-allowed font-normal"
                    >
                      ⛔ {room.code} - {room.name} (Đang dùng: {room.assignedDoctorName})
                    </option>
                  ))}
                </optgroup>
              )}
              <option value="CUSTOM" className="text-blue-600 font-bold">
                ➕ Mở buồng khám mới (Nhập số phòng...)
              </option>
            </select>
          </div>

          {isCustomRoom ? (
            <div>
              <div className="flex rounded-xl overflow-hidden border-2 border-blue-400 focus-within:ring-2 focus-within:ring-blue-500">
                <span className="inline-flex items-center px-3 bg-blue-100/70 text-blue-800 text-xs font-black select-none border-r border-blue-300">
                  P.
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={5}
                  value={customRoomValue.replace(/^P\./i, '').replace(/\D/g, '')}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, '');
                    setCustomRoomValue(digits ? `P.${digits}` : '');
                  }}
                  placeholder="Nhập số phòng (103, 301...)"
                  className="w-full px-3 py-2 bg-white text-sm font-bold text-blue-700 outline-none"
                  autoFocus
                />
              </div>
              <span className="text-[10px] text-blue-600 mt-0.5 block">
                Chỉ nhập số (Mã lưu: <strong>{customRoomValue || 'P._'}</strong>)
              </span>
            </div>
          ) : (
            <div className="flex items-center text-xs text-slate-600 bg-white/70 px-3 py-2 rounded-xl border border-blue-100">
              {(() => {
                const cur = branchRooms.find(r => r.code === selectedRoom);
                if (!cur) return <span>Đang phân công: <strong>{selectedRoom}</strong></span>;
                const isOccupied = !cur.isBackupRoom && Boolean(cur.assignedDoctorName);
                return (
                  <div className="space-y-0.5">
                    <div className="font-bold text-slate-800">
                      Buồng: <span className="text-blue-700">{cur.code}</span> - {cur.name} ({cur.floor})
                    </div>
                    <div className="text-[11px]">
                      {isOccupied ? (
                        <span className="text-red-600 font-bold flex items-center gap-1">
                          ⛔ Buồng đang bận: BS. {cur.assignedDoctorName} (Không thể gán trùng)
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          🟢 Buồng Dự Phòng tại chi nhánh (Sẵn sàng tiếp nhận Bác sĩ mới)
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center justify-between">
            <span>Học Hàm / Học Vị <span className="text-red-500">*</span></span>
            <span className="text-[10px] text-blue-600 font-semibold">Chuẩn danh xưng Y khoa</span>
          </label>
          <div className="relative">
            <GraduationCap className="absolute left-3.5 top-3 text-slate-400" size={17} />
            <select
              value={isCustomTitle ? 'CUSTOM' : doctorForm.academicTitle}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'CUSTOM') {
                  setIsCustomTitle(true);
                  setDoctorForm({ ...doctorForm, academicTitle: customTitleValue || '' });
                } else {
                  setIsCustomTitle(false);
                  const matched = MEDICAL_ACADEMIC_TITLES.find(t => t.value === val);
                  setDoctorForm({ 
                    ...doctorForm, 
                    academicTitle: val,
                    consultationFee: matched?.defaultFee || doctorForm.consultationFee
                  });
                }
              }}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-medium transition cursor-pointer"
            >
              {MEDICAL_ACADEMIC_TITLES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          {isCustomTitle && (
            <div className="mt-2">
              <input
                type="text"
                required
                maxLength={50}
                placeholder="Nhập danh xưng tùy chỉnh (ví dụ: TS.BS.CKII, MD...)"
                value={customTitleValue}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomTitleValue(val);
                  setDoctorForm({ ...doctorForm, academicTitle: val });
                }}
                className="w-full px-3 py-2 bg-white border border-blue-300 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              />
              {!customTitleValue.trim() && (
                <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <AlertCircle size={12} />
                  <span>Vui lòng nhập học hàm / học vị tùy chỉnh</span>
                </p>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center justify-between">
            <span>Giá Khám Tư Vấn (VNĐ) <span className="text-red-500">*</span></span>
            <span className="text-[10px] text-slate-400 font-normal">Tự động gợi ý theo học vị</span>
          </label>
          <div className="relative">
            <Coins className="absolute left-3.5 top-3 text-slate-400" size={17} />
            <input
              type="number"
              step="10000"
              min="0"
              value={doctorForm.consultationFee}
              onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: Number(e.target.value) })}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 text-sm font-mono font-medium"
            />
          </div>
        </div>
      </div>

      {/* Mật Khẩu Tạm Thời */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 uppercase mb-1 flex items-center justify-between">
          <span>Mật Khẩu Tạm Thời (Tùy chọn, mặc định: Medsched@123)</span>
          <span className="text-[10px] text-slate-400 font-normal">Tối thiểu 8 ký tự</span>
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-3 text-slate-400" size={18} />
          <input
            type="text"
            maxLength={72}
            value={doctorForm.temporaryPassword}
            onChange={(e) => {
              const val = e.target.value.replace(/\s/g, '');
              setDoctorForm({ ...doctorForm, temporaryPassword: val });
            }}
            placeholder="Để trống sẽ tự tạo Medsched@123"
            className={`w-full pl-10 pr-4 py-2.5 bg-slate-50 border rounded-xl text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 transition ${
              doctorForm.temporaryPassword
                ? passwordValidation.isValid
                  ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                  : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                : 'border-slate-200 focus:border-blue-500 focus:ring-blue-100'
            }`}
          />
        </div>
        {doctorForm.temporaryPassword && (
          <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
            passwordValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
          }`}>
            {passwordValidation.isValid ? <Check size={12} /> : <AlertCircle size={12} />}
            <span>{passwordValidation.message}</span>
          </p>
        )}
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
          disabled={loading || !isFormValid}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
        >
          <Stethoscope size={18} />
          <span>{loading ? 'Đang tạo tài khoản...' : 'Xác Nhận Tạo Tài Khoản Bác Sĩ'}</span>
        </button>
      </div>
    </form>
  );
}
