import React from 'react';
import ReceptionHistoryView from '@/modules/reception/components/ReceptionHistoryView';

export const metadata = {
  title: 'Lịch Sử Tiếp Đón & Check-in Bệnh Nhân | MedSched Reception',
  description: 'Tra cứu hồ sơ tiếp đón bệnh nhân tại quầy lễ tân, quét QR vé hẹn, CCCD gắn chip và cấp STT khám',
};

export default function ReceptionHistoryPage() {
  return <ReceptionHistoryView />;
}
