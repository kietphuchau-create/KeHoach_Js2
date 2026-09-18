'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

import MedicalServicesIcon from '@mui/icons-material/MedicalServicesRounded';
import GroupsIcon from '@mui/icons-material/GroupsRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import VolumeUpIcon from '@mui/icons-material/VolumeUpRounded';

import { getAuthUser } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { medoraColors } from '@/shared/theme/theme';

interface PatientQueueItem {
  id: string;
  queueNumber: string;
  bookingCode: string;
  patientName: string;
  gender: string;
  birthYear: number;
  phone: string;
  cccd: string;
  symptoms: string;
  aiSummary: string;
  status: 'WAITING' | 'IN_CONSULTATION' | 'COMPLETED';
  checkInTime: string;
}

export default function DoctorClinicView() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clinicActive, setClinicActive] = useState(true);
  const [activePatientIndex, setActivePatientIndex] = useState(1);
  const [notification, setNotification] = useState<string | null>(null);

  // Initial demo queue data
  const [queue, setQueue] = useState<PatientQueueItem[]>([
    {
      id: 'p001',
      queueNumber: '01',
      bookingCode: 'MED-2026-8890',
      patientName: 'Lê Thành Tài',
      gender: 'Nam',
      birthYear: 1998,
      phone: '0912345678',
      cccd: '079098012345',
      symptoms: 'Đau tức ngực nhẹ khi làm việc quá sức, đo huyết áp tại nhà 135/85.',
      aiSummary: 'Triệu chứng tim mạch nhẹ: Đau tức ngực gắng sức | Tiền sử: Tiền sử gia đình huyết áp | Phân loại: Ưu tiên trung bình',
      status: 'COMPLETED',
      checkInTime: '08:15',
    },
    {
      id: 'p002',
      queueNumber: '02',
      bookingCode: 'MED-2026-8891',
      patientName: 'Trang Huỳnh',
      gender: 'Nữ',
      birthYear: 2001,
      phone: '0987654321',
      cccd: '079101098765',
      symptoms: 'Thường xuyên hồi hộp, tim đập nhanh sau khi uống cà phê hoặc thức khuya.',
      aiSummary: 'Nhịp tim nhanh kịch phát do chất kích thích | Hướng chuyên khoa: Khoa Nội Tim Mạch | Đề xuất: Điện tâm đồ ECG',
      status: 'IN_CONSULTATION',
      checkInTime: '08:22',
    },
    {
      id: 'p003',
      queueNumber: '03',
      bookingCode: 'MED-2026-8899',
      patientName: 'Châu Tuấn Kiệt',
      gender: 'Nam',
      birthYear: 2000,
      phone: '0901234567',
      cccd: '079095012345',
      symptoms: 'Đau thắt ngực nhẹ khi leo cầu thang, khó thở nhẹ ban đêm, thỉnh thoảng choáng.',
      aiSummary: 'Cảnh báo đau thắt ngực gắng sức | Khó thở tư thế nằm | Cần kiểm tra siêu âm tim Doppler màu',
      status: 'WAITING',
      checkInTime: '08:30',
    },
    {
      id: 'p004',
      queueNumber: '04',
      bookingCode: 'MED-2026-8902',
      patientName: 'Nguyễn Thị Yến Nhi',
      gender: 'Nữ',
      birthYear: 2002,
      phone: '0933456789',
      cccd: '079102345678',
      symptoms: 'Khám sức khỏe tổng quát tim mạch định kỳ theo gói dịch vụ công ty.',
      aiSummary: 'Khám định kỳ tổng quát | Không có tiền sử bệnh lý nền nguy cơ cao',
      status: 'WAITING',
      checkInTime: '08:45',
    },
  ]);

  const [clinicalNotes, setClinicalNotes] = useState('');

  useEffect(() => {
    const user = getAuthUser();
    setCurrentUser(user);
  }, []);

  const currentPatient = queue[activePatientIndex] || queue[0];

  const handleCallNext = () => {
    const nextIdx = queue.findIndex((p, idx) => idx > activePatientIndex && p.status === 'WAITING');
    if (nextIdx !== -1) {
      setQueue((prev) =>
        prev.map((p, idx) => {
          if (idx === activePatientIndex) return { ...p, status: 'COMPLETED' };
          if (idx === nextIdx) return { ...p, status: 'IN_CONSULTATION' };
          return p;
        })
      );
      setActivePatientIndex(nextIdx);
      setClinicalNotes('');
      setNotification(`Đã gọi bệnh nhân STT #${queue[nextIdx].queueNumber} - ${queue[nextIdx].patientName} vào phòng khám.`);
    } else {
      setNotification('Hiện tại đã hết bệnh nhân đang xếp hàng trong ca trực!');
    }
  };

  const handleSelectPatient = (index: number) => {
    setActivePatientIndex(index);
    setClinicalNotes('');
  };

  const waitingCount = queue.filter((p) => p.status === 'WAITING').length;
  const completedCount = queue.filter((p) => p.status === 'COMPLETED').length;

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
            <MedicalServicesIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Phân Hệ Buồng Khám Chuyên Khoa (Doctor Console)
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
            {currentUser?.fullName ? `Bàn Khám: ${currentUser.fullName}` : 'Bàn Khám: PGS.TS.BS Trần Văn Hùng'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.5 }}>
            Phòng 201 - Lầu 2 (Khoa Nội Tim Mạch) • <strong style={{ color: medoraColors.main }}>Cơ sở Medora Quận 1</strong>
          </Typography>
        </Box>

        {/* Stats & Clinic Active Status Toggle */}
        <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
          <Paper elevation={0} sx={{ p: 1.5, px: 2, borderRadius: 3, backgroundColor: medoraColors.soft, border: `1px solid ${medoraColors.border}`, display: 'flex', gap: 2, textAlign: 'center' }}>
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', fontSize: '10px' }}>ĐANG CHỜ</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'warning.main', lineHeight: 1 }}>{waitingCount} ca</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, display: 'block', fontSize: '10px' }}>ĐÃ XONG</Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: 'success.main', lineHeight: 1 }}>{completedCount} ca</Typography>
            </Box>
          </Paper>

          <Button
            variant="outlined"
            color={clinicActive ? 'success' : 'error'}
            onClick={() => setClinicActive(!clinicActive)}
            sx={{ borderRadius: 3, px: 2.5, py: 1, fontWeight: 700, fontSize: '0.8rem' }}
          >
            {clinicActive ? '● Đang Mở Khám' : '● Tạm Dừng Khám'}
          </Button>
        </Stack>
      </Paper>

      {notification && (
        <AlertMessage type="info" message={notification} onClose={() => setNotification(null)} />
      )}

      {/* Main 2-Column Clinical Layout */}
      <Grid container spacing={3}>
        {/* Left Column: Waiting Queue */}
        <Grid size={{ xs: 12, lg: 5 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${medoraColors.border}`, backgroundColor: '#ffffff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <GroupsIcon sx={{ color: medoraColors.main }} />
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'text.primary' }}>
                  Hàng Đợi Khám Trước Cửa Phòng
                </Typography>
              </Box>
              <Chip label={`Tổng: ${queue.length}`} size="small" sx={{ fontWeight: 800, fontFamily: 'monospace', backgroundColor: medoraColors.soft, color: medoraColors.main }} />
            </Box>

            {/* Quick Call Next Button */}
            <Button
              fullWidth
              variant="contained"
              color="primary"
              startIcon={<VolumeUpIcon />}
              onClick={handleCallNext}
              sx={{ py: 1.4, mb: 2.5, borderRadius: 3, fontWeight: 800, fontSize: '0.875rem' }}
            >
              GỌI BỆNH NHÂN TIẾP THEO (CALL NEXT)
            </Button>

            {/* Queue List */}
            <Stack spacing={1.5} sx={{ maxHeight: 480, overflowY: 'auto', pr: 0.5 }}>
              {queue.map((patient, index) => {
                const isActive = index === activePatientIndex;
                return (
                  <Paper
                    key={patient.id}
                    elevation={0}
                    onClick={() => handleSelectPatient(index)}
                    sx={{
                      p: 2,
                      borderRadius: 3,
                      border: `2px solid ${isActive ? medoraColors.main : medoraColors.border}`,
                      backgroundColor: isActive ? medoraColors.soft : patient.status === 'COMPLETED' ? '#F8FAFC' : '#ffffff',
                      opacity: patient.status === 'COMPLETED' ? 0.75 : 1,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                      '&:hover': { borderColor: medoraColors.accent, opacity: 1 },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 36,
                          height: 36,
                          fontWeight: 900,
                          fontSize: '0.875rem',
                          bgcolor: isActive ? medoraColors.main : patient.status === 'COMPLETED' ? 'success.light' : 'warning.light',
                          color: isActive ? '#fff' : patient.status === 'COMPLETED' ? 'success.main' : 'warning.main',
                        }}
                      >
                        {patient.queueNumber}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary', fontSize: '0.875rem' }}>
                          {patient.patientName}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                          {patient.gender} • {new Date().getFullYear() - patient.birthYear} tuổi • Mã: {patient.bookingCode}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: 'right' }}>
                      {patient.status === 'IN_CONSULTATION' && (
                        <Chip label="ĐANG KHÁM" size="small" color="primary" sx={{ height: 20, fontSize: '9px', fontWeight: 800 }} />
                      )}
                      {patient.status === 'WAITING' && (
                        <Chip label="ĐANG CHỜ" size="small" color="warning" sx={{ height: 20, fontSize: '9px', fontWeight: 800 }} />
                      )}
                      {patient.status === 'COMPLETED' && (
                        <Chip label="ĐÃ KHÁM" size="small" color="success" sx={{ height: 20, fontSize: '9px', fontWeight: 800 }} />
                      )}
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontFamily: 'monospace', fontSize: '10px', mt: 0.3 }}>
                        {patient.checkInTime}
                      </Typography>
                    </Box>
                  </Paper>
                );
              })}
            </Stack>
          </Paper>
        </Grid>

        {/* Right Column: Active Patient Consultation Console */}
        <Grid size={{ xs: 12, lg: 7 }}>
          <Paper elevation={0} sx={{ p: 3, borderRadius: 4, border: `1px solid ${medoraColors.border}`, backgroundColor: '#ffffff' }}>
            <Stack spacing={3}>
              {/* Patient Banner */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 2, borderBottom: '1px solid #F1F5F9' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: medoraColors.soft, color: medoraColors.main, fontWeight: 900, border: `2px solid ${medoraColors.border}` }}>
                    {currentPatient.queueNumber}
                  </Avatar>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: 'text.primary' }}>{currentPatient.patientName}</Typography>
                      <Chip label={`${currentPatient.gender} • ${currentPatient.birthYear}`} size="small" sx={{ fontSize: '10px', fontWeight: 700 }} />
                    </Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                      CCCD: {currentPatient.cccd} • SĐT: {currentPatient.phone}
                    </Typography>
                  </Box>
                </Box>
                <Chip label={`Mã: ${currentPatient.bookingCode}`} variant="outlined" sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
              </Box>

              {/* Spring AI Clinical Summary */}
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, background: 'linear-gradient(135deg, #F3E8FF 0%, #E0E7FF 100%)', border: '1px solid #DDD6FE' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#5B21B6', mb: 1 }}>
                  <AutoAwesomeIcon fontSize="small" />
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem' }}>
                    TÓM TẮT LÂM SÀNG BỆNH ÁN TỪ SPRING AI:
                  </Typography>
                </Box>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, color: '#4C1D95', mb: 0.5, fontSize: '0.825rem' }}>
                    Triệu chứng bệnh nhân khai báo: &ldquo;{currentPatient.symptoms}&rdquo;
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'block', fontSize: '0.8rem' }}>
                    🤖 <strong>AI Đánh Giá:</strong> {currentPatient.aiSummary}
                  </Typography>
                </Paper>
              </Paper>

              {/* Clinical Notes */}
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 1, display: 'block' }}>
                  Ghi Chú Chẩn Đoán & Chỉ Định Điều Trị Của Bác Sĩ:
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="Nhập kết quả nghe tim phổi, chỉ định đo điện tim ECG, kê đơn thuốc hoặc hẹn tái khám..."
                />
              </Box>

              {/* Action Bar */}
              <Box sx={{ pt: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleCallNext}
                  sx={{ py: 1.4, borderRadius: 3, fontWeight: 800, fontSize: '0.9rem' }}
                >
                  Hoàn Tất Ca Này & Chuyển Ca Tiếp Theo
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Stack>
  );
}
