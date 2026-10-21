import { StatisticsDataset, TimeGranularity, UserRoleScope } from '../types';
import { api } from '@/shared/lib/api';

export interface FilterParams {
  role: UserRoleScope;
  granularity: TimeGranularity;
  selectedMetricId?: string;
  presetRange: 'TODAY' | 'LAST_7_DAYS' | 'LAST_30_DAYS' | 'THIS_MONTH' | 'CUSTOM';
  startDate?: string;
  endDate?: string;
  doctorFilter?: string; // cho Admin
}

export function getDateRangeLabel(range: string): string {
  switch (range) {
    case 'TODAY':
      return 'Hôm nay (Thời gian thực)';
    case 'LAST_7_DAYS':
      return '7 ngày gần nhất';
    case 'THIS_MONTH':
      return 'Tháng này (Tháng 10/2026)';
    case 'CUSTOM':
      return 'Khoảng tùy chọn tùy biến';
    case 'LAST_30_DAYS':
    default:
      return '30 ngày gần nhất';
  }
}

/**
 * Tạo dataset rỗng chuẩn mực khi chưa có dữ liệu thực tế từ Database.
 * TUYỆT ĐỐI không sinh số liệu giả (như 286 ca, 1428 ca, tên bác sĩ giả hay ICD giả).
 */
