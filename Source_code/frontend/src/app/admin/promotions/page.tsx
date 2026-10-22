import React from 'react';
import type { Metadata } from 'next';
import PromotionManager from '@/modules/admin/components/PromotionManager';

export const metadata: Metadata = {
  title: 'Quản Lý Mã Khuyến Mãi & Voucher | MedSched Admin',
  description: 'Cấu hình và phát hành mã ưu đãi, voucher giảm tiền cọc cho bệnh nhân đặt lịch.',
};

export default function AdminPromotionsPage() {
  return (
    <div className="min-h-screen bg-mint-soft/30 py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <PromotionManager />
      </div>
    </div>
  );
}
