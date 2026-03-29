import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import api from '../api/client';
import toast from 'react-hot-toast';
import { FiSave, FiSliders, FiVideo } from 'react-icons/fi';

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    fps_cap: 5,
    confidence_threshold: 0.6,
    auto_capture_delay_ms: 600,
    draw_bounding_boxes: true
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings/');
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to load settings:', err);
      toast.error('Failed to load settings from server.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : Number(value)
    }));
  };

  const handleSave = async () => {
    try {
      await api.put('/settings/', settings);
      toast.success('Settings saved to server successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      toast.error('Failed to update system settings.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f0f5]">
        <div className="w-12 h-12 border-4 border-black border-t-[#ebff00] rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      <Sidebar />
      <main className="ml-64 pt-[72px] p-8">
        {/* Header */}
        <div className="mb-10 animate-fade-in flex justify-between items-end">
          <div>
            <h1 className="brutal-title">System Settings</h1>
            <p className="brutal-subtitle mt-2">Configure FaceAttend preferences</p>
          </div>
          <button 
            onClick={handleSave} 
            className="btn-primary flex items-center gap-2"
          >
            <FiSave strokeWidth={3} /> Save Changes
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Recognition Settings */}
          <div className="neo-panel border-4 border-black p-8 bg-white">
             <div className="flex items-center gap-3 mb-6 border-b-4 border-black pb-4">
                <div className="w-12 h-12 bg-[#ebff00] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#000]">
                    <FiSliders className="text-2xl text-black" strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-black uppercase text-black">Recognition</h2>
             </div>

             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-2">Confidence Threshold ({settings.confidence_threshold})</label>
                  <input 
                    type="range" 
                    name="confidence_threshold" 
                    min="0.3" max="0.99" step="0.01" 
                    value={settings.confidence_threshold} 
                    onChange={handleChange}
                    className="w-full accent-black cursor-pointer"
                  />
                  <p className="text-xs font-bold text-gray-500 mt-2">Higher values reduce false positives but might miss faces.</p>
                </div>
             </div>
          </div>

          {/* Camera Settings */}
          <div className="neo-panel border-4 border-black p-8 bg-white">
             <div className="flex items-center gap-3 mb-6 border-b-4 border-black pb-4">
                <div className="w-12 h-12 bg-black border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_#d1d5db]">
                    <FiVideo className="text-2xl text-[#ebff00]" strokeWidth={3} />
                </div>
                <h2 className="text-2xl font-black uppercase text-black">Camera Stream</h2>
             </div>

             <div className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-2">Max FPS Cap</label>
                  <input 
                    type="number" 
                    name="fps_cap" 
                    min="1" max="30" 
                    value={settings.fps_cap} 
                    onChange={handleChange}
                    className="input-field border-2 border-black font-bold focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none"
                  />
                  <p className="text-xs font-bold text-gray-500 mt-2">Maximum frames sent to the server per second. (Default: 5)</p>
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 uppercase tracking-widest mb-2">Auto-Capture Burst Delay (ms)</label>
                   <input 
                    type="number" 
                    name="auto_capture_delay_ms" 
                    min="100" max="2000" step="100"
                    value={settings.auto_capture_delay_ms} 
                    onChange={handleChange}
                    className="input-field border-2 border-black font-bold focus:shadow-[4px_4px_0px_#000] focus:-translate-y-1 transition-all rounded-none"
                  />
                </div>

                <div className="flex items-center gap-4 mt-8 pt-4 border-t-2 border-gray-200">
                    <input 
                        type="checkbox" 
                        name="draw_bounding_boxes" 
                        id="draw_bounding_boxes"
                        checked={settings.draw_bounding_boxes} 
                        onChange={handleChange}
                        className="w-6 h-6 border-2 border-black rounded-none cursor-pointer accent-[#ebff00]"
                    />
                    <label htmlFor="drawBoundingBoxes" className="text-sm font-black text-black uppercase tracking-widest cursor-pointer">
                        Draw Video Bounding Boxes
                    </label>
                </div>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
