'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

import PersonIcon from '@mui/icons-material/PersonRounded';
import MailOutlineIcon from '@mui/icons-material/MailOutlineRounded';
import PhoneIcon from '@mui/icons-material/PhoneRounded';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import MedicalServicesIcon from '@mui/icons-material/MedicalServicesRounded';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import SaveIcon from '@mui/icons-material/SaveRounded';

import { api, clearAuthSession, getAuthToken } from '@/shared/lib/api';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { medoraColors } from '@/shared/theme/theme';

export default function ProfileView() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'doctor'>('info');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // User Profile
  const [profile, setProfile] = useState({
    id: '',
    fullName: '',
    email: '',
    phone: '',
    roles: [] as string[],
    rolesWithCenter: [] as any[],
    doctorProfile: null as any,
    patientProfile: null as any,
  });

  // Password Change
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Doctor Form
  const [doctorForm, setDoctorForm] = useState({
    academicTitle: '',
    experienceYears: 0,
    roomNumber: '',
    bio: '',
  });

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    async function loadData() {
      try {
        const data = await api.getProfile();
        setProfile({
          id: data.id || '',
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          roles: data.roles || ['CUSTOMER'],
          rolesWithCenter: data.rolesWithCenter || [],
          doctorProfile: data.doctorProfile || null,
          patientProfile: data.patientProfile || null,
        });

        if (data.doctorProfile) {
          setDoctorForm({
            academicTitle: data.doctorProfile.academicTitle || 'BS.CKI',
            experienceYears: data.doctorProfile.experienceYears || 5,
            roomNumber: data.doctorProfile.roomNumber || 'P.101',
            bio: data.doctorProfile.bio || '',
          });
        }
      } catch (err: any) {
        setError(err.message || 'Không thể tải thông tin hồ sơ.');
      } finally {
        setFetching(false);
      }
    }
    loadData();
  }, [router]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await api.updateProfile({
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
      });
      setMessage('Cập nhật thông tin cá nhân thành công!');
      setProfile((prev) => ({
        ...prev,
        fullName: res.fullName || prev.fullName,
        phone: res.phone || prev.phone,
      }));
    } catch (err: any) {
      setError(err.message || 'Cập nhật thất bại.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setError(null);

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }

    if (passwords.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    setLoading(true);

    try {
      await api.changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setMessage('Đổi mật khẩu thành công!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setError(err.message || 'Mật khẩu hiện tại không chính xác.');
    } finally {
      setLoading(false);
    }
  };

  const handleDoctorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      await api.updateDoctorProfile({
        academicTitle: doctorForm.academicTitle,
        experienceYears: Number(doctorForm.experienceYears),
        roomNumber: doctorForm.roomNumber,
        bio: doctorForm.bio,
      });
      setMessage('Cập nhật hồ sơ chuyên môn Bác sĩ thành công!');
    } catch (err: any) {
      setError(err.message || 'Không thể cập nhật hồ sơ bác sĩ.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthSession();
    router.push('/login');
  };

  if (fetching) {
    return (
      <Box sx={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <LoadingSpinner message="Đang nạp dữ liệu hồ sơ cá nhân..." />
      </Box>
    );
  }

  const isDoctor = profile.roles.includes('ROLE_DOCTOR');

  return (
    <Stack spacing={3} sx={{ maxWidth: 760, mx: 'auto' }}>
      {/* Return button & Logout */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Button component={Link} href="/" startIcon={<ArrowBackIcon />} color="inherit" sx={{ fontWeight: 600 }}>
          Quay về Trang chủ
        </Button>
        <Button variant="outlined" color="error" startIcon={<LogoutIcon />} onClick={handleLogout} sx={{ borderRadius: 3 }}>
          Đăng xuất
        </Button>
      </Box>

      <Paper elevation={3} sx={{ borderRadius: 4, overflow: 'hidden', border: `1px solid ${medoraColors.border}` }}>
        {/* Header Profile Banner */}
        <Box sx={{ background: 'linear-gradient(135deg, #0B3D36 0%, #0F665F 100%)', color: '#fff', p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <Avatar sx={{ width: 64, height: 64, fontSize: '1.8rem', fontWeight: 900, bgcolor: medoraColors.accent, color: '#fff', border: '3px solid #fff' }}>
              {(profile.fullName || 'U').charAt(0).toUpperCase()}
            </Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#fff' }}>
                {profile.fullName || 'Người dùng'}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <Typography variant="body2" sx={{ color: '#CCFBF1' }}>{profile.email}</Typography>
                <Chip
                  label={profile.roles.join(', ') || 'CUSTOMER'}
                  size="small"
                  sx={{ height: 20, fontSize: '9px', fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}
                />
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Tab Switching */}
        <Paper elevation={0} sx={{ borderBottom: '1px solid #E2E8F0', backgroundColor: '#F8FAFC' }}>
          <Tabs
            value={activeTab}
            onChange={(_, val) => { setActiveTab(val); setMessage(null); setError(null); }}
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.875rem', py: 2 },
            }}
          >
            <Tab label="Thông Tin Cá Nhân" value="info" icon={<PersonIcon fontSize="small" />} iconPosition="start" />
            <Tab label="Đổi Mật Khẩu" value="password" icon={<LockOutlinedIcon fontSize="small" />} iconPosition="start" />
            {isDoctor && (
              <Tab label="Hồ Sơ Bác Sĩ" value="doctor" icon={<MedicalServicesIcon fontSize="small" />} iconPosition="start" />
            )}
          </Tabs>
        </Paper>

        <Box sx={{ p: 4 }}>
          {message && <Box sx={{ mb: 3 }}><AlertMessage type="success" message={message} onClose={() => setMessage(null)} /></Box>}
          {error && <Box sx={{ mb: 3 }}><AlertMessage type="error" message={error} onClose={() => setError(null)} /></Box>}

          {/* TAB 1: Sửa thông tin cá nhân */}
          {activeTab === 'info' && (
            <Box component="form" onSubmit={handleProfileSubmit}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>Họ và tên</Typography>
                  <TextField
                    fullWidth
                    required
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>Email tài khoản (Chỉ xem)</Typography>
                  <TextField
                    fullWidth
                    disabled
                    value={profile.email}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start"><MailOutlineIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>Số điện thoại</Typography>
                  <TextField
                    fullWidth
                    required
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    slotProps={{
                      input: {
                        startAdornment: <InputAdornment position="start"><PhoneIcon sx={{ color: 'text.secondary' }} /></InputAdornment>,
                      },
                    }}
                  />
                </Box>

                {profile.patientProfile && (
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, backgroundColor: medoraColors.soft, border: `1px solid ${medoraColors.border}` }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: medoraColors.main, mb: 1 }}>Hồ sơ y tế bệnh nhân:</Typography>
                    <Grid container spacing={1} sx={{ fontSize: '0.8rem' }}>
                      <Grid size={6}><Typography variant="caption">CCCD: <strong>{profile.patientProfile.cccdNumber || 'Chưa cập nhật'}</strong></Typography></Grid>
                      <Grid size={6}><Typography variant="caption">BHYT: <strong>{profile.patientProfile.healthInsuranceNo || 'Chưa cập nhật'}</strong></Typography></Grid>
                      <Grid size={6}><Typography variant="caption">Giới tính: <strong>{profile.patientProfile.gender || 'Chưa cập nhật'}</strong></Typography></Grid>
                      <Grid size={6}><Typography variant="caption">Tiền sử: <strong>{profile.patientProfile.medicalHistory || 'Bình thường'}</strong></Typography></Grid>
                    </Grid>
                  </Paper>
                )}

                <Box sx={{ pt: 1 }}>
                  <Button type="submit" variant="contained" color="primary" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} sx={{ borderRadius: 3, px: 3, py: 1.2, fontWeight: 800 }}>
                    {loading ? 'Đang lưu...' : 'Lưu thông tin'}
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}

          {/* TAB 2: Đổi mật khẩu */}
          {activeTab === 'password' && (
            <Box component="form" onSubmit={handlePasswordSubmit}>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>Mật khẩu hiện tại</Typography>
                  <TextField
                    fullWidth
                    type="password"
                    required
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    placeholder="Nhập mật khẩu đang dùng"
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>Mật khẩu mới</Typography>
                  <TextField
                    fullWidth
                    type="password"
                    required
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    slotProps={{
                      htmlInput: { minLength: 6 },
                      input: { startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ color: 'text.secondary' }} /></InputAdornment> },
                    }}
                  />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>Xác nhận mật khẩu mới</Typography>
                  <TextField
                    fullWidth
                    type="password"
                    required
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    placeholder="Nhập lại mật khẩu mới"
                    slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockOutlinedIcon sx={{ color: 'text.secondary' }} /></InputAdornment> } }}
                  />
                </Box>

                <Box sx={{ pt: 1 }}>
                  <Button type="submit" variant="contained" color="primary" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <LockOutlinedIcon />} sx={{ borderRadius: 3, px: 3, py: 1.2, fontWeight: 800 }}>
                    {loading ? 'Đang xử lý...' : 'Xác nhận Đổi mật khẩu'}
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}

          {/* TAB 3: Bác sĩ cập nhật hồ sơ chuyên môn */}
          {activeTab === 'doctor' && isDoctor && (
            <Box component="form" onSubmit={handleDoctorSubmit}>
              <Stack spacing={2.5}>
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>Học vị / Chức danh</Typography>
                    <TextField fullWidth required value={doctorForm.academicTitle} onChange={(e) => setDoctorForm({ ...doctorForm, academicTitle: e.target.value })} placeholder="BS.CKI, PGS.TS..." />
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>Số năm kinh nghiệm</Typography>
                    <TextField fullWidth type="number" required value={doctorForm.experienceYears} onChange={(e) => setDoctorForm({ ...doctorForm, experienceYears: Number(e.target.value) })} />
                  </Grid>
                </Grid>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>Phòng khám trực</Typography>
                  <TextField fullWidth required value={doctorForm.roomNumber} onChange={(e) => setDoctorForm({ ...doctorForm, roomNumber: e.target.value })} placeholder="P.205, Khu B..." />
                </Box>

                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.primary', mb: 0.5, display: 'block' }}>Tiểu sử & Chuyên môn giới thiệu</Typography>
                  <TextField fullWidth multiline rows={3} value={doctorForm.bio} onChange={(e) => setDoctorForm({ ...doctorForm, bio: e.target.value })} placeholder="Giới thiệu kinh nghiệm khám..." />
                </Box>

                <Box sx={{ pt: 1 }}>
                  <Button type="submit" variant="contained" color="primary" disabled={loading} startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <SaveIcon />} sx={{ borderRadius: 3, px: 3, py: 1.2, fontWeight: 800 }}>
                    {loading ? 'Đang lưu...' : 'Lưu hồ sơ Bác sĩ'}
                  </Button>
                </Box>
              </Stack>
            </Box>
          )}
        </Box>
      </Paper>
    </Stack>
  );
}
