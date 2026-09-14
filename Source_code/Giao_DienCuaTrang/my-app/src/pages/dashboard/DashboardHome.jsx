export default function DashboardHome() {
  const role = localStorage.getItem('role') || 'CUSTOMER';

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
      <h1 className="text-2xl font-bold text-slate-800 mb-2">
        Xin chào! Bạn đang truy cập với quyền: <span className="text-blue-600">{role}</span>
      </h1>
      <p className="text-slate-500">
        Giao diện Sidebar bên trái đã tự động thay đổi menu chức năng dựa trên Role này.
      </p>
    </div>
  );
}