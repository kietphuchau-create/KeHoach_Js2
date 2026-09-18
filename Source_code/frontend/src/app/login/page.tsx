import React from 'react';
import LoginForm from '@/modules/auth/components/LoginForm';

export const metadata = {
  title: 'Đăng Nhập | MedSched',
  description: 'Đăng nhập vào hệ thống MedSched dành cho Bệnh nhân, Bác sĩ, Lễ tân và Quản trị viên',
};

export default function LoginPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-2 sm:py-4">
      <LoginForm />
    </div>
  );
}
