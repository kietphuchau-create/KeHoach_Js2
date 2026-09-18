'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Stack from '@mui/material/Stack';

import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import PersonAddIcon from '@mui/icons-material/PersonAddRounded';
import MedicalServicesIcon from '@mui/icons-material/MedicalServicesRounded';

import { api, getAuthToken } from '@/shared/lib/api';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import CreateStaffForm from '@/modules/admin/components/CreateStaffForm';
import CreateDoctorForm from '@/modules/admin/components/CreateDoctorForm';
import { medoraColors } from '@/shared/theme/theme';

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
    <Stack spacing={3} sx={{ maxWidth: 800, mx: 'auto' }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Button
          component={Link}
          href="/admin"
          startIcon={<ArrowBackIcon />}
          color="inherit"
          sx={{ fontWeight: 600 }}
        >
          Quay lại Quản trị
        </Button>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
          Quyền: Quản Trị Viên (Admin)
        </Typography>
      </Box>

      <Paper elevation={0} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, border: `1px solid ${medoraColors.border}`, backgroundColor: '#ffffff' }}>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Thêm Thành Viên Nội Bộ
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Cấp tài khoản đăng nhập hệ thống cho Đội ngũ Bác sĩ chuyên khoa và Nhân viên Lễ tân.
          </Typography>
        </Box>

        {/* Tab selection */}
        <Paper elevation={0} sx={{ backgroundColor: '#F1F5F9', p: 0.5, borderRadius: 3, mb: 4 }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => setActiveTab(val)}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.875rem', borderRadius: 2, minHeight: 44 },
            }}
          >
            <Tab label="Thêm Nhân Viên Lễ Tân" value="staff" icon={<PersonAddIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Thêm Bác Sĩ Chuyên Khoa" value="doctor" icon={<MedicalServicesIcon fontSize="small" />} iconPosition="start" />
          </Tabs>
        </Paper>

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
      </Paper>
    </Stack>
  );
}
