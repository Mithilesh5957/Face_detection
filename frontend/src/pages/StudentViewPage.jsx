import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../api/client';
import { FiCalendar, FiCheckCircle, FiXCircle, FiTrendingUp } from 'react-icons/fi';

export default function StudentViewPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ total: 0, attended: 0, percentage: 0 });

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      // Get the logged-in student's profile by user_id (via JWT)
      const profileRes = await api.get('/students/me');
      const studentId = profileRes.data.id;

      // Get their attendance summary from the reports endpoint
      const summaryRes = await api.get('/reports/summary');
      const myReport = summaryRes.data.find((r) => r.student_id === studentId);

      if (myReport) {
        setStats({
          total: myReport.total_sessions,
          attended: myReport.attended,
          percentage: myReport.percentage,
        });
      }

      const historyRes = await api.get(`/reports/student/${studentId}`);
      setAttendance(historyRes.data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    }
  };

  const getPercentageColor = (pct) => {
    if (pct >= 75) return 'text-emerald-400';
    if (pct >= 50) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto pt-24 px-6">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold text-white mb-2">My Attendance</h1>
          <p className="text-gray-400">View your attendance history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card-hover p-6 animate-slide-up">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <FiCalendar className="text-blue-400" />
              </div>
              <span className="text-sm text-gray-400">Total Sessions</span>
            </div>
            <div className="text-3xl font-bold text-white">{stats.total}</div>
          </div>

          <div className="glass-card-hover p-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <FiCheckCircle className="text-emerald-400" />
              </div>
              <span className="text-sm text-gray-400">Attended</span>
            </div>
            <div className="text-3xl font-bold text-emerald-400">{stats.attended}</div>
          </div>

          <div className="glass-card-hover p-6 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                <FiTrendingUp className="text-purple-400" />
              </div>
              <span className="text-sm text-gray-400">Percentage</span>
            </div>
            <div className={`text-3xl font-bold ${getPercentageColor(stats.percentage)}`}>
              {stats.percentage}%
            </div>
          </div>
        </div>

        {/* Attendance Progress Bar */}
        <div className="glass-card p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-gray-400">Overall Attendance</span>
            <span className={`text-lg font-bold ${getPercentageColor(stats.percentage)}`}>
              {stats.percentage}%
            </span>
          </div>
          <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-500 transition-all duration-1000"
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          {stats.percentage < 75 && (
            <p className="text-xs text-amber-400 mt-2">⚠️ Your attendance is below 75%. Please attend regularly.</p>
          )}
        </div>

        {/* Attendance History */}
        <div className="glass-card overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-lg font-semibold text-white">Attendance History</h2>
          </div>
          {attendance.length === 0 ? (
            <p className="text-gray-500 text-center py-12">No attendance records yet.</p>
          ) : (
            <div className="divide-y divide-white/5">
              {attendance.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-3">
                    {log.status === 'present' ? (
                      <FiCheckCircle className="text-emerald-400" />
                    ) : (
                      <FiXCircle className="text-red-400" />
                    )}
                    <div>
                      <div className="text-sm text-white">Session #{log.session_id}</div>
                      <div className="text-xs text-gray-500">
                        {log.timestamp ? new Date(log.timestamp).toLocaleString() : 'Not marked'}
                      </div>
                    </div>
                  </div>
                  <span className={log.status === 'present' ? 'badge-present' : 'badge-absent'}>
                    {log.status}
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
