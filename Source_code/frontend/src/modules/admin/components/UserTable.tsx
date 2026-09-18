'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Table from '@mui/material/Table';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import TablePagination from '@mui/material/TablePagination';
import Avatar from '@mui/material/Avatar';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettingsRounded';
import PersonAddIcon from '@mui/icons-material/PersonAddRounded';
import SearchIcon from '@mui/icons-material/SearchRounded';
import RefreshIcon from '@mui/icons-material/RefreshRounded';
import CheckCircleIcon from '@mui/icons-material/CheckCircleRounded';
import CancelIcon from '@mui/icons-material/CancelRounded';

import { api, getAuthToken, getAuthUser } from '@/shared/lib/api';
import LoadingSpinner from '@/shared/components/Feedback/LoadingSpinner';
import EmptyState from '@/shared/components/Feedback/EmptyState';
import AlertMessage from '@/shared/components/Feedback/AlertMessage';
import { medoraColors } from '@/shared/theme/theme';

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
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    const user = getAuthUser();
    if (!token) {
      router.push('/login');
      return;
    }
    setCurrentUser(user);
    loadUsers();
  }, [selectedRole, currentPage, pageSize]);

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

      if (res && res.content) {
        setUsers(res.content);
        setTotalElements(res.totalElements || res.content.length);
        setTotalPages(res.totalPages || 1);
      } else if (Array.isArray(res)) {
        setUsers(res);
        setTotalElements(res.length);
        setTotalPages(1);
      } else {
        setUsers([]);
      }
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

  const roleBadge = (roles: string[]) => {
    if (!roles || roles.length === 0) return <Chip label="Khách" size="small" variant="outlined" />;
    if (roles.includes('ROLE_ADMIN')) return <Chip label="Quản Trị Viên" size="small" color="secondary" sx={{ fontWeight: 800, fontSize: '10px' }} />;
    if (roles.includes('ROLE_DOCTOR')) return <Chip label="Bác Sĩ" size="small" color="primary" sx={{ fontWeight: 800, fontSize: '10px' }} />;
    if (roles.includes('ROLE_STAFF')) return <Chip label="Lễ Tân" size="small" color="success" sx={{ fontWeight: 800, fontSize: '10px' }} />;
    return <Chip label="Khách Hàng" size="small" variant="outlined" sx={{ fontWeight: 700, fontSize: '10px' }} />;
  };

  return (
    <Stack spacing={3}>
      {/* Header Banner */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 4,
          border: `1px solid ${medoraColors.border}`,
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: medoraColors.main, mb: 0.5 }}>
            <AdminPanelSettingsIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Hệ thống Quản trị Medora
            </Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Quản Lý Người Dùng & Nhân Sự
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem', mt: 0.5 }}>
            Theo dõi, phân quyền và kích hoạt tài khoản Quản trị, Bác sĩ, Lễ tân và Bệnh nhân.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5}>
          <Button
            component={Link}
            href="/admin/create-user"
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            sx={{ borderRadius: 3, px: 2.5, fontWeight: 800 }}
          >
            Tạo Tài Khoản Mới
          </Button>
          <IconButton
            onClick={() => loadUsers()}
            disabled={loading}
            sx={{ backgroundColor: '#F1F5F9', '&:hover': { backgroundColor: '#E2E8F0' } }}
          >
            <RefreshIcon className={loading ? 'animate-spin' : ''} />
          </IconButton>
        </Stack>
      </Paper>

      {/* Alert Message */}
      {message && (
        <AlertMessage type={message.type} message={message.text} onClose={() => setMessage(null)} />
      )}

      {/* Filter & Search Bar */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 4,
          border: `1px solid ${medoraColors.border}`,
          backgroundColor: '#ffffff',
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Paper elevation={0} sx={{ backgroundColor: '#F1F5F9', p: 0.5, borderRadius: 3 }}>
          <Tabs
            value={selectedRole}
            onChange={(_, val) => { setSelectedRole(val); setCurrentPage(0); }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              minHeight: 36,
              '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', borderRadius: 2, minHeight: 36, px: 2 },
            }}
          >
            <Tab label="Tất cả" value="ALL" />
            <Tab label="Quản trị" value="ROLE_ADMIN" />
            <Tab label="Bác sĩ" value="ROLE_DOCTOR" />
            <Tab label="Lễ tân" value="ROLE_STAFF" />
            <Tab label="Bệnh nhân" value="CUSTOMER" />
          </Tabs>
        </Paper>

        <Box component="form" onSubmit={handleSearchSubmit} sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, email, SĐT..."
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
          <Button type="submit" variant="contained" color="primary" sx={{ borderRadius: 3, px: 2.5, fontWeight: 700 }}>
            Tìm
          </Button>
        </Box>
      </Paper>

      {/* Table Data */}
      <Paper elevation={0} sx={{ borderRadius: 4, border: `1px solid ${medoraColors.border}`, overflow: 'hidden', backgroundColor: '#ffffff' }}>
        {loading ? (
          <LoadingSpinner message="Đang nạp danh sách tài khoản từ máy chủ Spring Boot 3..." />
        ) : users.length === 0 ? (
          <EmptyState
            title="Không tìm thấy người dùng"
            description={`Không có tài khoản nào phù hợp với bộ lọc "${selectedRole}" hoặc từ khóa tìm kiếm.`}
            onRetry={() => { setSelectedRole('ALL'); setSearchQuery(''); loadUsers(); }}
          />
        ) : (
          <Box>
            <TableContainer>
              <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Họ và Tên</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Email & SĐT</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Vai Trò</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Cơ Sở Y Tế</TableCell>
                  <TableCell sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Trạng Thái</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 800, fontSize: '0.75rem' }}>Thao Tác</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 32, height: 32, fontSize: '0.8rem', fontWeight: 800, bgcolor: medoraColors.soft, color: medoraColors.main }}>
                          {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{user.fullName || 'Chưa cập nhật'}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '10px' }}>ID: {user.id.slice(0, 8)}...</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>{user.email}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{user.phone || 'Chưa có SĐT'}</Typography>
                    </TableCell>
                    <TableCell>{roleBadge(user.roles)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>{user.medicalCenterName || '—'}</TableCell>
                    <TableCell>
                      {user.active ? (
                        <Chip icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />} label="Hoạt động" size="small" color="success" sx={{ fontWeight: 700, fontSize: '10px' }} />
                      ) : (
                        <Chip icon={<CancelIcon sx={{ fontSize: '14px !important' }} />} label="Đã khóa" size="small" color="error" sx={{ fontWeight: 700, fontSize: '10px' }} />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant="outlined"
                        color={user.active ? 'error' : 'success'}
                        disabled={actionLoadingId === user.id}
                        onClick={() => handleToggleStatus(user)}
                        sx={{ borderRadius: 2, fontSize: '0.75rem', fontWeight: 700 }}
                      >
                        {actionLoadingId === user.id ? <CircularProgress size={14} /> : user.active ? 'Khóa' : 'Mở khóa'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

            <TablePagination
              component="div"
              count={totalElements}
              page={currentPage}
              onPageChange={(_, newPage) => setCurrentPage(newPage)}
              rowsPerPage={pageSize}
              onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setCurrentPage(0); }}
              labelRowsPerPage="Số hàng/trang:"
            />
          </Box>
        )}
      </Paper>
    </Stack>
  );
}
