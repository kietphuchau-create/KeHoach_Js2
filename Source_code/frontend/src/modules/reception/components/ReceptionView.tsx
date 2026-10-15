'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
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
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';

import QrCodeScannerIcon from '@mui/icons-material/QrCodeScannerRounded';
import CreditCardIcon from '@mui/icons-material/CreditCardRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import SecurityIcon from '@mui/icons-material/SecurityRounded';
import AccessTimeIcon from '@mui/icons-material/AccessTimeRounded';
import PrintIcon from '@mui/icons-material/PrintRounded';
import QrCodeIcon from '@mui/icons-material/QrCode2Rounded';

import { api, AppointmentResponse, getAuthUser } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { medoraColors } from '@/shared/theme/theme';

export default function ReceptionView() {
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    setCurrentUser(getAuthUser());
  }, []);

  const roles: string[] = currentUser?.roles || [];
  const isStaff = roles.includes('ROLE_STAFF') || roles.includes('ROLE_ADMIN');

  const [method, setMethod] = useState<'QR_CODE' | 'CCCD_QR'>('QR_CODE');
  const [bookingCode, setBookingCode] = useState('MED-2026-8899');
  const [cccdNumber, setCccdNumber] = useState('079095012345');
  const [patientName, setPatientName] = useState('Châu Tuấn Kiệt');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Live feed state of checked-in patients
  const [history, setHistory] = useState<any[]>([
    {
      queueNumber: '01',
      bookingCode: 'MED-2026-8890',
      patientName: 'Lê Thành Tài',
      doctor: 'PGS.TS.BS Trần Văn Hùng',
      room: 'P.201 - Lầu 2',
      checkInTime: '08:15:30',
      status: 'ĐÃ TIẾP ĐÓN',
    },
    {
      queueNumber: '02',
      bookingCode: 'MED-2026-8891',
      patientName: 'Trang Huỳnh',
      doctor: 'BS.CKII Nguyễn Minh Anh',
      room: 'P.104 - Lầu 1',
      checkInTime: '08:22:10',
      status: 'ĐÃ TIẾP ĐÓN',
    },
  ]);

  const handleCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.checkIn({
        bookingCode: method === 'QR_CODE' ? bookingCode : undefined,
        cccdNumber: method === 'CCCD_QR' ? cccdNumber : undefined,
        method: method,
      });

      setResult(res);

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      const newEntry = {
        queueNumber: res.queueNumber || `0${history.length + 1}`,
        bookingCode: res.bookingCode || (method === 'QR_CODE' ? bookingCode : `MED-${cccdNumber.slice(-4)}`),
        patientName: method === 'CCCD_QR' ? (patientName || 'Bệnh nhân CCCD') : 'Châu Tuấn Kiệt',
        doctor: 'PGS.TS.BS Trần Văn Hùng',
        room: 'P.201 - Lầu 2',
        checkInTime: timeStr,
        status: 'ĐÃ TIẾP ĐÓN',
      };

      setHistory((prev) => [newEntry, ...prev]);
    } catch (err: any) {
      setError(err.message || 'Tiếp đón thất bại. Vui lòng kiểm tra lại mã hoặc thẻ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack spacing={3}>
      {/* Top Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          border: `1px solid ${medoraColors.border}`,
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: medoraColors.main, mb: 0.5 }}>
            <SecurityIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Phân Hệ Tiếp Đón Y Tế Siêu Tốc (Fast Check-In 1s)
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Quầy Tiếp Nhận Bệnh Nhân Ngoại Trú
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.5 }}>
            Hỗ trợ đầu đọc quét mã QR vé hẹn điện tử và quét chip thẻ CCCD 12 số không cần nhập liệu thủ công.
          </Typography>
        </Box>

        {/* Quick Stats Widget */}
        <Paper elevation={0} sx={{ p: 1.5, px: 2.5, borderRadius: 3, backgroundColor: medoraColors.soft, border: `1px solid ${medoraColors.border}`, display: 'flex', gap: 3, textAlign: 'center' }}>
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', fontSize: '10px' }}>ĐÃ TIẾP ĐÓN</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'success.main', lineHeight: 1 }}>{history.length} ca</Typography>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', fontSize: '10px' }}>TỐC ĐỘ XỬ LÝ</Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'primary.main', lineHeight: 1 }}>~1.2 giây</Typography>
          </Box>
        </Paper>
      </Paper>

      {/* Non-Staff Alert */}
      {!isStaff && (
        <AlertMessage
          type="info"
          title="Bạn đang xem màn hình nội bộ dành cho Nhân Viên Lễ Tân (ROLE_STAFF)"
          message="Là Bệnh nhân, bạn chỉ cần Đặt Lịch Khám để nhận Mã vé hẹn & QR Code. Nhân viên tại quầy sẽ dùng màn hình này để quét tiếp đón cho bạn."
        />
      )}

      <Grid container spacing={3}>
        {/* Left Column: Scanner Panel */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${medoraColors.border}`, backgroundColor: '#ffffff' }}>
            {/* Method Tabs */}
            <Paper elevation={0} sx={{ backgroundColor: '#F1F5F9', p: 0.5, borderRadius: 3, mb: 3 }}>
              <Tabs
                value={method}
                onChange={(_, val) => { setMethod(val); setError(null); }}
                variant="fullWidth"
                sx={{
                  minHeight: 40,
                  '& .MuiTabs-indicator': { backgroundColor: medoraColors.main, borderRadius: 2, height: '100%', opacity: 0.15 },
                  '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', borderRadius: 2, minHeight: 40 },
                }}
              >
                <Tab label="1. QR Vé Hẹn" value="QR_CODE" icon={<QrCodeScannerIcon fontSize="small" />} iconPosition="start" />
                <Tab label="2. QR Thẻ CCCD" value="CCCD_QR" icon={<CreditCardIcon fontSize="small" />} iconPosition="start" />
              </Tabs>
            </Paper>

            {error && <Box sx={{ mb: 2 }}><AlertMessage type="error" message={error} onClose={() => setError(null)} /></Box>}

            {/* Checkin Form */}
            <Box component="form" onSubmit={handleCheckin}>
              <Stack spacing={2.5}>
                {method === 'QR_CODE' ? (
                  <Box>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.8, display: 'block' }}>
                      Mã Vé Hẹn Khám (Booking Code):
                    </Typography>
                    <TextField
                      fullWidth
                      required
                      value={bookingCode}
                      onChange={(e) => setBookingCode(e.target.value)}
                      placeholder="Quét mã QR hoặc nhập: MED-2026-8899"
                      slotProps={{
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">
                              <QrCodeIcon sx={{ color: medoraColors.main }} />
                            </InputAdornment>
                          ),
                        },
                      }}
                    />
                  </Box>
                ) : (
                  <Stack spacing={2}>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.8, display: 'block' }}>
                        Số Định Danh CCCD Gắn Chip (12 số):
                      </Typography>
                      <TextField
                        fullWidth
                        required
                        value={cccdNumber}
                        onChange={(e) => setCccdNumber(e.target.value)}
                        placeholder="Ví dụ: 079095012345"
                        slotProps={{
                          input: {
                            startAdornment: (
                              <InputAdornment position="start">
                                <CreditCardIcon sx={{ color: medoraColors.main }} />
                              </InputAdornment>
                            ),
                          },
                        }}
                      />
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 0.8, display: 'block' }}>
                        Họ và Tên Bệnh Nhân (Khớp thẻ):
                      </Typography>
                      <TextField
                        fullWidth
                        value={patientName}
                        onChange={(e) => setPatientName(e.target.value)}
                        placeholder="Châu Tuấn Kiệt"
                      />
                    </Box>
                  </Stack>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                  sx={{ py: 1.4, borderRadius: 3, fontWeight: 800, fontSize: '0.875rem' }}
                >
                  {loading ? 'Đang nạp dữ liệu & cấp STT...' : 'Xác Nhận Tiếp Đón (Check-in 1 Giây)'}
                </Button>
              </Stack>
            </Box>

            {/* Instant Result Card */}
            {result && (
              <Paper
                elevation={3}
                sx={{
                  mt: 3,
                  p: 3,
                  borderRadius: 4,
                  background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                  color: '#ffffff',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircleIcon />
                    <Typography variant="subtitle2" sx={{ fontWeight: 900, letterSpacing: '0.05em' }}>TIẾP ĐÓN THÀNH CÔNG</Typography>
                  </Box>
                  <Chip label="1-CLICK PRINT" size="small" sx={{ fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '9px' }} />
                </Box>

                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.15)', textAlign: 'center', my: 2 }}>
                  <Typography variant="caption" sx={{ color: '#D1FAE5', textTransform: 'uppercase', fontWeight: 700 }}>Số Thứ Tự Vào Khám</Typography>
                  <Typography variant="h2" sx={{ fontWeight: 900, color: '#fff', my: 0.2 }}>STT #{result.queueNumber || '03'}</Typography>
                  <Typography variant="caption" sx={{ color: '#A7F3D0', fontFamily: 'monospace' }}>Mã hẹn: {result.bookingCode}</Typography>
                </Paper>

                <Grid container spacing={1} sx={{ mb: 2, fontSize: '0.8rem' }}>
                  <Grid size={6}>
                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>Phòng khám:</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#fff' }}>P.201 - Lầu 2</Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>Bác sĩ phụ trách:</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#fff' }}>PGS.TS Trần Văn Hùng</Typography>
                  </Grid>
                </Grid>

                <Stack direction="row" spacing={1}>
                  <Button fullWidth variant="contained" color="inherit" startIcon={<PrintIcon />} onClick={() => window.print()} sx={{ borderRadius: 2, color: '#065F46', fontWeight: 800, backgroundColor: '#fff' }}>
                    In Phiếu STT
                  </Button>
                  <Button variant="text" color="inherit" onClick={() => setResult(null)} sx={{ borderRadius: 2, color: '#fff' }}>
                    Đóng
                  </Button>
                </Stack>
              </Paper>
            )}
          </Paper>
        </Grid>

        {/* Right Column: Live Feed Table */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${medoraColors.border}`, backgroundColor: '#ffffff', minHeight: 480 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon sx={{ color: medoraColors.main }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                    Danh Sách Đã Tiếp Đón Hôm Nay (Live Feed)
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  Tự động chuyển tiếp vào hàng đợi phòng khám của Bác sĩ sau khi check-in.
                </Typography>
              </Box>
              <Chip label="● Trực tiếp" size="small" color="success" sx={{ fontWeight: 800, fontSize: '10px' }} />
            </Box>

            <TableContainer sx={{ mt: 1 }}>
              <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>STT</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Bệnh Nhân</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Bác Sĩ & Phòng</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Giờ Check-in</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Trạng Thái</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {history.map((item, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>
                      <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', fontWeight: 900, bgcolor: medoraColors.soft, color: medoraColors.main }}>
                        {item.queueNumber}
                      </Avatar>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.patientName}</Typography>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '10px' }}>{item.bookingCode}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>{item.doctor}</Typography>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: medoraColors.main, fontSize: '10px' }}>{item.room}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{item.checkInTime}</TableCell>
                    <TableCell align="right">
                      <Chip label={item.status} size="small" color="success" sx={{ height: 20, fontSize: '9px', fontWeight: 800 }} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
