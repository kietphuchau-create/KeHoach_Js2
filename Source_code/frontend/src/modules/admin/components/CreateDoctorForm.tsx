'use client';

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

import MedicalServicesIcon from '@mui/icons-material/MedicalServicesRounded';

import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

interface CreateDoctorFormProps {
  medicalCenters: Array<{ id: string; name: string }>;
  specialties: Array<{ id: string; name: string }>;
  onSuccess?: () => void;
}

export default function CreateDoctorForm({ medicalCenters, specialties, onSuccess }: CreateDoctorFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [doctorForm, setDoctorForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    temporaryPassword: '',
    medicalCenterId: medicalCenters[0]?.id || '',
    specialtyId: specialties[0]?.id || '',
    academicTitle: 'ThS.BS',
    experienceYears: 5,
    consultationFee: 300000,
    roomNumber: 'P.101',
    bio: '',
  });

  const handleCreateDoctor = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await api.createDoctor({
        fullName: doctorForm.fullName.trim(),
        email: doctorForm.email.trim(),
        phone: doctorForm.phone.trim(),
        temporaryPassword: doctorForm.temporaryPassword || undefined,
        medicalCenterId: doctorForm.medicalCenterId,
        specialtyId: doctorForm.specialtyId,
        academicTitle: doctorForm.academicTitle,
        experienceYears: Number(doctorForm.experienceYears) || 1,
        consultationFee: Number(doctorForm.consultationFee) || 200000,
        roomNumber: doctorForm.roomNumber.trim(),
        bio: doctorForm.bio.trim(),
      });

      setMessage({
        type: 'success',
        text: `Tạo tài khoản Bác sĩ thành công cho: ${doctorForm.email}! Mật khẩu mặc định: ${doctorForm.temporaryPassword || 'Medsched@123'}`,
      });

      setDoctorForm({
        fullName: '',
        email: '',
        phone: '',
        temporaryPassword: '',
        medicalCenterId: medicalCenters[0]?.id || '',
        specialtyId: specialties[0]?.id || '',
        academicTitle: 'ThS.BS',
        experienceYears: 5,
        consultationFee: 300000,
        roomNumber: 'P.101',
        bio: '',
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Tạo tài khoản Bác sĩ thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleCreateDoctor}>
      <Stack spacing={2.5}>
        {message && (
          <AlertMessage type={message.type} message={message.text} onClose={() => setMessage(null)} />
        )}

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
            Họ và Tên Bác Sĩ <span style={{ color: 'red' }}>*</span>
          </Typography>
          <TextField
            fullWidth
            required
            value={doctorForm.fullName}
            onChange={(e) => setDoctorForm({ ...doctorForm, fullName: e.target.value })}
            placeholder="Ví dụ: PGS.TS Nguyễn Văn Bình"
          />
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
              Email Đăng Nhập <span style={{ color: 'red' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              type="email"
              required
              value={doctorForm.email}
              onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
              placeholder="doctor.binh@medsched.vn"
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
              Số Điện Thoại <span style={{ color: 'red' }}>*</span>
            </Typography>
            <TextField
              fullWidth
              type="tel"
              required
              value={doctorForm.phone}
              onChange={(e) => setDoctorForm({ ...doctorForm, phone: e.target.value })}
              placeholder="0987654321"
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
              Chuyên Khoa Khám <span style={{ color: 'red' }}>*</span>
            </Typography>
            <TextField
              select
              fullWidth
              required
              value={doctorForm.specialtyId}
              onChange={(e) => setDoctorForm({ ...doctorForm, specialtyId: e.target.value })}
            >
              {specialties.length === 0 ? (
                <MenuItem value="">Không có chuyên khoa nào</MenuItem>
              ) : (
                specialties.map((spec) => (
                  <MenuItem key={spec.id} value={spec.id}>
                    {spec.name}
                  </MenuItem>
                ))
              )}
            </TextField>
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
              Cơ Sở Y Tế Công Tác <span style={{ color: 'red' }}>*</span>
            </Typography>
            <TextField
              select
              fullWidth
              required
              value={doctorForm.medicalCenterId}
              onChange={(e) => setDoctorForm({ ...doctorForm, medicalCenterId: e.target.value })}
            >
              {medicalCenters.length === 0 ? (
                <MenuItem value="">Không có cơ sở y tế nào</MenuItem>
              ) : (
                medicalCenters.map((center) => (
                  <MenuItem key={center.id} value={center.id}>
                    {center.name}
                  </MenuItem>
                ))
              )}
            </TextField>
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
              Học Hàm / Học Vị
            </Typography>
            <TextField
              fullWidth
              value={doctorForm.academicTitle}
              onChange={(e) => setDoctorForm({ ...doctorForm, academicTitle: e.target.value })}
              placeholder="GS, PGS, ThS, BS.CKII..."
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
              Số Năm Kinh Nghiệm
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={doctorForm.experienceYears}
              onChange={(e) => setDoctorForm({ ...doctorForm, experienceYears: Number(e.target.value) })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 4 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
              Phòng Khám Số
            </Typography>
            <TextField
              fullWidth
              value={doctorForm.roomNumber}
              onChange={(e) => setDoctorForm({ ...doctorForm, roomNumber: e.target.value })}
              placeholder="P.102, Khu A..."
            />
          </Grid>
        </Grid>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
              Giá Khám Tư Vấn (VND)
            </Typography>
            <TextField
              fullWidth
              type="number"
              value={doctorForm.consultationFee}
              onChange={(e) => setDoctorForm({ ...doctorForm, consultationFee: Number(e.target.value) })}
            />
          </Grid>

          <Grid size={{ xs: 12, sm: 6 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
              Mật Khẩu Tạm Thời (Tùy chọn)
            </Typography>
            <TextField
              fullWidth
              value={doctorForm.temporaryPassword}
              onChange={(e) => setDoctorForm({ ...doctorForm, temporaryPassword: e.target.value })}
              placeholder="Để trống: Medsched@123"
            />
          </Grid>
        </Grid>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
            Tiểu Sử / Giới Thiệu Ngắn
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={doctorForm.bio}
            onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })}
            placeholder="Giới thiệu về quá trình đào tạo, chuyên môn điều trị mũi nhọn..."
          />
        </Box>

        <Box sx={{ pt: 1 }}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <MedicalServicesIcon />}
            sx={{ py: 1.4, borderRadius: 3, fontWeight: 800 }}
          >
            {loading ? 'Đang tạo tài khoản...' : 'Xác Nhận Tạo Tài Khoản Bác Sĩ'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
