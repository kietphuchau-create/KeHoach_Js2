'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { 
  Stethoscope, 
  Users, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  User, 
  FileText, 
  Activity, 
  AlertCircle,
  Building2,
  Phone,
  ShieldCheck,
  Volume2,
  AlertTriangle,
  Play,
  Timer,
  Pause,
  Zap,
  RefreshCw,
  Bell,
  ArrowRightLeft,
  UserCheck,
  X,
  UserX,
  Plus,
  FlaskConical,
  RotateCcw,
  Printer,
  Pill,
  Trash2,
  ClipboardList,
  Check,
  Calendar,
  CalendarDays,
  Lock,
  Unlock,
  PauseCircle,
  ShieldAlert,
  QrCode,
  Siren,
  HeartPulse
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, getAuthUser, getAuthToken } from '@/shared/lib/api';
import { formatDoctorFullName } from '@/shared/lib/formatters';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import LoginForm from '@/modules/auth/components/LoginForm';
import DoctorScheduleView from './DoctorScheduleView';

interface PatientQueueItem {
  id: string;
  queueNumber: string;
  bookingCode: string;
  patientName: string;
  gender: string;
  birthYear: number;
  phone: string;
  cccd: string;
  symptoms: string;
  aiSummary: string;
  status: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED' | 'UPCOMING' | 'DEFERRED' | 'TRANSFERRED' | 'MISSED_CALL' | 'WAITING_RESULTS';
  checkInTime: string;
  appointmentTime?: string;
}

export interface MedicineItem {
  medicineName: string;
  dosage: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

const PRESCRIPTION_PRESETS: Record<string, { label: string; diagnosis: string; advice: string; items: MedicineItem[] }> = {
  viem_hong: {
    label: 'Viêm Họng Cấp',
    diagnosis: 'Viêm họng cấp tính do thay đổi thời tiết, amidan sung huyết nhẹ',
    advice: 'Uống nhiều nước ấm, súc họng bằng nước muối sinh lý 3 lần/ngày sau ăn, giữ ấm cổ ngực, kiêng đồ uống đá lạnh.',
    items: [
      { medicineName: 'Augmentin 1g (Amoxicillin/Clavulanate)', dosage: 'Sáng 1 viên, Tối 1 viên (sau ăn no)', quantity: 14, unit: 'Viên', unitPrice: 15000 },
      { medicineName: 'Panadol Extra (Paracetamol 500mg)', dosage: '1 viên khi sốt trên 38.5°C hoặc đau rát họng (cách tối thiểu 6 giờ)', quantity: 10, unit: 'Viên', unitPrice: 3000 },
      { medicineName: 'Alpha Chymotrypsin 4.2mg', dosage: 'Ngậm dưới lưỡi 2 viên/lần x 3 lần/ngày', quantity: 20, unit: 'Viên', unitPrice: 4000 },
      { medicineName: 'Nước muối sinh lý NaCl 0.9% 500ml', dosage: 'Súc miệng, họng 3 lần mỗi ngày sau bữa ăn', quantity: 2, unit: 'Chai', unitPrice: 10000 },
    ]
  },
  cam_cum: {
    label: 'Cảm Cúm & Hạ Sốt',
    diagnosis: 'Nhiễm siêu vi đường hô hấp trên thể nhẹ (Cảm cúm thông thường)',
    advice: 'Nghỉ ngơi tại phòng thoáng khí, uống nhiều nước cam chanh ấm, ăn thức ăn lỏng dễ tiêu, theo dõi thân nhiệt hàng ngày.',
    items: [
      { medicineName: 'Efferalgan 500mg (Paracetamol sủi)', dosage: 'Hòa tan 1 viên vào 150ml nước khi sốt > 38.5°C (tối đa 4 viên/ngày)', quantity: 12, unit: 'Viên', unitPrice: 5000 },
      { medicineName: 'Telfast HD 180mg (Fexofenadine)', dosage: 'Uống 1 viên vào buổi tối trước khi đi ngủ', quantity: 7, unit: 'Viên', unitPrice: 12000 },
      { medicineName: 'Vitamin C 500mg (Dạng sủi tăng đề kháng)', dosage: 'Uống 1 viên vào buổi sáng sau ăn no', quantity: 10, unit: 'Viên', unitPrice: 6000 },
    ]
  },
  da_day: {
    label: 'Viêm Dạ Dày - Trào Ngược',
    diagnosis: 'Viêm trợt niêm mạc dạ dày tá tràng, trào ngược dạ dày thực quản (GERD)',
    advice: 'Ăn uống đúng giờ, không bỏ bữa, kiêng rượu bia, đồ chua cay, cà phê thuốc lá, không nằm ngay sau khi ăn no.',
    items: [
      { medicineName: 'Nexium Mups 40mg (Esomeprazole)', dosage: 'Uống 1 viên trước bữa ăn sáng 30 phút', quantity: 14, unit: 'Viên', unitPrice: 24000 },
      { medicineName: 'Gaviscon Dual Action (Hỗn dịch uống)', dosage: 'Uống 1 gói sau mỗi bữa ăn chính và trước khi ngủ', quantity: 20, unit: 'Gói', unitPrice: 11000 },
      { medicineName: 'Motilium-M 10mg (Domperidone)', dosage: 'Uống 1 viên trước ăn 15 phút x 3 lần/ngày', quantity: 21, unit: 'Viên', unitPrice: 4500 },
    ]
  },
  di_ung: {
    label: 'Dị Ứng / Mề Đay',
    diagnosis: 'Viêm da tiếp xúc dị ứng cấp tính, mề đay phát ban ngoài da',
    advice: 'Tránh tiếp xúc hóa chất tẩy rửa mạnh, không gãi trầy xước da, tắm nước ấm vừa phải, uống đủ 2 lít nước/ngày.',
    items: [
      { medicineName: 'Aerius 5mg (Desloratadine)', dosage: 'Uống 1 viên mỗi ngày vào buổi tối', quantity: 10, unit: 'Viên', unitPrice: 14000 },
      { medicineName: 'Kem Bôi Fucicort 15g', dosage: 'Thoa một lớp mỏng lên vùng da tổn thương 2 lần/ngày', quantity: 1, unit: 'Tuýp', unitPrice: 95000 },
      { medicineName: 'Medrol 16mg (Methylprednisolone)', dosage: 'Uống 1 viên buổi sáng sau ăn no trong 5 ngày', quantity: 5, unit: 'Viên', unitPrice: 7000 },
    ]
  },
  tang_huyet_ap: {
    label: 'Tăng Huyết Áp Nhẹ',
    diagnosis: 'Tăng huyết áp nguyên phát độ 1 (JNC 8) chưa có biến chứng tim mạch',
    advice: 'Ăn nhạt (giảm muối dưới 5g/ngày), tập thể dục nhẹ nhàng 30 phút/ngày, ghi sổ theo dõi huyết áp sáng - tối.',
    items: [
      { medicineName: 'Amlor 5mg (Amlodipine)', dosage: 'Uống 1 viên vào một giờ cố định mỗi sáng', quantity: 30, unit: 'Viên', unitPrice: 11000 },
      { medicineName: 'Micardis 40mg (Telmisartan)', dosage: 'Uống 1 viên buổi sáng sau ăn', quantity: 30, unit: 'Viên', unitPrice: 16000 },
    ]
  }
};

/** Thời gian tối đa cho 1 ca khám (giây) - mặc định 30 phút */
const MAX_CONSULTATION_SECONDS = 30 * 60;
/** Ngưỡng cảnh báo còn bao nhiêu giây thì đổi màu đỏ */
const WARNING_THRESHOLD_SECONDS = 5 * 60;

// ── Quản lý Mốc Thời Gian Khám Cố Định (Lưu anchor timestamp, không reset khi F5) ──
const getConsultationStartKey = (id: string) => `medsched_consult_start_${id}`;
const getConsultationDurationKey = (id: string) => `medsched_consult_duration_${id}`;

const initConsultationTimer = (patientId: string, durationSec = MAX_CONSULTATION_SECONDS, force = false) => {
  if (typeof window === 'undefined' || !patientId) return;
  const existingStart = localStorage.getItem(getConsultationStartKey(patientId));
  if (existingStart && !force) {
    // Đã có mốc bắt đầu trước đó, tuyệt đối không được ghi đè mốc thời gian!
    return;
  }
  const now = Date.now();
  localStorage.setItem(getConsultationStartKey(patientId), String(now));
  if (!localStorage.getItem(getConsultationDurationKey(patientId)) || force) {
    localStorage.setItem(getConsultationDurationKey(patientId), String(durationSec));
  }
};

const getConsultationRemainingSeconds = (patientId: string): number => {
  if (typeof window === 'undefined' || !patientId) return MAX_CONSULTATION_SECONDS;
  const storedStart = localStorage.getItem(getConsultationStartKey(patientId));
  const storedDuration = Number(localStorage.getItem(getConsultationDurationKey(patientId))) || MAX_CONSULTATION_SECONDS;
  if (!storedStart) {
    initConsultationTimer(patientId, storedDuration, false);
    return storedDuration;
  }
  const elapsed = Math.floor((Date.now() - Number(storedStart)) / 1000);
  return Math.max(0, storedDuration - elapsed);
};

const extendConsultationTimer = (patientId: string, extraMinutes: number): number => {
  if (typeof window === 'undefined' || !patientId) return MAX_CONSULTATION_SECONDS;
  const storedDuration = Number(localStorage.getItem(getConsultationDurationKey(patientId))) || MAX_CONSULTATION_SECONDS;
  const newDuration = storedDuration + extraMinutes * 60;
  localStorage.setItem(getConsultationDurationKey(patientId), String(newDuration));
  return getConsultationRemainingSeconds(patientId);
};

const clearConsultationTimer = (patientId: string) => {
  if (typeof window === 'undefined' || !patientId) return;
  localStorage.removeItem(getConsultationStartKey(patientId));
  localStorage.removeItem(getConsultationDurationKey(patientId));
};

const formatCheckInDisplay = (timeStr?: string) => {
  if (!timeStr) return '';
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    const hours = String(d.getHours()).padStart(2, '0');
    const mins = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  } catch {
    return timeStr;
  }
};

