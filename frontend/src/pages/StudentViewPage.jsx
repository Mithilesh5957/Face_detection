import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../api/client';
import { FiCalendar, FiCheckCircle, FiXCircle, FiTrendingUp, FiFilter } from 'react-icons/fi';

export default function StudentViewPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState([]);
  const [stats, setStats] = useState({ total: 0, attended: 0, percentage: 0 });
  const [filter, setFilter] = useState('all');

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
    if (pct >= 75) return 'text-[#ebff00] bg-black px-2 py-1 shadow-[2px_2px_0px_#d1d5db]';
    if (pct >= 50) return 'text-black bg-[#ebff00] px-2 py-1 border-2 border-black shadow-[2px_2px_0px_#000]';
    return 'text-white bg-red-500 px-2 py-1 border-2 border-black shadow-[2px_2px_0px_#000]';
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-4xl mx-auto pt-24 px-6 md:px-8">
        {/* Header */}
        <div className="mb-10 animate-fade-in">
          <h1 className="brutal-title">My Attendance</h1>
          <p className="brutal-subtitle mt-2">View your attendance history</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="neo-panel bg-white border-4 border-black p-6 flex flex-col items-center justify-center animate-slide-up shadow-[4px_4px_0px_#d1d5db]">
            <div className="flex items-center gap-3 mb-4 text-black">
              <FiCalendar className="text-xl" />
              <span className="text-sm font-bold uppercase tracking-widest text-gray-500 mt-1">Total Sessions</span>
            </div>
            <div className="text-5xl font-black text-black">{stats.total}</div>
          </div>

          <div className="neo-panel bg-white border-4 border-black p-6 flex flex-col items-center justify-center animate-slide-up shadow-[4px_4px_0px_#d1d5db]" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-4 text-black">
              <FiCheckCircle className="text-xl" />
              <span className="text-sm font-bold uppercase tracking-widest text-gray-500 mt-1">Attended</span>
            </div>
            <div className="text-5xl font-black text-black">{stats.attended}</div>
          </div>

          <div className="neo-panel bg-white border-4 border-black p-6 flex flex-col items-center justify-center animate-slide-up shadow-[4px_4px_0px_#d1d5db]" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-3 mb-4 text-black">
              <FiTrendingUp className="text-xl" />
              <span className="text-sm font-bold uppercase tracking-widest text-gray-500 mt-1">Percentage</span>
            </div>
            <div className={`text-4xl font-black ${getPercentageColor(stats.percentage)}`}>
              {stats.percentage}%
            </div>
          </div>
        </div>

        {/* Attendance Progress Bar */}
        <div className="brutal-card p-6 mb-10 bg-[#f0f0f5]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-black uppercase tracking-widest text-black">Overall Attendance</span>
            <span className={`text-xl font-black ${getPercentageColor(stats.percentage)}`}>
              {stats.percentage}%
            </span>
          </div>
          <div className="w-full h-4 border-2 border-black bg-white rounded-none overflow-hidden shadow-[2px_2px_0px_#000]">
            <div
              className={`h-full transition-all duration-1000 ${stats.percentage >= 75 ? 'bg-black' : stats.percentage >= 50 ? 'bg-[#ebff00]' : 'bg-red-500'}`}
              style={{ width: `${stats.percentage}%` }}
            />
          </div>
          {stats.percentage < 75 && (
            <p className="text-xs font-bold uppercase text-red-600 tracking-wider mt-3">⚠️ Your attendance is below 75%. Please attend regularly.</p>
          )}
        </div>

        {/* Attendance History */}
        <div className="neo-panel border-4 border-black overflow-hidden bg-white mb-10">
          <div className="flex items-center justify-between p-6 border-b-4 border-black bg-[#f0f0f5]">
            <h2 className="brutal-subtitle text-black">Attendance History</h2>
            <div className="flex items-center gap-2">
              <FiFilter className="text-black" />
              <select 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
                className="input-field !py-2 !px-3 font-bold border-2 border-black focus:ring-0 max-w-[150px]"
              >
                <option value="all">Logs (All)</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
              </select>
            </div>
          </div>
          
          {attendance.filter(log => filter === 'all' ? true : log.status === filter).length === 0 ? (
            <p className="text-gray-500 text-center py-12 font-bold uppercase tracking-widest">No attendance records found.</p>
          ) : (
            <div className="divide-y-2 divide-gray-200">
              {attendance
                .filter(log => filter === 'all' ? true : log.status === filter)
                .map((log) => (
                <div key={log.id} className="flex items-center justify-between p-6 hover:bg-[#ebff00]/10 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_#000] ${log.status === 'present' ? 'bg-[#ebff00]' : 'bg-red-500'}`}>
                      {log.status === 'present' ? (
                        <FiCheckCircle className="text-black text-2xl" strokeWidth={3} />
                      ) : (
                        <FiXCircle className="text-white text-2xl" strokeWidth={3} />
                      )}
                    </div>
                    <div>
                      <div className="text-lg font-black text-black">SESSION #{log.session_id}</div>
                      <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mt-1">
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
