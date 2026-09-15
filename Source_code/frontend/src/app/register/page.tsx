import React from 'react';
import RegisterForm from '@/modules/auth/components/RegisterForm';

export const metadata = {
  title: 'Đăng Ký Tài Khoản | MedSched',
  description: 'Đăng ký tài khoản Bệnh nhân để đặt lịch khám và tiếp đón thông minh MedSched',
};

export default function RegisterPage() {
  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <RegisterForm />
    </div>
  );
}
