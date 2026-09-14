import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ProfilePage from './pages/profile/ProfilePage';
import DashboardLayout from './components/DashboardLayout';
import DashboardHome from './pages/dashboard/DashboardHome';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        
        <Route element={<DashboardLayout />}>
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={<DashboardHome />} />
          <Route path="/manager" element={<DashboardHome />} />
          <Route path="/staff" element={<DashboardHome />} />
          <Route path="/customer" element={<DashboardHome />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;