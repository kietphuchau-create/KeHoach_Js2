import React from 'react';
import ProfileView from '@/modules/profile/components/ProfileView';

export const metadata = {
  title: 'Hồ Sơ Cá Nhân | MedSched',
  description: 'Quản lý thông tin tài khoản, đổi mật khẩu và cập nhật hồ sơ chuyên môn',
};

export default function ProfilePage() {
  return <ProfileView />;
}
