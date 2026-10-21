'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, 
  QrCode, 
  ShieldCheck, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Menu, 
  X,
  Stethoscope,
  Calendar,
  BarChart3,
  FileText,
  ClipboardList,
  DoorOpen,
  Phone,
  Clock,
  Sparkles
} from 'lucide-react';
import { getAuthToken, getAuthUser, clearAuthSession, api } from '@/shared/lib/api';

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 15);
          ticking = false;
        });
        ticking = true;
      }
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Xóa triệt để các dấu vết localStorage cũ trên trình duyệt
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.removeItem("role");
    }
    const token = getAuthToken();
    const authUser = getAuthUser();
    if (token && authUser) {
      setUser(authUser);
      const userRoles: string[] = authUser.roles || [];
      if (userRoles.includes('ROLE_ADMIN')) {
        if (pathname === '/' || pathname === '/booking' || pathname === '/booking-method' || pathname === '/reception' || pathname === '/doctor' || pathname === '/my-appointments') {
          router.push('/admin');
        }
      } else if (userRoles.includes('ROLE_DOCTOR')) {
        if (pathname === '/' || pathname === '/booking' || pathname === '/booking-method' || pathname === '/reception' || pathname === '/admin' || pathname === '/my-appointments') {
          router.push('/doctor');
        }
      } else if (userRoles.includes('ROLE_STAFF')) {
        if (pathname === '/' || pathname === '/booking' || pathname === '/booking-method' || pathname === '/doctor' || pathname === '/admin' || pathname === '/my-appointments') {
          router.push('/reception');
        }
      }
      // Tự động đồng bộ thông tin mới nhất từ API backend để cập nhật tiếng Việt và quyền
      api.getProfile().then((freshProfile: any) => {
        if (freshProfile && freshProfile.fullName) {
          const storedRoom = typeof window !== 'undefined' ? sessionStorage.getItem('medsched_doctor_active_room') : null;
          const updatedUser = {
            ...authUser,
            fullName: freshProfile.fullName,
            phone: freshProfile.phone || authUser.phone,
            roles: freshProfile.roles || authUser.roles,
            roomNumber: authUser.roomNumber || storedRoom || null,
          };
          setUser((prev: any) => ({
            ...updatedUser,
            roomNumber: prev?.roomNumber || updatedUser.roomNumber,
          }));
          if (typeof window !== "undefined") {
            sessionStorage.setItem("user", JSON.stringify(updatedUser));
          }
          if (updatedUser.roles?.includes('ROLE_ADMIN')) {
            if (pathname === '/' || pathname === '/booking' || pathname === '/booking-method' || pathname === '/reception' || pathname === '/doctor' || pathname === '/my-appointments') {
              router.push('/admin');
            }
          } else if (updatedUser.roles?.includes('ROLE_DOCTOR')) {
            if (pathname === '/' || pathname === '/booking' || pathname === '/booking-method' || pathname === '/reception' || pathname === '/admin' || pathname === '/my-appointments') {
              router.push('/doctor');
            }
          } else if (updatedUser.roles?.includes('ROLE_STAFF')) {
            if (pathname === '/' || pathname === '/booking' || pathname === '/booking-method' || pathname === '/doctor' || pathname === '/admin' || pathname === '/my-appointments') {
              router.push('/reception');
            }
          }
        }
      }).catch(() => {});
      if (userRoles.includes('ROLE_DOCTOR')) {
        const storedRoom = typeof window !== 'undefined' ? sessionStorage.getItem('medsched_doctor_active_room') : null;
        if (storedRoom) {
          setUser((prev: any) => prev ? { ...prev, roomNumber: storedRoom } : prev);
        } else {
          api.getDoctors().then((docs) => {
            if (Array.isArray(docs)) {
              const matched = docs.find((d: any) =>
                (authUser.id && d.userId === authUser.id) ||
                (authUser.fullName && d.fullName?.toLowerCase() === authUser.fullName?.toLowerCase()) ||
                (authUser.email && d.email?.toLowerCase() === authUser.email?.toLowerCase())
              );
              if (matched?.roomNumber) {
                setUser((prev: any) => prev ? { ...prev, roomNumber: matched.roomNumber } : prev);
              }
            }
          }).catch(() => {});
        }
      }
    } else {
      setUser(null);
    }

    const handleRoomChanged = (e: any) => {
      const room = e?.detail?.roomNumber || sessionStorage.getItem('medsched_doctor_active_room');
      if (room) {
        setUser((prev: any) => prev ? { ...prev, roomNumber: room } : prev);
      }
    };
    window.addEventListener("medsched:doctor_room_changed", handleRoomChanged);

    const handleKickout = () => {
      setUser(null);
    };
    window.addEventListener("medsched:concurrent_kickout", handleKickout);
    return () => {
      window.removeEventListener("medsched:doctor_room_changed", handleRoomChanged);
      window.removeEventListener("medsched:concurrent_kickout", handleKickout);
    };
  }, [pathname, router]);

  const handleLogout = () => {
    clearAuthSession();
    setUser(null);
    router.push('/login');
  };

  const roles: string[] = user?.roles || [];
  const isAdmin = roles.includes('ROLE_ADMIN');
  const isDoctor = roles.includes('ROLE_DOCTOR');
  const isStaff = roles.includes('ROLE_STAFF');

  // Phân quyền thanh điều hướng tách bạch theo từng vai trò nghiệp vụ:
  // - Admin: Quản trị người dùng & Cấp tài khoản
  // - Bác sĩ: Buồng khám ca trực & Hồ sơ chuyên môn (KHÔNG thấy Đặt lịch hay Phiếu khám cá nhân)
  // - Lễ tân: Quầy tiếp đón & Hồ sơ cá nhân (KHÔNG thấy Đặt lịch hay Phiếu khám cá nhân)
  // - Bệnh nhân / Vãng lai: Trang chủ, Đặt lịch khám, Phiếu khám của tôi
  let navLinks = [
    { href: '/', label: 'Trang Chủ', icon: Building2 },
    { href: '/#workflow', label: 'Quy Trình', icon: ShieldCheck },
    { href: '/#about', label: 'Về MedSched', icon: Sparkles },
    { href: '/#specialties', label: 'Chuyên Khoa', icon: Stethoscope },
    { href: '/booking-method', label: 'Đặt Lịch Khám', icon: Calendar },
    { href: '/my-appointments', label: 'Phiếu Khám', icon: ClipboardList },
  ];

  if (isAdmin) {
    navLinks = [
      { href: '/admin', label: 'Quản Trị Người Dùng', icon: ShieldCheck },
      { href: '/admin/catalog', label: 'Danh Mục & Phòng Khám', icon: DoorOpen },
      { href: '/admin/create-user', label: 'Cấp Tài Khoản Mới', icon: UserPlus },
      { href: '/statistics', label: 'Báo Cáo Thống Kê', icon: BarChart3 },
    ];
  } else if (isDoctor) {
    navLinks = [
      { href: '/doctor', label: 'Buồng Khám Bác Sĩ', icon: Stethoscope },
      { href: '/doctor/schedule', label: 'Lịch Trực Bác Sĩ', icon: Calendar },
      { href: '/doctor/history', label: 'Lịch Sử Khám & Đơn Thuốc', icon: FileText },
      { href: '/statistics', label: 'Thống Kê Khám Bệnh', icon: BarChart3 },
    ];
  } else if (isStaff) {
    navLinks = [
      { href: '/reception', label: 'Quầy Tiếp Đón', icon: QrCode },
      { href: '/reception/history', label: 'Lịch Sử Tiếp Đón', icon: ClipboardList },
      { href: '/statistics', label: 'Thống Kê Tiếp Đón', icon: BarChart3 },
    ];
  }

  const logoHref = isAdmin ? "/admin" : isDoctor ? "/doctor" : isStaff ? "/reception" : "/";

  const renderNavLinks = (fullWidth: boolean = false) => (
    <nav className={`flex items-center gap-1 sm:gap-1.5 lg:gap-2 ${fullWidth ? 'flex-1' : ''}`}>
      {navLinks.map((link) => {
        const Icon = link.icon;
        const isActive = pathname === link.href;

        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={(e) => {
              if (link.href === '/booking' || link.href === '/booking-method') {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('medsched:open-booking-method'));
              }
            }}
            className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 lg:px-3.5 lg:py-2 rounded-full text-xs transition-all duration-200 select-none cursor-pointer whitespace-nowrap shrink-0 ${
              isActive
                ? 'bg-emerald-700 text-white font-bold shadow-[0_6px_14px_-2px_rgba(14,92,85,0.35),inset_-2px_-2px_4px_rgba(0,0,0,0.15),inset_2px_2px_4px_rgba(255,255,255,0.35)] scale-102'
                : 'bg-white text-slate-700 hover:text-emerald-700 font-semibold shadow-[0_4px_10px_-2px_rgba(0,0,0,0.06),inset_-2px_-2px_4px_rgba(0,0,0,0.03),inset_2px_2px_4px_rgba(255,255,255,0.9)] border border-slate-200/80 hover:border-emerald-300 hover:shadow-md hover:scale-102 active:scale-95'
            }`}
          >
            <Icon size={14} className={`shrink-0 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
            <span className="whitespace-nowrap">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  const renderAuthButtons = (fullWidth: boolean = false) => user ? (
    <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
      <Link
        href="/profile"
        title="Xem thông tin cá nhân & Hồ sơ chuyên môn"
        className={`flex items-center justify-center gap-1.5 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-full text-xs font-semibold whitespace-nowrap bg-white shadow-[0_4px_10px_-2px_rgba(0,0,0,0.06),inset_-2px_-2px_4px_rgba(0,0,0,0.03),inset_2px_2px_4px_rgba(255,255,255,0.9)] border transition-all hover:scale-102 active:scale-95 shrink-0 ${
          pathname === '/profile'
            ? 'border-emerald-600 text-emerald-800 font-bold'
            : 'border-slate-200/80 text-slate-700 hover:text-emerald-700 hover:border-emerald-300'
        }`}
      >
        <User size={14} className="text-emerald-600 shrink-0" />
        <span className="max-w-[90px] lg:max-w-[130px] truncate font-semibold">
          {user.fullName || user.email}
        </span>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold shrink-0">
          {isAdmin ? 'ADMIN' : isDoctor ? 'BÁC SĨ' : isStaff ? 'LỄ TÂN' : 'BỆNH NHÂN'}
        </span>
        {isDoctor && (
          <span 
            className="px-1.5 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-bold shrink-0 flex items-center gap-1 shadow-2xs"
            title="Buồng khám trực hiện tại của bạn"
          >
            <DoorOpen size={11} className="text-blue-600 shrink-0" />
            <span className="hidden xl:inline">{user.roomNumber ? `P.${user.roomNumber}` : 'Buồng'}</span>
          </span>
        )}
      </Link>

      <button
        onClick={() => {
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('medsched_doctor_active_room');
          }
          handleLogout();
        }}
        className="flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-red-600 px-3 py-1.5 lg:px-3.5 lg:py-2 rounded-full bg-white shadow-[0_4px_10px_-2px_rgba(0,0,0,0.06),inset_-2px_-2px_4px_rgba(0,0,0,0.03),inset_2px_2px_4px_rgba(255,255,255,0.9)] border border-slate-200/80 hover:border-red-300 transition-all font-medium cursor-pointer whitespace-nowrap shrink-0 hover:scale-102 active:scale-95"
        title="Đăng xuất"
      >
        <LogOut size={14} className="text-slate-500 group-hover:text-red-600 shrink-0" />
        <span>Thoát</span>
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-1.5 lg:gap-2 shrink-0">
      <Link
        href="/login"
        className="flex items-center justify-center gap-1.5 text-xs font-bold text-emerald-700 bg-white hover:text-emerald-800 shadow-[0_4px_10px_-2px_rgba(0,0,0,0.06),inset_-2px_-2px_4px_rgba(0,0,0,0.03),inset_2px_2px_4px_rgba(255,255,255,0.9)] border border-emerald-600/30 hover:border-emerald-600 px-3.5 py-1.5 lg:px-4 lg:py-2 rounded-full transition-all duration-200 whitespace-nowrap hover:scale-102 active:scale-95 shrink-0"
      >
        <LogIn size={14} className="shrink-0" />
        <span className="whitespace-nowrap">Đăng Nhập</span>
      </Link>
      <Link
        href="/register"
        className="flex items-center justify-center gap-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white shadow-[0_6px_16px_-2px_rgba(14,92,85,0.35),inset_-2px_-2px_4px_rgba(0,0,0,0.2),inset_2px_2px_4px_rgba(255,255,255,0.4)] px-3.5 py-1.5 lg:px-4 lg:py-2 rounded-full transition-all duration-200 whitespace-nowrap hover:scale-102 active:scale-95 shrink-0"
      >
        <UserPlus size={14} className="shrink-0" />
        <span className="whitespace-nowrap">Đăng Ký</span>
      </Link>
    </div>
  );

  const isHomePage = pathname === '/';

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. GIAO DIỆN ĐIỆN THOẠI (MOBILE): GHIM CỐ ĐỊNH THANH ĐEN Ở TRÊN CÙNG       */}
      {/* ========================================================================= */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 w-full bg-[#0a1e36] text-slate-300 text-[11px] border-b border-slate-800/80 shadow-md">
        <div className="px-3.5 sm:px-6 flex items-center justify-between h-12">
          {/* Logo MedSched */}
          <Link href={logoHref} className="flex items-center gap-2 group shrink-0 py-0.5">
            <div className="w-7 h-7 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-xs border border-white/20 group-hover:scale-105 transition overflow-hidden shrink-0">
              <img
                src="/logo.png"
                alt="MedSched Online Medical Services Logo"
                width={28}
                height={28}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="flex flex-col justify-center leading-none whitespace-nowrap">
              <span className="text-sm font-black tracking-tight text-white group-hover:text-mint-light transition-colors leading-tight">
                MedSched
              </span>
              <span className="text-[9px] text-teal-300/80 font-medium tracking-tight mt-0.5">
                Phiên bản v1.3.1
              </span>
            </div>
          </Link>

          {/* Nút Hamburger 3 gạch */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg text-white hover:bg-white/15 transition cursor-pointer flex items-center justify-center"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Drawer Menu khi bấm nút 3 gạch trên điện thoại */}
        {mobileMenuOpen && (
          <div className="bg-white border-b border-mint-light px-4 pt-3 pb-5 space-y-1 shadow-2xl animate-fadeIn text-slate-800 max-h-[calc(100vh-3rem)] overflow-y-auto">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    if (link.href === '/booking' || link.href === '/booking-method') {
                      e.preventDefault();
                      window.dispatchEvent(new CustomEvent('medsched:open-booking-method'));
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
                    isActive ? 'bg-mint-light text-pine-teal font-bold' : 'text-slate-700 hover:bg-mint-soft'
                  }`}
                >
                  <Icon size={18} />
                  <span>{link.label}</span>
                </Link>
              );
            })}
            {user ? (
              <div className="pt-2 border-t border-mint-light mt-2 space-y-2">
                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-800 bg-mint-soft"
                >
                  <span>Hồ sơ: {user.fullName || user.email}</span>
                  <span className="text-xs bg-mint-light text-pine-teal px-2 py-0.5 rounded font-bold">
                    {roles[0]?.replace('ROLE_', '') || 'USER'}
                  </span>
                </Link>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer"
                >
                  <LogOut size={16} />
                  <span>Đăng Xuất</span>
                </button>
              </div>
            ) : (
              <div className="pt-2 border-t border-mint-light mt-2 flex gap-2">
                <Link
                  href="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-semibold text-pine-teal bg-mint-light border border-teal-primary/30 rounded-xl"
                >
                  Đăng Nhập
                </Link>
                <Link
                  href="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex-1 text-center py-2 text-xs font-semibold text-white bg-pine-teal rounded-xl"
                >
                  Đăng Ký
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Spacer bù đắp chiều cao 48px của thanh fixed trên mobile */}
      <div className="md:hidden h-12 w-full shrink-0" aria-hidden="true" />

      {/* ========================================================================= */}
      {/* 2. GIAO DIỆN MÁY TÍNH (DESKTOP): THANH ĐEN Ở ĐẦU TRANG CHỦ & MENU TRẮNG DÍNH */}
      {/* ========================================================================= */}

      {/* Top Bar Logo & Brand trên Desktop: Chỉ hiển thị ở trang chủ, trôi tự nhiên */}
      {isHomePage && (
        <div className="hidden md:block bg-[#0a1e36] text-slate-300 text-[11px] border-b border-slate-800/80 w-full relative z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-11">
            {/* Logo MedSched */}
            <Link href={logoHref} className="flex items-center gap-2 group shrink-0 py-0.5">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white p-0.5 flex items-center justify-center shadow-xs border border-white/20 group-hover:scale-105 transition overflow-hidden shrink-0">
                <img
                  src="/logo.png"
                  alt="MedSched Online Medical Services Logo"
                  width={32}
                  height={32}
                  className="w-full h-full object-contain"
                />
              </div>

              <div className="flex flex-col justify-center leading-none whitespace-nowrap">
                <span className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-mint-light transition-colors leading-tight">
                  MedSched
                </span>
                <span className="text-[9px] sm:text-[10px] text-teal-300/80 font-medium tracking-tight mt-0.5">
                  Phiên bản v1.3.1
                </span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Thanh Menu Trắng trên Desktop: Ghim dính sticky trên đỉnh */}
      <header
        className={`hidden md:block sticky top-0 z-50 text-slate-800 transition-colors duration-300 ${
          isScrolled || !isHomePage
            ? 'backdrop-blur-md bg-white/95 shadow-md border-b border-slate-200/80' 
            : 'backdrop-blur-md bg-white/60 border-b border-slate-200/50'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5">
          <div className="flex items-center gap-1.5 lg:gap-2.5 w-full">
            {renderNavLinks(true)}
            {renderAuthButtons(true)}
          </div>
        </div>
      </header>
    </>
  );
}
