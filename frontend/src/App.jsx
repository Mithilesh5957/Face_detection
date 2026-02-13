import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StudentManagementPage from './pages/StudentManagementPage';
import AttendanceHubPage from './pages/AttendanceHubPage';
import StudentViewPage from './pages/StudentViewPage';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/student-view" replace />;

  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Admin routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute adminOnly><DashboardPage /></ProtectedRoute>
      } />
      <Route path="/students" element={
        <ProtectedRoute adminOnly><StudentManagementPage /></ProtectedRoute>
      } />
      <Route path="/attendance" element={
        <ProtectedRoute adminOnly><AttendanceHubPage /></ProtectedRoute>
      } />

      {/* Student route */}
      <Route path="/student-view" element={
        <ProtectedRoute><StudentViewPage /></ProtectedRoute>
      } />

      {/* Default redirect */}
      <Route path="*" element={
        user
          ? <Navigate to={user.role === 'admin' ? '/dashboard' : '/student-view'} replace />
          : <Navigate to="/login" replace />
      } />
    </Routes>
  );
}
