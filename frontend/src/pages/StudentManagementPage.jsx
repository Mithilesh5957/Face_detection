import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiCamera, FiCheck, FiX, FiUser, FiSearch, FiFilter } from 'react-icons/fi';
import CameraFeed from '../components/CameraFeed';

export default function StudentManagementPage() {
  const [students, setStudents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', college_roll_number: '', full_name: '', branch: '', semester: '' });
  const [capturing, setCapturing] = useState(null); // student_id
  const [capturedImages, setCapturedImages] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const cameraRef = useRef(null);
  const canvasRef = useRef(null);

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

  // ── Auto Face Capture ──────────────────────────────────────────────────
  const startCapture = (studentId) => {
    setCapturing(studentId);
    setCapturedImages([]);
    setIsScanning(false);
  };

  const runAutoScan = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setCapturedImages([]);
    toast.success('Scanning started. Please look at the camera...', { duration: 2000 });
    
    let images = [];
    for (let i = 0; i < 4; i++) {
      await new Promise(r => setTimeout(r, 600)); // wait 600ms between captures
      const b64 = captureSingleFrame();
      if (b64) {
        images.push(b64);
        setCapturedImages([...images]); // Update UI progress
      }
    }
    
    setIsScanning(false);
    toast.success('Scan complete! Saving face data...', { duration: 2000 });
    submitFaces(images);
  };

  const captureSingleFrame = () => {
    if (!cameraRef.current || !canvasRef.current) return null;
    const video = cameraRef.current.getVideoElement();
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return null;

    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return dataUrl.split(',')[1];
  };

  const submitFaces = async (imagesToSubmit) => {
    if (!imagesToSubmit || imagesToSubmit.length === 0) return;
    try {
      await api.post(`/students/${capturing}/face`, { images: imagesToSubmit });
      toast.success('Face registered successfully!');
      stopCapture();
      loadStudents();
    } catch (err) { toast.error(err.response?.data?.detail || 'Face registration failed'); }
  };

  const stopCapture = () => {
    setCapturing(null);
    setCapturedImages([]);
    setIsScanning(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <Sidebar />
      <main className="ml-64 pt-[72px] p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 animate-fade-in">
          <div>
            <h1 className="brutal-title">Student Management</h1>
            <p className="brutal-subtitle mt-2">Register students and capture face data</p>
          </div>
          <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
            <FiPlus strokeWidth={3} /> Add Student
          </button>
        </div>

        {/* Registration Form */}
        {showForm && (
          <div className="neo-panel border-4 border-black p-8 mb-10 animate-slide-up">
            <h2 className="brutal-subtitle mb-6 text-black">Register New Student</h2>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/60 backdrop-blur-md">
            <div className="brutal-card bg-[#f0f0f5] p-8 w-full max-w-2xl animate-slide-up">
              <div className="flex items-center justify-between mb-6">
                <h2 className="brutal-subtitle text-black">Face Capture</h2>
                <button onClick={stopCapture} className="p-2 border-2 border-black bg-white hover:-translate-y-1 shadow-[2px_2px_0px_#000] active:translate-y-px active:shadow-none transition-all"><FiX className="text-black font-black" strokeWidth={3} /></button>
              </div>

              {/* Progress Steps */}
              <div className="flex gap-3 mb-6">
                {[0, 1, 2, 3].map((step, i) => (
                  <div key={step} className={`flex-1 h-3 rounded-none border-2 border-black transition-all duration-300 ${i < capturedImages.length ? 'bg-[#ebff00] shadow-[2px_2px_0px_#000]' : isScanning && i === capturedImages.length ? 'bg-black animate-pulse shadow-[2px_2px_0px_#d1d5db]' : 'bg-white'}`} />
                ))}
              </div>
              <div className="text-center mb-6 min-h-[24px]">
                {capturedImages.length === 4 ? (
                  <span className="text-black font-black uppercase tracking-widest px-3 py-1 bg-[#ebff00] border-2 border-black shadow-[2px_2px_0px_#000]">Scan Complete! Registering...</span>
                ) : isScanning ? (
                  <span className="text-black font-black uppercase tracking-widest animate-pulse">Scanning... Slowly turn your head ({capturedImages.length}/4)</span>
                ) : (
                  <span className="text-gray-600 font-bold uppercase tracking-wider text-sm">Position your face in the center to begin scanning.</span>
                )}
              </div>

              {/* Camera View */}
              <div className="camera-feed mb-4 h-64 md:h-80 w-full relative">
                <CameraFeed 
                  ref={cameraRef} 
                  isActive={true} 
                  onStreamError={() => setCapturing(null)} 
                />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="flex justify-center mt-4">
                {!isScanning && capturedImages.length < 4 && (
                  <button onClick={runAutoScan} className="btn-primary flex items-center gap-2 group relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <FiCamera className="relative z-10" /> 
                    <span className="relative z-10">Start Auto-Scan</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-black text-lg" strokeWidth={3} />
            <input 
              type="text" 
              placeholder="Search by name or roll number..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-field !pl-12 !py-3 border-4 border-black font-bold focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none"
            />
          </div>
          <div className="flex items-center gap-2 bg-white border-4 border-black px-4 shadow-[4px_4px_0px_#d1d5db]">
            <FiFilter className="text-black" strokeWidth={3} />
            <select 
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="bg-transparent border-none outline-none font-bold text-black uppercase tracking-widest cursor-pointer py-3"
            >
              <option value="">ALL BRANCHES</option>
              {Array.from(new Set(students.map(s => s.branch))).filter(Boolean).map(branch => (
                <option key={branch} value={branch}>{branch}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Student Table */}
        <div className="neo-panel border-4 border-black overflow-hidden bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-4 border-black bg-[#f0f0f5]">
                <th className="p-5 text-sm font-black text-black uppercase tracking-widest">Student</th>
                <th className="p-5 text-sm font-black text-black uppercase tracking-widest">Roll No</th>
                <th className="p-5 text-sm font-black text-black uppercase tracking-widest">Branch</th>
                <th className="p-5 text-sm font-black text-black uppercase tracking-widest">Sem</th>
                <th className="p-5 text-sm font-black text-black uppercase tracking-widest">Face</th>
                <th className="p-5 text-sm font-black text-black uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.filter(s => {
                const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                      s.college_roll_number.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesBranch = branchFilter ? s.branch === branchFilter : true;
                return matchesSearch && matchesBranch;
              }).length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest">No students found</td></tr>
              ) : students.filter(s => {
                const matchesSearch = s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                      s.college_roll_number.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesBranch = branchFilter ? s.branch === branchFilter : true;
                return matchesSearch && matchesBranch;
              }).map((s) => (
                <tr key={s.id} className="border-b-2 border-gray-200 hover:bg-[#ebff00]/10 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_#000]">
                        <FiUser className="text-black text-lg" />
                      </div>
                      <span className="text-black font-black uppercase text-sm tracking-wide">{s.full_name}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-700 font-bold">{s.college_roll_number}</td>
                  <td className="p-4 text-gray-700 font-bold uppercase">{s.branch}</td>
                  <td className="p-4 text-gray-700 font-bold">{s.semester}</td>
                  <td className="p-4">
                    {s.has_face ? (
                      <span className="badge-present">✓ Registered</span>
                    ) : (
                      <button onClick={() => startCapture(s.id)} className="btn-secondary text-xs py-2 px-3 flex items-center gap-2">
                        <FiCamera className="text-sm" /> Capture
                      </button>
                    )}
                  </td>
                  <td className="p-4">
                    <button onClick={() => handleDelete(s.id)} className="btn-danger text-xs py-2 px-3 flex items-center gap-2">
                      <FiTrash2 className="text-sm" /> Delete
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
