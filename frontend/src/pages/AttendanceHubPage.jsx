import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import toast from 'react-hot-toast';
import { FiPlay, FiSquare, FiRefreshCw, FiUser, FiCheckCircle, FiXCircle, FiDownload } from 'react-icons/fi';
import CameraFeed from '../components/CameraFeed';
import { downloadCSV } from '../utils/csvExport';

export default function AttendanceHubPage() {
  const [session, setSession] = useState(null); // active session
  const [logs, setLogs] = useState([]);
  const [streaming, setStreaming] = useState(false);
  const [summary, setSummary] = useState(null);
  const [trackingBoxes, setTrackingBoxes] = useState([]);
  const cameraRef = useRef(null);
  const canvasRef = useRef(null);
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

  // ── Video Streaming Callback ───────────────────────────────────────────
  const handleStreamReady = () => {
    try {
      // Open WebSocket
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsHost = import.meta.env.VITE_WS_URL || `${wsProtocol}://${window.location.host}`;
      const ws = new WebSocket(`${wsHost}/api/attendance/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        toast.success('Camera feed and WebSocket started');
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
        if (data.tracking_boxes) {
          setTrackingBoxes(data.tracking_boxes);
        }
      };

      ws.onerror = () => toast.error('WebSocket connection error');
      ws.onclose = () => {
        if (streaming) setStreaming(false);
      };
    } catch (err) {
      toast.error('Failed to initialize connection');
      setStreaming(false);
    }
  };

  const startStreaming = () => {
    if (!session) { toast.error('Start a session first'); return; }
    setStreaming(true); // This activates the CameraFeed
  };

  const sendFrame = useCallback(() => {
    if (!cameraRef.current || !canvasRef.current || !wsRef.current) return;
    if (wsRef.current.readyState !== WebSocket.OPEN) return;

    const video = cameraRef.current.getVideoElement();
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

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
    setStreaming(false); // This deactivates the CameraFeed
    setTrackingBoxes([]);
  };

  const presentCount = logs.filter((l) => l.status === 'present').length;
  const absentCount = logs.filter((l) => l.status === 'absent').length;

  return (
    <div className="min-h-screen">
      <Navbar />
      <Sidebar />
      <main className="ml-64 pt-[72px] p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="brutal-title">Attendance Hub</h1>
            <p className="brutal-subtitle mt-2">Real-time face recognition attendance</p>
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
          <div className="brutal-card p-4 mb-6 flex items-center gap-4 animate-slide-up bg-[#ebff00]">
            <div className="w-4 h-4 rounded-none bg-black animate-pulse" />
            <span className="text-black font-black uppercase text-lg tracking-widest">Session #{session.id} Active</span>
            <span className="text-black font-black">|</span>
            <span className="text-black font-bold text-sm uppercase">Started: {new Date(session.start_time).toLocaleTimeString()}</span>
            <div className="flex-1" />
            <span className="text-black font-black text-xl">{presentCount}</span>
            <span className="text-black font-bold text-sm uppercase">Present</span>
            <span className="text-black font-black">|</span>
            <span className="text-red-600 font-black text-xl">{absentCount}</span>
            <span className="text-red-800 font-bold text-sm uppercase">Absent</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Feed - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="neo-panel p-6 border-4 border-black">
              <h2 className="brutal-subtitle text-black mb-4">Live Feed</h2>
              <div className="camera-feed bg-black relative w-full rounded-xl overflow-hidden aspect-[4/3]">
                {streaming ? (
                  <>
                    <CameraFeed 
                      ref={cameraRef} 
                      isActive={streaming} 
                      onStreamReady={handleStreamReady} 
                      onStreamError={() => setStreaming(false)}
                    />
                    {/* Clean feed overlays exactly on top using absolute positioning so the canvas drawing works in background */}
                    <img 
                      ref={feedImgRef} 
                      alt="Live feed" 
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
                      style={{ opacity: 1, zIndex: 10 }}
                    />
                    {/* CSS Bounding Boxes overlay */}
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {trackingBoxes.map((box, idx) => {
                        const [x, y, w, h] = box.bbox;
                        return (
                          <div
                            key={idx}
                            className={`absolute border-2 transition-all duration-75 ${box.is_recognized ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}
                            style={{
                              left: `${(x / 640) * 100}%`,
                              top: `${(y / 480) * 100}%`,
                              width: `${(w / 640) * 100}%`,
                              height: `${(h / 480) * 100}%`
                            }}
                          >
                            {/* Floating Name Badge */}
                            <div className={`absolute -top-7 left-0 px-2 py-1 whitespace-nowrap text-xs font-bold text-white rounded backdrop-blur-md shadow-lg flex items-center gap-1 ${box.is_recognized ? 'bg-emerald-500/90 border border-emerald-400' : 'bg-red-500/90 border border-red-400'}`}>
                              {box.is_recognized ? <FiCheckCircle className="text-[10px]" /> : <FiUser className="text-[10px]" />}
                              {box.label}
                            </div>
                            
                            {/* Corner Accents for high-tech look */}
                            <div className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${box.is_recognized ? 'border-emerald-300' : 'border-red-300'}`}></div>
                            <div className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${box.is_recognized ? 'border-emerald-300' : 'border-red-300'}`}></div>
                            <div className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${box.is_recognized ? 'border-emerald-300' : 'border-red-300'}`}></div>
                            <div className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${box.is_recognized ? 'border-emerald-300' : 'border-red-300'}`}></div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 bg-[#f0f0f5]">
                    <FiPlay className="text-5xl mb-4 text-black opacity-20" />
                    <p className="text-sm font-bold uppercase tracking-widest text-black">{session ? 'Click "Start Camera" to begin' : 'Start a session first'}</p>
                  </div>
                )}
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>

          {/* Attendance List - 1/3 width */}
          <div>
            <div className="neo-panel p-6 border-4 border-black max-h-[calc(100vh-200px)] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="brutal-subtitle text-black">Roll Call</h2>
                {session && (
                  <button onClick={() => loadLogs(session.id)} className="p-2 border-2 border-black bg-white hover:-translate-y-1 shadow-[2px_2px_0px_#000] active:translate-y-px active:shadow-none transition-all">
                    <FiRefreshCw className="text-black font-bold" strokeWidth={3} />
                  </button>
                )}
              </div>

              {logs.length === 0 ? (
                <p className="text-black font-bold text-center py-8 text-sm uppercase tracking-widest">No students in session</p>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className={`flex items-center gap-4 p-4 rounded-sm border-2 transition-all duration-300 ${log.status === 'present' ? 'bg-[#ebff00] border-black shadow-[4px_4px_0px_#000]' : 'bg-white border-black shadow-[4px_4px_0px_#d1d5db]'
                      }`}>
                      <div className={`w-10 h-10 border-2 border-black flex items-center justify-center ${log.status === 'present' ? 'bg-white' : 'bg-red-500'
                        }`}>
                        {log.status === 'present' ? <FiCheckCircle className="text-black text-xl" strokeWidth={3} /> : <FiXCircle className="text-white text-xl" strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-black text-black uppercase truncate">{log.student_name || `Student #${log.student_id}`}</div>
                        <div className="text-xs font-bold text-gray-700">{log.roll_number || ''}</div>
                      </div>
                      {session && (
                        <button
                          onClick={() => toggleStatus(log)}
                          className={`text-xs px-3 py-2 font-black uppercase border-2 border-black transition-all ${log.status === 'present'
                              ? 'bg-red-500 text-white shadow-[2px_2px_0px_#000] hover:translate-y-px hover:shadow-[1px_1px_0px_#000]'
                              : 'bg-[#ebff00] text-black shadow-[2px_2px_0px_#000] hover:translate-y-px hover:shadow-[1px_1px_0px_#000]'
                            }`}
                        >
                          {log.status === 'present' ? 'Absent' : 'Present'}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
            <div className="brutal-card p-10 w-full max-w-xl animate-slide-up bg-[#f0f0f5]">
              <h2 className="brutal-title mb-2">Session Summary</h2>
              <p className="brutal-subtitle mb-8">Session #{summary.session_id} has ended.</p>

              <div className="grid grid-cols-3 gap-6 mb-8">
                <div className="neo-panel p-6 flex flex-col items-center border-4 border-black bg-white">
                  <span className="text-4xl font-black text-black">{summary.total_students}</span>
                  <span className="text-xs font-bold text-gray-600 tracking-widest uppercase mt-2">Total</span>
                </div>
                <div className="neo-panel p-6 flex flex-col items-center border-4 border-black bg-[#ebff00]">
                  <span className="text-4xl font-black text-black">{summary.present_count}</span>
                  <span className="text-xs font-bold text-black tracking-widest uppercase mt-2">Present</span>
                </div>
                <div className="neo-panel p-6 flex flex-col items-center border-4 border-black bg-red-500">
                  <span className="text-4xl font-black text-white">{summary.absent_count}</span>
                  <span className="text-xs font-bold text-white tracking-widest uppercase mt-2">Absent</span>
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto space-y-3 mb-8 bg-white border-2 border-black p-4 neo-inset">
                {summary.logs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 border-b-2 border-gray-200 last:border-0">
                    <span className="text-sm font-bold text-black uppercase">{log.student_name || `Student #${log.student_id}`}</span>
                    <span className={log.status === 'present' ? 'badge-present' : 'badge-absent'}>
                      {log.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => {
                    const csvData = summary.logs.map(l => ({
                      Name: l.student_name || `Student #${l.student_id}`,
                      RollNumber: l.roll_number || 'N/A',
                      Status: l.status.toUpperCase()
                    }));
                    downloadCSV(csvData, `session_${summary.session_id}_attendance.csv`);
                  }} 
                  className="btn-secondary flex-1 flex items-center justify-center gap-2"
                >
                  <FiDownload strokeWidth={3} /> Export CSV
                </button>
                <button onClick={() => setSummary(null)} className="btn-primary flex-1">Close</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
