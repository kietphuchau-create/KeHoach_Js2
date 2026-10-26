'use client';

import React, { useEffect, useState, useRef } from 'react';
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
  Sparkles,
  Ticket,
  ChevronDown,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { getAuthToken, getAuthUser, clearAuthSession, api } from '@/shared/lib/api';

export default function HeaderNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  // Modal Đổi Mật Khẩu
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [pwdCurrent, setPwdCurrent] = useState('');
  const [pwdNew, setPwdNew] = useState('');
  const [pwdConfirm, setPwdConfirm] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);

  // Đóng dropdown khi click ra ngoài hoặc bấm Escape
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setProfileDropdownOpen(false);
      }
    };

    if (profileDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [profileDropdownOpen]);

  useEffect(() => {
    setProfileDropdownOpen(false);
  }, [pathname]);

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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError(null);
    setPwdSuccess(null);

    if (!pwdCurrent.trim()) {
      setPwdError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (pwdNew !== pwdConfirm) {
      setPwdError('Mật khẩu mới và xác nhận mật khẩu không khớp!');
      return;
    }
    if (pwdNew.length < 6) {
      setPwdError('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    setPwdLoading(true);
    try {
      await api.changePassword({
        currentPassword: pwdCurrent,
        newPassword: pwdNew,
      });
      setPwdSuccess('Đổi mật khẩu thành công!');
      setPwdCurrent('');
      setPwdNew('');
      setPwdConfirm('');
      setTimeout(() => {
        setIsChangePasswordOpen(false);
        setPwdSuccess(null);
      }, 1500);
    } catch (err: any) {
      setPwdError(err.message || 'Mật khẩu hiện tại không chính xác.');
    } finally {
      setPwdLoading(false);
    }
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
      { href: '/admin/schedule-config', label: 'Cấu Hình Giờ Khám', icon: Clock },
      { href: '/admin/promotions', label: 'Mã Khuyến Mãi', icon: Ticket },
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
    <div className="relative shrink-0" ref={profileDropdownRef}>
      {/* Nút Trigger Dropdown thông tin tài khoản */}
      <button
        type="button"
        onClick={() => setProfileDropdownOpen((prev) => !prev)}
        aria-expanded={profileDropdownOpen}
        aria-haspopup="true"
        title="Bấm để xem thông tin tài khoản & tùy chọn"
        className={`group flex items-center justify-center gap-1.5 lg:gap-2 px-2.5 py-1.5 lg:px-3.5 lg:py-2 rounded-full text-xs font-semibold whitespace-nowrap bg-white shadow-[0_4px_10px_-2px_rgba(0,0,0,0.06),inset_-2px_-2px_4px_rgba(0,0,0,0.03),inset_2px_2px_4px_rgba(255,255,255,0.9)] border transition-all hover:scale-102 active:scale-95 cursor-pointer select-none ${
          profileDropdownOpen
            ? 'border-emerald-500 ring-2 ring-emerald-500/20 text-emerald-800 shadow-md'
            : 'border-slate-200/80 text-slate-700 hover:text-emerald-700 hover:border-emerald-300'
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0 border border-emerald-200/60 shadow-2xs group-hover:scale-105 transition-transform">
          {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
        </div>
        <span className="max-w-[100px] lg:max-w-[150px] truncate font-semibold text-slate-800 group-hover:text-emerald-700 transition-colors">
          {user.fullName || user.email}
        </span>
        <span className={`px-1.5 py-0.5 rounded-full text-[9px] lg:text-[10px] font-bold border shrink-0 ${
          isAdmin 
            ? 'bg-emerald-100 text-emerald-800 border-emerald-200/80' 
            : isDoctor 
            ? 'bg-blue-100 text-blue-800 border-blue-200/80' 
            : isStaff 
            ? 'bg-amber-100 text-amber-800 border-amber-200/80' 
            : 'bg-teal-100 text-teal-800 border-teal-200/80'
        }`}>
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
        <ChevronDown 
          size={14} 
          className={`text-slate-400 group-hover:text-emerald-600 transition-transform duration-200 shrink-0 ${
            profileDropdownOpen ? 'rotate-180 text-emerald-600' : ''
          }`} 
        />
      </button>

      {/* Menu Dropdown Popup */}
      {profileDropdownOpen && (
        <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white rounded-2xl shadow-[0_12px_36px_-4px_rgba(0,0,0,0.14),0_4px_12px_rgba(0,0,0,0.06)] border border-slate-200/90 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header tóm tắt thông tin người dùng */}
          <div className="px-4 py-2.5 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                {(user.fullName || user.email || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate" title={user.fullName || user.email}>
                  {user.fullName || 'Người dùng MedSched'}
                </p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5" title={user.email || user.phone}>
                  {user.email || user.phone || 'Chưa cập nhật liên hệ'}
                </p>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                    isAdmin 
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200/80' 
                      : isDoctor 
                      ? 'bg-blue-100 text-blue-800 border-blue-200/80' 
                      : isStaff 
                      ? 'bg-amber-100 text-amber-800 border-amber-200/80' 
                      : 'bg-teal-100 text-teal-800 border-teal-200/80'
                  }`}>
                    {isAdmin ? 'ADMIN' : isDoctor ? 'BÁC SĨ' : isStaff ? 'LỄ TÂN' : 'BỆNH NHÂN'}
                  </span>
                  {isDoctor && user.roomNumber && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold flex items-center gap-1">
                      <DoorOpen size={10} /> P.{user.roomNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Tùy chọn tài khoản */}
          <div className="p-1.5 space-y-0.5">
            <Link
              href="/profile"
              onClick={() => setProfileDropdownOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/60 transition group"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-emerald-100/70 text-slate-500 group-hover:text-emerald-700 flex items-center justify-center transition shrink-0">
                <User size={14} />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-slate-800 group-hover:text-emerald-700">Hồ sơ cá nhân</span>
                <span className="text-[10px] text-slate-400">Xem & cập nhật thông tin tài khoản</span>
              </div>
            </Link>

            <button
              type="button"
              onClick={() => {
                setProfileDropdownOpen(false);
                setPwdError(null);
                setPwdSuccess(null);
                setPwdCurrent('');
                setPwdNew('');
                setPwdConfirm('');
                setIsChangePasswordOpen(true);
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-emerald-700 hover:bg-emerald-50/60 transition group cursor-pointer text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-100 group-hover:bg-emerald-100/70 text-slate-500 group-hover:text-emerald-700 flex items-center justify-center transition shrink-0">
                <KeyRound size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-semibold text-slate-800 group-hover:text-emerald-700">Đổi mật khẩu</span>
                <span className="text-[10px] text-slate-400">Cập nhật mật khẩu tài khoản</span>
              </div>
            </button>
          </div>

          {/* Nút Đăng Xuất */}
          <div className="p-1.5 border-t border-slate-100 mt-1">
            <button
              type="button"
              onClick={() => {
                setProfileDropdownOpen(false);
                if (typeof window !== 'undefined') {
                  sessionStorage.removeItem('medsched_doctor_active_room');
                }
                handleLogout();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center group-hover:scale-105 transition shrink-0">
                <LogOut size={14} />
              </div>
              <div className="flex flex-col text-left">
                <span className="font-bold">Đăng Xuất</span>
                <span className="text-[10px] text-red-400 font-normal">Kết thúc phiên làm việc</span>
              </div>
            </button>
          </div>
        </div>
      )}
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
                Phiên bản v1.5.0
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
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setPwdError(null);
                    setPwdSuccess(null);
                    setPwdCurrent('');
                    setPwdNew('');
                    setPwdConfirm('');
                    setIsChangePasswordOpen(true);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-800 bg-mint-soft hover:bg-mint-light transition cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <KeyRound size={16} className="text-slate-600" />
                    <span>Đổi mật khẩu</span>
                  </div>
                </button>
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
                  Phiên bản v1.5.0
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

      {/* Modal Đổi Mật Khẩu */}
      {isChangePasswordOpen && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsChangePasswordOpen(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl border border-slate-200/80 w-full max-w-md overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <KeyRound size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Đổi Mật Khẩu</h3>
                  <p className="text-[11px] text-slate-500">Cập nhật mật khẩu bảo mật tài khoản</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePasswordOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleChangePassword} className="p-5 space-y-4">
              {pwdError && (
                <div className="flex items-center gap-2 p-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{pwdError}</span>
                </div>
              )}

              {pwdSuccess && (
                <div className="flex items-center gap-2 p-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <CheckCircle2 size={16} className="shrink-0" />
                  <span>{pwdSuccess}</span>
                </div>
              )}

              {/* Mật khẩu hiện tại */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu hiện tại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPwd ? 'text' : 'password'}
                    value={pwdCurrent}
                    onChange={(e) => setPwdCurrent(e.target.value)}
                    required
                    placeholder="Nhập mật khẩu đang sử dụng"
                    className="w-full px-3 py-2 pr-9 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showCurrentPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Mật khẩu mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNewPwd ? 'text' : 'password'}
                    value={pwdNew}
                    onChange={(e) => setPwdNew(e.target.value)}
                    required
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full px-3 py-2 pr-9 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPwd(!showNewPwd)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu mới */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPwd ? 'text' : 'password'}
                    value={pwdConfirm}
                    onChange={(e) => setPwdConfirm(e.target.value)}
                    required
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full px-3 py-2 pr-9 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showConfirmPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={pwdLoading}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-sm transition cursor-pointer"
                >
                  {pwdLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu mật khẩu mới</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
