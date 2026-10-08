'use client';

import React, { useState, useEffect } from 'react';
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
  FileSpreadsheet
} from 'lucide-react';
import { getAuthUser, getAuthToken } from '@/shared/lib/api';
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
  const [authChecked, setAuthChecked] = useState(false);

  // Bộ lọc thời gian & tham số
  const [granularity, setGranularity] = useState<TimeGranularity>('DAY');
  const [presetRange, setPresetRange] = useState<'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM'>('LAST_30_DAYS');
  const [selectedMetricId, setSelectedMetricId] = useState<string>('visits');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

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
    setCurrentUser(user);

    if (user && user.roles) {
      setUserRoles(user.roles);
      if (user.roles.includes('ROLE_ADMIN')) {
        setActiveRole('ROLE_ADMIN');
        setSelectedMetricId('visits');
      } else if (user.roles.includes('ROLE_DOCTOR')) {
        setActiveRole('ROLE_DOCTOR');
        setSelectedMetricId('doctor_visits');
      } else if (user.roles.includes('ROLE_STAFF')) {
        setActiveRole('ROLE_STAFF');
        setSelectedMetricId('checkins');
      }
    } else {
      setActiveRole('ROLE_ADMIN');
      setSelectedMetricId('visits');
    }
    setAuthChecked(true);
  }, []);

  // Tải dữ liệu thật từ Backend (hoặc fallback thông minh) mỗi khi đổi bộ lọc
  useEffect(() => {
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
  }, [activeRole, granularity, presetRange, selectedMetricId, selectedDoctorId, isAdmin]);

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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-in fade-in duration-150">
      {/* ── Thanh Context Bar kiểu Google Analytics (Màu Cam / Header Tối Giản) ── */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span className="text-amber-600 font-bold">medsched.hospital.vn</span>
            <span>&rsaquo;</span>
            <span className="text-slate-700">Phân Hệ Thống Kê &amp; Báo Cáo</span>
            <span>&rsaquo;</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
              AUDIENCE OVERVIEW
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <BarChart3 className="text-sky-600" size={26} />
            <span>
              {activeRole === 'ROLE_ADMIN' && 'Tổng Quan Hoạt Động Toàn Viện'}
              {activeRole === 'ROLE_DOCTOR' && (
                isAdmin 
                  ? `Báo Cáo Năng Suất - ${dataset.selectedDoctorName || 'Bác Sĩ'}`
                  : `Báo Cáo Năng Suất Cá Nhân - ${currentUser?.fullName || dataset.selectedDoctorName || 'Bác Sĩ'}`
              )}
              {activeRole === 'ROLE_STAFF' && 'Báo Cáo Tiếp Đón & Thu Ngân Ca Trực'}
            </span>
            {isLoading && (
              <RefreshCw size={16} className="text-sky-500 animate-spin ml-1" />
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {activeRole === 'ROLE_ADMIN' && 'Số liệu toàn diện về lưu lượng bệnh nhân, doanh thu viện phí và hiệu suất bác sĩ.'}
            {activeRole === 'ROLE_DOCTOR' && (
              isAdmin
                ? `Chi tiết các ca khám hoàn tất, đơn thuốc đã kê và thời gian trung bình của ${dataset.selectedDoctorName || 'bác sĩ'}.`
                : `Theo dõi tiến độ khám cá nhân, thời gian trung bình/ca và các bệnh lý bạn đã kê đơn trong kỳ.`
            )}
            {activeRole === 'ROLE_STAFF' && 'Kiểm soát số lượng check-in sảnh chờ, ca vãng lai và kết toán tiền thu ca trực.'}
          </p>
        </div>

        {/* Thanh Điều Khiển Bộ Lọc Thời Gian Google Analytics (Date Picker Preset) */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          <div className="relative">
            <select
              value={presetRange}
              onChange={(e: any) => setPresetRange(e.target.value)}
              className="appearance-none bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl px-3.5 py-2.5 pr-8 focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer shadow-2xs"
            >
              <option value="TODAY">📅 Hôm nay (Thời gian thực)</option>
              <option value="LAST_7_DAYS">📅 7 ngày gần nhất</option>
              <option value="LAST_30_DAYS">📅 30 ngày gần nhất</option>
              <option value="THIS_MONTH">📅 Tháng này (Tháng 10/2026)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
              <Calendar size={14} />
            </div>
          </div>

          {/* Nút Xuất Báo Cáo CSV / Excel */}
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border border-slate-300 transition cursor-pointer shadow-2xs"
            title="Xuất dữ liệu thống kê ra file Excel / CSV có dấu tiếng Việt"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>{isExporting ? 'Đang Xuất...' : 'Xuất Báo Cáo'}</span>
          </button>
        </div>
      </div>

      {/* ── Bộ Chọn Phạm Vi Báo Cáo (Scope Selector Cho Ban Quản Trị / Demo) ── */}
      {isAdmin && (
        <div className="bg-gradient-to-r from-sky-50/80 via-white to-sky-50/80 border border-sky-200/90 rounded-2xl p-3.5 px-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 font-bold text-slate-800">
              <span className="p-1.5 rounded-lg bg-sky-100 text-sky-700">
                <Filter size={15} />
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
                className="appearance-none bg-white hover:bg-slate-50 border border-sky-300 font-bold text-slate-800 text-xs rounded-xl pl-3.5 pr-8 py-2 focus:ring-2 focus:ring-sky-500 focus:outline-none transition cursor-pointer shadow-2xs"
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

          <div className="flex items-center gap-2 text-xs">
            {activeRole === 'ROLE_DOCTOR' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Đang xem dữ liệu thực của <strong>{dataset.selectedDoctorName || 'bác sĩ'}</strong>
              </span>
            ) : activeRole === 'ROLE_ADMIN' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                Tổng hợp tất cả chuyên khoa &amp; luồng khám
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Thống kê quầy tiếp đón bệnh nhân
              </span>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
}
