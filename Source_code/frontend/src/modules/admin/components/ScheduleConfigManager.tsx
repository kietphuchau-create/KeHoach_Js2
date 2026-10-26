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
  Trash2,
  X
} from 'lucide-react';
import { 
  ClinicScheduleConfig, 
  getClinicScheduleConfig, 
  saveClinicScheduleConfig, 
  calculateSlotsForShift,
  SCHEDULE_CONFIG_UPDATED_EVENT,
  ALL_OPERATING_DAYS_247,
  STANDARD_OPERATING_DAYS,
  DEFAULT_CLINIC_SCHEDULE_CONFIG
} from '@/shared/lib/scheduleConfig';
import { api } from '@/shared/lib/api';
import { getLocalDateString } from '@/shared/lib/formatters';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

export default function ScheduleConfigManager() {
  const [activeTab, setActiveTab] = useState<'shifts' | 'doctorSchedules'>('shifts');
  const [config, setConfig] = useState<ClinicScheduleConfig>(getClinicScheduleConfig());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);

  // State cho Tab 2: Quản lý Ca trực thực tế của Bác sĩ
  const [selectedDate, setSelectedDate] = useState<string>(getLocalDateString());
  const [schedules, setSchedules] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingSchedules, setLoadingSchedules] = useState(false);
  const [lockingSlotId, setLockingSlotId] = useState<string | null>(null);

  // Modal tạo ca trực bổ sung
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [newScheduleDoctorId, setNewScheduleDoctorId] = useState('');
  const [newScheduleDate, setNewScheduleDate] = useState(getLocalDateString());
  const [newScheduleShift, setNewScheduleShift] = useState<'NIGHT' | 'MORNING' | 'AFTERNOON' | 'EVENING'>('MORNING');
  const [newScheduleRoom, setNewScheduleRoom] = useState('P.101');
  const [addScheduleLoading, setAddScheduleLoading] = useState(false);
  const [syncingWeek, setSyncingWeek] = useState(false);
  const [resettingSchedules, setResettingSchedules] = useState(false);

  // Modal đổi buồng khám khẩn cấp (Emergency Room Reassign)
  const [changingRoomSchedule, setChangingRoomSchedule] = useState<any | null>(null);
  const [targetReassignRoom, setTargetReassignRoom] = useState<string>('P.101');
  const [changingRoomLoading, setChangingRoomLoading] = useState(false);

  // Modal xác nhận tắt Chế Độ Develop 24/7 (Cách 2: Cleanup Sandbox Modal)
  const [showCleanupModal, setShowCleanupModal] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

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

  // Đồng bộ chế độ xếp lịch & chế độ Develop 24/7 từ backend khi khởi tạo
  useEffect(() => {
    api.getScheduleMode().then((res) => {
      if (res) {
        setConfig((prev) => {
          const isDev = res.devMode247 ?? prev.devMode247 ?? false;
          const updated: ClinicScheduleConfig = {
            ...prev,
            autoScheduleEnabled: res.autoScheduleEnabled,
            minWorkHoursPerDay: res.minWorkHoursPerDay || 6,
            devMode247: isDev,
            ...(isDev
              ? {
                  operatingDays: { ...ALL_OPERATING_DAYS_247 },
                  nightShift: {
                    ...(prev.nightShift || DEFAULT_CLINIC_SCHEDULE_CONFIG.nightShift),
                    enabled: true,
                    startTime: prev.nightShift?.startTime || '00:00',
                    endTime: prev.nightShift?.endTime || '08:00',
                  },
                  morningShift: { ...prev.morningShift, enabled: true },
                  afternoonShift: { ...prev.afternoonShift, enabled: true },
                  eveningShift: {
                    ...prev.eveningShift,
                    enabled: true,
                    startTime: prev.eveningShift.startTime || '17:00',
                    endTime: (!prev.eveningShift.endTime || prev.eveningShift.endTime === '20:30') ? '23:30' : prev.eveningShift.endTime,
                  },
                }
              : {}),
          };
          saveClinicScheduleConfig(updated, 'Quản Trị Viên (Admin)');
          return updated;
        });
      }
    }).catch((err) => console.warn('Lỗi lấy chế độ xếp lịch từ server:', err));
  }, []);

  // Chuyển đổi nhanh chế độ Tự Động vs Thủ Công Demo
  const handleToggleScheduleMode = async (enabled: boolean) => {
    try {
      setSaveLoading(true);
      const res = await api.updateScheduleMode({
        autoScheduleEnabled: enabled,
        minWorkHoursPerDay: config.minWorkHoursPerDay || 6,
        devMode247: config.devMode247,
      });
      const newConfig = {
        ...config,
        autoScheduleEnabled: res.autoScheduleEnabled,
        minWorkHoursPerDay: res.minWorkHoursPerDay || 6,
        devMode247: res.devMode247 ?? config.devMode247,
      };
      saveClinicScheduleConfig(newConfig, 'Quản Trị Viên (Admin)');
      setConfig(newConfig);
      setMessage({
        type: 'success',
        text: enabled
          ? 'Đã kích hoạt [CHẾ ĐỘ TỰ ĐỘNG TOÀN VIỆN]: Hệ thống tự động quét và sinh ca trực chuẩn 7 ngày cho toàn bộ Bác sĩ.'
          : 'Đã kích hoạt [CHẾ ĐỘ BÁC SĨ TỰ ĐẶT LỊCH THỦ CÔNG - DEMO]: Bác sĩ tự do mở lịch không giới hạn số ngày, bắt buộc tối thiểu 6 tiếng/ngày mới được mở ngày tiếp theo.',
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Không thể cập nhật chế độ xếp lịch.' });
    } finally {
      setSaveLoading(false);
    }
  };

  // Xử lý khi bấm nút chuyển đổi Chế Độ Develop 24/7
  const handleToggleDevModeClick = () => {
    if (config.devMode247) {
      // Đang BẬT -> Muốn TẮT -> Hiện Hộp thoại xác nhận thông minh (Cách 2)
      setShowCleanupModal(true);
    } else {
      // Đang TẮT -> Muốn BẬT -> Kích hoạt ngay lập tức
      executeToggleDevMode(true, false);
    }
  };

  // Thực thi chuyển đổi chế độ Develop 24/7 (có hoặc không dọn dẹp dữ liệu test)
  const executeToggleDevMode = async (enabled: boolean, cleanupTestData: boolean) => {
    try {
      setSaveLoading(true);
      if (cleanupTestData) {
        setCleaningUp(true);
      }
      const res = await api.updateScheduleMode({
        autoScheduleEnabled: config.autoScheduleEnabled,
        minWorkHoursPerDay: config.minWorkHoursPerDay || 6,
        devMode247: enabled,
        cleanupTestData,
      });
      const isDev = res.devMode247 ?? enabled;
      const newConfig: ClinicScheduleConfig = {
        ...config,
        devMode247: isDev,
        operatingDays: isDev ? { ...ALL_OPERATING_DAYS_247 } : { ...STANDARD_OPERATING_DAYS },
        nightShift: {
          ...(config.nightShift || DEFAULT_CLINIC_SCHEDULE_CONFIG.nightShift),
          enabled: isDev,
          startTime: config.nightShift?.startTime || '00:00',
          endTime: config.nightShift?.endTime || '08:00',
        },
        morningShift: {
          ...config.morningShift,
          enabled: true,
        },
        afternoonShift: {
          ...config.afternoonShift,
          enabled: true,
        },
        eveningShift: {
          ...config.eveningShift,
          enabled: isDev,
          startTime: config.eveningShift.startTime || '17:00',
          endTime: isDev
            ? ((!config.eveningShift.endTime || config.eveningShift.endTime === '20:30') ? '23:30' : config.eveningShift.endTime)
            : config.eveningShift.endTime,
        },
      };
      saveClinicScheduleConfig(newConfig, 'Quản Trị Viên (Admin)');
      setConfig(newConfig);
      setShowCleanupModal(false);

      if (isDev) {
        setMessage({
          type: 'success',
          text: '⚡ ĐÃ KÍCH HOẠT [CHẾ ĐỘ DEVELOP 24/7]: Hệ thống hoạt động 24/7 không kể giờ hành chính! Đã tự động kích hoạt TOÀN BỘ 7 ngày trong tuần và 4 ca khám (Ca Đêm 00:00 - 08:00, Ca Sáng, Chiều, Tối 17:00 - 23:30). Mọi thao tác sau khi bật có thể được tự động xóa sạch khi tắt.',
        });
      } else if (cleanupTestData) {
        const schedCount = res.cleanedSchedulesCount ?? 0;
        const apptCount = res.cleanedAppointmentsCount ?? 0;
        setMessage({
          type: 'success',
          text: `🗑️ ĐÃ TẮT 24/7 & DỌN DẸP SẠCH: Đã xóa ${schedCount} ca trực và ${apptCount} lịch hẹn test tạo trong phiên 24/7. Hệ thống đã trở về giờ hành chính chuẩn an toàn!`,
        });
      } else {
        setMessage({
          type: 'success',
          text: '🛡️ ĐÃ TẮT [CHẾ ĐỘ DEVELOP 24/7]: Bảo lưu các ca trực và lịch hẹn đã đăng ký. Hệ thống trở về quy chuẩn giờ hành chính thông thường (T2 - T6, 07:30 - 17:00).',
        });
      }

      // Tải lại danh sách ca trực nếu đang mở tab ca trực
      if (activeTab === 'doctorSchedules') {
        loadDoctorSchedules();
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Không thể cập nhật chế độ Develop 24/7.' });
    } finally {
      setSaveLoading(false);
      setCleaningUp(false);
    }
  };

  // Lưu cấu hình giờ khám
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveLoading(true);
    try {
      await api.updateScheduleMode({
        autoScheduleEnabled: config.autoScheduleEnabled,
        minWorkHoursPerDay: config.minWorkHoursPerDay || 6,
        devMode247: config.devMode247,
      }).catch((e) => console.warn('Lỗi đồng bộ chế độ xếp lịch:', e));

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
      const startT = newScheduleShift === 'NIGHT'
        ? (config.nightShift?.startTime || '00:00')
        : newScheduleShift === 'MORNING'
        ? config.morningShift.startTime
        : newScheduleShift === 'AFTERNOON'
        ? config.afternoonShift.startTime
        : config.eveningShift.startTime;

      const endT = newScheduleShift === 'NIGHT'
        ? (config.nightShift?.endTime || '08:00')
        : newScheduleShift === 'MORNING'
        ? config.morningShift.endTime
        : newScheduleShift === 'AFTERNOON'
        ? config.afternoonShift.endTime
        : config.eveningShift.endTime;

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

  // Điều phối đổi buồng khám khẩn cấp cho ca trực (Admin Emergency Room Reassign)
  const handleEmergencyChangeRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changingRoomSchedule) return;
    setChangingRoomLoading(true);
    try {
      await api.changeDoctorScheduleRoom(changingRoomSchedule.id, targetReassignRoom);
      setMessage({
        type: 'success',
        text: `[ĐIỀU PHỐI KHẨN CẤP] Đã đổi buồng khám ca trực của Bác sĩ [${changingRoomSchedule.doctorName}] sang buồng [${targetReassignRoom}] thành công!`,
      });
      setChangingRoomSchedule(null);
      loadDoctorSchedules();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Không thể đổi buồng khám cho ca trực.',
      });
    } finally {
      setChangingRoomLoading(false);
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

  // Quản Trị Viên dọn sạch toàn bộ ca trực trống chưa có người đặt để đưa số liệu về 0
  const handleResetUnbookedSchedules = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn dọn sạch toàn bộ các ca trực chưa có bệnh nhân đặt lịch để đưa số ca trực về 0 không?')) {
      return;
    }
    setResettingSchedules(true);
    try {
      const res = await api.resetUnbookedSchedules();
      setMessage({
        type: 'success',
        text: `🗑️ ${res.message || 'Đã dọn dẹp các ca trực trống thành công!'}`,
      });
      loadDoctorSchedules();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err?.message || 'Không thể dọn dẹp ca trực trống.',
      });
    } finally {
      setResettingSchedules(false);
    }
  };

  // Tính trước các slot sinh ra
  const nightSlots = config.nightShift?.enabled
    ? calculateSlotsForShift(
        config.nightShift.startTime || '00:00',
        config.nightShift.endTime || '08:00',
        config.slotDurationMinutes
      )
    : [];
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
      {/* Cửa sổ thông báo ghim cố định góc trên bên phải màn hình */}
      {message && (
        <AlertMessage
          pinned
          type={message.type}
          message={message.text}
          onClose={() => setMessage(null)}
        />
      )}



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
          {/* ── BẢNG ĐIỀU KHIỂN CHẾ ĐỘ XẾP LỊCH & CHẾ ĐỘ DEVELOP 24/7 ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Card 1: Chế Độ Xếp Lịch Toàn Viện */}
            <div className="bg-gradient-to-br from-slate-900 via-pine-teal to-teal-900 p-5 rounded-3xl text-white shadow-lg space-y-3 border border-teal-500/30 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-teal-400/20 text-teal-300 flex items-center justify-center font-bold border border-teal-400/30 shadow-inner shrink-0">
                      <Sparkles size={22} className="text-teal-300 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-black text-white">Chế Độ Xếp Lịch Toàn Viện</h2>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          config.autoScheduleEnabled
                            ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/30'
                            : 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30'
                        }`}>
                          {config.autoScheduleEnabled ? 'Tự Động 7 Ngày (BẬT)' : 'Thủ Công Demo (TẮT)'}
                        </span>
                      </div>
                      <p className="text-xs text-teal-100/70 mt-1 leading-relaxed">
                        {config.autoScheduleEnabled
                          ? '⚡ Đang BẬT: Hệ thống tự động quét và sinh ca trực chuẩn 7 ngày lúc 17:00 hằng ngày.'
                          : '🛡️ Đang TẮT: Bác sĩ tự do mở ca trực thực tế. Bệnh nhân thấy đúng 100% lịch thật.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 flex-wrap">
                <div className="flex items-center gap-2 bg-black/25 px-3 py-1.5 rounded-2xl border border-white/10">
                  <span className="text-[11px] text-teal-200 font-semibold">Chỉ tiêu:</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={config.minWorkHoursPerDay || 6}
                    onChange={(e) => setConfig({ ...config, minWorkHoursPerDay: Math.max(1, Number(e.target.value)) })}
                    className="w-10 px-1 py-0.5 text-center font-black bg-white/15 text-white rounded-lg border border-teal-400/40 text-xs focus:ring-2 focus:ring-teal-400 outline-none"
                  />
                  <span className="text-[11px] text-teal-200 font-bold">giờ/ngày</span>
                </div>

                <div className="flex items-center gap-2.5 bg-black/30 p-1.5 px-3 rounded-2xl border border-white/10 shadow-inner">
                  <span className="text-xs font-bold text-teal-200">
                    {config.autoScheduleEnabled ? 'BẬT (Tự Động)' : 'TẮT (Thủ Công)'}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={config.autoScheduleEnabled}
                    onClick={() => handleToggleScheduleMode(!config.autoScheduleEnabled)}
                    className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      config.autoScheduleEnabled ? 'bg-cyan-500 shadow-sm shadow-cyan-400/50' : 'bg-slate-700'
                    }`}
                    title="Bật/Tắt chế độ tự động xếp lịch toàn viện"
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        config.autoScheduleEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Chế Độ Develop 24/7 (Vận Hành Ngoài Giờ Hành Chính) */}
            <div className={`p-5 rounded-3xl text-white shadow-lg space-y-3 border transition-all duration-300 flex flex-col justify-between ${
              config.devMode247
                ? 'bg-gradient-to-br from-slate-900 via-purple-950 to-indigo-950 border-purple-500/50 shadow-purple-900/30'
                : 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700/60'
            }`}>
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold border shadow-inner shrink-0 ${
                      config.devMode247
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                        : 'bg-slate-700/40 text-slate-400 border-slate-600/40'
                    }`}>
                      <Zap size={22} className={config.devMode247 ? 'text-amber-300 animate-bounce' : 'text-slate-400'} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-base font-black text-white">Chế Độ Develop 24/7</h2>
                        <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          config.devMode247
                            ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                            : 'bg-slate-700/60 text-slate-300 border border-slate-600/40'
                        }`}>
                          {config.devMode247 ? '24/7 Hoạt Động (BẬT)' : 'Giờ Hành Chính (TẮT)'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300/80 mt-1 leading-relaxed">
                        {config.devMode247
                          ? '🚀 Đang BẬT: Hệ thống hoạt động 24/7! Mở ca tối (17h - 23h), Bác sĩ đăng ký ca trực mọi lúc không bị chặn giờ hành chính.'
                          : '🏢 Đang TẮT: Áp dụng quy chuẩn giờ hành chính (07:30 - 17:00), đóng ca và chuyển ngày sau 17:00.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 flex-wrap">
                <div className="text-[11px] text-purple-200/80 font-medium">
                  {config.devMode247 ? '✓ Đang mở ca tối & đêm (17:00 - 23:00)' : '• Chỉ mở ca sáng & chiều'}
                </div>

                <div className="flex items-center gap-2.5">
                  {config.devMode247 && (
                    <button
                      type="button"
                      disabled={saveLoading || cleaningUp}
                      onClick={() => setShowCleanupModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-200 hover:text-white bg-rose-500/25 hover:bg-rose-500/40 border border-rose-400/40 rounded-xl transition-all shadow-xs"
                      title="Dọn dẹp nhanh các ca trực và lịch hẹn kiểm thử phát sinh trong phiên 24/7"
                    >
                      <Trash2 size={13} className="text-rose-300" />
                      <span>Dọn Dẹp Test</span>
                    </button>
                  )}
                  <div className="flex items-center gap-2.5 bg-black/30 p-1.5 px-3 rounded-2xl border border-white/10 shadow-inner">
                    <span className={`text-xs font-bold ${config.devMode247 ? 'text-amber-300' : 'text-slate-400'}`}>
                      {config.devMode247 ? 'BẬT (24/7)' : 'TẮT (Hành chính)'}
                    </span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={config.devMode247}
                      onClick={handleToggleDevModeClick}
                      className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                        config.devMode247 ? 'bg-gradient-to-r from-amber-500 to-purple-600 shadow-sm shadow-amber-500/50' : 'bg-slate-700'
                      }`}
                      title="Bật/Tắt chế độ Develop 24/7 hoạt động ngoài giờ hành chính"
                    >
                      <span
                        aria-hidden="true"
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          config.devMode247 ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

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
            <div className={`p-5 rounded-2xl border shadow-xs space-y-3 md:col-span-2 transition-all duration-200 ${
              config.devMode247 ? 'bg-amber-50/20 border-amber-300 shadow-amber-50/50' : 'bg-white border-slate-200/90'
            }`}>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Calendar size={17} className="text-teal-primary" />
                  <span>Ngày Tiếp Nhận Khám Bệnh Trong Tuần</span>
                </div>
                {config.devMode247 ? (
                  <span className="text-[11px] font-extrabold text-amber-800 bg-amber-100 border border-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-2xs">
                    <Lock size={12} className="text-amber-700" />
                    <span>24/7 BẬT: Đã khóa cố định 7/7 ngày (Không thể chỉnh sửa)</span>
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-500">
                    Bấm để bật/tắt từng ngày tiếp nhận
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {config.devMode247
                  ? 'Chế độ Develop 24/7 đang kích hoạt: Hệ thống mở cửa phục vụ liên tục mọi ngày trong tuần (T2 đến CN). Các ngày đã được khóa cố định.'
                  : 'Các ngày bật màu xanh là những ngày phòng khám mở cửa tiếp đón bệnh nhân đặt lịch.'}
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
                  const isChecked = Boolean((config.operatingDays as any)[d.key]);
                  const isDisabled = Boolean(config.devMode247);
                  return (
                    <button
                      key={d.key}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => {
                        if (!isDisabled) {
                          setConfig({
                            ...config,
                            operatingDays: {
                              ...config.operatingDays,
                              [d.key]: !isChecked,
                            },
                          });
                        }
                      }}
                      title={isDisabled ? `Đã khóa cố định bởi Chế Độ 24/7 (${d.name})` : `Nhấp để chuyển trạng thái ngày ${d.name}`}
                      className={`py-2.5 px-2 rounded-xl text-center text-xs font-bold transition border relative ${
                        isDisabled
                          ? 'bg-emerald-100/80 text-emerald-950 border-emerald-300 cursor-not-allowed opacity-90 select-none'
                          : isChecked
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs hover:bg-emerald-100 cursor-pointer'
                          : 'bg-slate-50 text-slate-400 border-slate-200 line-through hover:bg-slate-100 cursor-pointer'
                      }`}
                    >
                      {isDisabled && (
                        <div className="absolute top-1 right-1">
                          <Lock size={9} className="text-emerald-700 opacity-80" />
                        </div>
                      )}
                      <div>{d.label}</div>
                      <div className="text-[9px] font-normal">{isDisabled ? 'Mở (24/7)' : isChecked ? 'Mở' : 'Nghỉ'}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>


          {/* Shifts Details: Night (00:00 - 08:00), Morning, Afternoon, Evening */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {/* Ca Đêm (00:00 - 08:00) */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 transition-all duration-200 ${
              config.nightShift?.enabled ? 'bg-indigo-50/25 border-indigo-300 shadow-indigo-100/50' : 'bg-white border-slate-200/90'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                    <Moon size={15} />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{config.nightShift?.name || 'Ca Đêm (00:00 - 08:00)'}</span>
                </div>
                <div className="flex items-center gap-2">
                  {config.nightShift?.enabled && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                      {nightSlots.length} Khung Giờ
                    </span>
                  )}
                  {config.devMode247 ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs cursor-not-allowed select-none">
                      <Lock size={11} className="text-amber-700" />
                      24/7 Khóa Mở
                    </span>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-800">
                      <input
                        type="checkbox"
                        checked={config.nightShift?.enabled ?? false}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            nightShift: { ...(config.nightShift || DEFAULT_CLINIC_SCHEDULE_CONFIG.nightShift), enabled: e.target.checked },
                          })
                        }
                        className="rounded text-indigo-600 cursor-pointer"
                      />
                      <span>{config.nightShift?.enabled ? 'Đang mở' : 'Đang tắt'}</span>
                    </label>
                  )}
                </div>
              </div>

              {config.nightShift?.enabled ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <span>Giờ bắt đầu</span>
                        {config.devMode247 && <Lock size={10} className="text-slate-400" />}
                      </label>
                      <input
                        type="time"
                        disabled={config.devMode247}
                        readOnly={config.devMode247}
                        value={config.nightShift?.startTime || '00:00'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            nightShift: { ...(config.nightShift || DEFAULT_CLINIC_SCHEDULE_CONFIG.nightShift), startTime: e.target.value },
                          })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-mono text-sm font-bold ${
                          config.devMode247
                            ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed select-none'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <span>Giờ kết thúc</span>
                        {config.devMode247 && <Lock size={10} className="text-slate-400" />}
                      </label>
                      <input
                        type="time"
                        disabled={config.devMode247}
                        readOnly={config.devMode247}
                        value={config.nightShift?.endTime || '08:00'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            nightShift: { ...(config.nightShift || DEFAULT_CLINIC_SCHEDULE_CONFIG.nightShift), endTime: e.target.value },
                          })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-mono text-sm font-bold ${
                          config.devMode247
                            ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed select-none'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1.5">
                      Mô phỏng {nightSlots.length} slot sinh ra:
                    </span>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                      {nightSlots.map((s, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200 text-[10.5px] font-mono font-bold"
                        >
                          {s.startTime} - {s.endTime}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Ca trực đêm hiện đang tắt. Bấm chọn ô ở trên hoặc bật Chế Độ 24/7 để kích hoạt.
                </div>
              )}
            </div>

            {/* Ca Sáng */}
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 transition-all duration-200 ${
              config.devMode247 ? 'bg-amber-50/15 border-amber-300/80 shadow-amber-50/40' : 'bg-white border-slate-200/90'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                    <Sun size={15} />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{config.morningShift.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                    {morningSlots.length} Khung Giờ
                  </span>
                  {config.devMode247 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs cursor-not-allowed select-none">
                      <Lock size={11} className="text-amber-700" />
                      24/7 Khóa Cố Định
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Giờ bắt đầu</span>
                    {config.devMode247 && <Lock size={10} className="text-slate-400" />}
                  </label>
                  <input
                    type="time"
                    disabled={config.devMode247}
                    readOnly={config.devMode247}
                    value={config.morningShift.startTime}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        morningShift: { ...config.morningShift, startTime: e.target.value },
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-xl font-mono text-sm font-bold ${
                      config.devMode247
                        ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed select-none'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Giờ kết thúc</span>
                    {config.devMode247 && <Lock size={10} className="text-slate-400" />}
                  </label>
                  <input
                    type="time"
                    disabled={config.devMode247}
                    readOnly={config.devMode247}
                    value={config.morningShift.endTime}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        morningShift: { ...config.morningShift, endTime: e.target.value },
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-xl font-mono text-sm font-bold ${
                      config.devMode247
                        ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed select-none'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
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
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 transition-all duration-200 ${
              config.devMode247 ? 'bg-blue-50/15 border-blue-300/80 shadow-blue-50/40' : 'bg-white border-slate-200/90'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <Sun size={15} />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{config.afternoonShift.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {afternoonSlots.length} Khung Giờ
                  </span>
                  {config.devMode247 && (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs cursor-not-allowed select-none">
                      <Lock size={11} className="text-amber-700" />
                      24/7 Khóa Cố Định
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Giờ bắt đầu</span>
                    {config.devMode247 && <Lock size={10} className="text-slate-400" />}
                  </label>
                  <input
                    type="time"
                    disabled={config.devMode247}
                    readOnly={config.devMode247}
                    value={config.afternoonShift.startTime}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        afternoonShift: { ...config.afternoonShift, startTime: e.target.value },
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-xl font-mono text-sm font-bold ${
                      config.devMode247
                        ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed select-none'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                    <span>Giờ kết thúc</span>
                    {config.devMode247 && <Lock size={10} className="text-slate-400" />}
                  </label>
                  <input
                    type="time"
                    disabled={config.devMode247}
                    readOnly={config.devMode247}
                    value={config.afternoonShift.endTime}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        afternoonShift: { ...config.afternoonShift, endTime: e.target.value },
                      })
                    }
                    className={`w-full px-3 py-2 border rounded-xl font-mono text-sm font-bold ${
                      config.devMode247
                        ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed select-none'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
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
            <div className={`p-5 rounded-2xl border shadow-xs space-y-4 transition-all duration-200 ${
              config.devMode247 ? 'bg-purple-50/25 border-purple-300 shadow-purple-100/50' : 'bg-white border-slate-200/90'
            }`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Moon size={15} />
                  </div>
                  <span className="font-bold text-slate-800 text-sm">{config.eveningShift.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {config.eveningShift.enabled && (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      {eveningSlots.length} Khung Giờ
                    </span>
                  )}
                  {config.devMode247 ? (
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1 shadow-2xs cursor-not-allowed select-none">
                      <Lock size={11} className="text-amber-700" />
                      24/7 Khóa Mở
                    </span>
                  ) : (
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
                        className="rounded text-purple-600 cursor-pointer"
                      />
                      <span>{config.eveningShift.enabled ? 'Đang mở' : 'Đang tắt'}</span>
                    </label>
                  )}
                </div>
              </div>

              {config.eveningShift.enabled ? (
                <>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <span>Giờ bắt đầu</span>
                        {config.devMode247 && <Lock size={10} className="text-slate-400" />}
                      </label>
                      <input
                        type="time"
                        disabled={config.devMode247}
                        readOnly={config.devMode247}
                        value={config.eveningShift.startTime}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            eveningShift: { ...config.eveningShift, startTime: e.target.value },
                          })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-mono text-sm font-bold ${
                          config.devMode247
                            ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed select-none'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                        <span>Giờ kết thúc</span>
                        {config.devMode247 && <Lock size={10} className="text-slate-400" />}
                      </label>
                      <input
                        type="time"
                        disabled={config.devMode247}
                        readOnly={config.devMode247}
                        value={config.eveningShift.endTime}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            eveningShift: { ...config.eveningShift, endTime: e.target.value },
                          })
                        }
                        className={`w-full px-3 py-2 border rounded-xl font-mono text-sm font-bold ${
                          config.devMode247
                            ? 'bg-slate-100 border-slate-300 text-slate-500 cursor-not-allowed select-none'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
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
          {/* Toolbar - Đảm bảo luôn nằm trên cùng 1 hàng duy nhất */}
          <div className="bg-white p-3 sm:p-4 rounded-2xl border border-mint-light shadow-xs flex items-center justify-between gap-3 overflow-x-auto no-scrollbar flex-nowrap">
            {/* Nhóm Chọn Ngày Khám - Luôn thẳng hàng */}
            <div className="flex items-center gap-2 shrink-0 flex-nowrap">
              <label className="text-xs font-bold text-slate-700 whitespace-nowrap flex items-center gap-1.5">
                <Calendar size={14} className="text-teal-primary" />
                <span>Chọn Ngày Khám:</span>
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl text-xs font-bold font-mono focus:bg-white focus:ring-2 focus:ring-teal-primary/30 outline-none transition cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setSelectedDate(getLocalDateString())}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer whitespace-nowrap shrink-0 shadow-2xs"
                title="Chọn ngày hôm nay"
              >
                Hôm nay
              </button>
            </div>

            {/* Nhóm Nút Thao Tác Ca Trực - Cố định 1 hàng */}
            <div className="flex items-center gap-2 shrink-0 flex-nowrap">
              <button
                type="button"
                onClick={handleAutoGenerateWeek}
                disabled={syncingWeek}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-60 whitespace-nowrap shadow-2xs shrink-0"
                title="Tự động kiểm tra và sinh lịch khám chuẩn (Sáng + Chiều, mỗi slot 30 phút) cho toàn bộ bác sĩ trong 7 ngày tới (1 tuần)"
              >
                <Sparkles size={14} className={syncingWeek ? 'animate-spin text-emerald-600' : 'text-emerald-600'} />
                <span>{syncingWeek ? 'Đang đồng bộ...' : 'Tự Động Sinh Lịch 7 Ngày Tới (1 Tuần)'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetUnbookedSchedules}
                disabled={resettingSchedules || schedules.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition cursor-pointer disabled:opacity-50 whitespace-nowrap shadow-2xs shrink-0"
                title="Dọn dẹp sạch toàn bộ các ca trực chưa có người đặt, đưa số ca trực về 0 để Bác sĩ tự đăng ký lại từ đầu"
              >
                <Trash2 size={13} className={resettingSchedules ? 'animate-spin text-rose-600' : 'text-rose-600'} />
                <span>{resettingSchedules ? 'Đang dọn...' : 'Xóa Ca Trực Trống (Reset Về 0)'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddScheduleModal(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-pine-teal hover:bg-pine-teal-hover text-white text-xs font-bold rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                title="Phân công ca trực mới"
              >
                <Plus size={15} />
                <span>Phân Công Ca Trực Mới</span>
              </button>
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

                        {/* Summary Badges & Emergency Room Reassign */}
                        <div className="flex items-center gap-2 text-[11px] font-bold flex-wrap">
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
                          <button
                            type="button"
                            onClick={() => {
                              setChangingRoomSchedule(schedule);
                              setTargetReassignRoom(schedule.roomNumber || 'P.101');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition cursor-pointer"
                            title="Điều phối đổi buồng khám khẩn cấp cho ca trực này"
                          >
                            <DoorOpen size={12} />
                            <span>Đổi Buồng</span>
                          </button>
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
                    <option value="NIGHT">Ca Đêm ({config.nightShift?.startTime || '00:00'} - {config.nightShift?.endTime || '08:00'})</option>
                    <option value="MORNING">Ca Sáng ({config.morningShift.startTime} - {config.morningShift.endTime})</option>
                    <option value="AFTERNOON">Ca Chiều ({config.afternoonShift.startTime} - {config.afternoonShift.endTime})</option>
                    <option value="EVENING">Ca Tối ({config.eveningShift.startTime} - {config.eveningShift.endTime})</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Buồng Khám {existingShiftOnDate && <span className="text-teal-700 font-bold">(Gợi ý: {existingShiftOnDate.roomNumber})</span>}
                  </label>
                  <select
                    value={newScheduleRoom}
                    onChange={(e) => setNewScheduleRoom(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  >
                    <option value="P.101">P.101 (Đa khoa & Cấp cứu)</option>
                    <option value="P.102">P.102 (Da liễu thẩm mỹ)</option>
                    <option value="P.103">P.103 (Khám Mắt)</option>
                    <option value="P.104">P.104 (Tai Mũi Họng)</option>
                    <option value="P.105">P.105 (Răng Hàm Mặt)</option>
                    <option value="P.201">P.201 (Nhi khoa)</option>
                    <option value="P.202">P.202 (Sản phụ khoa)</option>
                    <option value="P.205">P.205 (Tim mạch)</option>
                    <option value="P.208">P.208 (Nội tiêu hóa)</option>
                    <option value="P.209">P.209 (Tư vấn chuyên sâu)</option>
                    <option value="P.301">P.301 (Chẩn đoán hình ảnh)</option>
                    <option value="P.302">P.302 (Thủ thuật chuyên biệt)</option>
                  </select>
                </div>
              </div>

              {existingShiftOnDate && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-start gap-2">
                  <Building2 size={16} className="text-blue-700 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Lưu ý phân công buồng khám:</span>
                    <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                      Bác sĩ đã có ca trực ({existingShiftOnDate.startTime} - {existingShiftOnDate.endTime}) tại buồng <strong>[{existingShiftOnDate.roomNumber || 'P.208'}]</strong>. Quản Trị Viên có thể giữ nguyên buồng hoặc phân bổ buồng khác cho ca này nếu thuộc thủ thuật / chuyên khoa khác.
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

      {/* Modal Đổi Buồng Khám Khẩn Cấp (Admin Emergency Room Reassign) */}
      {changingRoomSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-mint-light w-full max-w-md overflow-hidden">
            <div className="bg-purple-50 px-6 py-4 border-b border-purple-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-base">
                <DoorOpen size={18} />
                <span>Điều Phối Đổi Buồng Khám Khẩn Cấp</span>
              </div>
              <button
                type="button"
                onClick={() => setChangingRoomSchedule(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEmergencyChangeRoom} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} className="text-amber-600" />
                  <span>Quyền Hạn Quản Trị Viên (Emergency Override)</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Điều phối đổi buồng ngay trong ngày khám khi buồng khám hiện tại gặp sự cố hỏng hóc thiết bị, ngắt điện hoặc khử khuẩn.
                </p>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div>Bác sĩ: <strong>{changingRoomSchedule.doctorName}</strong></div>
                <div>Ngày trực: <strong className="font-mono">{changingRoomSchedule.workDate}</strong> ({changingRoomSchedule.startTime?.slice(0, 5)} - {changingRoomSchedule.endTime?.slice(0, 5)})</div>
                <div>Buồng hiện tại: <span className="font-bold text-purple-700">{changingRoomSchedule.roomNumber || 'P.101'}</span></div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Chọn Buồng Khám Mới Tiếp Quản <span className="text-red-500">*</span>
                </label>
                <select
                  value={targetReassignRoom}
                  onChange={(e) => setTargetReassignRoom(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs"
                >
                  <option value="P.101">P.101 (Đa khoa & Cấp cứu)</option>
                  <option value="P.102">P.102 (Da liễu thẩm mỹ)</option>
                  <option value="P.103">P.103 (Khám Mắt)</option>
                  <option value="P.104">P.104 (Tai Mũi Họng)</option>
                  <option value="P.105">P.105 (Răng Hàm Mặt)</option>
                  <option value="P.201">P.201 (Nhi khoa)</option>
                  <option value="P.202">P.202 (Sản phụ khoa)</option>
                  <option value="P.205">P.205 (Tim mạch)</option>
                  <option value="P.208">P.208 (Nội tiêu hóa)</option>
                  <option value="P.209">P.209 (Tư vấn chuyên sâu)</option>
                  <option value="P.301">P.301 (Chẩn đoán hình ảnh)</option>
                  <option value="P.302">P.302 (Thủ thuật chuyên biệt)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChangingRoomSchedule(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={changingRoomLoading || targetReassignRoom === changingRoomSchedule.roomNumber}
                  className="px-5 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold shadow-xs disabled:opacity-50"
                >
                  {changingRoomLoading ? 'Đang điều phối...' : 'Xác Nhận Đổi Buồng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cách 2: Hộp thoại xác nhận thông minh khi tắt Chế Độ Develop 24/7 */}
      {showCleanupModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden transform transition-all animate-scaleUp">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 dark:from-amber-950/30 dark:via-rose-950/30 dark:to-purple-950/30 border-b border-slate-100 dark:border-slate-800 flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
                <AlertTriangle size={26} className="text-amber-500 animate-pulse" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  Xác Nhận Tắt Chế Độ Develop 24/7
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Bạn đang yêu cầu tắt môi trường thử nghiệm vận hành 24/7 toàn viện.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCleanupModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg"
                disabled={cleaningUp || saveLoading}
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Trong quá trình bật <strong className="text-amber-600 dark:text-amber-400">Develop 24/7</strong>, có thể đã phát sinh các ca trực đêm, ca cuối tuần hoặc lượt đặt lịch thử nghiệm. Vui lòng chọn phương án xử lý dữ liệu:
              </p>

              {/* 3 Action Options */}
              <div className="space-y-3 pt-1">
                {/* Lựa chọn 1: Tắt & Xóa Sạch Dữ Liệu Test (Primary) */}
                <button
                  type="button"
                  disabled={cleaningUp || saveLoading}
                  onClick={() => executeToggleDevMode(false, true)}
                  className="w-full text-left p-4 rounded-xl border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/20 hover:bg-rose-100/80 dark:hover:bg-rose-900/30 hover:border-rose-500 transition-all group flex items-start gap-3 shadow-sm"
                >
                  <div className="p-2.5 rounded-lg bg-rose-600 text-white shrink-0 group-hover:scale-110 transition-transform">
                    <Trash2 size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-rose-700 dark:text-rose-300 text-sm group-hover:underline">
                        1. Tắt & Xóa Sạch Dữ Liệu Test (Khuyến Nghị)
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200">
                        Clean Sandbox
                      </span>
                    </div>
                    <p className="text-xs text-rose-600/90 dark:text-rose-400/90 mt-1 leading-normal">
                      Tự động dọn dẹp sạch toàn bộ ca trực Bác sĩ, khung giờ (TimeSlots) và lịch hẹn được tạo trong phiên 24/7 vừa rồi. Trả hệ thống về trạng thái sạch sẽ trước khi test.
                    </p>
                  </div>
                </button>

                {/* Lựa chọn 2: Tắt nhưng giữ lại dữ liệu */}
                <button
                  type="button"
                  disabled={cleaningUp || saveLoading}
                  onClick={() => executeToggleDevMode(false, false)}
                  className="w-full text-left p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group flex items-start gap-3"
                >
                  <div className="p-2.5 rounded-lg bg-slate-600 text-white shrink-0 group-hover:scale-110 transition-transform">
                    <Save size={20} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800 dark:text-slate-200 text-sm group-hover:underline">
                        2. Tắt Nhưng Giữ Lại Dữ Liệu
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Keep Data
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-normal">
                      Chỉ tắt cờ 24/7 về giờ hành chính chuẩn (T2 - T6, 07:30 - 17:00). Toàn bộ ca trực và lịch hẹn đã đăng ký vẫn được bảo lưu nguyên vẹn trong hệ thống.
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {cleaningUp ? 'Đang dọn dẹp dữ liệu...' : 'Thao tác an toàn • Không mất dữ liệu gốc'}
              </span>
              <button
                type="button"
                disabled={cleaningUp || saveLoading}
                onClick={() => setShowCleanupModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                ❌ Hủy Bỏ (Tiếp Tục Bật 24/7)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
