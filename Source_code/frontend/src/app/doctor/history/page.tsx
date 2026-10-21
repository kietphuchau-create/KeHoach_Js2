import React from 'react';
import DoctorHistoryView from '@/modules/doctor/components/DoctorHistoryView';

export const metadata = {
  title: 'Lịch Sử Khám Bệnh & Đơn Thuốc | MedSched Doctor Console',
  description: 'Tra cứu hồ sơ bệnh nhân đã khám và xem lại các đơn thuốc điện tử đã kê',
};

export default function DoctorHistoryPage() {
  return <DoctorHistoryView />;
}
