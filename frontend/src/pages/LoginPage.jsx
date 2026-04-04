import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { FiShield, FiMail, FiLock, FiArrowRight } from 'react-icons/fi';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(email, password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'admin' ? '/dashboard' : '/student-view');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f0f0f5] flex items-center justify-center p-4">
      
      <div className="w-full max-w-md animate-fade-in">
        {/* Title area */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 border-4 border-black bg-[#ebff00] mb-6 shadow-[4px_4px_0px_#000] -rotate-3 hover:rotate-0 transition-transform">
            <FiShield className="text-black text-3xl" strokeWidth={3} />
          </div>
          <h1 className="brutal-title text-5xl">FACE<span className="text-white text-shadow-brutal bg-black px-2 ml-1">ATTEND</span></h1>
          <p className="brutal-subtitle mt-4 text-sm">Security & Access Protocol</p>
        </div>

        {/* Brutalist Login Card */}
        <div className="neo-panel border-4 border-black p-8 bg-white relative">
          
          <div className="absolute -top-4 -right-4 px-3 py-1 bg-[#ebff00] border-2 border-black font-black uppercase text-xs tracking-widest shadow-[2px_2px_0px_#000] rotate-6">
            Authorized Only
          </div>

          <h2 className="text-2xl font-black text-black uppercase tracking-wide mb-8 border-b-4 border-black pb-4">
            System Login
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-2">Operator Email</label>
              <div className="relative">
                <FiMail className="absolute left-4 top-1/2 -translate-y-1/2 text-black" strokeWidth={3} />
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-12 border-2 border-black focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none font-bold"
                  placeholder="admin@college.edu"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-2">Access Code</label>
              <div className="relative">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-black" strokeWidth={3} />
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-12 border-2 border-black focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none font-bold"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-4 flex items-center justify-center gap-3 py-4 text-lg"
            >
              {loading ? (
                <div className="w-5 h-5 border-4 border-black border-t-transparent animate-spin" />
              ) : (
                <>
                  Authenticate <FiArrowRight strokeWidth={3} />
                </>
              )}
            </button>
          </form>

          {/* Test credentials banner */}
          <div className="mt-8 pt-6 border-t-4 border-black">
            <div className="bg-gray-100 border-2 border-black p-4 shadow-[3px_3px_0px_#000]">
              <p className="text-xs font-black uppercase tracking-widest text-black mb-2">Demo Override Codes</p>
              <p className="text-sm font-bold text-gray-700">
                <span className="bg-[#ebff00] px-1 text-black border border-black mr-2">ADM</span> 
                admin@college.edu / admin123
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
