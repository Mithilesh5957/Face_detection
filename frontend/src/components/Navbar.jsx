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
    <nav className="fixed top-0 left-0 right-0 z-50 h-[72px] bg-[#f0f0f5] border-b-4 border-black flex items-center px-6 shadow-sm">
      {/* Logo */}
      <Link to={isAdmin ? '/dashboard' : '/student-view'} className="flex items-center gap-3 mr-8 group">
        <div className="w-10 h-10 bg-black flex items-center justify-center transition-transform group-hover:scale-105 shadow-[3px_3px_0px_#ebff00]">
          <FiShield className="text-[#ebff00] text-xl" />
        </div>
        <span className="text-2xl font-black text-black tracking-tight uppercase">
          FaceAttend
        </span>
      </Link>

      {/* Spacer */}
      <div className="flex-1" />

      {/* User info */}
      {user && (
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 neo-inset border-2 border-transparent">
            <FiUser className="text-black text-lg" />
            <span className="text-sm font-bold text-black">{user.name}</span>
            <span className="text-[10px] px-2 py-0.5 ml-2 bg-[#ebff00] border border-black text-black font-black uppercase shadow-[1px_1px_0px_#000000]">
              {user.role}
            </span>
          </div>
          <button onClick={handleLogout} className="p-3 bg-red-500 text-white border-2 border-black shadow-[2px_2px_0px_#000000] hover:translate-y-px hover:shadow-[1px_1px_0px_#000000] transition-all" title="Logout">
            <FiLogOut strokeWidth={3} />
          </button>
        </div>
      )}
    </nav>
  );
}
