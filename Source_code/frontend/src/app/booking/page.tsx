import React from 'react';
import BookingForm from '@/modules/appointment/components/BookingForm';

export const metadata = {
  title: 'Đặt Lịch Khám Trực Tuyến | Medora',
  description: 'Đặt lịch khám trực tuyến với bác sĩ chuyên khoa và hỗ trợ Spring AI tóm tắt bệnh án',
};

export default function BookingPage() {
  return <BookingForm />;
}
