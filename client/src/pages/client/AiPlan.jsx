import React, { useState, useEffect } from 'react';
import MyWorkout from './MyWorkout';
import MyDiet from './MyDiet';
import { Dumbbell, Utensils, Sparkles, Loader2, CheckCircle2, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { aiPlansApi } from '../../services/aiPlansApi';
import toast from 'react-hot-toast';

export default function AiPlan() {
  const [activeTab, setActiveTab] = useState('workout');
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [loading, setLoading] = useState(true);
  const [aiRequest, setAiRequest] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    workout_days_per_week: 4,
    session_duration_minutes: 45,
    workout_location: 'GYM',
    equipment: [],
    physical_limitations: '',
    sleep_hours: 7,
    stress_level: 3,
    meals_per_day: 3,
    water_target_liters: 3,
    food_dislikes_allergies: '',
  });

  useEffect(() => {
    if (user?.is_profile_completed === false) {
      navigate('/client/setup', { replace: true });
      return;
    }
    fetchAiPlans();
  }, [user, navigate]);

  const fetchAiPlans = async () => {
    try {
      setLoading(true);
      const res = await aiPlansApi.getMyPlans();
      if (res.success && res.data && res.data.length > 0) {
        setAiRequest(res.data[0]); // latest request
      }
    } catch (error) {
      console.error("Error fetching AI plans:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEquipmentToggle = (item) => {
    setFormData(prev => {
      const equip = [...prev.equipment];
      if (equip.includes(item)) {
        return { ...prev, equipment: equip.filter(e => e !== item) };
      } else {
        return { ...prev, equipment: [...equip, item] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const toastId = toast.loading('Generating your AI Plan...');
      const res = await aiPlansApi.generatePlan(formData);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        fetchAiPlans();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate plan');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-80px)]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If latest plan is ASSIGNED, show the standard workout/diet tabs
  if (aiRequest && aiRequest.status === 'ASSIGNED') {
    return (
      <div className="flex flex-col min-h-[calc(100vh-80px)]">
        <div className="flex justify-center border-b border-border/50 bg-background/95 backdrop-blur sticky top-0 z-10 pt-4 pb-0">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('workout')}
              className={cn(
                "flex items-center pb-3 text-sm font-medium transition-colors border-b-2",
                activeTab === 'workout' 
                  ? "border-primary text-primary" 
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              <Dumbbell className="w-4 h-4 mr-2" />
              Workout Plan
            </button>
            <button
              onClick={() => setActiveTab('diet')}
              className={cn(
                "flex items-center pb-3 text-sm font-medium transition-colors border-b-2",
                activeTab === 'diet' 
                  ? "border-primary text-primary" 
                  : "border-transparent text-gray-400 hover:text-white"
              )}
            >
              <Utensils className="w-4 h-4 mr-2" />
              Diet Plan
            </button>
          </div>
        </div>

        <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-4 flex items-center justify-between bg-primary/10 border border-primary/20 p-4 rounded-xl">
            <div>
              <h3 className="text-primary font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5" /> AI Personalized Plan Active
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Week {aiRequest.week_number} • Assigned by {aiRequest.trainer_email || 'your trainer'}
              </p>
            </div>
          </div>
          {activeTab === 'workout' ? <MyWorkout /> : <MyDiet />}
        </div>
      </div>
    );
  }

  // If plan is pending/generating/reviewed but NOT assigned
  if (aiRequest && ['PENDING', 'GENERATING', 'GENERATED', 'TRAINER_REVIEWED'].includes(aiRequest.status)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="max-w-md w-full bg-card p-8 rounded-2xl border border-border text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Plan in Progress</h2>
          <p className="text-gray-400 mb-6">
            Your Week {aiRequest.week_number} AI Plan is currently 
            <span className="text-primary font-medium ml-1">
              {aiRequest.status === 'TRAINER_REVIEWED' ? 'awaiting final assignment' : 
               aiRequest.status === 'GENERATED' ? 'awaiting trainer review' : 'being generated'}
            </span>.
          </p>
          <div className="p-4 bg-background rounded-lg text-sm text-gray-400 text-left">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <span>AI Generation Complete</span>
            </div>
            <div className="flex items-center gap-2">
              {['TRAINER_REVIEWED'].includes(aiRequest.status) ? (
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
              )}
              <span className={['TRAINER_REVIEWED'].includes(aiRequest.status) ? 'text-gray-200' : ''}>
                Trainer Review
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show Questionnaire Form (if no plan, or generation failed)
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary mb-4">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Generate AI Plan</h1>
        <p className="text-gray-400">Fill out these details so our AI can craft your perfect personalized week.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {aiRequest && aiRequest.status === 'GENERATION_FAILED' && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
            <p className="font-bold">Previous generation failed:</p>
            <p className="text-sm mt-1">{aiRequest.error_message}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Workout Section */}
          <div className="space-y-4 bg-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Dumbbell className="w-5 h-5 text-primary" /> Workout Preferences
            </h3>
            
            <div>
              <label className="block text-sm text-gray-400 mb-2">Days per week (2-7)</label>
              <input 
                type="number" 
                name="workout_days_per_week" 
                min="2" max="7" 
                value={formData.workout_days_per_week}
                onChange={handleChange}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Session duration</label>
              <select 
                name="session_duration_minutes"
                value={formData.session_duration_minutes}
                onChange={handleChange}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              >
                <option value={30}>30 mins</option>
                <option value={45}>45 mins</option>
                <option value={60}>60 mins</option>
                <option value={90}>90 mins</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Location</label>
              <select 
                name="workout_location"
                value={formData.workout_location}
                onChange={handleChange}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              >
                <option value="GYM">Gym</option>
                <option value="HOME">Home</option>
                <option value="OUTDOOR">Outdoor</option>
              </select>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Available Equipment</label>
              <div className="flex flex-wrap gap-2">
                {['Dumbbells', 'Barbell', 'Kettlebell', 'Machines', 'Cables', 'Resistance Bands', 'None'].map(eq => (
                  <button
                    key={eq}
                    type="button"
                    onClick={() => handleEquipmentToggle(eq)}
                    className={cn(
                      "px-3 py-1.5 rounded-full text-xs font-medium transition-colors border",
                      formData.equipment.includes(eq) 
                        ? "bg-primary/20 border-primary text-primary" 
                        : "bg-background border-border text-gray-400 hover:border-gray-600"
                    )}
                  >
                    {eq}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Physical limitations/Injuries</label>
              <input 
                type="text" 
                name="physical_limitations" 
                value={formData.physical_limitations}
                onChange={handleChange}
                placeholder="e.g. Bad lower back, Knee pain..."
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Diet Section */}
          <div className="space-y-4 bg-card p-6 rounded-xl border border-border">
            <h3 className="text-lg font-semibold flex items-center gap-2 text-white">
              <Utensils className="w-5 h-5 text-primary" /> Lifestyle & Diet
            </h3>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Sleep (hours/night)</label>
              <input 
                type="number" 
                name="sleep_hours" 
                min="4" max="12" step="0.5"
                value={formData.sleep_hours}
                onChange={handleChange}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Stress Level (1-Low, 5-High)</label>
              <input 
                type="range" 
                name="stress_level" 
                min="1" max="5" 
                value={formData.stress_level}
                onChange={handleChange}
                className="w-full accent-primary"
              />
              <div className="text-right text-xs text-primary font-bold mt-1">{formData.stress_level}/5</div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Meals per day</label>
              <input 
                type="number" 
                name="meals_per_day" 
                min="2" max="6" 
                value={formData.meals_per_day}
                onChange={handleChange}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Water Target (Liters)</label>
              <input 
                type="number" 
                name="water_target_liters" 
                min="1" max="6" step="0.5"
                value={formData.water_target_liters}
                onChange={handleChange}
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Dislikes or Allergies</label>
              <input 
                type="text" 
                name="food_dislikes_allergies" 
                value={formData.food_dislikes_allergies}
                onChange={handleChange}
                placeholder="e.g. Peanuts, Mushrooms, Dairy..."
                className="w-full bg-background border border-border rounded-lg px-4 py-2 text-white focus:border-primary focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            type="submit"
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-background font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-5 h-5" /> Generate My Plan
          </button>
        </div>
      </form>
    </div>
  );
}
