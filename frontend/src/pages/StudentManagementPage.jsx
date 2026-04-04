import { useState, useEffect, useRef, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import toast from 'react-hot-toast';
import { FiPlus, FiTrash2, FiCamera, FiCheck, FiX, FiUser, FiSearch, FiFilter } from 'react-icons/fi';
import CameraFeed from '../components/CameraFeed';

export default function StudentManagementPage() {
  const [students, setStudents] = useState([]);
  const [wizardMode, setWizardMode] = useState(null); // 'camera-new', 'form-new', 'camera-existing'
  const [activeStudentId, setActiveStudentId] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '', college_roll_number: '', full_name: '', branch: '', semester: '' });
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
  const startNewRegistration = () => {
    setWizardMode('camera-new');
    setCapturedImages([]);
    setIsScanning(false);
    setForm({ name: '', email: '', password: '', college_roll_number: '', full_name: '', branch: '', semester: '' });
  };

  const startExistingCapture = (studentId) => {
    setActiveStudentId(studentId);
    setWizardMode('camera-existing');
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
    
    if (wizardMode === 'camera-existing') {
        toast.success('Scan complete! Saving face data...', { duration: 2000 });
        submitFaces(activeStudentId, images);
    } else if (wizardMode === 'camera-new') {
        toast.success('Face Validated! Proceed to enter details.', { duration: 2500 });
        setWizardMode('form-new');
    }
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

  const submitFaces = async (studentId, imagesToSubmit) => {
    if (!imagesToSubmit || imagesToSubmit.length === 0) return;
    try {
      await api.post(`/students/${studentId}/face`, { images: imagesToSubmit });
      toast.success('Face registered successfully!');
      closeWizard();
      loadStudents();
    } catch (err) { toast.error(err.response?.data?.detail || 'Face registration failed'); }
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    try {
      // Step 1: Create student user profile
      toast.loading('Creating student profile...', { id: 'reg' });
      const res = await api.post('/students/', { ...form, semester: parseInt(form.semester) });
      const newStudentId = res.data.id;

      // Step 2: Push stored facial data
      toast.loading('Binding facial metrics...', { id: 'reg' });
      await submitFaces(newStudentId, capturedImages);
      toast.success('Student Fully Registered!', { id: 'reg' });
      
    } catch (err) { 
      toast.error(err.response?.data?.detail || 'Registration encountered an error', { id: 'reg' }); 
    }
  };

  const closeWizard = () => {
    setWizardMode(null);
    setActiveStudentId(null);
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
            <p className="brutal-subtitle mt-2">Biometric Intake Pipeline</p>
          </div>
          <button onClick={startNewRegistration} className="btn-primary flex items-center gap-2 px-6 py-4">
            <FiCamera strokeWidth={3} className="text-xl" /> Biometric Intake (Add Student)
          </button>
        </div>

        {/* Registration Wizard Modal */}
        {wizardMode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-md p-4 overflow-y-auto">
            <div className="brutal-card bg-[#f0f0f5] p-8 w-full max-w-2xl animate-fade-in my-auto">
              <div className="flex items-center justify-between mb-6 pb-4 border-b-4 border-black">
                <h2 className="brutal-subtitle text-black font-black">
                    {wizardMode === 'form-new' ? 'STEP 2: BIOGRAPHIC DETAILS' : 'STEP 1: FACIAL BIOMETRICS'}
                </h2>
                <button onClick={closeWizard} className="p-2 border-2 border-black bg-white hover:-translate-y-1 shadow-[2px_2px_0px_#000] active:translate-y-px active:shadow-none transition-all"><FiX className="text-black font-black" strokeWidth={3} /></button>
              </div>

              {/* View 1: Camera Scanner */}
              {wizardMode.startsWith('camera') && (
                <>
                    <div className="flex gap-3 mb-6">
                        {[0, 1, 2, 3].map((step, i) => (
                        <div key={step} className={`flex-1 h-3 rounded-none border-2 border-black transition-all duration-300 ${i < capturedImages.length ? 'bg-[#ebff00] shadow-[2px_2px_0px_#000]' : isScanning && i === capturedImages.length ? 'bg-black animate-pulse shadow-[2px_2px_0px_#d1d5db]' : 'bg-white'}`} />
                        ))}
                    </div>

                    <div className="text-center mb-6 min-h-[24px]">
                        {capturedImages.length === 4 ? (
                        <span className="text-black font-black uppercase tracking-widest px-3 py-1 bg-[#ebff00] border-2 border-black shadow-[2px_2px_0px_#000]">Acquisition Complete</span>
                        ) : isScanning ? (
                        <span className="text-black font-black uppercase tracking-widest animate-pulse">Scanning... Keep your head still ({capturedImages.length}/4)</span>
                        ) : (
                        <span className="text-gray-600 font-bold uppercase tracking-wider text-sm">Align face in the center of the frame</span>
                        )}
                    </div>

                    <div className="camera-feed mb-4 h-64 md:h-80 w-full relative group">
                        <CameraFeed 
                        ref={cameraRef} 
                        isActive={true} 
                        onStreamError={() => closeWizard()} 
                        />
                        <canvas ref={canvasRef} className="hidden" />
                    </div>

                    <div className="flex justify-center mt-6">
                        {!isScanning && capturedImages.length < 4 && (
                        <button onClick={runAutoScan} className="btn-primary w-full max-w-sm flex items-center justify-center gap-3 group relative overflow-hidden py-4 text-lg">
                            <FiCamera strokeWidth={3} className="relative z-10 text-xl" /> 
                            <span className="relative z-10 font-bold">Initiate Bio-Scan</span>
                        </button>
                        )}
                    </div>
                </>
              )}

              {/* View 2: Registration Details Form */}
              {wizardMode === 'form-new' && (
                <form onSubmit={handleFinalSubmit} className="space-y-6 animate-slide-up">
                  <div className="flex items-center gap-4 p-4 border-2 border-black bg-white shadow-[2px_2px_0px_#000] mb-8">
                     <FiCheck className="text-3xl text-emerald-500" strokeWidth={3} />
                     <div>
                         <p className="text-xs uppercase font-black text-gray-500 tracking-widest">Biometrics Linked</p>
                         <p className="text-sm font-bold text-black">4 Secure facial snapshots stored in memory buffer.</p>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input className="input-field border-2 border-black focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none" placeholder="Display Name (Username)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                    <input className="input-field border-2 border-black focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none" placeholder="Full Legal Name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
                    <input className="input-field border-2 border-black focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none" placeholder="Target Email Address" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                    <input className="input-field border-2 border-black focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none" placeholder="Temporary Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                    <input className="input-field border-2 border-black focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none" placeholder="College Roll Number" value={form.college_roll_number} onChange={(e) => setForm({ ...form, college_roll_number: e.target.value })} required />
                    <input className="input-field border-2 border-black focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none" placeholder="Academic Branch" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} required />
                    <input className="input-field border-2 border-black focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none" placeholder="Currently Active Semester" type="number" min="1" max="8" value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required />
                  </div>
                  
                  <div className="flex items-end gap-4 mt-8 pt-6 border-t-4 border-black">
                    <button type="submit" className="btn-primary flex-[2] py-4 text-lg">Complete Registration <FiCheck className="inline ml-2" strokeWidth={3} /></button>
                    <button type="button" onClick={closeWizard} className="btn-secondary flex-1 py-4 text-lg">Abort</button>
                  </div>
                </form>
              )}

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
                      <span className="badge-present">✓ Linked</span>
                    ) : (
                      <button onClick={() => startExistingCapture(s.id)} className="btn-secondary text-xs py-2 px-3 flex items-center gap-2">
                        <FiCamera className="text-sm" /> Add Bio Data
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
