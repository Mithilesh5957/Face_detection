import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import { FiUsers, FiCamera, FiCheckCircle, FiTrendingUp } from 'react-icons/fi';

export default function DashboardPage() {
  const [stats, setStats] = useState({ students: 0, sessions: 0, avgAttendance: 0 });
  const [recentSessions, setRecentSessions] = useState([]);

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
      setRecentSessions(sessions.slice(0, 5));
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

      <main className="ml-64 pt-16 p-8">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
          <p className="text-gray-400">Welcome to the FaceAttend Management System</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {statCards.map((card, i) => (
            <div key={i} className="glass-card-hover p-6 animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.bgColor} rounded-xl flex items-center justify-center`}>
                  <card.icon className={`text-xl bg-gradient-to-r ${card.color} bg-clip-text text-transparent`} />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{card.value}</div>
              <div className="text-sm text-gray-400">{card.label}</div>
            </div>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Link to="/attendance" className="glass-card-hover p-6 group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/40 transition-shadow">
                <FiCamera className="text-2xl text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Take Attendance</h3>
                <p className="text-sm text-gray-400">Start a live face recognition session</p>
              </div>
            </div>
          </Link>

          <Link to="/students" className="glass-card-hover p-6 group">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:shadow-emerald-500/40 transition-shadow">
                <FiUsers className="text-2xl text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">Manage Students</h3>
                <p className="text-sm text-gray-400">Register students and capture faces</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Recent Sessions */}
        <div className="glass-card p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Sessions</h2>
          {recentSessions.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No sessions yet. Start your first attendance session!</p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                  <div>
                    <div className="text-sm font-medium text-white">Session #{session.id}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(session.start_time).toLocaleDateString()} at{' '}
                      {new Date(session.start_time).toLocaleTimeString()}
                    </div>
                  </div>
                  <span className={session.status === 'active' ? 'badge-active' : 'badge-present'}>
                    {session.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
