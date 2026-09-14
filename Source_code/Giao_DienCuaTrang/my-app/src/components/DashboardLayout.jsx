import { useState } from 'react';
import { Link, useNavigate, Outlet } from 'react-router-dom';
import { 
  UserCheck, 
  Users, 
  Briefcase, 
  ShoppingBag, 
  User, 
  LogOut, 
  Menu, 
  X,
  LayoutDashboard 
} from 'lucide-react';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const userRole = localStorage.getItem('role') || 'CUSTOMER';

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  const menuConfig = {
    ADMIN: [
      { name: 'Tổng quan Admin', icon: LayoutDashboard, path: '/admin' },
      { name: 'Quản lý Tài khoản', icon: Users, path: '/admin/users' },
      { name: 'Cấu hình Hệ thống', icon: UserCheck, path: '/admin/settings' },
    ],
    MANAGER: [
      { name: 'Tổng quan Quản lý', icon: LayoutDashboard, path: '/manager' },
      { name: 'Quản lý Nhân sự', icon: Users, path: '/manager/staff' },
      { name: 'Báo cáo Dịch vụ', icon: Briefcase, path: '/manager/reports' },
    ],
    STAFF: [
      { name: 'Danh sách Công việc', icon: Briefcase, path: '/staff' },
      { name: 'Xử lý Đơn hàng', icon: ShoppingBag, path: '/staff/orders' },
    ],
    CUSTOMER: [
      { name: 'Trang chủ Dịch vụ', icon: ShoppingBag, path: '/customer' },
      { name: 'Đơn hàng của tôi', icon: Briefcase, path: '/customer/orders' },
    ]
  };

  const currentMenu = menuConfig[userRole] || menuConfig.CUSTOMER;

  return (
    <div className="min-h-screen bg-slate-100 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between h-16 px-6 bg-slate-950">
          <span className="text-xl font-bold text-blue-400">System App</span>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 mx-4 mt-4 bg-slate-800 rounded-xl border border-slate-700">
          <p className="text-xs text-slate-400 uppercase font-semibold">Quyền hiện tại</p>
          <p className="text-sm font-bold text-blue-400 mt-1">{userRole}</p>
        </div>

        <nav className="p-4 space-y-1">
          {currentMenu.map((item, index) => {
            const Icon = item.icon;
            return (
              <Link
                key={index}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-300 rounded-lg hover:bg-blue-600 hover:text-white transition"
              >
                <Icon size={18} />
                {item.name}
              </Link>
            );
          })}

          <hr className="my-4 border-slate-800" />

          <Link
            to="/profile"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-300 rounded-lg hover:bg-slate-800 hover:text-white transition"
          >
            <User size={18} />
            Hồ sơ cá nhân
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-400 rounded-lg hover:bg-red-500/10 transition"
          >
            <LogOut size={18} />
            Đăng xuất
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-200 lg:hidden">
          <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
            <Menu size={24} />
          </button>
          <span className="font-semibold text-slate-800">Dashboard</span>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}