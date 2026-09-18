'use client';

import React, { useEffect, useState } from 'react';
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
  X
} from 'lucide-react';
import { api, getAuthToken, getAuthUser } from '@/shared/lib/api';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import EmptyState from '@/shared/components/Feedback/EmptyState';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';

export interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  roles: string[];
  active: boolean;
  createdAt?: string;
  medicalCenterName?: string;
}

export default function UserTable() {
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

  // State cho Modal Đặt lại mật khẩu
  const [resetModalUser, setResetModalUser] = useState<UserItem | null>(null);
  const [newPassword, setNewPassword] = useState('Medsched@123');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    const user = getAuthUser();
    if (!token) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    loadUsers();
  }, [selectedRole, currentPage]);

  const loadUsers = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await api.getAdminUsers({
        role: selectedRole === 'ALL' ? undefined : selectedRole,
        q: searchQuery.trim() || undefined,
        page: currentPage,
        size: pageSize,
      });

      const rawList = res?.items || res?.content || (Array.isArray(res) ? res : []);
      const normalizedUsers: UserItem[] = rawList
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
          };
        })
        .filter((u: UserItem) => !u.roles.includes('ROLE_ADMIN'));

      setUsers(normalizedUsers);
      setTotalElements(normalizedUsers.length);
      setTotalPages(res?.totalPages || 1);
    } catch (err: any) {
      console.error(err);
      setMessage({ type: 'error', text: err.message || 'Không thể tải danh sách người dùng. Kiểm tra quyền ADMIN hoặc Backend.' });
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
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: newStatus } : u));
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
    if (!roles || roles.length === 0) return <span className="px-2 py-0.5 text-xs rounded bg-slate-100 text-slate-600">Khách</span>;
    if (roles.includes('ROLE_ADMIN')) return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 border border-purple-200">Quản Trị Viên</span>;
    if (roles.includes('ROLE_DOCTOR')) return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-blue-100 text-blue-700 border border-blue-200">Bác Sĩ</span>;
    if (roles.includes('ROLE_STAFF')) return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">Lễ Tân</span>;
    return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">Khách Hàng</span>;
  };

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

        <div className="flex items-center gap-3">
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
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-mint-light flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Role Tabs */}
        <div className="flex flex-wrap gap-1 bg-mint-soft p-1 rounded-xl">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'ROLE_DOCTOR', label: 'Bác sĩ' },
            { id: 'ROLE_STAFF', label: 'Lễ tân' },
            { id: 'CUSTOMER', label: 'Bệnh nhân' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setSelectedRole(tab.id); setCurrentPage(0); }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                selectedRole === tab.id
                  ? 'bg-white text-pine-teal shadow-xs font-bold'
                  : 'text-slate-600 hover:text-pine-teal'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search form */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT..."
              className="pl-9 pr-3 py-2 text-sm bg-mint-soft border border-mint-light rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 focus:bg-white w-64"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 bg-pine-teal hover:bg-pine-teal-hover text-white text-sm font-bold rounded-xl transition cursor-pointer"
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
            title="Không tìm thấy người dùng"
            description={`Không có tài khoản nào phù hợp với bộ lọc "${selectedRole}" hoặc từ khóa tìm kiếm.`}
            onRetry={() => { setSelectedRole('ALL'); setSearchQuery(''); loadUsers(); }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-mint-soft border-b border-mint-light text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Họ và Tên</th>
                  <th className="py-3.5 px-4">Email & SĐT</th>
                  <th className="py-3.5 px-4">Vai Trò</th>
                  <th className="py-3.5 px-4">Cơ Sở Y Tế</th>
                  <th className="py-3.5 px-4">Trạng Thái</th>
                  <th className="py-3.5 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-mint-soft/50 transition">
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-mint-light text-pine-teal border border-teal-primary/30 flex items-center justify-center font-bold text-xs">
                          {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <span className="font-semibold">{user.fullName || 'Chưa cập nhật'}</span>
                          <span className="block text-[11px] text-slate-400 font-normal">ID: {user.id.slice(0, 8)}...</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-700">{user.email}</div>
                      <div className="text-xs text-slate-400">{user.phone || 'Chưa có SĐT'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {roleBadge(user.roles)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {user.medicalCenterName || '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {user.active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 size={12} /> Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          <XCircle size={12} /> Đã khóa
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setResetModalUser(user);
                          setNewPassword('Medsched@123');
                          setShowPassword(false);
                        }}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 cursor-pointer"
                        title="Đặt lại mật khẩu cho tài khoản này"
                      >
                        <KeyRound size={13} />
                        <span>Đặt lại MK</span>
                      </button>

                      <button
                        onClick={() => handleToggleStatus(user)}
                        disabled={actionLoadingId === user.id}
                        className={`inline-flex items-center text-xs px-3 py-1.5 rounded-lg font-medium transition cursor-pointer ${
                          user.active
                            ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                        }`}
                      >
                        {actionLoadingId === user.id ? '...' : user.active ? 'Khóa' : 'Mở khóa'}
                      </button>
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
    </div>
  );
}
