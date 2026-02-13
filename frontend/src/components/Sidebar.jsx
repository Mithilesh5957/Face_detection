import { NavLink } from 'react-router-dom';
import { FiGrid, FiUsers, FiCamera } from 'react-icons/fi';

const links = [
  { to: '/dashboard', icon: FiGrid, label: 'Dashboard' },
  { to: '/students', icon: FiUsers, label: 'Students' },
  { to: '/attendance', icon: FiCamera, label: 'Attendance' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-64 glass-card border-0 border-r border-white/10 rounded-none p-4 flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-2 px-3">
        Navigation
      </div>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
              ? 'bg-primary-500/20 text-primary-400 shadow-lg shadow-primary-500/10'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`
          }
        >
          <link.icon className="text-lg" />
          {link.label}
        </NavLink>
      ))}

      {/* Bottom section */}
      <div className="mt-auto p-4 glass-card">
        <div className="text-xs text-gray-500 mb-1">System Status</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-sm text-emerald-400">Online</span>
        </div>
      </div>
    </aside>
  );
}
