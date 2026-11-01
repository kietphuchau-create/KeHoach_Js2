'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo, Suspense } from 'react';
import { 
  QrCode, 
  CreditCard, 
  CheckCircle2, 
  ShieldCheck,
  Clock, 
  Search, 
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
  DoorOpen,
  AlertTriangle,
  Banknote,
  Tag,
  Gift,
  Percent
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api, AppointmentResponse, getAuthUser, getAuthToken } from '@/shared/lib/api';
import { formatDoctorFullName, getLocalDateString } from '@/shared/lib/formatters';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { useSingleTabLock } from '@/shared/hooks/useSingleTabLock';
import SingleTabLockOverlay from '@/shared/components/Feedback/SingleTabLockOverlay';
import LoginForm from '@/modules/auth/components/LoginForm';
import { QrCameraScannerModal, QrScanResult } from '@/shared/components/QrCameraScannerModal';
import { QrCodeImage } from '@/shared/components/QrCodeImage';
import { getClinicScheduleConfig, SCHEDULE_CONFIG_UPDATED_EVENT } from '@/shared/lib/scheduleConfig';
import { validatePromotion, recordPromotionUsage } from '@/shared/lib/promotions';
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

  // Live feed state of checked-in patients
  const [history, setHistory] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ĐÃ TIẾP ĐÓN' | 'ĐANG KHÁM' | 'ĐÃ KHÁM'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');

  // Ngày đang xem trên Live Feed: 'TODAY' hoặc 'YESTERDAY' (Tránh hiểu lầm khi bước qua 00:00)
  const [feedDateFilter, setFeedDateFilter] = useState<'TODAY' | 'YESTERDAY'>('TODAY');

  const { todayIso, yesterdayIso, todayDisplay, yesterdayDisplay, todayShort, yesterdayShort } = useMemo(() => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const pad = (n: number) => String(n).padStart(2, '0');

    const tIso = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const yIso = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

    const tFmt = `${pad(today.getDate())}/${pad(today.getMonth() + 1)}/${today.getFullYear()}`;
    const yFmt = `${pad(yesterday.getDate())}/${pad(yesterday.getMonth() + 1)}/${yesterday.getFullYear()}`;

    return {
      todayIso: tIso,
      yesterdayIso: yIso,
      todayDisplay: `${days[today.getDay()]}, ${tFmt}`,
      yesterdayDisplay: `${days[yesterday.getDay()]}, ${yFmt}`,
      todayShort: `${pad(today.getDate())}/${pad(today.getMonth() + 1)}`,
      yesterdayShort: `${pad(yesterday.getDate())}/${pad(yesterday.getMonth() + 1)}`,
    };
  }, []);

  // Walk-in Registration states (Khách vãng lai đăng ký tại quầy)
  const [walkinName, setWalkinName] = useState('');
  const [walkinPhone, setWalkinPhone] = useState('');
  const [walkinSpecialty, setWalkinSpecialty] = useState('');
  const [walkinPassword, setWalkinPassword] = useState('Med@123456');
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // Ca trực thực tế hôm nay để ràng buộc tiếp đón (Tránh trường hợp Bác sĩ chưa đăng ký lịch mà vẫn cho tiếp đón)
  const [todaySchedules, setTodaySchedules] = useState<any[]>([]);
  const [todaySchedulesLoading, setTodaySchedulesLoading] = useState(false);
  const [walkinGender, setWalkinGender] = useState<'MALE' | 'FEMALE' | 'OTHER'>('MALE');
  const [walkinBirthYear, setWalkinBirthYear] = useState('1990');
  const [walkinSymptoms, setWalkinSymptoms] = useState('');

  const loadTodaySchedules = useCallback(async () => {
    setTodaySchedulesLoading(true);
    try {
      const todayStr = getLocalDateString();
      const res = await api.getDoctorSchedules('ALL', todayStr, todayStr);
      if (Array.isArray(res)) {
        setTodaySchedules(res.filter((s: any) => s.status === 'ACTIVE'));
      } else {
        setTodaySchedules([]);
      }
    } catch (err) {
      console.warn('Lỗi tải danh sách ca trực hôm nay:', err);
      setTodaySchedules([]);
    } finally {
      setTodaySchedulesLoading(false);
    }
  }, []);

  // Danh sách các Bác sĩ ĐANG CÓ CA TRỰC HÔM NAY (workDate == today && status == ACTIVE)
  const activeDoctorsToday = useMemo(() => {
    if (!todaySchedules || todaySchedules.length === 0) return [];
    const map = new Map<string, any>();
    todaySchedules.forEach((sch) => {
      if (!map.has(sch.doctorId)) {
        const docDetail = doctors.find((d) => d.id === sch.doctorId || d.userId === sch.doctorId);
        map.set(sch.doctorId, {
          id: sch.doctorId,
          fullName: sch.doctorName || docDetail?.fullName || 'Bác sĩ trực',
          academicTitle: sch.academicTitle || docDetail?.academicTitle || 'BS.',
          specialtyName: sch.specialtyName || docDetail?.specialtyName || docDetail?.specialty?.name || '',
          roomNumber: sch.roomNumber || docDetail?.roomNumber || 'P.101',
          startTime: sch.startTime,
          endTime: sch.endTime,
          scheduleId: sch.id,
        });
      }
    });
    return Array.from(map.values());
  }, [todaySchedules, doctors]);

  // Lọc Bác sĩ có ca trực hôm nay THEO ĐÚNG CHUYÊN KHOA ĐANG CHỌN
  const availableDoctorsForSpecialty = useMemo(() => {
    if (!walkinSpecialty) return activeDoctorsToday;
    return activeDoctorsToday.filter((d) => {
      const dSpec = (d.specialtyName || '').toLowerCase().trim();
      const targetSpec = walkinSpecialty.toLowerCase().trim();
      return dSpec === targetSpec || dSpec.includes(targetSpec) || targetSpec.includes(dSpec);
    });
  }, [activeDoctorsToday, walkinSpecialty]);

  // Tự động chọn Bác sĩ đầu tiên khả dụng khi đổi chuyên khoa
  useEffect(() => {
    if (availableDoctorsForSpecialty.length > 0) {
      const exists = availableDoctorsForSpecialty.some((d) => d.id === selectedDoctorId);
      if (!exists) {
        setSelectedDoctorId(availableDoctorsForSpecialty[0].id);
      }
    } else {
      setSelectedDoctorId('');
    }
  }, [availableDoctorsForSpecialty, selectedDoctorId]);

  // Kiểm tra khung giờ tiếp đón ngoại trú (08:00 - 12:00, 13:30 - 17:00, Thứ 2 - Thứ 6)
  // Bỏ qua khi Chế Độ Develop 24/7 đang BẬT
  const isWithinBusinessHours = useMemo(() => {
    const cfg = getClinicScheduleConfig();
    if (cfg.devMode247) return true;
    const now = new Date();
    const day = now.getDay();
    if (day === 0 || day === 6) return false;
    const totalMins = now.getHours() * 60 + now.getMinutes();
    const morning = totalMins >= 8 * 60 && totalMins < 12 * 60;
    const afternoon = totalMins >= 13 * 60 + 30 && totalMins < 17 * 60;
    return morning || afternoon;
  }, []);

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
    setShowCheckinModal(true);
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
  const [paymentMethod, setPaymentMethod] = useState('BANK_TRANSFER');
  const [billingPayOs, setBillingPayOs] = useState<{
    accountNumber?: string;
    accountName?: string;
    bin?: string;
    checkoutUrl?: string;
    qrCode?: string;
    transferContent?: string;
    amount?: number;
  } | null>(null);
  const [billingChecking, setBillingChecking] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [billingCopiedField, setBillingCopiedField] = useState<string | null>(null);
  const [billingActionLoading, setBillingActionLoading] = useState(false);

  // Promotion State cho Billing Viện Phí
  const [billingPromoCode, setBillingPromoCode] = useState<string>('');
  const [appliedBillingPromo, setAppliedBillingPromo] = useState<{
    code: string;
    discountAmount: number;
    finalAmount: number;
    isFree: boolean;
    name: string;
    message: string;
  } | null>(null);
  const [billingPromoError, setBillingPromoError] = useState<string | null>(null);

  // Màn hình thông báo thành công viện phí chính giữa màn hình (thay thế alert popup)
  const [billingSuccessData, setBillingSuccessData] = useState<{
    invoiceId: string;
    bookingCode: string;
    patientName: string;
    doctorName?: string;
    amountPaid: number;
    paymentMethod: string;
    transactionRef?: string;
    paidAt: string;
    promoCode?: string;
    promoName?: string;
    discountAmount?: number;
    originalTotal?: number;
  } | null>(null);

  // Helper kích hoạt thông báo thành công ở giữa màn hình
  const triggerBillingSuccess = useCallback((params: {
    amountPaid?: number;
    paymentMethod: string;
    transactionRef?: string;
    customNote?: string;
  }) => {
    if (!billingData) return;
    const originalTotal = Math.round(Number(billingData.totalAmount) || 0);
    const effectivePaid = appliedBillingPromo ? appliedBillingPromo.finalAmount : originalTotal;
    const finalAmount = params.amountPaid !== undefined ? params.amountPaid : effectivePaid;

    setBillingSuccessData({
      invoiceId: billingData.invoiceId || ('HD-' + Date.now().toString().slice(-6)),
      bookingCode: billingData.bookingCode || '',
      patientName: billingData.patientName || 'Bệnh nhân',
      doctorName: billingData.doctorName || 'Bác sĩ phụ trách',
      amountPaid: finalAmount,
      paymentMethod: params.paymentMethod,
      transactionRef: params.transactionRef || ('TX-' + Date.now().toString().slice(-6)),
      paidAt: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      promoCode: appliedBillingPromo?.code,
      promoName: appliedBillingPromo?.name,
      discountAmount: appliedBillingPromo?.discountAmount,
      originalTotal: originalTotal,
    });
  }, [billingData, appliedBillingPromo]);

  // Camera QR Scanner Modal State
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [showCheckinModal, setShowCheckinModal] = useState(false);

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
    }).catch(() => {});
    loadTodaySchedules();

    const handleCfgUpdate = () => {
      loadTodaySchedules();
    };
    window.addEventListener(SCHEDULE_CONFIG_UPDATED_EVENT, handleCfgUpdate);
    return () => {
      window.removeEventListener(SCHEDULE_CONFIG_UPDATED_EVENT, handleCfgUpdate);
    };
  }, [loadTodaySchedules]);

  useEffect(() => {
    if (showCheckinModal) {
      loadTodaySchedules();
    }
  }, [showCheckinModal, loadTodaySchedules]);

  const loadTodayFeed = useCallback(async (customDate?: string) => {
    try {
      const dateToQuery = customDate !== undefined 
        ? customDate 
        : (feedDateFilter === 'YESTERDAY' ? yesterdayIso : todayIso);
      const queue = await api.getDoctorQueue(undefined, dateToQuery);
      if (Array.isArray(queue)) {
        if (queue.length === 0) {
          setHistory([]);
          return;
        }
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
        } else {
          setHistory([]);
        }
      }
    } catch (err: any) {
      console.warn('Could not load reception feed:', err?.message);
    }
  }, [doctors, feedDateFilter, todayIso, yesterdayIso]);

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
  }, [isAuthenticated, loadTodayFeed, feedDateFilter]);

  // Polling tự động hóa đơn viện phí khi mở modal Chuyển khoản VietQR / PayOS
  useEffect(() => {
    if (!billingAppointmentId || !billingData || billingData.status === 'PAID' || billingSuccessData || paymentMethod !== 'BANK_TRANSFER') {
      return;
    }

    let isMounted = true;
    const cleanCode = (billingData.bookingCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    const intervalId = setInterval(async () => {
      try {
        const res = await api.checkRealPaymentStatus({
          appointmentId: billingAppointmentId,
          bookingCode: cleanCode,
          paymentType: 'FULL',
        });

        if (isMounted && res && res.success && res.status === 'SUCCEEDED') {
          clearInterval(intervalId);
          if (appliedBillingPromo) {
            recordPromotionUsage(appliedBillingPromo.code);
          }
          triggerBillingSuccess({
            amountPaid: res.amountPaid,
            paymentMethod: 'BANK_TRANSFER',
            transactionRef: res.transactionRef,
          });
          const updated = await api.getBillDetail(billingAppointmentId);
          if (isMounted) {
            setBillingData(updated);
            loadTodayFeed();
          }
        }
      } catch (err) {
        // Silently polling
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearInterval(intervalId);
    };
  }, [billingAppointmentId, billingData?.bookingCode, billingData?.invoiceId, billingData?.status, billingSuccessData, paymentMethod, appliedBillingPromo, triggerBillingSuccess, loadTodayFeed]);

  const handleManualCheckBilling = async () => {
    if (!billingAppointmentId || !billingData) return;
    setBillingChecking(true);
    setBillingError(null);
    try {
      const cleanCode = (billingData.bookingCode || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      const res = await api.checkRealPaymentStatus({
        appointmentId: billingAppointmentId,
        bookingCode: cleanCode,
        paymentType: 'FULL',
      });

      if (res && res.success && res.status === 'SUCCEEDED') {
        if (appliedBillingPromo) {
          recordPromotionUsage(appliedBillingPromo.code);
        }
        triggerBillingSuccess({
          amountPaid: res.amountPaid,
          paymentMethod: 'BANK_TRANSFER',
          transactionRef: res.transactionRef,
        });
        const updated = await api.getBillDetail(billingAppointmentId);
        setBillingData(updated);
        loadTodayFeed();
      } else {
        setBillingError('Hệ thống chưa nhận được biến động số dư cho khoản chuyển này. Vui lòng đợi 5-10 giây để liên ngân hàng xử lý.');
      }
    } catch (err: any) {
      setBillingError(err.message || 'Lỗi khi kiểm tra trạng thái giao dịch');
    } finally {
      setBillingChecking(false);
    }
  };

  const handleCopyBilling = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setBillingCopiedField(field);
    setTimeout(() => setBillingCopiedField(null), 2000);
  };

  // Áp dụng mã khuyến mãi cho hóa đơn viện phí
  const handleApplyBillingPromo = async (codeToApply?: string) => {
    const code = (codeToApply ?? billingPromoCode).trim().toUpperCase();
    if (!code) {
      setBillingPromoError('Vui lòng nhập mã khuyến mãi.');
      return;
    }
    const originalTotal = Number(billingData?.totalAmount) || 0;
    const res = validatePromotion(code, originalTotal);
    if (!res.valid) {
      setBillingPromoError(res.message);
      return;
    }

    setBillingPromoError(null);
    const promoInfo = {
      code,
      discountAmount: res.discountAmount,
      finalAmount: res.finalDeposit,
      isFree: res.isFree,
      name: res.promo?.name || code,
      message: res.message,
    };
    setAppliedBillingPromo(promoInfo);

    if (res.finalDeposit > 0) {
      const cleanCode = (billingData?.bookingCode || 'MED').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
      try {
        const payRes: any = await api.createRealPayment({
          appointmentId: billingAppointmentId || undefined,
          bookingCode: cleanCode,
          paymentType: 'FULL',
          amount: res.finalDeposit,
          method: 'BANK_TRANSFER',
        });
        if (payRes) {
          setBillingPayOs({
            accountNumber: payRes.accountNumber || '18112007',
            accountName: payRes.accountName || 'CHAU TUAN KIET',
            bin: payRes.bin || 'KLB',
            checkoutUrl: payRes.checkoutUrl,
            qrCode: payRes.qrCode,
            transferContent: payRes.transferContent || `MEDPAY ${cleanCode}`,
            amount: payRes.amount || res.finalDeposit,
          });
        }
      } catch (e) {
        setBillingPayOs((prev) =>
          prev
            ? { ...prev, amount: res.finalDeposit }
            : {
                accountNumber: '18112007',
                accountName: 'CHAU TUAN KIET',
                bin: 'KLB',
                transferContent: `MEDPAY ${cleanCode}`,
                amount: res.finalDeposit,
              }
        );
      }
    }
  };

  // Hủy / gỡ mã khuyến mãi đang áp dụng
  const handleRemoveBillingPromo = () => {
    setAppliedBillingPromo(null);
    setBillingPromoCode('');
    setBillingPromoError(null);
    const originalTotal = Number(billingData?.totalAmount) || 0;
    const cleanCode = (billingData?.bookingCode || 'MED').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    api.createRealPayment({
      appointmentId: billingAppointmentId || undefined,
      bookingCode: cleanCode,
      paymentType: 'FULL',
      amount: originalTotal,
      method: 'BANK_TRANSFER',
    })
      .then((res: any) => {
        if (res) {
          setBillingPayOs({
            accountNumber: res.accountNumber || '18112007',
            accountName: res.accountName || 'CHAU TUAN KIET',
            bin: res.bin || 'KLB',
            checkoutUrl: res.checkoutUrl,
            qrCode: res.qrCode,
            transferContent: res.transferContent || `MEDPAY ${cleanCode}`,
            amount: res.amount || originalTotal,
          });
        }
      })
      .catch(console.warn);
  };

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
      setFeedDateFilter('TODAY');
      setShowCheckinModal(false);

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
        setFeedDateFilter('TODAY');
        setShowCheckinModal(false);
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

    if (!isWithinBusinessHours) {
      setError('Hiện tại ngoài khung giờ tiếp đón ngoại trú (08:00 - 12:00 & 13:30 - 17:00). Vui lòng BẬT Chế Độ Develop 24/7 nếu đang chạy thử nghiệm.');
      return;
    }
    if (!selectedDoctorId || availableDoctorsForSpecialty.length === 0) {
      setError(`Hôm nay chuyên khoa "${walkinSpecialty || 'đã chọn'}" chưa có Bác sĩ nào có ca trực khả dụng. Vui lòng phân công ca trực trước!`);
      return;
    }
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
    const docId = selectedDoctorId;
    const spec = walkinSpecialty || (availableDoctorsForSpecialty.find((d) => d.id === docId)?.specialtyName) || 'Đa khoa';
    const autoPass = walkinPassword || (cleanPhone.length >= 4 ? `Med@${cleanPhone.slice(-4)}` : 'Med@1234');
    const generatedEmail = `${cleanPhone}@medsched.vn`;

    try {
      // 1. Tạo tài khoản & ca khám thực tế lưu vào CSDL MySQL
      const walkinRes = await api.registerWalkinPatient({
        fullName: cleanName,
        phone: cleanPhone,
        doctorId: docId,
        specialty: spec,
        password: autoPass,
        symptoms: walkinSymptoms.trim() || undefined,
        gender: walkinGender,
        birthYear: walkinBirthYear ? Number(walkinBirthYear) : undefined,
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
        doctorName: formatDoctorFullName(null, docName),
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
      setFeedDateFilter('TODAY');
      setShowCheckinModal(false);
      setAccountHandoverModal({
        queueNumber,
        bookingCode,
        fullName: cleanName,
        phone: cleanPhone,
        email: generatedEmail,
        passwordInit: autoPass,
        doctorName: formatDoctorFullName(null, docName),
        roomNumber: roomNum,
        specialtyName: specName,
        createdAt: now.toLocaleString('vi-VN'),
      });

      // Reset form
      setWalkinName('');
      setWalkinPhone('');
      setWalkinSymptoms('');
      setWalkinBirthYear('');
      setWalkinGender('OTHER');
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
    <div className="space-y-4">
      {mainTab === 'CHECK_IN' ? (
        /* Full-width Real-time Check-in Live Feed */
        <div className="w-full bg-white rounded-3xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                    <Clock size={18} className="text-blue-600" />
                    <span>Danh Sách Đã Tiếp Đón</span>
                  </h3>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border shadow-2xs ${
                    feedDateFilter === 'TODAY'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-teal-50 text-teal-800 border-teal-200'
                  }`}>
                    <CalendarDays size={13} />
                    <span>{feedDateFilter === 'TODAY' ? `Hôm nay: ${todayDisplay}` : `Hôm qua: ${yesterdayDisplay}`}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động chuyển tiếp vào hàng đợi phòng khám của Bác sĩ sau khi check-in.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setMainTab('SCHEDULE_CONSULT')}
                  className="px-3.5 py-2 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                  title="Tra cứu lịch trực của các bác sĩ toàn viện"
                >
                  <CalendarDays size={15} className="text-teal-600" />
                  <span>Tra Cứu Lịch Trực Của Bác Sĩ</span>
                  <span className="text-[10px] bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-full ml-1">
                    {doctors.length} Bác sĩ
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowCheckinModal(true)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer whitespace-nowrap"
                >
                  <QrCode size={15} />
                  <span>Tiếp Đón / Quét Mã Check-in</span>
                </button>
                <span className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Trực tiếp</span>
                </span>
              </div>
            </div>

            {/* Filter & Search Toolbar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 mb-3.5 pb-3 border-b border-slate-100">
              {/* Date Switcher + Pill Tabs with flex-wrap and shrink-0 to prevent clipping */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* 1. Bộ chuyển ngày xem Live Feed: Hôm nay vs Hôm qua (Chống hiểu lầm lúc giao thời nửa đêm) */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-xl gap-0.5 shrink-0 border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setFeedDateFilter('TODAY')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      feedDateFilter === 'TODAY'
                        ? 'bg-white text-emerald-800 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Xem hàng đợi hôm nay"
                  >
                    <Clock size={13} />
                    <span>Hôm nay ({todayShort})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFeedDateFilter('YESTERDAY')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                      feedDateFilter === 'YESTERDAY'
                        ? 'bg-white text-teal-800 shadow-2xs font-black'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    title="Xem các ca tiếp đón ngày hôm qua"
                  >
                    <History size={13} />
                    <span>Hôm qua ({yesterdayShort})</span>
                  </button>
                </div>

                <div className="h-5 w-px bg-slate-200 hidden sm:block mx-0.5" />

                {/* 2. Trạng thái ca khám */}
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
                      <td colSpan={5} className="py-10 px-4 text-center">
                        <div className="max-w-md mx-auto flex flex-col items-center justify-center space-y-3 bg-slate-50/80 border border-slate-200/90 rounded-2xl p-6 shadow-2xs animate-in fade-in">
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shadow-inner">
                            <CalendarDays size={24} />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-800 text-sm">
                              {feedDateFilter === 'TODAY'
                                ? `Hôm Nay (${todayDisplay}) Chưa Có Ca Tiếp Đón Mới`
                                : `Hôm Qua (${yesterdayDisplay}) Không Có Ca Khám Nào`}
                            </h4>
                            <p className="text-xs text-slate-500 leading-relaxed">
                              {feedDateFilter === 'TODAY'
                                ? 'Hệ thống tự động làm mới hàng đợi mỗi ngày (từ 00:00) để sẵn sàng đón lượt bệnh nhân mới. Các ca tiếp đón từ hôm qua hoặc các ngày trước vẫn được lưu trữ đầy đủ trong mục Lịch Sử Tiếp Đón.'
                                : 'Không tìm thấy hồ sơ tiếp đón nào trong ngày hôm qua. Bạn có thể bấm nút Hôm Nay bên trên hoặc mở Lịch Sử Tiếp Đón để xem tất cả.'}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                            {feedDateFilter === 'TODAY' && (
                              <button
                                type="button"
                                onClick={() => setFeedDateFilter('YESTERDAY')}
                                className="px-3.5 py-2 bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border border-slate-200 hover:border-teal-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-2xs"
                              >
                                <History size={14} className="text-teal-600" />
                                <span>Xem ca tiếp đón hôm qua ({yesterdayShort})</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setShowCheckinModal(true)}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                            >
                              <UserPlus size={14} />
                              <span>+ Tiếp Đón Bệnh Nhân Mới</span>
                            </button>
                            <Link
                              href="/reception/history"
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                            >
                              <span>Mở Sổ Lưu Trữ Toàn Viện →</span>
                            </Link>
                          </div>
                        </div>
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
                                  setBillingError(null);
                                  setBillingPayOs(null);
                                  setBillingSuccessData(null);
                                  setPaymentMethod('BANK_TRANSFER');
                                  setBillingPromoCode('');
                                  setAppliedBillingPromo(null);
                                  setBillingPromoError(null);
                                  api.getBillDetail(item.appointmentId)
                                    .then((data) => {
                                      setBillingData(data);
                                      if (data && data.status === 'PAID') {
                                        setBillingSuccessData({
                                          invoiceId: data.invoiceId,
                                          bookingCode: data.bookingCode,
                                          patientName: data.patientName,
                                          doctorName: data.doctorName,
                                          amountPaid: Number(data.totalAmount || 0),
                                          paymentMethod: 'ĐÃ TẤT TOÁN',
                                          transactionRef: data.invoiceId,
                                          paidAt: 'Đã hoàn tất',
                                          originalTotal: Number(data.totalAmount || 0),
                                        });
                                      } else if (data) {
                                        const amount = Number(data.totalAmount) || 0;
                                        const cleanCode = (data.bookingCode || 'MED').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                                        api.createRealPayment({
                                          appointmentId: item.appointmentId,
                                          bookingCode: cleanCode,
                                          paymentType: 'FULL',
                                          amount: amount,
                                          method: 'BANK_TRANSFER',
                                        }).then((res: any) => {
                                          if (res) {
                                            setBillingPayOs({
                                              accountNumber: res.accountNumber || '18112007',
                                              accountName: res.accountName || 'CHAU TUAN KIET',
                                              bin: res.bin || 'KLB',
                                              checkoutUrl: res.checkoutUrl,
                                              qrCode: res.qrCode,
                                              transferContent: res.transferContent || `MEDPAY ${cleanCode}`,
                                              amount: res.amount || amount,
                                            });
                                          }
                                        }).catch(() => {
                                          setBillingPayOs({
                                            accountNumber: '18112007',
                                            accountName: 'CHAU TUAN KIET',
                                            bin: 'KLB',
                                            transferContent: `MEDPAY ${cleanCode}`,
                                            amount: amount,
                                          });
                                        });
                                      }
                                    })
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
              Đang xem: <strong className="text-slate-800 font-semibold">{feedDateFilter === 'TODAY' ? todayDisplay : yesterdayDisplay}</strong> • Hiển thị: <strong className="text-slate-700">{filteredHistory.length}</strong> / <strong className="text-slate-700">{history.length}</strong> ca tiếp nhận
            </span>
            <Link
              href="/reception/history"
              className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline inline-flex items-center gap-1 text-xs"
            >
              <span>Xem toàn bộ lịch sử tiếp đón &amp; Tra cứu nâng cao →</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <CalendarDays size={18} className="text-teal-600" />
                <span>Tra Cứu Lịch Trực Bác Sĩ Toàn Viện</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Bấm vào khung giờ còn trống để chọn bác sĩ và tiếp đón cho bệnh nhân vãng lai.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMainTab('CHECK_IN')}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-sm shrink-0"
            >
              <Clock size={15} />
              <span>← Quay lại Danh Sách Tiếp Đón (Live Feed)</span>
            </button>
          </div>

          <ReceptionScheduleBoard
            onSelectSlotForWalkin={handleSelectSlotForWalkin}
            specialties={specialties}
            doctors={doctors}
          />
        </div>
      )}

      {/* ── Modal Tiếp Đón & Quét Mã Check-in (Popup Modal) ── */}
      {showCheckinModal && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setShowCheckinModal(false)}
        >
          <div 
            className="bg-white rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center font-bold">
                  <QrCode size={22} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">Tiếp Đón &amp; Quét Mã Check-in</h3>
                  <p className="text-xs text-emerald-100">Tiếp nhận vé hẹn trực tuyến hoặc đăng ký khám cho khách vãng lai</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCheckinModal(false)}
                className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Method Switcher Tabs */}
              <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                <button
                  type="button"
                  onClick={() => setMethod('QR_CODE')}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    method === 'QR_CODE'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <QrCode size={16} />
                  <span>1. Quét QR Vé Hẹn</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMethod('WALK_IN')}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
                    method === 'WALK_IN'
                      ? 'bg-white text-emerald-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <UserPlus size={16} />
                  <span>2. Khách Vãng Lai</span>
                </button>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-600 text-xs flex items-center gap-2 animate-in fade-in">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Banner nếu được điều hướng từ Bảng tra cứu lịch toàn viện */}
              {preselectedWalkinInfo && method === 'WALK_IN' && (
                <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={18} className="text-teal-600 shrink-0" />
                    <div>
                      <div className="font-bold text-teal-900">
                        Đang chọn ca khám: {preselectedWalkinInfo.doctorName} ({preselectedWalkinInfo.roomNumber})
                      </div>
                      <div className="text-teal-700 text-[11px]">
                        Khung giờ: {preselectedWalkinInfo.slotTime} • Ngày: {preselectedWalkinInfo.date}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPreselectedWalkinInfo(null)}
                    className="text-[11px] font-bold text-teal-700 hover:text-teal-900 underline ml-2 cursor-pointer"
                  >
                    Đổi bác sĩ khác
                  </button>
                </div>
              )}

              {/* Form Check-in */}
              <form onSubmit={method === 'QR_CODE' ? handleCheckin : handleWalkinSubmit} className="space-y-4">
                {method === 'QR_CODE' ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        MÃ VÉ HẸN KHÁM (BOOKING CODE):
                      </label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <QrCode className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input
                            ref={qrInputRef}
                            type="text"
                            value={bookingCode}
                            onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                            placeholder="Ví dụ: MED-2026-8899"
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono text-sm tracking-wide font-bold uppercase transition"
                            autoFocus
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCameraScanner(true)}
                          className="px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer whitespace-nowrap"
                          title="Mở camera quét mã QR trên điện thoại bệnh nhân"
                        >
                          <Camera size={16} />
                          <span>Quét Camera</span>
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1.5">
                        * Quét bằng đầu đọc barcode USB hoặc bấm nút Quét Camera ở trên.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* SĐT */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        SỐ ĐIỆN THOẠI NGƯỜI BỆNH <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="tel"
                          required
                          value={walkinPhone}
                          onChange={handlePhoneChange}
                          placeholder="Ví dụ: 0912345678 (10 số)"
                          maxLength={10}
                          className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:outline-none text-xs font-semibold text-slate-800 transition ${
                            walkinPhone.length > 0
                              ? walkinPhoneValidation.isValid
                                ? 'border-emerald-400 focus:ring-emerald-500'
                                : 'border-rose-300 focus:ring-rose-400 bg-rose-50/20'
                              : 'border-slate-200 focus:ring-emerald-500'
                          }`}
                        />
                      </div>
                      {walkinPhone.length > 0 && (
                        <p className={`text-[11px] mt-1 font-medium ${walkinPhoneValidation.isValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {walkinPhoneValidation.isValid ? '✓ ' : '✕ '}{walkinPhoneValidation.message}
                        </p>
                      )}
                    </div>

                    {/* Họ tên */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        HỌ VÀ TÊN NGƯỜI BỆNH <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                          type="text"
                          required
                          value={walkinName}
                          onChange={(e) => setWalkinName(e.target.value)}
                          placeholder="Ví dụ: NGUYỄN VĂN AN"
                          className={`w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border rounded-xl focus:bg-white focus:ring-2 focus:outline-none text-xs font-semibold text-slate-800 uppercase transition ${
                            walkinName.length > 0
                              ? walkinNameValidation.isValid
                                ? 'border-emerald-400 focus:ring-emerald-500'
                                : 'border-rose-300 focus:ring-rose-400 bg-rose-50/20'
                              : 'border-slate-200 focus:ring-emerald-500'
                          }`}
                        />
                      </div>
                      {walkinName.length > 0 && (
                        <p className={`text-[11px] mt-1 font-medium ${walkinNameValidation.isValid ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {walkinNameValidation.isValid ? '✓ ' : '✕ '}{walkinNameValidation.message}
                        </p>
                      )}
                    </div>

                    {/* Chuyên khoa & Bác sĩ */}
                    {/* Cảnh báo ngoài giờ làm việc nếu chưa bật 24/7 */}
                    {!isWithinBusinessHours && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                        <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Hiện tại ngoài giờ làm việc:</span> Giờ tiếp đón ngoại trú chuẩn là Thứ 2 - Thứ 6 (08:00 - 12:00, 13:30 - 17:00).
                          <span className="block mt-0.5 text-rose-700">Để tiếp đón ngoài giờ hoặc ban đêm phục vụ kiểm thử, vui lòng <strong>BẬT Chế Độ Develop 24/7</strong> tại Cấu hình ca trực.</span>
                        </div>
                      </div>
                    )}

                    {/* Cảnh báo nếu chưa có Bác sĩ nào có ca trực hôm nay */}
                    {activeDoctorsToday.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2 animate-in fade-in">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Toàn viện chưa có Ca trực hôm nay:</span> Hệ thống đang ở trạng thái 0 ca trực (chưa có Bác sĩ nào đăng ký lịch hôm nay). Vui lòng Bác sĩ đăng ký ca trực hoặc Quản trị viên phân công ca trực trước khi tiếp đón khách vãng lai.
                        </div>
                      </div>
                    ) : availableDoctorsForSpecialty.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-2 animate-in fade-in">
                        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Chưa có Bác sĩ trực:</span> Hôm nay chuyên khoa <strong>{walkinSpecialty}</strong> chưa có Bác sĩ nào mở ca trực. Vui lòng chọn chuyên khoa khác đang có bác sĩ trực.
                        </div>
                      </div>
                    ) : null}

                    {/* Chuyên khoa & Bác sĩ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Chuyên khoa khám
                        </label>
                        <select
                          value={walkinSpecialty}
                          onChange={(e) => setWalkinSpecialty(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-semibold text-slate-800"
                        >
                          {specialties.map((s) => (
                            <option key={s.id || s.name} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Bác sĩ &amp; Buồng khám (Chỉ hiện BS có ca trực hôm nay)
                        </label>
                        <select
                          value={selectedDoctorId}
                          onChange={(e) => setSelectedDoctorId(e.target.value)}
                          disabled={availableDoctorsForSpecialty.length === 0}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-semibold text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {availableDoctorsForSpecialty.length === 0 ? (
                            <option value="">-- Chưa có Bác sĩ trực chuyên khoa này --</option>
                          ) : (
                            availableDoctorsForSpecialty.map((d) => (
                              <option key={d.id} value={d.id}>
                                {formatDoctorFullName(d.academicTitle, d.fullName)} - Buồng {d.roomNumber}
                              </option>
                            ))
                          )}
                        </select>
                      </div>
                    </div>

                    {/* Giới tính & Năm sinh */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Giới tính
                        </label>
                        <select
                          value={walkinGender}
                          onChange={(e) => setWalkinGender(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-semibold text-slate-800"
                        >
                          <option value="MALE">Nam</option>
                          <option value="FEMALE">Nữ</option>
                          <option value="OTHER">Khác</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Năm sinh
                        </label>
                        <input
                          type="number"
                          min="1920"
                          max={new Date().getFullYear()}
                          value={walkinBirthYear}
                          onChange={(e) => setWalkinBirthYear(e.target.value)}
                          placeholder="1990"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-semibold text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Lý do khám / Triệu chứng ban đầu */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Lý do khám / Triệu chứng ban đầu (Ghi nhận hồ sơ bệnh án)
                      </label>
                      <input
                        type="text"
                        value={walkinSymptoms}
                        onChange={(e) => setWalkinSymptoms(e.target.value)}
                        placeholder="Ví dụ: Nổi mẩn ngứa da, Đau rát họng, Khám sức khỏe tổng quát..."
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={
                      loading ||
                      (method === 'WALK_IN' && (
                        !walkinPhoneValidation.isValid ||
                        !walkinNameValidation.isValid ||
                        !selectedDoctorId ||
                        availableDoctorsForSpecialty.length === 0 ||
                        !isWithinBusinessHours
                      ))
                    }
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl transition shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
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
          </div>
        </div>
      )}

      {/* ── Modal Thẻ Kết Quả Tiếp Đón (STT Ticket Result Modal) ── */}
      {result && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
          onClick={() => setResult(null)}
        >
          <div 
            className="bg-emerald-600 text-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden border border-emerald-500 p-6 space-y-4 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={24} className="text-emerald-200" />
                <span className="font-bold text-sm tracking-wide uppercase">TIẾP ĐÓN THÀNH CÔNG</span>
              </div>
              <span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">1-CLICK PRINT</span>
            </div>

            <div className="text-center bg-white/10 backdrop-blur-xs py-5 px-4 rounded-2xl border border-white/20">
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
                <div className="grid grid-cols-2 gap-3 text-xs text-emerald-50 bg-emerald-700/50 p-3 rounded-xl">
                  <div>Phòng khám: <strong className="text-white block text-sm mt-0.5">{roomTitle}</strong></div>
                  <div>Bác sĩ: <strong className="text-white block text-sm mt-0.5">{docTitle}</strong></div>
                </div>
              );
            })()}

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 bg-white text-emerald-800 hover:bg-emerald-50 font-bold py-2.5 rounded-xl transition text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Printer size={15} /> In Phiếu STT
              </button>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="px-5 bg-white/20 hover:bg-white/30 text-white font-semibold py-2.5 rounded-xl transition text-xs cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Bàn Giao Tài Khoản & In Phiếu Tiếp Đón K80 (Walk-in Handover Ticket - High Density Layout) ── */}
      {accountHandoverModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-3 overflow-y-auto">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-200 flex flex-col my-auto animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center font-bold">
                  <Printer size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Phiếu Tiếp Đón &amp; Cấp Tài Khoản Khám Bệnh</h3>
                  <p className="text-[10px] text-emerald-100">Phòng khám Đa khoa MedSched</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAccountHandoverModal(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition cursor-pointer"
                title="Đóng cửa sổ"
              >
                <X size={18} />
              </button>
            </div>

            {/* Printable Ticket Area (High Density 2-Column Standard) */}
            <div id="printable-handover-ticket" className="p-3 sm:p-3.5 bg-[#f8fafc] text-slate-800 shrink-0">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                {/* Top Mini Header */}
                <div className="px-3.5 py-1.5 flex items-center justify-between border-b-[2px] border-dashed border-slate-200 bg-white">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shrink-0">
                      <Sparkles size={11} />
                    </div>
                    <span className="font-black text-emerald-800 text-xs tracking-tight">MEDSCHED</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">• PHIẾU KHÁM BỆNH TRỰC TIẾP</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono">{accountHandoverModal.createdAt}</div>
                </div>

                {/* Core 2-Column Content */}
                <div className="p-3 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-gradient-to-b from-white to-emerald-50/20">
                  {/* Cột Trái: Số thứ tự & Buồng khám */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center text-center sm:border-r border-slate-100 sm:pr-3">
                    <span className="text-[9px] font-bold text-emerald-600/80 uppercase tracking-widest block">SỐ THỨ TỰ VÀO KHÁM</span>
                    <div className="text-4xl sm:text-5xl font-black text-emerald-600 tracking-tight leading-none my-1 drop-shadow-xs">
                      {accountHandoverModal.queueNumber}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/70 rounded-full text-emerald-900 text-xs font-bold border border-emerald-200/60 max-w-full truncate">
                      <Building2 size={13} className="shrink-0" />
                      <span className="font-mono">{accountHandoverModal.roomNumber}</span>
                      <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                      <span className="truncate">{accountHandoverModal.specialtyName}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium mt-1.5 truncate max-w-full">
                      BS: <strong className="text-slate-800">{formatDoctorFullName(null, accountHandoverModal.doctorName)}</strong>
                    </div>
                  </div>

                  {/* Cột Phải: Tài khoản Online & QR Tra Cứu */}
                  <div className="sm:col-span-7 flex flex-col gap-1.5">
                    <div className="bg-slate-900 rounded-xl p-2.5 text-white shadow-inner flex items-center justify-between gap-2.5 relative overflow-hidden">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[9px] uppercase tracking-wider mb-1.5">
                          <KeyRound size={12} className="shrink-0" />
                          <span>Tài Khoản Kết Quả Online</span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                            <span className="text-slate-400 w-12 shrink-0">Tên ĐN:</span>
                            <span className="font-mono font-bold text-white bg-white/10 px-1.5 py-0.5 rounded text-[11px]">
                              {accountHandoverModal.phone}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-300">
                            <span className="text-slate-400 w-12 shrink-0">Mật khẩu:</span>
                            <span className="font-mono font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/30 text-[11px]">
                              {accountHandoverModal.passwordInit}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Mã QR Tra Cứu */}
                      <div className="flex flex-col items-center justify-center shrink-0 bg-white p-1 rounded-lg shadow-xs">
                        <QrCodeImage
                          value={accountHandoverModal.bookingCode}
                          size={54}
                          className="rounded"
                        />
                        <span className="text-[8px] font-mono font-bold text-slate-600 mt-0.5 tracking-tight">
                          {accountHandoverModal.bookingCode}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-slate-400 px-1">
                      <span>Đổi MK lần đầu • Tra cứu đơn thuốc &amp; KQ xét nghiệm</span>
                      <span className="font-mono font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">medsched.vn</span>
                    </div>
                  </div>
                </div>

                {/* Patient Summary Strip */}
                <div className="px-3.5 py-2 bg-slate-50 border-t-[2px] border-dashed border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-left">
                  <div>
                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Bệnh nhân</span>
                    <strong className="text-slate-800 text-xs truncate block">{accountHandoverModal.fullName}</strong>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Mã Lượt Khám</span>
                    <strong className="text-slate-700 text-xs font-mono">{accountHandoverModal.bookingCode}</strong>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Số điện thoại</span>
                    <span className="text-slate-700 text-xs font-mono">{accountHandoverModal.phone}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] text-slate-400 font-bold uppercase tracking-wider">Trạng thái</span>
                    <span className="inline-block text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                      ✓ Đã Tiếp Đón
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions (Compact 1-row Toolbar) */}
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <Printer size={14} />
                <span>In Phiếu K80 / A5</span>
              </button>
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="py-2 px-3 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-700">Đã Chép TK!</span>
                  </>
                ) : (
                  <>
                    <Copy size={14} />
                    <span>Sao Chép TK</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  handleCopyCredentials();
                  setSmsSent(true);
                  setTimeout(() => setSmsSent(false), 4000);
                  alert(`Đã chuẩn bị nội dung tin nhắn SMS và sao chép vào bộ nhớ tạm!\nSẵn sàng gửi tới SĐT bệnh nhân: ${accountHandoverModal.phone}`);
                }}
                className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
              >
                {smsSent ? (
                  <>
                    <Check size={14} className="text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Đã Tạo SMS</span>
                  </>
                ) : (
                  <>
                    <Send size={14} />
                    <span>Gửi SMS BN</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setAccountHandoverModal(null)}
                className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition text-center cursor-pointer shrink-0"
              >
                Đóng
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
                onClick={() => {
                  setBillingAppointmentId(null);
                  setBillingData(null);
                  setBillingSuccessData(null);
                  setAppliedBillingPromo(null);
                  setBillingPromoCode('');
                  setBillingPromoError(null);
                }}
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
              ) : billingSuccessData ? (
                /* === MÀN HÌNH THÔNG BÁO THÀNH CÔNG RỰC RỠ Ở CHÍNH GIỮA MÀN HÌNH (THAY THẾ HOÀN TOÀN ALERT) === */
                <div className="py-6 px-3 sm:px-6 text-center space-y-6 animate-in zoom-in-95 duration-200">
                  {/* Glowing Animated Success Badge */}
                  <div className="relative inline-block">
                    <span className="animate-ping absolute inset-0 inline-flex h-full w-full rounded-full bg-emerald-400 opacity-30"></span>
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 ring-8 ring-emerald-50 relative">
                      <CheckCircle2 size={46} className="text-emerald-600 stroke-[2.5]" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">
                      Thanh Toán Viện Phí Thành Công!
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      Hệ thống MedSched đã xác nhận gạch nợ tự động và hoàn tất thủ tục khám chữa bệnh của người bệnh.
                    </p>
                  </div>

                  {/* Digital Receipt Card */}
                  <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-md p-5 text-xs space-y-3 max-w-md mx-auto text-left divide-y divide-slate-100">
                    <div className="flex justify-between items-center pb-2">
                      <span className="text-slate-500 font-medium">Mã phiếu hẹn:</span>
                      <strong className="text-slate-800 font-mono font-bold text-sm bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                        {billingSuccessData.bookingCode}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500 font-medium">Bệnh nhân:</span>
                      <strong className="text-slate-800 font-extrabold text-sm">{billingSuccessData.patientName}</strong>
                    </div>

                    {billingSuccessData.doctorName && (
                      <div className="flex justify-between items-center py-2">
                        <span className="text-slate-500 font-medium">Bác sĩ khám:</span>
                        <strong className="text-blue-700 font-semibold">{billingSuccessData.doctorName}</strong>
                      </div>
                    )}

                    <div className="flex justify-between items-center py-2">
                      <span className="text-slate-500 font-medium">Phương thức:</span>
                      <strong className="text-emerald-800 font-semibold flex items-center gap-1.5">
                        {billingSuccessData.paymentMethod === 'BANK_TRANSFER' ? (
                          <>
                            <QrCode size={14} className="text-emerald-600" />
                            <span>Chuyển khoản VietQR (Napas 247)</span>
                          </>
                        ) : billingSuccessData.paymentMethod === 'CASH' ? (
                          <>
                            <Banknote size={14} className="text-amber-600" />
                            <span>Tiền mặt tại quầy</span>
                          </>
                        ) : billingSuccessData.paymentMethod === 'POS_CARD' ? (
                          <>
                            <CreditCard size={14} className="text-blue-600" />
                            <span>Quẹt thẻ máy POS</span>
                          </>
                        ) : (
                          <>
                            <Gift size={14} className="text-emerald-600" />
                            <span>Tài trợ miễn phí 100%</span>
                          </>
                        )}
                      </strong>
                    </div>

                    {billingSuccessData.promoCode && (
                      <div className="flex justify-between items-center py-2 bg-amber-50/70 -mx-5 px-5 border-y border-amber-200/50">
                        <span className="text-amber-800 font-medium flex items-center gap-1">
                          <Tag size={13} className="text-amber-600" /> Ưu đãi đã trừ:
                        </span>
                        <span className="font-mono font-bold text-amber-800">
                          [{billingSuccessData.promoCode}] {billingSuccessData.discountAmount ? `- ${billingSuccessData.discountAmount.toLocaleString('vi-VN')} đ` : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tổng tiền thực nộp</div>
                        {billingSuccessData.originalTotal && billingSuccessData.originalTotal !== billingSuccessData.amountPaid && (
                          <div className="text-[11px] text-slate-400 line-through">
                            {billingSuccessData.originalTotal.toLocaleString('vi-VN')} đ
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-black text-2xl text-emerald-600">
                          {billingSuccessData.amountPaid.toLocaleString('vi-VN')} đ
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 text-[10px] text-slate-400 font-mono">
                      <span>Mã GD: {billingSuccessData.transactionRef || ('TX-' + Date.now().toString().slice(-6))}</span>
                      <span>{billingSuccessData.paidAt}</span>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto pt-2">
                    <button
                      type="button"
                      onClick={() => window.print()}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-5 rounded-xl shadow-lg shadow-emerald-600/25 transition flex items-center justify-center gap-2 cursor-pointer text-xs"
                    >
                      <Printer size={16} /> In Biên Lai Hóa Đơn
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBillingAppointmentId(null);
                        setBillingData(null);
                        setBillingSuccessData(null);
                        setAppliedBillingPromo(null);
                        setBillingPromoCode('');
                        setBillingPromoError(null);
                      }}
                      className="px-6 py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl transition cursor-pointer text-xs"
                    >
                      Hoàn Tất & Đóng
                    </button>
                  </div>
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
                          <td className="py-3 px-4 text-right font-mono text-slate-500">{Number(billingData.consultationFee || 0).toLocaleString('vi-VN')} đ</td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-slate-800">{Number(billingData.consultationFee || 0).toLocaleString('vi-VN')} đ</td>
                        </tr>
                        {billingData.items?.map((item: any, i: number) => {
                          const unitPrice = Number(item.unitPrice) || 0;
                          const lineAmount = Number(item.amount ?? item.lineAmount ?? ((Number(item.quantity) || 0) * unitPrice)) || 0;
                          return (
                            <tr key={i}>
                              <td className="py-3 px-4 text-slate-600 pl-8">- {item.medicineName}</td>
                              <td className="py-3 px-4 text-center font-mono text-xs">{item.quantity} {item.unit}</td>
                              <td className="py-3 px-4 text-right font-mono text-xs text-slate-500">{unitPrice.toLocaleString('vi-VN')} đ</td>
                              <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">{lineAmount.toLocaleString('vi-VN')} đ</td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-emerald-50/50">
                        <tr>
                          <td colSpan={3} className="py-3 px-4 text-right font-bold text-slate-700 uppercase text-xs">Tổng viện phí gốc:</td>
                          <td className={`py-3 px-4 text-right font-mono text-base ${appliedBillingPromo ? 'line-through text-slate-400' : 'font-black text-emerald-700 text-xl'}`}>
                            {Number(billingData.totalAmount || 0).toLocaleString('vi-VN')} đ
                          </td>
                        </tr>

                        {appliedBillingPromo && (
                          <>
                            <tr className="bg-emerald-100/60 border-t border-emerald-200">
                              <td colSpan={3} className="py-2.5 px-4 text-right font-bold text-emerald-800 text-xs">
                                🎁 Giảm giá ưu đãi [{appliedBillingPromo.code} - {appliedBillingPromo.name}]:
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700 text-sm">
                                - {appliedBillingPromo.discountAmount.toLocaleString('vi-VN')} đ
                              </td>
                            </tr>
                            <tr className="bg-emerald-50 border-t border-emerald-300">
                              <td colSpan={3} className="py-3.5 px-4 text-right font-black text-emerald-900 uppercase text-sm">
                                Số tiền thực thanh toán:
                              </td>
                              <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-700 text-2xl tracking-tight">
                                {appliedBillingPromo.finalAmount.toLocaleString('vi-VN')} đ
                              </td>
                            </tr>
                          </>
                        )}
                      </tfoot>
                    </table>
                  </div>

                  {/* ========================================================= */}
                  {/* Khối Nhập Mã Khuyến Mãi / Voucher Viện Phí               */}
                  {/* ========================================================= */}
                  {billingData.status !== 'PAID' && (
                    <div className="bg-gradient-to-r from-amber-50/70 via-emerald-50/40 to-teal-50/60 p-4 rounded-2xl border border-amber-200/80 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shadow-xs">
                            <Gift size={18} />
                          </div>
                          <div>
                            <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wide">Mã Khuyến Mãi / Ưu Đãi Viện Phí</span>
                            <span className="text-[11px] text-slate-500 block">Áp dụng giảm trực tiếp trên tổng hóa đơn dịch vụ khám và thuốc</span>
                          </div>
                        </div>
                        {appliedBillingPromo && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Check size={12} /> Đã áp dụng
                          </span>
                        )}
                      </div>

                      {appliedBillingPromo ? (
                        <div className="bg-white p-3 rounded-xl border border-emerald-300 flex items-center justify-between shadow-xs animate-in fade-in">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-black">
                              <Percent size={18} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-black text-emerald-700 text-sm">{appliedBillingPromo.code}</span>
                                <span className="text-xs font-semibold text-slate-700">— {appliedBillingPromo.name}</span>
                              </div>
                              <div className="text-[11px] text-emerald-600 font-medium">
                                {appliedBillingPromo.isFree 
                                  ? 'Miễn 100% toàn bộ viện phí (0 VNĐ)' 
                                  : `Giảm ${appliedBillingPromo.discountAmount.toLocaleString('vi-VN')} đ • Còn lại: ${appliedBillingPromo.finalAmount.toLocaleString('vi-VN')} đ`}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveBillingPromo}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition cursor-pointer flex items-center gap-1"
                            title="Gỡ bỏ mã này"
                          >
                            <X size={13} /> Hủy mã
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                              <input
                                type="text"
                                value={billingPromoCode}
                                onChange={(e) => {
                                  setBillingPromoCode(e.target.value.toUpperCase());
                                  setBillingPromoError(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleApplyBillingPromo();
                                  }
                                }}
                                placeholder="Nhập mã ưu đãi (VD: CHAOBAN, MEDVIP, GIAOVIEN, DEMO2K...)"
                                className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition uppercase shadow-2xs"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleApplyBillingPromo()}
                              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5 shrink-0"
                            >
                              <Tag size={13} /> Áp Dụng
                            </button>
                          </div>

                          {billingPromoError && (
                            <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-1.5 animate-in fade-in">
                              <AlertCircle size={13} className="shrink-0 text-rose-600" />
                              <span>{billingPromoError}</span>
                            </div>
                          )}

                          {/* Danh sách mã nhanh */}
                          <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                            <span className="text-[11px] text-slate-500 font-medium">Gợi ý nhanh:</span>
                            {[
                              { code: 'CHAOBAN', label: 'CHAOBAN (-30k)' },
                              { code: 'MEDVIP', label: 'MEDVIP (-50%)' },
                              { code: 'DEMO2K', label: 'DEMO2K (Đồng giá 2k)' },
                              { code: 'GIAOVIEN', label: 'GIAOVIEN (Miễn 100%)' },
                            ].map((item) => (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => {
                                  setBillingPromoCode(item.code);
                                  handleApplyBillingPromo(item.code);
                                }}
                                className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg text-[10px] font-mono font-bold transition cursor-pointer shadow-2xs"
                              >
                                {item.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Payment Method & Action */}
                  {billingData.status === 'PAID' ? (
                    <div className="bg-emerald-50 border-2 border-emerald-400/80 rounded-2xl p-6 text-center space-y-4">
                      <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                        <CheckCircle2 size={40} className="text-emerald-600" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-xl font-black text-slate-800">ĐÃ THANH TOÁN VIỆN PHÍ THÀNH CÔNG</h3>
                        <p className="text-xs text-slate-500">
                          Hóa đơn <strong className="font-mono text-emerald-700">{billingData.invoiceId}</strong> đã được tất toán toàn bộ ({Number(billingData.totalAmount || 0).toLocaleString('vi-VN')} đ).
                        </p>
                      </div>
                      <div className="flex gap-3 justify-center pt-2">
                        <button 
                          type="button" 
                          onClick={() => window.print()} 
                          className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow-sm flex items-center gap-2 cursor-pointer transition"
                        >
                          <Printer size={16} /> In Biên Lai Hóa Đơn
                        </button>
                        <button 
                          type="button" 
                          onClick={() => { setBillingAppointmentId(null); setBillingData(null); }} 
                          className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer transition"
                        >
                          Đóng Cửa Sổ
                        </button>
                      </div>
                    </div>
                  ) : (() => {
                    const originalAmount = Math.round(Number(billingData.totalAmount) || 0);
                    const effectiveAmount = appliedBillingPromo ? appliedBillingPromo.finalAmount : originalAmount;
                    const isFreeAll = appliedBillingPromo ? appliedBillingPromo.isFree : false;

                    return (
                      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                        {/* Nếu hóa đơn được miễn phí 100% từ mã ưu đãi */}
                        {isFreeAll ? (
                          <div className="bg-emerald-50 border-2 border-emerald-400 rounded-2xl p-6 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                              <Gift size={36} className="text-emerald-600" />
                            </div>
                            <div className="space-y-1">
                              <h4 className="text-lg font-black text-slate-800 uppercase">HÓA ĐƠN ĐƯỢC TÀI TRỢ MIỄN PHÍ 100%</h4>
                              <p className="text-xs text-slate-600 max-w-md mx-auto">
                                Mã ưu đãi <strong className="font-mono text-emerald-700 font-bold">[{appliedBillingPromo?.code}]</strong> đã tài trợ 100% toàn bộ viện phí (0 VNĐ). Lễ tân có thể xác nhận tất toán ngay lập tức mà không cần thu tiền bệnh nhân.
                              </p>
                            </div>

                            <button
                              type="button"
                              disabled={billingActionLoading}
                              onClick={async () => {
                                setBillingActionLoading(true);
                                try {
                                  await api.payInvoice(billingData.invoiceId, {
                                    amountPaid: 0,
                                    paymentMethod: 'PROMO_FREE',
                                    note: `VOUCHER:${appliedBillingPromo?.code}`,
                                  });
                                  if (appliedBillingPromo) recordPromotionUsage(appliedBillingPromo.code);
                                  triggerBillingSuccess({
                                    amountPaid: 0,
                                    paymentMethod: 'PROMO_FREE',
                                    transactionRef: 'MIENPHI_' + (appliedBillingPromo?.code || '100%'),
                                  });
                                  const updated = await api.getBillDetail(billingAppointmentId);
                                  setBillingData(updated);
                                  loadTodayFeed();
                                } catch (e: any) {
                                  alert(e.message || 'Lỗi khi xác nhận hóa đơn');
                                } finally {
                                  setBillingActionLoading(false);
                                }
                              }}
                              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-600/25 transition text-base flex items-center justify-center gap-2 cursor-pointer"
                            >
                              {billingActionLoading ? <RefreshCw size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                              <span>XÁC NHẬN TẤT TOÁN MIỄN PHÍ 100% (0 ĐỒNG)</span>
                            </button>
                          </div>
                        ) : (
                          <>
                            <h4 className="font-bold text-slate-700 text-sm">Chọn phương thức thu viện phí</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition ${paymentMethod === 'BANK_TRANSFER' ? 'border-emerald-500 bg-emerald-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-emerald-300'}`}>
                                <input type="radio" name="method" value="BANK_TRANSFER" checked={paymentMethod === 'BANK_TRANSFER'} onChange={(e) => setPaymentMethod(e.target.value)} className="sr-only" />
                                <QrCode size={20} className={paymentMethod === 'BANK_TRANSFER' ? 'text-emerald-600 mb-1' : 'text-slate-400 mb-1'} />
                                <span className="font-bold text-xs text-slate-800">Chuyển khoản (VietQR)</span>
                                <span className="text-[10px] text-emerald-600 font-semibold">Tự động 24/7</span>
                              </label>
                              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition ${paymentMethod === 'CASH' ? 'border-amber-500 bg-amber-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-amber-300'}`}>
                                <input type="radio" name="method" value="CASH" checked={paymentMethod === 'CASH'} onChange={(e) => setPaymentMethod(e.target.value)} className="sr-only" />
                                <Banknote size={20} className={paymentMethod === 'CASH' ? 'text-amber-600 mb-1' : 'text-slate-400 mb-1'} />
                                <span className="font-bold text-xs text-slate-800">Tiền mặt</span>
                                <span className="text-[10px] text-amber-600 font-semibold">Thu tại quầy</span>
                              </label>
                              <label className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition ${paymentMethod === 'POS_CARD' ? 'border-blue-500 bg-blue-50/60 shadow-sm' : 'border-slate-200 bg-white hover:border-blue-300'}`}>
                                <input type="radio" name="method" value="POS_CARD" checked={paymentMethod === 'POS_CARD'} onChange={(e) => setPaymentMethod(e.target.value)} className="sr-only" />
                                <CreditCard size={20} className={paymentMethod === 'POS_CARD' ? 'text-blue-600 mb-1' : 'text-slate-400 mb-1'} />
                                <span className="font-bold text-xs text-slate-800">Quẹt thẻ POS</span>
                                <span className="text-[10px] text-blue-600 font-semibold">Máy cà thẻ</span>
                              </label>
                            </div>

                            {/* Phân nhánh theo phương thức thanh toán */}
                            {paymentMethod === 'BANK_TRANSFER' && (() => {
                              const cleanCode = (billingData.bookingCode || 'MED').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                              const accNo = billingPayOs?.accountNumber || '18112007';
                              const accName = billingPayOs?.accountName || 'CHAU TUAN KIET';
                              const bin = billingPayOs?.bin || 'KLB';
                              const transferContent = billingPayOs?.transferContent || `MEDPAY ${cleanCode}`;
                              const amount = billingPayOs?.amount || effectiveAmount;
                              const vietQrImgUrl = billingPayOs?.qrCode && billingPayOs.qrCode.startsWith('http')
                                ? billingPayOs.qrCode
                                : `https://img.vietqr.io/image/${bin}-${accNo}-compact2.png?amount=${amount}&addInfo=${encodeURIComponent(transferContent)}&accountName=${encodeURIComponent(accName)}`;

                              return (
                                <div className="space-y-3">
                                  {/* Pulse Status Banner */}
                                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 flex items-center justify-between text-xs">
                                    <div className="flex items-center gap-2 font-medium">
                                      <span className="relative flex h-2.5 w-2.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                      </span>
                                      <span>Tự động nhận diện tiền về qua Napas 247 / PayOS</span>
                                    </div>
                                    <button
                                      type="button"
                                      disabled={billingChecking}
                                      onClick={handleManualCheckBilling}
                                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-700 font-bold rounded-lg border border-emerald-300 transition flex items-center gap-1 cursor-pointer"
                                    >
                                      <RefreshCw size={12} className={billingChecking ? 'animate-spin' : ''} />
                                      <span>{billingChecking ? 'Đang check...' : 'Kiểm tra ngay'}</span>
                                    </button>
                                  </div>

                                  {billingError && (
                                    <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs flex items-center gap-2">
                                      <AlertCircle size={14} className="shrink-0 text-amber-600" />
                                      <span>{billingError}</span>
                                    </div>
                                  )}

                                  {/* QR Box */}
                                  <div className="bg-emerald-50/50 border-2 border-dashed border-emerald-400/60 rounded-2xl p-4 text-center space-y-3">
                                    <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                                      <ShieldCheck size={16} className="text-emerald-600" />
                                      <span>Mã VietQR Tự Động Định Danh (Napas 247)</span>
                                    </div>
                                    <img
                                      src={vietQrImgUrl}
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
                                        value={`2|99|${accNo}|${accName}|${amount}|${transferContent}`}
                                        size={180}
                                        className="mx-auto rounded-lg"
                                      />
                                    </div>

                                    {/* Bank detail card with copy buttons */}
                                    <div className="bg-white rounded-xl p-3 text-xs space-y-2 text-left border border-emerald-200 font-medium">
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Ngân hàng:</span>
                                        <strong className="text-slate-800">KienlongBank (KLB - 970452)</strong>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Số tài khoản:</span>
                                        <div className="flex items-center gap-1.5">
                                          <strong className="text-slate-800 font-mono font-bold">{accNo}</strong>
                                          <button
                                            type="button"
                                            onClick={() => handleCopyBilling(accNo, 'accNo')}
                                            className="p-1 text-slate-400 hover:text-emerald-600 rounded transition cursor-pointer"
                                            title="Sao chép STK"
                                          >
                                            {billingCopiedField === 'accNo' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                          </button>
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Tên thụ hưởng:</span>
                                        <strong className="text-slate-800 font-bold uppercase">{accName}</strong>
                                      </div>
                                      <div className="flex justify-between items-center">
                                        <span className="text-slate-500">Số tiền cần thanh toán:</span>
                                        <div className="flex items-center gap-2">
                                          {appliedBillingPromo && (
                                            <span className="text-xs text-slate-400 line-through">
                                              {originalAmount.toLocaleString('vi-VN')} đ
                                            </span>
                                          )}
                                          <strong className="text-emerald-700 font-mono font-black text-sm">{amount.toLocaleString('vi-VN')} đ</strong>
                                        </div>
                                      </div>
                                      <div className="flex justify-between items-center bg-emerald-50/70 p-2 rounded-lg border border-emerald-200/60">
                                        <span className="text-emerald-800 font-semibold">Nội dung CK:</span>
                                        <div className="flex items-center gap-1.5">
                                          <strong className="text-emerald-900 font-mono font-black tracking-wide">{transferContent}</strong>
                                          <button
                                            type="button"
                                            onClick={() => handleCopyBilling(transferContent, 'content')}
                                            className="p-1 text-emerald-600 hover:text-emerald-800 rounded transition cursor-pointer"
                                            title="Sao chép nội dung CK"
                                          >
                                            {billingCopiedField === 'content' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                    <span className="text-[10px] text-slate-400 block">
                                      * Khi người bệnh chuyển khoản thành công, hệ thống tự động cập nhật trong 1-3 giây mà không cần ấn nút.
                                    </span>
                                  </div>

                                  <button
                                    type="button"
                                    disabled={billingChecking}
                                    onClick={handleManualCheckBilling}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 transition text-sm flex items-center justify-center gap-2 cursor-pointer"
                                  >
                                    <RefreshCw size={18} className={billingChecking ? 'animate-spin' : ''} />
                                    <span>{billingChecking ? 'ĐANG ĐỒNG BỘ TRẠNG THÁI...' : 'KIỂM TRA BIẾN ĐỘNG SỐ DƯ NGAY'}</span>
                                  </button>

                                  <div className="text-center pt-1">
                                    <button
                                      type="button"
                                      disabled={billingActionLoading}
                                      onClick={async () => {
                                        if (!confirm(`Xác nhận người bệnh đã chuyển khoản thành công ${amount.toLocaleString('vi-VN')} đ nhưng muốn ghi nhận thủ công?`)) return;
                                        setBillingActionLoading(true);
                                        try {
                                          await api.payInvoice(billingData.invoiceId, {
                                            amountPaid: amount,
                                            paymentMethod: 'BANK_TRANSFER',
                                            note: appliedBillingPromo ? `VOUCHER:${appliedBillingPromo.code}` : undefined,
                                          });
                                          if (appliedBillingPromo) recordPromotionUsage(appliedBillingPromo.code);
                                          triggerBillingSuccess({
                                            amountPaid: amount,
                                            paymentMethod: 'BANK_TRANSFER',
                                            transactionRef: 'CK_MANUAL_' + Date.now().toString().slice(-6),
                                          });
                                          const updated = await api.getBillDetail(billingAppointmentId);
                                          setBillingData(updated);
                                          loadTodayFeed();
                                        } catch (e: any) {
                                          alert(e.message || 'Lỗi khi xác nhận hóa đơn');
                                        } finally {
                                          setBillingActionLoading(false);
                                        }
                                      }}
                                      className="text-xs text-slate-400 hover:text-slate-600 underline font-medium cursor-pointer transition"
                                    >
                                      Hoặc bấm vào đây nếu người bệnh đã chuyển khoản mà mạng ngân hàng chậm
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}

                            {paymentMethod === 'CASH' && (
                              <div className="space-y-4">
                                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-center space-y-2">
                                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                                    <Banknote size={22} />
                                  </div>
                                  <div className="font-bold text-slate-800 text-sm">Thu Tiền Mặt Trực Tiếp Tại Quầy</div>
                                  <p className="text-xs text-slate-500">
                                    Lễ tân đếm đủ tiền mặt từ người bệnh trước khi bấm nút xác nhận hoàn tất viện phí.
                                  </p>
                                  <div className="text-2xl font-black text-amber-700 font-mono pt-1">
                                    {effectiveAmount.toLocaleString('vi-VN')} đ
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={billingActionLoading}
                                  onClick={async () => {
                                    setBillingActionLoading(true);
                                    try {
                                      await api.payInvoice(billingData.invoiceId, {
                                        amountPaid: effectiveAmount,
                                        paymentMethod: 'CASH',
                                        note: appliedBillingPromo ? `VOUCHER:${appliedBillingPromo.code}` : undefined,
                                      });
                                      if (appliedBillingPromo) recordPromotionUsage(appliedBillingPromo.code);
                                      triggerBillingSuccess({
                                        amountPaid: effectiveAmount,
                                        paymentMethod: 'CASH',
                                        transactionRef: 'TIENMAT_' + Date.now().toString().slice(-6),
                                      });
                                      const updated = await api.getBillDetail(billingAppointmentId);
                                      setBillingData(updated);
                                      loadTodayFeed();
                                    } catch (e: any) {
                                      alert(e.message || 'Lỗi khi xác nhận hóa đơn');
                                    } finally {
                                      setBillingActionLoading(false);
                                    }
                                  }}
                                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-xl shadow-lg shadow-amber-500/25 transition text-base flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  {billingActionLoading ? (
                                    <RefreshCw size={20} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={20} />
                                  )}
                                  <span>XÁC NHẬN ĐÃ THU ĐỦ TIỀN MẶT ({effectiveAmount.toLocaleString('vi-VN')} đ)</span>
                                </button>
                              </div>
                            )}

                            {paymentMethod === 'POS_CARD' && (
                              <div className="space-y-4">
                                <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-4 text-center space-y-2">
                                  <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mx-auto">
                                    <CreditCard size={22} />
                                  </div>
                                  <div className="font-bold text-slate-800 text-sm">Quẹt Thẻ Ngân Hàng Qua Máy POS</div>
                                  <p className="text-xs text-slate-500">
                                    Hỗ trợ thẻ ATM NAPAS, Visa, Mastercard. Bấm xác nhận sau khi máy POS in hóa đơn cà thẻ thành công.
                                  </p>
                                  <div className="text-2xl font-black text-blue-700 font-mono pt-1">
                                    {effectiveAmount.toLocaleString('vi-VN')} đ
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={billingActionLoading}
                                  onClick={async () => {
                                    setBillingActionLoading(true);
                                    try {
                                      await api.payInvoice(billingData.invoiceId, {
                                        amountPaid: effectiveAmount,
                                        paymentMethod: 'POS_CARD',
                                        note: appliedBillingPromo ? `VOUCHER:${appliedBillingPromo.code}` : undefined,
                                      });
                                      if (appliedBillingPromo) recordPromotionUsage(appliedBillingPromo.code);
                                      triggerBillingSuccess({
                                        amountPaid: effectiveAmount,
                                        paymentMethod: 'POS_CARD',
                                        transactionRef: 'POS_' + Date.now().toString().slice(-6),
                                      });
                                      const updated = await api.getBillDetail(billingAppointmentId);
                                      setBillingData(updated);
                                      loadTodayFeed();
                                    } catch (e: any) {
                                      alert(e.message || 'Lỗi khi xác nhận hóa đơn');
                                    } finally {
                                      setBillingActionLoading(false);
                                    }
                                  }}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/25 transition text-base flex items-center justify-center gap-2 cursor-pointer"
                                >
                                  {billingActionLoading ? (
                                    <RefreshCw size={20} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={20} />
                                  )}
                                  <span>XÁC NHẬN ĐÃ QUẸT THẺ POS ({effectiveAmount.toLocaleString('vi-VN')} đ)</span>
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}
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


    </div>
  );
}
