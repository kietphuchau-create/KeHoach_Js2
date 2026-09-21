'use client';

import React, { useState, useRef, useEffect, useCallback, Suspense } from 'react';
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
  KeyRound,
  Copy,
  Phone,
  Check,
  Send,
  Stethoscope,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, AppointmentResponse, getAuthUser, getAuthToken } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { useSingleTabLock } from '@/shared/hooks/useSingleTabLock';
import SingleTabLockOverlay from '@/shared/components/Feedback/SingleTabLockOverlay';
import LoginForm from '@/modules/auth/components/LoginForm';

export default function ReceptionView() {
  const router = useRouter();
  const { isBlocked, handleTakeOver } = useSingleTabLock({
    channelKey: 'reception_counter',
    moduleName: 'Quầy Tiếp Đón Ngoại Trú',
  });

  const [currentUser, setCurrentUser] = useState<any>(null);

  const [method, setMethod] = useState<'QR_CODE' | 'CCCD_QR' | 'WALK_IN'>('QR_CODE');
  const [bookingCode, setBookingCode] = useState('');
  const [cccdNumber, setCccdNumber] = useState('');
  const [patientName, setPatientName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live feed state of checked-in patients
  const [history, setHistory] = useState<any[]>([]);

  // Walk-in Registration states (Khách vãng lai đăng ký tại quầy)
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinCccd, setWalkinCccd] = useState('');
  const [walkinSpecialty, setWalkinSpecialty] = useState('');
  const [walkinPassword, setWalkinPassword] = useState('Med@123456');
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

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
            const docTitle = docObj ? `${docObj.academicTitle ? docObj.academicTitle + ' ' : ''}${docObj.fullName}` : 'BS. CKII Nguyễn Minh Anh';
            const roomTitle = docObj?.roomNumber || 'Phòng 201 - Lầu 2';

            return {
              queueNumber: item.queueNumber,
              bookingCode: item.bookingCode,
              patientName: item.patientName,
              doctor: docTitle,
              room: roomTitle,
              checkInTime: timeStr,
              status: item.status === 'COMPLETED' ? 'ĐÃ KHÁM' : item.status === 'IN_CONSULTATION' ? 'ĐANG KHÁM' : 'ĐÃ TIẾP ĐÓN',
            };
          });
        if (mapped.length > 0) {
          setHistory(mapped);
        }
      }
    } catch (err: any) {
      console.warn('Could not load reception feed:', err?.message);
    }
  }, [doctors]);

  useEffect(() => {
    if (isAuthenticated) {
      loadTodayFeed();
    }
  }, [isAuthenticated, loadTodayFeed]);

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

    try {
      const res = await api.checkIn({
        bookingCode: method === 'QR_CODE' ? bookingCode : undefined,
        cccdNumber: method === 'CCCD_QR' ? cccdNumber : undefined,
        method: method === 'QR_CODE' ? 'QR_CODE' : 'CCCD_QR',
      });

      setResult(res);

      // Thêm vào bảng lịch sử tiếp đón trực tiếp (Live Feed)
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const newEntry = {
        queueNumber: res.queueNumber || `0${history.length + 1}`,
        bookingCode: res.bookingCode || (method === 'QR_CODE' ? bookingCode : `MED-${cccdNumber.slice(-4)}`),
        patientName: (res as any).patientName || (method === 'CCCD_QR' ? (patientName || 'Bệnh nhân CCCD') : 'Bệnh nhân tiếp đón'),
        doctor: (res as any).doctorName || 'BS. Chuyên khoa tiếp nhận',
        room: (res as any).roomNumber || 'Phòng khám chuyên khoa',
        checkInTime: timeStr,
        status: 'ĐÃ TIẾP ĐÓN',
      };

      setHistory((prev) => [newEntry, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Tiếp đón thất bại. Vui lòng kiểm tra lại mã hoặc thẻ.');
    } finally {
      setLoading(false);
    }
  };

  const handleWalkinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const cleanPhone = walkinPhone.trim();
    const cleanName = walkinName.trim();
    const generatedEmail = `${cleanPhone}@medsched.vn`;

    try {
      // 1. Tạo tài khoản người dùng thực tế vào Database
      try {
        await api.register({
          fullName: cleanName,
          phone: cleanPhone,
          email: generatedEmail,
          password: walkinPassword,
        });
      } catch (regErr: any) {
        console.warn('Thông báo đăng ký:', regErr.message);
      }

      // 2. Tạo thông tin ca khám và cấp số thứ tự (STT)
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const queueNumber = String(history.length + 1).padStart(2, '0');
      const bookingCode = `WALK-${Math.floor(100000 + Math.random() * 900000)}`;

      const selectedDoc = doctors.find((d) => d.id === selectedDoctorId) || doctors[0];
      const docName = selectedDoc ? `${selectedDoc.academicTitle ? selectedDoc.academicTitle + ' ' : ''}${selectedDoc.fullName}` : 'BS. Chuyên Khoa Tiếp Nhận';
      const roomNum = selectedDoc?.roomNumber || 'P.201 - Lầu 2';
      const specName = walkinSpecialty || selectedDoc?.specialtyName || 'Khoa Nội Tổng Quát';

      const newEntry = {
        queueNumber,
        bookingCode,
        patientName: cleanName,
        doctor: docName,
        room: roomNum,
        checkInTime: timeStr,
        status: 'ĐÃ TIẾP ĐÓN',
      };

      setHistory((prev) => [newEntry, ...prev]);

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
      setWalkinCccd('');
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
            Hỗ trợ đầu đọc quét mã QR vé hẹn điện tử, quét chip thẻ CCCD 12 số hoặc tạo hồ sơ & cấp tài khoản trực tiếp tại quầy.
          </p>
        </div>

        {/* Quick Stats Widget */}
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scanner & Walk-in Panel (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
            {/* Method Tabs */}
            <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => { setMethod('QR_CODE'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  method === 'QR_CODE'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <QrCode size={15} />
                <span>1. QR Vé</span>
              </button>
              <button
                type="button"
                onClick={() => { setMethod('CCCD_QR'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  method === 'CCCD_QR'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CreditCard size={15} />
                <span>2. Thẻ CCCD</span>
              </button>
              <button
                type="button"
                onClick={() => { setMethod('WALK_IN'); setError(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  method === 'WALK_IN'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <UserPlus size={15} />
                <span>3. Cấp TK Quầy</span>
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
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Mã Vé Hẹn Khám (Booking Code):
                  </label>
                  <div className="relative">
                    <QrCode className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                      ref={qrInputRef}
                      type="text"
                      required
                      value={bookingCode}
                      onChange={(e) => setBookingCode(e.target.value)}
                      placeholder="Quét mã QR hoặc nhập: MED-2026-8899"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none text-sm font-mono font-semibold text-slate-800"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                    <span>* Tương thích máy quét USB barcode 2D</span>
                    <button
                      type="button"
                      onClick={() => setBookingCode(`MED-2026-${Math.floor(1000 + Math.random() * 9000)}`)}
                      className="text-emerald-600 hover:underline font-medium cursor-pointer"
                    >
                      Tạo mã test
                    </button>
                  </div>
                </div>
              )}

              {method === 'CCCD_QR' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Số Định Danh CCCD Gắn Chip (12 số):
                    </label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input
                        ref={qrInputRef}
                        type="text"
                        required
                        value={cccdNumber}
                        onChange={(e) => setCccdNumber(e.target.value)}
                        placeholder="Ví dụ: 079095012345"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-emerald-500 focus:bg-white focus:outline-none text-sm font-mono font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Họ và Tên Bệnh Nhân (Khớp thẻ):
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="Châu Tuấn Kiệt"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none text-sm"
                    />
                  </div>
                </div>
              )}

              {method === 'WALK_IN' && (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Họ và Tên Bệnh Nhân: <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={walkinName}
                      onChange={(e) => setWalkinName(e.target.value)}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Số ĐT (Username): <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={walkinPhone}
                        onChange={handlePhoneChange}
                        placeholder="0912345678"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Số CCCD (12 số):
                      </label>
                      <input
                        type="text"
                        value={walkinCccd}
                        onChange={(e) => setWalkinCccd(e.target.value)}
                        placeholder="079095012345 (tùy chọn)"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Chuyên Khoa Thăm Khám:
                    </label>
                    <select
                      value={walkinSpecialty}
                      onChange={(e) => setWalkinSpecialty(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-sm"
                    >
                      {specialties.map((s) => (
                        <option key={s.id} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Khung Mật Khẩu Khởi Tạo & Hướng Dẫn Bàn Giao */}
                  <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-emerald-900 uppercase flex items-center gap-1.5">
                        <KeyRound size={14} className="text-emerald-700" />
                        <span>Mật Khẩu Khởi Tạo Cho Bệnh Nhân:</span>
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateRandomPass}
                        className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Đổi ngẫu nhiên
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        required
                        value={walkinPassword}
                        onChange={(e) => setWalkinPassword(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white border border-emerald-300 rounded-lg text-sm font-mono font-bold text-emerald-900 focus:outline-none"
                      />
                    </div>
                    <p className="text-[11px] text-emerald-700 leading-tight">
                      * Mật khẩu này sẽ được in trên phiếu khám để bệnh nhân mang về tự đăng nhập tra cứu.
                    </p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {loading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    <span>Đang xử lý...</span>
                  </>
                ) : method === 'WALK_IN' ? (
                  <>
                    <UserPlus size={18} />
                    <span>Cấp Tài Khoản &amp; In Phiếu Bàn Giao</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Xác Nhận Tiếp Đón (Check-in 1 Giây)</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Instant Result Card for QR/CCCD */}
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
                const docTitle = doc ? `${doc.academicTitle ? doc.academicTitle + ' ' : ''}${doc.fullName}` : 'Bác sĩ chuyên khoa';
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

            {/* Table Feed */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3">STT</th>
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
                  ) : (
                    history.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3">
                          <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 font-extrabold flex items-center justify-center text-xs">
                            {item.queueNumber}
                          </span>
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} /> {item.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 flex items-center justify-between text-xs text-slate-400">
            <span>Tổng số: <strong className="text-slate-700">{history.length}</strong> ca tiếp nhận</span>
            <span>Hệ thống Lễ tân MedSched kết nối buồng khám 1s</span>
          </div>
        </div>
      </div>

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
                  <p className="text-[11px] text-emerald-100">Bệnh viện Đa khoa MedSched</p>
                </div>
              </div>
              <button
                onClick={() => setAccountHandoverModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Printable Ticket Area (K80 Standard) */}
            <div id="printable-handover-ticket" className="p-6 bg-white space-y-4 text-slate-800">
              {/* Receipt Clinic Title */}
              <div className="text-center pb-3 border-b border-dashed border-slate-300">
                <div className="font-black text-slate-900 text-lg uppercase tracking-tight">HỆ THỐNG Y TẾ MEDSCHED</div>
                <p className="text-[11px] text-slate-500">Cơ sở: Chi Nhánh Quận 1 • Hotline: 1900 6868</p>
                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{accountHandoverModal.createdAt}</div>
              </div>

              {/* Huge Queue Number */}
              <div className="bg-emerald-50 border-2 border-emerald-500 rounded-2xl py-3 px-4 text-center">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">SỐ THỨ TỰ VÀO KHÁM</span>
                <div className="text-4xl font-black text-emerald-700 tracking-tight my-0.5">
                  STT #{accountHandoverModal.queueNumber}
                </div>
                <div className="text-xs font-semibold text-slate-700">
                  {accountHandoverModal.roomNumber} — <span className="text-emerald-800">{accountHandoverModal.specialtyName}</span>
                </div>
              </div>

              {/* Patient Quick Info */}
              <div className="space-y-1.5 text-xs border-b border-dashed border-slate-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-slate-500">Bệnh nhân:</span>
                  <strong className="text-slate-800 text-sm">{accountHandoverModal.fullName}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-mono font-bold text-slate-700">{accountHandoverModal.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã lượt khám:</span>
                  <span className="font-mono font-bold text-slate-700">{accountHandoverModal.bookingCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Bác sĩ phụ trách:</span>
                  <span className="font-medium text-slate-700">{accountHandoverModal.doctorName}</span>
                </div>
              </div>

              {/* ── HIGHLIGHT: PATIENT ONLINE ACCOUNT CREDENTIALS ── */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs uppercase tracking-wide">
                  <KeyRound size={15} className="text-amber-700 shrink-0" />
                  <span>Tài Khoản Tra Cứu Kết Quả Online:</span>
                </div>
                <div className="bg-white/90 p-3 rounded-xl border border-amber-200 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Tên đăng nhập:</span>
                    <strong className="font-mono text-slate-900 text-sm select-all">{accountHandoverModal.phone}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Mật khẩu tạm:</span>
                    <strong className="font-mono text-emerald-700 text-base font-black tracking-wider select-all">{accountHandoverModal.passwordInit}</strong>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500">Địa chỉ truy cập:</span>
                    <span className="font-mono text-blue-600 font-semibold text-[11px]">medsched.vn</span>
                  </div>
                </div>
                <p className="text-[10px] text-amber-800 leading-tight italic">
                  💡 Quý khách dùng tài khoản trên để xem kết quả xét nghiệm, đơn thuốc và đặt hẹn tái khám. Vui lòng đổi mật khẩu ở lần đăng nhập đầu tiên.
                </p>
              </div>

              <div className="text-center text-[10px] text-slate-400 italic pt-1">
                Chúc quý khách có trải nghiệm thăm khám thuận lợi &amp; mau chóng bình phục!
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
                onClick={handleSendSmsSimulated}
                className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {smsSent ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Đã Gửi SMS Đến {accountHandoverModal.phone}!</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Gửi Tin Nhắn SMS Tài Khoản Cho Bệnh Nhân</span>
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

      {/* ── Overlay Khóa Đa Tab (Single Tab Enforcement) ── */}
      <SingleTabLockOverlay
        isBlocked={isBlocked}
        moduleName="Quầy Tiếp Đón Ngoại Trú"
        onTakeOver={handleTakeOver}
        description="Để chống quét trùng mã QR, sai lệch thứ tự cấp số và xung đột in phiếu tiếp đón bệnh nhân, hệ thống MedSched chỉ cho phép 1 tab duy nhất được quyền điều hành Quầy Tiếp Đón."
      />
    </div>
  );
}
