import { useState } from 'react';
import { User, Mail, Phone, Lock, Save, ShieldCheck, KeyRound } from 'lucide-react';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState('info'); // 'info' hoặc 'password'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // State thông tin cá nhân
  const [profile, setProfile] = useState({
    fullName: 'Nguyễn Văn A',
    email: 'nguyenvana@example.com',
    phone: '0987654321',
    role: localStorage.getItem('role') || 'CUSTOMER',
  });

  // State đổi mật khẩu
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    setTimeout(() => {
      setLoading(false);
      setMessage('Cập nhật thông tin cá nhân thành công!');
    }, 800);
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Mật khẩu mới và mật khẩu xác nhận không khớp!');
      return;
    }

    if (passwords.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setMessage('Đổi mật khẩu thành công!');
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        {/* Header Profile */}
        <div className="bg-slate-800 p-6 text-white flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-2xl font-bold border-2 border-white shadow">
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-bold">{profile.fullName}</h2>
            <p className="text-slate-300 text-sm mt-0.5">
              Vai trò: <span className="bg-blue-500/30 text-blue-200 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider">{profile.role}</span>
            </p>
          </div>
        </div>

        {/* Chuyển Tab */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => { setActiveTab('info'); setMessage(''); setError(''); }}
            className={`flex-1 py-4 text-center font-semibold text-sm transition flex items-center justify-center gap-2 ${
              activeTab === 'info' 
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <User size={18} />
            Thông Tin Cá Nhân
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('password'); setMessage(''); setError(''); }}
            className={`flex-1 py-4 text-center font-semibold text-sm transition flex items-center justify-center gap-2 ${
              activeTab === 'password' 
                ? 'border-b-2 border-blue-600 text-blue-600 bg-white' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound size={18} />
            Đổi Mật Khẩu
          </button>
        </div>

        <div className="p-6">
          {/* Alert thông báo */}
          {message && (
            <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 text-sm flex items-center gap-2 rounded">
              <ShieldCheck size={18} />
              <span>{message}</span>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm flex items-center gap-2 rounded">
              <Lock size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: Sửa thông tin cá nhân */}
          {activeTab === 'info' && (
            <form onSubmit={handleProfileSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Họ và tên</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="text"
                    required
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email (Chỉ xem)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 bg-slate-100 text-slate-500 rounded-lg cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Số điện thoại</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="tel"
                    required
                    pattern="[0-9]{10,11}"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg shadow transition disabled:bg-blue-300 flex items-center gap-2"
                >
                  <Save size={18} />
                  {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: Đổi mật khẩu */}
          {activeTab === 'password' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu hiện tại</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={passwords.currentPassword}
                    onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                    placeholder="Tối thiểu 6 ký tự"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Xác nhận mật khẩu mới</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 text-slate-400" size={18} />
                  <input
                    type="password"
                    required
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                    placeholder="Nhập lại mật khẩu mới"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-lg shadow transition disabled:bg-blue-300 flex items-center gap-2"
                >
                  <KeyRound size={18} />
                  {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}