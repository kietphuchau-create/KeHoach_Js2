'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import IconButton from '@mui/material/IconButton';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

import PersonIcon from '@mui/icons-material/PersonRounded';
import MailOutlineIcon from '@mui/icons-material/MailOutlineRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import PhoneIcon from '@mui/icons-material/PhoneRounded';
import VisibilityIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOffRounded';

import { api } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { medoraColors } from '@/shared/theme/theme';

export default function RegisterForm() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    agreeTerms: true,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (formData.password !== formData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (formData.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự!');
      return;
    }

    if (!formData.agreeTerms) {
      setError('Bạn cần đồng ý với Điều khoản & Dịch vụ khám chữa bệnh.');
      return;
    }

    setLoading(true);

    try {
      await api.register({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
      });

      setSuccessMessage('Đăng ký tài khoản thành công! Đang chuyển sang trang Đăng nhập...');
      setTimeout(() => {
        router.push('/login');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Đăng ký không thành công. Email có thể đã được sử dụng.');
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
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: medoraColors.soft,
            color: medoraColors.main,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1.5,
            border: `1px solid ${medoraColors.border}`,
          }}
        >
          <PersonIcon sx={{ fontSize: 32 }} />
        </Box>
        <Typography variant="h4" sx={{ fontWeight: 800, color: medoraColors.main }}>
          Tạo Tài Khoản
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem', mt: 0.5 }}>
          Đăng ký tài khoản Bệnh nhân để đặt lịch và theo dõi bệnh án Medora
        </Typography>
      </Box>

      {error && <AlertMessage type="error" message={error} className="mb-4" onClose={() => setError('')} />}
      {successMessage && <AlertMessage type="success" message={successMessage} className="mb-4" />}

      <Box component="form" onSubmit={handleSubmit}>
        <Stack spacing={2}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>
              Họ và Tên
            </Typography>
            <TextField
              fullWidth
              name="fullName"
              required
              value={formData.fullName}
              onChange={handleChange}
              placeholder="Nguyễn Văn A"
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>
              Email
            </Typography>
            <TextField
              fullWidth
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              placeholder="example@medsched.vn"
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
              Số Điện Thoại
            </Typography>
            <TextField
              fullWidth
              name="phone"
              type="tel"
              required
              value={formData.phone}
              onChange={handleChange}
              placeholder="0912345678"
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PhoneIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
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
              placeholder="Tối thiểu 6 ký tự"
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

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>
              Xác nhận mật khẩu
            </Typography>
            <TextField
              fullWidth
              name="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              required
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu"
              size="small"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockOutlinedIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <FormControlLabel
            control={
              <Checkbox
                name="agreeTerms"
                checked={formData.agreeTerms}
                onChange={handleChange}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Tôi đồng ý với các <Box component="span" sx={{ color: medoraColors.main, fontWeight: 700 }}>Điều khoản sử dụng</Box> và chính sách y tế Medora
              </Typography>
            }
          />

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
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Đăng Ký Khám Ngay'}
          </Button>
        </Stack>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
          Đã có tài khoản?{' '}
          <Link href="/login" style={{ color: medoraColors.main, fontWeight: 700, textDecoration: 'none' }}>
            Đăng nhập tại đây
          </Link>
        </Typography>
      </Box>
    </Paper>
  );
}
