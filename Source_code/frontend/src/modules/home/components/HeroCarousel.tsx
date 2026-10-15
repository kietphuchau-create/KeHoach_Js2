'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';

import PersonIcon from '@mui/icons-material/Person';
import QrCodeIcon from '@mui/icons-material/QrCode2';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import BusinessIcon from '@mui/icons-material/Business';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import DescriptionIcon from '@mui/icons-material/Description';
import SecurityIcon from '@mui/icons-material/Security';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import BoltIcon from '@mui/icons-material/Bolt';

import { medoraColors } from '@/shared/theme/theme';

interface Slide {
  id: number;
  badge: {
    text: string;
    icon: React.ReactNode;
  };
  title: string;
  titleHighlight: string;
  description: string;
  primaryCta: {
    text: string;
    href: string;
  };
  secondaryCta: {
    text: string;
    href: string;
  };
  stepsTitle: string;
  steps: {
    title: string;
    desc: string;
    icon: React.ReactNode;
  }[];
  mockupType: 'BOOKING_PROCESS' | 'E_TICKET' | 'SPRING_AI';
  bannerImg: string;
}

const slides: Slide[] = [
  {
    id: 1,
    badge: {
      text: 'DÀNH CHO BỆNH NHÂN',
      icon: <PersonIcon sx={{ fontSize: 16, color: '#5EEAD4' }} />,
    },
    title: 'Đặt Lịch Khám Dễ Dàng,',
    titleHighlight: 'Chăm Sóc Sức Khỏe Chủ Động',
    description:
      'Tìm cơ sở y tế, chọn chuyên khoa và bác sĩ phù hợp với nhu cầu của bạn. Medora đồng hành cùng bạn trong hành trình chăm sóc sức khỏe.',
    primaryCta: {
      text: 'Đặt Lịch Khám Ngay',
      href: '/booking',
    },
    secondaryCta: {
      text: 'Tìm Hiểu Thêm',
      href: '/booking',
    },
    stepsTitle: 'Hành Trình Đặt Lịch Thông Minh',
    steps: [
      {
        title: 'Chọn cơ sở y tế',
        desc: 'Hệ thống hiển thị đầy đủ thông tin các cơ sở liên kết.',
        icon: <BusinessIcon sx={{ color: '#99F6E4' }} />,
      },
      {
        title: 'Chọn chuyên khoa & bác sĩ',
        desc: 'Tìm bác sĩ phù hợp với nhu cầu và lịch trình của bạn.',
        icon: <MedicalServicesIcon sx={{ color: '#99F6E4' }} />,
      },
      {
        title: 'Đặt lịch nhanh chóng',
        desc: 'Nhận xác nhận lịch hẹn qua SMS và email.',
        icon: <CalendarMonthIcon sx={{ color: '#99F6E4' }} />,
      },
    ],
    mockupType: 'BOOKING_PROCESS',
    bannerImg: '/images/banners/patient_booking_hero.jpg',
  },
  {
    id: 2,
    badge: {
      text: 'TIỆN ÍCH BỆNH NHÂN',
      icon: <QrCodeIcon sx={{ fontSize: 16, color: '#5EEAD4' }} />,
    },
    title: 'Quản Lý Vé Hẹn Khám,',
    titleHighlight: 'Check-in Siêu Tốc 1 Giây',
    description:
      'Tải mã QR vé hẹn điện tử trên Smartphone hoặc dùng thẻ CCCD 12 số để xác thực tự động và nhận ngay số thứ tự vào phòng khám.',
    primaryCta: {
      text: 'Xem Lịch Hẹn Của Tôi',
      href: '/profile',
    },
    secondaryCta: {
      text: 'Đặt Khám Chi Nhánh',
      href: '/booking',
    },
    stepsTitle: 'Tiện Ích Khám Ngoại Trú',
    steps: [
      {
        title: 'Vé hẹn điện tử QR',
        desc: 'Lưu trữ vé hẹn trên ứng dụng không lo mất giấy tờ.',
        icon: <QrCodeIcon sx={{ color: '#5EEAD4' }} />,
      },
      {
        title: 'Miễn xếp hàng chờ',
        desc: 'Quét mã 1s tại quầy lễ tân nhận ngay STT phòng khám.',
        icon: <BoltIcon sx={{ color: '#5EEAD4' }} />,
      },
      {
        title: 'Nhắc lịch tự động',
        desc: 'Thông báo giờ khám chính xác qua Zalo & SMS.',
        icon: <AccessTimeIcon sx={{ color: '#5EEAD4' }} />,
      },
    ],
    mockupType: 'E_TICKET',
    bannerImg: '/images/banners/patient_eticket_checkin.jpg',
  },
  {
    id: 3,
    badge: {
      text: 'CHĂM SÓC Y TẾ TOÀN DIỆN',
      icon: <AutoAwesomeIcon sx={{ fontSize: 16, color: '#FCD34D' }} />,
    },
    title: 'Hồ Sơ Y Tế Điện Tử &',
    titleHighlight: 'Spring AI Phân Loại Bệnh Sử',
    description:
      'Trợ lý Spring AI tự động tóm tắt triệu chứng 2 dòng ngắn gọn, gợi ý đúng chuyên khoa khám và lưu trữ hồ sơ y tế bảo mật cho bạn.',
    primaryCta: {
      text: 'Trải Nghiệm Spring AI',
      href: '/booking',
    },
    secondaryCta: {
      text: 'Xem Hồ Sơ Khám',
      href: '/profile',
    },
    stepsTitle: 'Trải Nghiệm Y Tế Chuẩn Quốc Tế',
    steps: [
      {
        title: 'Spring AI sàng lọc triệu chứng',
        desc: 'Phân tích mô tả triệu chứng và gợi ý chuyên khoa.',
        icon: <SmartToyIcon sx={{ color: '#67E8F9' }} />,
      },
      {
        title: 'Bệnh án điện tử EMR',
        desc: 'Quản lý lịch sử khám bệnh và đơn thuốc điện tử.',
        icon: <DescriptionIcon sx={{ color: '#67E8F9' }} />,
      },
      {
        title: 'Bảo mật dữ liệu y tế',
        desc: 'Mã hóa chuẩn HIPAA an toàn thông tin cá nhân.',
        icon: <SecurityIcon sx={{ color: '#67E8F9' }} />,
      },
    ],
    mockupType: 'SPRING_AI',
    bannerImg: '/images/banners/patient_healthcare_journey.jpg',
  },
];

