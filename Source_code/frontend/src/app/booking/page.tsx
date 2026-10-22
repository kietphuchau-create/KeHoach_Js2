import React from 'react';
import BookingForm from '@/modules/appointment/components/BookingForm';

export const metadata = {
  title: 'Đặt Lịch Khám Trực Tuyến | MedSched',
  description: 'Đặt lịch khám trực tuyến với bác sĩ chuyên khoa MedSched',
};

export default function BookingPage() {
  return <BookingForm />;
}
