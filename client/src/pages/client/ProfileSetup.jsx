import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientApi } from '../../services/client/clientApi';
import { useClientStore } from '../../stores/clientStore';
import { useAuthStore } from '../../stores/authStore';
import { Check } from 'lucide-react';

const ProfileSetup = () => {
  const navigate = useNavigate();
  const setProfile = useClientStore((state) => state.setProfile);
  const { user, setAuth } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    preferred_workout: '',
    fitness_goal: '',
    target_weight_kg: '',
    diet_preference: 'NONE',
    medical_condition: '',
    profile_image: null,
  });

  const [imageError, setImageError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        setImageError('Only .jpg, .jpeg, .png, and .webp allowed. PDF not supported.');
        e.target.value = '';
        updateForm('profile_image', null);
      } else {
        setImageError('');
        updateForm('profile_image', file);
      }
    }
  };

  const updateForm = (key, value) => setFormData(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const data = new FormData();
      
      if (formData.preferred_workout) data.append('preferred_workout', formData.preferred_workout);
      if (formData.fitness_goal) data.append('fitness_goal', formData.fitness_goal);
      if (formData.target_weight_kg) data.append('target_weight_kg', formData.target_weight_kg);
      if (formData.diet_preference) data.append('diet_preference', formData.diet_preference);
      if (formData.medical_condition) data.append('medical_condition', formData.medical_condition);
      if (formData.profile_image) data.append('profile_image', formData.profile_image);
      
      // Explicitly pass is_profile_completed: true to finalize setup
      data.append('is_profile_completed', 'true');

      // We update the existing basic profile
      const response = await clientApi.updateProfile(data);
      
      if (response.success) {
        toast.success('Onboarding complete!');
        setProfile(response.data);
        setAuth({ ...user, is_profile_completed: true });
        navigate('/client/dashboard', { replace: true });
      } else {
        toast.error(response.message || 'Failed to complete setup.');
      }
    } catch (error) {
      toast.error('An error occurred during setup.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => setStep(s => s + 1);

  return (
    <div className="min-h-screen bg-[#0b120f] flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Step Indicator */}
      <div className="absolute top-8 w-full max-w-md px-4 flex justify-between items-center z-10">
        <div className="text-emerald-500 font-bold text-sm tracking-widest uppercase">FitNexa</div>
        <div className="text-gray-400 text-sm">{step} / 3</div>
      </div>

      <div className="w-full max-w-md z-10">
        {step === 1 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <div className="w-16 h-1 bg-emerald-500 rounded-full mx-auto mb-6"></div>
              <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">What kind of workouts do you prefer most?</h1>
              <p className="text-gray-400 text-sm">Discover and customize the fitness journey that fits your style.</p>
            </div>
            
            <div className="space-y-3 mt-8">
              {[
                { label: 'Cardio', value: 'CARDIO' },
                { label: 'Strength Training', value: 'STRENGTH_TRAINING' },
                { label: 'Yoga', value: 'YOGA' },
                { label: 'HIIT', value: 'HIIT' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateForm('preferred_workout', opt.value)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    formData.preferred_workout === opt.value
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-[#111c17] border-emerald-900/30 text-gray-300 hover:border-emerald-500/50'
                  }`}
                >
                  <span className="font-semibold">{opt.label}</span>
                  {formData.preferred_workout === opt.value && <Check className="w-5 h-5 text-emerald-500" />}
                </button>
              ))}
            </div>

            <button
              onClick={nextStep}
              disabled={!formData.preferred_workout}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#0b120f] font-bold py-4 rounded-xl transition-all mt-8"
            >
              Next Step
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <div className="w-16 h-1 bg-emerald-500 rounded-full mx-auto mb-6"></div>
              <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">What is your main motive for choosing wellness?</h1>
              <p className="text-gray-400 text-sm">Let us know what drives you to stay healthy and active.</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mt-8">
              {[
                { label: 'Weight Loss', value: 'LOSE_WEIGHT' },
                { label: 'Muscle Gain', value: 'BUILD_MUSCLE' },
                { label: 'Endurance', value: 'IMPROVE_ENDURANCE' },
                { label: 'Flexibility', value: 'INCREASE_FLEXIBILITY' },
                { label: 'General Health', value: 'GENERAL_HEALTH' },
                { label: 'Maintain Fitness', value: 'MAINTAIN_FITNESS' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => updateForm('fitness_goal', opt.value)}
                  className={`w-full p-4 rounded-xl border text-center transition-all ${
                    formData.fitness_goal === opt.value
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                      : 'bg-[#111c17] border-emerald-900/30 text-gray-300 hover:border-emerald-500/50'
                  }`}
                >
                  <span className="font-semibold text-sm">{opt.label}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(1)}
                className="w-1/3 bg-[#111c17] text-white font-bold py-4 rounded-xl border border-emerald-900/30 hover:bg-emerald-900/20"
              >
                Back
              </button>
              <button
                onClick={nextStep}
                disabled={!formData.fitness_goal}
                className="w-2/3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-[#0b120f] font-bold py-4 rounded-xl transition-all"
              >
                Next Step
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center">
              <div className="w-16 h-1 bg-emerald-500 rounded-full mx-auto mb-6"></div>
              <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Final touches</h1>
              <p className="text-gray-400 text-sm">Add a few more details to complete your profile.</p>
            </div>

            <div className="space-y-5 mt-8 bg-[#111c17] p-6 rounded-2xl border border-emerald-900/30">
              <div className="flex gap-4">
                <div className="w-1/2 space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Target Weight (kg)</label>
                  <input
                    type="number"
                    min="20"
                    max="500"
                    step="0.1"
                    value={formData.target_weight_kg}
                    onChange={(e) => updateForm('target_weight_kg', e.target.value)}
                    className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 65"
                  />
                </div>
                <div className="w-1/2 space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Dietary Preference</label>
                  <select
                    value={formData.diet_preference}
                    onChange={(e) => updateForm('diet_preference', e.target.value)}
                    className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-3 text-gray-300 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="NONE">No Preference</option>
                    <option value="VEGETARIAN">Vegetarian</option>
                    <option value="VEGAN">Vegan</option>
                    <option value="KETO">Keto</option>
                    <option value="PALEO">Paleo</option>
                    <option value="GLUTEN_FREE">Gluten-Free</option>
                    <option value="DAIRY_FREE">Dairy-Free</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Medical Conditions / Injuries (Optional)</label>
                <textarea
                  value={formData.medical_condition}
                  onChange={(e) => updateForm('medical_condition', e.target.value)}
                  className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500"
                  placeholder="Any conditions or injuries we should know about"
                  rows="2"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Profile Image (Optional)</label>
                <input
                  type="file"
                  accept="image/jpeg, image/png, image/webp"
                  onChange={handleImageChange}
                  className="w-full bg-[#0b120f] border border-emerald-900/30 rounded-xl px-4 py-2 text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-emerald-500/10 file:text-emerald-500 hover:file:bg-emerald-500/20 cursor-pointer"
                />
                {imageError ? (
                  <p className="text-xs text-red-500 mt-1">{imageError}</p>
                ) : (
                  <p className="text-xs text-gray-500 mt-1">Only .jpg, .jpeg, .png, and .webp allowed. PDF not supported.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setStep(2)}
                className="w-1/3 bg-[#111c17] text-white font-bold py-4 rounded-xl border border-emerald-900/30 hover:bg-emerald-900/20"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-2/3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-[#0b120f] font-bold py-4 rounded-xl transition-all flex justify-center items-center"
              >
                {isLoading ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#0b120f]"></span> : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSetup;
