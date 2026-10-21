'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { 
  QrCode, 
  CreditCard, 
  CheckCircle2, 
  ShieldCheck, 
  Clock, 
  Search, 
  UserCheck, 
  Users, 
  Building2, 
  Printer,
  Sparkles,
  RefreshCw,
  Bell,
  AlertCircle,
  UserPlus,
  User,
  KeyRound,
  Copy,
  Phone,
  Check,
  Send,
  Stethoscope,
  X,
  Filter,
  Camera,
  History,
  Zap,
  CalendarDays,
  DoorOpen
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, AppointmentResponse, getAuthUser, getAuthToken } from '@/shared/lib/api';
import { formatDoctorFullName } from '@/shared/lib/formatters';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { useSingleTabLock } from '@/shared/hooks/useSingleTabLock';
import { Bot } from 'lucide-react';
import UniversalAiAssistantModal from '@/shared/components/Feedback/UniversalAiAssistantModal';
import SingleTabLockOverlay from '@/shared/components/Feedback/SingleTabLockOverlay';
import LoginForm from '@/modules/auth/components/LoginForm';
import { QrCameraScannerModal, QrScanResult } from '@/shared/components/QrCameraScannerModal';
import { QrCodeImage } from '@/shared/components/QrCodeImage';
import ReceptionScheduleBoard from './ReceptionScheduleBoard';

const normalizeQueueNumber = (num?: string, isWalkin = false): string => {
  if (!num) return isWalkin ? 'W-01' : 'A-01';
  const str = String(num).trim();
  if (str.startsWith('APP-')) return 'A-' + str.substring(4);
  if (str.startsWith('WALK-')) return 'W-' + str.substring(5);
  if (str.startsWith('A-') || str.startsWith('W-')) return str;
  return isWalkin ? `W-${str}` : `A-${str}`;
};

