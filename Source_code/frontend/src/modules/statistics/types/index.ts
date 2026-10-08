export type TimeGranularity = 'HOURLY' | 'DAY' | 'WEEK' | 'MONTH';

export type UserRoleScope = 'ROLE_ADMIN' | 'ROLE_DOCTOR' | 'ROLE_STAFF';

export interface TimeSeriesPoint {
  label: string; // e.g. "08:00", "01/10", "Tuần 40", "Tháng 9"
  timestamp: string; // ISO date or time
  value: number;
  formattedValue?: string;
  secondaryValue?: number; // e.g. previous period comparison
}

export interface MetricCardData {
  id: string;
  label: string;
  value: string | number;
  unit?: string;
  changePercent?: number; // e.g. +14.2%
  isPositiveGood?: boolean;
  sparklineData: number[];
  tooltip?: string;
}

export interface DonutSegment {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

export interface BreakdownItem {
  id: string;
  rank: number;
  title: string;
  subtitle?: string;
  primaryMetric: string | number;
  secondaryMetric?: string | number;
  badge?: string;
  badgeColor?: string;
}

export interface DoctorOption {
  id: string;
  name: string;
  specialty?: string;
  room?: string;
}

export interface StatisticsDataset {
  roleScope: UserRoleScope;
  dateRangeLabel: string;
  totalSessionsOrVisits: number;
  timeGranularity: TimeGranularity;
  availableMetrics: { id: string; label: string; unit: string }[];
  selectedMetricId: string;
  timeSeries: TimeSeriesPoint[];
  kpiCards: MetricCardData[];
  donutTitle: string;
  donutSegments: DonutSegment[];
  breakdownTitle: string;
  breakdownHeaders: { rank: string; name: string; primary: string; secondary?: string };
  breakdownItems: BreakdownItem[];
  availableDoctors?: DoctorOption[];
  selectedDoctorId?: string;
  selectedDoctorName?: string;
}
