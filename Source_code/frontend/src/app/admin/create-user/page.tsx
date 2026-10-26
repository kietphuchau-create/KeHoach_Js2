'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Stethoscope, UserCheck } from 'lucide-react';
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
      <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Thêm Thành Viên Nội Bộ</h1>
          <p className="text-slate-500 text-sm mt-1">
            Cấp tài khoản đăng nhập hệ thống cho Đội ngũ Bác sĩ chuyên khoa và Nhân viên Lễ tân.
          </p>
        </div>

        {/* Tab selection */}
        <div className="flex items-center gap-2 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('staff')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs ${
              activeTab === 'staff'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <UserCheck size={16} />
            <span>Thêm Nhân Viên Lễ Tân</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('doctor')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer border shadow-2xs ${
              activeTab === 'doctor'
                ? 'bg-teal-primary text-white border-teal-primary shadow-xs'
                : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
            }`}
          >
            <Stethoscope size={16} />
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
