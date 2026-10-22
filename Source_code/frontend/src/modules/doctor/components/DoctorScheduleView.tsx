'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { 
  Calendar, 
  Clock, 
  PlusCircle, 
  Trash2, 
  Lock, 
  Unlock, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  CalendarDays,
  UserCheck,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Info,
  X,
  DoorOpen,
  LayoutGrid
} from 'lucide-react';
import { api, getAuthUser } from '@/shared/lib/api';
import { getClinicRooms, ClinicRoom } from '@/shared/lib/clinicRooms';

interface TimeSlotDto {
  id: string;
  scheduleId: string;
  doctorId: string;
  startTime: string;
  endTime: string;
  status: 'AVAILABLE' | 'BOOKED' | 'LOCKED';
}

interface DoctorScheduleDto {
  id: string;
  doctorId: string;
  workDate: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  status: string;
  totalSlots: number;
  availableSlots: number;
  bookedSlots: number;
  roomNumber?: string;
  slots: TimeSlotDto[];
}

// Tìm ngày làm việc hợp lệ tiếp theo (bắt đầu từ ngày mai trở đi, tự động bỏ qua T7 & CN)
const getNextValidWorkingDate = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  return d.toISOString().slice(0, 10);
};

export default function DoctorScheduleView() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [schedules, setSchedules] = useState<DoctorScheduleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Modal tạo ca trực mới (mặc định chọn ngày làm việc hợp lệ tiếp theo từ ngày mai)
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [workDate, setWorkDate] = useState<string>(() => getNextValidWorkingDate());
  const [startTime, setStartTime] = useState<string>('08:00');
  const [endTime, setEndTime] = useState<string>('12:00');
  const [slotDuration, setSlotDuration] = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);
  const [activePreset, setActivePreset] = useState<'MORNING' | 'AFTERNOON' | 'FULL_DAY' | null>('MORNING');

  // Cửa sổ tiện ích xem và quản lý khung giờ của một ca trực ngay trên ma trận
  const [selectedScheduleForSlots, setSelectedScheduleForSlots] = useState<DoctorScheduleDto | null>(null);

  // Danh mục phòng trực do Admin phê duyệt và phòng được chọn
  const [availableRooms, setAvailableRooms] = useState<ClinicRoom[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('P.208');

  // Danh sách buồng khám đã có Bác sĩ khác đăng ký trực trong ngày & khung giờ đang chọn
  const [occupiedRooms, setOccupiedRooms] = useState<Array<{
    roomNumber: string;
    doctorId: string;
    doctorName: string;
    startTime: string;
    endTime: string;
    isOccupied: boolean;
  }>>([]);
  const [checkingRooms, setCheckingRooms] = useState(false);

  // Action loading for toggle or delete
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modal Hủy Ca Khẩn Cấp (Phương Án 2: Bất Khả Kháng)
  const [emergencyCancelScheduleData, setEmergencyCancelScheduleData] = useState<DoctorScheduleDto | null>(null);
  const [affectedPatients, setAffectedPatients] = useState<Array<{
    appointmentId: string;
    bookingCode: string;
    patientName: string;
    patientPhone: string;
    slotTime: string;
    status: string;
  }>>([]);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [autoReassignPeer, setAutoReassignPeer] = useState<boolean>(true);
  const [loadingAffected, setLoadingAffected] = useState<boolean>(false);
  const [cancelSubmitting, setCancelSubmitting] = useState<boolean>(false);

  // Modal Đổi Buồng Khám (CLAB-113: Khóa trong ngày, chỉ cho phép trước 1 ngày)
  const [showChangeRoomModal, setShowChangeRoomModal] = useState<boolean>(false);
  const [scheduleToChangeRoom, setScheduleToChangeRoom] = useState<DoctorScheduleDto | null>(null);
  const [newRoomForChange, setNewRoomForChange] = useState<string>('P.208');
  const [changingRoom, setChangingRoom] = useState<boolean>(false);

  // Kích hoạt thử nghiệm tác vụ Auto-Schedule 17h
  const [triggeringAutoSchedule, setTriggeringAutoSchedule] = useState<boolean>(false);


  // Điều hướng tuần ma trận lịch trực
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);

  // Tính toán 5 ngày làm việc trong tuần (Thứ 2 đến Thứ 6) theo offset
  const getWeekDays = (offsetWeeks: number = 0) => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + distanceToMonday + offsetWeeks * 7);

    const days: Array<{ dateStr: string; displayDay: string; displayDate: string; isToday: boolean }> = [];
    const dayNames = ['Thứ 2 (T2)', 'Thứ 3 (T3)', 'Thứ 4 (T4)', 'Thứ 5 (T5)', 'Thứ 6 (T6)'];
    const todayStr = new Date().toISOString().slice(0, 10);

    for (let i = 0; i < 5; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      days.push({
        dateStr,
        displayDay: dayNames[i],
        displayDate: `${day}/${month}`,
        isToday: dateStr === todayStr,
      });
    }
    return days;
  };

  const weekDays = useMemo(() => getWeekDays(currentWeekOffset), [currentWeekOffset]);

  const weekSchedules = useMemo(() => {
    const dates = new Set(weekDays.map((d) => d.dateStr));
    return schedules.filter((s) => dates.has(s.workDate));
  }, [schedules, weekDays]);

  const weekMetrics = useMemo(() => {
    let totalHours = 0;
    let totalBooked = 0;
    let totalSlots = 0;
    weekSchedules.forEach((s) => {
      totalBooked += s.bookedSlots || 0;
      totalSlots += s.totalSlots || 0;
      const slotDuration = s.slotDurationMinutes || 30;
      const actualHours = ((s.totalSlots || 0) * slotDuration) / 60;
      totalHours += actualHours;
    });
    return {
      totalShifts: weekSchedules.length,
      totalHours: Math.round(totalHours * 10) / 10,
      totalBooked,
      availableSlots: totalSlots - totalBooked,
    };
  }, [weekSchedules]);

  const activeScheduleForSlots = useMemo(() => {
    if (!selectedScheduleForSlots) return null;
    return schedules.find((s) => s.id === selectedScheduleForSlots.id) || selectedScheduleForSlots;
  }, [selectedScheduleForSlots, schedules]);

  const loadSchedules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDoctorSchedules();
      setSchedules(data || []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách ca trực của bác sĩ.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setAvailableRooms(getClinicRooms());
    const user = getAuthUser();
    if (user) {
      const enrichedUser = { ...user };
      api.getDoctors().then((docs) => {
        if (Array.isArray(docs)) {
          const matched = docs.find((d: any) =>
            (user.id && d.userId === user.id) ||
            (user.fullName && d.fullName?.toLowerCase() === user.fullName?.toLowerCase()) ||
            (user.email && d.email?.toLowerCase() === user.email?.toLowerCase())
          );
          if (matched) {
            enrichedUser.academicTitle = matched.academicTitle;
            enrichedUser.specialtyName = matched.specialtyName;
            enrichedUser.roomNumber = matched.roomNumber;
            if (matched.roomNumber) setSelectedRoom(matched.roomNumber);
            setCurrentUser({ ...enrichedUser });
          }
        }
      }).catch(() => {});
      setCurrentUser(enrichedUser);
    }
    loadSchedules();
  }, [loadSchedules]);

  // Tính toán khung giờ bắt đầu thông minh theo thời gian thực (làm tròn lên mốc 30 phút kế tiếp nếu là hôm nay)
  const getSmartStartTime = (targetDate: string, defaultStart: string) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (targetDate !== todayStr) return defaultStart;

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const [defH, defM] = defaultStart.split(':').map(Number);
    const defMinutes = defH * 60 + defM;

    if (defMinutes <= currentMinutes) {
      const nextSlotMinutes = Math.ceil((currentMinutes + 1) / 30) * 30;
      const nextH = Math.floor(nextSlotMinutes / 60);
      const nextM = nextSlotMinutes % 60;
      return `${String(nextH).padStart(2, '0')}:${String(nextM).padStart(2, '0')}`;
    }
    return defaultStart;
  };

  const checkOccupancy = useCallback(async (date: string, start: string, end: string) => {
    if (!date || !start || !end) return;
    try {
      setCheckingRooms(true);
      const data = await api.getRoomOccupancy(date, start, end);
      setOccupiedRooms(data || []);
    } catch (e) {
      console.warn('Không thể kiểm tra phòng trống:', e);
    } finally {
      setCheckingRooms(false);
    }
  }, []);

  useEffect(() => {
    if (showCreateModal) {
      checkOccupancy(workDate, startTime, endTime);
    }
  }, [showCreateModal, workDate, startTime, endTime, checkOccupancy]);

  // Tìm ca trực đã có trong ngày làm việc đã chọn
  const myExistingShiftOnDate = useMemo(() => {
    if (!workDate) return null;
    return schedules.find((s) => s.workDate === workDate && s.status === 'ACTIVE');
  }, [workDate, schedules]);

  // Nếu trong ngày đó bác sĩ đã có ca trực -> tự động cố định buồng khám
  useEffect(() => {
    if (myExistingShiftOnDate?.roomNumber) {
      setSelectedRoom(myExistingShiftOnDate.roomNumber);
    }
  }, [myExistingShiftOnDate]);

  const handleOpenCreateModal = () => {
    const nextDate = getNextValidWorkingDate();
    setWorkDate(nextDate);
    setStartTime('08:00');
    setEndTime('12:00');
    setActivePreset('MORNING');
    setSelectedRoom(currentUser?.roomNumber || 'P.208');
    setError(null);
    setShowCreateModal(true);
  };

  // Áp dụng khung giờ mẫu có đồng bộ thời gian thật và hiệu ứng phát sáng
  const applyPresetShift = (type: 'MORNING' | 'AFTERNOON' | 'FULL_DAY') => {
    setActivePreset(type);
    if (type === 'MORNING') {
      setStartTime('08:00');
      setEndTime('12:00');
    } else if (type === 'AFTERNOON') {
      setStartTime('13:30');
      setEndTime('17:00');
    } else if (type === 'FULL_DAY') {
      setStartTime('08:00');
      setEndTime('17:00');
    }
  };

  const handleStartTimeChange = (newStart: string) => {
    setStartTime(newStart);
    if (newStart === '08:00' && endTime === '12:00') setActivePreset('MORNING');
    else if (newStart === '13:30' && endTime === '17:00') setActivePreset('AFTERNOON');
    else if (newStart === '08:00' && endTime === '17:00') setActivePreset('FULL_DAY');
    else setActivePreset(null);
  };

  const handleEndTimeChange = (newEnd: string) => {
    setEndTime(newEnd);
    if (startTime === '08:00' && newEnd === '12:00') setActivePreset('MORNING');
    else if (startTime === '13:30' && newEnd === '17:00') setActivePreset('AFTERNOON');
    else if (startTime === '08:00' && newEnd === '17:00') setActivePreset('FULL_DAY');
    else setActivePreset(null);
  };

  // Tạo ca trực mới
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startTime >= endTime) {
      setError('Giờ bắt đầu phải nhỏ hơn giờ kết thúc ca trực.');
      return;
    }
    const todayStr = new Date().toISOString().slice(0, 10);
    // Quy định giáo viên: Chỉ được đăng ký trước tối thiểu 1 ngày
    if (workDate <= todayStr) {
      setError('Theo quy định phòng khám, Bác sĩ chỉ được đăng ký ca trực trước tối thiểu 1 ngày (từ ngày mai trở đi). Ca trực hôm nay được hệ thống tự động xếp lịch.');
      return;
    }

    const selDate = new Date(workDate + 'T00:00:00');
    const dow = selDate.getDay();
    if (dow === 0 || dow === 6) {
      setError('Phòng khám chỉ tiếp nhận khám từ Thứ 2 đến Thứ 6. Không thể đăng ký ca trực vào Thứ 7 hoặc Chủ Nhật.');
      return;
    }

    const finalRoom = selectedRoom;

    // Chặn thay đổi buồng nếu đã có ca trực trong cùng ngày
    if (myExistingShiftOnDate && myExistingShiftOnDate.roomNumber && finalRoom.toUpperCase() !== myExistingShiftOnDate.roomNumber.toUpperCase()) {
      setError(`Theo quy định phòng khám, tất cả ca trực trong ngày ${workDate} phải diễn ra tại 1 buồng duy nhất [${myExistingShiftOnDate.roomNumber}]. Nếu muốn trực buồng khác, vui lòng chọn ngày khác!`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Nếu bác sĩ đổi phòng trực khác phòng cũ (và chưa có ca nào trong ngày cố định), cập nhật hồ sơ chuyên môn
      if (!myExistingShiftOnDate && finalRoom && finalRoom !== currentUser?.roomNumber) {
        try {
          await api.updateDoctorProfile({ roomNumber: finalRoom });
          setCurrentUser((prev: any) => ({ ...prev, roomNumber: finalRoom }));
        } catch (e) {
          console.warn('Lỗi cập nhật phòng trực của bác sĩ:', e);
        }
      }

      await api.createDoctorSchedule({
        workDate,
        startTime,
        endTime,
        slotDurationMinutes: slotDuration,
        roomNumber: finalRoom,
      });
      setNotification(`✅ Đã đăng ký thành công ca trực ngày ${workDate} tại phòng [${finalRoom || selectedRoom}] (${startTime} - ${endTime}) cùng các khung giờ khám tự động!`);
      setShowCreateModal(false);
      await loadSchedules();
    } catch (err: any) {
      setError(err?.message || 'Lỗi khi đăng ký ca trực.');
    } finally {
      setSubmitting(false);
    }
  };

  // Khóa / Mở slot khám
  const handleToggleSlot = async (slot: TimeSlotDto) => {
    if (slot.status === 'BOOKED') {
      alert('Khung giờ này đã có bệnh nhân đặt lịch hẹn, không thể khóa.');
      return;
    }
    try {
      setActionLoadingId(slot.id);
      await api.toggleDoctorSlotLock(slot.id);
      setNotification(
        slot.status === 'AVAILABLE'
          ? `🔒 Đã tạm khóa khung giờ ${slot.startTime} - ${slot.endTime} (Nghỉ giữa giờ / Hội chẩn).`
          : `🔓 Đã mở lại khung giờ ${slot.startTime} - ${slot.endTime} cho người bệnh đặt lịch.`
      );
      await loadSchedules();
    } catch (err: any) {
      alert(err?.message || 'Không thể thay đổi trạng thái khung giờ.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // CLAB-113: Đổi buồng khám phân công (Chỉ cho phép trước 1 ngày / trước 00:00:00)
  const handleOpenChangeRoomModal = (sch: DoctorScheduleDto) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (sch.workDate <= todayStr) {
      alert(`🔒 Quy định phòng khám:\nBuồng khám cho ca trực ngày ${sch.workDate} đã chốt cố định và đồng bộ với phiếu số thứ tự và màn hình LCD tiếp đón.\nBác sĩ chỉ được phép đổi buồng khám trước tối thiểu 1 ngày (trước 00:00:00).`);
      return;
    }
    setScheduleToChangeRoom(sch);
    setNewRoomForChange(sch.roomNumber || currentUser?.roomNumber || 'P.208');
    setError(null);
    setShowChangeRoomModal(true);
    checkOccupancy(sch.workDate, sch.startTime, sch.endTime);
  };

  const handleConfirmChangeRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleToChangeRoom) return;
    const todayStr = new Date().toISOString().slice(0, 10);
    if (scheduleToChangeRoom.workDate <= todayStr) {
      setError(`Theo quy định phòng khám, Bác sĩ chỉ được đổi buồng khám trước tối thiểu 1 ngày (trước 00:00:00). Khi bước sang ngày mới, buồng khám đã chốt cố định.`);
      return;
    }
    try {
      setChangingRoom(true);
      setError(null);
      await api.changeDoctorScheduleRoom(scheduleToChangeRoom.id, newRoomForChange);
      setCurrentUser((prev: any) => ({ ...prev, roomNumber: newRoomForChange }));
      setNotification(`✅ Đã đổi buồng khám sang [${newRoomForChange}] cho ca trực ngày ${scheduleToChangeRoom.workDate} (${scheduleToChangeRoom.startTime} - ${scheduleToChangeRoom.endTime})!`);
      setShowChangeRoomModal(false);
      setScheduleToChangeRoom(null);
      await loadSchedules();
    } catch (err: any) {
      setError(err?.message || 'Không thể đổi buồng khám.');
    } finally {
      setChangingRoom(false);
    }
  };

  // Hủy ca trực (Phương Án 2: Nếu có bệnh nhân thì mở Modal Hủy Khẩn Cấp)
  const handleDeleteSchedule = async (schedule: DoctorScheduleDto) => {
    if (schedule.bookedSlots > 0) {
      // Mở Modal Hủy Ca Khẩn Cấp (Phương án 2)
      setEmergencyCancelScheduleData(schedule);
      setCancelReason('');
      setAutoReassignPeer(true);
      setLoadingAffected(true);
      try {
        const patients = await api.getScheduleAffectedPatients(schedule.id);
        setAffectedPatients(patients || []);
      } catch (e) {
        console.warn('Lỗi lấy danh sách bệnh nhân bị ảnh hưởng:', e);
        setAffectedPatients([]);
      } finally {
        setLoadingAffected(false);
      }
      return;
    }

    const confirmDelete = window.confirm(
      `Xác nhận hủy ca trực ngày ${schedule.workDate} (${schedule.startTime} - ${schedule.endTime})?\nToàn bộ ${schedule.totalSlots} khung giờ khám trống của ca này sẽ được thu hồi.`
    );
    if (!confirmDelete) return;

    try {
      setActionLoadingId(schedule.id);
      await api.deleteDoctorSchedule(schedule.id);
      setNotification(`🗑️ Đã hủy thành công ca trực ngày ${schedule.workDate}.`);
      await loadSchedules();
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi hủy ca trực.');
    } finally {
      setActionLoadingId(null);
    }
  };

  // Xác nhận hủy ca trực khẩn cấp (Phương án 2)
  const handleConfirmEmergencyCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emergencyCancelScheduleData) return;
    if (!cancelReason.trim() || cancelReason.trim().length < 5) {
      alert('Vui lòng nhập lý do bất khả kháng (tối thiểu 5 ký tự).');
      return;
    }

    try {
      setCancelSubmitting(true);
      const res = await api.emergencyCancelDoctorSchedule(emergencyCancelScheduleData.id, {
        reason: cancelReason.trim(),
        autoReassign: autoReassignPeer,
      });

      setNotification(`⚠️ ${res.message}`);
      setEmergencyCancelScheduleData(null);
      await loadSchedules();
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi hủy ca trực khẩn cấp.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  // Kích hoạt thủ công kiểm thử tự động xếp lịch ngày mai (Mô phỏng Job 17:00)
  const handleTriggerAutoSchedule = async () => {
    try {
      setTriggeringAutoSchedule(true);
      const res = await api.triggerAutoScheduleTomorrow();
      setNotification(`⏰ [Mô Phỏng Cron 17:00]: ${res.message}`);
      await loadSchedules();
    } catch (err: any) {
      alert(err?.message || 'Lỗi khi kích hoạt tự động xếp lịch.');
    } finally {
      setTriggeringAutoSchedule(false);
    }
  };



  return (
    <div className="space-y-6 animate-in fade-in duration-200">


      {/* ── Thông báo ── */}
      {notification && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{notification}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            <X size={15} />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 font-semibold flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
            <X size={15} />
          </button>
        </div>
      )}




      {/* ── Thanh Điều Hướng Tuần & Đăng Ký Ca Trực ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:px-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold">
            <LayoutGrid size={16} />
          </div>
          <div>
            <span className="text-xs font-extrabold text-slate-800 block">Ma Trận Ca Trực Theo Tuần</span>
            <span className="text-[11px] text-slate-500">Thứ 2 đến Thứ 6 • Quản lý trực tiếp trên giao diện</span>
          </div>
        </div>

        {/* Bộ điều hướng tuần & Nút Đăng ký ca */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadSchedules}
            disabled={loading}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Làm mới lịch trực"
          >
            <RefreshCw size={15} className={loading ? 'animate-spin text-teal-700' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setCurrentWeekOffset((prev) => prev - 1)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Tuần trước"
          >
            <ChevronLeft size={16} />
          </button>
          
          <span className="text-xs font-bold text-slate-800 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">
            Tuần: {weekDays[0]?.displayDate} - {weekDays[weekDays.length - 1]?.displayDate}
          </span>

          <button
            type="button"
            onClick={() => setCurrentWeekOffset((prev) => prev + 1)}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            title="Tuần kế tiếp"
          >
            <ChevronRight size={16} />
          </button>

          {currentWeekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setCurrentWeekOffset(0)}
              className="text-[11px] font-semibold text-teal-700 hover:underline px-1.5 cursor-pointer"
            >
              Hôm nay
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="ml-1 sm:ml-2 px-3.5 py-1.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold rounded-xl text-xs transition shadow-sm shadow-teal-700/20 flex items-center gap-1.5 cursor-pointer hover:scale-102 active:scale-98"
            title="Mở cửa sổ tiện ích đăng ký ca trực"
          >
            <PlusCircle size={14} />
            <span>Đăng Ký Ca Mới</span>
          </button>
        </div>
      </div>

      {/* ── Khối Nội Dung Chính (Loading / Empty / Ma Trận Tuần) ── */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 text-xs text-slate-500">
            <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-teal-700" />
            <span>Đang tải danh sách lịch trực của bác sĩ...</span>
          </div>
        ) : schedules.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 p-8 space-y-3">
            <Calendar size={36} className="mx-auto text-slate-300" />
            <h3 className="font-bold text-slate-700 text-sm">Chưa có ca trực nào được đăng ký</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Bác sĩ bấm vào nút <strong>&ldquo;Đăng Ký Ca Mới&rdquo;</strong> ở trên để mở lịch khám cho bệnh nhân.
            </p>
          </div>
        ) : (
          /* ── Ma Trận Ca Trực Theo Tuần ── */
          <div className="space-y-4">
            {/* Header tóm tắt chỉ số tuần */}
            <div className="bg-gradient-to-r from-teal-800 via-teal-900 to-slate-900 text-white rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold text-teal-300 shrink-0">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <span className="text-[11px] text-teal-200 uppercase tracking-wider font-semibold block">
                    Tổng Quan Ca Trực Tuần Này
                  </span>
                  <div className="text-sm sm:text-base font-extrabold text-white">
                    Từ {weekDays[0]?.displayDay} ({weekDays[0]?.displayDate}) đến {weekDays[weekDays.length - 1]?.displayDay} ({weekDays[weekDays.length - 1]?.displayDate})
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
                <div className="text-center px-3 py-1.5 bg-white/10 rounded-xl border border-white/10">
                  <span className="text-teal-200 text-[10px] block">Tổng ca trực:</span>
                  <strong className="text-white text-sm font-black">{weekMetrics.totalShifts} ca</strong>
                </div>
                <div className="text-center px-3 py-1.5 bg-white/10 rounded-xl border border-white/10">
                  <span className="text-teal-200 text-[10px] block">Tổng giờ làm việc:</span>
                  <strong className="text-white text-sm font-black">{weekMetrics.totalHours} giờ</strong>
                </div>
                <div className="text-center px-3 py-1.5 bg-white/10 rounded-xl border border-white/10">
                  <span className="text-teal-200 text-[10px] block">Bệnh nhân đã đặt:</span>
                  <strong className="text-emerald-300 text-sm font-black">{weekMetrics.totalBooked} người</strong>
                </div>
                <div className="text-center px-3 py-1.5 bg-white/10 rounded-xl border border-white/10">
                  <span className="text-teal-200 text-[10px] block">Khung giờ còn trống:</span>
                  <strong className="text-cyan-300 text-sm font-black">{weekMetrics.availableSlots} slots</strong>
                </div>
              </div>
            </div>

            {/* Lưới 5 Cột Ma Trận Tuần (Thứ 2 - Thứ 6) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 items-stretch">
              {weekDays.map((day) => {
                const todayStr = new Date().toISOString().slice(0, 10);
                const daySchedules = schedules.filter((s) => s.workDate === day.dateStr);

                return (
                  <div
                    key={day.dateStr}
                    className={`flex flex-col rounded-2xl border transition overflow-hidden min-h-[300px] ${
                      day.isToday
                        ? 'border-teal-500 bg-teal-50/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    {/* Header Cột Ngày */}
                    <div className={`p-2.5 border-b ${
                      day.isToday
                        ? 'bg-teal-700 text-white font-extrabold'
                        : 'bg-slate-50 text-slate-700 font-bold'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className="text-xs">{day.displayDay}</div>
                          <div className="text-sm font-black mt-0.5">{day.displayDate}</div>
                        </div>

                        {/* Nút + thêm ca trực tiếp tại cột ngày làm việc tương lai */}
                        {day.dateStr > todayStr && (
                          <button
                            type="button"
                            onClick={() => {
                              setWorkDate(day.dateStr);
                              setStartTime('08:00');
                              setEndTime('12:00');
                              setActivePreset('MORNING');
                              setSelectedRoom(currentUser?.roomNumber || 'P.208');
                              setShowCreateModal(true);
                            }}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 transition flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                            title={`Đăng ký ca trực cho ngày ${day.displayDay} (${day.displayDate})`}
                          >
                            <PlusCircle size={11} className="text-teal-700" />
                            <span>Thêm ca</span>
                          </button>
                        )}
                      </div>
                      {day.isToday && (
                        <span className="text-[9px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full mt-1 inline-block">
                          Hôm nay
                        </span>
                      )}
                    </div>

                    {/* Danh sách ca trực trong ngày */}
                    <div className="p-2.5 flex-1 flex flex-col gap-2.5">
                      {daySchedules.length === 0 ? (
                        (() => {
                          const todayStr = new Date().toISOString().slice(0, 10);
                          const isPast = day.dateStr < todayStr;
                          const isToday = day.dateStr === todayStr;

                          if (isPast) {
                            return (
                              <div className="flex-1 flex flex-col items-center justify-center p-3 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 space-y-1 bg-slate-50/50">
                                <span className="text-[11px] font-medium text-slate-400">Trống ca trực</span>
                                <span className="text-[10px] text-slate-400 italic">Đã qua</span>
                              </div>
                            );
                          }

                          if (isToday) {
                            return (
                              <div className="flex-1 flex flex-col items-center justify-center p-3 text-center border border-dashed border-teal-200 rounded-xl text-teal-700/70 space-y-1 bg-teal-50/20">
                                <span className="text-[11px] font-semibold text-teal-800">Trống ca trực</span>
                                <span className="text-[10px] text-slate-500 italic">Đã chốt lịch hôm nay</span>
                              </div>
                            );
                          }

                          return (
                            <div className="flex-1 flex flex-col items-center justify-center p-3 text-center border border-dashed border-slate-200 rounded-xl text-slate-400 space-y-2">
                              <span className="text-[11px] font-medium">Trống ca trực</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setWorkDate(day.dateStr);
                                  setStartTime('08:00');
                                  setEndTime('12:00');
                                  setActivePreset('MORNING');
                                  setSelectedRoom(currentUser?.roomNumber || 'P.208');
                                  setShowCreateModal(true);
                                }}
                                className="text-[10px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                              >
                                + Mở ca ngày này
                              </button>
                            </div>
                          );
                        })()
                      ) : (
                        daySchedules.map((sch) => {
                          const isMorning = sch.startTime < '12:00' && sch.endTime <= '13:00';
                          const isAfternoon = sch.startTime >= '12:00';
                          const shiftTheme = isMorning
                            ? 'border-emerald-300 bg-emerald-50/60 text-emerald-950'
                            : isAfternoon
                            ? 'border-blue-300 bg-blue-50/60 text-blue-950'
                            : 'border-purple-300 bg-purple-50/60 text-purple-950';

                          const percentBooked = sch.totalSlots > 0 ? Math.round((sch.bookedSlots / sch.totalSlots) * 100) : 0;

                          return (
                            <div
                              key={sch.id}
                              className={`p-3 rounded-xl border shadow-2xs space-y-2 ${shiftTheme}`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 border border-black/5">
                                  {isMorning ? 'Ca Sáng' : isAfternoon ? 'Ca Chiều' : 'Cả Ngày'}
                                </span>
                                {(() => {
                                  const todayStr = new Date().toISOString().slice(0, 10);
                                  const isToday = sch.workDate === todayStr;
                                  const isFuture = sch.workDate > todayStr;
                                  const roomLabel = sch.roomNumber || 'P.208';

                                  if (isToday) {
                                    return (
                                      <span 
                                        className="text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-300 px-1.5 py-0.5 rounded flex items-center gap-1 shadow-2xs"
                                        title="🔒 Buồng khám hôm nay đã được chốt cố định (Theo quy định phòng khám, không thể đổi trong ngày)"
                                      >
                                        <Lock size={10} className="text-amber-700" />
                                        <span>{roomLabel}</span>
                                      </span>
                                    );
                                  }

                                  if (isFuture) {
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => handleOpenChangeRoomModal(sch)}
                                        className="text-[10px] font-bold text-blue-800 hover:text-blue-900 bg-blue-100/80 hover:bg-blue-200 border border-blue-200 px-1.5 py-0.5 rounded transition cursor-pointer flex items-center gap-1 shadow-2xs hover:scale-105 active:scale-95"
                                        title="Nhấp để đổi buồng khám trước 1 ngày (hạn chót 23:59:59)"
                                      >
                                        <DoorOpen size={10} className="text-blue-600" />
                                        <span>{roomLabel}</span>
                                        <RefreshCw size={8} className="opacity-60" />
                                      </button>
                                    );
                                  }

                                  return (
                                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                                      <DoorOpen size={10} className="text-slate-400" />
                                      <span>{roomLabel}</span>
                                    </span>
                                  );
                                })()}
                              </div>

                              {(() => {
                                const todayStr = new Date().toISOString().slice(0, 10);
                                const isToday = sch.workDate === todayStr;
                                const isPast = sch.workDate < todayStr;
                                const displayStart = sch.slots && sch.slots.length > 0 ? sch.slots[0].startTime : sch.startTime;
                                const displayEnd = sch.slots && sch.slots.length > 0 ? sch.slots[sch.slots.length - 1].endTime : sch.endTime;
                                const isDiscrepancy = sch.startTime === '08:00' && sch.endTime === '17:00' && sch.totalSlots < 18;

                                return (
                                  <>
                                    <div className="space-y-0.5">
                                      <div className="text-xs font-black flex items-center gap-1">
                                        <Clock size={12} className="opacity-70" />
                                        <span>
                                          {isDiscrepancy && sch.slots && sch.slots.length > 0 && sch.totalSlots <= 10
                                            ? `${displayStart} - ${displayEnd}`
                                            : `${sch.startTime} - ${sch.endTime}`}
                                        </span>
                                      </div>
                                      <span className="text-[10px] opacity-75 block">
                                        {sch.slotDurationMinutes}p/slot • {sch.totalSlots} slots
                                        {isDiscrepancy && sch.totalSlots >= 14 && sch.totalSlots <= 16 ? ' (Nghỉ trưa 12h-13h30)' : ''}
                                      </span>
                                    </div>

                                    {/* Thanh tiến độ nhận bệnh */}
                                    <div className="space-y-1">
                                      <div className="flex justify-between text-[10px] font-bold">
                                        <span>Đã đặt: {sch.bookedSlots}/{sch.totalSlots}</span>
                                        <span>{percentBooked}%</span>
                                      </div>
                                      <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                                        <div
                                          className={`h-full rounded-full transition-all duration-300 ${
                                            percentBooked >= 80 ? 'bg-rose-500' : percentBooked >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
                                          }`}
                                          style={{ width: `${percentBooked}%` }}
                                        />
                                      </div>
                                    </div>

                                    {/* Nút hành động ca */}
                                    <div className="pt-1 flex items-center justify-between border-t border-black/5 text-[10px]">
                                      <button
                                        type="button"
                                        onClick={() => setSelectedScheduleForSlots(sch)}
                                        className="font-bold text-teal-800 hover:text-teal-950 hover:underline cursor-pointer flex items-center gap-0.5"
                                        title="Xem và quản lý các khung giờ của ca trực này"
                                      >
                                        <span>Xem {sch.slots.length} slots &gt;</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSchedule(sch)}
                                        disabled={actionLoadingId === sch.id || sch.bookedSlots > 0 || isToday || isPast}
                                        className="text-rose-600 hover:text-rose-800 disabled:opacity-30 cursor-pointer p-0.5"
                                        title={
                                          isPast
                                            ? 'Ca trực trong quá khứ đã kết thúc'
                                            : isToday
                                            ? 'Ca trực hôm nay đã chốt cố định, không thể xóa tùy tiện'
                                            : sch.bookedSlots > 0
                                            ? 'Đã có người đặt, không thể hủy'
                                            : 'Hủy ca trực này'
                                        }
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Cửa Sổ Tiện Ích Đăng Ký Ca Trực (In-Place Shift Registration Modal) ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Header tiện ích */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-teal-50/70 via-emerald-50/40 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
                  <PlusCircle size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 text-sm">Cửa Sổ Tiện Ích • Đăng Ký Ca Trực</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                      Tại Chỗ
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Chọn thời gian ca trực nhanh hoặc tùy chỉnh trực tiếp trên giao diện
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setShowCreateModal(false)} 
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-xl transition cursor-pointer"
                title="Đóng tiện ích"
              >
                <X size={18} />
              </button>
            </div>

            {/* Nội dung form tiện ích */}
            <form id="createScheduleForm" onSubmit={handleCreateSchedule} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
              {/* Banner lỗi nếu có */}
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-2xl text-xs text-rose-900 font-semibold flex items-start gap-2 shadow-2xs animate-in fade-in duration-150">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{error}</span>
                </div>
              )}

              {/* 1. Chọn nhanh ca làm việc chuẩn */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Sparkles size={14} className="text-teal-700" />
                    <span>1. Chọn nhanh ca làm việc chuẩn:</span>
                  </label>
                  {activePreset && (
                    <span className="text-[11px] font-bold text-teal-700 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
                      <span>Đang chọn: {activePreset === 'MORNING' ? 'Ca Sáng' : activePreset === 'AFTERNOON' ? 'Ca Chiều' : 'Cả Ngày'}</span>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => applyPresetShift('MORNING')}
                    className={`p-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left flex flex-col justify-between gap-1 border ${
                      activePreset === 'MORNING'
                        ? 'border-teal-500 bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/30 scale-[1.02]'
                        : 'border-slate-200 bg-slate-50/70 hover:border-teal-300 hover:bg-teal-50/50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black">Ca Sáng</span>
                      <span className="text-sm">☀️</span>
                    </div>
                    <div className="text-[11px] opacity-90 font-semibold">08:00 - 12:00</div>
                    <div className="text-[10px] opacity-75">4 tiếng • 8 slots</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPresetShift('AFTERNOON')}
                    className={`p-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left flex flex-col justify-between gap-1 border ${
                      activePreset === 'AFTERNOON'
                        ? 'border-teal-500 bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/30 scale-[1.02]'
                        : 'border-slate-200 bg-slate-50/70 hover:border-teal-300 hover:bg-teal-50/50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black">Ca Chiều</span>
                      <span className="text-sm">🌤️</span>
                    </div>
                    <div className="text-[11px] opacity-90 font-semibold">13:30 - 17:00</div>
                    <div className="text-[10px] opacity-75">3.5 tiếng • 7 slots</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => applyPresetShift('FULL_DAY')}
                    className={`p-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer text-left flex flex-col justify-between gap-1 border ${
                      activePreset === 'FULL_DAY'
                        ? 'border-teal-500 bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-lg shadow-teal-600/30 scale-[1.02]'
                        : 'border-slate-200 bg-slate-50/70 hover:border-teal-300 hover:bg-teal-50/50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-black">Cả Ngày</span>
                      <span className="text-sm">🌕</span>
                    </div>
                    <div className="text-[11px] opacity-90 font-semibold">08:00 - 17:00</div>
                    <div className="text-[10px] opacity-75">Nghỉ trưa • 15 slots</div>
                  </button>
                </div>
              </div>

              {/* 2. Tùy chỉnh chi tiết thời gian ca */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Clock size={14} className="text-teal-700" />
                  <span>2. Tùy chỉnh chi tiết thời gian từng ca:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">Giờ bắt đầu:</span>
                    <input
                      type="time"
                      required
                      value={startTime}
                      onChange={(e) => handleStartTimeChange(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-teal-700/20 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">Giờ kết thúc:</span>
                    <input
                      type="time"
                      required
                      value={endTime}
                      onChange={(e) => handleEndTimeChange(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-teal-700/20 font-bold"
                    />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">Thời lượng khám:</span>
                    <select
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(Number(e.target.value))}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-teal-700/20 font-bold cursor-pointer"
                    >
                      <option value={20}>20 phút / slot</option>
                      <option value={30}>30 phút (Chuẩn)</option>
                      <option value={45}>45 phút / slot</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Ngày làm việc & Buồng khám */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar size={14} className="text-teal-700" />
                  <span>3. Ngày làm việc &amp; Buồng khám phân công:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Ngày làm việc */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-600">Ngày làm việc (T2 - T6):</span>
                    <input
                      type="date"
                      min={getNextValidWorkingDate()}
                      required
                      value={workDate}
                      onChange={(e) => setWorkDate(e.target.value)}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-teal-700/20 font-bold"
                    />
                  </div>

                  {/* Buồng khám */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-600">
                        Buồng khám: {myExistingShiftOnDate && <span className="text-teal-700 font-bold">(Cố định trong ngày)</span>}
                      </span>
                      {checkingRooms && <RefreshCw size={11} className="animate-spin text-teal-600" />}
                    </div>
                    <select
                      value={selectedRoom}
                      disabled={Boolean(myExistingShiftOnDate)}
                      onChange={(e) => setSelectedRoom(e.target.value)}
                      className={`w-full p-2.5 border rounded-xl text-xs outline-none focus:ring-2 font-bold transition ${
                        myExistingShiftOnDate
                          ? 'border-teal-300 bg-teal-50/80 text-teal-900 cursor-not-allowed opacity-90'
                          : occupiedRooms.some((o) => o.roomNumber.toUpperCase() === selectedRoom.toUpperCase())
                          ? 'border-rose-300 bg-rose-50/50 text-rose-900 focus:ring-rose-500/20 cursor-pointer'
                          : 'border-slate-200 bg-slate-50 text-slate-800 focus:ring-teal-700/20 cursor-pointer'
                      }`}
                    >
                      {availableRooms.map((room) => {
                        const occ = occupiedRooms.find((o) => o.roomNumber.toUpperCase() === room.code.toUpperCase());
                        return (
                          <option 
                            key={room.code} 
                            value={room.code}
                            disabled={!!occ}
                            className={occ ? 'text-slate-400 bg-slate-100 italic' : 'text-slate-800 font-bold'}
                          >
                            {occ 
                              ? `🚫 ${room.code} - [ĐÃ KÍN] ${occ.doctorName}` 
                              : `✅ ${room.code} - ${room.name} (${room.floor})`}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {myExistingShiftOnDate && (
                  <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-900 text-xs flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-teal-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Quy định phòng khám (Khóa đa buồng/chi nhánh trong ngày):</span>
                      <p className="text-[11px] text-teal-800 mt-0.5 leading-relaxed">
                        Trong ngày <strong>{workDate}</strong>, Bác sĩ đã có ca trực tại buồng <strong>[{myExistingShiftOnDate.roomNumber || 'P.208'}]</strong> ({myExistingShiftOnDate.startTime} - {myExistingShiftOnDate.endTime}). Ca tiếp theo trong ngày được tự động cố định tại buồng này để bảo đảm đón tiếp người bệnh chu đáo. Bác sĩ có thể chọn buồng khám khác vào các ngày làm việc khác!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Thông báo kiểm tra tính hợp lệ */}
              {(() => {
                const todayStr = new Date().toISOString().slice(0, 10);
                if (workDate) {
                  if (workDate <= todayStr) {
                    return (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle size={15} className="text-rose-600 shrink-0" />
                        <span>Chỉ được đăng ký từ ngày mai trở đi ({getNextValidWorkingDate()}). Ca trực hôm nay được hệ thống tự động chốt.</span>
                      </div>
                    );
                  }
                  const selD = new Date(workDate + 'T00:00:00');
                  const dow = selD.getDay();
                  if (dow === 0 || dow === 6) {
                    return (
                      <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle size={15} className="text-rose-600 shrink-0" />
                        <span>Phòng khám chỉ hoạt động từ Thứ 2 đến Thứ 6. Không thể đăng ký vào cuối tuần ({dow === 6 ? 'Thứ 7' : 'Chủ Nhật'}).</span>
                      </div>
                    );
                  }
                }
                return null;
              })()}

              {/* Cảnh báo nếu chính Bác sĩ đã có ca trực trùng giờ */}
              {(() => {
                const myConflictSchedule = schedules.find((s) => {
                  if (s.workDate !== workDate || s.status !== 'ACTIVE') return false;
                  return startTime < s.endTime && endTime > s.startTime;
                });
                if (!myConflictSchedule) return null;
                return (
                  <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                    <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-amber-900">Bác sĩ đã có ca trực trong khung giờ này!</span>
                      <p className="text-[11px] text-amber-800 mt-0.5">
                        Bạn đã có ca ({myConflictSchedule.startTime} - {myConflictSchedule.endTime}) ngày {workDate}. Vui lòng chọn giờ khác.
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Cảnh báo buồng khám đã có người đăng ký */}
              {(() => {
                const currentOcc = occupiedRooms.find((o) => o.roomNumber.toUpperCase() === selectedRoom.toUpperCase());
                if (!currentOcc) return null;
                const freeRooms = availableRooms.filter(r => !occupiedRooms.some(o => o.roomNumber.toUpperCase() === r.code.toUpperCase()));
                return (
                  <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-900 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-extrabold text-rose-800 text-xs">
                          Buồng khám [{selectedRoom}] đã có Bác sĩ khác đăng ký!
                        </p>
                        <p className="text-[11px] text-rose-700 mt-0.5">
                          Bác sĩ <strong>{currentOcc.doctorName}</strong> ({currentOcc.startTime} - {currentOcc.endTime}).
                        </p>
                      </div>
                    </div>
                    {freeRooms.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1 border-t border-rose-200">
                        <span className="font-bold text-rose-800">Chọn phòng trống:</span>
                        {freeRooms.slice(0, 4).map(r => (
                          <button
                            key={r.code}
                            type="button"
                            onClick={() => setSelectedRoom(r.code)}
                            className="px-2 py-0.5 bg-white border border-rose-300 hover:border-emerald-500 hover:bg-emerald-50 text-emerald-800 font-bold rounded text-[11px] transition cursor-pointer"
                          >
                            {r.code}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </form>

            {/* Footer cố định */}
            {(() => {
              const todayStr = new Date().toISOString().slice(0, 10);
              const isPastOrToday = Boolean(workDate && workDate <= todayStr);
              const isWeekendDay = Boolean(workDate && [0, 6].includes(new Date(workDate + 'T00:00:00').getDay()));
              const hasMyConflict = schedules.some((s) => s.workDate === workDate && s.status === 'ACTIVE' && startTime < s.endTime && endTime > s.startTime);
              const hasRoomConflict = occupiedRooms.some((o) => o.roomNumber.toUpperCase() === selectedRoom.toUpperCase());

              return (
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
                  <div className="text-[11px] text-slate-500">
                    {isPastOrToday ? (
                      <span className="text-rose-600 font-bold">Chỉ đăng ký từ ngày mai trở đi</span>
                    ) : isWeekendDay ? (
                      <span className="text-rose-600 font-bold">Phòng khám nghỉ T7 &amp; CN</span>
                    ) : hasMyConflict ? (
                      <span className="text-amber-600 font-bold">Trùng ca trực của bạn</span>
                    ) : hasRoomConflict ? (
                      <span className="text-rose-600 font-bold">Buồng khám đã kín</span>
                    ) : (
                      <span className="text-teal-700 font-bold">Ca: {startTime} - {endTime} ({workDate})</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      disabled={submitting}
                      className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      type="submit"
                      form="createScheduleForm"
                      disabled={submitting || isPastOrToday || isWeekendDay || hasMyConflict || hasRoomConflict}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md ${
                        isPastOrToday || isWeekendDay || hasRoomConflict
                          ? 'bg-rose-600 text-white cursor-not-allowed shadow-none'
                          : hasMyConflict
                            ? 'bg-amber-600 text-white cursor-not-allowed shadow-none'
                            : 'bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white shadow-teal-700/20'
                      }`}
                    >
                      {submitting ? 'Đang Tạo Ca...' : `Xác Nhận Đăng Ký (${startTime} - ${endTime})`}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Cửa Sổ Tiện Ích Quản Lý Khung Giờ Ca Trực (In-Place Slots Modal) ── */}
      {activeScheduleForSlots && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-teal-50/80 via-emerald-50/50 to-white">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-xs">
                  <Clock size={19} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-800 text-sm">
                      Cửa Sổ Tiện Ích • Khung Giờ Khám
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {activeScheduleForSlots.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Ngày <strong>{activeScheduleForSlots.workDate}</strong> • Ca <strong>{activeScheduleForSlots.startTime} - {activeScheduleForSlots.endTime}</strong> • Buồng <strong>{activeScheduleForSlots.roomNumber || 'P.208'}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedScheduleForSlots(null)}
                className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-xl transition cursor-pointer"
                title="Đóng tiện ích"
              >
                <X size={18} />
              </button>
            </div>

            {/* Thống kê nhanh các slot */}
            <div className="p-3 sm:p-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px] flex items-center gap-1">
                  <Unlock size={12} />
                  <span>Trống: {activeScheduleForSlots.slots.filter(s => s.status === 'AVAILABLE').length}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 font-bold text-[11px] flex items-center gap-1">
                  <Lock size={12} />
                  <span>Tạm khóa: {activeScheduleForSlots.slots.filter(s => s.status === 'LOCKED').length}</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 font-bold text-[11px] flex items-center gap-1">
                  <UserCheck size={12} />
                  <span>Đã đặt: {activeScheduleForSlots.slots.filter(s => s.status === 'BOOKED').length}</span>
                </span>
              </div>
              <span className="text-[11px] text-slate-500 italic">
                * Nhấp vào slot trống/khóa để đóng hoặc mở
              </span>
            </div>

            {/* Danh sách lưới các slot */}
            <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-3">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {activeScheduleForSlots.slots.map((slot) => {
                  const isLocked = slot.status === 'LOCKED';
                  const isBooked = slot.status === 'BOOKED';

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isBooked || actionLoadingId === slot.id}
                      onClick={() => handleToggleSlot(slot)}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between gap-1.5 relative ${
                        isBooked
                          ? 'bg-blue-50 border-blue-200 text-blue-900 cursor-not-allowed'
                          : isLocked
                          ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer shadow-2xs'
                          : 'bg-emerald-50 border-emerald-300 text-emerald-900 hover:bg-emerald-100 cursor-pointer shadow-2xs'
                      }`}
                      title={
                        isBooked
                          ? 'Đã có người bệnh đặt hẹn'
                          : isLocked
                          ? 'Nhấp để mở lại khung giờ cho bệnh nhân đặt'
                          : 'Nhấp để tạm khóa khung giờ (nghỉ giữa giờ / hội chẩn)'
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs">
                          {slot.startTime} - {slot.endTime}
                        </span>
                        {actionLoadingId === slot.id ? (
                          <RefreshCw size={13} className="animate-spin text-slate-500" />
                        ) : isBooked ? (
                          <UserCheck size={13} className="text-blue-600" />
                        ) : isLocked ? (
                          <Lock size={13} className="text-amber-700" />
                        ) : (
                          <Unlock size={13} className="text-emerald-700" />
                        )}
                      </div>
                      <div className="text-[10px] font-bold flex items-center justify-between">
                        <span>
                          {isBooked ? 'Đã đặt' : isLocked ? 'Tạm khóa' : 'Sẵn sàng'}
                        </span>
                        {!isBooked && (
                          <span className="text-[9px] underline opacity-70">
                            {isLocked ? 'Mở lại' : 'Khóa slot'}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Thao tác trực tiếp trên giao diện ma trận tuần
              </span>
              <button
                type="button"
                onClick={() => setSelectedScheduleForSlots(null)}
                className="px-4 py-2 bg-teal-800 hover:bg-teal-900 text-white rounded-xl text-xs font-bold transition cursor-pointer shadow-sm"
              >
                Đóng Tiện Ích
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Hủy Ca Trực Khẩn Cấp (Phương Án 2: Bất Khả Kháng) ── */}
      {emergencyCancelScheduleData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden border border-rose-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-amber-700 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <AlertCircle size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base">Hủy Ca Trực Khẩn Cấp (Bất Khả Kháng)</h3>
                  <p className="text-[11px] text-rose-100">
                    Áp dụng Phương Án 2: Điều phối &amp; Chăm sóc người bệnh đã đặt hẹn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEmergencyCancelScheduleData(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form id="emergencyCancelForm" onSubmit={handleConfirmEmergencyCancel} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {/* Cảnh báo nghiêm trọng */}
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center gap-2 font-bold text-rose-900">
                  <AlertCircle size={16} className="text-rose-600 shrink-0" />
                  <span>
                    Ca trực ngày {emergencyCancelScheduleData.workDate} ({emergencyCancelScheduleData.startTime} - {emergencyCancelScheduleData.endTime}) hiện có:
                  </span>
                </div>
                <div className="text-rose-800 font-extrabold text-sm pl-6">
                  ⚠️ {emergencyCancelScheduleData.bookedSlots} bệnh nhân đã đặt lịch hẹn trước!
                </div>
                <p className="text-[11px] text-rose-700 pl-6 leading-relaxed">
                  Để đảm bảo quyền lợi và sự chăm sóc chu đáo cho người bệnh, Bác sĩ bắt buộc phải nêu rõ lý do đột xuất để hệ thống lưu vào bệnh án và chuyển sang bộ phận Tiếp đón/Lễ tân.
                </p>
              </div>

              {/* Danh sách bệnh nhân bị ảnh hưởng */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Danh sách người bệnh bị ảnh hưởng trong ca trực:
                </label>
                {loadingAffected ? (
                  <div className="p-4 bg-slate-50 rounded-2xl text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw size={14} className="animate-spin text-teal-600" />
                    <span>Đang tải thông tin bệnh nhân...</span>
                  </div>
                ) : affectedPatients.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 text-center">
                    (Không có thông tin chi tiết)
                  </div>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                    {affectedPatients.map((pt) => (
                      <div key={pt.appointmentId} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{pt.patientName}</div>
                          <div className="text-[11px] text-slate-500">Mã vé: {pt.bookingCode} • SĐT: {pt.patientPhone}</div>
                        </div>
                        <span className="px-2 py-1 bg-rose-100 text-rose-800 font-bold rounded-lg text-[10px]">
                          {pt.slotTime}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Nhập lý do bắt buộc */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">
                  Lý do hủy ca khẩn cấp (Bắt buộc) <span className="text-rose-500">*</span>:
                </label>
                <textarea
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Ví dụ: Bác sĩ có lịch mổ cấp cứu đột xuất / Sốt cao đột xuất / Họp khẩn cấp Sở Y tế..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  required
                />
                <span className="text-[10px] text-slate-400">
                  Tối thiểu 5 ký tự. Lý do này sẽ được ghi vào hồ sơ điều phối ca khám.
                </span>
              </div>

              {/* Checkbox tự động chuyển bác sĩ khác */}
              <div className="p-3.5 bg-teal-50/80 border border-teal-200 rounded-2xl flex items-start gap-3">
                <input
                  type="checkbox"
                  id="autoReassignCheck"
                  checked={autoReassignPeer}
                  onChange={(e) => setAutoReassignPeer(e.target.checked)}
                  className="mt-0.5 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <label htmlFor="autoReassignCheck" className="text-xs text-teal-900 cursor-pointer">
                  <strong className="block">Tự động điều phối sang Bác sĩ cùng chuyên khoa (Khuyên dùng)</strong>
                  <span className="text-[11px] text-teal-700 leading-relaxed block mt-0.5">
                    Hệ thống sẽ tự động tìm Bác sĩ khác có slot trống cùng khung giờ để gán bệnh nhân vào. Nếu không có, ca khám sẽ chuyển sang danh sách khẩn cấp để Lễ tân gọi điện hỗ trợ.
                  </span>
                </label>
              </div>
            </form>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setEmergencyCancelScheduleData(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 transition cursor-pointer"
              >
                Giữ Lại Ca Trực
              </button>
              <button
                type="submit"
                form="emergencyCancelForm"
                disabled={cancelSubmitting || !cancelReason.trim() || cancelReason.trim().length < 5}
                className="px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md bg-rose-600 hover:bg-rose-700 text-white"
              >
                {cancelSubmitting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Đang Xử Lý Hủy &amp; Điều Phối...</span>
                  </>
                ) : (
                  <span>Xác Nhận Hủy &amp; Điều Phối Bệnh Nhân</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Đổi Buồng Khám (CLAB-113: Chỉ áp dụng trước 1 ngày) ── */}
      {showChangeRoomModal && scheduleToChangeRoom && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-teal-200 flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-700 to-emerald-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <DoorOpen size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-black text-base">Đổi Buồng Khám Trực</h3>
                  <p className="text-[11px] text-teal-100">
                    Áp dụng cho ngày {scheduleToChangeRoom.workDate} ({scheduleToChangeRoom.startTime} - {scheduleToChangeRoom.endTime})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowChangeRoomModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleConfirmChangeRoom} className="p-5 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-900 space-y-1">
                <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                  <Lock size={14} className="text-amber-700" />
                  <span>Quy định khóa phòng khi bắt đầu ngày mới:</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Bác sĩ chỉ được đổi buồng khám trước <strong>00:00:00</strong> của ngày khám. 
                  Sau mốc 00:00:00, buồng khám sẽ được chốt cố định và đồng bộ với phiếu in số thứ tự tại quầy tiếp đón.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 flex items-center justify-between">
                  <span>Chọn buồng khám mới:</span>
                  {checkingRooms && <RefreshCw size={11} className="animate-spin text-teal-600" />}
                </label>
                <select
                  value={newRoomForChange}
                  onChange={(e) => setNewRoomForChange(e.target.value)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs bg-slate-50 text-slate-800 outline-none focus:ring-2 focus:ring-teal-700/20 font-semibold cursor-pointer"
                >
                  {availableRooms.map((room) => {
                    const occ = occupiedRooms.find((o) => o.roomNumber.toUpperCase() === room.code.toUpperCase());
                    return (
                      <option
                        key={room.code}
                        value={room.code}
                        disabled={!!occ}
                        className={occ ? 'text-slate-400 bg-slate-100 italic' : 'text-slate-800 font-semibold'}
                      >
                        {occ
                          ? `🚫 ${room.code} - [ĐÃ KÍN] ${occ.doctorName} (${occ.startTime} - ${occ.endTime})`
                          : `✅ ${room.code} - ${room.name} (${room.floor}) • Sẵn sàng`}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Cảnh báo xung đột nếu có */}
              {(() => {
                const currentOcc = occupiedRooms.find((o) => o.roomNumber.toUpperCase() === newRoomForChange.toUpperCase());
                if (currentOcc) {
                  return (
                    <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                      <AlertCircle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                      <span>Buồng khám [{newRoomForChange}] đã có Bác sĩ {currentOcc.doctorName} trực trong khung giờ này. Vui lòng chọn buồng khám khác!</span>
                    </div>
                  );
                }
                return (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    <span>Buồng khám [{newRoomForChange}] hoàn toàn khả dụng trong khung giờ này.</span>
                  </div>
                );
              })()}

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChangeRoomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={changingRoom || occupiedRooms.some((o) => o.roomNumber.toUpperCase() === newRoomForChange.toUpperCase())}
                  className="px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-md bg-teal-700 hover:bg-teal-800 text-white"
                >
                  {changingRoom ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" />
                      <span>Đang Cập Nhật...</span>
                    </>
                  ) : (
                    <span>Xác Nhận Đổi Buồng Khám</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
