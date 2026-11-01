'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Users, 
  UserPlus, 
  Search, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock,
  ShieldCheck,
  X,
  Copy,
  Check,
  Mail,
  Phone,
  Calendar,
  Building2,
  Stethoscope,
  DoorOpen,
  AlertTriangle,
  Info,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { api, getAuthToken, getAuthUser } from '@/shared/lib/api';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import EmptyState from '@/shared/components/Feedback/EmptyState';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { useSingleTabLock } from '@/shared/hooks/useSingleTabLock';
import SingleTabLockOverlay from '@/shared/components/Feedback/SingleTabLockOverlay';
import LoginForm from '@/modules/auth/components/LoginForm';
import { releaseDoctorRoomToBackup } from '@/shared/lib/clinicRooms';

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
  const [pageSize] = useState(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
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

  // Danh mục buồng khám lâm sàng tiêu chuẩn
  const APPROVED_CLINIC_ROOMS = [
    {
      roomNumber: 'P.101',
      name: 'Phòng Khám Đa Khoa & Cấp Cứu Ban Đầu',
      center: 'Chi nhánh Quận 7',
      floor: 'Tầng 1',
    },
    {
      roomNumber: 'P.102',
      name: 'Phòng Khám Chuyên Khoa Da Liễu Thẩm Mỹ',
      center: 'Chi nhánh Quận 7',
      floor: 'Tầng 1',
    },
    {
      roomNumber: 'P.205',
      name: 'Phòng Khám Tim Mạch & Can Thiệp Lâm Sàng',
      center: 'Chi nhánh Quận 1',
      floor: 'Tầng 2',
    },
    {
      roomNumber: 'P.208',
      name: 'Phòng Khám Nội Tổng Quát & Tiêu Hóa',
      center: 'Chi nhánh Quận 1',
      floor: 'Tầng 2',
    },
    {
      roomNumber: 'P.209',
      name: 'Phòng Khám Tư Vấn Chuyên Sâu & Tiền Phẫu',
      center: 'Chi nhánh Quận 1',
      floor: 'Tầng 2',
    },
  ];

  // State cho Modal Phân Buồng Khám Bác Sĩ
  const [assignModalUser, setAssignModalUser] = useState<UserItem | null>(null);
  const [assignRoom, setAssignRoom] = useState<string>('P.101');
  const [customRoom, setCustomRoom] = useState<string>('');
  const [isCustomRoom, setIsCustomRoom] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 1. Kiểm tra quyền Admin khi mount trang
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

    const handleKickout = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
    };
    window.addEventListener("medsched:concurrent_kickout", handleKickout);
    return () => {
      window.removeEventListener("medsched:concurrent_kickout", handleKickout);
    };
  }, []);

  // 2. Tự động tìm kiếm theo từng ký tự người dùng nhập vào (debounce 250ms)
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setIsSearching(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 3. Tự động nạp dữ liệu khi từ khóa (debounced), vai trò hoặc số trang thay đổi
  useEffect(() => {
    if (!isAuthenticated) return;
    loadUsers(debouncedQuery, currentPage, selectedRole);
  }, [debouncedQuery, selectedRole, currentPage, isAuthenticated]);

  // 4. Cơ chế tự động làm mới ngầm định kỳ (Background Auto-refresh mỗi 30 giây)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      // Chỉ làm mới ngầm khi tab đang mở, không mở Modal và không đang gõ tìm kiếm
      if (document.visibilityState === 'visible' && !detailUser && !resetModalUser && !isSearching) {
        loadUsers(debouncedQuery, currentPage, selectedRole, true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, debouncedQuery, currentPage, selectedRole, detailUser, resetModalUser, isSearching]);

  const loadUsers = async (query = debouncedQuery, page = currentPage, role = selectedRole, silent = false) => {
    if (!silent) {
      setLoading(true);
      setMessage(null);
    }
    try {
      const isLockedTab = role === 'LOCKED';
      const res = await api.getAdminUsers({
        role: (role === 'ALL' || isLockedTab) ? undefined : role,
        q: query.trim() || undefined,
        page: isLockedTab ? 0 : page,
        size: isLockedTab ? 100 : pageSize,
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
            fullName: u.academicTitle && !u.fullName?.includes(u.academicTitle)
              ? `${u.academicTitle} ${u.fullName}`
              : u.fullName,
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

      // Lọc bỏ tài khoản Quản trị viên (Admin) khỏi bảng quản trị nhân sự & bệnh nhân
      normalizedUsers = normalizedUsers.filter((u) => !u.roles.includes('ROLE_ADMIN'));

      if (isLockedTab) {
        const lockedUsers = normalizedUsers.filter((u) => !u.active);
        const total = lockedUsers.length;
        setTotalElements(total);
        setTotalPages(Math.max(1, Math.ceil(total / pageSize)));
        setUsers(lockedUsers.slice(page * pageSize, (page + 1) * pageSize));
      } else {
        if (role === 'ROLE_DOCTOR') {
          normalizedUsers = normalizedUsers.filter((u) => u.roles.includes('ROLE_DOCTOR'));
        } else if (role === 'ROLE_STAFF') {
          normalizedUsers = normalizedUsers.filter((u) => u.roles.includes('ROLE_STAFF'));
        } else if (role === 'CUSTOMER') {
          normalizedUsers = normalizedUsers.filter(
            (u) => u.roles.includes('ROLE_PATIENT') || u.roles.length === 0 || (!u.roles.includes('ROLE_DOCTOR') && !u.roles.includes('ROLE_STAFF'))
          );
        }

        const total = res?.totalItems !== undefined
          ? res.totalItems
          : (res?.totalElements !== undefined ? res.totalElements : normalizedUsers.length);
        const calculatedTotalPages = res?.totalPages !== undefined && res.totalPages > 0
          ? res.totalPages
          : Math.max(1, Math.ceil(total / pageSize));

        setUsers(normalizedUsers);
        setTotalElements(total);
        setTotalPages(calculatedTotalPages);
      }
    } catch (err: any) {
      console.error(err);
      if (!silent) {
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
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (currentPage !== 0) {
      setCurrentPage(0);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    if (currentPage !== 0) {
      setCurrentPage(0);
    }
    loadUsers('', 0, selectedRole);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentPage !== 0) {
      setCurrentPage(0);
    }
    setDebouncedQuery(searchQuery);
    loadUsers(searchQuery, 0, selectedRole);
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
      
      // Nếu là Bác sĩ nghỉ việc / bị khóa tài khoản -> Tự động chuyển buồng khám thành Phòng Dự Phòng
      let extraNote = '';
      if (newStatus === false) {
        const isDoctor = user.roles?.some(r => r.toUpperCase().includes('DOCTOR')) || !!user.roomNumber;
        if (isDoctor) {
          const freedRoom = releaseDoctorRoomToBackup(user.id, user.roomNumber);
          if (freedRoom) {
            extraNote = ` Đồng thời buồng khám [${freedRoom.code} - ${freedRoom.name}] đã tự động được chuyển thành Phòng Dự Phòng.`;
          }
        }
      }

      setMessage({ 
        type: 'success', 
        text: `Đã ${newStatus ? 'kích hoạt' : 'vô hiệu hóa'} thành công tài khoản ${user.email}!${extraNote}` 
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

  const handleAssignRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModalUser) return;
    const targetRoom = isCustomRoom ? customRoom.trim().toUpperCase() : assignRoom.trim().toUpperCase();
    if (!targetRoom) {
      setMessage({ type: 'error', text: 'Vui lòng chọn hoặc nhập mã số buồng khám hợp lệ.' });
      return;
    }
    setAssignLoading(true);
    try {
      await api.updateAdminDoctorProfile(assignModalUser.id, {
        roomNumber: targetRoom,
      });
      setMessage({
        type: 'success',
        text: `Đã phân bổ buồng [${targetRoom}] thành công cho ${assignModalUser.fullName}! Bác sĩ có thể trực tiếp làm việc tại buồng này.`,
      });
      setAssignModalUser(null);
      // Tải lại danh sách
      loadUsers(debouncedQuery, currentPage, selectedRole, true);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Phân buồng khám thất bại. Vui lòng thử lại.' });
    } finally {
      setAssignLoading(false);
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
    <div className="space-y-4">
      {/* Alert message (Ghim nổi góc trên bên phải) */}
      {message && (
        <AlertMessage pinned type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      {/* Filter & Actions Toolbar (Đã xóa khung trắng bao quanh) */}
      <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-3">
        {/* Role Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar whitespace-nowrap shrink-0">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'ROLE_DOCTOR', label: 'Bác sĩ' },
            { id: 'ROLE_STAFF', label: 'Lễ tân' },
            { id: 'CUSTOMER', label: 'Bệnh nhân' },
            { id: 'LOCKED', label: 'Tài khoản bị khóa' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setSelectedRole(tab.id); setCurrentPage(0); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 whitespace-nowrap shadow-xs border ${
                selectedRole === tab.id
                  ? tab.id === 'LOCKED'
                    ? 'bg-rose-600 text-white border-rose-600'
                    : 'bg-pine-teal text-white border-pine-teal'
                  : tab.id === 'LOCKED'
                    ? 'bg-white text-rose-600 hover:bg-rose-50 border-rose-200'
                    : 'bg-white text-slate-600 hover:text-pine-teal hover:bg-mint-soft border-mint-light'
              }`}
            >
              {tab.id === 'LOCKED' && <XCircle size={13} />}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Right Actions: Search + Tạo Tài Khoản Mới + Tải lại */}
        <div className="flex flex-wrap items-center gap-2.5 justify-start xl:justify-end">
          {/* Search input (tìm kiếm trực tiếp theo từng ký tự) */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm theo tên, email, SĐT..."
              className="pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-mint-light rounded-xl focus:outline-none focus:ring-2 focus:ring-pine-teal/30 w-full transition shadow-xs"
            />
            {isSearching ? (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <RefreshCw size={13} className="animate-spin text-pine-teal" />
              </div>
            ) : searchQuery ? (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition p-0.5 rounded-full cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            ) : null}
          </form>

          {/* Nút Tạo Tài Khoản Mới */}
          <Link
            href="/admin/create-user"
            className="flex items-center gap-1.5 bg-pine-teal hover:bg-pine-teal-hover text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition shrink-0 whitespace-nowrap"
          >
            <UserPlus size={16} />
            <span>Tạo Tài Khoản Mới</span>
          </Link>
        </div>
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
                : searchQuery
                ? `Không có người dùng nào phù hợp với từ khóa "${searchQuery}".`
                : `Không có tài khoản nào phù hợp với bộ lọc "${selectedRole}".`
            }
            onRetry={() => { setSelectedRole('ALL'); handleClearSearch(); }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-mint-soft border-b border-mint-light text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Họ và Tên</th>
                  <th className="py-3.5 px-3.5 whitespace-nowrap">Email & SĐT</th>
                  <th className="py-3.5 px-2 w-28 whitespace-nowrap text-center">Vai Trò</th>
                  <th className="py-3.5 px-3 whitespace-nowrap">Chi Nhánh</th>
                  <th className="py-3.5 px-2 w-20 whitespace-nowrap text-center">Trạng Thái</th>
                  <th className="py-3.5 px-3.5 w-44 text-right whitespace-nowrap">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-mint-soft/50 transition">
                    <td className="py-3.5 px-3.5 font-medium text-slate-800 whitespace-nowrap">
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
                    <td className="py-3.5 px-3.5 whitespace-nowrap">
                      <div className="text-slate-700 font-medium text-xs sm:text-sm">{user.email}</div>
                      <div className="text-xs text-slate-400 font-mono">{user.phone || 'Chưa có SĐT'}</div>
                    </td>
                    <td className="py-3.5 px-2 w-28 whitespace-nowrap text-center">
                      {roleBadge(user.roles)}
                      {user.roles.includes('ROLE_DOCTOR') && (
                        <div className="mt-1">
                          {user.roomNumber ? (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200" 
                              title={`Buồng khám lâm sàng: ${user.roomNumber}`}
                            >
                              <DoorOpen size={11} className="shrink-0 text-purple-600" />
                              <span>{user.roomNumber}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-200">
                              Chưa xếp buồng
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {user.medicalCenterName ? (
                        <span 
                          className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 font-semibold text-xs border border-blue-100 whitespace-nowrap" 
                          title={user.medicalCenterName}
                        >
                          {user.medicalCenterName.replace('Phòng Khám Đa Khoa MedSched - ', '')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">—</span>
                      )}
                    </td>
                    {/* Cột Trạng Thái (Chỉ hiện icon, w-20 nhỏ gọn không chiếm diện tích) */}
                    <td className="py-3.5 px-2 w-20 whitespace-nowrap text-center">
                      <div className="inline-flex items-center justify-center">
                        <div className="relative group/tooltip inline-flex items-center justify-center">
                          {user.active ? (
                            <div 
                              className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-2xs hover:bg-emerald-100 hover:scale-110 transition-all duration-150 cursor-pointer"
                              title="Trạng thái: Đang hoạt động"
                            >
                              <CheckCircle2 size={15} className="shrink-0" />
                            </div>
                          ) : (
                            <div 
                              className="w-7 h-7 rounded-full bg-red-50 text-red-600 border border-red-200 flex items-center justify-center shadow-2xs hover:bg-red-100 hover:scale-110 transition-all duration-150 cursor-pointer"
                              title="Trạng thái: Đã bị khóa"
                            >
                              <XCircle size={15} className="shrink-0" />
                            </div>
                          )}
                          {/* Tooltip sổ ra khi rê chuột */}
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:-translate-y-0.5 transition-all duration-200 z-50 flex flex-col items-center">
                            <div className={`text-white text-[11px] font-bold py-1 px-2.5 rounded-md whitespace-nowrap shadow-md ${
                              user.active ? 'bg-emerald-700' : 'bg-red-700'
                            }`}>
                              {user.active ? 'Đang hoạt động' : 'Tài khoản đã khóa'}
                            </div>
                            <div className={`w-2 h-1 border-x-4 border-x-transparent border-t-4 -mt-px ${
                              user.active ? 'border-t-emerald-700' : 'border-t-red-700'
                            }`} />
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Cột Thao Tác (Chỉ hiện icon, rê chuột sổ ra tooltip chi tiết) */}
                    <td className="py-3.5 px-3.5 w-44 text-right whitespace-nowrap">
                      <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                        {user.roles.includes('ROLE_DOCTOR') && (
                          <div className="relative group/tooltip inline-flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => {
                                setAssignModalUser(user);
                                setAssignRoom(user.roomNumber || 'P.101');
                                setCustomRoom(user.roomNumber || '');
                                setIsCustomRoom(!['P.101', 'P.102', 'P.205', 'P.208', 'P.209'].includes(user.roomNumber || ''));
                              }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center transition bg-purple-50 text-purple-700 hover:bg-purple-100 hover:scale-110 active:scale-95 border border-purple-200 cursor-pointer shadow-2xs"
                              title="Phân buồng khám cho Bác sĩ"
                              aria-label="Phân buồng"
                            >
                              <DoorOpen size={15} />
                            </button>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:-translate-y-0.5 transition-all duration-200 z-50 flex flex-col items-center">
                              <div className="bg-purple-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-md whitespace-nowrap shadow-md">
                                Phân buồng khám
                              </div>
                              <div className="w-2 h-1 border-x-4 border-x-transparent border-t-4 border-t-purple-900 -mt-px" />
                            </div>
                          </div>
                        )}

                        <div className="relative group/tooltip inline-flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => { setDetailUser(user); setCopied(false); }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition bg-sky-50 text-sky-700 hover:bg-sky-100 hover:scale-110 active:scale-95 border border-sky-200 cursor-pointer shadow-2xs"
                            title="Xem chi tiết tài khoản"
                            aria-label="Xem chi tiết"
                          >
                            <Eye size={15} />
                          </button>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:-translate-y-0.5 transition-all duration-200 z-50 flex flex-col items-center">
                            <div className="bg-sky-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-md whitespace-nowrap shadow-md">
                              Xem chi tiết
                            </div>
                            <div className="w-2 h-1 border-x-4 border-x-transparent border-t-4 border-t-sky-900 -mt-px" />
                          </div>
                        </div>

                        <div className="relative group/tooltip inline-flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => {
                              setResetModalUser(user);
                              setNewPassword('Medsched@123');
                              setShowPassword(false);
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition bg-amber-50 text-amber-700 hover:bg-amber-100 hover:scale-110 active:scale-95 border border-amber-200 cursor-pointer shadow-2xs"
                            title="Đặt lại mật khẩu"
                            aria-label="Đặt lại mật khẩu"
                          >
                            <KeyRound size={15} />
                          </button>
                          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:-translate-y-0.5 transition-all duration-200 z-50 flex flex-col items-center">
                            <div className="bg-amber-900 text-white text-[11px] font-semibold py-1 px-2.5 rounded-md whitespace-nowrap shadow-md">
                              Đặt lại mật khẩu
                            </div>
                            <div className="w-2 h-1 border-x-4 border-x-transparent border-t-4 border-t-amber-900 -mt-px" />
                          </div>
                        </div>

                        {user.id === currentUser?.id || user.email === currentUser?.email ? (
                          <div className="relative group/tooltip inline-flex items-center justify-center">
                            <span
                              className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed"
                              title="Tài khoản của chính bạn (Không thể tự khóa)"
                              aria-label="Chính bạn"
                            >
                              <ShieldCheck size={15} />
                            </span>
                            <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:-translate-y-0.5 transition-all duration-200 z-50 flex flex-col items-end">
                              <div className="bg-slate-800 text-white text-[11px] font-semibold py-1 px-2.5 rounded-md whitespace-nowrap shadow-md">
                                Chính bạn (Không thể khóa)
                              </div>
                              <div className="w-2 h-1 mr-3 border-x-4 border-x-transparent border-t-4 border-t-slate-800 -mt-px" />
                            </div>
                          </div>
                        ) : (
                          <div className="relative group/tooltip inline-flex items-center justify-center">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              disabled={actionLoadingId === user.id}
                              className={`w-8 h-8 rounded-lg flex items-center justify-center transition cursor-pointer shadow-2xs hover:scale-110 active:scale-95 border ${
                                user.active
                                  ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                              title={user.active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                              aria-label={user.active ? 'Khóa' : 'Mở khóa'}
                            >
                              {actionLoadingId === user.id ? (
                                <RefreshCw size={13} className="animate-spin" />
                              ) : user.active ? (
                                <Lock size={14} />
                              ) : (
                                <Unlock size={14} />
                              )}
                            </button>
                            <div className="pointer-events-none absolute bottom-full right-0 mb-1.5 opacity-0 group-hover/tooltip:opacity-100 group-hover/tooltip:-translate-y-0.5 transition-all duration-200 z-50 flex flex-col items-end">
                              <div className={`${user.active ? 'bg-rose-800' : 'bg-emerald-800'} text-white text-[11px] font-semibold py-1 px-2.5 rounded-md whitespace-nowrap shadow-md`}>
                                {user.active ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                              </div>
                              <div className={`w-2 h-1 mr-3 border-x-4 border-x-transparent border-t-4 ${user.active ? 'border-t-rose-800' : 'border-t-emerald-800'} -mt-px`} />
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && totalElements > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span>Hiển thị</span>
              <strong className="text-slate-800 font-bold">
                {totalElements === 0 ? 0 : currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, totalElements)}
              </strong>
              <span>trên tổng số</span>
              <strong className="text-slate-800 font-bold">{totalElements}</strong>
              <span>tài khoản</span>
              <span className="text-slate-400 font-normal ml-1">({pageSize} tài khoản/trang)</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                disabled={currentPage === 0 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-pine-teal transition shadow-2xs cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Trang trước</span>
              </button>

              {/* Numbered page buttons */}
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i).map((pageIdx) => {
                  if (
                    totalPages > 7 &&
                    pageIdx !== 0 &&
                    pageIdx !== totalPages - 1 &&
                    Math.abs(pageIdx - currentPage) > 1
                  ) {
                    if (pageIdx === 1 || pageIdx === totalPages - 2) {
                      return <span key={pageIdx} className="px-1 text-slate-400 select-none">...</span>;
                    }
                    return null;
                  }

                  const isActive = currentPage === pageIdx;
                  return (
                    <button
                      key={pageIdx}
                      type="button"
                      onClick={() => setCurrentPage(pageIdx)}
                      disabled={loading}
                      className={`min-w-[32px] h-8 px-2 flex items-center justify-center rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer ${
                        isActive
                          ? 'bg-pine-teal text-white border border-pine-teal'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-mint-soft hover:text-pine-teal'
                      }`}
                    >
                      {pageIdx + 1}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={currentPage >= totalPages - 1 || loading}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 hover:text-pine-teal transition shadow-2xs cursor-pointer"
              >
                <span>Trang sau</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Đặt lại mật khẩu */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl border border-mint-light w-full max-w-md overflow-hidden transform transition-all max-h-[calc(100vh-2rem)] flex flex-col my-auto">
            {/* Modal Header */}
            <div className="bg-mint-soft px-5 py-3.5 border-b border-mint-light flex items-center justify-between shrink-0">
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
            <form onSubmit={handleResetPassword} className="p-5 space-y-4 overflow-y-auto flex-1">
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
      {/* ── Modal Xem Chi Tiết Người Dùng (High-Density, Scrollable, Không bị hàn chết) ── */}
      {detailUser && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
          onClick={() => setDetailUser(null)}
        >
          <div 
            className="bg-white rounded-2xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[calc(100vh-2rem)] my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal - Gọn gàng, độ tương phản cao */}
            <div className="bg-gradient-to-r from-teal-800 via-emerald-800 to-slate-900 text-white px-5 py-3.5 relative shrink-0">
              <button
                type="button"
                onClick={() => setDetailUser(null)}
                className="absolute top-3 right-3 text-white/70 hover:text-white p-1 rounded-full hover:bg-white/10 transition cursor-pointer"
                title="Đóng (Esc)"
              >
                <X size={18} />
              </button>

              <div className="flex items-center gap-3 pr-8">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xs text-white border border-white/30 flex items-center justify-center font-extrabold text-lg shadow-inner shrink-0">
                  {detailUser.fullName ? detailUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <h3 className="font-extrabold text-base text-white leading-tight truncate">
                    {detailUser.fullName || 'Người dùng chưa đặt tên'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {roleBadge(detailUser.roles)}
                    {detailUser.active ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-400/30">
                        <CheckCircle2 size={10} /> Hoạt động
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-300 bg-rose-950/60 px-2 py-0.5 rounded-full border border-rose-400/30">
                        <XCircle size={10} /> Đã khóa
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Body Modal - High Density Layout, cuộn mượt mà */}
            <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto text-xs">
              {/* Thông tin liên lạc (Email & SĐT gom 2 cột gọn) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-0.5 text-[11px] font-semibold">
                    <Mail size={13} className="text-teal-primary" />
                    <span>Email Đăng Nhập:</span>
                  </div>
                  <div className="font-semibold text-slate-800 truncate text-xs" title={detailUser.email}>
                    {detailUser.email}
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
                  <div className="flex items-center gap-1.5 text-slate-500 mb-0.5 text-[11px] font-semibold">
                    <Phone size={13} className="text-teal-primary" />
                    <span>Số Điện Thoại:</span>
                  </div>
                  <div className="font-semibold text-slate-800 text-xs">
                    {detailUser.phone || <span className="text-slate-400 font-normal italic">Chưa đăng ký SĐT</span>}
                  </div>
                </div>
              </div>

              {/* Thông tin chuyên khoa dành riêng cho Bác Sĩ (Gom gọn gàng chuẩn y khoa) */}
              {(detailUser.roles.includes('ROLE_DOCTOR') || detailUser.specialtyName) && (
                <div className="bg-gradient-to-br from-sky-50 to-indigo-50/40 border border-sky-200/80 p-3 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-sky-900 text-xs font-bold uppercase">
                      <Stethoscope size={15} className="text-sky-700" />
                      <span>Chuyên Môn Bác Sĩ:</span>
                    </div>
                    <span className="text-[10px] font-bold bg-sky-200/70 text-sky-900 px-2 py-0.5 rounded-full">
                      Khám Lâm Sàng
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white/90 p-2 rounded-lg border border-sky-100">
                      <span className="text-slate-400 block text-[10px]">Chuyên Khoa:</span>
                      <strong className="text-sky-950 font-bold text-xs truncate block">
                        {detailUser.specialtyName || 
                          (detailUser.email.includes('minhanh') ? 'Chuyên khoa Da liễu' : 
                           detailUser.email.includes('tranhung') ? 'Khoa Nội tổng quát' : 
                           detailUser.email.includes('thuha') ? 'Chuyên khoa Da liễu' : 'Chuyên Khoa Nội')}
                      </strong>
                    </div>

                    <div className="bg-white/90 p-2 rounded-lg border border-sky-100">
                      <span className="text-slate-400 block text-[10px]">Buồng Khám:</span>
                      <strong className="text-slate-800 font-bold text-xs truncate block">
                        {detailUser.roomNumber || 
                          (detailUser.email.includes('minhanh') ? 'Phòng P.205' : 
                           detailUser.email.includes('tranhung') ? 'Phòng P.208' : 
                           detailUser.email.includes('thuha') ? 'Phòng P.102' : 'Phòng Khám Đa Khoa')}
                      </strong>
                    </div>

                    <div className="col-span-2 bg-white/90 p-2 rounded-lg border border-sky-100">
                      <span className="text-slate-400 block text-[10px]">Học Vị / Chức Danh:</span>
                      <strong className="text-slate-800 font-semibold text-xs block">
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
              <div className="bg-emerald-50/60 border border-emerald-100 p-2.5 rounded-xl">
                <div className="flex items-center gap-1.5 text-emerald-800 text-[11px] font-bold uppercase mb-0.5">
                  <Building2 size={13} className="text-emerald-700" />
                  <span>Chi Nhánh Phòng Khám Trực Thuộc:</span>
                </div>
                <div className="text-xs font-semibold text-slate-800">
                  {detailUser.medicalCenterName || (
                    <span className="text-slate-500 font-normal italic">
                      Tài khoản Bệnh nhân toàn cục (Không cố định chi nhánh)
                    </span>
                  )}
                </div>
              </div>

              {/* Ngày tạo tài khoản */}
              <div className="bg-slate-50 border border-slate-200/80 px-3 py-2 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-slate-500">
                  <Calendar size={13} className="text-slate-400" />
                  <span>Thời Gian Tạo Tài Khoản:</span>
                </div>
                <span className="font-semibold text-slate-700">
                  {detailUser.createdAt 
                    ? new Date(detailUser.createdAt).toLocaleString('vi-VN') 
                    : 'Hệ thống khởi tạo'}
                </span>
              </div>
            </div>

            {/* Footer Modal Actions - Luôn ghim cố định trong tầm mắt */}
            <div className="bg-slate-50 px-4 sm:px-5 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-1.5">
                {detailUser.roles.includes('ROLE_DOCTOR') && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = detailUser;
                      setDetailUser(null);
                      setAssignModalUser(target);
                      setAssignRoom(target.roomNumber || 'P.101');
                      setCustomRoom(target.roomNumber || '');
                      setIsCustomRoom(!APPROVED_CLINIC_ROOMS.some(r => r.roomNumber === target.roomNumber));
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 rounded-xl transition cursor-pointer"
                  >
                    <DoorOpen size={13} />
                    <span>Phân buồng</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    const target = detailUser;
                    setDetailUser(null);
                    setResetModalUser(target);
                    setNewPassword('Medsched@123');
                    setShowPassword(false);
                  }}
                  className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 rounded-xl transition cursor-pointer"
                >
                  <KeyRound size={13} />
                  <span>Đặt lại MK</span>
                </button>

                {detailUser.id !== currentUser?.id && detailUser.email !== currentUser?.email && (
                  <button
                    type="button"
                    onClick={() => {
                      handleToggleStatus(detailUser);
                      setDetailUser(prev => prev ? { ...prev, active: !prev.active } : null);
                    }}
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1.5 rounded-xl border transition cursor-pointer ${
                      detailUser.active
                        ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200'
                        : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200'
                    }`}
                  >
                    {detailUser.active ? <Lock size={13} /> : <CheckCircle2 size={13} />}
                    <span>{detailUser.active ? 'Khóa TK' : 'Mở khóa'}</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setDetailUser(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-800 text-xs font-bold rounded-xl transition cursor-pointer ml-auto"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Phân Bổ Buồng Khám Bác Sĩ */}
      {assignModalUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-purple-100 w-full max-w-lg overflow-hidden transform transition-all max-h-[calc(100vh-2rem)] flex flex-col my-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-5 py-3.5 border-b border-purple-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 text-purple-900 font-bold text-base">
                <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                  <DoorOpen size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Phân Bổ Buồng Khám & Tránh Xung Đột</h3>
                  <p className="text-[11px] text-purple-700 font-normal">Chỉ định phòng khám lâm sàng hoạt động cho Bác sĩ</p>
                </div>
              </div>
              <button
                onClick={() => setAssignModalUser(null)}
                className="text-slate-400 hover:text-slate-600 transition cursor-pointer p-1 rounded-lg hover:bg-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleAssignRoom} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              {/* Doctor Info Card */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm shrink-0 border border-purple-200">
                  {assignModalUser.fullName ? assignModalUser.fullName.charAt(0).toUpperCase() : 'B'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Bác sĩ thực hiện:</div>
                  <div className="font-bold text-slate-800 text-sm truncate">{assignModalUser.fullName}</div>
                  <div className="text-slate-500 font-mono text-[11px] truncate">{assignModalUser.email}</div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block font-medium">Buồng hiện tại:</span>
                  <span className="inline-block px-2 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                    {assignModalUser.roomNumber || 'Chưa xếp'}
                  </span>
                </div>
              </div>

              {/* Danh sách các buồng khám tiêu chuẩn */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  Chọn buồng khám lâm sàng tiêu chuẩn:
                </label>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {APPROVED_CLINIC_ROOMS.map((room) => {
                    const occupyingDoc = users.find(
                      (u) => u.roles.includes('ROLE_DOCTOR') && u.id !== assignModalUser.id && u.roomNumber === room.roomNumber
                    );
                    const isSelected = !isCustomRoom && assignRoom === room.roomNumber;

                    return (
                      <div
                        key={room.roomNumber}
                        onClick={() => {
                          setIsCustomRoom(false);
                          setAssignRoom(room.roomNumber);
                        }}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/20 shadow-xs'
                            : 'bg-white border-slate-200 hover:border-purple-200 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                            isSelected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {room.roomNumber}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-xs text-slate-800 truncate">{room.name}</div>
                            <div className="text-[11px] text-slate-400">{room.center} • {room.floor}</div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          {occupyingDoc ? (
                            <span 
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 max-w-[130px] truncate"
                              title={`Đang gán cho: ${occupyingDoc.fullName}`}
                            >
                              <AlertTriangle size={11} className="shrink-0 text-amber-600" />
                              <span className="truncate">{occupyingDoc.fullName}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              <CheckCircle2 size={11} className="shrink-0 text-emerald-600" />
                              <span>Trống</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tùy chọn nhập buồng khác */}
              <div className="pt-1">
                <div 
                  onClick={() => setIsCustomRoom(true)}
                  className={`p-3 rounded-xl border transition cursor-pointer ${
                    isCustomRoom 
                      ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/20' 
                      : 'bg-white border-slate-200 hover:border-purple-200'
                  }`}
                >
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                    <input
                      type="radio"
                      name="roomOption"
                      checked={isCustomRoom}
                      onChange={() => setIsCustomRoom(true)}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span>Nhập mã buồng khám lâm sàng khác</span>
                  </label>
                  {isCustomRoom && (
                    <div className="mt-2 pl-5">
                      <input
                        type="text"
                        value={customRoom}
                        onChange={(e) => setCustomRoom(e.target.value.toUpperCase())}
                        placeholder="Ví dụ: P.301, P.402..."
                        className="w-full text-xs px-3 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-400/30 uppercase font-mono font-bold"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Cảnh báo nếu chọn buồng đang có người */}
              {!isCustomRoom && (() => {
                const dupDoc = users.find(
                  (u) => u.roles.includes('ROLE_DOCTOR') && u.id !== assignModalUser.id && u.roomNumber === assignRoom
                );
                if (dupDoc) {
                  return (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Chú ý xung đột:</strong> Buồng <strong>[{assignRoom}]</strong> hiện đang được phân cho <strong>{dupDoc.fullName}</strong>. Nếu gán cùng buồng, hãy xếp ca trực khác giờ để tránh xung đột lịch trực.
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setAssignModalUser(null)}
                  disabled={assignLoading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={assignLoading}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {assignLoading ? <RefreshCw size={13} className="animate-spin" /> : <DoorOpen size={14} />}
                  <span>{assignLoading ? 'Đang lưu...' : 'Lưu Phân Buồng'}</span>
                </button>
              </div>
            </form>
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
