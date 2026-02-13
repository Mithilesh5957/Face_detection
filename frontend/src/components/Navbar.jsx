import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FiLogOut, FiUser, FiShield } from 'react-icons/fi';

export default function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass-card border-0 border-b border-white/10 rounded-none flex items-center px-6">
      {/* Logo */}
      <Link to={isAdmin ? '/dashboard' : '/student-view'} className="flex items-center gap-3 mr-8">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-purple-500 flex items-center justify-center">
          <FiShield className="text-white text-lg" />
        </div>
        <span className="text-lg font-bold bg-gradient-to-r from-primary-400 to-purple-400 bg-clip-text text-transparent">
          FaceAttend
        </span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User info */}
      {user && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5">
            <FiUser className="text-primary-400" />
            <span className="text-sm text-gray-300">{user.name}</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-primary-500/20 text-primary-300 font-medium uppercase">
              {user.role}
            </span>
          </div>
          <button onClick={handleLogout} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Logout">
            <FiLogOut />
          </button>
        </div>
      )}
    </nav>
  );
}
