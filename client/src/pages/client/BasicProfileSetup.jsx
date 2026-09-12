import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientApi } from '../../services/client/clientApi';
import { useClientStore } from '../../stores/clientStore';
import { useAuthStore } from '../../stores/authStore';

const BasicProfileSetup = () => {
  const navigate = useNavigate();
  const setProfile = useClientStore((state) => state.setProfile);
  const { user, setAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    first_name: user?.first_name && user.first_name !== 'Fitness' ? user.first_name : '',
    last_name: user?.last_name && user.last_name !== 'Enthusiast' ? user.last_name : '',
    phone: '',
    experience_level: 'BEGINNER',
    date_of_birth: '',
    gender: 'MALE',
    height_cm: '',
    weight_kg: '',
  });

  const updateForm = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const data = new FormData();
      
      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('phone', formData.phone);
      data.append('experience_level', formData.experience_level);
      data.append('date_of_birth', formData.date_of_birth);
      data.append('gender', formData.gender);
      data.append('height_cm', formData.height_cm);
      data.append('weight_kg', formData.weight_kg);
      
      // We explicitly pass is_profile_completed: false to indicate this is just the basic setup
      data.append('is_profile_completed', 'false');

      const response = await clientApi.createProfile(data);
      
      if (response.success) {
        toast.success('Basic profile saved!');
        setProfile(response.data);
        
        // Update user auth store with new first name, but is_profile_completed remains false
        setAuth({ 
          ...user, 
          first_name: formData.first_name,
          last_name: formData.last_name,
          is_profile_completed: false
        });
        
        navigate('/client/setup', { replace: true });
      } else {
        toast.error(response.message || 'Failed to save basic profile.');
      }
    } catch (error) {
      toast.error(error.response?.data?.errors?.detail || 'An error occurred during setup.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b120f] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      <div className="absolute top-8 w-full max-w-md px-4 flex justify-between items-center z-10">
        <div className="text-emerald-500 font-bold text-sm tracking-widest uppercase">FitNexa</div>
        <div className="text-gray-400 text-sm">Welcome</div>
      </div>

      <div className="w-full max-w-md z-10">
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center">
            <div className="w-16 h-1 bg-emerald-500 rounded-full mx-auto mb-6"></div>
            <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Let's get to know you</h1>
            <p className="text-gray-400 text-sm">Please provide some basic details to personalize your experience.</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-5 mt-8 bg-[#111c17] p-6 rounded-2xl border border-emerald-900/30">
            <div className="flex gap-4">
              <div className="w-1/2 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">First Name</label>
                <input
                  type="text"
                  required
                  value={formData.first_name}
                  onChange={(e) => updateForm('first_name', e.target.value)}
                  className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="John"
                />
              </div>
              <div className="w-1/2 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Last Name</label>
                <input
                  type="text"
                  required
                  value={formData.last_name}
                  onChange={(e) => updateForm('last_name', e.target.value)}
                  className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-1/2 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={formData.date_of_birth}
                  onChange={(e) => updateForm('date_of_birth', e.target.value)}
                  className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div className="w-1/2 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Gender</label>
                <select
                  required
                  value={formData.gender}
                  onChange={(e) => updateForm('gender', e.target.value)}
                  className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                  <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-1/2 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Phone Number</label>
                <input
                  type="tel"
                  required
                  pattern="^[1-9][0-9]{9}$"
                  title="Phone number must be exactly 10 digits and cannot start with 0"
                  value={formData.phone}
                  onChange={(e) => updateForm('phone', e.target.value)}
                  className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="+1 234 567 8900"
                />
              </div>
              <div className="w-1/2 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Experience Level</label>
                <select
                  required
                  value={formData.experience_level}
                  onChange={(e) => updateForm('experience_level', e.target.value)}
                  className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500"
                >
                  <option value="BEGINNER">Beginner</option>
                  <option value="INTERMEDIATE">Intermediate</option>
                  <option value="ADVANCED">Advanced</option>
                </select>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-1/2 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Weight (kg)</label>
                <input
                  type="number"
                  required
                  min="20"
                  max="500"
                  step="0.1"
                  value={formData.weight_kg}
                  onChange={(e) => updateForm('weight_kg', e.target.value)}
                  className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 75"
                />
              </div>
              <div className="w-1/2 space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Height (cm)</label>
                <input
                  type="number"
                  required
                  min="50"
                  max="300"
                  step="1"
                  value={formData.height_cm}
                  onChange={(e) => updateForm('height_cm', e.target.value)}
                  className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="e.g. 175"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !formData.first_name || !formData.date_of_birth || !formData.weight_kg || !formData.height_cm}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0b120f] font-bold py-4 rounded-xl transition-all flex justify-center items-center mt-6"
            >
              {isLoading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0b120f]"></span> : 'Continue'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BasicProfileSetup;
