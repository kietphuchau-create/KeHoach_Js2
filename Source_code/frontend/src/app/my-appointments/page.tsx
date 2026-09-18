import React from 'react';
import MyAppointmentsView from '@/modules/appointment/components/MyAppointmentsView';

export const metadata = {
  title: 'Phiếu Khám Của Tôi & Lịch Sử Cuộc Hẹn | MedSched',
  description: 'Tra cứu phiếu hẹn khám, mã QR check-in tại quầy tiếp đón MedSched và theo dõi tiến độ khám bệnh',
};

export default function MyAppointmentsPage() {
  return <MyAppointmentsView />;
}
