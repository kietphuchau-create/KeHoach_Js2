import React from 'react';
import DoctorClinicView from '@/modules/doctor/components/DoctorClinicView';

export const metadata = {
  title: 'Buồng Khám Bệnh Chuyên Khoa | MedSched Doctor',
  description: 'Bàn khám bệnh chuyên khoa dành cho Bác sĩ, quản lý hàng đợi STT và bệnh án tóm tắt từ Spring AI',
};

export default function DoctorPage() {
  return <DoctorClinicView />;
}
