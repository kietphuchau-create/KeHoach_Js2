'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';

import HomeIcon from '@mui/icons-material/HomeRounded';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonthRounded';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScannerRounded';
import MedicalServicesIcon from '@mui/icons-material/MedicalServicesRounded';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import AccountCircleIcon from '@mui/icons-material/AccountCircleRounded';
import LogoutIcon from '@mui/icons-material/LogoutRounded';
import LoginIcon from '@mui/icons-material/LoginRounded';
import PersonAddIcon from '@mui/icons-material/PersonAddRounded';
import MenuIcon from '@mui/icons-material/MenuRounded';
import CloseIcon from '@mui/icons-material/CloseRounded';

import { getAuthToken, getAuthUser, clearAuthSession } from '@/shared/lib/api';
import { medoraColors } from '@/shared/theme/theme';

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    const authUser = getAuthUser();
    if (token && authUser) {
      setUser(authUser);
    } else {
      setUser(null);
    }
  }, [pathname]);

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    router.push('/login');
  };

  const roles: string[] = user?.roles || [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isDoctor = roles.includes('ROLE_DOCTOR');
  const isStaff = roles.includes('ROLE_STAFF');

  const navLinks = [
    { href: '/', label: 'Trang Chủ', icon: HomeIcon },
    { href: '/booking', label: 'Đặt Lịch Khám', icon: CalendarMonthIcon, isFeatured: true },
    ...(isStaff || isAdmin ? [{ href: '/reception', label: 'Quầy Tiếp Đón', icon: QrCodeScannerIcon }] : []),
    ...(isDoctor || isAdmin ? [{ href: '/doctor', label: 'Buồng Khám Bác Sĩ', icon: MedicalServicesIcon }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Quản Trị Admin', icon: AdminPanelSettingsIcon }] : []),
  ];

  return (
    <AppBar
      position="sticky"
      color="inherit"
      elevation={0}
      sx={{
        backgroundColor: '#ffffff',
        borderBottom: `1px solid ${medoraColors.border}`,
        top: 0,
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Container maxWidth="lg" disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
        <Toolbar disableGutters sx={{ minHeight: 70, justifyContent: 'space-between' }}>
          
          {/* Brand Logo & Desktop Links */}
          <Box sx={{ display: 'flex', items: 'center', gap: 3 }}>
            <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  transition: 'transform 0.2s',
                  '&:hover': { transform: 'scale(1.04)' },
                }}
              >
                <Image
                  src="/images/logos/logo.png"
                  alt="Medora Logo"
                  width={48}
                  height={48}
                  style={{ height: '44px', width: 'auto', objectFit: 'contain' }}
                  priority
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 900,
                    color: medoraColors.main,
                    letterSpacing: '-0.02em',
                    lineHeight: 1,
                  }}
                >
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
                    mt: '3px',
                    lineHeight: 1,
                  }}
                >
                  MODERN CARE, BETTER HEALTH
                </Typography>
              </Box>
            </Link>

            {/* Desktop Navigation */}
            <Stack direction="row" spacing={1} sx={{ display: { xs: 'none', md: 'flex' }, items: 'center', ml: 2 }}>
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;

                if (link.isFeatured) {
                  return (
                    <Button
                      key={link.href}
                      component={Link}
                      href={link.href}
                      variant="contained"
                      color="primary"
                      startIcon={<Icon />}
                      sx={{
                        borderRadius: 30,
                        px: 2.5,
                        py: 0.8,
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        backgroundColor: medoraColors.main,
                        boxShadow: isActive ? `0 0 0 2px ${medoraColors.accent}` : 'none',
                        '&:hover': {
                          backgroundColor: medoraColors.dark,
                        },
                      }}
                    >
                      {link.label}
                    </Button>
                  );
                }

                return (
                  <Button
                    key={link.href}
                    component={Link}
                    href={link.href}
                    startIcon={<Icon sx={{ color: isActive ? medoraColors.main : 'text.secondary' }} />}
                    sx={{
                      borderRadius: 30,
                      px: 2,
                      py: 0.8,
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 600,
                      color: isActive ? medoraColors.main : 'text.primary',
                      backgroundColor: isActive ? 'rgba(94, 234, 212, 0.3)' : 'transparent',
                      '&:hover': {
                        backgroundColor: 'rgba(94, 234, 212, 0.15)',
                        color: medoraColors.main,
                      },
                    }}
                  >
                    {link.label}
                  </Button>
                );
              })}
            </Stack>
          </Box>

          {/* User Auth Section (Desktop) */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5 }}>
            {user ? (
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Button
                  component={Link}
                  href="/profile"
                  variant="outlined"
                  startIcon={<AccountCircleIcon sx={{ color: medoraColors.accent }} />}
                  endIcon={
                    <Chip
                      label={roles[0]?.replace('ROLE_', '') || 'PATIENT'}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '9px',
                        fontWeight: 800,
                        backgroundColor: medoraColors.light,
                        color: medoraColors.main,
                      }}
                    />
                  }
                  sx={{
                    borderRadius: 30,
                    px: 2,
                    py: 0.7,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderColor: pathname === '/profile' ? medoraColors.accent : medoraColors.border,
                    backgroundColor: medoraColors.soft,
                    color: medoraColors.main,
                    '&:hover': {
                      borderColor: medoraColors.accent,
                      backgroundColor: medoraColors.soft,
                    },
                  }}
                >
                  <Box component="span" sx={{ maxWidth: 120, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {user.fullName || user.email}
                  </Box>
                </Button>

                <IconButton
                  onClick={handleLogout}
                  size="small"
                  title="Đăng xuất"
                  sx={{
                    color: 'text.secondary',
                    '&:hover': { color: 'error.main', backgroundColor: 'error.light' },
                  }}
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Stack>
            ) : (
              <Stack direction="row" spacing={1}>
                <Button
                  component={Link}
                  href="/login"
                  variant="outlined"
                  startIcon={<LoginIcon />}
                  sx={{
                    borderRadius: 3,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    borderColor: 'rgba(20, 184, 166, 0.4)',
                    color: medoraColors.main,
                    '&:hover': {
                      backgroundColor: medoraColors.soft,
                      borderColor: medoraColors.accent,
                    },
                  }}
                >
                  Đăng Nhập
                </Button>
                <Button
                  component={Link}
                  href="/register"
                  variant="contained"
                  color="primary"
                  startIcon={<PersonAddIcon />}
                  sx={{
                    borderRadius: 3,
                    fontSize: '0.8rem',
                    fontWeight: 700,
                  }}
                >
                  Đăng Ký
                </Button>
              </Stack>
            )}
          </Box>

          {/* Mobile Hamburger Button */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton onClick={() => setMobileMenuOpen(!mobileMenuOpen)} color="inherit">
              {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
          </Box>
        </Toolbar>
      </Container>

      {/* Mobile Drawer Navigation */}
      <Drawer
        anchor="top"
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        slotProps={{
          paper: {
            sx: {
              mt: '70px',
              borderRadius: '0 0 20px 20px',
              px: 2,
              pb: 3,
              pt: 1,
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
            },
          },
        }}
      >
        <List disablePadding>
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <ListItem key={link.href} disablePadding sx={{ my: 0.5 }}>
                <ListItemButton
                  component={Link}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  selected={isActive}
                  sx={{
                    borderRadius: 3,
                    py: 1.2,
                    '&.Mui-selected': {
                      backgroundColor: medoraColors.soft,
                      color: medoraColors.main,
                      fontWeight: 700,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40, color: isActive ? medoraColors.main : 'text.secondary' }}>
                    <Icon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: isActive ? 700 : 600 }}>
                        {link.label}
                      </Typography>
                    }
                  />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>

        <Divider sx={{ my: 1.5 }} />

        {user ? (
          <Box sx={{ px: 1, pt: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Button
              component={Link}
              href="/profile"
              onClick={() => setMobileMenuOpen(false)}
              variant="outlined"
              fullWidth
              startIcon={<AccountCircleIcon />}
              sx={{
                justifyContent: 'space-between',
                borderRadius: 3,
                borderColor: medoraColors.border,
                backgroundColor: medoraColors.soft,
                color: medoraColors.main,
              }}
            >
              <span>{user.fullName || user.email}</span>
              <Chip
                label={roles[0]?.replace('ROLE_', '') || 'USER'}
                size="small"
                sx={{ height: 20, fontSize: '9px', fontWeight: 800, backgroundColor: medoraColors.light, color: medoraColors.main }}
              />
            </Button>

            <Button
              onClick={() => {
                setMobileMenuOpen(false);
                handleLogout();
              }}
              color="error"
              variant="text"
              fullWidth
              startIcon={<LogoutIcon />}
              sx={{ borderRadius: 3, mt: 0.5 }}
            >
              Đăng Xuất
            </Button>
          </Box>
        ) : (
          <Stack direction="row" spacing={1.5} sx={{ pt: 1, px: 1 }}>
            <Button
              component={Link}
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              variant="outlined"
              fullWidth
              sx={{ borderRadius: 3 }}
            >
              Đăng Nhập
            </Button>
            <Button
              component={Link}
              href="/register"
              onClick={() => setMobileMenuOpen(false)}
              variant="contained"
              fullWidth
              sx={{ borderRadius: 3 }}
            >
              Đăng Ký
            </Button>
          </Stack>
        )}
      </Drawer>
    </AppBar>
  );
}