// ── Tự Động Lưu Nháp Đơn Thuốc & Bệnh Án (Chống Mất Dữ Liệu Khi Treo Máy) ──
const getDraftKey = (patientId: string) => `medsched_draft_presc_${patientId}`;
const saveDraft = (patientId: string, notes: string, advice: string, items: MedicineItem[]) => {
  if (typeof window === 'undefined' || !patientId) return;
  const draft = { notes, advice, items, updatedAt: Date.now() };
  localStorage.setItem(getDraftKey(patientId), JSON.stringify(draft));
};
const loadDraft = (patientId: string): { notes?: string; advice?: string; items?: MedicineItem[]; updatedAt: number } | null => {
  if (typeof window === 'undefined' || !patientId) return null;
  const raw = localStorage.getItem(getDraftKey(patientId));
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
const clearDraft = (patientId: string) => {
  if (typeof window === 'undefined' || !patientId) return;
  localStorage.removeItem(getDraftKey(patientId));
};

// ── Quản Lý Mốc Thời Gian Tạm Hoãn (Deferred Ageing Tracker) ──
const getDeferredTimeKey = (id: string) => `medsched_deferred_time_${id}`;
const getDeferredElapsedMinutes = (id: string): number | null => {
  if (typeof window === 'undefined' || !id) return null;
  const stored = localStorage.getItem(getDeferredTimeKey(id));
  if (!stored) return null;
  const elapsedMs = Date.now() - Number(stored);
  return Math.max(0, Math.floor(elapsedMs / 60000));
};

export default function DoctorClinicView() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [mainTab, setMainTab] = useState<'CLINIC' | 'SCHEDULE'>('CLINIC');
  const [clinicActive, setClinicActive] = useState(true);
  const [activePatientIndex, setActivePatientIndex] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

  // ── Khóa Buồng Khám Bảo Mật Khi Rảnh (Idle Screen Lock) ──
  const [isScreenLocked, setIsScreenLocked] = useState(false);
  const lastActivityRef = useRef<number>(Date.now());
  const [idleMinutes, setIdleMinutes] = useState(0);

  // ── Trạng Thái Lưu Nháp Tự Động (Auto-Save Draft) ──
  const [draftSavedText, setDraftSavedText] = useState<string | null>(null);

  // ── Cảnh Báo Quá Giờ Ca Khám (Overtime Modal) ──
  const [showOvertimeModal, setShowOvertimeModal] = useState(false);
  const [dismissedOvertimeForPatient, setDismissedOvertimeForPatient] = useState<string | null>(null);



  // ── Cơ chế Auto-Timeout ────────────────────────────────────
  const [timeRemaining, setTimeRemaining] = useState(MAX_CONSULTATION_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Trạng Thái Bác Sĩ & Phòng Khám (Bình thường / Cấp cứu / Tới trễ) ──
  const [doctorStatus, setDoctorStatus] = useState<'NORMAL' | 'EMERGENCY' | 'LATE'>('NORMAL');
  const [lateMinutes, setLateMinutes] = useState(20);
  const [showLateModal, setShowLateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);

  /** Lưu thời gian còn lại khi bấm cấp cứu để resume lại sau */
  const savedTimeRef = useRef(0);

  // ── Khóa Độc Quyền 1 Tab Duy Nhất (Single Tab Enforcement) ──
  const [isBlockedByAnotherTab, setIsBlockedByAnotherTab] = useState(false);
  const [channelInstance, setChannelInstance] = useState<BroadcastChannel | null>(null);
  const myTabIdRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const tabId = 'tab_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();
    myTabIdRef.current = tabId;

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('medsched_doctor_clinic_lock');
      setChannelInstance(channel);

      channel.postMessage({
        type: 'TAB_OPENED',
        tabId: myTabIdRef.current,
      });

      channel.onmessage = (event) => {
        const data = event.data;
        if (!data) return;

        if (data.type === 'TAB_OPENED' && data.tabId !== myTabIdRef.current) {
          channel?.postMessage({
            type: 'I_AM_ACTIVE',
            activeTabId: myTabIdRef.current,
          });
        }

        if (data.type === 'I_AM_ACTIVE' && data.activeTabId !== myTabIdRef.current) {
          setIsBlockedByAnotherTab(true);
        }

        if (data.type === 'TAKE_OVER') {
          if (data.targetTabId === myTabIdRef.current) {
            setIsBlockedByAnotherTab(false);
          } else {
            setIsBlockedByAnotherTab(true);
          }
        }
      };
    } catch (e) {
      console.warn('BroadcastChannel not supported', e);
    }

    return () => {
      if (channel) {
        channel.close();
      }
    };
  }, []);

  const handleTakeOverSession = () => {
    if (channelInstance && myTabIdRef.current) {
      channelInstance.postMessage({
        type: 'TAKE_OVER',
        targetTabId: myTabIdRef.current,
      });
      setIsBlockedByAnotherTab(false);
      setNotification('✅ Đã chuyển quyền điều khiển buồng khám sang tab này.');
    }
  };

  // Queue state initialized empty (real data from reception / appointments)
  const [queue, setQueue] = useState<PatientQueueItem[]>([]);
  const [loadingQueue, setLoadingQueue] = useState(false);

  const [clinicalNotes, setClinicalNotes] = useState('');
  const [doctorAdvice, setDoctorAdvice] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<MedicineItem[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [submittingPrescription, setSubmittingPrescription] = useState(false);
  const [showPrescriptionPrintModal, setShowPrescriptionPrintModal] = useState(false);
  const [lastSavedPrescription, setLastSavedPrescription] = useState<any>(null);

  // Quick manual add medicine row states
  const [newMedName, setNewMedName] = useState('');
  const [newMedUnit, setNewMedUnit] = useState('Viên');
  const [newMedQty, setNewMedQty] = useState<number | string>(10);
  const [newMedDosage, setNewMedDosage] = useState('');
  const [newMedPrice, setNewMedPrice] = useState<number | string>(5000);

  // Áp dụng đơn thuốc mẫu
  const handleApplyPreset = (key: string) => {
    const preset = PRESCRIPTION_PRESETS[key];
    if (!preset) return;
    setSelectedPreset(key);
    setClinicalNotes(preset.diagnosis);
    setDoctorAdvice(preset.advice);
    setPrescriptionItems([...preset.items]);
    setNotification(`⚡ Đã nạp đơn thuốc mẫu: ${preset.label} (${preset.items.length} loại thuốc). Bác sĩ có thể chỉnh sửa thêm bớt tùy ý.`);
  };

  // Thêm thuốc thủ công
  const handleAddManualMedicine = () => {
    if (!newMedName.trim()) {
      setNotification('⚠️ Vui lòng nhập tên thuốc cần kê đơn.');
      return;
    }
    const qty = Number(newMedQty) || 1;
    const price = Number(newMedPrice) || 0;
    const newItem: MedicineItem = {
      medicineName: newMedName.trim(),
      unit: newMedUnit.trim() || 'Viên',
      quantity: qty,
      dosage: newMedDosage.trim() || 'Theo chỉ định của bác sĩ',
      unitPrice: price,
    };
    setPrescriptionItems((prev) => [...prev, newItem]);
    setNewMedName('');
    setNewMedDosage('');
    setNotification(`💊 Đã thêm thuốc "${newItem.medicineName}" vào đơn.`);
  };

  // Xóa thuốc khỏi đơn
  const handleRemoveMedicine = (idx: number) => {
    setPrescriptionItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // Tính tổng tiền thuốc
  const totalMedicineCost = prescriptionItems.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0),
    0
  );

  // Tự động nhận diện gợi ý thuốc theo triệu chứng AI
  const detectAiPreset = (patient: PatientQueueItem | undefined): string => {
    if (!patient) return 'viem_hong';
    const text = `${patient.symptoms || ''} ${patient.aiSummary || ''}`.toLowerCase();
    if (text.includes('dị ứng') || text.includes('mẩn đỏ') || text.includes('ngứa') || text.includes('mề đay') || text.includes('phát ban')) {
      return 'di_ung';
    }
    if (text.includes('dạ dày') || text.includes('trào ngược') || text.includes('ợ chua') || text.includes('thượng vị') || text.includes('gerd')) {
      return 'da_day';
    }
    if (text.includes('họng') || text.includes('amidan') || text.includes('ho') || text.includes('rát họng')) {
      return 'viem_hong';
    }
    if (text.includes('sốt') || text.includes('cúm') || text.includes('cảm') || text.includes('chảy mũi')) {
      return 'cam_cum';
    }
    if (text.includes('huyết áp') || text.includes('tim mạch') || text.includes('chóng mặt')) {
      return 'tang_huyet_ap';
    }
    return 'viem_hong';
  };

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      setLoadingQueue(true);
      const data = await api.getDoctorQueue();
      if (Array.isArray(data) && data.length > 0) {
        // Kiểm tra ca khám đang hoạt động đã lưu trong localStorage (để bảo toàn qua F5)
        const storedActiveId = typeof window !== 'undefined' ? localStorage.getItem('medsched_active_patient_id') : null;
        
        let inConsultIdx = -1;
        if (storedActiveId) {
          inConsultIdx = data.findIndex(p => p.id === storedActiveId && p.status !== 'COMPLETED');
        }
        if (inConsultIdx === -1) {
          inConsultIdx = data.findIndex(p => p.status === 'IN_CONSULTATION');
        }

        if (inConsultIdx !== -1) {
          setActivePatientIndex(inConsultIdx);
          const activeP = data[inConsultIdx];
          if (activeP?.id) {
            localStorage.setItem('medsched_active_patient_id', activeP.id);
            const remaining = getConsultationRemainingSeconds(activeP.id);
            setTimeRemaining(remaining);
          }
        } else {
          const waitingIdx = data.findIndex(p => p.status === 'WAITING');
          if (waitingIdx !== -1) {
            setActivePatientIndex(waitingIdx);
          } else {
            setActivePatientIndex(0);
          }
        }

        // BẢO VỆ TUYỆT ĐỐI (GUARDRAIL):
        // 1 Bác sĩ chỉ khám DUY NHẤT 1 ca tại 1 thời điểm.
        // Chỉ duy nhất ca inConsultIdx được giữ IN_CONSULTATION,
        // các ca khác dở dang từ trước bắt buộc chuẩn hóa về 'WAITING' (hoặc 'DEFERRED').
        const normalizedData = data.map((p, idx) => {
          const deferredStored = typeof window !== 'undefined' ? localStorage.getItem(getDeferredTimeKey(p.id)) : null;
          let isDeferredLocally = false;
          if (deferredStored) {
            const elapsedMs = Date.now() - Number(deferredStored);
            // Tự động giải phóng nếu đã tạm hoãn quá 4 tiếng tránh treo vĩnh viễn
            if (elapsedMs > 4 * 60 * 60 * 1000) {
              localStorage.removeItem(getDeferredTimeKey(p.id));
            } else {
              isDeferredLocally = true;
            }
          }
          if ((isDeferredLocally || p.status === 'DEFERRED') && p.status !== 'COMPLETED' && p.status !== 'MISSED_CALL') {
            return { ...p, status: 'DEFERRED' as const };
          }
          if (p.status === 'IN_CONSULTATION') {
            if (idx === inConsultIdx) {
              return { ...p, status: 'IN_CONSULTATION' as const };
            } else {
              return { ...p, status: 'WAITING' as const };
            }
          }
          return p;
        });

        setQueue(normalizedData as PatientQueueItem[]);
      }
    } catch (err: any) {
      console.warn('Could not fetch doctor queue from backend:', err?.message);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  const todayVietnameseDate = useMemo(() => {
    const dateStr = new Date().toLocaleDateString('vi-VN', {
      weekday: 'long',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    // Viết hoa chữ cái đầu (ví dụ "Thứ sáu" -> "Thứ Sáu")
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  }, []);

  useEffect(() => {
    const checkAuth = () => {
      const token = getAuthToken();
      const user = getAuthUser();
      const roles: string[] = user?.roles || [];
      if (!token || !user || (!roles.includes('ROLE_DOCTOR') && !roles.includes('ROLE_ADMIN'))) {
        setIsAuthenticated(false);
        setAuthChecked(true);
        return;
      }
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
            setCurrentUser({ ...enrichedUser });
          }
        }
      }).catch(() => {});

      setCurrentUser(enrichedUser);
      setIsAuthenticated(true);
      setAuthChecked(true);
    };

    checkAuth();
    window.addEventListener('auth-change', checkAuth);
    window.addEventListener('storage', checkAuth);
    return () => {
      window.removeEventListener('auth-change', checkAuth);
      window.removeEventListener('storage', checkAuth);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    loadQueue();

    // 1. Tự động đồng bộ hàng đợi mỗi 8 giây (nếu không đang lưu đơn thuốc)
    const queueInterval = setInterval(() => {
      if (!submittingPrescription) {
        loadQueue();
      }
    }, 8000);

    // 2. Lắng nghe BroadcastChannel từ Quầy tiếp đón (khi có bệnh nhân check-in / cấp số mới)
    let syncChannel: BroadcastChannel | null = null;
    try {
      syncChannel = new BroadcastChannel('medsched_queue_sync');
      syncChannel.onmessage = (event) => {
        if (event.data?.type === 'QUEUE_UPDATED') {
          loadQueue();
        }
      };
    } catch {}

    return () => {
      clearInterval(queueInterval);
      syncChannel?.close();
    };
  }, [isAuthenticated, loadQueue, submittingPrescription]);

  const currentPatient = queue[activePatientIndex] || queue[0];

  // ── Khóa Buồng Khám An Toàn Khi Bác Sĩ Vắng Mặt (Idle Screen Lock) ──
  useEffect(() => {
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
    };
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('touchstart', handleActivity);
    window.addEventListener('scroll', handleActivity);

    const interval = setInterval(() => {
      const idleMs = Date.now() - lastActivityRef.current;
      const mins = Math.floor(idleMs / 60000);
      setIdleMinutes(mins);
      // Tự động khóa buồng khám sau 15 phút không có thao tác bàn phím/chuột
      if (idleMs >= 15 * 60 * 1000 && !isScreenLocked) {
        setIsScreenLocked(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      clearInterval(interval);
    };
  }, [isScreenLocked]);

  // ── Khôi phục bản nháp đơn thuốc đã lưu khi chuyển bệnh nhân ──
  useEffect(() => {
    if (!currentPatient?.id || currentPatient.status !== 'IN_CONSULTATION') {
      setDraftSavedText(null);
      return;
    }
    const draft = loadDraft(currentPatient.id);
    if (draft) {
      if (draft.notes && !clinicalNotes) setClinicalNotes(draft.notes);
      if (draft.advice && !doctorAdvice) setDoctorAdvice(draft.advice);
      if (Array.isArray(draft.items) && draft.items.length > 0 && prescriptionItems.length === 0) {
        setPrescriptionItems(draft.items);
      }
      const timeStr = new Date(draft.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setDraftSavedText(timeStr);
    }
  }, [currentPatient?.id]);

  // ── Tự động lưu nháp (Auto-Save Draft) khi bác sĩ gõ chẩn đoán hoặc thêm thuốc ──
  useEffect(() => {
    if (!currentPatient?.id || currentPatient.status !== 'IN_CONSULTATION') return;
    if (!clinicalNotes.trim() && !doctorAdvice.trim() && prescriptionItems.length === 0) return;

    const timer = setTimeout(() => {
      saveDraft(currentPatient.id, clinicalNotes, doctorAdvice, prescriptionItems);
      const timeStr = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setDraftSavedText(timeStr);
    }, 800);

    return () => clearTimeout(timer);
  }, [clinicalNotes, doctorAdvice, prescriptionItems, currentPatient?.id, currentPatient?.status]);

  // ── Cảnh báo quá giờ tự động khi đồng hồ về 00:00 ──
  useEffect(() => {
    if (timeRemaining <= 0 && currentPatient?.status === 'IN_CONSULTATION' && clinicActive && doctorStatus === 'NORMAL') {
      if (currentPatient.id && dismissedOvertimeForPatient !== currentPatient.id) {
        // Tự động mở cảnh báo quá giờ nếu bác sĩ để treo màn hình
        setShowOvertimeModal(true);
      }
    } else {
      setShowOvertimeModal(false);
    }
  }, [timeRemaining, currentPatient?.id, currentPatient?.status, clinicActive, doctorStatus, dismissedOvertimeForPatient]);

  // ── Hàm chuyển ca tiếp theo (dùng chung cho cả thủ công & auto) ──
  const handleCallNext = useCallback(() => {
    setQueue((prev) => {
      let nextIdx = prev.findIndex((p, idx) => idx > activePatientIndex && (p.status === 'WAITING' || p.status === 'DEFERRED'));
      if (nextIdx === -1) {
        nextIdx = prev.findIndex((p, idx) => idx !== activePatientIndex && (p.status === 'WAITING' || p.status === 'DEFERRED'));
      }
      if (nextIdx === -1) {
        setNotification('Hiện tại đã hết bệnh nhân đang xếp hàng trong ca trực!');
        return prev;
      }

      // Xóa timer của bệnh nhân ca trước
      const oldPatient = prev[activePatientIndex];
      if (oldPatient?.id) {
        clearConsultationTimer(oldPatient.id);
      }

      // Khởi tạo mốc đếm ngược cố định cho bệnh nhân mới ngay tại thời điểm bấm "Gọi ca tiếp theo"
      const nextPatient = prev[nextIdx];
      if (nextPatient?.id) {
        localStorage.setItem('medsched_active_patient_id', nextPatient.id);
        initConsultationTimer(nextPatient.id, MAX_CONSULTATION_SECONDS, true);
        api.callDoctorPatient(nextPatient.id)
          .then(() => {
            try {
              const syncChannel = new BroadcastChannel('medsched_queue_sync');
              syncChannel.postMessage({ type: 'QUEUE_UPDATED' });
              syncChannel.close();
            } catch {}
          })
          .catch((e) => console.warn('Không thể gọi cập nhật backend:', e));
      }

      const updated = prev.map((p, idx) => {
        if (idx === activePatientIndex && p.status === 'IN_CONSULTATION') return { ...p, status: 'COMPLETED' as const };
        if (idx === nextIdx) return { ...p, status: 'IN_CONSULTATION' as const };
        return p;
      });
      setActivePatientIndex(nextIdx);
      setClinicalNotes('');
      setTimeRemaining(MAX_CONSULTATION_SECONDS);
      setNotification(`Đã gọi bệnh nhân STT #${prev[nextIdx].queueNumber} - ${prev[nextIdx].patientName} vào phòng khám.`);
      return updated;
    });
  }, [activePatientIndex]);

  // ── Xử lý Yêu cầu Hoàn tất ca khám (Hiện modal xác nhận để chống bấm nhầm) ──
  const handleRequestComplete = () => {
    if (currentPatient && currentPatient.status === 'IN_CONSULTATION') {
      // ── [TC_FM_MED_03] Guardrail: Cảnh báo quyết định lâm sàng (Overdose) ──
      const hasOverdose = prescriptionItems.some(item => {
        const qty = Number(item.quantity) || 0;
        const nameLower = item.medicineName.toLowerCase();
        // Giả lập rule: Paracetamol > 30 viên (hoặc các thuốc nguy hiểm) là bất thường cho 1 đơn
        if ((nameLower.includes('paracetamol') || nameLower.includes('panadol') || nameLower.includes('efferalgan')) && qty > 30) {
          return true;
        }
        // Rule chung chặn kê 1 loại quá 100 viên (trừ khi cố ý)
        if (qty >= 100) return true;
        return false;
      });

      if (hasOverdose) {
        setNotification('🚨 [CDS] CẢNH BÁO ĐỎ: Hệ thống phát hiện liều lượng thuốc vược ngưỡng an toàn (có thể gây ngộ độc/tử vong). Vui lòng kiểm tra lại đơn thuốc!');
        // Chặn đứng hành động lưu đơn
        return;
      }

      setShowCompleteModal(true);
    } else {
      handleCallNext();
    }
  };

  // ── CLAB-107: Thực thi Hoàn tất ca khám & Kê đơn thuốc vào Database MySQL ──
  const handleExecuteComplete = async () => {
    if (!currentPatient) return;
    if (!clinicalNotes.trim()) {
      setNotification('⚠️ Vui lòng nhập chẩn đoán bệnh án trước khi hoàn tất ca khám.');
      setShowCompleteModal(false);
      return;
    }

    try {
      setSubmittingPrescription(true);
      const payload = {
        diagnosis: clinicalNotes.trim(),
        doctorAdvice: doctorAdvice.trim() || 'Uống thuốc đúng liều lượng chỉ định, tái khám khi có bất thường.',
        items: prescriptionItems.map((item) => ({
          medicineName: item.medicineName,
          dosage: item.dosage,
          quantity: Number(item.quantity) || 1,
          unit: item.unit || 'Viên',
          unitPrice: Number(item.unitPrice) || 0,
        })),
      };

      const res = await api.createDoctorPrescription(currentPatient.id, payload);

      setLastSavedPrescription({
        patient: currentPatient,
        prescription: res,
        diagnosis: clinicalNotes.trim(),
        doctorAdvice: payload.doctorAdvice,
        items: [...prescriptionItems],
        totalAmount: totalMedicineCost,
        createdAt: new Date().toISOString()
      });

      setShowCompleteModal(false);
      setShowPrescriptionPrintModal(true);

      // Cập nhật queue sang COMPLETED
      setQueue((prev) =>
        prev.map((p, idx) =>
          idx === activePatientIndex ? { ...p, status: 'COMPLETED' as const } : p
        )
      );

      if (currentPatient?.id) {
        clearConsultationTimer(currentPatient.id);
        clearDraft(currentPatient.id);
        localStorage.removeItem('medsched_active_patient_id');
        setDraftSavedText(null);
      }

      try {
        const syncChannel = new BroadcastChannel('medsched_queue_sync');
        syncChannel.postMessage({ type: 'QUEUE_UPDATED' });
        syncChannel.close();
      } catch {}

      setNotification(`✅ HOÀN TẤT THÀNH CÔNG: Đã lưu đơn thuốc & hồ sơ bệnh án cho bệnh nhân #${currentPatient.queueNumber} - ${currentPatient.patientName} vào CSDL MySQL.`);

      // Reset form
      setClinicalNotes('');
      setDoctorAdvice('');
      setPrescriptionItems([]);
      setSelectedPreset('');
    } catch (err: any) {
      console.error('Lỗi khi lưu đơn thuốc:', err);
      setNotification(`❌ Lỗi lưu đơn thuốc: ${err?.message || 'Không thể kết nối máy chủ'}`);
    } finally {
      setSubmittingPrescription(false);
    }
  };

  // ── Khôi phục / Mở lại ca khám đã hoàn tất (Undo nếu bấm nhầm) ──
  const handleReopenConsultation = (targetIndex: number) => {
    if (currentPatient?.status === 'IN_CONSULTATION' && (clinicalNotes.trim() || prescriptionItems.length > 0)) {
      const confirmReopen = window.confirm(
        `⚠️ CẢNH BÁO MẤT DỮ LIỆU:\nBuồng khám đang có ca bệnh #${currentPatient.queueNumber} - ${currentPatient.patientName} chưa lưu đơn thuốc.\n\nNếu mở lại ca bệnh khác, dữ liệu chưa lưu sẽ bị mất. Bạn có chắc chắn muốn mở lại ca này không?`
      );
      if (!confirmReopen) return;
    }
    const targetPatient = queue[targetIndex];
    setQueue((prev) =>
      prev.map((p, idx) => {
        if (idx === targetIndex) return { ...p, status: 'IN_CONSULTATION' as const };
        if (p.status === 'IN_CONSULTATION') return { ...p, status: 'WAITING' as const };
        return p;
      })
    );
    setActivePatientIndex(targetIndex);
    setClinicalNotes('');
    setDoctorAdvice('');
    setPrescriptionItems([]);
    setSelectedPreset('');
    if (targetPatient?.id) {
      const curRemaining = getConsultationRemainingSeconds(targetPatient.id);
      setTimeRemaining(curRemaining);
    } else {
      setTimeRemaining(MAX_CONSULTATION_SECONDS);
    }
    setNotification(
      `🔄 ĐÃ MỞ LẠI CA KHÁM: Bệnh nhân #${targetPatient?.queueNumber} - ${targetPatient?.patientName} đã được đưa lại vào buồng khám.`
    );
  };

  // ── 1. Gia Hạn Ca Khám (+10 / +15 phút) ──
  const handleExtendConsultation = (minutes: number = 15) => {
    if (currentPatient?.id) {
      const newRemaining = extendConsultationTimer(currentPatient.id, minutes);
      setTimeRemaining(newRemaining);
    } else {
      setTimeRemaining((prev) => prev + minutes * 60);
    }
    setNotification(`⏱️ ĐÃ GIA HẠN: Thêm +${minutes} phút cho ca bệnh phức tạp. Mốc đếm ngược đã được cộng thêm và lưu chuẩn.`);
  };

  // ── 2. Chỉ Định Cận Lâm Sàng / Chờ Kết Quả Xét Nghiệm (Giải phóng buồng khám) ──
  const handleSendForTests = () => {
    const currentName = queue[activePatientIndex]?.patientName;
    const oldPatient = queue[activePatientIndex];
    if (oldPatient?.id) {
      clearConsultationTimer(oldPatient.id);
      api.sendDoctorPatientToLab(oldPatient.id).catch((e) => console.warn('Không thể gửi trạng thái lab:', e));
      try {
        const syncChannel = new BroadcastChannel('medsched_queue_sync');
        syncChannel.postMessage({ type: 'QUEUE_UPDATED' });
        syncChannel.close();
      } catch {}
    }
    setQueue((prev) => {
      const updated = prev.map((p, idx) => {
        if (idx === activePatientIndex) {
          return { ...p, status: 'WAITING_RESULTS' as const };
        }
        return p;
      });
      // Tự động tìm ca chờ tiếp theo
      let nextIdx = updated.findIndex((p, idx) => idx > activePatientIndex && (p.status === 'WAITING' || p.status === 'DEFERRED'));
      if (nextIdx === -1) {
        nextIdx = updated.findIndex((p, idx) => idx !== activePatientIndex && (p.status === 'WAITING' || p.status === 'DEFERRED'));
      }
      if (nextIdx !== -1) {
        updated[nextIdx] = { ...updated[nextIdx], status: 'IN_CONSULTATION' };
        setActivePatientIndex(nextIdx);
        if (updated[nextIdx]?.id) {
          initConsultationTimer(updated[nextIdx].id, MAX_CONSULTATION_SECONDS);
          api.callDoctorPatient(updated[nextIdx].id).catch(() => {});
        }
        setTimeRemaining(MAX_CONSULTATION_SECONDS);
        setNotification(`🧪 CHỈ ĐỊNH XÉT NGHIỆM: Bệnh nhân ${currentName} đi làm cận lâm sàng. Đã gọi ca tiếp theo: #${updated[nextIdx].queueNumber} - ${updated[nextIdx].patientName}.`);
      } else {
        setNotification(`🧪 CHỈ ĐỊNH XÉT NGHIỆM: Bệnh nhân ${currentName} đi làm cận lâm sàng. Hiện buồng khám đang trống.`);
      }
      return updated;
    });
    setClinicalNotes('');
  };

  // ── 3. Bỏ Qua Lượt (Bệnh nhân vắng mặt khi gọi loa / No-show) ──
  const handleSkipAbsent = () => {
    const skippedPatient = queue[activePatientIndex];
    if (skippedPatient?.id) {
      clearConsultationTimer(skippedPatient.id);
      api.missDoctorPatient(skippedPatient.id).catch((e) => console.warn('Không thể ghi nhận vắng mặt:', e));
      try {
        const syncChannel = new BroadcastChannel('medsched_queue_sync');
        syncChannel.postMessage({ type: 'QUEUE_UPDATED' });
        syncChannel.close();
      } catch {}
    }
    setQueue((prev) => {
      const updated = prev.map((p, idx) => {
        if (idx === activePatientIndex) {
          return { ...p, status: 'MISSED_CALL' as const };
        }
        return p;
      });
      // Tự động tìm ca chờ tiếp theo
      let nextIdx = updated.findIndex((p, idx) => idx > activePatientIndex && (p.status === 'WAITING' || p.status === 'DEFERRED'));
      if (nextIdx === -1) {
        nextIdx = updated.findIndex((p, idx) => idx !== activePatientIndex && (p.status === 'WAITING' || p.status === 'DEFERRED'));
      }
      if (nextIdx !== -1) {
        updated[nextIdx] = { ...updated[nextIdx], status: 'IN_CONSULTATION' };
        setActivePatientIndex(nextIdx);
        if (updated[nextIdx]?.id) {
          initConsultationTimer(updated[nextIdx].id, MAX_CONSULTATION_SECONDS);
          api.callDoctorPatient(updated[nextIdx].id).catch(() => {});
        }
        setTimeRemaining(MAX_CONSULTATION_SECONDS);
        setNotification(`⏩ BỎ QUA LƯỢT: Bệnh nhân #${skippedPatient?.queueNumber} - ${skippedPatient?.patientName} vắng mặt. Đã gọi ca tiếp theo: #${updated[nextIdx].queueNumber} - ${updated[nextIdx].patientName}.`);
      } else {
        setNotification(`⏩ BỎ QUA LƯỢT: Bệnh nhân #${skippedPatient?.queueNumber} - ${skippedPatient?.patientName} vắng mặt khi gọi.`);
      }
      return updated;
    });
    setClinicalNotes('');
  };

  // ── 4. Khôi Phục / Tiếp Nhận Lại (Ca vắng mặt quay lại hoặc Đã có KQ xét nghiệm) ──
  const handleRecallPatient = (targetIndex: number) => {
    const oldPatient = queue[activePatientIndex];
    if (oldPatient?.id && oldPatient.status === 'IN_CONSULTATION') {
      clearConsultationTimer(oldPatient.id);
    }
    const targetP = queue[targetIndex];
    if (targetP?.id) {
      localStorage.removeItem(getDeferredTimeKey(targetP.id));
      localStorage.setItem('medsched_active_patient_id', targetP.id);
      initConsultationTimer(targetP.id, MAX_CONSULTATION_SECONDS, false);
      api.callDoctorPatient(targetP.id).catch((e) => console.warn('Không thể cập nhật IN_PROGRESS:', e));
    }
    setQueue((prev) => {
      return prev.map((p, idx) => {
        if (idx === activePatientIndex && p.status === 'IN_CONSULTATION') {
          return { ...p, status: 'DEFERRED' as const };
        }
        if (idx === targetIndex) {
          return { ...p, status: 'IN_CONSULTATION' as const };
        }
        return p;
      });
    });
    setActivePatientIndex(targetIndex);
    const rem = targetP?.id ? getConsultationRemainingSeconds(targetP.id) : MAX_CONSULTATION_SECONDS;
    setTimeRemaining(rem);
    setClinicalNotes('');
    setNotification(`🔄 TIẾP NHẬN LẠI: Đã chuyển bệnh nhân #${queue[targetIndex].queueNumber} - ${queue[targetIndex].patientName} vào buồng khám.`);
  };

  // ── 5. Tạm Hoãn Ca Khám Hiện Tại (Doctor Defer - giải phóng buồng khám khi có việc đột xuất / chờ người nhà) ──
  const handleDeferCurrentConsultation = () => {
    const curP = queue[activePatientIndex];
    if (!curP) return;
    if (curP.id) {
      clearConsultationTimer(curP.id);
      localStorage.setItem(getDeferredTimeKey(curP.id), String(Date.now()));
      localStorage.removeItem('medsched_active_patient_id');
      api.deferDoctorPatient(curP.id).catch((e) => console.warn('Không thể cập nhật DEFERRED backend:', e));
    }
    setQueue((prev) => {
      const updated = prev.map((p, idx) => {
        if (idx === activePatientIndex) {
          return { ...p, status: 'DEFERRED' as const };
        }
        return p;
      });
      // Tìm ca ĐANG CHỜ (WAITING) tiếp theo (tuyệt đối không tự động chọn ca DEFERRED)
      let nextIdx = updated.findIndex((p, idx) => idx > activePatientIndex && p.status === 'WAITING');
      if (nextIdx === -1) {
        nextIdx = updated.findIndex((p) => p.status === 'WAITING');
      }
      if (nextIdx !== -1) {
        setActivePatientIndex(nextIdx);
        setNotification(`⏸️ ĐÃ TẠM HOÃN CA #${curP.queueNumber} (${curP.patientName}). Buồng khám sẵn sàng mời ca tiếp theo: #${updated[nextIdx].queueNumber} - ${updated[nextIdx].patientName}.`);
      } else {
        setNotification(`⏸️ ĐÃ TẠM HOÃN CA #${curP.queueNumber} (${curP.patientName}). Buồng khám hiện đang sẵn sàng tiếp nhận ca mới.`);
      }
      return updated;
    });
    setClinicalNotes('');
    setDoctorAdvice('');
    setPrescriptionItems([]);
    setShowOvertimeModal(false);
  };

  // ── 6. Đóng ca dứt điểm khi bệnh nhân tạm hoãn tự ý bỏ về (Walk-out / No-show) ──
  const handleClosePatientLeft = (targetIndex: number) => {
    const targetP = queue[targetIndex];
    if (!targetP) return;
    const confirmClose = window.confirm(
      `Xác nhận đóng ca cho bệnh nhân #${targetP.queueNumber} - ${targetP.patientName}?\n(Lý do: Bệnh nhân tự ý bỏ về sau khi tạm hoãn, giải phóng ca khám dứt điểm)`
    );
    if (!confirmClose) return;

    if (targetP.id) {
      clearConsultationTimer(targetP.id);
      clearDraft(targetP.id);
      localStorage.removeItem(getDeferredTimeKey(targetP.id));
    }

    setQueue((prev) =>
      prev.map((p, idx) =>
        idx === targetIndex ? { ...p, status: 'MISSED_CALL' as const } : p
      )
    );
    setNotification(
      `📁 ĐÃ ĐÓNG CA: Bệnh nhân #${targetP.queueNumber} - ${targetP.patientName} được ghi nhận tự ý bỏ về (MISSED). Ca khám đã được đóng dứt điểm, không còn treo trên hàng đợi.`
    );
  };


  // ── Timer đếm ngược cho ca hiện tại (Lấy mốc từ lúc gọi ca, không reset khi F5) ──
  useEffect(() => {
    if (!clinicActive || doctorStatus !== 'NORMAL') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const activePatient = queue.find(p => p.status === 'IN_CONSULTATION');
    if (!activePatient?.id) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    // Đồng bộ tức thời theo mốc thời gian đã lưu
    const syncTime = () => {
      const rem = getConsultationRemainingSeconds(activePatient.id);
      setTimeRemaining(rem);
      return rem;
    };

    syncTime();

    timerRef.current = setInterval(() => {
      syncTime();
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [clinicActive, doctorStatus, queue]);

  // ── Xử lý Cấp Cứu (Kích hoạt được cả khi phòng đang TẮT hoặc BẬT) ──
  const handleEmergencyToggle = () => {
    if (doctorStatus !== 'EMERGENCY') {
      // BẬT chế độ cấp cứu
      savedTimeRef.current = timeRemaining;
      setDoctorStatus('EMERGENCY');
      setQueue((prev) =>
        prev.map((p, idx) => {
          if (idx === activePatientIndex && p.status === 'IN_CONSULTATION') {
            return { ...p, status: 'DEFERRED' as const };
          }
          return p;
        })
      );
      setNotification(
        '🚨 BÁO ĐỘNG CẤP CỨU: Bác sĩ được điều động xử lý ca cấp cứu đột xuất. Hàng đợi tạm hoãn, màn hình sảnh chờ đã cập nhật thông báo.'
      );
    } else {
      // TẮT chế độ cấp cứu: Trở lại bình thường
      setDoctorStatus('NORMAL');
      setClinicActive(true);
      setQueue((prev) =>
        prev.map((p, idx) => {
          if (idx === activePatientIndex && p.status === 'DEFERRED') {
            return { ...p, status: 'IN_CONSULTATION' as const };
          }
          return p;
        })
      );
      const restoredPatient = queue[activePatientIndex];
      const remainingSec = savedTimeRef.current > 0 ? savedTimeRef.current : MAX_CONSULTATION_SECONDS;
      if (restoredPatient?.id) {
        initConsultationTimer(restoredPatient.id, remainingSec);
      }
      setTimeRemaining(remainingSec);
      setNotification('✅ Đã kết thúc ca cấp cứu. Bác sĩ tiếp tục ca khám bình thường.');
    }
  };

  // ── Xử lý Báo Tới Trễ / Vắng Tạm Thời ──
  const handleConfirmLate = (minutes: number) => {
    setLateMinutes(minutes);
    setDoctorStatus('LATE');
    setShowLateModal(false);
    setNotification(
      `⏳ ĐÃ BÁO TRỄ: Màn hình sảnh chờ thông báo "Bác sĩ có mặt muộn khoảng ${minutes} phút do hội chẩn khẩn cấp. Quý bệnh nhân vui lòng ngồi chờ."`
    );
  };

  const handleDoctorArrived = () => {
    setDoctorStatus('NORMAL');
    setClinicActive(true);
    setNotification('✅ Bác sĩ đã có mặt tại buồng khám. Phòng khám chính thức mở tiếp nhận bệnh nhân.');
  };


  const handleSelectPatient = (index: number) => {
    if (index === activePatientIndex) return;
    if (currentPatient?.status === 'IN_CONSULTATION' && (clinicalNotes.trim() || prescriptionItems.length > 0)) {
      const confirmSwitch = window.confirm(
        `⚠️ CẢNH BÁO MẤT DỮ LIỆU:\nBạn đang có chẩn đoán hoặc đơn thuốc chưa lưu cho bệnh nhân #${currentPatient.queueNumber} - ${currentPatient.patientName}.\n\nNếu chuyển sang bệnh nhân khác, dữ liệu chưa lưu sẽ bị mất. Bạn có chắc chắn muốn chuyển không?`
      );
      if (!confirmSwitch) return;
    }
    setActivePatientIndex(index);
    setClinicalNotes('');
    setDoctorAdvice('');
    setPrescriptionItems([]);
    setSelectedPreset('');
  };

  const handleAdmitPatient = async (appointmentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.admitDoctorPatient(appointmentId);
      setNotification('✅ Đã tiếp nhận bệnh nhân vào hàng đợi khám thành công.');
      await loadQueue();
    } catch (err: any) {
      setNotification('❌ Không thể tiếp nhận ca khám: ' + (err?.message || 'Lỗi kết nối'));
    }
  };

  const [queueTab, setQueueTab] = useState<'ALL' | 'WAITING' | 'UPCOMING' | 'COMPLETED'>('ALL');

  const upcomingCount = queue.filter((p) => p.status === 'UPCOMING').length;
  const waitingCount = queue.filter(
    (p) => p.status === 'WAITING' || p.status === 'DEFERRED' || p.status === 'WAITING_RESULTS' || p.status === 'MISSED_CALL'
  ).length;
  const deferredCount = queue.filter((p) => p.status === 'DEFERRED').length;
  const completedCount = queue.filter((p) => p.status === 'COMPLETED').length;

  const filteredQueueWithIndex = queue
    .map((p, idx) => ({ ...p, originalIndex: idx }))
    .filter((p) => {
      if (queueTab === 'WAITING') {
        return p.status === 'WAITING' || p.status === 'DEFERRED' || p.status === 'IN_CONSULTATION' || p.status === 'WAITING_RESULTS' || p.status === 'MISSED_CALL';
      }
      if (queueTab === 'UPCOMING') return p.status === 'UPCOMING';
      if (queueTab === 'COMPLETED') return p.status === 'COMPLETED';
      return true;
    });

  // Helper format thời gian (an toàn không âm)
  const formatTime = (seconds: number) => {
    const safeSec = Math.max(0, seconds);
    const m = Math.floor(safeSec / 60);
    const s = safeSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const currentTotalDuration = (currentPatient?.id && typeof window !== 'undefined'
    ? Number(localStorage.getItem(getConsultationDurationKey(currentPatient.id)))
    : 0) || MAX_CONSULTATION_SECONDS;
  const isWarning = timeRemaining <= WARNING_THRESHOLD_SECONDS;
  const progressPercent = Math.min(100, Math.max(0, ((currentTotalDuration - timeRemaining) / currentTotalDuration) * 100));

  if (!authChecked) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center text-xs text-slate-500">Đang kiểm tra quyền truy cập buồng khám...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-4 sm:py-8 animate-in fade-in duration-200">
        <div className="mb-3 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 mb-2 shadow-xs">
            🔒 Yêu Cầu Đăng Nhập Bác Sĩ
          </span>
          <h1 className="text-xl font-extrabold text-pine-teal">Bàn Khám Bác Sĩ Chuyên Khoa</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Vui lòng đăng nhập tài khoản Bác sĩ để mở buồng khám và quản lý hàng đợi bệnh nhân.
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
      {/* ── Sub Navigation: Buồng Khám vs Lịch Trực (Sprint 2 Main Features) ── */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200 w-fit shadow-2xs">
        <button
          type="button"
          onClick={() => setMainTab('CLINIC')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            mainTab === 'CLINIC'
              ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Stethoscope size={15} />
          <span>Buồng Khám Lâm Sàng</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab('SCHEDULE')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
            mainTab === 'SCHEDULE'
              ? 'bg-white text-teal-900 shadow-xs border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarDays size={15} />
          <span>Quản Lý Lịch Trực &amp; Khung Giờ (CRUD)</span>
        </button>
      </div>

      {mainTab === 'SCHEDULE' ? (
        <DoctorScheduleView />
      ) : (
        <>
          {/* ── Top Clinic Banner (Tái Cấu Trúc Gọn Gàng & Đẳng Cấp) ── */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        {/* Tầng 1: Thông Tin Bàn Khám & Thống Kê Ca Khám */}
        <div className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-teal-700 text-xs font-bold uppercase tracking-wider">
              <Stethoscope size={15} />
              <span>Phân Hệ Buồng Khám Chuyên Khoa</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              {`Bàn Khám: ${formatDoctorFullName(currentUser?.academicTitle || 'BS.CKII', currentUser?.fullName || 'Nguyễn Minh Anh')}`}
            </h1>
            <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap font-medium">
              <span>{currentUser?.rolesWithCenter?.[0]?.medicalCenterName || 'Hệ Thống MedSched'}</span>
              <span>•</span>
              <span className="text-teal-700 font-semibold">Buồng Khám Bác Sĩ</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1.5 text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md font-mono text-[11px]">
                <Calendar size={12} className="text-teal-600" />
                <span>{todayVietnameseDate}</span>
              </span>
            </div>
          </div>

          {/* Cụm Thống Kê Gọn & Nút Trạng Thái Mở Khám */}
          <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
            {/* Bộ đếm thống kê ca khám */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-2 px-3 flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <span className="text-slate-500">Sẽ đến:</span>
                <span className="font-bold text-blue-700">{upcomingCount} ca</span>
              </div>
              <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                <span className="text-slate-500">Đang chờ:</span>
                <span className="font-bold text-amber-700">{waitingCount} ca</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-slate-500">Đã xong:</span>
                <span className="font-bold text-emerald-700">{completedCount} ca</span>
              </div>
            </div>

            {/* Công tắc Mở/Dừng Phòng Khám */}
            <button
              type="button"
              onClick={() => setClinicActive(!clinicActive)}
              className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-2 border shadow-xs ${
                clinicActive && doctorStatus === 'NORMAL'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                  : 'bg-red-50 text-red-800 border-red-300 hover:bg-red-100'
              }`}
              title="Mở hoặc tạm dừng tiếp nhận lượt khám mới"
            >
              <span className={`w-2.5 h-2.5 rounded-full ${clinicActive && doctorStatus === 'NORMAL' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span>{clinicActive && doctorStatus === 'NORMAL' ? 'Đang Mở Khám' : 'Tạm Dừng Khám'}</span>
            </button>
          </div>
        </div>

        {/* Tầng 2: Thanh Công Cụ Điều Hành Buồng Khám (Action Toolbar) */}
        <div className="border-t border-slate-100 bg-slate-50/70 px-5 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Nhóm thao tác vận hành an toàn */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsScreenLocked(true)}
              className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs"
              title="Khóa bảo vệ màn hình buồng khám khi bác sĩ tạm rời vị trí"
            >
              <Lock size={13} className="text-teal-700" />
              <span>Khóa Màn Hình</span>
            </button>


          </div>

          {/* Nhóm xử lý tình huống đặc biệt (Exceptions) */}
          <div className="flex items-center gap-2">
            {doctorStatus === 'LATE' ? (
              <button
                type="button"
                onClick={handleDoctorArrived}
                className="px-3 py-1.5 rounded-lg font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <CheckCircle2 size={13} />
                <span>Bác Sĩ Đã Có Mặt</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowLateModal(true)}
                disabled={doctorStatus === 'EMERGENCY'}
                className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-white text-amber-800 hover:bg-amber-50 border border-amber-200 transition cursor-pointer flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                title="Báo tới trễ do hội chẩn hoặc kẹt việc đột xuất"
              >
                <Clock size={13} className="text-amber-600" />
                <span>Báo Tới Trễ</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleEmergencyToggle}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-2xs ${
                doctorStatus === 'EMERGENCY'
                  ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse'
                  : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
              }`}
              title="Kích hoạt chế độ đi cấp cứu đột xuất"
            >
              {doctorStatus === 'EMERGENCY' ? (
                <>
                  <Play size={13} />
                  <span>Kết Thúc Cấp Cứu</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={13} className="text-red-600" />
                  <span>Báo Ca Cấp Cứu</span>
                </>
              )}
            </button>

            {/* ── [TC_FM_MED_02] Nút CODE RED - Báo động đỏ toàn viện ── */}
            <button
              type="button"
              onClick={() => {
                const confirmRed = window.confirm("CẢNH BÁO: Phát CODE RED (Báo động đỏ) sẽ gửi tín hiệu cấp cứu khẩn cấp đến TOÀN BỘ ĐỘI PHẢN ỨNG NHANH. Bạn có chắc chắn?");
                if (confirmRed) {
                  const syncChannel = new BroadcastChannel('medsched_queue_sync');
                  syncChannel.postMessage({ type: 'CODE_RED', source: `PHÒNG KHÁM BÁC SĨ ${currentUser?.fullName}`, timestamp: new Date().toISOString() });
                  alert(`ĐÃ PHÁT BÁO ĐỘNG ĐỎ! Yêu cầu đội cấp cứu hỗ trợ phòng khám.`);
                }
              }}
              className="px-3 py-1.5 rounded-lg font-bold text-xs bg-red-600 text-white hover:bg-red-700 transition cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(220,38,38,0.5)] animate-pulse"
              title="Phát lệnh Code Red trong trường hợp sốc phản vệ / ngưng tim"
            >
              <Siren size={14} />
              <span>CODE RED</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Cảnh Báo Trạng Thái Khẩn Cấp (Emergency / Late / Transferred Banners) ── */}
      {doctorStatus === 'EMERGENCY' && (
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-5 flex items-start gap-4 animate-pulse shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <AlertTriangle size={24} />
          </div>
          <div className="flex-1">
            <div className="font-black text-red-800 text-base">🚨 BÁC SĨ ĐANG THỰC HIỆN CA CẤP CỨU / MỔ ĐỘT XUẤT</div>
            <p className="text-red-700 text-xs mt-1 leading-relaxed">
              Hàng đợi tại buồng khám đã <strong>tạm dừng</strong>. Ca khám hiện tại được chuyển sang trạng thái <strong>TẠM HOÃN (DEFERRED)</strong>. 
              Màn hình sảnh chờ đã tự động hiển thị thông báo kính mong quý bệnh nhân thông cảm chờ đợi hoặc liên hệ quầy tiếp đón để được hỗ trợ.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleEmergencyToggle}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <Play size={14} />
                <span>Bác Sĩ Đã Hoàn Tất Cấp Cứu &amp; Tiếp Tục Ca Khám</span>
              </button>

            </div>
          </div>
        </div>
      )}

      {doctorStatus === 'LATE' && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4.5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-amber-900 text-sm">
              ⏳ THÔNG BÁO TỚI TRỄ: Dự kiến trễ khoảng {lateMinutes} phút do hội chẩn khẩn cấp
            </div>
            <p className="text-amber-700 text-xs mt-0.5">
              Hệ thống đã tự động gửi tin thông báo đến điện thoại và màn hình sảnh chờ để bệnh nhân không lo lắng bị trôi lịch hẹn.
            </p>
            <div className="mt-2.5">
              <button
                onClick={handleDoctorArrived}
                className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={14} />
                <span>Bác Sĩ Đã Có Mặt — Bắt Đầu Tiếp Nhận Khám</span>
              </button>
            </div>
          </div>
        </div>
      )}


      {notification && (
        <AlertMessage type="info" message={notification} onClose={() => setNotification(null)} />
      )}

      {/* ── Thanh Timer Đếm Ngược Ca Khám Hiện Tại ── */}
      {currentPatient?.status === 'IN_CONSULTATION' && doctorStatus === 'NORMAL' && (
        <div className={`rounded-2xl p-4 border-2 transition-colors ${
          timeRemaining <= 0
            ? 'bg-red-50 border-red-400'
            : isWarning
            ? 'bg-amber-50 border-amber-300'
            : 'bg-teal-50 border-teal-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Timer size={16} className={timeRemaining <= 0 ? 'text-red-600 animate-bounce' : isWarning ? 'text-amber-600' : 'text-teal-700'} />
              <span className={`text-xs font-bold uppercase ${timeRemaining <= 0 ? 'text-red-700' : isWarning ? 'text-amber-800' : 'text-teal-800'}`}>
                Thời Gian Khám Ca Hiện Tại (Mốc Chuẩn Từ Lúc Bấm Gọi Ca)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleExtendConsultation(10)}
                className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/80 hover:bg-white text-teal-800 border border-teal-300 transition cursor-pointer"
                title="Gia hạn thêm 10 phút"
              >
                +10 Phút
              </button>
              <button
                type="button"
                onClick={() => handleExtendConsultation(15)}
                className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/80 hover:bg-white text-teal-800 border border-teal-300 transition cursor-pointer"
                title="Gia hạn thêm 15 phút"
              >
                +15 Phút
              </button>
              <button
                type="button"
                onClick={handleDeferCurrentConsultation}
                className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 transition cursor-pointer flex items-center gap-1"
                title="Tạm hoãn ca này để giải phóng buồng khám"
              >
                <PauseCircle size={12} />
                <span>Tạm Hoãn</span>
              </button>
              <div className={`text-lg font-black font-mono ${timeRemaining <= 0 ? 'text-red-700 animate-pulse' : isWarning ? 'text-amber-700' : 'text-teal-800'}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-white/70 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                timeRemaining <= 0 ? 'bg-red-600' : isWarning ? 'bg-amber-500' : 'bg-teal-600'
              }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] mt-1.5">
            <p className={timeRemaining <= 0 ? 'text-red-600 font-bold' : isWarning ? 'text-amber-700 font-semibold' : 'text-teal-700'}>
              {timeRemaining <= 0
                ? '⚠️ Ca khám đã hết thời gian tiêu chuẩn. Bác sĩ vui lòng hoàn tất ca, bấm (+10 / +15 Phút) để gia hạn, hoặc bấm [Tạm Hoãn] để giải phóng buồng khám.'
                : isWarning
                ? `⚠️ Còn ${formatTime(timeRemaining)} — Sắp hết thời gian ca khám tiêu chuẩn.`
                : 'Mốc thời gian được cố định chuẩn xác từ lúc bấm "Gọi ca tiếp theo" (không bị làm mới khi F5 lại trang).'
              }
            </p>

          </div>
        </div>
      )}

      {/* Main 2-Column Clinical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Waiting Queue (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Users size={18} className="text-teal-700" />
                  <span>Hàng Đợi Khám Hôm Nay</span>
                </h3>
                <p className="text-[11px] text-teal-700 font-semibold flex items-center gap-1.5 mt-0.5">
                  <Calendar size={12} className="text-teal-600" />
                  <span>{`${todayVietnameseDate} • Buồng Khám Trực Tiếp`}</span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={loadQueue}
                  disabled={loadingQueue}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-teal-700 hover:bg-teal-50 transition cursor-pointer"
                  title="Tải lại hàng đợi"
                >
                  <RefreshCw size={14} className={loadingQueue ? 'animate-spin text-teal-700' : ''} />
                </button>
                <span className="text-xs font-mono font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md">
                  Tổng: {queue.length} ca
                </span>
              </div>
            </div>

            {/* Quick Call Next Button */}
            {currentPatient?.status === 'IN_CONSULTATION' ? (
              <button
                type="button"
                onClick={handleRequestComplete}
                className="w-full mb-4 font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20"
                title="Bác sĩ cần hoàn tất hoặc tạm hoãn ca hiện tại trước khi gọi ca tiếp theo"
              >
                <CheckCircle2 size={16} />
                <span>ĐANG KHÁM #{currentPatient.queueNumber} — HOÀN TẤT ĐỂ GỌI CA KẾ TIẾP</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCallNext}
                disabled={doctorStatus === 'EMERGENCY' || queue.length === 0}
                className={`w-full mb-4 font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm ${
                  doctorStatus === 'EMERGENCY' || queue.length === 0
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white shadow-teal-700/20'
                }`}
              >
                <Volume2 size={18} />
                <span>GỌI BỆNH NHÂN TIẾP THEO (CALL NEXT)</span>
              </button>
            )}

            {/* Queue Category Filter Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-xl mb-3 text-xs">
              <button
                type="button"
                onClick={() => setQueueTab('ALL')}
                className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                  queueTab === 'ALL'
                    ? 'bg-white text-slate-800 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Tất cả ({queue.length})
              </button>
              <button
                type="button"
                onClick={() => setQueueTab('WAITING')}
                className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                  queueTab === 'WAITING'
                    ? 'bg-white text-amber-800 shadow-xs'
                    : 'text-slate-500 hover:text-amber-700'
                }`}
              >
                Đang chờ ({waitingCount})
              </button>
              <button
                type="button"
                onClick={() => setQueueTab('UPCOMING')}
                className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                  queueTab === 'UPCOMING'
                    ? 'bg-white text-blue-800 shadow-xs'
                    : 'text-slate-500 hover:text-blue-700'
                }`}
              >
                Sẽ đến ({upcomingCount})
              </button>
              <button
                type="button"
                onClick={() => setQueueTab('COMPLETED')}
                className={`py-1.5 px-2 rounded-lg font-bold transition cursor-pointer text-center ${
                  queueTab === 'COMPLETED'
                    ? 'bg-white text-emerald-800 shadow-xs'
                    : 'text-slate-500 hover:text-emerald-700'
                }`}
              >
                Đã xong ({completedCount})
              </button>
            </div>

            {/* Banner Nhắc Nhở Ca Tạm Hoãn Chưa Giải Quyết */}
            {(queueTab === 'ALL' || queueTab === 'WAITING') && deferredCount > 0 && (
              <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 shadow-xs">
                <AlertCircle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-bold">Hiện có {deferredCount} ca tạm hoãn ({queue.filter(p => p.status === 'DEFERRED').map(p => `#${p.queueNumber}`).join(', ')}).</span>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Bác sĩ vui lòng bấm <strong>&ldquo;Tiếp nhận lại&rdquo;</strong> khi người bệnh quay lại buồng khám, hoặc bấm <strong>&ldquo;Đóng ca (Đã về)&rdquo;</strong> nếu bệnh nhân tự ý bỏ về để giải phóng ca trực.
                  </p>
                </div>
              </div>
            )}

            {/* Queue List */}
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredQueueWithIndex.length === 0 ? (
                <div className="py-14 px-4 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
                  <Users size={36} className="mx-auto mb-2 text-slate-300" />
                  <p className="text-sm font-semibold text-slate-600">
                    {queueTab === 'UPCOMING'
                      ? 'Không có lịch hẹn đặt trước sắp tới'
                      : queueTab === 'WAITING'
                      ? 'Không có bệnh nhân nào đang chờ ngoài cửa'
                      : queueTab === 'COMPLETED'
                      ? 'Chưa có ca nào hoàn tất hôm nay'
                      : 'Chưa có bệnh nhân trong hàng đợi'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    {queueTab === 'UPCOMING'
                      ? 'Bệnh nhân đã đặt lịch trực tuyến hôm nay sẽ hiển thị tại đây khi tới ngày/giờ hẹn.'
                      : 'Các ca check-in từ quầy tiếp đón hoặc hệ thống đặt khám sẽ tự động hiển thị tại đây khi có bệnh nhân.'}
                  </p>
                </div>
              ) : (
                filteredQueueWithIndex.map((patient) => {
                  const isActive = patient.originalIndex === activePatientIndex;
                  return (
                    <div
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient.originalIndex)}
                      className={`p-3.5 rounded-xl border-2 transition cursor-pointer flex items-center justify-between ${
                        isActive
                          ? 'border-teal-600 bg-teal-50/60 shadow-xs'
                          : patient.status === 'UPCOMING'
                          ? 'border-blue-200 bg-blue-50/30 hover:border-blue-300'
                          : patient.status === 'COMPLETED'
                          ? 'border-slate-100 bg-slate-50 opacity-70 hover:opacity-100'
                          : patient.status === 'DEFERRED'
                          ? 'border-amber-300 bg-amber-50/50 hover:border-amber-400'
                          : patient.status === 'TRANSFERRED'
                          ? 'border-indigo-200 bg-indigo-50/40 opacity-60'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`px-2.5 h-9 min-w-[58px] rounded-xl font-black flex items-center justify-center text-xs tracking-tight whitespace-nowrap shrink-0 shadow-xs ${
                          isActive
                            ? 'bg-teal-700 text-white'
                            : patient.status === 'UPCOMING'
                            ? 'bg-blue-100 text-blue-800'
                            : patient.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : patient.status === 'DEFERRED'
                            ? 'bg-amber-200 text-amber-900'
                            : patient.status === 'TRANSFERRED'
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {patient.queueNumber}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                            <span>{patient.patientName}</span>
                            {patient.status === 'UPCOMING' && (
                              <span className="text-[10px] font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                                Lịch hẹn
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {patient.gender} • {new Date().getFullYear() - patient.birthYear} tuổi • Mã: {patient.bookingCode}
                          </div>
                          {patient.appointmentTime && (
                            <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1 mt-0.5">
                              <Clock size={11} /> Giờ khám: {patient.appointmentTime}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex flex-col items-end gap-1">
                        {patient.status === 'UPCOMING' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            CHỜ ĐẾN (ONLINE)
                          </span>
                        )}
                        {patient.status === 'IN_CONSULTATION' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                            ĐANG KHÁM
                          </span>
                        )}
                        {patient.status === 'WAITING' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            ĐANG CHỜ
                          </span>
                        )}
                        {patient.status === 'COMPLETED' && (
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                              ĐÃ KHÁM
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReopenConsultation(patient.originalIndex);
                              }}
                              className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition shadow-xs cursor-pointer flex items-center gap-0.5"
                              title="Bấm để mở lại ca khám này nếu bấm nhầm"
                            >
                              <RotateCcw size={10} /> Mở lại
                            </button>
                          </div>
                        )}
                        {patient.status === 'DEFERRED' && (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                              <Pause size={10} /> TẠM HOÃN
                              {getDeferredElapsedMinutes(patient.id) !== null && (
                                <span className="font-mono font-semibold">({getDeferredElapsedMinutes(patient.id)}p)</span>
                              )}
                            </span>
                            <div className="flex items-center gap-1 mt-0.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRecallPatient(patient.originalIndex);
                                }}
                                className="px-2 py-0.5 text-[10px] font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-md transition shadow-xs cursor-pointer flex items-center gap-0.5"
                                title="Bệnh nhân đã quay lại, tiếp nhận vào buồng khám ngay"
                              >
                                Tiếp nhận lại
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleClosePatientLeft(patient.originalIndex);
                                }}
                                className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 border border-slate-200 rounded-md transition cursor-pointer"
                                title="Bệnh nhân tự ý bỏ về, đóng ca khám dứt điểm"
                              >
                                Đóng ca (Đã về)
                              </button>
                            </div>
                          </div>
                        )}
                        {patient.status === 'TRANSFERRED' && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                            ĐÃ CHUYỂN
                          </span>
                        )}
                        {patient.status === 'WAITING_RESULTS' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecallPatient(patient.originalIndex);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-800 bg-purple-100 hover:bg-purple-200 px-2 py-0.5 rounded-full border border-purple-300 transition cursor-pointer"
                            title="Bệnh nhân đã có kết quả xét nghiệm, bấm để tiếp nhận vào khám ngay"
                          >
                            <FlaskConical size={10} /> ĐÃ CÓ KQ (KHÁM LẠI)
                          </button>
                        )}
                        {patient.status === 'MISSED_CALL' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRecallPatient(patient.originalIndex);
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-full border border-slate-300 transition cursor-pointer"
                            title="Bệnh nhân đã có mặt trở lại, bấm để tiếp nhận vào khám"
                          >
                            <UserX size={10} /> VẮNG MẶT (GỌI LẠI)
                          </button>
                        )}
                        {patient.checkInTime ? (
                          <span className="block text-[10px] text-slate-500 font-mono mt-0.5" title={patient.checkInTime}>
                            {formatCheckInDisplay(patient.checkInTime)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Active Patient Consultation Console (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {!currentPatient ? (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-200 py-24">
              <div className="w-16 h-16 rounded-2xl bg-teal-50 text-teal-700 flex items-center justify-center mx-auto mb-4 border border-teal-100">
                <Stethoscope size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Buồng Khám Đang Sẵn Sàng Tiếp Nhận</h3>
              <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed">
                Hiện chưa có bệnh nhân nào trong buồng khám. Khi bệnh nhân được tiếp đón và gọi vào phòng, toàn bộ thông tin bệnh án, triệu chứng phân loại và hồ sơ chẩn đoán sẽ hiển thị tại đây.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-5">
            {/* Header of Active Patient - Sticky when scrolling */}
            <div className="sticky top-2 z-10 bg-white/95 backdrop-blur-md pt-1 pb-4 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 -mx-2 px-2">
              <div className="flex items-center gap-3">
                <div className="px-3.5 h-11 min-w-[68px] rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-sm tracking-tight whitespace-nowrap shrink-0 shadow-inner">
                  {currentPatient.queueNumber}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-slate-800">{currentPatient.patientName}</h2>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-mono">
                      {currentPatient.gender} • {currentPatient.birthYear}
                    </span>
                    {currentPatient.status === 'DEFERRED' && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md font-bold">
                        TẠM HOÃN
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    CCCD: {currentPatient.cccd || 'Đang cập nhật'} • SĐT: {currentPatient.phone || 'Chưa có'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {currentPatient.status === 'IN_CONSULTATION' && (
                  <button
                    type="button"
                    onClick={handleDeferCurrentConsultation}
                    className="px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    title="Tạm hoãn ca này để tiếp tục ca tiếp theo (Bệnh nhân có thể được gọi lại bất cứ lúc nào)"
                  >
                    <PauseCircle size={14} className="text-amber-600" />
                    <span>Tạm Hoãn Ca (Defer)</span>
                  </button>
                )}
                <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  Mã Hẹn: <strong>{currentPatient.bookingCode}</strong>
                </div>
              </div>
            </div>

            {/* Clinical Summary & AI 1-Click Recommendation */}
            <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl p-4.5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-purple-100">
                <div className="flex flex-wrap items-center gap-2 text-purple-900 font-bold text-xs">
                  <Sparkles size={16} className="text-purple-600 shrink-0" />
                  <span>TÓM TẮT LÂM SÀNG BỆNH ÁN TỪ HỆ THỐNG:</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                    <Clock size={11} className="text-amber-600" />
                    Tính Năng AI Đang Phát Triển
                  </span>
                </div>
                {currentPatient.status === 'IN_CONSULTATION' && (
                  <button
                    type="button"
                    onClick={() => {
                      const detectedKey = detectAiPreset(currentPatient);
                      handleApplyPreset(detectedKey);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-sm hover:shadow-purple-700/20 cursor-pointer"
                    title="Hệ thống tự động đọc triệu chứng và nạp đơn thuốc mẫu phù hợp (Đang thử nghiệm)"
                  >
                    <Sparkles size={13} className="text-amber-300" />
                    <span>⚡ Nạp Chẩn Đoán &amp; Đơn Thuốc Theo Gợi Ý AI (Thử nghiệm)</span>
                  </button>
                )}
              </div>

              {/* Thông báo tính năng AI đang trong quá trình phát triển */}
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 px-3 py-2 rounded-xl text-xs font-medium">
                <AlertCircle size={15} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Thông báo:</strong> Tính năng Trợ lý AI tóm tắt triệu chứng &amp; gợi ý đơn thuốc đang trong quá trình phát triển &amp; thử nghiệm. Kết quả chỉ mang tính chất hỗ trợ kỹ thuật tham khảo.
                </span>
              </div>

              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl text-xs text-slate-800 leading-relaxed border border-purple-100/80 shadow-xs">
                <p className="font-semibold text-purple-950 mb-1">
                  Triệu chứng bệnh nhân khai báo: &ldquo;{currentPatient.symptoms}&rdquo;
                </p>
                <p className="text-slate-600 italic flex items-start gap-1.5">
                  <Sparkles size={14} className="text-purple-600 shrink-0 mt-0.5" />
                  <span><strong>AI Đánh Giá:</strong> {currentPatient.aiSummary}</span>
                </p>
              </div>
            </div>

            {/* Chỉ có bệnh nhân ĐANG KHÁM (IN_CONSULTATION) mới có giao diện chẩn đoán, kê đơn & hoàn tất */}
            {currentPatient.status === 'IN_CONSULTATION' ? (
              <>
                {/* 1. Clinical Diagnosis */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <FileText size={14} className="text-teal-700" />
                      <span>1. Kết Luận Chẩn Đoán Bệnh Án (Bắt buộc):</span>
                    </label>
                    <div className="flex items-center gap-2">
                      {draftSavedText && (
                        <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          <Check size={12} className="text-emerald-600" />
                          <span>Đã tự động lưu nháp ({draftSavedText})</span>
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400">Lưu vào bảng medical_records</span>
                    </div>
                  </div>
                  <textarea
                    rows={3}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Nhập chẩn đoán xác định bệnh (Ví dụ: Viêm họng cấp, Viêm phế quản bội nhiễm, Rối loạn tiêu hóa...)"
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none text-xs text-slate-800 font-medium leading-relaxed"
                  />
                </div>

                {/* 2. Quick Prescription Presets (Đơn thuốc mẫu 1 chạm) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <Sparkles size={14} className="text-amber-500" />
                      <span>2. Kê Đơn Thuốc Mẫu Nhanh (Templates):</span>
                    </span>
                    <span className="text-[11px] text-teal-700 font-medium">Bấm 1 chạm để nạp thuốc chuẩn</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(PRESCRIPTION_PRESETS).map(([key, preset]) => {
                      const isAiMatch = currentPatient && detectAiPreset(currentPatient) === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => handleApplyPreset(key)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                            selectedPreset === key
                              ? 'bg-teal-700 text-white border-teal-700 shadow-xs'
                              : isAiMatch
                              ? 'bg-purple-50 text-purple-900 border-purple-300 hover:bg-purple-100 shadow-xs ring-1 ring-purple-300'
                              : 'bg-white hover:bg-teal-50 text-slate-700 hover:text-teal-800 border-slate-200 shadow-2xs'
                          }`}
                        >
                          <Pill size={12} className={selectedPreset === key ? 'text-white' : isAiMatch ? 'text-purple-600' : 'text-teal-600'} />
                          <span>{preset.label}</span>
                          {isAiMatch && (
                            <span className="text-[9px] bg-purple-200 text-purple-900 px-1 py-0.2 rounded font-semibold uppercase">
                              AI Gợi ý (Thử nghiệm)
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Prescription Medicine Table */}
                <div className="space-y-3 pt-1 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                      <ClipboardList size={14} className="text-teal-700" />
                      <span>3. Danh Mục Thuốc Kê Đơn Điện Tử:</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold bg-teal-50 text-teal-800 px-2 py-0.5 rounded-md border border-teal-200">
                        {prescriptionItems.length} loại thuốc
                      </span>
                      {prescriptionItems.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setPrescriptionItems([])}
                          className="text-[11px] text-rose-600 hover:underline cursor-pointer"
                        >
                          Xóa tất cả
                        </button>
                      )}
                    </div>
                  </div>

                  {prescriptionItems.length === 0 ? (
                    <div className="p-6 text-center bg-slate-50/70 border border-dashed border-slate-200 rounded-xl space-y-1">
                      <Pill size={24} className="mx-auto text-slate-300 mb-1" />
                      <p className="text-xs text-slate-500 font-medium">Chưa có thuốc nào trong đơn</p>
                      <p className="text-[11px] text-slate-400">Chọn mẫu nhanh ở trên hoặc nhập thông tin thuốc bên dưới</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                          <tr>
                            <th className="p-2.5 text-center w-8">#</th>
                            <th className="p-2.5">Tên thuốc &amp; Hàm lượng</th>
                            <th className="p-2.5 w-16 text-center">ĐVT</th>
                            <th className="p-2.5 w-14 text-center">SL</th>
                            <th className="p-2.5">Cách dùng / Liều uống</th>
                            <th className="p-2.5 text-right w-24">Đơn giá</th>
                            <th className="p-2.5 text-right w-24">Thành tiền</th>
                            <th className="p-2.5 text-center w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {prescriptionItems.map((item, idx) => {
                            const lineTotal = (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0);
                            return (
                              <tr key={idx} className="hover:bg-slate-50/70 transition">
                                <td className="p-2.5 text-center text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                                <td className="p-2.5 font-bold text-slate-800">{item.medicineName}</td>
                                <td className="p-2.5 text-center text-slate-600 font-medium">{item.unit}</td>
                                <td className="p-2.5 text-center font-bold text-teal-800 font-mono">{item.quantity}</td>
                                <td className="p-2.5 text-slate-600 italic text-[11px]">{item.dosage}</td>
                                <td className="p-2.5 text-right text-slate-600 font-mono text-[11px]">
                                  {item.unitPrice?.toLocaleString('vi-VN')} đ
                                </td>
                                <td className="p-2.5 text-right font-bold text-slate-800 font-mono text-[11px]">
                                  {lineTotal.toLocaleString('vi-VN')} đ
                                </td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveMedicine(idx)}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition cursor-pointer"
                                    title="Xóa thuốc này"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        <tfoot className="bg-teal-50/60 border-t border-teal-100 font-bold text-xs text-teal-950">
                          <tr>
                            <td colSpan={6} className="p-2.5 text-right uppercase tracking-wider text-[11px]">
                              Tổng chi phí tiền thuốc dự kiến:
                            </td>
                            <td className="p-2.5 text-right font-black text-teal-900 font-mono text-sm">
                              {totalMedicineCost.toLocaleString('vi-VN')} đ
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}

                  {/* Manual Add Medicine Input Row */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-700 block">Thêm thuốc tự do vào đơn:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-5">
                        <input
                          type="text"
                          value={newMedName}
                          onChange={(e) => setNewMedName(e.target.value)}
                          placeholder="Tên thuốc & hàm lượng (vd: Paracetamol 500mg)"
                          className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-600 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <select
                          value={newMedUnit}
                          onChange={(e) => setNewMedUnit(e.target.value)}
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-600 focus:outline-none"
                        >
                          <option value="Viên">Viên</option>
                          <option value="Gói">Gói</option>
                          <option value="Chai">Chai</option>
                          <option value="Tuýp">Tuýp</option>
                          <option value="Hộp">Hộp</option>
                          <option value="Ống">Ống</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="number"
                          min={1}
                          value={newMedQty}
                          onChange={(e) => setNewMedQty(e.target.value)}
                          placeholder="SL"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-center font-mono focus:ring-1 focus:ring-teal-600 focus:outline-none"
                        />
                      </div>
                      <div className="sm:col-span-3">
                        <input
                          type="number"
                          step={500}
                          value={newMedPrice}
                          onChange={(e) => setNewMedPrice(e.target.value)}
                          placeholder="Đơn giá (đ)"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-right font-mono focus:ring-1 focus:ring-teal-600 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={newMedDosage}
                        onChange={(e) => setNewMedDosage(e.target.value)}
                        placeholder="Liều dùng & hướng dẫn (vd: Sáng 1 viên, Tối 1 viên sau ăn)"
                        className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-teal-600 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddManualMedicine}
                        className="px-4 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <Plus size={14} /> Thêm Thuốc
                      </button>
                    </div>
                  </div>
                </div>

                {/* 4. Doctor Advice */}
                <div className="space-y-2 pt-1 border-t border-slate-100">
                  <label className="block text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Stethoscope size={14} className="text-teal-700" />
                    <span>4. Lời Dặn Bác Sĩ &amp; Hẹn Tái Khám:</span>
                  </label>
                  <textarea
                    rows={2}
                    value={doctorAdvice}
                    onChange={(e) => setDoctorAdvice(e.target.value)}
                    placeholder="Chế độ ăn uống, tập luyện, kiêng cữ và hướng dẫn tái khám (vd: Tái khám sau 7 ngày hoặc khi có triệu chứng lạ)..."
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none text-xs text-slate-800 font-medium leading-relaxed"
                  />
                </div>

                {/* 5. Action Bar */}
                <div className="pt-2 space-y-2.5">
                  {/* Primary Action Button */}
                  <button
                    type="button"
                    onClick={handleRequestComplete}
                    disabled={doctorStatus === 'EMERGENCY' || submittingPrescription}
                    className={`w-full font-bold py-3.5 rounded-xl transition shadow-md text-xs flex items-center justify-center gap-2 cursor-pointer ${
                      doctorStatus === 'EMERGENCY' || submittingPrescription
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    <span>HOÀN TẤT CA KHÁM &amp; KÊ ĐƠN THUỐC ĐIỆN TỬ</span>
                  </button>

                  {/* Secondary Exceptional Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* 1. Gia hạn ca khám */}
                    <button
                      type="button"
                      onClick={() => handleExtendConsultation(15)}
                      disabled={doctorStatus === 'EMERGENCY'}
                      className="px-3 py-2.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Thêm thời gian cho ca bệnh nặng hoặc phức tạp"
                    >
                      <Plus size={14} />
                      <span>Gia Hạn +15 Phút</span>
                    </button>

                    {/* 2. Chỉ định xét nghiệm / Chờ kết quả */}
                    <button
                      type="button"
                      onClick={handleSendForTests}
                      disabled={doctorStatus === 'EMERGENCY'}
                      className="px-3 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Bệnh nhân đi làm cận lâm sàng, buồng khám tiếp tục khám người khác"
                    >
                      <FlaskConical size={14} />
                      <span>Chờ KQ Xét Nghiệm</span>
                    </button>

                    {/* 3. Bỏ qua lượt / Bệnh nhân vắng mặt */}
                    <button
                      type="button"
                      onClick={handleSkipAbsent}
                      disabled={doctorStatus === 'EMERGENCY'}
                      className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Gọi loa 3 lần không có mặt, đẩy xuống cuối và gọi người tiếp theo"
                    >
                      <UserX size={14} />
                      <span>Bỏ Qua (Vắng Mặt)</span>
                    </button>
                  </div>
                </div>
              </>
            ) : currentPatient.status === 'WAITING' ? (
              /* Trường hợp ca ĐANG CHỜ: Bỏ hết các nút hoàn tất, chỉ hiển thị nút Mời vào phòng khám */
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 text-center space-y-4 my-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">Bệnh Nhân Đang Chờ Trước Cửa Phòng</h4>
                  <p className="text-xs text-amber-700 mt-1 max-w-md mx-auto leading-relaxed">
                    Bệnh nhân #{currentPatient.queueNumber} - {currentPatient.patientName} đang ở hàng đợi ngoài sảnh. 
                    Bác sĩ bấm nút bên dưới để mời bệnh nhân bước vào phòng khám.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => handleRecallPatient(activePatientIndex)}
                    disabled={doctorStatus === 'EMERGENCY'}
                    className="px-6 py-3.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold rounded-xl text-xs transition shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <Volume2 size={16} />
                    <span>MỜI BỆNH NHÂN VÀO BUỒNG KHÁM (CALL IN)</span>
                  </button>
                </div>
              </div>
            ) : currentPatient.status === 'UPCOMING' ? (
              /* Trường hợp ca SẼ ĐẾN KHÁM (Chưa check-in tại quầy lễ tân) */
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-6 text-center space-y-3 my-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mx-auto">
                  <Clock size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 text-sm">Lịch Hẹn Khám Trước Trực Tuyến</h4>
                  <p className="text-xs text-blue-700 mt-1 max-w-md mx-auto leading-relaxed">
                    Khung giờ hẹn: <span className="font-semibold">{currentPatient.appointmentTime || 'Hôm nay'}</span>.
                  </p>
                  <p className="text-xs text-slate-500 mt-2 max-w-md mx-auto leading-relaxed bg-white/80 p-3 rounded-xl border border-blue-100">
                    ℹ️ Bệnh nhân chưa làm thủ tục tại <strong>Quầy Lễ Tân</strong> sảnh. Khi bệnh nhân đến và check-in, ca khám sẽ tự động chuyển vào hàng đợi <strong>Đang Chờ</strong> của Bác sĩ.
                  </p>
                </div>
              </div>
            ) : currentPatient.status === 'COMPLETED' ? (
              /* Trường hợp ca ĐÃ KHÁM: Chỉ có nút mở lại nếu bấm nhầm */
              <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-6 text-center space-y-4 my-2">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 text-sm">Ca Khám Này Đã Hoàn Tất</h4>
                  <p className="text-xs text-emerald-700 mt-1 max-w-md mx-auto leading-relaxed">
                    Hồ sơ khám bệnh đã được kết thúc thành công. Nếu bác sĩ vô tình bấm nhầm hoàn tất sớm, 
                    hãy bấm nút bên dưới để mở lại ca khám và tiếp tục bổ sung thông tin.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => handleReopenConsultation(activePatientIndex)}
                    className="px-6 py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs transition shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <RotateCcw size={16} />
                    <span>MỞ LẠI CA KHÁM NÀY (NẾU BẤM NHẦM)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Các trạng thái đặc biệt: Tạm hoãn, Chờ KQ, Vắng mặt */
              <div className="bg-purple-50/70 border border-purple-200 rounded-2xl p-6 text-center space-y-4 my-2">
                <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center mx-auto">
                  <FlaskConical size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-purple-900 text-sm">
                    {currentPatient.status === 'WAITING_RESULTS'
                      ? 'Bệnh Nhân Đang Chờ Kết Quả Xét Nghiệm'
                      : currentPatient.status === 'MISSED_CALL'
                      ? 'Bệnh Nhân Vắng Mặt Khi Gọi'
                      : 'Ca Khám Đang Tạm Hoãn'}
                  </h4>
                  <p className="text-xs text-purple-700 mt-1 max-w-md mx-auto leading-relaxed">
                    Bấm nút bên dưới để tiếp nhận bệnh nhân quay lại buồng khám để tiếp tục chẩn đoán và kê đơn.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={() => handleRecallPatient(activePatientIndex)}
                    className="px-6 py-3.5 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl text-xs transition shadow-md shadow-purple-700/20 flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <RotateCcw size={16} />
                    <span>TIẾP TỤC KHÁM LẠI CHO BỆNH NHÂN NÀY</span>
                  </button>
                </div>
              </div>
            )}
          </div>
          )}
        </div>
      </div>

      {/* ── Modal Báo Tới Trễ (Late Notice Modal) ── */}
      {showLateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-amber-700 font-bold">
                <Clock size={20} />
                <span>Báo Cáo Tới Trễ / Vắng Tạm Thời</span>
              </div>
              <button
                onClick={() => setShowLateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Thông báo này sẽ được phát thanh tại sảnh chờ và gửi tin nhắn cảnh báo tới bệnh nhân có lịch hẹn trong buổi sáng để bệnh nhân an tâm:
            </p>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700">Dự kiến có mặt muộn khoảng:</label>
              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 45].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => handleConfirmLate(m)}
                    className="p-3 rounded-xl border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50 text-xs font-bold text-slate-700 transition cursor-pointer text-center"
                  >
                    +{m} phút
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLateModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
              >
                Hủy Bỏ
              </button>
            </div>
          </div>
        </div>
      )}



      {/* ── Modal Xác Nhận Hoàn Tất Ca Khám & Kê Đơn Thuốc (CLAB-107) ── */}
      {showCompleteModal && currentPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-teal-800 font-bold">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span>Xác Nhận Hoàn Tất Ca Khám &amp; Kê Đơn Thuốc</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Bệnh nhân:</span>
                <span className="font-bold text-slate-800 text-sm">{currentPatient.patientName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Số thứ tự / Mã hẹn:</span>
                <span className="font-bold text-teal-700 font-mono text-xs">
                  #{currentPatient.queueNumber} • {currentPatient.bookingCode}
                </span>
              </div>
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block">Kết luận chẩn đoán:</span>
                <p className="text-xs text-slate-800 font-medium bg-white p-2.5 rounded-lg border border-slate-200">
                  {clinicalNotes.trim() || <span className="text-rose-500 italic">Chưa nhập chẩn đoán!</span>}
                </p>
              </div>
              <div className="flex items-center justify-between pt-1 text-slate-600">
                <span>Số loại thuốc kê trong đơn:</span>
                <span className="font-bold text-slate-800 font-mono">{prescriptionItems.length} loại</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Tổng chi phí tiền thuốc dự kiến:</span>
                <span className="font-bold text-emerald-700 font-mono text-sm">
                  {totalMedicineCost.toLocaleString('vi-VN')} đ
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Hệ thống sẽ cập nhật trạng thái ca khám sang <strong>COMPLETED</strong>, ghi nhận bệnh án và danh sách thuốc vào cơ sở dữ liệu MySQL đồng thời mở bảng in đơn thuốc cho bệnh nhân.
            </p>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                disabled={submittingPrescription}
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy (Tiếp tục khám)
              </button>
              <button
                type="button"
                disabled={submittingPrescription || !clinicalNotes.trim()}
                onClick={handleExecuteComplete}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submittingPrescription ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" />
                    <span>Đang lưu vào CSDL...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={15} />
                    <span>Xác Nhận Kê Đơn &amp; Lưu CSDL</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal In Đơn Thuốc A5 Chuẩn Y Tế Ngay Sau Khi Hoàn Tất ── */}
      {showPrescriptionPrintModal && lastSavedPrescription && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-8 shadow-2xl border border-slate-200 space-y-6 my-8 animate-in fade-in zoom-in-95 duration-200">
            {/* Action Bar (Ẩn khi in ấn) */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 print:hidden">
              <div className="flex items-center gap-2 text-teal-800 font-bold">
                <Printer size={20} className="text-teal-700" />
                <span>Đơn Thuốc Điện Tử Đã Lưu Thành Công</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer size={15} /> In Đơn Thuốc (A5/A4)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPrescriptionPrintModal(false);
                    handleCallNext();
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <ArrowRight size={15} /> Gọi Ca Tiếp Theo
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrescriptionPrintModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Printable Prescription Content (Chuẩn A5) - PREMIUM MEDICAL DESIGN */}
            <div className="relative border-2 border-slate-300 p-8 rounded-lg bg-white space-y-6 text-slate-800 text-sm font-serif max-w-[650px] mx-auto shadow-[0_0_20px_rgba(0,0,0,0.1)]">
              {/* Watermark / Background Logo */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                <Stethoscope size={400} />
              </div>
              
              {/* Header - Clinic Info */}
              <div className="flex justify-between items-start border-b-2 border-teal-800 pb-5">
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-teal-800 rounded-lg flex items-center justify-center text-white shrink-0 shadow-inner">
                    <ShieldCheck size={36} />
                  </div>
                  <div>
                    <h2 className="font-black text-teal-900 text-lg uppercase tracking-widest font-sans">MEDSCHED CLINIC</h2>
                    <p className="text-[11px] text-slate-600 font-bold mt-1 uppercase">Khoa Khám Bệnh - Chuyên Khoa Ngoại Trú</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">📍 123 Nguyễn Văn Cừ, Quận 5, TP.HCM</p>
                    <p className="text-[11px] text-slate-500">📞 Hotline: 1900 8888 • 🌐 medsched.vn</p>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <QrCode size={46} className="text-slate-800 mb-1.5" />
                  <div className="font-mono font-bold text-[11px] text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                    Mã Đơn: {lastSavedPrescription.prescription?.prescriptionId || 'PR-2026-ONLINE'}
                  </div>
                  <div className="font-mono text-[10px] text-slate-500 mt-1">
                    Ca Khám: {lastSavedPrescription.patient?.bookingCode}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-2 space-y-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-widest font-sans uppercase">
                  ĐƠN THUỐC ĐIỆN TỬ
                </h1>
                <p className="text-[11px] text-slate-500 font-sans italic tracking-widest">PRESCRIPTION</p>
              </div>

              {/* Patient Info */}
              <div className="grid grid-cols-2 gap-y-3 gap-x-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                <div className="flex gap-2">
                  <span className="text-slate-500 shrink-0">Họ và tên:</span>
                  <span className="font-bold text-slate-900 uppercase truncate">{lastSavedPrescription.patient?.patientName}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 shrink-0">Giới tính/Tuổi:</span>
                  <span className="font-semibold text-slate-800">
                    {lastSavedPrescription.patient?.gender} • {new Date().getFullYear() - (lastSavedPrescription.patient?.birthYear || 1990)} tuổi
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 shrink-0">Điện thoại:</span>
                  <span className="font-mono font-semibold text-slate-800">{lastSavedPrescription.patient?.phone}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 shrink-0">Số định danh:</span>
                  <span className="font-mono font-semibold text-slate-800">{lastSavedPrescription.patient?.cccd || 'Không có'}</span>
                </div>
              </div>

              {/* Diagnosis */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-teal-800 border-b border-teal-100 pb-1">
                  <Activity size={16} />
                  <span className="font-bold uppercase text-xs tracking-wider">Chẩn đoán xác định</span>
                </div>
                <p className="px-2 py-1 text-slate-900 font-medium italic">
                  {lastSavedPrescription.diagnosis}
                </p>
              </div>

              {/* Medicines List */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-teal-800 border-b border-teal-100 pb-1">
                  <Pill size={16} />
                  <span className="font-bold uppercase text-xs tracking-wider">Chỉ định dùng thuốc</span>
                </div>
                <div className="space-y-4 pl-1">
                  {lastSavedPrescription.items?.map((item: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 text-[15px] flex items-start gap-1">
                          <span className="text-teal-700 w-5">{idx + 1}.</span>
                          <span>{item.medicineName}</span>
                        </div>
                        <div className="text-[13px] text-slate-700 italic ml-6 border-l-2 border-slate-200 pl-3">
                          HDSD: {item.dosage}
                        </div>
                      </div>
                      <div className="text-right shrink-0 bg-slate-50 px-3 py-1 rounded-md border border-slate-100">
                        <div className="font-black text-slate-800">
                          {item.quantity} {item.unit}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Doctor Advice */}
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center gap-2 text-amber-700 border-b border-amber-100 pb-1">
                  <HeartPulse size={16} />
                  <span className="font-bold uppercase text-xs tracking-wider">Lời dặn của Bác sĩ</span>
                </div>
                <p className="px-2 py-1 text-amber-950 italic text-[13px] font-sans bg-amber-50/30 rounded">
                  &ldquo;{lastSavedPrescription.doctorAdvice}&rdquo;
                </p>
              </div>

              {/* Footer Signatures */}
              <div className="pt-8 pb-4 flex justify-between items-end">
                <div className="text-[11px] text-slate-500 space-y-1 font-sans">
                  <p className="flex items-center gap-1.5"><Check size={12} className="text-teal-600"/> Tái khám xin mang theo đơn này.</p>
                  <p className="flex items-center gap-1.5"><Check size={12} className="text-teal-600"/> Đơn thuốc có giá trị mua trong vòng 05 ngày.</p>
                </div>
                <div className="text-center space-y-1.5 w-48">
                  <p className="text-[12px] text-slate-600 italic font-sans">
                    Ngày {new Date().getDate().toString().padStart(2, '0')} tháng {(new Date().getMonth() + 1).toString().padStart(2, '0')} năm {new Date().getFullYear()}
                  </p>
                  <p className="font-bold text-slate-900 uppercase text-[12px] font-sans">Bác Sĩ Điều Trị</p>
                  <div className="h-16 flex items-center justify-center">
                    {/* Placeholder chữ ký */}
                    <span className="font-serif italic text-2xl text-teal-800 opacity-80 transform -rotate-6">
                      {lastSavedPrescription.prescription?.doctorName?.split(' ').pop() || 'BS.CKI'}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 text-[13px] font-sans border-t border-slate-200 pt-2">
                    {lastSavedPrescription.prescription?.doctorName || 'BS. Chuyên Khoa'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay Khóa Đa Tab (Single Tab Enforcement Modal) ── */}
      {isBlockedByAnotherTab && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-8 shadow-2xl border border-amber-200 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle size={36} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900">
                Buồng Khám Đang Mở Tại Một Tab Khác!
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Để đảm bảo tính chính xác của hàng đợi, ngăn ngừa gọi trùng số thứ tự (STT) và chống ghi đè dữ liệu bệnh án, hệ thống <strong>MedSched</strong> chỉ cho phép <strong>1 tab duy nhất</strong> được quyền điều hành buồng khám.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-900 flex items-center gap-2 text-left">
              <ShieldCheck size={20} className="text-amber-700 shrink-0" />
              <span>Tab này hiện đang bị tạm khóa để bảo vệ phiên làm việc của Bác sĩ.</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  window.close();
                  window.location.href = '/';
                }}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Đóng Tab Này
              </button>

              <button
                type="button"
                onClick={handleTakeOverSession}
                className="flex-1 px-4 py-3 bg-pine-teal hover:bg-pine-teal-hover text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Chuyển Quyền Sang Tab Này</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Overlay Khóa Màn Hình Bảo Mật Khi Rảnh (Idle Security Lock) ── */}
      {isScreenLocked && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mx-auto shadow-inner">
              <Lock size={36} />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900">
                Buồng Khám Đang Tạm Khóa Bảo Mật
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Để bảo vệ quyền riêng tư hồ sơ bệnh án và thông tin cá nhân của bệnh nhân theo quy chuẩn y tế, giao diện buồng khám đã tạm thời được che mờ khi bác sĩ vắng mặt.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-2 text-left">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="text-slate-400">Bác sĩ phụ trách:</span>
                <span className="font-bold text-slate-800">{currentUser?.fullName || 'BS. Chuyên Khoa'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Ca khám hiện tại:</span>
                <span className="font-semibold text-teal-800">
                  {currentPatient ? `#${currentPatient.queueNumber} - ${currentPatient.patientName}` : 'Buồng khám sẵn sàng'}
                </span>
              </div>
              {idleMinutes > 0 && (
                <div className="text-[10px] text-amber-700 italic pt-1">
                  ⏱️ Đã không có thao tác bàn phím/chuột trong hơn {idleMinutes} phút.
                </div>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsScreenLocked(false);
                  lastActivityRef.current = Date.now();
                  setNotification('🔓 Đã mở khóa buồng khám. Chào mừng Bác sĩ quay trở lại.');
                }}
                className="w-full py-3.5 bg-teal-700 hover:bg-teal-800 text-white font-bold rounded-xl text-xs transition shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                <Unlock size={16} />
                <span>Mở Khóa Tiếp Tục Khám</span>
              </button>

              {currentPatient?.status === 'IN_CONSULTATION' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsScreenLocked(false);
                    lastActivityRef.current = Date.now();
                    handleDeferCurrentConsultation();
                  }}
                  className="w-full py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <PauseCircle size={14} className="text-amber-600" />
                  <span>Tạm Hoãn Ca Này Để Giải Phóng Buồng Khám</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Cảnh Báo Quá Giờ Ca Khám (Overtime Prompt Modal) ── */}
      {showOvertimeModal && currentPatient?.status === 'IN_CONSULTATION' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl border border-red-200 space-y-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={26} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  ⚠️ Ca Khám Đã Vượt Thời Gian Tiêu Chuẩn!
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Bệnh nhân <strong>#{currentPatient.queueNumber} - {currentPatient.patientName}</strong> đã hết thời lượng 30 phút tiêu chuẩn. Bên ngoài sảnh chờ hiện có <strong>{waitingCount} bệnh nhân</strong> đang xếp hàng chờ khám.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
              <p className="font-semibold">💡 Bác sĩ vui lòng chọn phương án xử lý để hàng đợi không bị nghẽn:</p>
              <ul className="list-disc pl-4 mt-1.5 space-y-1 text-[11px] text-amber-800">
                <li><strong>Gia hạn thêm giờ:</strong> Nếu đây là ca bệnh phức tạp cần thăm khám kỹ hơn.</li>
                <li><strong>Tạm hoãn ca khám:</strong> Nếu cần chờ người nhà hoặc bệnh nhân cần chuẩn bị thêm.</li>
                <li><strong>Tôi đang kê đơn:</strong> Giữ màn hình để hoàn tất ca khám ngay.</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  handleExtendConsultation(15);
                  setShowOvertimeModal(false);
                  if (currentPatient?.id) setDismissedOvertimeForPatient(currentPatient.id);
                }}
                className="py-2.5 px-3 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <span>+15 Phút (Gia Hạn)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleDeferCurrentConsultation();
                  setShowOvertimeModal(false);
                }}
                className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <PauseCircle size={14} />
                <span>Tạm Hoãn Ca</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowOvertimeModal(false);
                  if (currentPatient?.id) setDismissedOvertimeForPatient(currentPatient.id);
                }}
                className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Tôi Đang Kê Đơn
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
