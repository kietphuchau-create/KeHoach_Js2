import React from 'react';
import type { Metadata } from 'next';
import ScheduleConfigManager from '@/modules/admin/components/ScheduleConfigManager';

export const metadata: Metadata = {
  title: 'Cấu Hình Khung Giờ Khám & Ca Trực | MedSched Admin',
  description: 'Quản trị thời gian ca sáng, ca chiều, ca tối, thời lượng slot khám và phân ca trực bác sĩ.',
};

export default function AdminScheduleConfigPage() {
  return (
    <div className="min-h-screen bg-mint-soft/30 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScheduleConfigManager />
      </div>
    </div>
  );
}
