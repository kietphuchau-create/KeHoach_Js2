'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Building2, 
  Calendar, 
  QrCode, 
  ShieldCheck, 
  User, 
  LogOut, 
  LogIn, 
  UserPlus, 
  Menu, 
  X,
  Stethoscope
} from 'lucide-react';
import { getAuthToken, getAuthUser, clearAuthSession } from '@/shared/lib/api';

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
    { href: '/', label: 'Trang Chủ', icon: Building2 },
    { href: '/booking', label: 'Đặt Lịch Khám', icon: Calendar },
    { href: '/reception', label: 'Quầy Tiếp Đón', icon: QrCode },
    ...(isDoctor || isAdmin ? [{ href: '/doctor', label: 'Buồng Khám Bác Sĩ', icon: Stethoscope }] : []),
    ...(isAdmin ? [{ href: '/admin', label: 'Quản Trị Admin', icon: ShieldCheck }] : []),
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-400 flex items-center justify-center text-white font-bold text-xl shadow-md group-hover:scale-105 transition">
                +
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  MedSched
                </span>
                <span className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">
                  Smart Healthcare
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1 ml-6">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                      isActive
                        ? 'bg-slate-800 text-blue-400'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon size={16} />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Section: Auth State / Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/profile"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                    pathname === '/profile'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-600'
                  }`}
                >
                  <User size={15} className="text-blue-400" />
                  <span className="max-w-[140px] truncate">{user.fullName || user.email}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                    {roles[0]?.replace('ROLE_', '') || 'PATIENT'}
                  </span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-xl hover:bg-slate-800 transition cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut size={15} />
                  <span>Thoát</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white px-3.5 py-2 rounded-xl hover:bg-slate-800 transition"
                >
                  <LogIn size={15} />
                  <span>Đăng Nhập</span>
                </Link>
                <Link
                  href="/register"
                  className="flex items-center gap-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl transition shadow-sm"
                >
                  <UserPlus size={15} />
                  <span>Đăng Ký</span>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-slate-400 hover:text-white p-2 cursor-pointer"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                  isActive ? 'bg-slate-800 text-blue-400' : 'text-slate-300 hover:bg-slate-800/60'
                }`}
              >
                <Icon size={18} />
                <span>{link.label}</span>
              </Link>
            );
          })}
          {user ? (
            <div className="pt-2 border-t border-slate-800 mt-2 space-y-2">
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-sm text-slate-200 bg-slate-800"
              >
                <span>Hồ sơ: {user.fullName || user.email}</span>
                <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                  {roles[0]?.replace('ROLE_', '') || 'USER'}
                </span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-400 hover:bg-slate-800 transition cursor-pointer"
              >
                <LogOut size={16} />
                <span>Đăng Xuất</span>
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-800 mt-2 flex gap-2">
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-xs font-semibold text-slate-300 bg-slate-800 rounded-xl"
              >
                Đăng Nhập
              </Link>
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex-1 text-center py-2 text-xs font-semibold text-white bg-blue-600 rounded-xl"
              >
                Đăng Ký
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
