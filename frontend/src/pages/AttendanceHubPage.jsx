import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import toast from 'react-hot-toast';
import { FiPlay, FiSquare, FiRefreshCw, FiUser, FiCheckCircle, FiXCircle } from 'react-icons/fi';

export default function AttendanceHubPage() {
  const [session, setSession] = useState(null); // active session
  const [logs, setLogs] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [summary, setSummary] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const wsRef = useRef(null);
  const feedImgRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    checkActiveSession();
    return () => {
      stopStreaming();
    };
  }, []);

  const checkActiveSession = async () => {
    try {
      const res = await api.get('/attendance/sessions');
      const active = res.data.find((s) => s.status === 'active');
      if (active) {
        setSession(active);
        loadLogs(active.id);
      }
    } catch (err) { }
  };

  const loadLogs = async (sessionId) => {
    try {
      const res = await api.get(`/attendance/session/${sessionId}/logs`);
      setLogs(res.data);
    } catch (err) { }
  };

  // ── Session Controls ──────────────────────────────────────────
  const startSession = async () => {
    try {
      const res = await api.post('/attendance/start');
      setSession(res.data);
      setSummary(null);
      toast.success('Attendance session started!');
      loadLogs(res.data.id);
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to start session'); }
  };

  const stopSession = async () => {
    try {
      stopStreaming();
      const res = await api.post('/attendance/stop');
      setSummary(res.data);
      setSession(null);
      toast.success('Session ended. Summary generated.');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to stop session'); }
  };

  // ── Manual Override ───────────────────────────────────────────
  const toggleStatus = async (log) => {
    const newStatus = log.status === 'present' ? 'absent' : 'present';
    try {
      await api.post('/attendance/override', {
        session_id: session.id,
        student_id: log.student_id,
        status: newStatus,
      });
      loadLogs(session.id);
      toast.success(`${log.student_name} marked ${newStatus}`);
    } catch (err) { toast.error('Override failed'); }
  };

  // ── Video Streaming ───────────────────────────────────────────
  const startStreaming = async () => {
    if (!session) { toast.error('Start a session first'); return; }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      // Open WebSocket
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}://${window.location.host}`;
      const ws = new WebSocket(`${wsHost}/api/attendance/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        setStreaming(true);
        toast.success('Camera feed started');
        // Start sending frames
        intervalRef.current = setInterval(() => sendFrame(), 200); // ~5 fps
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.frame && feedImgRef.current) {
          feedImgRef.current.src = `data:image/jpeg;base64,${data.frame}`;
        }
        if (data.detections && data.detections.length > 0) {
          data.detections.forEach((det) => {
            toast.success(`✅ ${det.name} marked present`, { duration: 3000 });
          });
          loadLogs(session.id);
        }
      };

      ws.onerror = () => toast.error('WebSocket connection error');
      ws.onclose = () => setStreaming(false);
    } catch (err) {
      toast.error('Camera access denied');
    }
  };

  const sendFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const b64 = dataUrl.split(',')[1];

    wsRef.current.send(JSON.stringify({
      frame: b64,
      session_id: session?.id,
    }));
  }, [session]);

  const stopStreaming = () => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    setStreaming(false);
  };

  const presentCount = logs.filter((l) => l.status === 'present').length;
  const absentCount = logs.filter((l) => l.status === 'absent').length;

  return (
    <div className="min-h-screen">
      <Navbar />
      <Sidebar />
      <main className="ml-64 pt-16 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-white">Attendance Hub</h1>
            <p className="text-gray-400 mt-1">Real-time face recognition attendance</p>
          </div>
          <div className="flex gap-3">
            {!session ? (
              <button onClick={startSession} className="btn-primary flex items-center gap-2">
                <FiPlay /> Start Session
              </button>
            ) : (
              <>
                {!streaming ? (
                  <button onClick={startStreaming} className="btn-primary flex items-center gap-2">
                    <FiPlay /> Start Camera
                  </button>
                ) : (
                  <button onClick={stopStreaming} className="btn-secondary flex items-center gap-2">
                    <FiSquare /> Stop Camera
                  </button>
                )}
                <button onClick={stopSession} className="btn-danger flex items-center gap-2 !px-6 !py-3">
                  <FiSquare /> End Session
                </button>
              </>
            )}
          </div>
        </div>

        {/* Active Session Banner */}
        {session && (
          <div className="glass-card p-4 mb-6 flex items-center gap-4 border-primary-500/30 animate-slide-up">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 font-medium">Session #{session.id} Active</span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400 text-sm">Started: {new Date(session.start_time).toLocaleTimeString()}</span>
            <div className="flex-1" />
            <span className="text-emerald-400 font-semibold">{presentCount}</span>
            <span className="text-gray-500 text-sm">Present</span>
            <span className="text-gray-500">|</span>
            <span className="text-red-400 font-semibold">{absentCount}</span>
            <span className="text-gray-500 text-sm">Absent</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Feed - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="glass-card p-4">
              <h2 className="text-lg font-semibold text-white mb-3">Live Feed</h2>
              <div className="camera-feed bg-surface-800">
                {streaming ? (
                  <>
                    {/* Hidden real video for frame capture */}
                    <video ref={videoRef} autoPlay playsInline className="hidden" />
                    {/* Annotated feed from backend */}
                    <img ref={feedImgRef} alt="Annotated feed" className="w-full h-full object-cover rounded-xl" />
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-gray-500">
                    <FiPlay className="text-4xl mb-3 opacity-30" />
                    <p className="text-sm">{session ? 'Click "Start Camera" to begin' : 'Start a session first'}</p>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          {/* Attendance List - 1/3 width */}
          <div>
            <div className="glass-card p-4 max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Roll Call</h2>
                {session && (
                  <button onClick={() => loadLogs(session.id)} className="p-2 rounded-lg hover:bg-white/10 text-gray-400">
                    <FiRefreshCw className="text-sm" />
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <p className="text-gray-500 text-center py-8 text-sm">No students in session</p>
              ) : (
                <div className="space-y-2">
                  {logs.map((log) => (
                    <div key={log.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${log.status === 'present' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-white/5 border border-white/5'
                      }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.status === 'present' ? 'bg-emerald-500/20' : 'bg-red-500/20'
                        }`}>
                        {log.status === 'present' ? <FiCheckCircle className="text-emerald-400" /> : <FiXCircle className="text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{log.student_name || `Student #${log.student_id}`}</div>
                        <div className="text-xs text-gray-500">{log.roll_number || ''}</div>
                      </div>
                      {session && (
                        <button
                          onClick={() => toggleStatus(log)}
                          className={`text-xs px-2 py-1 rounded-md transition-colors ${log.status === 'present'
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                            }`}
                        >
                          {log.status === 'present' ? 'Mark Absent' : 'Mark Present'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Modal */}
        {summary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-card p-8 w-full max-w-xl animate-slide-up">
              <h2 className="text-2xl font-bold text-white mb-2">Session Summary</h2>
              <p className="text-gray-400 mb-6">Session #{summary.session_id} has ended.</p>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="stat-card items-center">
                  <span className="text-3xl font-bold text-white">{summary.total_students}</span>
                  <span className="text-xs text-gray-400">Total</span>
                </div>
                <div className="stat-card items-center">
                  <span className="text-3xl font-bold text-emerald-400">{summary.present_count}</span>
                  <span className="text-xs text-gray-400">Present</span>
                </div>
                <div className="stat-card items-center">
                  <span className="text-3xl font-bold text-red-400">{summary.absent_count}</span>
                  <span className="text-xs text-gray-400">Absent</span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2 mb-6">
                {summary.logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                    <span className="text-sm text-white">{log.student_name || `Student #${log.student_id}`}</span>
                    <span className={log.status === 'present' ? 'badge-present' : 'badge-absent'}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>

              <button onClick={() => setSummary(null)} className="btn-primary w-full">Close</button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
