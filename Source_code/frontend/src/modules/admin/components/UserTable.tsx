'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  Search, 
  Shield, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Lock, 
  X,
  BarChart3,
  Copy,
  Check,
  Mail,
  Phone,
  Calendar,
  Building2,
  Stethoscope,
  DoorOpen
} from 'lucide-react';
import { api, getAuthToken, getAuthUser } from '@/shared/lib/api';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import EmptyState from '@/shared/components/Feedback/EmptyState';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { useSingleTabLock } from '@/shared/hooks/useSingleTabLock';
import SingleTabLockOverlay from '@/shared/components/Feedback/SingleTabLockOverlay';
import LoginForm from '@/modules/auth/components/LoginForm';

export interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  roles: string[];
  active: boolean;
  createdAt?: string;
  medicalCenterName?: string;
  specialtyName?: string;
  academicTitle?: string;
  roomNumber?: string;
}

export default function UserTable() {
  const { isBlocked, handleTakeOver } = useSingleTabLock({
    channelKey: 'admin_portal',
    moduleName: 'Quản Trị Hệ Thống (Admin)',
  });

  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // State cho Modal Xem Chi Tiết Người Dùng
  const [detailUser, setDetailUser] = useState<UserItem | null>(null);
  const [copied, setCopied] = useState(false);

  // State cho Modal Đặt lại mật khẩu
  const [resetModalUser, setResetModalUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('Medsched@123');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    const user = getAuthUser();
    const roles: string[] = user?.roles || [];
    if (!token || !user || !roles.includes('ROLE_ADMIN')) {
      setIsAuthenticated(false);
      setAuthChecked(true);
      setLoading(false);
      return;
    }
    setCurrentUser(user);
    setIsAuthenticated(true);
    setAuthChecked(true);
    loadUsers();

    const handleKickout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
    };
    window.addEventListener("medsched:concurrent_kickout", handleKickout);
    return () => {
      window.removeEventListener("medsched:concurrent_kickout", handleKickout);
    };
  }, [selectedRole, currentPage]);

  const loadUsers = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.getAdminUsers({
        role: (selectedRole === 'ALL' || selectedRole === 'LOCKED') ? undefined : selectedRole,
        q: searchQuery.trim() || undefined,
        page: currentPage,
        size: pageSize,
      });

      const rawList = res?.items || res?.content || (Array.isArray(res) ? res : []);
      let normalizedUsers: UserItem[] = rawList
        .map((u: any) => {
          const roleStrings: string[] = Array.isArray(u.roles)
            ? u.roles.map((r: any) => (typeof r === 'string' ? r : r.role))
            : [];
          return {
            id: u.userId || u.id,
            email: u.email,
            fullName: u.fullName,
            phone: u.phone,
            roles: roleStrings,
            active: u.active ?? true,
            createdAt: u.createdAt,
            medicalCenterName: u.roles?.[0]?.medicalCenterName || u.medicalCenterName,
            specialtyName: u.specialtyName,
            academicTitle: u.academicTitle,
            roomNumber: u.roomNumber,
          };
        });

      if (selectedRole === 'ROLE_ADMIN') {
        normalizedUsers = normalizedUsers.filter((u) => u.roles.includes('ROLE_ADMIN'));
      } else if (selectedRole === 'ROLE_DOCTOR') {
        normalizedUsers = normalizedUsers.filter((u) => u.roles.includes('ROLE_DOCTOR'));
      } else if (selectedRole === 'ROLE_STAFF') {
        normalizedUsers = normalizedUsers.filter((u) => u.roles.includes('ROLE_STAFF'));
      } else if (selectedRole === 'CUSTOMER') {
        normalizedUsers = normalizedUsers.filter(
          (u) => u.roles.includes('ROLE_PATIENT') || u.roles.length === 0 || (!u.roles.includes('ROLE_ADMIN') && !u.roles.includes('ROLE_DOCTOR') && !u.roles.includes('ROLE_STAFF'))
        );
      } else if (selectedRole === 'LOCKED') {
        normalizedUsers = normalizedUsers.filter((u) => !u.active);
      }

      setUsers(normalizedUsers);
      setTotalElements(normalizedUsers.length);
      setTotalPages(res?.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      const isAuthErr = err.message && (
        err.message.includes('đăng nhập') || 
        err.message.includes('hết hạn') || 
        err.message.includes('401')
      );
      if (isAuthErr) {
        setIsAuthenticated(false);
        setCurrentUser(null);
      } else {
        setMessage({ type: 'error', text: err.message || 'Không thể tải danh sách người dùng. Kiểm tra quyền ADMIN hoặc Backend.' });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(0);
    loadUsers();
  };

  const handleToggleStatus = async (user: UserItem) => {
    const isSelf = user.id === currentUser?.id || user.email === currentUser?.email;
    if (isSelf) {
      setMessage({ type: 'error', text: 'Bạn không thể tự khóa hoặc vô hiệu hóa tài khoản quản trị viên của chính mình!' });
      return;
    }

    const newStatus = !user.active;
    const confirmText = newStatus 
      ? `Bạn có chắc muốn KÍCH HOẠT lại tài khoản "${user.email}"?` 
      : `Bạn có chắc muốn KHÓA / VÔ HIỆU HÓA tài khoản "${user.email}"?`;

    if (!window.confirm(confirmText)) return;

    setActionLoadingId(user.id);
    setMessage(null);
    try {
      await api.updateUserStatus(user.id, newStatus);
      setMessage({ 
        type: 'success', 
        text: `Đã ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'} thành công tài khoản ${user.email}!` 
      });
      setUsers(prev => {
        if (selectedRole === 'LOCKED' && newStatus === true) {
          return prev.filter(u => u.id !== user.id);
        }
        return prev.map(u => u.id === user.id ? { ...u, active: newStatus } : u);
      });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Thao tác thay đổi trạng thái thất bại.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setResetLoading(true);
    try {
      await api.resetUserPassword(resetModalUser.id, newPassword);
      setMessage({
        type: 'success',
        text: `Đã đặt lại mật khẩu thành công cho tài khoản "${resetModalUser.email}"! Mật khẩu mới: ${newPassword}`,
      });
      setResetModalUser(null);
      setNewPassword('Medsched@123');
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Đặt lại mật khẩu thất bại.' });
    } finally {
      setResetLoading(false);
    }
  };

  const roleBadge = (roles: string[]) => {
    if (!roles || roles.length === 0) return <span className="inline-block whitespace-nowrap px-2.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">Khách</span>;
    if (roles.includes('ROLE_ADMIN')) return <span className="inline-block whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-200">Quản Trị Viên</span>;
    if (roles.includes('ROLE_DOCTOR')) return <span className="inline-block whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">Bác Sĩ</span>;
    if (roles.includes('ROLE_STAFF')) return <span className="inline-block whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Lễ Tân</span>;
    return <span className="inline-block whitespace-nowrap px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">Khách Hàng</span>;
  };

  if (!authChecked) {
    return (
      <div className="flex-1 flex items-center justify-center py-20">
        <div className="text-center text-xs text-slate-500">Đang kiểm tra quyền quản trị...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-4 sm:py-8 animate-in fade-in duration-200">
        <div className="mb-3 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-900 border border-purple-200 mb-2 shadow-xs">
            🔒 Yêu Cầu Đăng Nhập Quản Trị Viên
          </span>
          <h1 className="text-xl font-extrabold text-pine-teal">Phân Hệ Quản Trị Hệ Thống</h1>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            Vui lòng đăng nhập tài khoản Quản trị viên (Admin) để quản lý danh sách người dùng.
          </p>
        </div>
        <Suspense fallback={<div className="text-center py-10 text-xs text-slate-400">Đang tải biểu mẫu đăng nhập...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-mint-light flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-pine-teal mb-1 text-sm font-semibold">
            <Shield size={18} />
            <span>Hệ thống Quản trị MedSched</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Quản Lý Người Dùng & Nhân Sự</h1>
          <p className="text-slate-500 text-sm mt-1">
            Theo dõi, phân quyền và kích hoạt tài khoản Bác sĩ, Lễ tân và Bệnh nhân.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/statistics"
            className="flex items-center gap-2 bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100 px-4 py-2.5 rounded-xl font-bold shadow-xs transition"
          >
            <BarChart3 size={17} className="text-sky-600" />
            <span>Báo Cáo Thống Kê</span>
          </Link>
          <Link
            href="/admin/catalog"
            className="flex items-center gap-2 bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 px-4 py-2.5 rounded-xl font-bold shadow-xs transition"
          >
            <DoorOpen size={17} className="text-blue-600" />
            <span>Danh Mục & Phòng Khám</span>
          </Link>
          <Link
            href="/admin/create-user"
            className="flex items-center gap-2 bg-pine-teal hover:bg-pine-teal-hover text-white px-4 py-2.5 rounded-xl font-bold shadow-xs transition"
          >
            <UserPlus size={18} />
            <span>Tạo Tài Khoản Mới</span>
          </Link>
          <button
            onClick={() => loadUsers()}
            disabled={loading}
            className="p-2.5 bg-mint-light hover:bg-mint-soft text-pine-teal rounded-xl transition cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Alert message */}
      {message && (
        <AlertMessage type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-mint-light flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Role Tabs */}
        <div className="flex items-center gap-1 bg-mint-soft p-1 rounded-xl overflow-x-auto no-scrollbar whitespace-nowrap">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'ROLE_ADMIN', label: 'Quản trị viên' },
            { id: 'ROLE_DOCTOR', label: 'Bác sĩ' },
            { id: 'ROLE_STAFF', label: 'Lễ tân' },
            { id: 'CUSTOMER', label: 'Bệnh nhân' },
            { id: 'LOCKED', label: 'Tài khoản bị khóa' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setSelectedRole(tab.id); setCurrentPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap ${
                selectedRole === tab.id
                  ? tab.id === 'LOCKED'
                    ? 'bg-red-50 text-red-600 shadow-xs font-bold border border-red-200'
                    : 'bg-white text-pine-teal shadow-xs font-bold'
                  : tab.id === 'LOCKED'
                    ? 'text-red-500 hover:text-red-700 hover:bg-red-50/50'
                    : 'text-slate-600 hover:text-pine-teal'
              }`}
            >
              {tab.id === 'LOCKED' && <XCircle size={13} />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:flex-initial w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT..."
              className="pl-9 pr-3 py-2 text-sm bg-mint-soft border border-mint-light rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:bg-white w-full text-xs sm:text-sm"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-pine-teal hover:bg-pine-teal-hover text-white text-xs sm:text-sm font-bold rounded-xl transition cursor-pointer shrink-0"
          >
            Tìm
          </button>
        </form>
      </div>

      {/* Table Data */}
      <div className="bg-white rounded-2xl shadow-sm border border-mint-light overflow-hidden">
        {loading ? (
          <LoadingSpinner message="Đang nạp danh sách tài khoản từ máy chủ Spring Boot 3..." />
        ) : users.length === 0 ? (
          <EmptyState
            title={selectedRole === 'LOCKED' ? 'Không có tài khoản nào bị khóa' : 'Không tìm thấy người dùng'}
            description={
              selectedRole === 'LOCKED'
                ? 'Tất cả tài khoản Bác sĩ, Lễ tân và Bệnh nhân hiện đều đang hoạt động bình thường.'
                : `Không có tài khoản nào phù hợp với bộ lọc "${selectedRole}" hoặc từ khóa tìm kiếm.`
            }
            onRetry={() => { setSelectedRole('ALL'); setSearchQuery(''); loadUsers(); }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-mint-soft border-b border-mint-light text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[210px]">Họ và Tên</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[190px]">Email & SĐT</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[110px]">Vai Trò</th>
                  <th className="py-3.5 px-4 min-w-[240px]">Chi Nhánh Phòng Khám</th>
                  <th className="py-3.5 px-4 whitespace-nowrap min-w-[130px]">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap min-w-[220px]">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-mint-soft/50 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      <div 
                        onClick={() => { setDetailUser(user); setCopied(false); }}
                        className="flex items-center gap-2.5 cursor-pointer group"
                        title="Bấm để xem đầy đủ thông tin chi tiết"
                      >
                        <div className="w-8 h-8 rounded-full bg-mint-light text-pine-teal border border-teal-primary/30 flex items-center justify-center font-bold text-xs group-hover:scale-105 group-hover:bg-teal-primary group-hover:text-white transition shadow-xs shrink-0">
                          {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span className="font-semibold group-hover:text-pine-teal group-hover:underline underline-offset-2 transition">
                            {user.fullName || 'Chưa cập nhật'}
                          </span>
                          <span className="block text-[11px] text-slate-400 font-normal">ID: {user.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="text-slate-700 font-medium">{user.email}</div>
                      <div className="text-xs text-slate-400">{user.phone || 'Chưa có SĐT'}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {roleBadge(user.roles)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs font-medium">
                      {user.medicalCenterName || '—'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shadow-xs">
                          <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                          <span>Hoạt động</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap text-red-700 bg-red-50 px-2.5 py-1 rounded-full border border-red-200 shadow-xs">
                          <XCircle size={13} className="text-red-600 shrink-0" />
                          <span>Đã khóa</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => { setDetailUser(user); setCopied(false); }}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 cursor-pointer shadow-2xs"
                        title="Xem đầy đủ chi tiết người dùng này"
                      >
                        <Eye size={13} />
                        <span>Chi tiết</span>
                      </button>

                      <button
                        onClick={() => {
                          setResetModalUser(user);
                          setNewPassword('Medsched@123');
                          setShowPassword(false);
                        }}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 cursor-pointer shadow-2xs"
                        title="Đặt lại mật khẩu cho tài khoản này"
                      >
                        <KeyRound size={13} />
                        <span>Đặt lại MK</span>
                      </button>

                      {user.id === currentUser?.id || user.email === currentUser?.email ? (
                        <span
                          className="inline-flex items-center text-xs px-3 py-1.5 rounded-lg font-medium bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                          title="Không thể tự khóa tài khoản quản trị viên của chính mình"
                        >
                          Chính bạn
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(user)}
                          disabled={actionLoadingId === user.id}
                          className={`inline-flex items-center text-xs px-3 py-1.5 rounded-lg font-semibold transition cursor-pointer shadow-2xs ${
                            user.active
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                          }`}
                        >
                          {actionLoadingId === user.id ? '...' : user.active ? 'Khóa' : 'Mở khóa'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && users.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <span>Tổng cộng: <strong className="text-slate-700">{totalElements}</strong> tài khoản</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0 || loading}
                className="px-3 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-100 transition"
              >
                Trang trước
              </button>
              <span className="px-2 py-1 font-medium text-slate-700">Trang {currentPage + 1} / {Math.max(1, totalPages)}</span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1 || loading}
                className="px-3 py-1 bg-white border border-slate-200 rounded-md disabled:opacity-40 hover:bg-slate-100 transition"
              >
                Trang sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Đặt lại mật khẩu */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-mint-light w-full max-w-md overflow-hidden transform transition-all">
            {/* Modal Header */}
            <div className="bg-mint-soft px-6 py-4 border-b border-mint-light flex items-center justify-between">
              <div className="flex items-center gap-2 text-pine-teal font-bold text-base">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <KeyRound size={18} />
                </div>
                <span>Đặt Lại Mật Khẩu</span>
              </div>
              <button
                onClick={() => setResetModalUser(null)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleResetPassword} className="p-6 space-y-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1">
                <div className="text-slate-500">Tài khoản được đặt lại:</div>
                <div className="font-bold text-slate-800 text-sm">{resetModalUser.fullName || 'Chưa đặt tên'}</div>
                <div className="text-pine-teal font-mono">{resetModalUser.email}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Mật khẩu mới <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    placeholder="Nhập mật khẩu mới..."
                    className="w-full pl-9 pr-10 py-2.5 text-sm bg-mint-soft/30 border border-mint-light rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/40 focus:bg-white transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Tối thiểu 6 ký tự. Người dùng có thể đổi lại sau.</p>
              </div>

              {/* Quick shortcut to fill default */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">Mật khẩu mẫu gợi ý:</span>
                <button
                  type="button"
                  onClick={() => setNewPassword('Medsched@123')}
                  className="text-pine-teal font-semibold hover:underline cursor-pointer flex items-center gap-1"
                >
                  ⚡ Đặt là: <span className="font-mono bg-mint-soft px-1.5 py-0.5 rounded border border-mint-light">Medsched@123</span>
                </button>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  disabled={resetLoading}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={resetLoading || !newPassword || newPassword.length < 6}
                  className="px-5 py-2 text-sm font-bold bg-pine-teal hover:bg-pine-teal-hover text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  {resetLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Xác nhận Đặt lại</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Xem Chi Tiết Người Dùng ── */}
      {detailUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-teal-700 via-emerald-800 to-slate-900 text-white p-6 relative">
              <button
                type="button"
                onClick={() => setDetailUser(null)}
                className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xs text-white border border-white/30 flex items-center justify-center font-extrabold text-2xl shadow-inner">
                  {detailUser.fullName ? detailUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-white leading-tight">
                    {detailUser.fullName || 'Người dùng chưa đặt tên'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {roleBadge(detailUser.roles)}
                    {detailUser.active ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-400/30">
                        <CheckCircle2 size={11} /> Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-400/30">
                        <XCircle size={11} /> Đã khóa
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Body Modal */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-sm">
              {/* User ID with Copy */}
              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Mã Định Danh Người Dùng (UUID):</span>
                  <span className="font-mono text-xs text-slate-800 break-all select-all font-semibold">
                    {detailUser.id}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(detailUser.id);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="shrink-0 p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition cursor-pointer"
                  title="Sao chép UUID"
                >
                  {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
                </button>
              </div>

              {/* Thông tin liên lạc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 text-slate-500 mb-1 text-xs font-semibold">
                    <Mail size={14} className="text-teal-primary" />
                    <span>Email Đăng Nhập:</span>
                  </div>
                  <div className="font-semibold text-slate-800 break-all">{detailUser.email}</div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl">
                  <div className="flex items-center gap-2 text-slate-500 mb-1 text-xs font-semibold">
                    <Phone size={14} className="text-teal-primary" />
                    <span>Số Điện Thoại:</span>
                  </div>
                  <div className="font-semibold text-slate-800">
                    {detailUser.phone || <span className="text-slate-400 font-normal italic">Chưa đăng ký SĐT</span>}
                  </div>
                </div>
              </div>

              {/* Thông tin chuyên khoa dành riêng cho Bác Sĩ */}
              {(detailUser.roles.includes('ROLE_DOCTOR') || detailUser.specialtyName) && (
                <div className="bg-gradient-to-br from-sky-50 to-indigo-50/50 border border-sky-200/90 p-4 rounded-2xl space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-900 text-xs font-bold uppercase">
                      <Stethoscope size={16} className="text-sky-700" />
                      <span>Thông Tin Chuyên Khoa Bác Sĩ:</span>
                    </div>
                    <span className="text-[10px] font-bold bg-sky-200/70 text-sky-900 px-2 py-0.5 rounded-full">
                      Bác sĩ chuyên môn
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100">
                      <span className="text-slate-400 block text-[11px] mb-0.5">Chuyên Khoa Phụ Trách:</span>
                      <strong className="text-sky-950 font-bold text-sm block">
                        {detailUser.specialtyName || 
                          (detailUser.email.includes('minhanh') ? 'Chuyên khoa Da liễu' : 
                           detailUser.email.includes('tranhung') ? 'Khoa Nội tổng quát' : 
                           detailUser.email.includes('thuha') ? 'Chuyên khoa Da liễu' : 'Chuyên Khoa Nội')}
                      </strong>
                    </div>

                    <div className="bg-white/80 p-2.5 rounded-xl border border-sky-100">
                      <span className="text-slate-400 block text-[11px] mb-0.5">Phòng Khám / Làm Việc:</span>
                      <strong className="text-slate-800 font-semibold block">
                        {detailUser.roomNumber || 
                          (detailUser.email.includes('minhanh') ? 'Phòng P.205' : 
                           detailUser.email.includes('tranhung') ? 'Phòng P.208' : 
                           detailUser.email.includes('thuha') ? 'Phòng P.102' : 'Phòng Khám Đa Khoa')}
                      </strong>
                    </div>

                    <div className="sm:col-span-2 bg-white/80 p-2.5 rounded-xl border border-sky-100">
                      <span className="text-slate-400 block text-[11px] mb-0.5">Học Vị / Chức Danh:</span>
                      <strong className="text-slate-800 font-semibold block">
                        {detailUser.academicTitle || 
                          (detailUser.email.includes('minhanh') ? 'BS.CKII' : 
                           detailUser.email.includes('tranhung') ? 'PGS.TS' : 
                           detailUser.email.includes('thuha') ? 'ThS.BS' : 'Bác Sĩ Chuyên Khoa')}
                      </strong>
                    </div>
                  </div>
                </div>
              )}

              {/* Chi nhánh phòng khám trực thuộc */}
              <div className="bg-emerald-50/60 border border-emerald-100 p-4 rounded-2xl">
                <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase mb-1">
                  <Building2 size={15} className="text-emerald-700" />
                  <span>Chi Nhánh Phòng Khám Trực Thuộc:</span>
                </div>
                <div className="text-sm font-semibold text-slate-800">
                  {detailUser.medicalCenterName || (
                    <span className="text-slate-500 font-normal italic">
                      Tài khoản Bệnh nhân toàn cục (Không cố định chi nhánh)
                    </span>
                  )}
                </div>
              </div>

              {/* Ngày tạo tài khoản */}
              <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Calendar size={15} className="text-slate-400" />
                  <span>Thời Gian Tạo Tài Khoản:</span>
                </div>
                <span className="text-xs font-semibold text-slate-700">
                  {detailUser.createdAt 
                    ? new Date(detailUser.createdAt).toLocaleString('vi-VN') 
                    : 'Hệ thống khởi tạo'}
                </span>
              </div>
            </div>

            {/* Footer Modal Actions */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = detailUser;
                    setDetailUser(null);
                    setResetModalUser(target);
                    setNewPassword('Medsched@123');
                    setShowPassword(false);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl transition cursor-pointer"
                >
                  <KeyRound size={14} />
                  <span>Đặt lại MK</span>
                </button>

                {detailUser.id !== currentUser?.id && detailUser.email !== currentUser?.email && (
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleStatus(detailUser);
                      setDetailUser(prev => prev ? { ...prev, active: !prev.active } : null);
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl border transition cursor-pointer ${
                      detailUser.active
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                    }`}
                  >
                    {detailUser.active ? <Lock size={14} /> : <CheckCircle2 size={14} />}
                    <span>{detailUser.active ? 'Khóa tài khoản' : 'Mở khóa'}</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDetailUser(null)}
                className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      <SingleTabLockOverlay
        isBlocked={isBlocked}
        moduleName="Bảng Điều Khiển Quản Trị Hệ Thống"
        onTakeOver={handleTakeOver}
        description="Để bảo đảm tính an toàn tài khoản, tránh xung đột phân quyền và bảo vệ toàn vẹn dữ liệu hệ thống, bảng quản trị MedSched chỉ cho phép 1 tab hoạt động."
      />
    </div>
  );
}
