import React from 'react';
import UserTable from '@/modules/admin/components/UserTable';

export const metadata = {
  title: 'Quản trị Người Dùng | MedSched Admin',
  description: 'Bảng quản lý tài khoản, phân quyền bác sĩ, lễ tân và người dùng hệ thống',
};

export default function AdminPage() {
  return <UserTable />;
}