export default function ReceptionView() {
  const router = useRouter();
  const { isBlocked, handleTakeOver } = useSingleTabLock({
    channelKey: 'reception_counter',
    moduleName: 'Quầy Tiếp Đón Ngoại Trú',
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  const [method, setMethod] = useState<'QR_CODE' | 'WALK_IN'>('QR_CODE');
  const [bookingCode, setBookingCode] = useState('');
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAiModal, setShowAiModal] = useState(false);

  // Live feed state of checked-in patients
  const [history, setHistory] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ĐÃ TIẾP ĐÓN' | 'ĐANG KHÁM' | 'ĐÃ KHÁM'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Walk-in Registration states (Khách vãng lai đăng ký tại quầy)
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinSpecialty, setWalkinSpecialty] = useState('');
  const [walkinPassword, setWalkinPassword] = useState('Med@123456');
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // Tab điều hướng chính của Lễ Tân: Tiếp đón & Check-in vs Tra cứu lịch toàn viện
  const [mainTab, setMainTab] = useState<'CHECK_IN' | 'SCHEDULE_CONSULT'>('CHECK_IN');

  // CLAB-120: Ràng buộc từng ký tự thời gian thực cho Khách Vãng Lai (chỉ cần Tên & Số ĐT)
  const walkinPhoneValidation = useMemo(() => {
    const p = walkinPhone.trim();
    if (!p) return { isValid: false, message: 'Bắt buộc nhập số điện thoại (10 chữ số)' };
    if (!/^\d+$/.test(p)) {
      return { isValid: false, message: 'Số điện thoại chỉ được chứa các chữ số từ 0-9.' };
    }
    if (p.length < 10) {
      return { isValid: false, message: `Số điện thoại còn thiếu (${p.length}/10 số). Vui lòng nhập đủ 10 chữ số.` };
    }
    if (p.length > 10) {
      return { isValid: false, message: `Số điện thoại quá dài (${p.length}/10 số).` };
    }
    const prefix = p.substring(0, 2);
    const validPrefixes = ['03', '05', '07', '08', '09'];
    if (!validPrefixes.includes(prefix)) {
      return { isValid: false, message: `Đầu số '${prefix}' không hợp lệ (phải bắt đầu bằng 03, 05, 07, 08 hoặc 09).` };
    }
    return { isValid: true, message: 'Số điện thoại hợp lệ (10/10 số)' };
  }, [walkinPhone]);

  const walkinNameValidation = useMemo(() => {
    const n = walkinName.trim();
    if (!n) return { isValid: false, message: 'Bắt buộc nhập họ và tên người bệnh' };
    if (n.length < 2) return { isValid: false, message: `Họ và tên quá ngắn (${n.length}/2 ký tự tối thiểu).` };
    if (n.length > 100) return { isValid: false, message: `Họ và tên quá dài (${n.length}/100 ký tự tối đa).` };
    for (let i = 0; i < n.length; i++) {
      const c = n[i];
      if (/[0-9]/.test(c)) {
        return { isValid: false, message: `Họ tên không được chứa chữ số ('${c}' tại vị trí ${i + 1}).` };
      }
      if (!/^[\p{L}\s]$/u.test(c)) {
        return { isValid: false, message: `Ký tự đặc biệt '${c}' tại vị trí ${i + 1} không được phép. Chỉ dùng chữ cái tiếng Việt.` };
      }
    }
    return { isValid: true, message: 'Họ và tên hợp lệ' };
  }, [walkinName]);
  const [preselectedWalkinInfo, setPreselectedWalkinInfo] = useState<{
    doctorName: string;
    roomNumber: string;
    slotTime: string;
    date: string;
  } | null>(null);

  const handleSelectSlotForWalkin = (doctor: any, slot: any, date: string) => {
    setMainTab('CHECK_IN');
    setMethod('WALK_IN');
    setSelectedDoctorId(doctor.id);
    if (doctor.specialtyName) {
      setWalkinSpecialty(doctor.specialtyName);
    }
    setPreselectedWalkinInfo({
      doctorName: formatDoctorFullName(doctor.academicTitle, doctor.fullName),
      roomNumber: doctor.roomNumber || 'P.208',
      slotTime: slot.time,
      date,
    });
    setError(null);
  };

  // Modal Bàn Giao Tài Khoản & In Phiếu K80
  const [accountHandoverModal, setAccountHandoverModal] = useState<{
    queueNumber: string;
    bookingCode: string;
    fullName: string;
    phone: string;
    email: string;
    passwordInit: string;
    doctorName: string;
    roomNumber: string;
    specialtyName: string;
    createdAt: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Billing Modal State
  const [billingAppointmentId, setBillingAppointmentId] = useState<string | null>(null);
  const [billingData, setBillingData] = useState<any>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');

  // Camera QR Scanner Modal State
  const [showCameraScanner, setShowCameraScanner] = useState(false);

  const qrInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = getAuthToken();
    const user = getAuthUser();
    const roles: string[] = user?.roles || [];
    if (!token || !user || (!roles.includes('ROLE_STAFF') && !roles.includes('ROLE_ADMIN'))) {
      setIsAuthenticated(false);
      setAuthChecked(true);
      return;
    }
    setCurrentUser(user);
    setIsAuthenticated(true);
    setAuthChecked(true);

    api.getSpecialties().then((data) => {
      setSpecialties(data || []);
      if (data && data.length > 0) setWalkinSpecialty(data[0].name);
    }).catch(() => {});
    api.getDoctors().then((data) => {
      setDoctors(data || []);
      if (data && data.length > 0) setSelectedDoctorId(data[0].id);
    }).catch(() => {});
  }, []);

  const loadTodayFeed = useCallback(async () => {
    try {
      const queue = await api.getDoctorQueue();
      if (Array.isArray(queue) && queue.length > 0) {
        const mapped = queue
          .filter((item: any) => item.status !== 'UPCOMING')
          .map((item: any) => {
            let timeStr = '--:--';
            if (item.checkInTime) {
              try {
                timeStr = new Date(item.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
              } catch {
                timeStr = item.appointmentTime || '--:--';
              }
            } else if (item.appointmentTime) {
              timeStr = item.appointmentTime;
            }

            const docObj = doctors.find((d: any) => d.id === item.doctorId);
            const docTitle = item.doctorName || (docObj ? formatDoctorFullName(docObj.academicTitle, docObj.fullName) : 'Bác sĩ phụ trách');
            const roomTitle = item.roomNumber || docObj?.roomNumber || 'Phòng Khám Chuyên Khoa';

            return {
              appointmentId: item.id,
              queueNumber: normalizeQueueNumber(item.queueNumber, false),
              bookingCode: item.bookingCode,
              patientName: item.patientName,
              doctor: docTitle,
              room: roomTitle,
              checkInTime: timeStr,
              status: item.status === 'COMPLETED' ? 'ĐÃ KHÁM' : item.status === 'IN_CONSULTATION' ? 'ĐANG KHÁM' : 'ĐÃ TIẾP ĐÓN',
            };
          });
        if (mapped.length > 0) {
          const uniqueMapped = mapped.filter((item: any, idx: number, arr: any[]) => 
            idx === arr.findIndex((t: any) => 
              (t.bookingCode && t.bookingCode === item.bookingCode) ||
              (t.appointmentId && t.appointmentId === item.appointmentId)
            )
          );
          setHistory(uniqueMapped);
        }
      }
    } catch (err: any) {
      console.warn('Could not load reception feed:', err?.message);
    }
  }, [doctors]);

  // Hàm thêm hoặc cập nhật bản ghi lịch sử tiếp đón, chống nhân bản tuyệt đối (De-duplicate)
  const upsertHistoryEntry = useCallback((newEntry: any) => {
    setHistory((prev) => {
      const existing = prev.find((p) => 
        (newEntry.bookingCode && p.bookingCode === newEntry.bookingCode) ||
        (newEntry.appointmentId && p.appointmentId === newEntry.appointmentId)
      );
      const filtered = prev.filter((p) => 
        (newEntry.bookingCode ? p.bookingCode !== newEntry.bookingCode : true) &&
        (newEntry.appointmentId ? p.appointmentId !== newEntry.appointmentId : true)
      );
      // Nếu đã có sẵn thì giữ nguyên checkInTime gốc của lần tiếp đón đầu tiên
      const entryToSave = existing 
        ? { ...newEntry, checkInTime: existing.checkInTime || newEntry.checkInTime }
        : newEntry;
      return [entryToSave, ...filtered];
    });
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadTodayFeed();

    // 1. Tự động đồng bộ Live Feed định kỳ mỗi 8 giây
    const pollInterval = setInterval(() => {
      loadTodayFeed();
    }, 8000);

    // 2. Lắng nghe tín hiệu cập nhật tức thì qua BroadcastChannel từ Buồng khám Bác sĩ
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('medsched_queue_sync');
      channel.onmessage = (event) => {
        if (event.data?.type === 'QUEUE_UPDATED') {
          loadTodayFeed();
        }
      };
    } catch {}

    return () => {
      clearInterval(pollInterval);
      channel?.close();
    };
  }, [isAuthenticated, loadTodayFeed]);

  // Filter and statistics for Live Feed
  const statusCounts = useMemo(() => {
    // Đảm bảo đếm trên danh sách đã lọc trùng
    const uniqueHistory = history.filter((item, index, self) => 
      index === self.findIndex((t) => 
        (t.bookingCode && t.bookingCode === item.bookingCode) ||
        (t.appointmentId && t.appointmentId === item.appointmentId)
      )
    );
    return {
      all: uniqueHistory.length,
      waiting: uniqueHistory.filter(item => item.status === 'ĐÃ TIẾP ĐÓN').length,
      inConsultation: uniqueHistory.filter(item => item.status === 'ĐANG KHÁM').length,
      completed: uniqueHistory.filter(item => item.status === 'ĐÃ KHÁM').length,
    };
  }, [history]);

  const filteredHistory = useMemo(() => {
    const list = history.filter(item => {
      const matchStatus = filterStatus === 'ALL' || item.status === filterStatus;
      const term = searchTerm.trim().toLowerCase();
      const matchSearch = !term || 
        (item.patientName && item.patientName.toLowerCase().includes(term)) ||
        (item.bookingCode && item.bookingCode.toLowerCase().includes(term)) ||
        (item.queueNumber && String(item.queueNumber).toLowerCase().includes(term)) ||
        (item.doctor && item.doctor.toLowerCase().includes(term));
      return matchStatus && matchSearch;
    });

    // Tuyệt đối không cho phép render trùng lặp cùng 1 ca khám / số vé
    return list.filter((item, index, self) => 
      index === self.findIndex((t) => 
        (t.bookingCode && t.bookingCode === item.bookingCode) ||
        (t.appointmentId && t.appointmentId === item.appointmentId)
      )
    );
  }, [history, filterStatus, searchTerm]);

  const roles: string[] = currentUser?.roles || [];
  const isStaff = roles.includes('ROLE_STAFF') || roles.includes('ROLE_ADMIN');

  // Auto focus input on mount and tab switch
  useEffect(() => {
    if (method !== 'WALK_IN') {
      qrInputRef.current?.focus();
    }
  }, [method]);

  const handleGenerateRandomPass = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setWalkinPassword(`Med@${randomDigits}`);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setWalkinPhone(val);
    if (val.length >= 4) {
      setWalkinPassword(`Med@${val.slice(-4)}`);
    }
  };

  const handleCopyCredentials = () => {
    if (!accountHandoverModal) return;
    const text = `MEDSCHED - THÔNG TIN TÀI KHOẢN KHÁM BỆNH:\nBệnh nhân: ${accountHandoverModal.fullName}\nSTT Khám: #${accountHandoverModal.queueNumber}\nPhòng khám: ${accountHandoverModal.roomNumber} (${accountHandoverModal.specialtyName})\n---\nTài khoản tra cứu kết quả xét nghiệm:\nTên đăng nhập: ${accountHandoverModal.phone}\nMật khẩu khởi tạo: ${accountHandoverModal.passwordInit}\nTruy cập tại: http://localhost:3000/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleSendSmsSimulated = () => {
    setSmsSent(true);
    setTimeout(() => setSmsSent(false), 4000);
  };

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanCode = bookingCode.trim();
    if (!cleanCode) {
      setError('Vui lòng nhập hoặc quét mã QR vé hẹn khám.');
      setLoading(false);
      return;
    }

    try {
      const res = await api.checkIn({
        bookingCode: cleanCode,
        fullName: patientName.trim() || undefined,
        doctorId: selectedDoctorId,
        method: 'QR_CODE',
      });

      setResult(res);

      // Thêm vào bảng lịch sử tiếp đón trực tiếp (Live Feed)
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const newEntry = {
        appointmentId: (res as any).id,
        queueNumber: normalizeQueueNumber(res.queueNumber || `0${history.length + 1}`, false),
        bookingCode: res.bookingCode || cleanCode,
        patientName: (res as any).patientName || patientName.trim() || 'Bệnh nhân tiếp đón',
        doctor: (res as any).doctorName || 'BS. Chuyên khoa tiếp nhận',
        room: (res as any).roomNumber || 'Phòng khám chuyên khoa',
        checkInTime: timeStr,
        status: 'ĐÃ TIẾP ĐÓN',
      };

      upsertHistoryEntry(newEntry);

      // Xóa form nhập để tránh bấm lặp lại nhiều lần
      setBookingCode('');
      setPatientName('');

      // Bắn tín hiệu đồng bộ buồng khám Bác sĩ ngay lập tức
      try {
        const syncChannel = new BroadcastChannel('medsched_queue_sync');
        syncChannel.postMessage({ type: 'QUEUE_UPDATED' });
        syncChannel.close();
      } catch {}
    } catch (err: any) {
      setError(err.message || 'Tiếp đón thất bại. Vui lòng kiểm tra lại mã vé hẹn.');
    } finally {
      setLoading(false);
    }
  };

  const handleCameraScanSuccess = async (scan: QrScanResult) => {
    if (scan.bookingCode) {
      setMethod('QR_CODE');
      setBookingCode(scan.bookingCode);
      setShowCameraScanner(false);
      setLoading(true);
      setError(null);
      try {
        const res = await api.checkIn({
          bookingCode: scan.bookingCode,
          doctorId: selectedDoctorId,
          method: 'QR_CODE',
        });
        setResult(res);
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        const newEntry = {
          appointmentId: (res as any).id,
          queueNumber: normalizeQueueNumber(res.queueNumber || `0${history.length + 1}`, false),
          bookingCode: res.bookingCode || scan.bookingCode,
          patientName: (res as any).patientName || 'Bệnh nhân tiếp đón',
          doctor: (res as any).doctorName || 'BS. Chuyên khoa tiếp nhận',
          room: (res as any).roomNumber || 'Phòng khám chuyên khoa',
          checkInTime: timeStr,
          status: 'ĐÃ TIẾP ĐÓN',
        };
        upsertHistoryEntry(newEntry);
        try {
          const syncChannel = new BroadcastChannel('medsched_queue_sync');
          syncChannel.postMessage({ type: 'QUEUE_UPDATED' });
          syncChannel.close();
        } catch {}
      } catch (err: any) {
        setError(err.message || 'Tiếp đón qua mã QR vé thất bại.');
      } finally {
        setLoading(false);
      }
    } else if (scan.fullName) {
      // Trường hợp camera quét thấy thông tin họ tên -> chuyển nhanh sang tab Khách Vãng Lai
      setMethod('WALK_IN');
      setWalkinName(scan.fullName);
      setShowCameraScanner(false);
    }
  };

  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!walkinPhoneValidation.isValid) {
      setError(`Lỗi số điện thoại: ${walkinPhoneValidation.message}`);
      return;
    }
    if (!walkinNameValidation.isValid) {
      setError(`Lỗi họ và tên: ${walkinNameValidation.message}`);
      return;
    }

    setLoading(true);
    setError(null);

    const cleanPhone = walkinPhone.trim();
    const cleanName = walkinName.trim();
    const generatedEmail = `${cleanPhone}@medsched.vn`;
    const docId = selectedDoctorId || (doctors[0]?.id);
    const spec = walkinSpecialty || (doctors.find((d) => d.id === docId)?.specialtyName) || 'Đa khoa';
    const autoPass = walkinPassword || (cleanPhone.length >= 4 ? `Med@${cleanPhone.slice(-4)}` : 'Med@1234');

    try {
      // 1. Tạo tài khoản & ca khám thực tế lưu vào CSDL MySQL
      const walkinRes = await api.registerWalkinPatient({
        fullName: cleanName,
        phone: cleanPhone,
        doctorId: docId,
        specialty: spec,
        password: autoPass,
      });

      const now = new Date();
      let timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      if (walkinRes.checkInTime) {
        try {
          timeStr = new Date(walkinRes.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        } catch {}
      }

      const queueNumber = normalizeQueueNumber(walkinRes.queueNumber, true);
      const bookingCode = walkinRes.bookingCode;
      const docName = walkinRes.doctorName;
      const roomNum = walkinRes.roomNumber;
      const specName = walkinRes.specialtyName;

      const newEntry = {
        appointmentId: walkinRes.appointmentId,
        queueNumber,
        bookingCode,
        patientName: cleanName,
        doctor: docName,
        room: roomNum,
        checkInTime: timeStr,
        status: 'ĐÃ TIẾP ĐÓN',
      };

      upsertHistoryEntry(newEntry);

      // Hiển thị thẻ kết quả tức thì
      setResult({
        id: walkinRes.appointmentId,
        bookingCode: walkinRes.bookingCode,
        queueNumber: queueNumber,
        patientName: cleanName,
        doctorName: docName,
        roomNumber: roomNum,
        specialtyName: specName,
        checkInTime: timeStr,
        status: 'CHECKED_IN',
      } as any);

      // 2. Phát tín hiệu đồng bộ tức thì qua BroadcastChannel tới Buồng khám Bác sĩ
      try {
        const syncChannel = new BroadcastChannel('medsched_queue_sync');
        syncChannel.postMessage({ type: 'QUEUE_UPDATED', doctorId: walkinRes.doctorId });
        syncChannel.close();
      } catch {}

      // 3. Mở Modal bàn giao tài khoản & in phiếu khám cho bệnh nhân
      setAccountHandoverModal({
        queueNumber,
        bookingCode,
        fullName: cleanName,
        phone: cleanPhone,
        email: generatedEmail,
        passwordInit: walkinPassword,
        doctorName: docName,
        roomNumber: roomNum,
        specialtyName: specName,
        createdAt: now.toLocaleString('vi-VN'),
      });

      // Reset form
      setWalkinName('');
      setWalkinPhone('');
      handleGenerateRandomPass();
    } catch (err: any) {
      setError(err.message || 'Tiếp đón tại quầy thất bại. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center text-xs text-slate-500">Đang kiểm tra quyền truy cập quầy tiếp đón...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-4 sm:py-8 animate-in fade-in duration-200">
        <div className="mb-3 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-900 border border-emerald-200 mb-2 shadow-xs">
            🔒 Yêu Cầu Đăng Nhập Nhân Viên
          </span>
          <h1 className="text-xl font-extrabold text-pine-teal">Quầy Tiếp Đón Ngoại Trú</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Vui lòng đăng nhập tài khoản Lễ tân hoặc Quản trị viên để truy cập phân hệ tiếp nhận bệnh nhân.
          </p>
        </div>
        <Suspense fallback={<div className="text-center py-10 text-xs text-slate-400">Đang tải biểu mẫu đăng nhập...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-600 mb-1 text-xs font-bold uppercase tracking-wider">
            <ShieldCheck size={18} />
            <span>Phân Hệ Tiếp Đón Y Tế Siêu Tốc (Fast Check-In 1s)</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Quầy Tiếp Nhận Bệnh Nhân Ngoại Trú</h1>
          <p className="text-slate-500 text-sm mt-1">
            Hỗ trợ quét mã QR vé hẹn điện tử hoặc tiếp đón khách vãng lai trực tiếp tại quầy (chỉ cần Tên &amp; Số điện thoại).
          </p>
        </div>

        {/* Quick Stats Widget & History & Kiosk Button */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAiModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-700 to-teal-900 hover:from-teal-800 hover:to-slate-900 text-white rounded-xl text-xs font-bold transition shadow-md hover:shadow-lg cursor-pointer ring-2 ring-teal-400/40"
            title="Mở Trợ lý AI Tiếp Đón Bệnh Nhân theo chuẩn MCP"
          >
            <Bot size={17} className="text-teal-300 animate-pulse" />
            <span>Trợ Lý AI Tiếp Đón (MCP)</span>
          </button>
          <Link
            href="/checkin"
            target="_blank"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition shadow-xs"
            title="Mở màn hình Kiosk tự phục vụ tiếp đón bệnh nhân"
          >
            <QrCode size={16} />
            <span>Mở Kiosk Tự Check-in</span>
          </Link>
          <Link
            href="/reception/history"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition shadow-xs"
          >
            <History size={16} className="text-emerald-600" />
            <span>Lịch Sử Tiếp Đón</span>
          </Link>
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
            <div className="px-4 py-1.5 border-r border-slate-200 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Đã tiếp đón</span>
              <span className="text-lg font-bold text-emerald-600">{history.length} ca</span>
            </div>
            <div className="px-4 py-1.5 text-center">
              <span className="text-[10px] text-slate-400 font-semibold block uppercase">Tốc độ xử lý</span>
              <span className="text-lg font-bold text-blue-600">~1.2 giây</span>
            </div>
          </div>
        </div>
      </div>

      {/* Cảnh báo phân quyền nếu là Bệnh nhân hoặc Khách vãng lai */}
      {!isStaff && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle size={22} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-900 text-sm">
                Bạn đang xem màn hình nội bộ dành cho Nhân Viên Lễ Tân (ROLE_STAFF)
              </h4>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                Là Bệnh nhân, bạn chỉ cần thực hiện <strong>Đặt Lịch Khám</strong> để nhận <strong>Mã vé hẹn & QR Code</strong>. Khi đến bệnh viện, nhân viên tại quầy sẽ dùng màn hình này để quét tiếp đón cho bạn.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/booking"
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition shadow-xs"
            >
              Đi đến Đặt Khám
            </Link>
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 text-xs font-semibold transition shadow-xs"
            >
              Đăng nhập Lễ tân
            </Link>
          </div>
        </div>
      )}

      {/* ── THANH CHUYỂN TAB CHÍNH CỦA LỄ TÂN (TIẾP ĐÓN vs TRA CỨU LỊCH TOÀN VIỆN) ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
          <button
            type="button"
            onClick={() => setMainTab('CHECK_IN')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
              mainTab === 'CHECK_IN'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck size={16} className={mainTab === 'CHECK_IN' ? 'text-emerald-600' : ''} />
            <span>1. Tiếp Đón &amp; Quét Mã Check-in</span>
          </button>

          <button
            type="button"
            onClick={() => setMainTab('SCHEDULE_CONSULT')}
            className={`px-4 py-2.5 rounded-xl text-xs font-extrabold transition flex items-center gap-2 cursor-pointer ${
              mainTab === 'SCHEDULE_CONSULT'
                ? 'bg-white text-teal-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarDays size={16} className={mainTab === 'SCHEDULE_CONSULT' ? 'text-teal-600' : ''} />
            <span>2. Tra Cứu Lịch Toàn Viện &amp; Tư Vấn Bác Sĩ</span>
            <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full ml-1">
              {doctors.length} Bác sĩ
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium px-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Hệ thống điều phối ngoại trú trực tuyến</span>
        </div>
      </div>

      {mainTab === 'CHECK_IN' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner & Walk-in Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            {/* Method Tabs (Tinh gọn 2 tab chuẩn) */}
            <div className="flex bg-slate-100 p-1.5 rounded-2xl mb-6 gap-1">
              <button
                type="button"
                onClick={() => { setMethod('QR_CODE'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  method === 'QR_CODE'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <QrCode size={16} className="shrink-0" />
                <span>1. Quét QR Vé Hẹn</span>
              </button>
              <button
                type="button"
                onClick={() => { setMethod('WALK_IN'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  method === 'WALK_IN'
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <UserPlus size={16} className="shrink-0" />
                <span>2. Khách Vãng Lai</span>
              </button>
            </div>

            {error && (
              <div className="mb-4">
                <AlertMessage type="error" message={error} onClose={() => setError(null)} />
              </div>
            )}

            {/* Check-in Form */}
            <form onSubmit={method === 'WALK_IN' ? handleWalkinSubmit : handleCheckin} className="space-y-4">
              {method === 'QR_CODE' && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Mã Vé Hẹn Khám (Booking Code):
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        ref={qrInputRef}
                        type="text"
                        required
                        value={bookingCode}
                        onChange={(e) => setBookingCode(e.target.value)}
                        placeholder="Ví dụ: MED-2026-8899"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none text-sm font-mono font-semibold text-slate-800 placeholder:font-sans placeholder:font-normal placeholder:text-slate-400"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCameraScanner(true)}
                      className="px-3.5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer whitespace-nowrap"
                      title="Mở camera webcam quét mã QR trực tiếp từ điện thoại bệnh nhân"
                    >
                      <Camera size={16} />
                      <span className="hidden sm:inline">Quét Camera</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Form Tiếp Đón Khách Vãng Lai: Chỉ cần Tên và Số Điện Thoại */}
              {method === 'WALK_IN' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2 shadow-2xs">
                    <Zap size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-extrabold text-emerald-800">Tiếp Đón Khách Vãng Lai:</span>
                      <p className="text-[11px] text-emerald-800/90 mt-0.5">
                        Khách đến khám trực tiếp — <strong>Chỉ cần nhập Số điện thoại và Họ tên</strong>, hệ thống tự động cấp số thứ tự STT khám ngay lập tức!
                      </p>
                    </div>
                  </div>

                  {/* Số Điện Thoại */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <div>
                        <span>Số Điện Thoại Người Bệnh</span> <span className="text-red-500">*</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">Đúng 10 chữ số</span>
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        autoFocus
                        maxLength={10}
                        value={walkinPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 10);
                          setWalkinPhone(val);
                          if (val.length >= 4) {
                            setWalkinPassword(`Med@${val.slice(-4)}`);
                          }
                          if (error) setError(null);
                        }}
                        placeholder="Ví dụ: 0912345678"
                        className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
                          walkinPhone
                            ? walkinPhoneValidation.isValid
                              ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                              : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                            : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'
                        }`}
                      />
                      <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    {walkinPhone && (
                      <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
                        walkinPhoneValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {walkinPhoneValidation.isValid ? <Check size={12} /> : <AlertCircle size={12} />}
                        <span>{walkinPhoneValidation.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Họ và Tên */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <div>
                        <span>Họ và Tên Bệnh Nhân</span> <span className="text-red-500">*</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-normal">Chữ cái tiếng Việt</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={walkinName}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-Z\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ]/g, '');
                          setWalkinName(val);
                          if (error) setError(null);
                        }}
                        placeholder="Ví dụ: Nguyễn Văn An"
                        className={`w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 ${
                          walkinName
                            ? walkinNameValidation.isValid
                              ? 'border-emerald-300 focus:border-emerald-600 focus:ring-emerald-100'
                              : 'border-rose-300 focus:border-rose-600 focus:ring-rose-100'
                            : 'border-slate-200 focus:border-emerald-600 focus:ring-emerald-100'
                        }`}
                      />
                      <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    </div>
                    {walkinName && (
                      <p className={`text-[11px] mt-1.5 flex items-center gap-1 font-semibold ${
                        walkinNameValidation.isValid ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {walkinNameValidation.isValid ? <Check size={12} /> : <AlertCircle size={12} />}
                        <span>{walkinNameValidation.message}</span>
                      </p>
                    )}
                  </div>

                  {/* Bác Sĩ & Buồng Khám Tiếp Nhận (Tự động điều phối) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Bác Sĩ &amp; Buồng Khám Tiếp Nhận:</span>
                      <span className="text-[10px] text-slate-400 font-normal">Tự động chọn</span>
                    </label>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-semibold text-slate-800"
                    >
                      {doctors.map((d) => (
                        <option key={d.id} value={d.id}>
                          {formatDoctorFullName(d.academicTitle, d.fullName)} ({d.roomNumber || 'Phòng P.205'}) - {d.specialtyName || 'Khám Đa Khoa'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}



              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
                >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Đang tiếp đón...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Xác Nhận Tiếp Đón (Check-in 1 Giây)</span>
                  </>
                )}
                </button>
              </div>
            </form>
          </div>

          {/* Instant Result Card */}
          {result && (
            <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-lg shadow-emerald-600/30 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={22} className="text-emerald-200" />
                  <span className="font-bold text-sm tracking-wide uppercase">TIẾP ĐÓN THÀNH CÔNG</span>
                </div>
                <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">1-CLICK PRINT</span>
              </div>

              <div className="text-center bg-white/10 backdrop-blur-xs py-4 px-3 rounded-xl border border-white/20">
                <span className="text-xs text-emerald-100 uppercase tracking-widest font-semibold block">Số Thứ Tự Vào Khám</span>
                <div className="text-5xl font-black text-white tracking-tight mt-1">
                  STT #{result.queueNumber || 'STT-01'}
                </div>
                <div className="text-xs text-emerald-200 mt-1 font-mono">
                  Mã hẹn: {result.bookingCode}
                </div>
              </div>

              {(() => {
                const doc = doctors.find((d: any) => d.id === result.doctorId);
                const docTitle = doc ? formatDoctorFullName(doc.academicTitle, doc.fullName) : 'Bác sĩ chuyên khoa';
                const roomTitle = doc?.roomNumber || 'Phòng khám chuyên khoa';
                return (
                  <div className="grid grid-cols-2 gap-2 text-xs text-emerald-50">
                    <div>Phòng khám: <strong className="text-white block text-sm">{roomTitle}</strong></div>
                    <div>Bác sĩ phụ trách: <strong className="text-white block text-sm">{docTitle}</strong></div>
                  </div>
                );
              })()}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 bg-white text-emerald-800 hover:bg-emerald-50 font-bold py-2 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Printer size={14} /> In Phiếu STT
                </button>
                <button
                  type="button"
                  onClick={() => setResult(null)}
                  className="px-4 bg-white/20 hover:bg-white/30 text-white font-semibold py-2 rounded-xl transition text-xs cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Real-time Check-in Live Feed (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Clock size={18} className="text-blue-600" />
                  <span>Danh Sách Đã Tiếp Đón Hôm Nay (Live Feed)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động chuyển tiếp vào hàng đợi phòng khám của Bác sĩ sau khi check-in.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Trực tiếp</span>
              </span>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 mb-3.5 pb-3 border-b border-slate-100">
              {/* Pill Tabs with flex-wrap and shrink-0 to prevent clipping */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setFilterStatus('ALL')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                    filterStatus === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <span>Tất cả</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    filterStatus === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {statusCounts.all}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('ĐÃ TIẾP ĐÓN')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                    filterStatus === 'ĐÃ TIẾP ĐÓN'
                      ? 'bg-amber-600 text-white shadow-xs shadow-amber-600/20'
                      : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
                  }`}
                >
                  <Clock size={12} />
                  <span>Đã tiếp đón</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    filterStatus === 'ĐÃ TIẾP ĐÓN' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-800'
                  }`}>
                    {statusCounts.waiting}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('ĐANG KHÁM')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                    filterStatus === 'ĐANG KHÁM'
                      ? 'bg-blue-600 text-white shadow-xs shadow-blue-600/20'
                      : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/60'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  <span>Đang khám</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    filterStatus === 'ĐANG KHÁM' ? 'bg-white/20 text-white' : 'bg-blue-200 text-blue-800'
                  }`}>
                    {statusCounts.inConsultation}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterStatus('ĐÃ KHÁM')}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap ${
                    filterStatus === 'ĐÃ KHÁM'
                      ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-600/20'
                      : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200/60'
                  }`}
                >
                  <CheckCircle2 size={12} />
                  <span>Đã khám</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                    filterStatus === 'ĐÃ KHÁM' ? 'bg-white/20 text-white' : 'bg-emerald-200 text-emerald-800'
                  }`}>
                    {statusCounts.completed}
                  </span>
                </button>
              </div>

              {/* Quick Search Input */}
              <div className="relative w-full lg:w-48 shrink-0">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Tìm tên, mã vé, STT..."
                  className="w-full pl-8 pr-7 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none transition"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Table Feed */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-20">STT</th>
                    <th className="py-2.5 px-3">Bệnh Nhân</th>
                    <th className="py-2.5 px-3">Bác Sĩ & Phòng</th>
                    <th className="py-2.5 px-3">Giờ Check-in</th>
                    <th className="py-2.5 px-3 text-right">Trạng Thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Chưa có lượt tiếp đón nào trong phiên làm việc này.
                      </td>
                    </tr>
                  ) : filteredHistory.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400 space-y-1.5">
                          <Filter size={22} className="text-slate-300" />
                          <p className="text-xs font-medium text-slate-500">
                            Không có bệnh nhân nào khớp với bộ lọc {filterStatus !== 'ALL' ? `"${filterStatus}"` : ''} {searchTerm ? `từ khóa "${searchTerm}"` : ''}
                          </p>
                          <button
                            type="button"
                            onClick={() => { setFilterStatus('ALL'); setSearchTerm(''); }}
                            className="text-xs text-emerald-600 font-bold hover:underline cursor-pointer pt-0.5"
                          >
                            Xóa bộ lọc để xem tất cả
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center justify-center px-2 py-1 min-w-[58px] rounded-lg font-mono font-extrabold text-xs tracking-tight whitespace-nowrap shadow-2xs ${
                              item.status === 'ĐÃ KHÁM'
                                ? 'bg-slate-100 text-slate-500 border border-slate-200/60'
                                : item.status === 'ĐANG KHÁM'
                                ? 'bg-blue-100 text-blue-800 ring-2 ring-blue-400/50'
                                : item.queueNumber?.startsWith('W-')
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-blue-100 text-blue-900 border border-blue-300'
                            }`}>
                              {item.queueNumber}
                            </span>
                            {item.queueNumber?.startsWith('W-') ? (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded">
                                Vãng lai
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-blue-800 bg-blue-50 border border-blue-200 px-1.5 py-0.2 rounded">
                                Đặt hẹn
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-slate-800">{item.patientName}</div>
                          <div className="text-[11px] font-mono text-slate-400">{item.bookingCode}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="text-slate-700 font-medium">{item.doctor}</div>
                          <div className="text-[11px] text-blue-600 font-semibold">{item.room}</div>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-600">
                          {item.checkInTime}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {item.status === 'ĐÃ TIẾP ĐÓN' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              <Clock size={11} /> ĐÃ TIẾP ĐÓN
                            </span>
                          ) : item.status === 'ĐANG KHÁM' ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                              <Stethoscope size={11} /> ĐANG KHÁM
                            </span>
                          ) : item.status === 'ĐÃ KHÁM' ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 size={11} /> ĐÃ KHÁM
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setBillingAppointmentId(item.appointmentId);
                                  setBillingLoading(true);
                                  api.getBillDetail(item.appointmentId)
                                    .then(setBillingData)
                                    .catch(e => alert(e.message))
                                    .finally(() => setBillingLoading(false));
                                }}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[10px] font-bold transition shadow-sm cursor-pointer whitespace-nowrap"
                              >
                                THU NGÂN
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {item.status}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-400">
            <span>
              Hiển thị: <strong className="text-slate-700">{filteredHistory.length}</strong> / <strong className="text-slate-700">{history.length}</strong> ca tiếp nhận
            </span>
            <Link
              href="/reception/history"
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline inline-flex items-center gap-1 text-xs"
            >
              <span>Xem toàn bộ lịch sử tiếp đón &amp; Tra cứu nâng cao →</span>
            </Link>
          </div>
        </div>
      </div>
      ) : (
        <ReceptionScheduleBoard
          onSelectSlotForWalkin={handleSelectSlotForWalkin}
          specialties={specialties}
          doctors={doctors}
        />
      )}

      {/* ── Modal Bàn Giao Tài Khoản & In Phiếu Tiếp Đón K80 (Walk-in Handover Ticket) ── */}
      {accountHandoverModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 space-y-0">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center font-bold">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-base">Phiếu Tiếp Đón &amp; Cấp Tài Khoản</h3>
                  <p className="text-[11px] text-emerald-100">Phòng khám Đa khoa MedSched</p>
                </div>
              </div>
              <button
                onClick={() => setAccountHandoverModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Printable Ticket Area (K80 Standard optimized for screen) */}
            <div id="printable-handover-ticket" className="relative p-6 bg-[#f8fafc] text-slate-800 overflow-hidden">
              {/* Decorative elements for ticket look */}
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-blue-500" />
              
              <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
                {/* Left/Right ticket cutouts */}
                <div className="absolute top-[120px] -left-4 w-8 h-8 bg-[#f8fafc] rounded-full border-r border-slate-100 shadow-inner" />
                <div className="absolute top-[120px] -right-4 w-8 h-8 bg-[#f8fafc] rounded-full border-l border-slate-100 shadow-inner" />
                
                {/* Header */}
                <div className="p-6 text-center border-b-[2px] border-dashed border-slate-200 relative">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white">
                      <Sparkles size={16} />
                    </div>
                    <div className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-700 to-teal-900 text-xl tracking-tight">MEDSCHED</div>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium uppercase tracking-widest">Phiếu Khám Bệnh Trực Tiếp</p>
                  <div className="text-[10px] text-slate-400 font-mono mt-1">{accountHandoverModal.createdAt}</div>
                </div>

                {/* Body - Queue Number */}
                <div className="px-6 py-8 text-center bg-gradient-to-b from-white to-emerald-50/30">
                  <span className="text-[10px] font-bold text-emerald-600/70 uppercase tracking-[0.2em] block mb-1">SỐ THỨ TỰ VÀO KHÁM</span>
                  <div className="text-6xl font-black text-emerald-600 tracking-tighter mb-2 drop-shadow-sm">
                    {accountHandoverModal.queueNumber}
                  </div>
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-100/50 rounded-full text-emerald-800 text-sm font-semibold border border-emerald-200/50">
                    <Building2 size={14} />
                    <span>{accountHandoverModal.roomNumber}</span>
                    <span className="w-1 h-1 rounded-full bg-emerald-400" />
                    <span>{accountHandoverModal.specialtyName}</span>
                  </div>
                </div>

                {/* Patient Info */}
                <div className="px-6 py-5 bg-white border-t-[2px] border-dashed border-slate-200 space-y-3">
                  <div className="flex justify-between items-end">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Bệnh nhân</span>
                      <strong className="text-slate-800 text-base">{accountHandoverModal.fullName}</strong>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Mã Lượt Khám</span>
                      <strong className="text-slate-800 text-sm font-mono">{accountHandoverModal.bookingCode}</strong>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-end pt-1">
                    <div>
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Bác sĩ phụ trách</span>
                      <span className="text-slate-700 text-sm font-medium">{accountHandoverModal.doctorName}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Số điện thoại</span>
                      <span className="text-slate-700 text-sm font-mono">{accountHandoverModal.phone}</span>
                    </div>
                  </div>
                </div>

                {/* ── HIGHLIGHT: PATIENT ONLINE ACCOUNT CREDENTIALS ── */}
                <div className="px-5 pb-6 bg-white">
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-4 text-white shadow-inner relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/5 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all duration-700" />
                    
                    <div className="flex items-center gap-2 text-emerald-400 font-bold text-[10px] uppercase tracking-widest mb-3">
                      <KeyRound size={14} />
                      <span>Tài Khoản Kết Quả Online</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="block text-[10px] text-slate-400 mb-0.5">Tên đăng nhập:</span>
                        <div className="font-mono text-white text-sm bg-white/10 px-2.5 py-1 rounded inline-block border border-white/5">
                          {accountHandoverModal.phone}
                        </div>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 mb-0.5">Mật khẩu tạm:</span>
                        <div className="font-mono text-emerald-300 font-bold tracking-widest text-sm bg-emerald-900/40 px-2.5 py-1 rounded inline-block border border-emerald-500/30">
                          {accountHandoverModal.passwordInit}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3 pt-3 border-t border-white/10 flex justify-between items-center">
                      <span className="text-[9px] text-slate-400 w-2/3 leading-tight">Truy cập để xem bệnh án, xét nghiệm & đơn thuốc điện tử. Đổi MK lần đầu.</span>
                      <span className="text-[10px] font-mono text-white bg-blue-600 px-2 py-0.5 rounded-full">medsched.vn</span>
                    </div>
                  </div>
                </div>
                
                {/* Real Scannable Ticket QR Code */}
                <div className="px-6 pb-6 pt-2 bg-white text-center">
                  <QrCodeImage
                    value={accountHandoverModal.bookingCode}
                    size={76}
                    className="mx-auto rounded shadow-xs"
                  />
                  <div className="text-[10px] tracking-widest font-mono mt-1 font-bold text-slate-600">
                    {accountHandoverModal.bookingCode}
                  </div>
                  <div className="text-[9px] text-emerald-600 font-medium">
                    ✓ Quét để tra cứu kết quả khám
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Printer size={15} />
                  <span>In Phiếu K80 / A5</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyCredentials}
                  className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check size={15} className="text-emerald-600" />
                      <span className="text-emerald-700">Đã Sao Chép!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={15} />
                      <span>Sao Chép TK</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  handleCopyCredentials();
                  setSmsSent(true);
                  setTimeout(() => setSmsSent(false), 4000);
                  alert(`Đã chuẩn bị nội dung tin nhắn SMS và sao chép vào bộ nhớ tạm!\nSẵn sàng gửi tới SĐT bệnh nhân: ${accountHandoverModal.phone}`);
                }}
                className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {smsSent ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Đã tạo &amp; sao chép nội dung SMS ({accountHandoverModal.phone})</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Gửi SMS số thứ tự &amp; thông tin TK tới {accountHandoverModal.phone}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setAccountHandoverModal(null)}
                className="w-full py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-200/60 transition text-center cursor-pointer"
              >
                Đóng Cửa Sổ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Thu Ngân & Viện Phí ── */}
      {billingAppointmentId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center font-bold">
                  <CreditCard size={20} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Thanh Toán Viện Phí</h3>
                  <p className="text-xs text-slate-300">Biên lai & Hóa đơn dịch vụ y tế</p>
                </div>
              </div>
              <button
                onClick={() => { setBillingAppointmentId(null); setBillingData(null); }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
              {billingLoading ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <RefreshCw size={32} className="animate-spin mb-3 text-amber-500" />
                  <p>Đang trích xuất dữ liệu viện phí...</p>
                </div>
              ) : billingData ? (
                <div className="space-y-6">
                  {/* Patient Details */}
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                    <div>
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Bệnh nhân</div>
                      <div className="font-black text-slate-800 text-lg">{billingData.patientName}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Bác sĩ khám</div>
                      <div className="font-semibold text-blue-700">{billingData.doctorName}</div>
                    </div>
                  </div>

                  {/* Bill Items */}
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/80 text-xs font-bold text-slate-600 uppercase tracking-wider">
                          <th className="py-3 px-4 w-1/2">Chi tiết dịch vụ / Thuốc</th>
                          <th className="py-3 px-4 text-center">SL</th>
                          <th className="py-3 px-4 text-right">Đơn giá</th>
                          <th className="py-3 px-4 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        <tr>
                          <td className="py-3 px-4 font-semibold text-slate-700 flex items-center gap-2">
                            <Stethoscope size={16} className="text-blue-500" /> Công khám bệnh
                          </td>
                          <td className="py-3 px-4 text-center font-mono">1</td>
                          <td className="py-3 px-4 text-right font-mono text-slate-500">{billingData.consultationFee.toLocaleString('vi-VN')} đ</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{billingData.consultationFee.toLocaleString('vi-VN')} đ</td>
                        </tr>
                        {billingData.items?.map((item: any, i: number) => (
                          <tr key={i}>
                            <td className="py-3 px-4 text-slate-600 pl-8">- {item.medicineName}</td>
                            <td className="py-3 px-4 text-center font-mono text-xs">{item.quantity} {item.unit}</td>
                            <td className="py-3 px-4 text-right font-mono text-xs text-slate-500">{item.unitPrice.toLocaleString('vi-VN')} đ</td>
                            <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">{item.lineAmount.toLocaleString('vi-VN')} đ</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-emerald-50/50">
                        <tr>
                          <td colSpan={3} className="py-4 px-4 text-right font-bold text-emerald-800 uppercase text-sm">Tổng cộng viện phí:</td>
                          <td className="py-4 px-4 text-right font-black text-emerald-700 text-xl tracking-tight">{billingData.totalAmount.toLocaleString('vi-VN')} đ</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Payment Method & Action */}
                  {billingData.status === 'PAID' ? (
                    <div className="bg-emerald-100 border border-emerald-300 p-4 rounded-xl flex items-center justify-between text-emerald-800">
                      <div className="flex items-center gap-2 font-bold">
                        <CheckCircle2 size={24} /> ĐÃ THANH TOÁN VIỆN PHÍ ({billingData.invoiceId})
                      </div>
                      <button className="px-4 py-2 bg-white text-emerald-700 rounded-lg font-bold text-sm shadow-sm hover:bg-emerald-50 transition cursor-pointer">In Hóa Đơn</button>
                    </div>
                  ) : (
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                      <h4 className="font-bold text-slate-700 text-sm">Phương thức thanh toán</h4>
                      <div className="flex gap-3">
                        <label className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition ${paymentMethod === 'CASH' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                          <input type="radio" name="method" value="CASH" checked={paymentMethod === 'CASH'} onChange={(e) => setPaymentMethod(e.target.value)} className="sr-only" />
                          <span className="font-bold text-slate-700">Tiền mặt</span>
                        </label>
                        <label className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition ${paymentMethod === 'BANK_TRANSFER' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                          <input type="radio" name="method" value="BANK_TRANSFER" checked={paymentMethod === 'BANK_TRANSFER'} onChange={(e) => setPaymentMethod(e.target.value)} className="sr-only" />
                          <span className="font-bold text-slate-700">Chuyển khoản</span>
                        </label>
                        <label className={`flex-1 flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition ${paymentMethod === 'POS_CARD' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                          <input type="radio" name="method" value="POS_CARD" checked={paymentMethod === 'POS_CARD'} onChange={(e) => setPaymentMethod(e.target.value)} className="sr-only" />
                          <span className="font-bold text-slate-700">Quẹt thẻ POS</span>
                        </label>
                      </div>

                      {/* VietQR Bank Transfer Box */}
                      {paymentMethod === 'BANK_TRANSFER' && (
                        <div className="bg-emerald-50/70 border-2 border-dashed border-emerald-400/60 rounded-2xl p-4 text-center space-y-3 animate-in fade-in duration-200">
                          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                            <ShieldCheck size={16} className="text-emerald-600" />
                            <span>Mã VietQR Thanh Toán Viện Phí (Napas 247)</span>
                          </div>
                          <img
                            src={`https://img.vietqr.io/image/MB-0388999988-compact2.png?amount=${Math.round(billingData.totalAmount)}&addInfo=${encodeURIComponent('MEDSCHED ' + (billingData.invoiceId || billingAppointmentId || 'BILL'))}&accountName=${encodeURIComponent('BVDK MEDSCHED TONG HOP')}`}
                            alt="VietQR Viện Phí"
                            className="w-48 h-48 object-contain rounded-xl mx-auto shadow-sm bg-white p-1"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const el = document.getElementById('billing-vietqr-fallback');
                              if (el) el.style.display = 'block';
                            }}
                          />
                          <div id="billing-vietqr-fallback" style={{ display: 'none' }} className="py-2">
                            <QrCodeImage
                              value={`2|99|0388999988|BVDK MEDSCHED TONG HOP|${Math.round(billingData.totalAmount)}|MEDSCHED ${billingData.invoiceId || 'BILL'}`}
                              size={180}
                              className="mx-auto rounded-lg"
                            />
                          </div>
                          <div className="bg-white/80 rounded-xl p-2.5 text-xs space-y-1 text-left border border-emerald-200/60 font-medium">
                            <div className="flex justify-between">
                              <span className="text-slate-500">Ngân hàng:</span>
                              <strong className="text-slate-800">MBBank (Ngân hàng Quân Đội)</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Số tài khoản:</span>
                              <strong className="text-slate-800 font-mono">0388999988</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Số tiền:</span>
                              <strong className="text-emerald-700 font-mono font-bold">{billingData.totalAmount.toLocaleString('vi-VN')} đ</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-500">Nội dung CK:</span>
                              <strong className="text-emerald-800 font-mono">MEDSCHED {billingData.invoiceId || 'BILL'}</strong>
                            </div>
                          </div>
                          <span className="text-[10px] text-slate-400 block">
                            * Hướng dẫn bệnh nhân mở app ngân hàng quét mã trên để thanh toán tức thì
                          </span>
                        </div>
                      )}

                      <button
                        onClick={async () => {
                          setBillingLoading(true);
                          try {
                            await api.payInvoice(billingData.invoiceId, {
                              amountPaid: billingData.totalAmount,
                              paymentMethod: paymentMethod
                            });
                            // Refresh
                            const updated = await api.getBillDetail(billingAppointmentId);
                            setBillingData(updated);
                            alert("Thanh toán thành công!");
                          } catch (e: any) {
                            alert(e.message);
                          } finally {
                            setBillingLoading(false);
                          }
                        }}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-xl shadow-lg shadow-amber-500/30 transition text-lg flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 size={24} /> XÁC NHẬN THANH TOÁN
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Quét Mã QR Bằng Camera Webcam ── */}
      <QrCameraScannerModal
        isOpen={showCameraScanner}
        onClose={() => setShowCameraScanner(false)}
        onScanSuccess={handleCameraScanSuccess}
        title="Quét Mã QR Vé Khám Điện Tử"
      />

      {/* ── Overlay Khóa Đa Tab (Single Tab Enforcement) ── */}
      <SingleTabLockOverlay
        isBlocked={isBlocked}
        moduleName="Quầy Tiếp Đón Ngoại Trú"
        onTakeOver={handleTakeOver}
        description="Để chống quét trùng mã QR, sai lệch thứ tự cấp số và xung đột in phiếu tiếp đón bệnh nhân, hệ thống MedSched chỉ cho phép 1 tab duy nhất được quyền điều hành Quầy Tiếp Đón."
      />

      {/* ── Trợ Lý AI Tiếp Đón Thông Minh (Chuẩn MCP) ── */}
      <UniversalAiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        defaultRole="STAFF"
        onActionSuccess={() => {
          // Đồng bộ lại live feed sau khi AI thực hiện check-in thành công.
          loadTodayFeed();
          try {
            const syncChannel = new BroadcastChannel('medsched_queue_sync');
            syncChannel.postMessage({ type: 'QUEUE_UPDATED' });
            syncChannel.close();
          } catch {}
        }}
      />
    </div>
  );
}