export function createEmptyDataset(params: FilterParams): StatisticsDataset {
  const isDoctor = params.role === 'ROLE_DOCTOR';
  const isStaff = params.role === 'ROLE_STAFF';

  const availableMetrics = isDoctor
    ? [
        { id: 'doctor_visits', label: 'Số Ca Đã Khám', unit: 'ca' },
        { id: 'avg_consult_time', label: 'Thời Gian Khám TB', unit: 'phút' },
        { id: 'prescriptions', label: 'Đơn Thuốc Đã Kê', unit: 'đơn' },
      ]
    : isStaff
    ? [
        { id: 'checkins', label: 'Lượt Tiếp Đón Tại Quầy', unit: 'lượt' },
        { id: 'avg_wait_time', label: 'Thời Gian Chờ Trung Bình', unit: 'phút' },
        { id: 'qr_rate', label: 'Tỷ Lệ Tự Quét QR Code', unit: '%' },
      ]
    : [
        { id: 'visits', label: 'Lượt Khám Hoàn Tất', unit: 'ca' },
        { id: 'revenue', label: 'Tổng Doanh Thu Viện Phí', unit: 'VNĐ' },
        { id: 'new_patients', label: 'Bệnh Nhân Mới', unit: 'người' },
        { id: 'no_show_rate', label: 'Tỷ Lệ Bỏ Hẹn (No-Show)', unit: '%' },
      ];

  const defaultMetric = isDoctor ? 'doctor_visits' : isStaff ? 'checkins' : 'visits';

  const kpiCards = isDoctor
    ? [
        {
          id: 'doctor_visits',
          label: 'Ca Khám Đã Hoàn Tất',
          value: '0',
          unit: 'ca',
          changePercent: 0,
          isPositiveGood: true,
          sparklineData: [0, 0],
          tooltip: 'Số ca bệnh nhân thực tế bác sĩ đã khám hoàn tất trong cơ sở dữ liệu',
        },
        {
          id: 'avg_consult_time',
          label: 'Thời Gian Khám Trung Bình',
          value: '0.0',
          unit: 'phút/ca',
          changePercent: 0,
          isPositiveGood: true,
          sparklineData: [0, 0],
          tooltip: 'Thời gian khám trung bình thực tế mỗi ca của bác sĩ',
        },
        {
          id: 'prescriptions',
          label: 'Đơn Thuốc Đã Kê & Ký Số',
          value: '0',
          unit: 'đơn',
          changePercent: 0,
          isPositiveGood: true,
          sparklineData: [0, 0],
          tooltip: 'Tổng số đơn thuốc điện tử do bác sĩ trực tiếp kê đơn',
        },
        {
          id: 'doc_return_rate',
          label: 'Tỷ Lệ Bệnh Nhân Đặt Trước',
          value: '0.0%',
          unit: '',
          changePercent: 0,
          isPositiveGood: true,
          sparklineData: [0, 0],
          tooltip: 'Tỷ lệ ca khám được bệnh nhân chủ động đặt trước qua website',
        },
      ]
    : isStaff
    ? [
        {
          id: 'checkins',
          label: 'Lượt Tiếp Đón Tại Quầy',
          value: '0',
          unit: 'lượt',
          changePercent: 0,
          isPositiveGood: true,
          sparklineData: [0, 0],
          tooltip: 'Số lượt bệnh nhân thực tế đã check-in tại quầy',
        },
        {
          id: 'avg_wait_time',
          label: 'Thời Gian Chờ Trung Bình',
          value: '0.0',
          unit: 'phút',
          changePercent: 0,
          isPositiveGood: true,
          sparklineData: [0, 0],
          tooltip: 'Thời gian chờ từ lúc tiếp đón đến khi vào phòng khám',
        },
        {
          id: 'qr_rate',
          label: 'Tỷ Lệ Tự Quét QR Code',
          value: '0.0%',
          unit: '',
          changePercent: 0,
          isPositiveGood: true,
          sparklineData: [0, 0],
          tooltip: 'Tỷ lệ bệnh nhân tự quét QR code',
        },
      ]
    : [
        {
          id: 'visits',
          label: 'Tổng Lượt Khám Hoàn Tất',
          value: '0',
          unit: 'ca',
          changePercent: 0,
          isPositiveGood: true,
          sparklineData: [0, 0],
          tooltip: 'Số ca bệnh nhân thực tế đã hoàn tất khám trong cơ sở dữ liệu',
        },
        {
          id: 'revenue',
          label: 'Tổng Doanh Thu Viện Phí & Thuốc',
          value: '0',
          unit: 'đ',
          changePercent: 0,
          isPositiveGood: true,
          sparklineData: [0, 0],
          tooltip: 'Tổng số tiền thực tế thu từ viện phí và thuốc',
        },
        {
          id: 'avg_duration',
          label: 'Thời Gian Khám Trung Bình',
          value: '0.0',
          unit: 'phút/ca',
          changePercent: 0,
          isPositiveGood: true,
          sparklineData: [0, 0],
          tooltip: 'Thời gian khám trung bình thực tế tại các buồng khám',
        },
        {
          id: 'online_booking_rate',
          label: 'Tỷ Lệ Đặt Hẹn Trước Qua Web',
          value: '0.0%',
          unit: '',
          changePercent: 0,
          isPositiveGood: true,
          sparklineData: [0, 0],
          tooltip: 'Tỷ lệ ca đặt lịch trước trực tuyến',
        },
        {
          id: 'no_show_rate',
          label: 'Tỷ Lệ Hủy / Vắng Mặt (No-Show)',
          value: '0.0%',
          unit: '',
          changePercent: 0,
          isPositiveGood: false,
          sparklineData: [0, 0],
          tooltip: 'Tỷ lệ ca bị hủy hoặc bệnh nhân vắng mặt',
        },
      ];

  return {
    roleScope: params.role,
    dateRangeLabel: getDateRangeLabel(params.presetRange),
    totalSessionsOrVisits: 0,
    timeGranularity: params.granularity,
    availableMetrics,
    selectedMetricId: params.selectedMetricId || defaultMetric,
    timeSeries: [],
    kpiCards,
    donutTitle: isDoctor
      ? 'Cơ Cấu Nguồn Bệnh Nhân'
      : isStaff
      ? 'Phương Thức Tiếp Đón'
      : 'Phân Bổ Bệnh Nhân Tái Khám vs Mới',
    donutSegments: [],
    breakdownTitle: isDoctor
      ? 'Chẩn Đoán Bệnh Án Thực Tế'
      : isStaff
      ? 'Lưu Lượng Theo Khung Giờ'
      : 'Bảng Xếp Hạng Năng Suất Bác Sĩ & Chuyên Khoa',
    breakdownHeaders: {
      rank: '#',
      name: isDoctor ? 'Chẩn Đoán / Bệnh Án' : isStaff ? 'Khung Giờ' : 'Bác Sĩ / Khoa',
      primary: isDoctor ? 'Số Ca' : isStaff ? 'Lượt Tiếp Đón' : 'Số Ca Khám',
      secondary: isDoctor ? 'Tỷ Lệ' : isStaff ? 'Mức Độ' : 'Thời Gian TB',
    },
    breakdownItems: [
      {
        id: 'empty',
        rank: 1,
        title: 'Chưa có dữ liệu ghi nhận',
        subtitle: 'Chưa có lượt khám thực tế nào trong khoảng thời gian đã chọn',
        primaryMetric: '0 ca',
        secondaryMetric: '0%',
        badge: 'Trống',
        badgeColor: 'bg-slate-100 text-slate-600 border-slate-200',
      },
    ],
    availableDoctors: [],
  };
}

export function getStatisticsData(params: FilterParams): StatisticsDataset {
  return createEmptyDataset(params);
}

/**
 * Tải dữ liệu thống kê trực tiếp 100% từ Database qua Backend Spring Boot API.
 * Nếu chưa tải được hoặc không có dữ liệu, trả về trạng thái rỗng trung thực (0 ca).
 */
