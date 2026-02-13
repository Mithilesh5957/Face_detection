import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiCamera, FiCheck, FiX, FiUser } from 'react-icons/fi';

const CAPTURE_ANGLES = ['Front', 'Left', 'Right', 'Look Up'];

export default function StudentManagementPage() {
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', college_roll_number: '', full_name: '', branch: '', semester: '' });
  const [capturing, setCapturing] = useState(null); // student_id
  const [capturedImages, setCapturedImages] = useState([]);
  const [currentAngle, setCurrentAngle] = useState(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => { loadStudents(); }, []);

  const loadStudents = async () => {
    try {
      const res = await api.get('/students/');
      setStudents(res.data);
    } catch (err) { toast.error('Failed to load students'); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/students/', { ...form, semester: parseInt(form.semester) });
      toast.success('Student registered!');
      setForm({ name: '', email: '', password: '', college_roll_number: '', full_name: '', branch: '', semester: '' });
      setShowForm(false);
      loadStudents();
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create student'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this student?')) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success('Student deleted');
      loadStudents();
    } catch (err) { toast.error('Failed to delete'); }
  };

  // ── Face Capture ──────────────────────────────────────────────────
  const startCapture = async (studentId) => {
    setCapturing(studentId);
    setCapturedImages([]);
    setCurrentAngle(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      toast.error('Camera access denied');
      setCapturing(null);
    }
  };

  const captureFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const b64 = dataUrl.split(',')[1];

    setCapturedImages((prev) => [...prev, b64]);
    const nextAngle = currentAngle + 1;
    if (nextAngle >= CAPTURE_ANGLES.length) {
      toast.success('All angles captured!');
    }
    setCurrentAngle(nextAngle);
  }, [currentAngle]);

  const submitFaces = async () => {
    if (capturedImages.length === 0) { toast.error('No images captured'); return; }
    try {
      await api.post(`/students/${capturing}/face`, { images: capturedImages });
      toast.success('Face registered successfully!');
      stopCapture();
      loadStudents();
    } catch (err) { toast.error(err.response?.data?.detail || 'Face registration failed'); }
  };

  const stopCapture = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCapturing(null);
    setCapturedImages([]);
    setCurrentAngle(0);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <Sidebar />
      <main className="ml-64 pt-16 p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="text-3xl font-bold text-white">Student Management</h1>
            <p className="text-gray-400 mt-1">Register students and capture face data</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <FiPlus /> Add Student
          </button>
        </div>

        {/* Registration Form */}
        {showForm && (
          <div className="glass-card p-6 mb-8 animate-slide-up">
            <h2 className="text-xl font-semibold text-white mb-4">Register New Student</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="input-field" placeholder="Display Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className="input-field" placeholder="Full Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              <input className="input-field" placeholder="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              <input className="input-field" placeholder="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
              <input className="input-field" placeholder="Roll Number" value={form.college_roll_number} onChange={(e) => setForm({ ...form, college_roll_number: e.target.value })} required />
              <input className="input-field" placeholder="Branch" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} required />
              <input className="input-field" placeholder="Semester" type="number" min="1" max="8" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required />
              <div className="flex items-end gap-3">
                <button type="submit" className="btn-primary">Register</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Face Capture Modal */}
        {capturing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="glass-card p-6 w-full max-w-2xl animate-slide-up">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-white">Face Capture</h2>
                <button onClick={stopCapture} className="p-2 rounded-lg hover:bg-white/10 text-gray-400"><FiX /></button>
              </div>

              {/* Progress Steps */}
              <div className="flex gap-2 mb-4">
                {CAPTURE_ANGLES.map((angle, i) => (
                  <div key={angle} className={`flex-1 h-2 rounded-full ${i < capturedImages.length ? 'bg-emerald-500' : i === currentAngle ? 'bg-primary-500 animate-pulse' : 'bg-white/10'}`} />
                ))}
              </div>
              <p className="text-sm text-gray-400 mb-4 text-center">
                {currentAngle < CAPTURE_ANGLES.length
                  ? <>Look <span className="text-primary-400 font-semibold">{CAPTURE_ANGLES[currentAngle]}</span> and click capture</>
                  : <span className="text-emerald-400">All angles captured! Click "Save" to register.</span>}
              </p>

              {/* Camera View */}
              <div className="camera-feed mb-4">
                <video ref={videoRef} autoPlay playsInline className="w-full rounded-xl" />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex gap-3 justify-center">
                {currentAngle < CAPTURE_ANGLES.length && (
                  <button onClick={captureFrame} className="btn-primary flex items-center gap-2">
                    <FiCamera /> Capture {CAPTURE_ANGLES[currentAngle]}
                  </button>
                )}
                {capturedImages.length > 0 && (
                  <button onClick={submitFaces} className="btn-success flex items-center gap-2">
                    <FiCheck /> Save Face Data ({capturedImages.length} images)
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Student Table */}
        <div className="glass-card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/10">
                <th className="p-4 text-sm text-gray-400 font-medium">Student</th>
                <th className="p-4 text-sm text-gray-400 font-medium">Roll No</th>
                <th className="p-4 text-sm text-gray-400 font-medium">Branch</th>
                <th className="p-4 text-sm text-gray-400 font-medium">Sem</th>
                <th className="p-4 text-sm text-gray-400 font-medium">Face</th>
                <th className="p-4 text-sm text-gray-400 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No students registered yet</td></tr>
              ) : students.map((s) => (
                <tr key={s.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-500/20 flex items-center justify-center">
                        <FiUser className="text-primary-400" />
                      </div>
                      <span className="text-white font-medium">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-300">{s.college_roll_number}</td>
                  <td className="p-4 text-gray-300">{s.branch}</td>
                  <td className="p-4 text-gray-300">{s.semester}</td>
                  <td className="p-4">
                    {s.has_face ? (
                      <span className="badge-present">✓ Registered</span>
                    ) : (
                      <button onClick={() => startCapture(s.id)} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1">
                        <FiCamera className="text-xs" /> Capture
                      </button>
                    )}
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(s.id)} className="btn-danger text-sm py-1.5 px-3 flex items-center gap-1">
                      <FiTrash2 className="text-xs" /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
