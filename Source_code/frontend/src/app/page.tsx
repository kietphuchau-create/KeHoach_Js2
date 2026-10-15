import React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Divider from "@mui/material/Divider";

import CalendarMonthIcon from "@mui/icons-material/CalendarMonthRounded";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerRounded";
import MedicalServicesIcon from "@mui/icons-material/MedicalServicesRounded";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardRounded";
import ApartmentIcon from "@mui/icons-material/ApartmentRounded";

import HeroCarousel from "@/modules/home/components/HeroCarousel";
import { medoraColors } from "@/shared/theme/theme";

export default function HomePage() {
  const roleCards = [
    {
      role: "Dành cho Bệnh nhân",
      title: "Đặt Khám & Spring AI",
      desc: "Chọn cơ sở, chuyên khoa, bác sĩ, khung giờ thời gian thực và tự động tóm tắt triệu chứng bằng AI.",
      cta: "Trải nghiệm đặt lịch",
      href: "/booking",
      icon: <CalendarMonthIcon sx={{ fontSize: 28, color: medoraColors.main }} />,
    },
    {
      role: "Dành cho Lễ tân",
      title: "Quầy Tiếp Đón 1 Giây",
      desc: "Tiếp nhận bệnh nhân siêu tốc qua mã QR vé hẹn hoặc đầu đọc quét mã thẻ CCCD gắn chip (12 số).",
      cta: "Mở quầy tiếp đón",
      href: "/reception",
      icon: <QrCodeScannerIcon sx={{ fontSize: 28, color: medoraColors.main }} />,
    },
    {
      role: "Dành cho Bác sĩ",
      title: "Buồng Khám & Bệnh Án",
      desc: "Hàng đợi STT trước phòng khám, nút gọi ca khám một chạm và đọc tóm tắt lâm sàng từ Spring AI.",
      cta: "Vào buồng khám bệnh",
      href: "/doctor",
      icon: <MedicalServicesIcon sx={{ fontSize: 28, color: medoraColors.main }} />,
    },
    {
      role: "Dành cho Quản trị viên",
      title: "Quản Trị Người Dùng",
      desc: "Phân quyền RBAC, kích hoạt / khóa tài khoản tức thì, cấp tài khoản Bác sĩ và Nhân viên Lễ tân.",
      cta: "Trung tâm quản trị",
      href: "/admin",
      icon: <AdminPanelSettingsIcon sx={{ fontSize: 28, color: medoraColors.main }} />,
    },
  ];

  return (
    <Stack spacing={4}>
      {/* Responsive Top Banner Hero Carousel */}
      <HeroCarousel />

      {/* Grid of 4 Role Portals */}
      <Grid container spacing={3}>
        {roleCards.map((card, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card
              elevation={0}
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                border: `1px solid ${medoraColors.border}`,
                borderRadius: 4,
                transition: "all 0.2s ease-in-out",
                "&:hover": {
                  boxShadow: "0 10px 25px -5px rgba(15, 102, 95, 0.12)",
                  transform: "translateY(-4px)",
                },
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box
                  sx={{
                    width: 52,
                    height: 52,
                    borderRadius: 3,
                    backgroundColor: medoraColors.soft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 2,
                    border: `1px solid ${medoraColors.border}`,
                  }}
                >
                  {card.icon}
                </Box>

                <Chip
                  label={card.role.toUpperCase()}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: "9px",
                    color: medoraColors.accent,
                    backgroundColor: "transparent",
                    px: 0,
                    height: 20,
                    mb: 0.5,
                  }}
                />

                <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.1rem", color: medoraColors.main, mb: 1 }}>
                  {card.title}
                </Typography>

                <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem", lineHeight: 1.6 }}>
                  {card.desc}
                </Typography>
              </CardContent>

              <Box sx={{ p: 2, pt: 0 }}>
                <Divider sx={{ mb: 1.5, borderColor: "rgba(0,0,0,0.06)" }} />
                <Button
                  component={Link}
                  href={card.href}
                  fullWidth
                  endIcon={<ArrowForwardIcon fontSize="small" />}
                  sx={{
                    justifyContent: "space-between",
                    fontWeight: 700,
                    fontSize: "0.8rem",
                    color: medoraColors.main,
                    px: 1.5,
                    "&:hover": {
                      backgroundColor: medoraColors.soft,
                      color: medoraColors.dark,
                    },
                  }}
                >
                  {card.cta}
                </Button>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Architecture Highlights */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          border: `1px solid ${medoraColors.border}`,
          backgroundColor: "#ffffff",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
          <ApartmentIcon sx={{ color: medoraColors.accent, fontSize: 28 }} />
          <Typography variant="h6" sx={{ fontWeight: 800, color: medoraColors.main, fontSize: "1.2rem" }}>
            Kiến Trúc Kỹ Thuật Hệ Thống Medora
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                backgroundColor: medoraColors.soft,
                border: `1px solid ${medoraColors.border}`,
                height: "100%",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: medoraColors.main, mb: 1 }}>
                1. Spring Boot 3 Backend
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem", lineHeight: 1.6 }}>
                Kiến trúc Ports & Adapters (Hexagonal Architecture), Spring Security Stateless JWT, khóa lạc quan chống Double Booking.
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                backgroundColor: medoraColors.soft,
                border: `1px solid ${medoraColors.border}`,
                height: "100%",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: medoraColors.main, mb: 1 }}>
                2. Spring AI Integration
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem", lineHeight: 1.6 }}>
                Tự động phân luồng chuyên khoa tiếp nhận và tóm tắt bệnh sử 2 dòng giúp bác sĩ tiết kiệm thời gian đọc hồ sơ.
              </Typography>
            </Paper>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                borderRadius: 3,
                backgroundColor: medoraColors.soft,
                border: `1px solid ${medoraColors.border}`,
                height: "100%",
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: medoraColors.main, mb: 1 }}>
                3. Tiếp Đón Siêu Tốc 1s
              </Typography>
              <Typography variant="body2" sx={{ color: "text.secondary", fontSize: "0.8rem", lineHeight: 1.6 }}>
                Tích hợp đầu đọc thẻ CCCD gắn chip 12 số & máy quét mã QR vé hẹn điện tử, giảm tải 95% thời gian xếp hàng tại bệnh viện.
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
    </Stack>
  );
}