export async function fetchStatisticsDataAsync(params: FilterParams): Promise<StatisticsDataset> {
  try {
    const res = await api.getStatisticsOverview({
      role: params.role,
      granularity: params.granularity,
      range: params.presetRange,
      metricId: params.selectedMetricId,
      doctorId: params.doctorFilter,
    });

    if (res && res.kpiCards && res.timeSeries) {
      return {
        roleScope: (res.roleScope as UserRoleScope) || params.role,
        dateRangeLabel: res.dateRangeLabel || getDateRangeLabel(params.presetRange),
        totalSessionsOrVisits: res.totalSessionsOrVisits || 0,
        timeGranularity: (res.timeGranularity as TimeGranularity) || params.granularity,
        availableMetrics: res.availableMetrics || [],
        selectedMetricId: res.selectedMetricId || params.selectedMetricId || 'visits',
        timeSeries: res.timeSeries || [],
        kpiCards: res.kpiCards || [],
        donutTitle: res.donutTitle || 'Cơ cấu phân bổ',
        donutSegments: res.donutSegments || [],
        breakdownTitle: res.breakdownTitle || 'Bảng xếp hạng chi tiết',
        breakdownHeaders: res.breakdownHeaders || { rank: '#', name: 'Hạng mục', primary: 'Số lượng' },
        breakdownItems: res.breakdownItems || [],
        availableDoctors: res.availableDoctors || [],
        selectedDoctorId: res.selectedDoctorId,
        selectedDoctorName: res.selectedDoctorName,
      };
    }
  } catch (err: any) {
    console.warn('Lỗi khi tải dữ liệu thống kê từ máy chủ Spring Boot:', err?.message || err);
  }

  // Luôn trả về dữ liệu rỗng trung thực nếu backend chưa có hoặc lỗi kết nối
  return createEmptyDataset(params);
}

// ─────────────────────────────────────────────────────────────
// XUẤT FILE BÁO CÁO CSV / EXCEL TƯƠNG THÍCH TIẾNG VIỆT CÓ BOM
// ─────────────────────────────────────────────────────────────
export function exportStatisticsCSV(dataset: StatisticsDataset) {
  const lines: string[] = [];

  // Thêm header tiêu đề báo cáo
  lines.push(`"BÁO CÁO THỐNG KÊ PHÒNG KHÁM MEDSCHED"`);
  lines.push(`"Phạm vi vai trò:","${dataset.roleScope}"`);
  lines.push(`"Khoảng thời gian:","${dataset.dateRangeLabel}"`);
  lines.push(`"Ngày trích xuất:","${new Date().toLocaleString('vi-VN')}"`);
  lines.push('');

  // 1. Chỉ số KPI
  lines.push(`"CHỈ SỐ TỔNG QUAN (KPI)"`);
  lines.push(`"Tên chỉ số","Giá trị","Đơn vị","Xu hướng so với kỳ trước"`);
  dataset.kpiCards.forEach((c) => {
    lines.push(`"${c.label}","${c.value}","${c.unit || ''}","${c.changePercent ? (c.changePercent > 0 ? '+' : '') + c.changePercent + '%' : ''}"`);
  });
  lines.push('');

  // 2. Dữ liệu dòng thời gian
  lines.push(`"DIỄN BIẾN THEO THỜI GIAN (${dataset.timeGranularity})"`);
  lines.push(`"Mốc thời gian","Chỉ số chính (${dataset.selectedMetricId})","Giá trị hiển thị"`);
  dataset.timeSeries.forEach((pt) => {
    lines.push(`"${pt.label}","${pt.value}","${pt.formattedValue || pt.value}"`);
  });
  lines.push('');

  // 3. Phân khúc Donut
  lines.push(`"CƠ CẤU PHÂN BỔ"`);
  lines.push(`"Phân khúc","Số lượng","Tỷ lệ (%)"`);
  dataset.donutSegments.forEach((seg) => {
    lines.push(`"${seg.label}","${seg.value}","${seg.percentage}%"`);
  });
  lines.push('');

  // 4. Bảng xếp hạng chi tiết
  lines.push(`"${dataset.breakdownTitle}"`);
  lines.push(`"Thứ hạng","Hạng mục","${dataset.breakdownHeaders.primary}","${dataset.breakdownHeaders.secondary || ''}"`);
  dataset.breakdownItems.forEach((item) => {
    lines.push(`"${item.rank}","${item.title} - ${item.subtitle || ''}","${item.primaryMetric}","${item.secondaryMetric || ''}"`);
  });

  const csvContent = '\uFEFF' + lines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `MedSched_BaoCao_${dataset.roleScope}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
