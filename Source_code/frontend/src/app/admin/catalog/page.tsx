import React from 'react';
import CatalogManager from '@/modules/admin/components/CatalogManager';

export const metadata = {
  title: 'Quản lý Danh mục Khám bệnh | MedSched Admin',
  description: 'Quản lý cơ sở y tế, chuyên khoa và dịch vụ khám',
};

export default function CatalogPage() {
  return <CatalogManager />;
}
