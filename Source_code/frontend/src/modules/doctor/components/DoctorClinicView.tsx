'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
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
  RotateCcw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { api, getAuthUser, getAuthToken } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import LoginForm from '@/modules/auth/components/LoginForm';

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

/** Thời gian tối đa cho 1 ca khám (giây) - mặc định 30 phút */
const MAX_CONSULTATION_SECONDS = 30 * 60;
/** Ngưỡng cảnh báo còn bao nhiêu giây thì đổi màu đỏ */
const WARNING_THRESHOLD_SECONDS = 5 * 60;

export default function DoctorClinicView() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clinicActive, setClinicActive] = useState(true);
  const [activePatientIndex, setActivePatientIndex] = useState(0);
  const [notification, setNotification] = useState<string | null>(null);

  // ── Phân quyền Người Thao Tác (Bác sĩ vs Y tá / Điều phối viên) ──
  const [operatorRole, setOperatorRole] = useState<'DOCTOR' | 'NURSE'>('DOCTOR');

  // ── Cơ chế Tự Động Tiếp Nhận (Auto-Admit khi phòng trống) ──
  const [autoAdmit, setAutoAdmit] = useState(true);

  // ── Cơ chế Auto-Timeout ────────────────────────────────────
  const [timeRemaining, setTimeRemaining] = useState(MAX_CONSULTATION_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Trạng Thái Bác Sĩ & Phòng Khám (Bình thường / Cấp cứu / Tới trễ / Đã chuyển) ──
  const [doctorStatus, setDoctorStatus] = useState<'NORMAL' | 'EMERGENCY' | 'LATE' | 'TRANSFERRED'>('NORMAL');
  const [lateMinutes, setLateMinutes] = useState(20);
  const [showLateModal, setShowLateModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [transferredRoom, setTransferredRoom] = useState<string | null>(null);

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
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const loadQueue = useCallback(async () => {
    try {
      setLoadingQueue(true);
      const data = await api.getDoctorQueue();
      if (Array.isArray(data) && data.length > 0) {
        setQueue(data as PatientQueueItem[]);
        // Ưu tiên chọn bệnh nhân đang khám (IN_CONSULTATION), nếu không thì chọn bệnh nhân đang chờ đầu tiên
        const inConsultIdx = data.findIndex(p => p.status === 'IN_CONSULTATION');
        if (inConsultIdx !== -1) {
          setActivePatientIndex(inConsultIdx);
        } else {
          const waitingIdx = data.findIndex(p => p.status === 'WAITING');
          if (waitingIdx !== -1) {
            setActivePatientIndex(waitingIdx);
          } else {
            setActivePatientIndex(0);
          }
        }
      }
    } catch (err: any) {
      console.warn('Could not fetch doctor queue from backend:', err?.message);
    } finally {
      setLoadingQueue(false);
    }
  }, []);

  useEffect(() => {
    const token = getAuthToken();
    const user = getAuthUser();
    const roles: string[] = user?.roles || [];
    if (!token || !user || (!roles.includes('ROLE_DOCTOR') && !roles.includes('ROLE_ADMIN'))) {
      setIsAuthenticated(false);
      setAuthChecked(true);
      return;
    }
    setCurrentUser(user);
    setIsAuthenticated(true);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadQueue();
    }
  }, [isAuthenticated, loadQueue]);

  const currentPatient = queue[activePatientIndex] || queue[0];

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
      setShowCompleteModal(true);
    } else {
      handleCallNext();
    }
  };

  // ── Khôi phục / Mở lại ca khám đã hoàn tất (Undo nếu bấm nhầm) ──
  const handleReopenConsultation = (targetIndex: number) => {
    const targetPatient = queue[targetIndex];
    setQueue((prev) =>
      prev.map((p, idx) => {
        if (idx === targetIndex) return { ...p, status: 'IN_CONSULTATION' as const };
        if (p.status === 'IN_CONSULTATION') return { ...p, status: 'WAITING' as const };
        return p;
      })
    );
    setActivePatientIndex(targetIndex);
    setTimeRemaining(MAX_CONSULTATION_SECONDS);
    setNotification(
      `🔄 ĐÃ MỞ LẠI CA KHÁM: Bệnh nhân #${targetPatient?.queueNumber} - ${targetPatient?.patientName} đã được đưa lại vào buồng khám.`
    );
  };

  // ── 1. Gia Hạn Ca Khám (+10 / +15 phút) ──
  const handleExtendConsultation = (minutes: number = 15) => {
    setTimeRemaining((prev) => prev + minutes * 60);
    setNotification(`⏱️ ĐÃ GIA HẠN: Thêm +${minutes} phút cho ca bệnh phức tạp. Đồng hồ khám đã được cập nhật.`);
  };

  // ── 2. Chỉ Định Cận Lâm Sàng / Chờ Kết Quả Xét Nghiệm (Giải phóng buồng khám) ──
  const handleSendForTests = () => {
    const currentName = queue[activePatientIndex]?.patientName;
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
    setTimeRemaining(MAX_CONSULTATION_SECONDS);
    setClinicalNotes('');
    setNotification(`🔄 TIẾP NHẬN LẠI: Đã chuyển bệnh nhân #${queue[targetIndex].queueNumber} - ${queue[targetIndex].patientName} vào buồng khám.`);
  };

  // ── Cơ chế Tự Động Tiếp Nhận (Auto-Admit khi phòng trống / Bệnh nhân đầu tiên) ──
  useEffect(() => {
    // Chỉ tự nhận nếu: phòng mở, không cấp cứu, không báo trễ, không chuyển phòng, và đang bật autoAdmit
    if (!clinicActive || doctorStatus !== 'NORMAL' || !autoAdmit) return;

    const hasActiveConsultation = queue.some(p => p.status === 'IN_CONSULTATION');
    if (!hasActiveConsultation) {
      const firstAvailableIdx = queue.findIndex(p => p.status === 'WAITING' || p.status === 'DEFERRED');
      if (firstAvailableIdx !== -1) {
        setQueue(prev =>
          prev.map((p, idx) => {
            if (idx === firstAvailableIdx) return { ...p, status: 'IN_CONSULTATION' as const };
            return p;
          })
        );
        setActivePatientIndex(firstAvailableIdx);
        setTimeRemaining(MAX_CONSULTATION_SECONDS);
        setClinicalNotes('');
        setNotification(
          `⚡ [Tự Động Tiếp Nhận] Bệnh nhân STT #${queue[firstAvailableIdx].queueNumber} - ${queue[firstAvailableIdx].patientName} đã được tự động chuyển vào khám.`
        );
      }
    }
  }, [clinicActive, doctorStatus, autoAdmit, queue]);

  // ── Timer đếm ngược cho ca hiện tại ──────────────────────
  useEffect(() => {
    if (!clinicActive || doctorStatus !== 'NORMAL') {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const hasActivePatient = queue.some(p => p.status === 'IN_CONSULTATION');
    if (!hasActivePatient) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // ⏰ HẾT GIỜ - Tự động hoàn tất ca và chuyển tiếp
          handleCallNext();
          return MAX_CONSULTATION_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [clinicActive, doctorStatus, queue, handleCallNext]);

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
      setTimeRemaining(savedTimeRef.current > 0 ? savedTimeRef.current : MAX_CONSULTATION_SECONDS);
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

  // ── Xử lý Điều Chuyển Hàng Đợi Sang Phòng Khác (Transfer Queue) ──
  const handleConfirmTransfer = (targetRoom: string) => {
    setTransferredRoom(targetRoom);
    setDoctorStatus('TRANSFERRED');
    setQueue((prev) =>
      prev.map((p) => {
        if (p.status === 'WAITING' || p.status === 'DEFERRED') {
          return { ...p, status: 'TRANSFERRED' as const };
        }
        return p;
      })
    );
    setShowTransferModal(false);
    setNotification(
      `🔄 ĐIỀU CHUYỂN HOÀN TẤT: Toàn bộ danh sách bệnh nhân đang chờ đã được chuyển tiếp sang ${targetRoom}. Sảnh chờ đã phát thanh hướng dẫn bệnh nhân.`
    );
  };

  const handleSelectPatient = (index: number) => {
    setActivePatientIndex(index);
    setClinicalNotes('');
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

  // Helper format thời gian
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isWarning = timeRemaining <= WARNING_THRESHOLD_SECONDS;
  const progressPercent = ((MAX_CONSULTATION_SECONDS - timeRemaining) / MAX_CONSULTATION_SECONDS) * 100;

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
      {/* ── Role Selector Bar (Bác Sĩ vs Y Tá / Điều Phối Viên Sảnh) ── */}
      <div className="bg-slate-900 text-white rounded-2xl px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <ShieldCheck size={16} className="text-teal-400" />
          <span className="text-slate-300">Quyền điều hành ca trực:</span>
          <div className="inline-flex rounded-xl bg-slate-800 p-0.5 border border-slate-700">
            <button
              onClick={() => setOperatorRole('DOCTOR')}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                operatorRole === 'DOCTOR' ? 'bg-teal-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <User size={13} />
              <span>Bác Sĩ Trực Chính</span>
            </button>
            <button
              onClick={() => setOperatorRole('NURSE')}
              className={`px-3 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1.5 ${
                operatorRole === 'NURSE' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
              }`}
            >
              <UserCheck size={13} />
              <span>Y Tá / Lễ Tân Sảnh (Điều Phối Thay)</span>
            </button>
          </div>
        </div>

        {/* Toggle Tự Động Tiếp Nhận */}
        <div className="flex items-center gap-2">
          <Zap size={14} className={autoAdmit ? 'text-amber-400 animate-pulse' : 'text-slate-500'} />
          <span className="text-slate-300">Tự động nhận ca khi phòng trống:</span>
          <button
            onClick={() => setAutoAdmit(!autoAdmit)}
            className={`px-3 py-1 rounded-lg font-bold transition cursor-pointer border ${
              autoAdmit
                ? 'bg-amber-400/20 text-amber-300 border-amber-400/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {autoAdmit ? 'ĐANG BẬT (Khuyên Dùng)' : 'TẮT (Thủ Công)'}
          </button>
        </div>
      </div>

      {/* ── Top Clinic Banner ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-700 mb-1 text-xs font-bold uppercase tracking-wider">
            <Stethoscope size={18} />
            <span>Phân Hệ Buồng Khám Chuyên Khoa (Doctor Console)</span>
            {operatorRole === 'NURSE' && (
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                Chế độ Điều Phối Viên
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-slate-800">
            {currentUser?.fullName ? `Bàn Khám: ${currentUser.fullName}` : 'Bàn Khám Chuyên Khoa'}
          </h1>
          <p className="text-slate-500 text-sm mt-0.5 flex items-center gap-2">
            <span>{currentUser?.rolesWithCenter?.[0]?.medicalCenterName || 'Hệ Thống MedSched'}</span>
            <span>•</span>
            <span className="text-teal-700 font-semibold">Buồng Khám Bác Sĩ</span>
          </p>
        </div>

        {/* Action Controls & Emergency Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Thống kê nhanh */}
          <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex items-center gap-3 text-center text-xs">
            <div className="px-3 border-r border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Sẽ đến khám</span>
              <span className="text-lg font-bold text-blue-600">{upcomingCount} ca</span>
            </div>
            <div className="px-3 border-r border-slate-200">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Đang chờ</span>
              <span className="text-lg font-bold text-amber-600">{waitingCount} ca</span>
            </div>
            <div className="px-3">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Đã xong</span>
              <span className="text-lg font-bold text-emerald-600">{completedCount} ca</span>
            </div>
          </div>

          {/* 1. Nút Báo Cấp Cứu (Emergency Button) */}
          <button
            onClick={handleEmergencyToggle}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center gap-2 shadow-xs ${
              doctorStatus === 'EMERGENCY'
                ? 'bg-amber-500 text-white hover:bg-amber-600 animate-pulse'
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            }`}
            title="Bác sĩ bị điều động đi cấp cứu đột xuất"
          >
            {doctorStatus === 'EMERGENCY' ? (
              <>
                <Play size={14} />
                <span>Kết Thúc Cấp Cứu</span>
              </>
            ) : (
              <>
                <AlertTriangle size={14} className="text-red-600" />
                <span>Báo Ca Cấp Cứu</span>
              </>
            )}
          </button>

          {/* 2. Nút Báo Vắng Mặt / Tới Trễ */}
          {doctorStatus === 'LATE' ? (
            <button
              onClick={handleDoctorArrived}
              className="px-4 py-2.5 rounded-xl font-semibold text-xs bg-emerald-600 text-white hover:bg-emerald-700 transition cursor-pointer flex items-center gap-2"
            >
              <CheckCircle2 size={14} />
              <span>Bác Sĩ Đã Có Mặt</span>
            </button>
          ) : (
            <button
              onClick={() => setShowLateModal(true)}
              disabled={doctorStatus === 'EMERGENCY'}
              className="px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition cursor-pointer flex items-center gap-1.5"
              title="Báo tới trễ do hội chẩn hoặc kẹt việc"
            >
              <Clock size={14} />
              <span>Báo Tới Trễ</span>
            </button>
          )}

          {/* 3. Nút Điều Chuyển Hàng Đợi (Queue Transfer) */}
          <button
            onClick={() => setShowTransferModal(true)}
            disabled={doctorStatus === 'TRANSFERRED' || waitingCount === 0}
            className="px-3.5 py-2.5 rounded-xl font-semibold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Chuyển bệnh nhân sang phòng khám khác khi bác sĩ bận lâu"
          >
            <ArrowRightLeft size={14} />
            <span>Chuyển Bệnh Nhân</span>
          </button>

          {/* 4. Nút Mở/Dừng Phòng Khám */}
          <button
            onClick={() => setClinicActive(!clinicActive)}
            className={`px-4 py-2.5 rounded-xl font-semibold text-xs transition cursor-pointer flex items-center gap-2 ${
              clinicActive && doctorStatus === 'NORMAL'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
            }`}
          >
            <span className={`w-2.5 h-2.5 rounded-full ${clinicActive && doctorStatus === 'NORMAL' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span>{clinicActive && doctorStatus === 'NORMAL' ? 'Đang Mở Khám' : 'Tạm Dừng Khám'}</span>
          </button>
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
              <button
                onClick={() => setShowTransferModal(true)}
                className="px-4 py-2 bg-white text-red-700 border border-red-300 hover:bg-red-50 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
              >
                <ArrowRightLeft size={14} />
                <span>Chuyển Bệnh Nhân Sang Phòng Dự Phòng Ngay</span>
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

      {doctorStatus === 'TRANSFERRED' && (
        <div className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-4.5 flex items-start gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
            <ArrowRightLeft size={22} />
          </div>
          <div className="flex-1">
            <div className="font-bold text-indigo-900 text-sm">
              🔄 ĐÃ ĐIỀU CHUYỂN HÀNG ĐỢI SANG: {transferredRoom}
            </div>
            <p className="text-indigo-700 text-xs mt-0.5">
              Toàn bộ bệnh nhân đã được chuyển tiếp sang buồng khám phụ trách. Phòng khám hiện đang ở chế độ chờ chỉ định tiếp theo.
            </p>
          </div>
        </div>
      )}

      {notification && (
        <AlertMessage type="info" message={notification} onClose={() => setNotification(null)} />
      )}

      {/* ── Thanh Timer Đếm Ngược Ca Khám Hiện Tại ── */}
      {currentPatient?.status === 'IN_CONSULTATION' && doctorStatus === 'NORMAL' && (
        <div className={`rounded-2xl p-4 border-2 transition-colors ${
          isWarning
            ? 'bg-red-50 border-red-300'
            : 'bg-teal-50 border-teal-200'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Timer size={16} className={isWarning ? 'text-red-600' : 'text-teal-700'} />
              <span className={`text-xs font-bold uppercase ${isWarning ? 'text-red-700' : 'text-teal-800'}`}>
                Thời Gian Khám Ca Hiện Tại (Auto-Timeout Sau {MAX_CONSULTATION_SECONDS / 60} Phút)
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
              <div className={`text-lg font-black font-mono ${isWarning ? 'text-red-700 animate-pulse' : 'text-teal-800'}`}>
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-white/70 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${
                isWarning ? 'bg-red-500' : 'bg-teal-600'
              }`}
              style={{ width: `${Math.min(progressPercent, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] mt-1.5">
            <p className={isWarning ? 'text-red-600 font-bold' : 'text-teal-700'}>
              {isWarning
                ? `⚠️ Còn ${formatTime(timeRemaining)} — Hệ thống sẽ tự động hoàn tất ca và gọi bệnh nhân tiếp theo khi hết giờ.`
                : `Hệ thống tự động chuyển ca khi hết giờ để chống nghẽn hàng đợi nếu bác sĩ quên bấm kết thúc.`
              }
            </p>
            {autoAdmit && (
              <span className="text-teal-700 font-medium flex items-center gap-1">
                <Zap size={11} className="text-amber-500" /> Tự nhận ca tiếp theo: BẬT
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main 2-Column Clinical Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Waiting Queue (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Users size={18} className="text-teal-700" />
                <span>Hàng Đợi Khám Trước Cửa Phòng</span>
              </h3>
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
            <button
              type="button"
              onClick={handleCallNext}
              disabled={doctorStatus === 'EMERGENCY' || doctorStatus === 'TRANSFERRED' || queue.length === 0}
              className={`w-full mb-4 font-bold py-3.5 rounded-xl transition shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm ${
                doctorStatus === 'EMERGENCY' || doctorStatus === 'TRANSFERRED' || queue.length === 0
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                  : 'bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white shadow-teal-700/20'
              }`}
            >
              <Volume2 size={18} />
              <span>GỌI BỆNH NHÂN TIẾP THEO (CALL NEXT)</span>
            </button>

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
                        <div className={`w-9 h-9 rounded-xl font-extrabold flex items-center justify-center text-sm ${
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
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                              SẼ ĐẾN KHÁM
                            </span>
                            <button
                              type="button"
                              onClick={(e) => handleAdmitPatient(patient.id, e)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-teal-700 hover:bg-teal-800 text-white rounded-md transition shadow-xs cursor-pointer"
                              title="Tiếp nhận bệnh nhân vào buồng khám ngay"
                            >
                              Tiếp nhận
                            </button>
                          </div>
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
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                            <Pause size={10} /> TẠM HOÃN
                          </span>
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
                        <span className="block text-[10px] text-slate-400 font-mono mt-0.5">
                          {patient.checkInTime}
                        </span>
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
            {/* Header of Active Patient */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-800 flex items-center justify-center font-black text-lg">
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
                    CCCD: {currentPatient.cccd} • SĐT: {currentPatient.phone}
                  </p>
                </div>
              </div>

              <div className="text-xs text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                Mã Hẹn: <strong>{currentPatient.bookingCode}</strong>
              </div>
            </div>

            {/* Clinical Summary */}
            <div className="bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 border border-purple-200 rounded-2xl p-4.5 space-y-2.5">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-xs">
                <Sparkles size={16} className="text-purple-600" />
                <span>TÓM TẮT LÂM SÀNG BỆNH ÁN TỪ HỆ THỐNG:</span>
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

            {/* Chỉ có bệnh nhân ĐANG KHÁM (IN_CONSULTATION) mới có ô ghi chú và nút hoàn tất */}
            {currentPatient.status === 'IN_CONSULTATION' ? (
              <>
                {/* Clinical Diagnosis & Treatment Notes */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Ghi Chú Chẩn Đoán &amp; Chỉ Định Điều Trị Của Bác Sĩ:
                  </label>
                  <textarea
                    rows={4}
                    value={clinicalNotes}
                    onChange={(e) => setClinicalNotes(e.target.value)}
                    placeholder="Nhập kết quả nghe tim phổi, chỉ định đo điện tim ECG, kê đơn thuốc hoặc hẹn tái khám..."
                    className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-teal-600 focus:outline-none text-xs text-slate-800 font-mono leading-relaxed"
                  />
                </div>

                {/* Action Bar */}
                <div className="pt-2 space-y-2.5">
                  {/* Primary Action Button */}
                  <button
                    type="button"
                    onClick={handleRequestComplete}
                    disabled={doctorStatus === 'EMERGENCY' || doctorStatus === 'TRANSFERRED'}
                    className={`w-full font-bold py-3.5 rounded-xl transition shadow-md text-xs flex items-center justify-center gap-2 cursor-pointer ${
                      doctorStatus === 'EMERGENCY' || doctorStatus === 'TRANSFERRED'
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    <span>Hoàn Tất Ca Này &amp; Chuyển Ca Tiếp Theo</span>
                  </button>

                  {/* Secondary Exceptional Action Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* 1. Gia hạn ca khám */}
                    <button
                      type="button"
                      onClick={() => handleExtendConsultation(15)}
                      disabled={doctorStatus === 'EMERGENCY' || doctorStatus === 'TRANSFERRED'}
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
                      disabled={doctorStatus === 'EMERGENCY' || doctorStatus === 'TRANSFERRED'}
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
                      disabled={doctorStatus === 'EMERGENCY' || doctorStatus === 'TRANSFERRED'}
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
                    disabled={doctorStatus === 'EMERGENCY' || doctorStatus === 'TRANSFERRED'}
                    className="px-6 py-3.5 bg-gradient-to-r from-teal-700 to-emerald-700 hover:from-teal-800 hover:to-emerald-800 text-white font-bold rounded-xl text-xs transition shadow-md shadow-teal-700/20 flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <Volume2 size={16} />
                    <span>MỜI BỆNH NHÂN VÀO BUỒNG KHÁM (CALL IN)</span>
                  </button>
                </div>
              </div>
            ) : currentPatient.status === 'UPCOMING' ? (
              /* Trường hợp ca SẼ ĐẾN KHÁM (Chưa check-in) */
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-6 text-center space-y-4 my-2">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center mx-auto">
                  <UserCheck size={24} />
                </div>
                <div>
                  <h4 className="font-bold text-blue-900 text-sm">Lịch Hẹn Khám Trước (Chưa Check-in Quầy)</h4>
                  <p className="text-xs text-blue-700 mt-1 max-w-md mx-auto leading-relaxed">
                    Khung giờ hẹn: {currentPatient.appointmentTime || 'Hôm nay'}. 
                    Nếu bệnh nhân đã có mặt trước phòng, bác sĩ có thể bấm tiếp nhận để đưa vào hàng đợi khám ngay.
                  </p>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={(e) => handleAdmitPatient(currentPatient.id, e)}
                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 mx-auto cursor-pointer"
                  >
                    <UserCheck size={16} />
                    <span>TIẾP NHẬN BỆNH NHÂN VÀO BUỒNG KHÁM</span>
                  </button>
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

      {/* ── Modal Điều Chuyển Hàng Đợi (Queue Transfer Modal) ── */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-indigo-700 font-bold">
                <ArrowRightLeft size={20} />
                <span>Điều Chuyển Bệnh Nhân Sang Phòng Dự Phòng</span>
              </div>
              <button
                onClick={() => setShowTransferModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Khi bác sĩ bận ca mổ hoặc cấp cứu kéo dài, Y tá / Điều phối viên có thể chuyển toàn bộ {waitingCount} ca đang chờ sang bác sĩ trực dự phòng cùng chuyên khoa:
            </p>

            <div className="space-y-2.5">
              {[
                { name: 'Buồng Khám Dự Phòng 01', spec: 'Khoa Khám Bệnh Chuyên Khoa', slot: 'Sẵn sàng tiếp nhận' },
                { name: 'Buồng Khám Dự Phòng 02', spec: 'Khoa Khám Bệnh Chuyên Khoa', slot: 'Sẵn sàng tiếp nhận' }
              ].map((room, idx) => (
                <div
                  key={idx}
                  onClick={() => handleConfirmTransfer(room.name)}
                  className="p-3.5 rounded-xl border-2 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/50 transition cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-800 text-xs">{room.name}</div>
                    <div className="text-[11px] text-slate-500">{room.spec}</div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {room.slot}
                  </span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Xác Nhận Hoàn Tất Ca Khám (Chống Bấm Nhầm) ── */}
      {showCompleteModal && currentPatient && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-teal-800 font-bold">
                <CheckCircle2 size={20} className="text-emerald-600" />
                <span>Xác Nhận Hoàn Tất Ca Khám</span>
              </div>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Bệnh nhân:</span>
                <span className="font-bold text-slate-800 text-sm">{currentPatient.patientName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Số thứ tự:</span>
                <span className="font-bold text-teal-700 font-mono text-sm">#{currentPatient.queueNumber}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Mã vé hẹn:</span>
                <span className="font-bold text-slate-700 font-mono">{currentPatient.bookingCode}</span>
              </div>
              {clinicalNotes.trim() && (
                <div className="pt-2 border-t border-slate-200">
                  <span className="text-[11px] text-slate-500 font-medium block">Ghi chú chẩn đoán:</span>
                  <p className="text-xs text-slate-700 font-mono line-clamp-2 mt-0.5 italic">
                    &ldquo;{clinicalNotes.trim()}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bạn có chắc chắn muốn kết thúc ca khám này và tự động gọi bệnh nhân tiếp theo vào phòng?
            </p>

            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Hủy (Tiếp tục khám)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCompleteModal(false);
                  handleCallNext();
                }}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 size={15} />
                <span>Xác Nhận &amp; Gọi Ca Kế</span>
              </button>
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
    </div>
  );
}
