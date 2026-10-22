'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Clock, 
  Calendar, 
  DoorOpen, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Plus, 
  Save, 
  RefreshCw, 
  ShieldCheck, 
  Lock, 
  Unlock, 
  Ticket, 
  UserCheck, 
  Stethoscope,
  Building2,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  Info,
  Zap,
  X
} from 'lucide-react';
import { 
  ClinicScheduleConfig, 
  getClinicScheduleConfig, 
  saveClinicScheduleConfig, 
  calculateSlotsForShift,
  SCHEDULE_CONFIG_UPDATED_EVENT 
} from '@/shared/lib/scheduleConfig';
import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

export default function ScheduleConfigManager() {
  const [activeTab, setActiveTab] = useState<'shifts' | 'doctorSchedules'>('shifts');
  const [config, setConfig] = useState<ClinicScheduleConfig>(getClinicScheduleConfig());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // State cho Tab 2: Quản lý Ca trực thực tế của Bác sĩ
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [schedules, setSchedules] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [lockingSlotId, setLockingSlotId] = useState<string | null>(null);

  // Modal tạo ca trực bổ sung
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [newScheduleDoctorId, setNewScheduleDoctorId] = useState('');
  const [newScheduleDate, setNewScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [newScheduleShift, setNewScheduleShift] = useState<'MORNING' | 'AFTERNOON' | 'EVENING'>('MORNING');
  const [newScheduleRoom, setNewScheduleRoom] = useState('P.101');
  const [addScheduleLoading, setAddScheduleLoading] = useState(false);
  const [syncingWeek, setSyncingWeek] = useState(false);

  // Bộ lọc Chi nhánh & Bác sĩ cho Tab 2
  const [filterCenter, setFilterCenter] = useState<string>('ALL');
  const [filterSearch, setFilterSearch] = useState<string>('');

  const availableCenters = useMemo(() => {
    const set = new Set<string>();
    schedules.forEach(s => {
      if (s.medicalCenterName) set.add(s.medicalCenterName);
    });
    return Array.from(set);
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      if (filterCenter !== 'ALL' && s.medicalCenterName !== filterCenter) return false;
      if (filterSearch.trim()) {
        const q = filterSearch.trim().toLowerCase();
        const dName = (s.doctorName || '').toLowerCase();
        const spec = (s.specialtyName || '').toLowerCase();
        const room = (s.roomNumber || '').toLowerCase();
        if (!dName.includes(q) && !spec.includes(q) && !room.includes(q)) return false;
      }
      return true;
    });
  }, [schedules, filterCenter, filterSearch]);

  // Kiểm tra ca trực đã có trong ngày của Bác sĩ đang chọn trong modal
  const existingShiftOnDate = useMemo(() => {
    if (!newScheduleDoctorId || !newScheduleDate) return null;
    return schedules.find(s => s.doctorId === newScheduleDoctorId && s.workDate === newScheduleDate && s.status === 'ACTIVE');
  }, [newScheduleDoctorId, newScheduleDate, schedules]);

  useEffect(() => {
    if (existingShiftOnDate?.roomNumber) {
      setNewScheduleRoom(existingShiftOnDate.roomNumber);
    }
  }, [existingShiftOnDate]);

  useEffect(() => {
    setConfig(getClinicScheduleConfig());
    const handleUpdate = () => setConfig(getClinicScheduleConfig());
    window.addEventListener(SCHEDULE_CONFIG_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(SCHEDULE_CONFIG_UPDATED_EVENT, handleUpdate);
  }, []);

  // Tải danh sách bác sĩ & ca trực thực tế
  const loadDoctorSchedules = async () => {
    setLoadingSchedules(true);
    try {
      // 1. Tải danh sách bác sĩ
      const docsRes = await api.getAdminUsers({ role: 'ROLE_DOCTOR', size: 100 });
      const rawDocs = docsRes?.items || docsRes?.content || (Array.isArray(docsRes) ? docsRes : []);
      setDoctors(rawDocs);

      // 2. Tải ca trực ngày đang chọn
      const schedulesRes = await api.getDoctorSchedules({
        from: selectedDate,
        to: selectedDate,
      });
      setSchedules(Array.isArray(schedulesRes) ? schedulesRes : []);
    } catch (err: any) {
      console.warn('Lỗi tải ca trực bác sĩ:', err);
    } finally {
      setLoadingSchedules(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'doctorSchedules') {
      loadDoctorSchedules();
    }
  }, [activeTab, selectedDate]);

  // Lưu cấu hình giờ khám
  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      const saved = saveClinicScheduleConfig(config, 'Quản Trị Viên (Admin)');
      setConfig(saved);
      setMessage({
        type: 'success',
        text: 'Đã lưu cấu hình khung giờ khám & ca trực toàn viện thành công! Các lượt đặt lịch mới sẽ tự động tuân thủ cấu hình này.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi lưu cấu hình ca khám.' });
    } finally {
      setSaveLoading(false);
    }
  };

  // Khóa / Mở slot khám trực tiếp
  const handleToggleSlotLock = async (slotId: string, currentStatus: string) => {
    setLockingSlotId(slotId);
    try {
      await api.toggleDoctorSlot(slotId);
      setMessage({
        type: 'success',
        text: `Đã ${currentStatus === 'AVAILABLE' ? 'KHÓA' : 'MỞ KHÓA'} khung giờ khám thành công!`,
      });
      loadDoctorSchedules();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể thay đổi trạng thái khung giờ.' });
    } finally {
      setLockingSlotId(null);
    }
  };

  // Tạo ca trực mới cho bác sĩ
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newScheduleDoctorId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn bác sĩ phân công ca trực.' });
      return;
    }
    setAddScheduleLoading(true);
    try {
      const startT = newScheduleShift === 'MORNING' ? config.morningShift.startTime : newScheduleShift === 'AFTERNOON' ? config.afternoonShift.startTime : config.eveningShift.startTime;
      const endT = newScheduleShift === 'MORNING' ? config.morningShift.endTime : newScheduleShift === 'AFTERNOON' ? config.afternoonShift.endTime : config.eveningShift.endTime;

      await api.createDoctorSchedule({
        doctorId: newScheduleDoctorId,
        workDate: newScheduleDate,
        startTime: startT,
        endTime: endT,
        roomNumber: newScheduleRoom,
      });

      setMessage({ type: 'success', text: `Phân công ca trực ngày [${newScheduleDate}] tại buồng [${newScheduleRoom}] thành công!` });
      setShowAddScheduleModal(false);
      loadDoctorSchedules();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Phân công ca trực thất bại. Kiểm tra trùng lịch hoặc buồng khám.' });
    } finally {
      setAddScheduleLoading(false);
    }
  };

  // Tự động sinh và đồng bộ lịch 7 ngày tới (1 tuần) cho toàn bộ bác sĩ
  const handleAutoGenerateWeek = async () => {
    setSyncingWeek(true);
    try {
      const res = await api.triggerAutoScheduleWeek();
      setMessage({
        type: 'success',
        text: res?.message || 'Hệ thống đã tự động quét và sinh đầy đủ lịch trực 7 ngày tới (1 tuần) cho toàn bộ bác sĩ!',
      });
      loadDoctorSchedules();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Lỗi khi kích hoạt tự động sinh lịch 7 ngày.',
      });
    } finally {
      setSyncingWeek(false);
    }
  };

  // Tính trước các slot sinh ra
  const morningSlots = calculateSlotsForShift(
    config.morningShift.startTime,
    config.morningShift.endTime,
    config.slotDurationMinutes
  );
  const afternoonSlots = calculateSlotsForShift(
    config.afternoonShift.startTime,
    config.afternoonShift.endTime,
    config.slotDurationMinutes
  );
  const eveningSlots = config.eveningShift.enabled
    ? calculateSlotsForShift(config.eveningShift.startTime, config.eveningShift.endTime, config.slotDurationMinutes)
    : [];

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Alert message */}
      {message && (
        <AlertMessage type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      {/* Header & Quick Navigation */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-mint-light shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-primary text-white flex items-center justify-center font-bold shadow-xs">
            <Clock size={20} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-pine-teal">Cấu Hình Khung Giờ Khám &amp; Ca Trực</h1>
            <p className="text-xs text-slate-500">Quản trị thời gian ca sáng, ca chiều, thời lượng slot khám và phân ca trực bác sĩ.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <Link
            href="/admin/promotions"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold rounded-xl transition border border-amber-200 cursor-pointer"
          >
            <Ticket size={14} />
            <span>Quản Lý Mã Khuyến Mãi</span>
          </Link>
          <Link
            href="/admin/catalog"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
          >
            <DoorOpen size={14} />
            <span>Danh Mục &amp; Buồng Khám</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-mint-light pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('shifts')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'shifts'
              ? 'bg-pine-teal text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:text-pine-teal hover:bg-mint-soft border border-mint-light'
          }`}
        >
          <Clock size={15} />
          <span>1. Cấu Hình Ca Khám Toàn Viện</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('doctorSchedules')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            activeTab === 'doctorSchedules'
              ? 'bg-pine-teal text-white shadow-2xs'
              : 'bg-white text-slate-600 hover:text-pine-teal hover:bg-mint-soft border border-mint-light'
          }`}
        >
          <Calendar size={15} />
          <span>2. Quản Lý Ca Trực &amp; Khóa Giờ Khám Bác Sĩ</span>
        </button>
      </div>

      {/* ── TAB 1: CẤU HÌNH CA KHÁM TOÀN VIỆN ── */}
      {activeTab === 'shifts' && (
        <form onSubmit={handleSaveConfig} className="space-y-5">
          {/* Top Quick Settings: Slot Duration & Operating Days */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Slot Duration */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Clock size={17} className="text-teal-primary" />
                <span>Thời Lượng Khung Giờ (Slot)</span>
              </div>
              <p className="text-xs text-slate-500">
                Quy định thời gian tiêu chuẩn cho mỗi ca khám bệnh nhân với bác sĩ.
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[15, 20, 30, 45, 60].map((duration) => (
                  <button
                    key={duration}
                    type="button"
                    onClick={() => setConfig({ ...config, slotDurationMinutes: duration })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition cursor-pointer border ${
                      config.slotDurationMinutes === duration
                        ? 'bg-teal-primary text-white border-teal-primary shadow-xs'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    {duration} phút
                  </button>
                ))}
              </div>
              <div className="text-[11px] text-teal-800 bg-teal-50 p-2 rounded-lg border border-teal-200">
                ✓ Đang chọn: <strong>{config.slotDurationMinutes} phút/ca</strong> (Chuẩn bệnh viện thông minh)
              </div>
            </div>

            {/* Operating Days */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3 md:col-span-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Calendar size={17} className="text-teal-primary" />
                <span>Ngày Tiếp Nhận Khám Bệnh Trong Tuần</span>
              </div>
              <p className="text-xs text-slate-500">
                Các ngày bật màu xanh là những ngày phòng khám mở cửa tiếp đón bệnh nhân đặt lịch.
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-1">
                {[
                  { key: 'monday', label: 'T2', name: 'Thứ 2' },
                  { key: 'tuesday', label: 'T3', name: 'Thứ 3' },
                  { key: 'wednesday', label: 'T4', name: 'Thứ 4' },
                  { key: 'thursday', label: 'T5', name: 'Thứ 5' },
                  { key: 'friday', label: 'T6', name: 'Thứ 6' },
                  { key: 'saturday', label: 'T7', name: 'Thứ 7' },
                  { key: 'sunday', label: 'CN', name: 'Chủ Nhật' },
                ].map((d) => {
                  const isChecked = (config.operatingDays as any)[d.key];
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() =>
                        setConfig({
                          ...config,
                          operatingDays: {
                            ...config.operatingDays,
                            [d.key]: !isChecked,
                          },
                        })
                      }
                      className={`py-2.5 px-2 rounded-xl text-center text-xs font-bold transition cursor-pointer border ${
                        isChecked
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-400 border-slate-200 line-through'
                      }`}
                    >
                      <div>{d.label}</div>
                      <div className="text-[9px] font-normal">{isChecked ? 'Mở' : 'Nghỉ'}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Shifts Details: Morning, Afternoon, Evening */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ca Sáng */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Sun size={15} />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{config.morningShift.name}</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {morningSlots.length} Khung Giờ
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={config.morningShift.startTime}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        morningShift: { ...config.morningShift, startTime: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    value={config.morningShift.endTime}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        morningShift: { ...config.morningShift, endTime: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold"
                  />
                </div>
              </div>

              {/* Preview slots sinh ra */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  Mô phỏng {morningSlots.length} slot sinh ra:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {morningSlots.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-[10.5px] font-mono font-bold"
                    >
                      {s.startTime} - {s.endTime}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Ca Chiều */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Sun size={15} />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{config.afternoonShift.name}</span>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                  {afternoonSlots.length} Khung Giờ
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ bắt đầu</label>
                  <input
                    type="time"
                    value={config.afternoonShift.startTime}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        afternoonShift: { ...config.afternoonShift, startTime: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Giờ kết thúc</label>
                  <input
                    type="time"
                    value={config.afternoonShift.endTime}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        afternoonShift: { ...config.afternoonShift, endTime: e.target.value },
                      })
                    }
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold"
                  />
                </div>
              </div>

              {/* Preview slots sinh ra */}
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                  Mô phỏng {afternoonSlots.length} slot sinh ra:
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                  {afternoonSlots.map((s, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-200 text-[10.5px] font-mono font-bold"
                    >
                      {s.startTime} - {s.endTime}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Ca Tối (Ngoài Giờ) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Moon size={15} />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{config.eveningShift.name}</span>
                </div>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-purple-800">
                  <input
                    type="checkbox"
                    checked={config.eveningShift.enabled}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        eveningShift: { ...config.eveningShift, enabled: e.target.checked },
                      })
                    }
                    className="rounded text-purple-600"
                  />
                  <span>{config.eveningShift.enabled ? 'Đang mở' : 'Đang tắt'}</span>
                </label>
              </div>

              {config.eveningShift.enabled ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Giờ bắt đầu</label>
                      <input
                        type="time"
                        value={config.eveningShift.startTime}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            eveningShift: { ...config.eveningShift, startTime: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Giờ kết thúc</label>
                      <input
                        type="time"
                        value={config.eveningShift.endTime}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            eveningShift: { ...config.eveningShift, endTime: e.target.value },
                          })
                        }
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-sm font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      Mô phỏng {eveningSlots.length} slot sinh ra:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {eveningSlots.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-md bg-purple-50 text-purple-900 border border-purple-200 text-[10.5px] font-mono font-bold"
                        >
                          {s.startTime} - {s.endTime}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Ca khám buổi tối hiện đang tắt. Bấm chọn ô ở trên để kích hoạt khám ngoài giờ.
                </div>
              )}
            </div>
          </div>

          {/* CẤU HÌNH TIẾP ĐÓN & XEN KẼ KHÁCH VÃNG LAI (WALK-IN INTERLEAVING PROTOCOL) */}
          <div className="bg-white p-5 rounded-2xl border-2 border-amber-200/90 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold shrink-0">
                  <Zap size={18} className="text-amber-600" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <span>Quy Tắc Xen Kẽ Khách Vãng Lai Tại Buồng Khám (Walk-in Buffer)</span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                      Tính Năng Đặc Quyền
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Cho phép Bác sĩ gọi ca vãng lai (W-) vào khám khi ca trước kết thúc sớm hoặc bệnh nhân chưa đến, nếu thời gian còn dư đủ an toàn.
                  </p>
                </div>
              </div>

              {/* Toggle Enable */}
              <label className="inline-flex items-center gap-2 cursor-pointer select-none shrink-0 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                <input
                  type="checkbox"
                  checked={config.walkinInterleaveEnabled ?? true}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      walkinInterleaveEnabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 text-teal-primary rounded focus:ring-teal-primary cursor-pointer"
                />
                <span className="text-xs font-bold text-amber-950">
                  {config.walkinInterleaveEnabled ? 'Đang Bật Chen Ngang' : 'Tắt Chen Ngang'}
                </span>
              </label>
            </div>

            {config.walkinInterleaveEnabled ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                {/* Khoảng trống tối thiểu */}
                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 block">
                      Khoảng trống tối thiểu trước ca hẹn kế tiếp:
                    </label>
                    <span className="text-amber-800 font-extrabold text-xs px-2 py-0.5 rounded bg-amber-100">
                      {config.walkinMinBufferMinutes ?? 15} phút
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Nếu thời gian còn lại trước ca hẹn tiếp theo $\ge$ ngưỡng này, hệ thống sẽ mở khóa nút gọi ca vãng lai. Nếu thời gian dưới ngưỡng này, hệ thống sẽ <strong>chặn đứng</strong> để tránh trễ giờ bệnh nhân đặt trước.
                  </p>
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[10, 15, 20, 30].map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            walkinMinBufferMinutes: mins,
                          })
                        }
                        className={`py-2 rounded-lg font-bold text-xs transition cursor-pointer border ${
                          (config.walkinMinBufferMinutes ?? 15) === mins
                            ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-amber-300'
                        }`}
                      >
                        {mins} phút {mins === 15 ? '⭐' : ''}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Giới hạn số ca vãng lai mỗi ca trực */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-bold text-slate-800 block">
                      Số ca vãng lai tối đa mỗi ca trực:
                    </label>
                    <span className="text-teal-800 font-extrabold text-xs px-2 py-0.5 rounded bg-teal-100">
                      {config.walkinMaxPerShift ? `${config.walkinMaxPerShift} ca/buồng` : 'Không giới hạn'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Giới hạn số bệnh nhân vãng lai chen ngang trong 1 ca trực để bảo đảm thời gian nghỉ ngơi cho Bác sĩ và chất lượng chẩn đoán.
                  </p>
                  <div className="grid grid-cols-4 gap-2 pt-1">
                    {[
                      { val: 2, label: '2 ca' },
                      { val: 4, label: '4 ca' },
                      { val: 6, label: '6 ca ⭐' },
                      { val: 0, label: 'Vô hạn' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() =>
                          setConfig({
                            ...config,
                            walkinMaxPerShift: opt.val,
                          })
                        }
                        className={`py-2 rounded-lg font-bold text-xs transition cursor-pointer border ${
                          (config.walkinMaxPerShift ?? 6) === opt.val
                            ? 'bg-teal-primary text-white border-teal-primary shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500">
                Tính năng chen ngang vãng lai đang tắt. Buồng khám chỉ gọi các ca đã đặt lịch hẹn trước.
              </div>
            )}
          </div>

          {/* Submit Action */}
          <div className="bg-white p-4 rounded-2xl border border-mint-light shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info size={15} className="text-teal-primary shrink-0" />
              <span>
                Cập nhật lần cuối: <strong>{new Date(config.updatedAt).toLocaleString('vi-VN')}</strong> bởi{' '}
                <strong>{config.updatedBy || 'Quản Trị Viên'}</strong>
              </span>
            </div>

            <button
              type="submit"
              disabled={saveLoading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-pine-teal hover:bg-pine-teal-hover text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
            >
              {saveLoading ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} />}
              <span>Lưu Cấu Hình Ca Khám Toàn Viện</span>
            </button>
          </div>
        </form>
      )}

      {/* ── TAB 2: QUẢN LÝ CA TRỰC & KHÓA GIỜ KHÁM BÁC SĨ ── */}
      {activeTab === 'doctorSchedules' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-mint-light shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 flex-wrap">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap">Chọn Ngày Khám:</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono focus:bg-white"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(new Date().toISOString().slice(0, 10))}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Hôm nay
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={loadDoctorSchedules}
                disabled={loadingSchedules}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                <RefreshCw size={14} className={loadingSchedules ? 'animate-spin' : ''} />
                <span>Làm mới</span>
              </button>

              <button
                type="button"
                onClick={handleAutoGenerateWeek}
                disabled={syncingWeek}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-60"
                title="Tự động kiểm tra và sinh lịch khám chuẩn (Sáng + Chiều, mỗi slot 30 phút) cho toàn bộ bác sĩ trong 7 ngày tới (1 tuần)"
              >
                <Sparkles size={14} className={syncingWeek ? 'animate-spin text-emerald-600' : 'text-emerald-600'} />
                <span>{syncingWeek ? 'Đang đồng bộ...' : 'Tự Động Sinh Lịch 7 Ngày Tới (1 Tuần)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddScheduleModal(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-pine-teal hover:bg-pine-teal-hover text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs"
              >
                <Plus size={15} />
                <span>Phân Công Ca Trực Mới</span>
              </button>
            </div>
          </div>

          {/* Banner thông báo quy định phân ca 1 Chi nhánh/ngày */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3.5 text-xs text-amber-900 flex items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-start sm:items-center gap-2.5">
              <Info size={18} className="text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
              <div className="leading-relaxed">
                <strong>Quy định phòng khám (Đã khóa đa chi nhánh theo buổi):</strong> Trong cùng một ngày làm việc, mỗi Bác sĩ chỉ được trực tại <strong>1 Chi nhánh duy nhất (1 Buồng khám cố định)</strong> để bảo đảm chất lượng tiếp đón và người bệnh không phải di chuyển giữa các buổi khám. Bác sĩ có thể trực tại các chi nhánh khác nhau theo từng ngày làm việc riêng biệt.
              </div>
            </div>
          </div>

          {/* Bộ lọc Chi nhánh & Bác sĩ */}
          <div className="bg-white p-3.5 rounded-2xl border border-mint-light shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-slate-600 flex items-center gap-1">
                <Building2 size={14} className="text-pine-teal" />
                <span>Chi nhánh:</span>
              </span>
              <select
                value={filterCenter}
                onChange={(e) => setFilterCenter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white cursor-pointer"
              >
                <option value="ALL">Tất cả chi nhánh ({availableCenters.length > 0 ? availableCenters.length : 'Toàn viện'})</option>
                {availableCenters.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              <div className="relative">
                <input
                  type="text"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  placeholder="Tìm bác sĩ, buồng (P.101...), khoa..."
                  className="pl-3 pr-6 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white w-56 sm:w-64"
                />
                {filterSearch && (
                  <button
                    type="button"
                    onClick={() => setFilterSearch('')}
                    className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-[10px] font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-semibold self-end sm:self-center">
              Đang hiển thị: <strong className="text-pine-teal">{filteredSchedules.length}</strong> ca trực
              {schedules.length !== filteredSchedules.length && ` (trong tổng số ${schedules.length} ca)`}
            </div>
          </div>

          {/* Danh sách ca trực bác sĩ */}
          <div className="bg-white rounded-2xl shadow-sm border border-mint-light overflow-hidden">
            {loadingSchedules ? (
              <div className="py-12 text-center text-xs text-slate-500">
                <RefreshCw size={24} className="animate-spin text-pine-teal mx-auto mb-2" />
                <span>Đang nạp danh sách ca trực và khung giờ khám...</span>
              </div>
            ) : filteredSchedules.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                <Calendar size={32} className="mx-auto text-slate-300" />
                <div className="font-bold text-slate-700 text-sm">
                  {schedules.length === 0 
                    ? `Chưa có ca trực nào vào ngày ${selectedDate}`
                    : 'Không tìm thấy ca trực nào phù hợp với bộ lọc hiện tại'}
                </div>
                <p>Tiến trình tự động sinh lịch trực 7 ngày tới chạy lúc 17:00 hằng ngày, hoặc bấm nút &quot;Tự Động Sinh Lịch 7 Ngày Tới (1 Tuần)&quot; ở trên để tạo ngay.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredSchedules.map((schedule: any) => {
                  const slots = schedule.slots || [];
                  const bookedCount = slots.filter((s: any) => s.status === 'BOOKED').length;
                  const availableCount = slots.filter((s: any) => s.status === 'AVAILABLE').length;
                  const lockedCount = slots.filter((s: any) => s.status === 'LOCKED').length;

                  return (
                    <div key={schedule.id || schedule.scheduleId} className="p-4 sm:p-5 hover:bg-mint-soft/30 transition space-y-3">
                      {/* Doctor & Room Info */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                            <Stethoscope size={18} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-800 text-sm">
                              {schedule.doctorName || 'Bác sĩ chuyên khoa'}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                              <span>Chuyên khoa: <strong>{schedule.specialtyName || 'Đa khoa'}</strong></span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold border border-purple-200">
                                <DoorOpen size={12} />
                                <span>Buồng: {schedule.roomNumber || 'P.101'}</span>
                              </span>
                              {schedule.medicalCenterName && (
                                <>
                                  <span>•</span>
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 font-bold border border-teal-200">
                                    <Building2 size={12} />
                                    <span>{schedule.medicalCenterName}</span>
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span className="font-mono text-slate-600">
                                {schedule.startTime?.slice(0, 5)} - {schedule.endTime?.slice(0, 5)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Summary Badges */}
                        <div className="flex items-center gap-2 text-[11px] font-bold">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {availableCount} Trống
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                            {bookedCount} Đã đặt
                          </span>
                          {lockedCount > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                              {lockedCount} Đã khóa
                            </span>
                          )}
                        </div>
                      </div>

                      {/* TimeSlots Matrix (Bấm vào để khóa/mở slot trực tiếp) */}
                      <div>
                        <span className="text-[11px] text-slate-400 block mb-1.5">
                          Danh sách khung giờ khám (Bấm vào từng ô để Khóa / Mở trực tiếp):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((slot: any) => {
                            const isAvailable = slot.status === 'AVAILABLE';
                            const isBooked = slot.status === 'BOOKED';
                            const isLocked = slot.status === 'LOCKED';
                            const isProcessing = lockingSlotId === slot.id;

                            return (
                              <button
                                key={slot.id}
                                type="button"
                                disabled={isBooked || isProcessing}
                                onClick={() => handleToggleSlotLock(slot.id, slot.status)}
                                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition shadow-2xs border ${
                                  isBooked
                                    ? 'bg-blue-100 text-blue-800 border-blue-300 cursor-not-allowed opacity-90'
                                    : isLocked
                                    ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 cursor-pointer'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 cursor-pointer'
                                }`}
                                title={
                                  isBooked
                                    ? 'Khung giờ này đã có bệnh nhân đặt lịch'
                                    : isLocked
                                    ? 'Đang bị khóa (Bấm để MỞ KHÓA cho bệnh nhân đặt)'
                                    : 'Đang trống (Bấm để KHÓA khung giờ này)'
                                }
                              >
                                {isProcessing ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : isBooked ? (
                                  <CheckCircle2 size={12} className="text-blue-600" />
                                ) : isLocked ? (
                                  <Lock size={12} className="text-red-500" />
                                ) : (
                                  <Unlock size={12} className="text-emerald-600" />
                                )}
                                <span>{slot.startTime?.slice(0, 5) || '00:00'}</span>
                                {isBooked && <span className="text-[9px] font-sans">Đã đặt</span>}
                                {isLocked && <span className="text-[9px] font-sans">Khóa</span>}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Phân công ca trực mới */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-mint-light w-full max-w-md overflow-hidden">
            <div className="bg-mint-soft px-6 py-4 border-b border-mint-light flex items-center justify-between">
              <div className="flex items-center gap-2 text-pine-teal font-bold text-base">
                <Calendar size={18} />
                <span>Phân Công Ca Trực Bác Sĩ Mới</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAddScheduleModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn Bác Sĩ <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={newScheduleDoctorId}
                  onChange={(e) => setNewScheduleDoctorId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="">-- Chọn bác sĩ --</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.medicalCenterName || 'MedSched'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Ngày Trực</label>
                <input
                  type="date"
                  required
                  value={newScheduleDate}
                  onChange={(e) => setNewScheduleDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Ca Làm Việc</label>
                  <select
                    value={newScheduleShift}
                    onChange={(e) => setNewScheduleShift(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="MORNING">Ca Sáng ({config.morningShift.startTime} - {config.morningShift.endTime})</option>
                    <option value="AFTERNOON">Ca Chiều ({config.afternoonShift.startTime} - {config.afternoonShift.endTime})</option>
                    <option value="EVENING">Ca Tối ({config.eveningShift.startTime} - {config.eveningShift.endTime})</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Buồng Khám {existingShiftOnDate && <span className="text-teal-700 font-bold">(Cố định 1 buồng/ngày)</span>}
                  </label>
                  <select
                    value={newScheduleRoom}
                    disabled={Boolean(existingShiftOnDate)}
                    onChange={(e) => setNewScheduleRoom(e.target.value)}
                    className={`w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold ${existingShiftOnDate ? 'opacity-80 bg-slate-100 cursor-not-allowed text-teal-800' : ''}`}
                  >
                    <option value="P.101">P.101 (Đa khoa & Cấp cứu)</option>
                    <option value="P.102">P.102 (Da liễu thẩm mỹ)</option>
                    <option value="P.205">P.205 (Tim mạch)</option>
                    <option value="P.208">P.208 (Nội tiêu hóa)</option>
                    <option value="P.209">P.209 (Tư vấn chuyên sâu)</option>
                  </select>
                </div>
              </div>

              {existingShiftOnDate && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-start gap-2">
                  <Building2 size={16} className="text-teal-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Quy định phòng khám (Khóa đa chi nhánh trong ngày):</span>
                    <p className="text-[11px] text-teal-800 mt-0.5 leading-relaxed">
                      Trong ngày <strong>{newScheduleDate}</strong>, Bác sĩ đã có ca trực tại buồng <strong>[{existingShiftOnDate.roomNumber || 'P.208'}]</strong> ({existingShiftOnDate.startTime} - {existingShiftOnDate.endTime}). Ca tiếp theo được tự động cố định tại buồng này để phục vụ người bệnh tốt nhất. Bác sĩ có thể chuyển chi nhánh/buồng khác vào các ngày làm việc khác!
                    </p>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400">
                Hệ thống sẽ tự động phân tách ca thành các khung giờ {config.slotDurationMinutes} phút theo đúng cấu hình toàn viện.
              </p>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={addScheduleLoading}
                  className="px-5 py-2 rounded-xl bg-pine-teal hover:bg-pine-teal-hover text-white font-bold shadow-xs"
                >
                  {addScheduleLoading ? 'Đang tạo...' : 'Tạo Ca Trực'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
