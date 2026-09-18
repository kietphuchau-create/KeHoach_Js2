'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

import MailOutlineIcon from '@mui/icons-material/MailOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import MedicalServicesIcon from '@mui/icons-material/MedicalServicesRounded';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScannerRounded';
import PersonIcon from '@mui/icons-material/PersonRounded';

import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { medoraColors } from '@/shared/theme/theme';

export default function LoginForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuickFill = (email: string) => {
    setFormData({ email, password: 'Medsched@123' });
    setErrorMessage('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await api.login({
        email: formData.email.trim(),
        password: formData.password,
      });

      const roles: string[] = res.user?.roles || res.roles || [];
      const roleName = roles[0] || 'CUSTOMER';
      setSuccessMessage(`Đăng nhập thành công! Vai trò: ${roleName}. Đang chuyển hướng...`);

      setTimeout(() => {
        if (roles.includes('ROLE_ADMIN')) {
          router.push('/admin');
        } else if (roles.includes('ROLE_STAFF')) {
          router.push('/reception');
        } else if (roles.includes('ROLE_DOCTOR')) {
          router.push('/doctor');
        } else {
          router.push('/booking');
        }
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper
      elevation={4}
      sx={{
        p: { xs: 3, sm: 4 },
        borderRadius: 5,
        width: '100%',
        maxWidth: 440,
        mx: 'auto',
        border: `1px solid ${medoraColors.border}`,
        backgroundColor: '#ffffff',
      }}
    >
      {/* Header với Logo Medora Brand */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', mb: 3 }}>
        <Box sx={{ mb: 1 }}>
          <Image
            src="/images/logos/logo.png"
            alt="Medora Logo"
            width={52}
            height={52}
            style={{ height: '48px', width: 'auto', objectFit: 'contain' }}
          />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 900, color: medoraColors.main, letterSpacing: '-0.02em' }}>
          Medora
        </Typography>
        <Typography
          variant="caption"
          sx={{
            fontSize: '9px',
            fontWeight: 800,
            color: medoraColors.accent,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            mt: 0.5,
          }}
        >
          MODERN CARE, BETTER HEALTH
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 1 }}>
          Đăng nhập hệ thống Bệnh nhân, Bác sĩ, Lễ tân & Admin
        </Typography>
      </Box>

      {/* Thông báo lỗi / thành công */}
      {errorMessage && (
        <AlertMessage type="error" message={errorMessage} className="mb-4" onClose={() => setErrorMessage('')} />
      )}
      {successMessage && (
        <AlertMessage type="success" message={successMessage} className="mb-4" />
      )}

      {/* Form Đăng nhập */}
      <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
        <Stack spacing={2.5}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>
              Email tài khoản
            </Typography>
            <TextField
              fullWidth
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="nhap.email@medsched.vn"
              variant="outlined"
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <MailOutlineIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>
              Mật khẩu
            </Typography>
            <TextField
              fullWidth
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.password}
              onChange={handleChange}
              placeholder="••••••••"
              variant="outlined"
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Button
            type="submit"
            fullWidth
            variant="contained"
            color="primary"
            disabled={loading}
            sx={{
              py: 1.4,
              fontSize: '0.95rem',
              fontWeight: 800,
              borderRadius: 3,
              mt: 1,
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Đăng Nhập Ngay'}
          </Button>
        </Stack>
      </Box>

      {/* Quick Fill Demo Buttons */}
      <Divider sx={{ my: 3, borderColor: medoraColors.border }} />

      <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', display: 'block', textAlign: 'center', mb: 1.5, letterSpacing: '0.05em' }}>
        ⚡ Tài khoản Demo có sẵn (Mật khẩu: Medsched@123)
      </Typography>

      <Grid container spacing={1}>
        <Grid size={6}>
          <Paper
            elevation={0}
            onClick={() => handleQuickFill('admin@medsched.vn')}
            sx={{
              p: 1.2,
              borderRadius: 3,
              backgroundColor: medoraColors.soft,
              border: `1px solid ${medoraColors.border}`,
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'rgba(94, 234, 212, 0.4)' },
              transition: 'background 0.2s',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <AdminPanelSettingsIcon sx={{ fontSize: 16, color: medoraColors.main }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: medoraColors.main }}>Quản Trị</Typography>
            </Box>
            <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', display: 'block', mt: 0.2 }}>admin@medsched.vn</Typography>
          </Paper>
        </Grid>

        <Grid size={6}>
          <Paper
            elevation={0}
            onClick={() => handleQuickFill('dr.minhanh@medsched.vn')}
            sx={{
              p: 1.2,
              borderRadius: 3,
              backgroundColor: medoraColors.soft,
              border: `1px solid ${medoraColors.border}`,
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'rgba(94, 234, 212, 0.4)' },
              transition: 'background 0.2s',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <MedicalServicesIcon sx={{ fontSize: 16, color: medoraColors.main }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: medoraColors.main }}>Bác Sĩ</Typography>
            </Box>
            <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', display: 'block', mt: 0.2 }}>dr.minhanh@medsched.vn</Typography>
          </Paper>
        </Grid>

        <Grid size={6}>
          <Paper
            elevation={0}
            onClick={() => handleQuickFill('letan.q1@medsched.vn')}
            sx={{
              p: 1.2,
              borderRadius: 3,
              backgroundColor: medoraColors.soft,
              border: `1px solid ${medoraColors.border}`,
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'rgba(94, 234, 212, 0.4)' },
              transition: 'background 0.2s',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <QrCodeScannerIcon sx={{ fontSize: 16, color: medoraColors.main }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: medoraColors.main }}>Lễ Tân</Typography>
            </Box>
            <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', display: 'block', mt: 0.2 }}>letan.q1@medsched.vn</Typography>
          </Paper>
        </Grid>

        <Grid size={6}>
          <Paper
            elevation={0}
            onClick={() => handleQuickFill('benhnhan.demo@gmail.com')}
            sx={{
              p: 1.2,
              borderRadius: 3,
              backgroundColor: medoraColors.soft,
              border: `1px solid ${medoraColors.border}`,
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'rgba(94, 234, 212, 0.4)' },
              transition: 'background 0.2s',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
              <PersonIcon sx={{ fontSize: 16, color: medoraColors.main }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: medoraColors.main }}>Bệnh Nhân</Typography>
            </Box>
            <Typography variant="caption" sx={{ fontSize: '10px', color: 'text.secondary', display: 'block', mt: 0.2 }}>benhnhan.demo@gmail.com</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Footer Link */}
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
          Chưa có tài khoản?{' '}
          <Link href="/register" style={{ color: medoraColors.main, fontWeight: 700, textDecoration: 'none' }}>
            Đăng ký khám mới
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
}
