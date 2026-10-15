import React from 'react';
import ReceptionView from '@/modules/reception/components/ReceptionView';

export const metadata = {
  title: 'Quầy Tiếp Đón Y Tế Siêu Tốc | Medora',
  description: 'Tiếp nhận bệnh nhân tự động qua mã QR vé hẹn hoặc CCCD gắn chip',
};

export default function ReceptionPage() {
  return <ReceptionView />;
}
