import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import toast from 'react-hot-toast';
import { FiUsers, FiCamera, FiCheckCircle, FiTrendingUp, FiDownload, FiFilter, FiTrash2, FiX } from 'react-icons/fi';
import { downloadCSV } from '../utils/csvExport';

export default function DashboardPage() {
  const [stats, setStats] = useState({ students: 0, sessions: 0, avgAttendance: 0 });
  const [recentSessions, setRecentSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [filter, setFilter] = useState('all'); // all, active, completed
  const [chartData, setChartData] = useState([]);

  // Advanced Session Modal
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);

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

      // Calculate Class Distribution Chart Data
      const buckets = { critical: 0, warning: 0, good: 0, excellent: 0 };
      summary.forEach(s => {
        if (s.percentage < 50) buckets.critical++;
        else if (s.percentage < 75) buckets.warning++;
        else if (s.percentage < 90) buckets.good++;
        else buckets.excellent++;
      });
      setChartData([
        { label: '<50%', value: buckets.critical, color: 'bg-red-500' },
        { label: '50-74%', value: buckets.warning, color: 'bg-orange-500' },
        { label: '75-89%', value: buckets.good, color: 'bg-[#ebff00]' },
        { label: '90%+', value: buckets.excellent, color: 'bg-emerald-400' }
      ]);

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

  const openSessionModal = async (sessionId) => {
    setSelectedSessionId(sessionId);
    setSessionDetails(null);
    try {
      const res = await api.get(`/reports/session/${sessionId}`);
      setSessionDetails(res.data);
    } catch (err) {
      toast.error('Failed to load session details');
      setSelectedSessionId(null);
    }
  };

  const closeSessionModal = () => {
    setSelectedSessionId(null);
    setSessionDetails(null);
  };

  const deleteSession = async (sessionId) => {
    if (!window.confirm("Are you sure you want to completely erase this session? This action cannot be undone.")) return;
    try {
      await api.delete(`/attendance/session/${sessionId}`);
      toast.success("Session erased from history.");
      closeSessionModal();
      loadData();
    } catch (err) {
      toast.error('Failed to delete session');
    }
  };

  const toggleStudentAttendance = async (sessionId, studentId, currentStatus) => {
    const newStatus = currentStatus === 'present' ? 'absent' : 'present';
    try {
      await api.post('/attendance/override', {
        session_id: sessionId,
        student_id: studentId,
        status: newStatus,
      });
      // Silent refresh of the details in the modal
      const res = await api.get(`/reports/session/${sessionId}`);
      setSessionDetails(res.data);
      toast.success(`Marked as ${newStatus}`);
    } catch (err) {
      toast.error('Failed to update attendance');
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f5]">
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

        {/* Analytics & Actions Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 mb-10">
          
          {/* Class Attendance Distribution Chart */}
          <div className="neo-panel border-4 border-black p-6 bg-white flex flex-col justify-between">
            <h2 className="brutal-subtitle text-black mb-6">Attendance Distribution</h2>
            <div className="flex items-end justify-between h-[180px] mt-4 gap-4 px-4">
              {chartData.map((bar, idx) => {
                const maxVal = Math.max(...chartData.map(d => d.value)) || 1;
                const heightPct = Math.max((bar.value / maxVal) * 100, 5); // min 5% height so it's visible
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 group">
                    <div className="text-xl font-black text-black mb-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {bar.value}
                    </div>
                    <div 
                      className={`w-full ${bar.color} border-4 border-black shadow-[4px_4px_0px_#000] relative group-hover:-translate-y-2 transition-transform duration-300`}
                      style={{ height: `${heightPct}%` }}
                    ></div>
                    <div className="mt-4 text-xs font-bold text-gray-600 uppercase tracking-widest text-center">
                      {bar.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <Link to="/attendance" className="brutal-card p-6 flex-1 flex items-center gap-6 group hover:bg-[#ebff00] transition-colors cursor-pointer bg-white">
              <div className="w-16 h-16 border-4 border-black bg-black flex items-center justify-center group-hover:-translate-y-1 group-hover:shadow-[4px_4px_0px_#000] transition-all">
                <FiCamera className="text-3xl text-[#ebff00]" strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-xl font-black text-black uppercase tracking-wide">Live Session</h3>
                <p className="text-sm font-bold text-gray-600">Start new face recognition</p>
              </div>
            </Link>

            <Link to="/students" className="brutal-card p-6 flex-1 flex items-center gap-6 group hover:bg-[#ebff00] transition-colors cursor-pointer bg-white">
              <div className="w-16 h-16 border-4 border-black bg-black flex items-center justify-center group-hover:-translate-y-1 group-hover:shadow-[4px_4px_0px_#000] transition-all">
                <FiUsers className="text-3xl text-[#ebff00]" strokeWidth={3} />
              </div>
              <div>
                <h3 className="text-xl font-black text-black uppercase tracking-wide">Students</h3>
                <p className="text-sm font-bold text-gray-600">Register new face records</p>
              </div>
            </Link>
          </div>
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
                <div key={session.id} onClick={() => openSessionModal(session.id)} className="cursor-pointer flex flex-col md:flex-row md:items-center justify-between p-4 border-2 border-black shadow-[4px_4px_0px_#d1d5db] hover:shadow-[6px_6px_0px_#000] hover:-translate-y-1 transition-all bg-[#f0f0f5]">
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
        {/* Modal Overlay for Advanced Session Edit */}
        {selectedSessionId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="brutal-card bg-[#f0f0f5] border-4 border-black w-full max-w-2xl max-h-[90vh] flex flex-col shadow-[12px_12px_0px_#000] animate-slide-up">
              
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b-4 border-black bg-white shrink-0">
                <div>
                  <h2 className="brutal-title text-2xl">Session #{selectedSessionId}</h2>
                  <p className="font-bold text-gray-500 uppercase tracking-widest text-xs mt-1">Audit Mode</p>
                </div>
                <button onClick={closeSessionModal} className="p-2 border-2 border-black bg-[#ebff00] hover:bg-white transition-colors shadow-[2px_2px_0px_#000]">
                  <FiX className="text-xl text-black" strokeWidth={3} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 bg-white">
                {!sessionDetails ? (
                   <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin"></div></div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                       <div className="border-2 border-black p-4 bg-[#ebff00]">
                         <div className="text-sm font-bold uppercase tracking-widest">Total Present</div>
                         <div className="text-3xl font-black">{sessionDetails.present_count}</div>
                       </div>
                       <div className="border-2 border-black p-4 bg-red-500 text-white">
                         <div className="text-sm font-bold uppercase tracking-widest">Total Absent</div>
                         <div className="text-3xl font-black">{sessionDetails.absent_count}</div>
                       </div>
                    </div>
                    
                    <h3 className="brutal-subtitle text-black mb-4">Override Roster</h3>
                    <div className="space-y-3">
                      {sessionDetails.logs.map(log => (
                        <div key={log.id} className={`flex items-center justify-between p-3 border-2 border-black ${log.status === 'present' ? 'bg-[#ebff00]/20' : 'bg-red-50'}`}>
                          <div>
                            <p className="font-black text-black uppercase">{log.student_name || 'N/A'}</p>
                            <p className="text-xs font-bold text-gray-600">{log.roll_number || 'N/A'}</p>
                          </div>
                          <button
                            onClick={() => toggleStudentAttendance(sessionDetails.session_id, log.student_id, log.status)}
                            className={`px-4 py-2 text-xs font-black uppercase tracking-widest border-2 border-black transition-all shadow-[2px_2px_0px_#000] active:translate-y-1 active:shadow-none ${log.status === 'present' ? 'bg-black text-white hover:bg-gray-800' : 'bg-white text-black hover:bg-gray-100'}`}
                          >
                            Mark {log.status === 'present' ? 'Absent' : 'Present'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-6 border-t-4 border-black bg-gray-100 flex justify-between items-center shrink-0">
                <button
                  onClick={() => deleteSession(selectedSessionId)}
                  className="btn-danger flex items-center gap-2 !py-2 !px-4"
                >
                  <FiTrash2 strokeWidth={3} /> Delete Session
                </button>
                <div className="text-xs font-bold text-gray-500 uppercase">Warning: Irreversible action</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
