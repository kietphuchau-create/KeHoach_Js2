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

import PersonAddIcon from '@mui/icons-material/PersonAddRounded';

import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

interface CreateStaffFormProps {
  medicalCenters: Array<{ id: string; name: string; address?: string }>;
  onSuccess?: () => void;
}

export default function CreateStaffForm({ medicalCenters, onSuccess }: CreateStaffFormProps) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [staffForm, setStaffForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    temporaryPassword: '',
    medicalCenterId: medicalCenters[0]?.id || '',
  });

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await api.createStaff({
        fullName: staffForm.fullName.trim(),
        email: staffForm.email.trim(),
        phone: staffForm.phone.trim(),
        temporaryPassword: staffForm.temporaryPassword || undefined,
        medicalCenterId: staffForm.medicalCenterId,
      });

      setMessage({
        type: 'success',
        text: `Tạo tài khoản Lễ tân thành công cho: ${staffForm.email}! Mật khẩu mặc định: ${staffForm.temporaryPassword || 'Medsched@123'}`,
      });

      setStaffForm({
        fullName: '',
        email: '',
        phone: '',
        temporaryPassword: '',
        medicalCenterId: medicalCenters[0]?.id || '',
      });
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Tạo tài khoản Lễ tân thất bại.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box component="form" onSubmit={handleCreateStaff}>
      <Stack spacing={2.5}>
        {message && (
          <AlertMessage type={message.type} message={message.text} onClose={() => setMessage(null)} />
        )}

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
            Họ và Tên Nhân Viên <span style={{ color: 'red' }}>*</span>
          </Typography>
          <TextField
            fullWidth
            required
            value={staffForm.fullName}
            onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
            placeholder="Ví dụ: Lê Thị Hạnh"
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
              value={staffForm.email}
              onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
              placeholder="letan01@medsched.vn"
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
              value={staffForm.phone}
              onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
              placeholder="0912345678"
            />
          </Grid>
        </Grid>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
            Mật Khẩu Tạm Thời (Tùy chọn, mặc định: Medsched@123)
          </Typography>
          <TextField
            fullWidth
            value={staffForm.temporaryPassword}
            onChange={(e) => setStaffForm({ ...staffForm, temporaryPassword: e.target.value })}
            placeholder="Để trống sẽ tự tạo Medsched@123"
          />
        </Box>

        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.5, display: 'block' }}>
            Cơ Sở Y Tế Tiếp Đón Làm Việc <span style={{ color: 'red' }}>*</span>
          </Typography>
          <TextField
            select
            fullWidth
            required
            value={staffForm.medicalCenterId}
            onChange={(e) => setStaffForm({ ...staffForm, medicalCenterId: e.target.value })}
          >
            {medicalCenters.length === 0 ? (
              <MenuItem value="">Không có cơ sở y tế nào</MenuItem>
            ) : (
              medicalCenters.map((center) => (
                <MenuItem key={center.id} value={center.id}>
                  {center.name} {center.address ? `- ${center.address}` : ''}
                </MenuItem>
              ))
            )}
          </TextField>
        </Box>

        <Box sx={{ pt: 1 }}>
          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <PersonAddIcon />}
            sx={{ py: 1.4, borderRadius: 3, fontWeight: 800 }}
          >
            {loading ? 'Đang tạo tài khoản...' : 'Xác Nhận Tạo Tài Khoản Lễ Tân'}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}
