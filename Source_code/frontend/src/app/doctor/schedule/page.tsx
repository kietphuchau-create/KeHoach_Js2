import React from 'react';
import DoctorScheduleView from '@/modules/doctor/components/DoctorScheduleView';

export const metadata = {
  title: 'Quản Lý Lịch Trực & Khung Giờ Khám | MedSched Doctor',
  description: 'Phân hệ dành cho Bác sĩ chủ động điều phối ca trực tuần và mở/khóa các khung giờ khám bệnh',
};

export default function DoctorSchedulePage() {
  return <DoctorScheduleView />;
}
