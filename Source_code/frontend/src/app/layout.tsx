import type { Metadata } from "next";
import React from "react";
import "./globals.css";
import HeaderNav from "@/shared/components/HeaderNav/HeaderNav";
import AppThemeProvider from "@/shared/theme/AppThemeProvider";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import { medoraColors } from "@/shared/theme/theme";

export const metadata: Metadata = {
  title: "Medora - Modern Care, Better Health",
  description: "Hệ thống Đặt lịch & Tiếp đón Y tế Thông minh Tích hợp Spring Boot 3, Spring AI và Quét thẻ CCCD",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body style={{ margin: 0, padding: 0, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppThemeProvider>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: medoraColors.soft }}>
            <HeaderNav />
            <Box component="main" sx={{ flex: 1, py: { xs: 2, sm: 3, lg: 4 } }}>
              <Container maxWidth="lg">
                {children}
              </Container>
            </Box>
            <Box
              component="footer"
              sx={{
                backgroundColor: '#ffffff',
                borderTop: `1px solid ${medoraColors.border}`,
                py: 3,
                mt: 'auto',
              }}
            >
              <Container maxWidth="lg">
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', sm: 'row' },
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                  }}
                >
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                    © 2026 Medora Healthcare System. All rights reserved.
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary', opacity: 0.8 }}>
                    Hệ thống Y tế Thông minh Spring Boot 3 + Next.js 15
                  </Typography>
                </Box>
              </Container>
            </Box>
          </Box>
        </AppThemeProvider>
      </body>
    </html>
  );
}
