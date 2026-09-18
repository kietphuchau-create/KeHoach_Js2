import React from 'react';
import LoginForm from '@/modules/auth/components/LoginForm';

export const metadata = {
  title: 'Đăng Nhập | Medora',
  description: 'Đăng nhập vào hệ thống Medora dành cho Bệnh nhân, Bác sĩ, Lễ tân và Quản trị viên',
};

export default function LoginPage() {
  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center p-4">
      <LoginForm />
    </div>
  );
}
