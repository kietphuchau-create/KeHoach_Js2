import React, { Suspense } from 'react';
import BookingMethodSelector from '@/shared/components/BookingMethodModal/BookingMethodSelector';

export const metadata = {
  title: 'Chọn Phương Thức Đặt Lịch | MedSched',
  description: 'Chọn phương thức đặt lịch khám trực tiếp với bác sĩ chuyên khoa hoặc nhận tư vấn thông minh cùng trợ lý y tế AI MedSched.',
};

export default function BookingMethodPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-2 sm:p-6 py-2 sm:py-10">
      <Suspense fallback={<div className="text-center py-12 text-xs text-slate-400">Đang tải bảng chọn phương thức...</div>}>
        <BookingMethodSelector isModal={false} />
      </Suspense>
    </div>
  );
}
