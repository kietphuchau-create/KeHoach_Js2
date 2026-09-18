'use client';

import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import Avatar from '@mui/material/Avatar';

import CalendarMonthIcon from '@mui/icons-material/CalendarMonthRounded';
import MedicalServicesIcon from '@mui/icons-material/MedicalServicesRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesomeRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import LocationOnIcon from '@mui/icons-material/LocationOnRounded';
import ArrowForwardIcon from '@mui/icons-material/ArrowForwardRounded';
import ArrowBackIcon from '@mui/icons-material/ArrowBackRounded';
import QrCodeIcon from '@mui/icons-material/QrCode2Rounded';
import PrintIcon from '@mui/icons-material/PrintRounded';
import SecurityIcon from '@mui/icons-material/SecurityRounded';

import { api, AppointmentResponse } from '@/shared/lib/api';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import { medoraColors } from '@/shared/theme/theme';

export default function BookingForm() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [centers, setCenters] = useState<any[]>([]);
  const [specialties, setSpecialties] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form selections
  const [selectedCenter, setSelectedCenter] = useState<string>('mc000001-0000-0000-0000-000000000001');
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('sp000001-0000-0000-0000-000000000001');
  const [selectedDoctor, setSelectedDoctor] = useState({
    id: 'd0000001-0000-0000-0000-000000000001',
    name: 'PGS.TS.BS Trần Văn Hùng',
    title: 'Trưởng Khoa Nội Tim Mạch',
    room: 'P.201 - Lầu 2',
    fee: 300000,
  });
  const [selectedSlot, setSelectedSlot] = useState({
    id: 'sl000002-0000-0000-0000-000000000001',
    time: '08:30 - 09:00',
    date: 'Hôm nay',
  });
  const [symptoms, setSymptoms] = useState('Đau thắt ngực nhẹ khi leo cầu thang, hồi hộp đánh trống ngực vào buổi tối.');
  const [aiPreview, setAiPreview] = useState<{ specialty: string; summary: string } | null>(null);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // Submit states
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<AppointmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCategories() {
      try {
        const [c, s] = await Promise.all([
          api.getMedicalCenters().catch(() => [
            { id: 'mc000001-0000-0000-0000-000000000001', name: 'Bệnh Viện Đa Khoa Medora - Chi Nhánh Quận 1', address: 'Số 123 Nguyễn Thị Minh Khai, P. Bến Thành, Q.1, TP.HCM' },
            { id: 'mc000002-0000-0000-0000-000000000002', name: 'Bệnh Viện Đa Khoa Medora - Chi Nhánh Quận 7', address: 'Số 45 Nguyễn Thị Thập, P. Tân Phú, Q.7, TP.HCM' },
          ]),
          api.getSpecialties().catch(() => [
            { id: 'sp000001-0000-0000-0000-000000000001', name: 'Khoa Nội Tim Mạch', code: 'INTERNAL_MEDICINE' },
            { id: 'sp000002-0000-0000-0000-000000000002', name: 'Khoa Da Liễu', code: 'DERMATOLOGY' },
            { id: 'sp000003-0000-0000-0000-000000000003', name: 'Khoa Răng Hàm Mặt', code: 'ODONTO_STOMATOLOGY' },
            { id: 'sp000004-0000-0000-0000-000000000004', name: 'Khoa Mắt', code: 'OPHTHALMOLOGY' },
          ]),
        ]);
        setCenters(c);
        setSpecialties(s);
      } finally {
        setLoadingData(false);
      }
    }
    loadCategories();
  }, []);

  const handleAnalyzeSymptoms = async () => {
    if (!symptoms.trim()) return;
    setAnalyzingAi(true);
    try {
      const res = await api.triageSymptoms(symptoms);
      setAiPreview(res);
    } catch (e: any) {
      console.error(e);
    } finally {
      setAnalyzingAi(false);
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await api.bookAppointment({
        medicalCenterId: selectedCenter,
        patientProfileId: 'p0000001-0000-0000-0000-000000000001',
        doctorId: selectedDoctor.id,
        slotId: selectedSlot.id,
        symptoms: symptoms.trim() || 'Khám kiểm tra sức khỏe định kỳ',
        medicalHistory: 'Huyết áp bình thường, không dị ứng thuốc kháng sinh',
      });
      setResult(res);
      setStep(3);
    } catch (err: any) {
      setError(err.message || 'Đặt lịch thất bại. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const doctorList = [
    {
      id: 'd0000001-0000-0000-0000-000000000001',
      name: 'PGS.TS.BS Trần Văn Hùng',
      title: 'Chuyên gia Tim mạch 25 năm kinh nghiệm',
      room: 'P.201 - Lầu 2',
      fee: 300000,
      specialty: 'Khoa Nội Tim Mạch',
    },
    {
      id: 'd0000002-0000-0000-0000-000000000002',
      name: 'BS.CKII Nguyễn Minh Anh',
      title: 'Bác sĩ chuyên khoa Da Liễu thẩm mỹ',
      room: 'P.104 - Lầu 1',
      fee: 250000,
      specialty: 'Khoa Da Liễu',
    },
    {
      id: 'd0000003-0000-0000-0000-000000000003',
      name: 'ThS.BS Hoàng Trọng Nam',
      title: 'Bác sĩ Phục hình Răng Hàm Mặt',
      room: 'P.302 - Lầu 3',
      fee: 200000,
      specialty: 'Khoa Răng Hàm Mặt',
    },
  ];

  const timeSlots = [
    { id: 'sl000001-0000-0000-0000-000000000001', time: '08:00 - 08:30', status: 'full', label: 'Đã kín chỗ' },
    { id: 'sl000002-0000-0000-0000-000000000001', time: '08:30 - 09:00', status: 'available', label: 'Khả dụng' },
    { id: 'sl000003-0000-0000-0000-000000000001', time: '09:00 - 09:30', status: 'available', label: 'Khả dụng' },
    { id: 'sl000004-0000-0000-0000-000000000001', time: '09:30 - 10:00', status: 'available', label: 'Khả dụng' },
    { id: 'sl000005-0000-0000-0000-000000000001', time: '14:00 - 14:30', status: 'available', label: 'Khả dụng' },
    { id: 'sl000006-0000-0000-0000-000000000001', time: '14:30 - 15:00', status: 'available', label: 'Khả dụng' },
  ];

  const wizardSteps = ['Cơ Sở & Khoa', 'Bác Sĩ & Giờ', 'Triệu Chứng & AI'];

  return (
    <Stack spacing={3} sx={{ maxWidth: 840, mx: 'auto' }}>
      <Paper elevation={2} sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, border: `1px solid ${medoraColors.border}` }}>
        {/* Header Banner */}
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, alignItems: { sm: 'center' }, justifyContent: 'space-between', gap: 2, mb: 3 }}>
          <Box>
            <Chip
              icon={<CalendarMonthIcon sx={{ fontSize: '16px !important' }} />}
              label="Cổng Dịch Vụ Khách Hàng Medora"
              color="primary"
              variant="outlined"
              size="small"
              sx={{ fontWeight: 700, mb: 1, borderRadius: 3 }}
            />
            <Typography variant="h4" sx={{ fontWeight: 800, color: medoraColors.main }}>
              Đặt Lịch Khám Trực Tuyến
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Quy trình đặt trước ca khám thời gian thực kết hợp phân loại triệu chứng tự động bằng <strong>Spring AI</strong>.
            </Typography>
          </Box>
          {step < 3 && (
            <Chip
              label={`Bước ${step + 1} / 3`}
              sx={{ fontWeight: 800, backgroundColor: medoraColors.soft, color: medoraColors.main, alignSelf: 'flex-start' }}
            />
          )}
        </Box>

        {/* Stepper Header */}
        {step < 3 && (
          <Box sx={{ width: '100%', mb: 4, pt: 1 }}>
            <Stepper
              activeStep={step}
              alternativeLabel
              sx={{
                '& .MuiStepIcon-root.Mui-active': { color: medoraColors.main },
                '& .MuiStepIcon-root.Mui-completed': { color: medoraColors.accent },
              }}
            >
              {wizardSteps.map((label, idx) => (
                <Step key={label} onClick={() => setStep(idx as 0 | 1 | 2)} sx={{ cursor: 'pointer' }}>
                  <StepLabel>
                    <Typography variant="caption" sx={{ fontWeight: step === idx ? 800 : 600 }}>
                      {label}
                    </Typography>
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Box>
        )}

        {/* Error Alert */}
        {error && (
          <Box sx={{ mb: 3 }}>
            <AlertMessage type="error" message={error} onClose={() => setError(null)} />
          </Box>
        )}

        {/* Step 1: Cơ Sở & Chuyên Khoa */}
        {step === 0 && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 1.5, display: 'block', letterSpacing: '0.05em' }}>
                1. Chọn Cơ Sở Y Tế Tiếp Nhận:
              </Typography>
              <Grid container spacing={2}>
                {centers.map((center) => {
                  const isSelected = selectedCenter === center.id;
                  return (
                    <Grid size={{ xs: 12, sm: 6 }} key={center.id}>
                      <Paper
                        elevation={0}
                        onClick={() => setSelectedCenter(center.id)}
                        sx={{
                          p: 2.5,
                          borderRadius: 3,
                          border: `2px solid ${isSelected ? medoraColors.main : medoraColors.border}`,
                          backgroundColor: isSelected ? medoraColors.soft : '#ffffff',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: medoraColors.accent },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: medoraColors.main }}>
                            {center.name?.replace(/MedSched/gi, 'Medora')}
                          </Typography>
                          {isSelected && <CheckCircleIcon sx={{ color: medoraColors.main, fontSize: 20 }} />}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1, color: 'text.secondary' }}>
                          <LocationOnIcon sx={{ fontSize: 16 }} />
                          <Typography variant="caption" sx={{ fontSize: '0.75rem' }}>{center.address}</Typography>
                        </Box>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 1.5, display: 'block', letterSpacing: '0.05em' }}>
                2. Chọn Chuyên Khoa Thăm Khám:
              </Typography>
              <Grid container spacing={1.5}>
                {specialties.map((spec) => {
                  const isSelected = selectedSpecialty === spec.id;
                  return (
                    <Grid size={{ xs: 12, sm: 6 }} key={spec.id}>
                      <Paper
                        elevation={0}
                        onClick={() => setSelectedSpecialty(spec.id)}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          border: `2px solid ${isSelected ? medoraColors.main : medoraColors.border}`,
                          backgroundColor: isSelected ? medoraColors.soft : '#ffffff',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          transition: 'all 0.2s',
                          '&:hover': { borderColor: medoraColors.accent },
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <MedicalServicesIcon sx={{ color: medoraColors.main }} />
                          <Typography variant="body2" sx={{ fontWeight: isSelected ? 800 : 600, color: 'text.primary' }}>
                            {spec.name}
                          </Typography>
                        </Box>
                        {isSelected && <CheckCircleIcon sx={{ color: medoraColors.main, fontSize: 18 }} />}
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', pt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                endIcon={<ArrowForwardIcon />}
                onClick={() => setStep(1)}
                sx={{ px: 4, py: 1.2, borderRadius: 3, fontWeight: 700 }}
              >
                Tiếp tục chọn Bác sĩ
              </Button>
            </Box>
          </Stack>
        )}

        {/* Step 2: Bác Sĩ & Khung Giờ */}
        {step === 1 && (
          <Stack spacing={3}>
            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 1.5, display: 'block', letterSpacing: '0.05em' }}>
                1. Chọn Bác Sĩ Phụ Trách:
              </Typography>
              <Stack spacing={1.5}>
                {doctorList.map((doc) => {
                  const isSelected = selectedDoctor.id === doc.id;
                  return (
                    <Paper
                      key={doc.id}
                      elevation={0}
                      onClick={() => setSelectedDoctor(doc)}
                      sx={{
                        p: 2.5,
                        borderRadius: 3,
                        border: `2px solid ${isSelected ? medoraColors.main : medoraColors.border}`,
                        backgroundColor: isSelected ? medoraColors.soft : '#ffffff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all 0.2s',
                        '&:hover': { borderColor: medoraColors.accent },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: medoraColors.light, color: medoraColors.main, fontWeight: 800 }}>
                          {doc.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>{doc.name}</Typography>
                            <Chip label={doc.room} size="small" sx={{ height: 20, fontSize: '10px', fontWeight: 700, backgroundColor: 'rgba(20, 184, 166, 0.15)', color: medoraColors.main }} />
                          </Box>
                          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.2 }}>{doc.title}</Typography>
                          <Typography variant="caption" sx={{ fontWeight: 800, color: 'success.main', display: 'block', mt: 0.5 }}>
                            Phí tư vấn: {doc.fee.toLocaleString('vi-VN')} đ
                          </Typography>
                        </Box>
                      </Box>
                      {isSelected && <CheckCircleIcon sx={{ color: medoraColors.main }} />}
                    </Paper>
                  );
                })}
              </Stack>
            </Box>

            <Box>
              <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase', mb: 1.5, display: 'block', letterSpacing: '0.05em' }}>
                2. Chọn Khung Giờ Khám (Time-slot):
              </Typography>
              <Grid container spacing={1.5}>
                {timeSlots.map((slot) => {
                  const isFull = slot.status === 'full';
                  const isSelected = selectedSlot.id === slot.id;
                  return (
                    <Grid size={{ xs: 6, sm: 4 }} key={slot.id}>
                      <Button
                        fullWidth
                        disabled={isFull}
                        variant={isSelected ? 'contained' : 'outlined'}
                        color="primary"
                        onClick={() => setSelectedSlot({ id: slot.id, time: slot.time, date: 'Hôm nay' })}
                        sx={{
                          py: 1.5,
                          borderRadius: 3,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          borderColor: isSelected ? medoraColors.main : medoraColors.border,
                        }}
                      >
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{slot.time}</Typography>
                        <Typography variant="caption" sx={{ fontSize: '10px', opacity: 0.9 }}>
                          {slot.label}
                        </Typography>
                      </Button>
                    </Grid>
                  );
                })}
              </Grid>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
              <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => setStep(0)} sx={{ borderRadius: 3 }}>
                Quay lại
              </Button>
              <Button variant="contained" color="primary" endIcon={<ArrowForwardIcon />} onClick={() => setStep(2)} sx={{ borderRadius: 3, px: 3 }}>
                Tiếp tục nhập Triệu chứng
              </Button>
            </Box>
          </Stack>
        )}

        {/* Step 3: Triệu Chứng & Spring AI Triage */}
        {step === 2 && (
          <Box component="form" onSubmit={handleBook}>
            <Stack spacing={3}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: 'text.primary', textTransform: 'uppercase' }}>
                    Mô Tả Triệu Chứng & Cảm Giác Khó Chịu:
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    color="secondary"
                    startIcon={analyzingAi ? <CircularProgress size={14} /> : <AutoAwesomeIcon />}
                    disabled={analyzingAi || !symptoms.trim()}
                    onClick={handleAnalyzeSymptoms}
                    sx={{ borderRadius: 2, fontSize: '0.75rem' }}
                  >
                    {analyzingAi ? 'Đang phân tích...' : 'Thử phân tích AI'}
                  </Button>
                </Box>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  required
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="Ví dụ: Đau tức vùng ngực trái, hồi hộp đánh trống ngực vào ban đêm, thỉnh thoảng choáng nhẹ..."
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 0.8, fontSize: '0.75rem' }}>
                  * Dữ liệu triệu chứng sẽ được Spring AI xử lý và tóm tắt gửi tới Bác sĩ trước khi bạn bước vào phòng khám.
                </Typography>
              </Box>

              {/* AI Summary Preview Card */}
              {aiPreview && (
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, backgroundColor: 'rgba(238, 242, 255, 0.7)', border: '1px solid #C7D2FE' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, color: '#4338CA' }}>
                    <AutoAwesomeIcon fontSize="small" />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.8rem' }}>
                      KẾT QUẢ ĐÁNH GIÁ TỰ ĐỘNG TỪ SPRING AI:
                    </Typography>
                  </Box>
                  <Box sx={{ p: 1.5, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.9)' }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#3730A3', display: 'block' }}>
                      Gợi ý chuyên khoa: {aiPreview.specialty}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                      {aiPreview.summary}
                    </Typography>
                  </Box>
                </Paper>
              )}

              {/* Confirmation Details */}
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, backgroundColor: medoraColors.soft, border: `1px solid ${medoraColors.border}` }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: medoraColors.main, mb: 1 }}>
                  Xác nhận thông tin đặt khám:
                </Typography>
                <Grid container spacing={1}>
                  <Grid size={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Bác sĩ: <strong>{selectedDoctor.name}</strong></Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Phòng khám: <strong>{selectedDoctor.room}</strong></Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Khung giờ: <strong style={{ color: medoraColors.main }}>{selectedSlot.time} ({selectedSlot.date})</strong></Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Giá khám: <strong style={{ color: '#059669' }}>{selectedDoctor.fee.toLocaleString('vi-VN')} đ</strong></Typography>
                  </Grid>
                </Grid>
              </Paper>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 2 }}>
                <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => setStep(1)} sx={{ borderRadius: 3 }}>
                  Quay lại
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  color="primary"
                  disabled={submitting}
                  startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <CheckCircleIcon />}
                  sx={{ borderRadius: 3, px: 3, py: 1.2, fontWeight: 800 }}
                >
                  {submitting ? 'Đang tạo vé khám...' : 'Xác Nhận & Xuất Vé Khám'}
                </Button>
              </Box>
            </Stack>
          </Box>
        )}

        {/* Step 4: Vé Hẹn Khám Điện Tử (E-Ticket) */}
        {step === 3 && result && (
          <Box sx={{ mt: 2 }}>
            <Paper
              elevation={4}
              sx={{
                borderRadius: 4,
                overflow: 'hidden',
                border: `1px solid ${medoraColors.border}`,
              }}
            >
              {/* Header Badge */}
              <Box sx={{ background: 'linear-gradient(135deg, #0F665F 0%, #14B8A6 100%)', color: '#fff', p: 4, textAlign: 'center', position: 'relative' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <SecurityIcon sx={{ color: '#5EEAD4' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Bệnh Viện Đa Khoa Medora
                    </Typography>
                  </Box>
                  <Chip label="VÉ KHÁM ĐIỆN TỬ" size="small" sx={{ fontWeight: 800, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', fontFamily: 'monospace' }} />
                </Box>

                <Typography variant="caption" sx={{ color: '#CCFBF1', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>
                  Số Thứ Tự Vào Khám
                </Typography>
                <Typography variant="h2" sx={{ fontWeight: 900, color: '#ffffff', my: 0.5 }}>
                  STT #{result.queueNumber || '02'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#5EEAD4', fontFamily: 'monospace', fontWeight: 700 }}>
                  Mã đặt chỗ: {result.bookingCode}
                </Typography>
              </Box>

              {/* Body Ticket details */}
              <Box sx={{ p: 4, backgroundColor: '#ffffff' }}>
                <Grid container spacing={3} sx={{ pb: 3, borderBottom: '1px dashed #E2E8F0', alignItems: 'center' }}>
                  <Grid size={{ xs: 12, sm: 8 }}>
                    <Stack spacing={1.5}>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Bác sĩ chuyên khoa:</Typography>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: medoraColors.main }}>{selectedDoctor.name}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Địa điểm & Phòng khám:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{selectedDoctor.room}</Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Khung giờ hẹn:</Typography>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: medoraColors.main }}>{selectedSlot.time} (Hôm nay)</Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid size={{ xs: 12, sm: 4 }} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Paper elevation={0} sx={{ p: 2, border: '1px solid #E2E8F0', borderRadius: 3, backgroundColor: '#F8FAFC', textAlign: 'center' }}>
                      <QrCodeIcon sx={{ fontSize: 96, color: '#1E293B' }} />
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.secondary', display: 'block', mt: 0.5 }}>
                        {result.bookingCode}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>

                {/* AI Summary on Ticket */}
                {result.aiSummary && (
                  <Paper elevation={0} sx={{ p: 2, borderRadius: 3, backgroundColor: '#F3E8FF', border: '1px solid #E9D5FF', my: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6B21A8', mb: 0.5 }}>
                      <AutoAwesomeIcon fontSize="small" />
                      <Typography variant="caption" sx={{ fontWeight: 800 }}>Tóm Tắt Bệnh Án Điện Tử Từ Spring AI:</Typography>
                    </Box>
                    <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'text.primary', display: 'block' }}>
                      🤖 {result.aiSummary}
                    </Typography>
                  </Paper>
                )}

                <Paper elevation={0} sx={{ p: 2, borderRadius: 3, backgroundColor: '#FEF3C7', border: '1px solid #FDE68A', my: 2 }}>
                  <Typography variant="caption" sx={{ color: '#92400E', fontWeight: 600, display: 'block' }}>
                    💡 <strong>Hướng dẫn tiếp đón:</strong> Quý khách vui lòng có mặt trước 10 phút và quét mã QR vé này hoặc đưa thẻ CCCD gắn chip tại Quầy Tiếp Đón để vào thẳng buồng khám.
                  </Typography>
                </Paper>

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ pt: 1 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="inherit"
                    startIcon={<PrintIcon />}
                    onClick={() => window.print()}
                    sx={{ py: 1.2, borderRadius: 3, fontWeight: 700, backgroundColor: '#1E293B', color: '#fff', '&:hover': { backgroundColor: '#0F172A' } }}
                  >
                    In Phiếu / Lưu PDF
                  </Button>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<CalendarMonthIcon />}
                    onClick={() => {
                      setResult(null);
                      setStep(0);
                    }}
                    sx={{ py: 1.2, borderRadius: 3, fontWeight: 800 }}
                  >
                    Đặt ca khám mới
                  </Button>
                </Stack>
              </Box>
            </Paper>
          </Box>
        )}
      </Paper>
    </Stack>
  );
}