export default function HeroCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <Paper
      elevation={6}
      sx={{
        position: 'relative',
        borderRadius: '28px',
        overflow: 'hidden',
        border: `1px solid rgba(15, 102, 95, 0.3)`,
        background: 'linear-gradient(135deg, #0B3D36 0%, #0F665F 50%, #0A4D46 100%)',
        color: '#ffffff',
        userSelect: 'none',
        transition: 'all 0.7s ease',
      }}
    >
      {/* Background Image & Overlay */}
      <Box sx={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <Image
          src={slide.bannerImg}
          alt={slide.title}
          fill
          priority
          sizes="(max-width: 1200px) 100vw, 1200px"
          style={{ objectFit: 'cover', objectPosition: 'center', opacity: 0.65 }}
        />
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(to right, rgba(11, 61, 54, 0.85), rgba(15, 102, 95, 0.6), rgba(10, 77, 70, 0.4))',
          }}
        />
      </Box>

      <Box
        sx={{
          p: { xs: 3, sm: 5, lg: 6 },
          minHeight: { xs: 480, md: 460 },
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Glow Effects */}
        <Box
          sx={{
            position: 'absolute',
            right: -80,
            top: -80,
            width: 380,
            height: 380,
            borderRadius: '50%',
            backgroundColor: 'rgba(20, 184, 166, 0.2)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        {/* 1. Top Badge */}
        <Box sx={{ display: 'flex', items: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Chip
            icon={slide.badge.icon as React.ReactElement}
            label={slide.badge.text}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              color: '#5EEAD4',
              fontWeight: 800,
              fontSize: '0.75rem',
              letterSpacing: '0.08em',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              px: 1,
            }}
          />
        </Box>

        {/* 2. Main Grid Layout */}
        <Grid container spacing={3} sx={{ my: 'auto', py: 1, alignItems: 'center' }}>
          
          {/* Left Text Column */}
          <Grid size={{ xs: 12, lg: 7, xl: 5 }}>
            <Box sx={{ textAlign: 'left' }}>
              <Typography
                variant="h3"
                component="h1"
                sx={{
                  fontSize: { xs: '1.6rem', sm: '2.2rem', lg: '2.5rem' },
                  fontWeight: 900,
                  lineHeight: 1.2,
                  color: '#ffffff',
                }}
              >
                {slide.title}{' '}
                <Box component="span" sx={{ display: 'block', color: '#5EEAD4', fontWeight: 900 }}>
                  {slide.titleHighlight}
                </Box>
              </Typography>

              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(241, 245, 249, 0.95)',
                  fontSize: { xs: '0.825rem', sm: '0.9rem' },
                  lineHeight: 1.6,
                  mt: 2,
                  mb: 3,
                  maxWidth: 500,
                }}
              >
                {slide.description}
              </Typography>

              <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                <Button
                  component={Link}
                  href={slide.primaryCta.href}
                  variant="contained"
                  startIcon={<CalendarMonthIcon />}
                  endIcon={<ArrowForwardIcon />}
                  sx={{
                    backgroundColor: medoraColors.accent,
                    color: '#ffffff',
                    fontWeight: 800,
                    px: 3,
                    py: 1.4,
                    borderRadius: 4,
                    fontSize: '0.875rem',
                    boxShadow: '0 8px 20px rgba(10, 77, 70, 0.4)',
                    '&:hover': {
                      backgroundColor: medoraColors.main,
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  {slide.primaryCta.text}
                </Button>

                <Button
                  component={Link}
                  href={slide.secondaryCta.href}
                  variant="outlined"
                  startIcon={<PlayArrowIcon sx={{ fill: '#ffffff' }} />}
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    fontWeight: 700,
                    px: 2.5,
                    py: 1.4,
                    borderRadius: 4,
                    fontSize: '0.875rem',
                    backdropFilter: 'blur(8px)',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      borderColor: 'rgba(255, 255, 255, 0.5)',
                      transform: 'translateY(-2px)',
                    },
                    transition: 'all 0.2s',
                  }}
                >
                  {slide.secondaryCta.text}
                </Button>
              </Stack>
            </Box>
          </Grid>

          {/* Center Column: Interactive UI Mockup Card */}
          <Grid size={{ xs: 12, xl: 3 }} sx={{ display: { xs: 'none', xl: 'flex' }, justifyContent: 'center' }}>
            {slide.mockupType === 'BOOKING_PROCESS' && (
              <Card
                sx={{
                  width: 250,
                  backgroundColor: '#ffffff',
                  color: '#1E293B',
                  borderRadius: 4,
                  p: 2,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                  border: '4px solid rgba(255,255,255,0.4)',
                  transform: 'hover:scale(1.05)',
                  transition: 'transform 0.3s',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #F1F5F9' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#1E293B' }}>Đặt lịch khám</Typography>
                  <Box sx={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#14B8A6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>✓</Box>
                </Box>
                <Box sx={{ my: 1.5, p: 1, backgroundColor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#0F665F' }}>Medora Chi Nhánh Q.1</Typography>
                  <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.65rem' }}>123 Nguyễn Thị Minh Khai</Typography>
                </Box>
                <Box sx={{ p: 1, backgroundColor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0', mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.75rem', color: '#1E293B' }}>BS. PGS.TS Trần Văn Hùng</Typography>
                  <Typography variant="caption" sx={{ display: 'block', color: '#14B8A6', fontSize: '0.65rem', fontWeight: 700 }}>Khoa Nội Tim Mạch</Typography>
                </Box>
                <Box sx={{ p: 1, backgroundColor: '#F8FAFC', borderRadius: 3, border: '1px solid #E2E8F0' }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.7rem', color: '#1E293B' }}>Thứ 3, 15/04 - 09:30</Typography>
                </Box>
              </Card>
            )}

            {slide.mockupType === 'E_TICKET' && (
              <Card
                sx={{
                  width: 250,
                  backgroundColor: '#ffffff',
                  color: '#1E293B',
                  borderRadius: 4,
                  p: 2,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                  border: '4px solid rgba(255,255,255,0.4)',
                  textAlign: 'center',
                }}
              >
                <Box sx={{ background: 'linear-gradient(to right, #0F665F, #14B8A6)', color: '#fff', p: 1.5, borderRadius: 3, mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontSize: '0.65rem', color: '#99F6E4', letterSpacing: '0.05em' }}>VÉ HẸN ĐIỆN TỬ</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 900, color: '#fff' }}>STT #02</Typography>
                  <Typography variant="caption" sx={{ fontFamily: 'monospace', color: '#5EEAD4' }}>MED-2026-8899</Typography>
                </Box>
                <Box sx={{ p: 1, backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 2, mb: 1.5 }}>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#065F46', fontSize: '0.7rem' }}>✓ VÉ HẸN ĐÃ XÁC THỰC</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 1, bg: '#F8FAFC', borderRadius: 3 }}>
                  <QrCodeIcon sx={{ fontSize: 64, color: '#1E293B' }} />
                </Box>
                <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.65rem', display: 'block', mt: 1 }}>Quét mã QR 1s tại quầy tiếp đón</Typography>
              </Card>
            )}

            {slide.mockupType === 'SPRING_AI' && (
              <Card
                sx={{
                  width: 250,
                  backgroundColor: '#ffffff',
                  color: '#1E293B',
                  borderRadius: 4,
                  p: 2,
                  boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                  border: '4px solid rgba(255,255,255,0.4)',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 1, borderBottom: '1px solid #F1F5F9', mb: 1 }}>
                  <SmartToyIcon sx={{ color: '#14B8A6', fontSize: 18 }} />
                  <Typography variant="caption" sx={{ fontWeight: 800, color: '#1E293B' }}>Spring AI Tóm Tắt Lâm Sàng</Typography>
                </Box>
                <Stack spacing={1}>
                  <Box sx={{ p: 1, backgroundColor: '#F0FDFA', border: '1px solid #CCFBF1', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#0F665F', display: 'block', fontSize: '0.65rem' }}>🔍 Triệu Chứng:</Typography>
                    <Typography variant="caption" sx={{ color: '#334155', fontSize: '0.65rem' }}>Đau tức ngực gắng sức, nghi huyết áp</Typography>
                  </Box>
                  <Box sx={{ p: 1, backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 2 }}>
                    <Typography variant="caption" sx={{ fontWeight: 800, color: '#065F46', display: 'block', fontSize: '0.65rem' }}>🩺 Gợi Ý Chuyên Khoa:</Typography>
                    <Typography variant="caption" sx={{ color: '#065F46', fontWeight: 800, fontSize: '0.65rem' }}>Khoa Nội Tim Mạch (P.201)</Typography>
                  </Box>
                </Stack>
              </Card>
            )}
          </Grid>

          {/* Right Column: Steps List */}
          <Grid size={{ xs: 12, md: 6, lg: 5, xl: 4 }} sx={{ display: { xs: 'none', md: 'block' } }}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                borderRadius: 5,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', mb: 2, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                {slide.stepsTitle}
              </Typography>

              <Stack spacing={1.5}>
                {slide.steps.map((st, i) => (
                  <Box
                    key={i}
                    sx={{
                      p: 1.5,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.08)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.18)' },
                      transition: 'background 0.2s',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box sx={{ p: 1, borderRadius: 2, backgroundColor: 'rgba(20, 184, 166, 0.3)', display: 'flex' }}>
                        {st.icon}
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#ffffff', fontSize: '0.825rem', lineHeight: 1.2 }}>
                          {st.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#CCFBF1', fontSize: '0.725rem', lineHeight: 1.2 }}>
                          {st.desc}
                        </Typography>
                      </Box>
                    </Box>
                    <ChevronRightIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 18 }} />
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        </Grid>

        {/* 3. Bottom Controls */}
        <Box
          sx={{
            position: 'relative',
            zIndex: 10,
            pt: 2,
            mt: 1,
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Controls: Prev, Dots, Next */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <IconButton
              size="small"
              onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              <ChevronLeftIcon fontSize="small" />
            </IconButton>

            {/* Clickable Dots */}
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              {slides.map((_, idx) => (
                <Box
                  key={idx}
                  onClick={() => setCurrent(idx)}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    width: current === idx ? 36 : 10,
                    backgroundColor: current === idx ? '#5EEAD4' : 'rgba(255, 255, 255, 0.4)',
                    boxShadow: current === idx ? '0 0 10px rgba(94, 234, 212, 0.6)' : 'none',
                    '&:hover': { backgroundColor: '#ffffff' },
                  }}
                />
              ))}
            </Stack>

            <IconButton
              size="small"
              onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.3)' },
              }}
            >
              <ChevronRightIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* Right Status */}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <Chip
              label={`0${current + 1} / 0${slides.length}`}
              size="small"
              sx={{
                fontFamily: 'monospace',
                fontWeight: 800,
                color: '#ffffff',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            />
            <Chip
              icon={<AccessTimeIcon sx={{ fontSize: 14, color: '#5EEAD4 !important' }} />}
              label="Tự động chuyển (5s)"
              size="small"
              sx={{
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#5EEAD4',
                backgroundColor: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                display: { xs: 'none', sm: 'inline-flex' },
              }}
            />
          </Stack>
        </Box>
      </Box>
    </Paper>
  );
}
