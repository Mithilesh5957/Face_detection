import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import { FiUsers, FiCamera, FiCheckCircle, FiTrendingUp, FiDownload, FiFilter } from 'react-icons/fi';
import { downloadCSV } from '../utils/csvExport';

export default function DashboardPage() {
  const [stats, setStats] = useState({ students: 0, sessions: 0, avgAttendance: 0 });
  const [recentSessions, setRecentSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [filter, setFilter] = useState('all'); // all, active, completed

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [studentsRes, sessionsRes, summaryRes] = await Promise.all([
        api.get('/students/'),
        api.get('/attendance/sessions'),
        api.get('/reports/summary'),
      ]);

      const students = studentsRes.data;
      const sessions = sessionsRes.data;
      const summary = summaryRes.data;

      const avgAttendance = summary.length > 0
        ? summary.reduce((sum, s) => sum + s.percentage, 0) / summary.length
        : 0;

      setStats({
        students: students.length,
        sessions: sessions.length,
        avgAttendance: Math.round(avgAttendance),
      });
      setAllSessions(sessions);
      setRecentSessions(sessions.slice(0, 10)); // keep 10 initially
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  const statCards = [
    {
      label: 'Total Students',
      value: stats.students,
      icon: FiUsers,
      color: 'from-blue-500 to-cyan-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Sessions Held',
      value: stats.sessions,
      icon: FiCamera,
      color: 'from-purple-500 to-pink-400',
      bgColor: 'bg-purple-500/10',
    },
    {
      label: 'Avg Attendance',
      value: `${stats.avgAttendance}%`,
      icon: FiTrendingUp,
      color: 'from-emerald-500 to-teal-400',
      bgColor: 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="min-h-screen">
      <Navbar />
      <Sidebar />

      <main className="ml-64 pt-[72px] p-8">
        {/* Header */}
        <div className="mb-10 animate-fade-in flex justify-between items-end">
          <div>
            <h1 className="brutal-title">Dashboard</h1>
            <p className="brutal-subtitle mt-2">FaceAttend Management System</p>
          </div>
          <button 
            onClick={() => {
              const exportData = allSessions.map(s => ({
                SessionID: s.id,
                Status: s.status,
                StartTime: new Date(s.start_time).toLocaleString(),
                EndTime: s.end_time ? new Date(s.end_time).toLocaleString() : 'N/A'
              }));
              downloadCSV(exportData, 'all_sessions_export.csv');
            }} 
            className="btn-secondary flex items-center gap-2 bg-white"
          >
            <FiDownload strokeWidth={3} /> Export Sessions
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {statCards.map((card, i) => (
            <div key={i} className="neo-panel p-6 border-4 border-black bg-white flex items-center gap-6 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className={`w-16 h-16 border-4 border-black bg-white shadow-[2px_2px_0px_#000] flex items-center justify-center -rotate-3 hover:rotate-0 transition-transform`}>
                <card.icon className="text-3xl text-black" strokeWidth={3} />
              </div>
              <div>
                <div className="text-4xl font-black text-black leading-none">{card.value}</div>
                <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-2">{card.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          <Link to="/attendance" className="brutal-card p-6 flex items-center gap-6 group hover:bg-[#ebff00] transition-colors cursor-pointer bg-white">
            <div className="w-16 h-16 border-4 border-black bg-black flex items-center justify-center group-hover:-translate-y-1 group-hover:shadow-[4px_4px_0px_#000] transition-all">
              <FiCamera className="text-3xl text-[#ebff00]" strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-xl font-black text-black uppercase tracking-wide">Live Session</h3>
              <p className="text-sm font-bold text-gray-600">Start new face recognition</p>
            </div>
          </Link>

          <Link to="/students" className="brutal-card p-6 flex items-center gap-6 group hover:bg-[#ebff00] transition-colors cursor-pointer bg-white">
            <div className="w-16 h-16 border-4 border-black bg-black flex items-center justify-center group-hover:-translate-y-1 group-hover:shadow-[4px_4px_0px_#000] transition-all">
              <FiUsers className="text-3xl text-[#ebff00]" strokeWidth={3} />
            </div>
            <div>
              <h3 className="text-xl font-black text-black uppercase tracking-wide">Students</h3>
              <p className="text-sm font-bold text-gray-600">Register new face records</p>
            </div>
          </Link>
        </div>

        {/* Recent Sessions */}
        <div className="neo-panel border-4 border-black p-6 bg-white">
          <div className="flex items-center justify-between mb-6">
            <h2 className="brutal-subtitle text-black">Session Log</h2>
            <div className="flex items-center gap-2">
              <FiFilter className="text-black" />
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="input-field !py-2 !px-3 font-bold border-2 border-black focus:ring-0 max-w-[150px]"
              >
                <option value="all">Logs (All)</option>
                <option value="active">Active Only</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          
          {recentSessions.filter(s => filter === 'all' ? true : filter === 'active' ? s.status === 'active' : s.status !== 'active').length === 0 ? (
            <p className="text-gray-500 text-center py-8 font-bold uppercase tracking-widest text-sm">No recent sessions found.</p>
          ) : (
            <div className="space-y-4">
              {recentSessions
                .filter(s => filter === 'all' ? true : filter === 'active' ? s.status === 'active' : s.status !== 'active')
                .map((session) => (
                <div key={session.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border-2 border-black shadow-[4px_4px_0px_#d1d5db] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-1 transition-all bg-[#f0f0f5]">
                  <div>
                    <div className="text-lg font-black text-black">SESSION #{session.id}</div>
                    <div className="text-xs font-bold text-gray-600 mt-1 uppercase tracking-wider">
                      {new Date(session.start_time).toLocaleDateString()} — {new Date(session.start_time).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0">
                    <span className={session.status === 'active' ? 'px-4 py-2 bg-[#ebff00] text-black text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_#000000] animate-pulse' : 'px-4 py-2 bg-white text-gray-600 text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_#000000]'}>
                      {session.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
