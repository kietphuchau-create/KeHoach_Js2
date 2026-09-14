import { useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldAlert } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // Giả lập xử lý từ Backend trả về Role và Token
    setTimeout(() => {
      setLoading(false);
      
      // Bạn có thể đổi thử các value: 'ADMIN', 'MANAGER', 'STAFF', 'CUSTOMER' để test
      const mockRole = 'CUSTOMER'; 
      const mockToken = 'fake-jwt-token-xyz';

      // Lưu thông tin đăng nhập vào LocalStorage
      localStorage.setItem('token', mockToken);
      localStorage.setItem('role', mockRole);

      // Phân luồng điều hướng theo 4 Role
      switch (mockRole) {
        case 'ADMIN':
          navigate('/admin');
          break;
        case 'MANAGER':
          navigate('/manager');
          break;
        case 'STAFF':
          navigate('/staff');
          break;
        case 'CUSTOMER':
        default:
          navigate('/register'); // Chuyển sang trang sau đăng nhập
          break;
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">Đăng Nhập</h1>
          <p className="text-slate-500 text-sm mt-2">
            Hệ thống quản lý & dịch vụ dành cho mọi thành viên
          </p>
        </div>

        {/* Thông báo lỗi */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 flex items-center gap-2 text-red-700 text-sm rounded">
            <ShieldAlert size={18} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Đăng nhập */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Email / Tên đăng nhập
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail size={18} />
              </div>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="example@domain.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
            </div>
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mật khẩu
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={18} />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Ghi nhớ & Quên mật khẩu */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center text-slate-600 cursor-pointer">
              <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-blue-600 mr-2" />
              Ghi nhớ đăng nhập
            </label>
            <a href="#" className="text-blue-600 hover:underline font-medium">
              Quên mật khẩu?
            </a>
          </div>

          {/* Nút Đăng nhập */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg shadow transition disabled:bg-blue-300 flex justify-center items-center"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        {/* Link chuyển sang trang Đăng ký */}
        <div className="text-center mt-6 text-sm text-slate-600">
          Chưa có tài khoản Khách hàng?{' '}
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
}