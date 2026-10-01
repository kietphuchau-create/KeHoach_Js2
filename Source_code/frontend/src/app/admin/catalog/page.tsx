import React from 'react';
import CatalogManager from '@/modules/admin/components/CatalogManager';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Quản lý Danh mục Khám bệnh | MedSched Admin',
  description: 'Quản lý cơ sở y tế, chuyên khoa và dịch vụ khám',
};

export default function CatalogPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm transition"
        >
          <ArrowLeft size={16} />
          <span>Quay lại Quản trị Người Dùng</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">Quyền: Quản Trị Viên (Admin)</span>
      </div>

      <CatalogManager />
    </div>
  );
}
