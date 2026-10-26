'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Shield, 
  Stethoscope, 
  UserCheck, 
  Clock, 
  Filter, 
  RefreshCw, 
  Layers, 
  HelpCircle,
  FileSpreadsheet,
  Lock,
  Bot
} from 'lucide-react';
import { getAuthUser, getAuthToken, api } from '@/shared/lib/api';
import LoginForm from '@/modules/auth/components/LoginForm';
import UniversalAiAssistantModal from '@/shared/components/Feedback/UniversalAiAssistantModal';
import { TimeGranularity, UserRoleScope } from '../types';
import { getStatisticsData, fetchStatisticsDataAsync, exportStatisticsCSV } from '../services/statisticsService';
import AnalyticsLineChart from './AnalyticsLineChart';
import MetricCard from './MetricCard';
import DonutChart from './DonutChart';
import BreakdownTable from './BreakdownTable';

export default function StatisticsOverview() {
  const router = useRouter();

  // State xác thực & vai trò
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeRole, setActiveRole] = useState<UserRoleScope>('ROLE_ADMIN');
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const isAdmin = userRoles.includes('ROLE_ADMIN');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Bộ lọc thời gian & tham số
  const [granularity, setGranularity] = useState<TimeGranularity>('DAY');
  const [presetRange, setPresetRange] = useState<'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('LAST_30_DAYS');
  const [selectedMetricId, setSelectedMetricId] = useState<string>('visits');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  // Thống kê ca trực & khung giờ khám (Tổng số ca trực, Tổng khung giờ, Khung giờ còn trống, Đã có người đặt)
  const [scheduleStats, setScheduleStats] = useState({
    totalShifts: 0,
    totalSlotsCount: 0,
    totalAvailableCount: 0,
    totalBookedCount: 0,
    loading: false,
  });

  // Dữ liệu dataset
  const [dataset, setDataset] = useState(() =>
    getStatisticsData({
      role: 'ROLE_ADMIN',
      granularity: 'DAY',
      presetRange: 'LAST_30_DAYS',
      selectedMetricId: 'visits',
    })
  );

  useEffect(() => {
    const token = getAuthToken();
    const user = getAuthUser();
    const roles: string[] = user?.roles || [];
    
    // Auth Guard: Chỉ cho phép Quản trị viên, Bác sĩ hoặc Lễ tân xem báo cáo vận hành
    const hasPrivilege = Boolean(
      token && user && (
        roles.includes('ROLE_ADMIN') || 
        roles.includes('ROLE_DOCTOR') || 
        roles.includes('ROLE_STAFF')
      )
    );

    if (!hasPrivilege) {
      setIsAuthenticated(false);
      setAuthChecked(true);
      return;
    }

    setIsAuthenticated(true);
    setCurrentUser(user);
    setUserRoles(roles);

    if (roles.includes('ROLE_ADMIN')) {
      setActiveRole('ROLE_ADMIN');
      setSelectedMetricId('visits');
    } else if (roles.includes('ROLE_DOCTOR')) {
      setActiveRole('ROLE_DOCTOR');
      setSelectedMetricId('doctor_visits');
    } else if (roles.includes('ROLE_STAFF')) {
      setActiveRole('ROLE_STAFF');
      setSelectedMetricId('checkins');
    }
    setAuthChecked(true);
  }, []);

  // Tải dữ liệu thật từ Backend mỗi khi đổi bộ lọc (CHỈ fetch khi đã đăng nhập hợp lệ)
  useEffect(() => {
    if (!isAuthenticated) return;

    let isCancelled = false;
    setIsLoading(true);

    fetchStatisticsDataAsync({
      role: activeRole,
      granularity,
      presetRange,
      selectedMetricId,
      doctorFilter: (isAdmin && activeRole === 'ROLE_DOCTOR') ? selectedDoctorId : undefined,
    })
      .then((data) => {
        if (!isCancelled) {
          setDataset(data);
          if (isAdmin && activeRole === 'ROLE_DOCTOR' && !selectedDoctorId && data.selectedDoctorId) {
            setSelectedDoctorId(data.selectedDoctorId);
          }
        }
      })
      .catch((err) => {
        console.warn('Lỗi tải thống kê:', err);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, activeRole, granularity, presetRange, selectedMetricId, selectedDoctorId, isAdmin]);

  // Đồng bộ số liệu Ca Trực & Khung Giờ Khám Bệnh thực tế từ lịch trực bác sĩ
  useEffect(() => {
    if (!isAuthenticated) return;
    let isCancelled = false;
    setScheduleStats((prev) => ({ ...prev, loading: true }));

    const targetDocId = (isAdmin && activeRole === 'ROLE_DOCTOR') ? selectedDoctorId : undefined;

    api.getDoctorSchedules(targetDocId)
      .then((schedules) => {
        if (isCancelled || !Array.isArray(schedules)) return;

        const totalShifts = schedules.length;
        const totalSlotsCount = schedules.reduce((acc, s) => acc + (s.totalSlots || 0), 0);
        const totalBookedCount = schedules.reduce((acc, s) => acc + (s.bookedSlots || 0), 0);

        const now = new Date();
        const isSlotPast = (workDate: string, startTime: string) => {
          if (!workDate || !startTime) return false;
          const [h, m] = startTime.split(':').map(Number);
          const slotDate = new Date(`${workDate}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`);
          return slotDate <= now;
        };

        const totalAvailableCount = schedules.reduce((acc, s) => {
          if (!s.slots || s.slots.length === 0) return acc + (s.availableSlots || 0);
          const validAvailable = s.slots.filter(
            (slot: any) => slot.status === 'AVAILABLE' && !isSlotPast(s.workDate, slot.startTime)
          ).length;
          return acc + validAvailable;
        }, 0);

        setScheduleStats({
          totalShifts,
          totalSlotsCount,
          totalAvailableCount,
          totalBookedCount,
          loading: false,
        });
      })
      .catch((err) => {
        if (!isCancelled) {
          console.warn('Lỗi tải thống kê ca trực:', err);
          setScheduleStats((prev) => ({ ...prev, loading: false }));
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [isAuthenticated, activeRole, selectedDoctorId, isAdmin]);

  const handleMetricCardClick = (metricId: string) => {
    // Nếu metric này có trong danh sách đồ thị thì đổi
    const exists = dataset.availableMetrics.some((m) => m.id === metricId);
    if (exists) {
      setSelectedMetricId(metricId);
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    try {
      exportStatisticsCSV(dataset);
    } finally {
      setTimeout(() => setIsExporting(false), 600);
    }
  };

  if (!authChecked) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <RefreshCw size={15} className="animate-spin text-pine-teal" />
          <span>Đang kiểm tra quyền truy cập báo cáo y tế...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-10 sm:py-16 animate-in fade-in duration-200 max-w-md mx-auto px-4">
        <div className="mb-6 text-center">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200 mb-3 shadow-xs">
            <Lock size={13} />
            <span>Yêu Cầu Đăng Nhập Quản Trị / Nhân Sự</span>
          </span>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Báo Cáo Thống Kê & Vận Hành</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Dữ liệu doanh thu viện phí, lưu lượng khám và năng suất nhân sự chỉ dành riêng cho Quản trị viên (Admin) và Nhân viên y tế. Vui lòng đăng nhập tài khoản có thẩm quyền để truy cập.
          </p>
        </div>
        <Suspense fallback={<div className="text-center py-10 text-xs text-slate-400">Đang nạp biểu mẫu đăng nhập...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* ── Thanh Điều Khiển: Phạm Vi Phân Tích & Bộ Lọc Thời Gian / Nút Báo Cáo ── */}
      <div className="bg-white p-3.5 px-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Bên trái: Phạm vi phân tích */}
        {isAdmin ? (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-slate-700">
              <span className="p-1.5 rounded-lg bg-teal-50 text-teal-primary border border-teal-100">
                <Filter size={14} />
              </span>
              <span>Phạm vi phân tích:</span>
            </div>

            <div className="relative">
              <select
                value={activeRole === 'ROLE_DOCTOR' ? (selectedDoctorId || dataset.selectedDoctorId || '50b2c3d4-0001') : activeRole}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'ROLE_ADMIN') {
                    setActiveRole('ROLE_ADMIN');
                    setSelectedDoctorId('');
                    setSelectedMetricId('visits');
                  } else if (val === 'ROLE_STAFF') {
                    setActiveRole('ROLE_STAFF');
                    setSelectedDoctorId('');
                    setSelectedMetricId('checkins');
                  } else {
                    setActiveRole('ROLE_DOCTOR');
                    setSelectedDoctorId(val);
                    setSelectedMetricId('doctor_visits');
                  }
                }}
                className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 font-bold text-slate-800 text-xs rounded-xl pl-3.5 pr-8 py-2 focus:ring-2 focus:ring-teal-primary focus:outline-none transition cursor-pointer shadow-xs"
              >
                <option value="ROLE_ADMIN">🏥 Toàn Viện (Ban Giám Đốc / Toàn Bộ Phòng Khám)</option>
                <optgroup label="🩺 Báo cáo theo Bác Sĩ (Số liệu cá nhân thực tế)">
                  {(dataset.availableDoctors && dataset.availableDoctors.length > 0 ? dataset.availableDoctors : [
                    { id: '50b2c3d4-0001', name: 'BS.CKII Nguyễn Minh Anh', specialty: 'Khoa Da Liễu', room: 'P.205' },
                    { id: '50b2c3d4-0002', name: 'PGS.TS Trần Văn Hùng', specialty: 'Khoa Nội Tổng Quát', room: 'P.208' },
                  ]).map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      👨‍⚕️ {doc.name} {doc.specialty ? `— ${doc.specialty}` : ''} {doc.room ? `(${doc.room})` : ''}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="📋 Quầy Tiếp Đón & Thu Ngân">
                  <option value="ROLE_STAFF">Quầy Lễ Tân (Check-in sảnh chờ & Thu ngân ca trực)</option>
                </optgroup>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                <Layers size={13} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 font-bold text-slate-800">
            <span className="p-1.5 rounded-lg bg-teal-50 text-teal-primary border border-teal-100">
              <BarChart3 size={15} />
            </span>
            <span>
              {activeRole === 'ROLE_DOCTOR' && `Báo Cáo Năng Suất - ${currentUser?.fullName || dataset.selectedDoctorName || 'Bác Sĩ'}`}
              {activeRole === 'ROLE_STAFF' && 'Báo Cáo Tiếp Đón & Thu Ngân Ca Trực'}
            </span>
          </div>
        )}

        {/* Bên phải: Bộ lọc 30 ngày, Trợ lý AI và Xuất báo cáo (Đem xuống ngang hàng) */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Bộ lọc thời gian */}
          <div className="relative">
            <select
              value={presetRange}
              onChange={(e: any) => setPresetRange(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100/80 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl px-3.5 py-2 pr-8 focus:ring-2 focus:ring-teal-primary focus:outline-none transition cursor-pointer shadow-xs"
            >
              <option value="TODAY">📅 Hôm nay (Thời gian thực)</option>
              <option value="LAST_7_DAYS">📅 7 ngày gần nhất</option>
              <option value="LAST_30_DAYS">📅 30 ngày gần nhất</option>
              <option value="THIS_MONTH">📅 Tháng này (Tháng 10/2026)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <Calendar size={13} />
            </div>
          </div>


          {/* Nút Xuất Báo Cáo CSV / Excel */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 transition cursor-pointer shadow-xs"
            title="Xuất dữ liệu thống kê ra file Excel / CSV có dấu tiếng Việt"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span>{isExporting ? 'Đang Xuất...' : 'Xuất Báo Cáo'}</span>
          </button>
        </div>
      </div>

      {/* ── Thống kê ca trực & khung giờ khám bệnh (Giải phóng 4 Card độc lập, bỏ khung bọc ngoài) ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-teal-50 border border-teal-200 text-teal-800 flex items-center justify-center font-bold">
              <Calendar size={15} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>Thống Kê Ca Trực &amp; Khung Giờ Khám Bệnh</span>
                {scheduleStats.loading && <RefreshCw size={12} className="animate-spin text-teal-600" />}
              </h2>
              <p className="text-[11px] text-slate-500">
                Tổng hợp số ca trực, tổng khung giờ và phân bổ slot khám khả dụng theo thời gian thực
              </p>
            </div>
          </div>
          <Link
            href="/doctor/schedule"
            className="text-teal-700 hover:text-teal-900 text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>Quản lý lịch trực</span>
            <span>&rarr;</span>
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng số ca trực</div>
            <div className="text-xl sm:text-2xl font-black text-slate-800 mt-1 font-mono">{scheduleStats.totalShifts} ca</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Ca làm việc đã đăng ký</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-teal-200 transition">
            <div className="text-[11px] font-bold text-teal-700 uppercase tracking-wider">Tổng khung giờ</div>
            <div className="text-xl sm:text-2xl font-black text-teal-800 mt-1 font-mono">{scheduleStats.totalSlotsCount} slots</div>
            <div className="text-[10px] text-teal-600/70 mt-0.5">Tổng số lượt khám mở</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-emerald-200 transition">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Khung giờ còn trống</div>
            <div className="text-xl sm:text-2xl font-black text-emerald-700 mt-1 font-mono">{scheduleStats.totalAvailableCount} slots</div>
            <div className="text-[10px] text-emerald-600/70 mt-0.5">Khả dụng đón bệnh nhân</div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-blue-200 transition">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Đã có người đặt</div>
            <div className="text-xl sm:text-2xl font-black text-blue-700 mt-1 font-mono">{scheduleStats.totalBookedCount} bệnh nhân</div>
            <div className="text-[10px] text-blue-600/70 mt-0.5">Lịch hẹn đã xác nhận</div>
          </div>
        </div>
      </div>

      {/* ── 1. BIỂU ĐỒ XU HƯỚNG DÒNG THỜI GIAN CHÍNH (GOOGLE ANALYTICS TREND LINE) ── */}
      <AnalyticsLineChart
        data={dataset.timeSeries}
        metricLabel={dataset.availableMetrics.find((m) => m.id === selectedMetricId)?.label || 'Lượt Khám'}
        metricUnit={dataset.availableMetrics.find((m) => m.id === selectedMetricId)?.unit}
        granularity={granularity}
        onGranularityChange={setGranularity}
        availableMetrics={dataset.availableMetrics}
        selectedMetricId={selectedMetricId}
        onMetricChange={setSelectedMetricId}
      />

      {/* ── 2. HÀNG THẺ CHỈ SỐ KPI TỔNG QUAN (SCORECARDS KÈM MINI SPARKLINE) ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Các Chỉ Số Trọng Yếu (Key Performance Indicators)
          </h2>
          <span className="text-[11px] text-slate-400">
            Bấm vào thẻ để đổi biểu đồ phía trên
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3.5">
          {dataset.kpiCards.map((card) => (
            <MetricCard
              key={card.id}
              card={card}
              isSelected={selectedMetricId === card.id}
              onClick={() => handleMetricCardClick(card.id)}
            />
          ))}
        </div>
      </div>

      {/* ── 3. KHU VỰC PHÂN TÍCH ĐA CHIỀU (DONUT CHART & BẢNG XẾP HẠNG) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Cột trái: Biểu đồ tròn Donut Chart (Bệnh nhân Mới vs Tái khám / Phương thức thanh toán) */}
        <div className="lg:col-span-5">
          <DonutChart
            title={dataset.donutTitle}
            segments={dataset.donutSegments}
          />
        </div>

        {/* Cột phải: Bảng xếp hạng / Top hiệu suất (Bác sĩ, Chẩn đoán, Giờ cao điểm) */}
        <div className="lg:col-span-7">
          <BreakdownTable
            title={dataset.breakdownTitle}
            headers={dataset.breakdownHeaders}
            items={dataset.breakdownItems}
          />
        </div>
      </div>

      {/* ── Trợ Lý AI Báo Cáo MedSched (Chuẩn MCP) ── */}
      <UniversalAiAssistantModal
        isOpen={showAiModal}
        onClose={() => setShowAiModal(false)}
        defaultRole="ADMIN"
      />
    </div>
  );
}
