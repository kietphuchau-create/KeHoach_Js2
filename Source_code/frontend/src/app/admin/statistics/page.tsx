import React from 'react';
import StatisticsOverview from '@/modules/statistics/components/StatisticsOverview';

export const metadata = {
  title: 'Thống Kê Toàn Viện | MedSched Admin Portal',
  description: 'Trang phân tích tổng quan lượt khám, doanh thu và hiệu suất vận hành toàn diện cho Ban Quản trị',
};

export default function AdminStatisticsPage() {
  return <StatisticsOverview />;
}
