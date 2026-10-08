import React from 'react';
import StatisticsOverview from '@/modules/statistics/components/StatisticsOverview';

export const metadata = {
  title: 'Thống Kê & Báo Cáo Vận Hành | MedSched Analytics',
  description: 'Trang phân tích tổng quan lượt khám, doanh thu và hiệu suất vận hành theo chuẩn Google Analytics',
};

export default function StatisticsPage() {
  return (
    <main className="min-h-screen bg-slate-50/60 py-6 px-4 sm:px-6 lg:px-8">
      <StatisticsOverview />
    </main>
  );
}
