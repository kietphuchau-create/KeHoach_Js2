'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Stethoscope, UserCheck } from 'lucide-react';
import { api, getAuthToken } from '@/shared/lib/api';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import CreateStaffForm from '@/modules/admin/components/CreateStaffForm';
import CreateDoctorForm from '@/modules/admin/components/CreateDoctorForm';

export default function CreateUserPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'staff' | 'doctor'>('staff');
  const [medicalCenters, setMedicalCenters] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [fetchingData, setFetchingData] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    async function loadData() {
      try {
        const [centers, specs] = await Promise.all([
          api.getMedicalCenters().catch(() => []),
          api.getSpecialties().catch(() => []),
        ]);
        setMedicalCenters(centers);
        setSpecialties(specs);
      } catch (err) {
        console.error('Lỗi khi tải danh mục cơ sở/chuyên khoa:', err);
      } finally {
        setFetchingData(false);
      }
    }
    loadData();
  }, [router]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-sm transition"
        >
          <ArrowLeft size={16} />
          <span>Quay lại Quản trị</span>
        </Link>
        <span className="text-xs text-slate-400 font-mono">Quyền: Quản Trị Viên (Admin)</span>
      </div>

      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Thêm Thành Viên Nội Bộ</h1>
          <p className="text-slate-500 text-sm mt-1">
            Cấp tài khoản đăng nhập hệ thống cho Đội ngũ Bác sĩ chuyên khoa và Nhân viên Lễ tân.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
              activeTab === 'staff'
                ? 'bg-white text-emerald-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck size={18} />
            <span>Thêm Nhân Viên Lễ Tân</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('doctor')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition cursor-pointer ${
              activeTab === 'doctor'
                ? 'bg-white text-blue-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Stethoscope size={18} />
            <span>Thêm Bác Sĩ Chuyên Khoa</span>
          </button>
        </div>

        {fetchingData ? (
          <LoadingSpinner message="Đang tải danh mục cơ sở y tế và chuyên khoa..." />
        ) : (
          <>
            {activeTab === 'staff' && (
              <CreateStaffForm medicalCenters={medicalCenters} />
            )}
            {activeTab === 'doctor' && (
              <CreateDoctorForm medicalCenters={medicalCenters} specialties={specialties} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
