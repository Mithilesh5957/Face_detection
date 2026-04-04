import { NavLink } from 'react-router-dom';
import { FiGrid, FiUsers, FiCamera, FiSettings } from 'react-icons/fi';

const links = [
  { to: '/dashboard', icon: FiGrid, label: 'Dashboard' },
  { to: '/students', icon: FiUsers, label: 'Students' },
  { to: '/attendance', icon: FiCamera, label: 'Attendance' },
  { to: '/settings', icon: FiSettings, label: 'Settings' },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-[72px] bottom-0 w-64 neo-panel rounded-none border-r-2 border-gray-200 p-6 flex flex-col gap-3">
      <div className="text-[10px] uppercase tracking-[0.2em] font-black text-gray-400 mb-2 mt-4 px-2">
        Navigation
      </div>
      {links.map((link) => (
        <NavLink
          key={link.to}
          to={link.to}
          className={({ isActive }) =>
            `flex items-center gap-4 px-4 py-4 rounded-sm font-bold transition-all duration-200 border-2 ${isActive
              ? 'bg-[#ebff00] text-black border-black shadow-[4px_4px_0px_rgba(0,0,0,1)] -translate-y-1'
              : 'bg-transparent text-gray-600 border-transparent hover:border-gray-300 hover:text-black hover:bg-white'
            }`
          }
        >
          {({ isActive }) => (
            <>
              <link.icon className={`text-xl ${isActive ? 'stroke-[3px]' : ''}`} />
              {link.label}
            </>
          )}
        </NavLink>
      ))}

      {/* Bottom section */}
      <div className="mt-auto p-4 neo-inset border-2 border-gray-200">
        <div className="text-[10px] uppercase tracking-widest font-black text-gray-500 mb-2">System Status</div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-none bg-[#ebff00] border-2 border-black animate-pulse shadow-[2px_2px_0px_#000]" />
          <span className="text-sm font-black text-black uppercase tracking-wider">Online</span>
        </div>
      </div>
    </aside>
  );
}
