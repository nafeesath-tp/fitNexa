import React, { useState, useEffect } from 'react';
import MyWorkout from './MyWorkout';
import MyDiet from './MyDiet';
import { Dumbbell, Utensils, Sparkles, Loader2, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
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
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiRequest, setAiRequest] = useState(null);
  
  // Week 2 State
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [daysPassed, setDaysPassed] = useState(0);

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

  // Inline banner error (e.g. no trainer assigned)
  const [bannerError, setBannerError] = useState(null);

  useEffect(() => {
    if (user?.is_profile_completed === false) {
      navigate('/client/setup', { replace: true });
      return;
    }
    fetchAiPlans();
  }, [user, navigate]);

  // Background polling for AI Plan generation status
  useEffect(() => {
    if (!aiRequest || !['PENDING', 'GENERATING'].includes(aiRequest.status)) {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const res = await aiPlansApi.getMyPlans();
        if (res.success && res.data && res.data.length > 0) {
          const latest = res.data[0];
          setAiRequest(latest);

          if (latest.status === 'GENERATED') {
            toast.success("Your plans are generated and waiting for trainer review.");
          } else if (latest.status === 'GENERATION_FAILED') {
            toast.error(latest.error_message || "AI Plan generation failed.");
          }
        }
      } catch (err) {
        console.error("Polling error fetching AI plan status:", err);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [aiRequest?.status]);

  const fetchAiPlans = async () => {
    try {
      setLoading(true);
      const res = await aiPlansApi.getMyPlans();
      if (res.success && res.data && res.data.length > 0) {
        const latest = res.data[0];
        setAiRequest(latest);
        
        if (latest.status === 'ASSIGNED') {
          // Calculate days passed since assignment
          const assignedDate = new Date(latest.updated_at);
          const now = new Date();
          const diffTime = Math.abs(now - assignedDate);
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
          setDaysPassed(diffDays);
        }
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
    setBannerError(null);
    if (isGenerating || (aiRequest && ['PENDING', 'GENERATING'].includes(aiRequest.status))) {
      toast.error("An AI plan generation is already in progress.");
      return;
    }
    try {
      setIsGenerating(true);
      const res = await aiPlansApi.generatePlan(formData);
      if (res.success) {
        toast.success(res.message || "Your weekly workout and diet plans are being generated.");
        await fetchAiPlans();
      }
    } catch (error) {
      const detail = error.response?.data?.detail;
      const errorCode = error.response?.data?.error_code;
      if (errorCode === 'NO_TRAINER_ASSIGNED') {
        // Show as prominent inline banner, not just a toast
        setBannerError(detail);
      } else {
        toast.error(detail || 'Failed to submit plan generation request');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (isGenerating || (aiRequest && ['PENDING', 'GENERATING'].includes(aiRequest.status))) {
      toast.error("An AI plan generation is already in progress.");
      return;
    }
    try {
      setIsGenerating(true);
      const res = await aiPlansApi.generatePlan({ feedback });
      if (res.success) {
        toast.success(res.message || "Your adaptive plan is being generated in the background.");
        setShowFeedbackModal(false);
        await fetchAiPlans();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit plan generation request');
    } finally {
      setIsGenerating(false);
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
                <Sparkles className="w-5 h-5" /> AI Plan Approved & Active
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                Week {aiRequest.week_number} • Assigned by {aiRequest.trainer_email || 'your trainer'}
              </p>
            </div>
          </div>
          {activeTab === 'workout' ? <MyWorkout /> : <MyDiet />}
          
          {/* Week 2 Generation Eligibility */}
          <div className="mt-8 border-t border-border/50 pt-8 flex flex-col items-center">
            {daysPassed < 6 ? (
              <div className="bg-card border border-border p-6 rounded-xl text-center max-w-md">
                <h4 className="text-white font-semibold mb-2">Week {aiRequest.week_number} Active</h4>
                <p className="text-sm text-gray-400 mb-4">
                  Week ends in {7 - daysPassed} days
                </p>
                <button disabled className="bg-gray-600 text-gray-300 px-6 py-2 rounded-lg cursor-not-allowed">
                  Review Week {aiRequest.week_number}
                </button>
              </div>
            ) : (
              <div className="bg-card border border-border p-6 rounded-xl text-center max-w-md shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                <h4 className="text-white font-bold text-lg mb-2">Week {aiRequest.week_number} Completed!</h4>
                <p className="text-sm text-gray-400 mb-6">
                  Tell us how your week went so we can adapt your next plan.
                </p>
                <button 
                  onClick={() => setShowFeedbackModal(true)}
                  className="bg-primary text-black font-semibold px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors w-full"
                >
                  Review Week {aiRequest.week_number} & Generate Week {aiRequest.week_number + 1}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Feedback Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-card w-full max-w-lg rounded-2xl p-6 border border-border">
              <h3 className="text-2xl font-bold text-white mb-2">How was your Week {aiRequest.week_number}?</h3>
              <p className="text-sm text-gray-400 mb-6">What went well? What was difficult? Any changes you'd like next week?</p>
              
              <form onSubmit={handleFeedbackSubmit}>
                <textarea
                  required
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="The leg workout was too intense and I need more recovery time..."
                  className="w-full h-32 bg-background border border-border rounded-lg p-4 text-white focus:border-primary focus:outline-none mb-6 resize-none"
                />
                
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFeedbackModal(false)}
                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="bg-primary text-black font-semibold px-6 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50"
                  >
                    {isGenerating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Generate Week ${aiRequest.week_number + 1}`}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // If plan is pending/generating/reviewed but NOT assigned
  if (aiRequest && ['PENDING', 'GENERATING', 'GENERATED', 'TRAINER_REVIEWED'].includes(aiRequest.status)) {
    const isGeneratingStep = ['PENDING', 'GENERATING'].includes(aiRequest.status);
    const isGeneratedStep = aiRequest.status === 'GENERATED';
    const isReviewedStep = aiRequest.status === 'TRAINER_REVIEWED';

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-6">
        <div className="max-w-md w-full bg-card p-8 rounded-2xl border border-border text-center shadow-2xl">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            {isGeneratingStep ? (
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            ) : (
              <Clock className="w-8 h-8 text-primary animate-pulse" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isGeneratingStep ? "Generating Your Plan" : "Plan in Progress"}
          </h2>
          <p className="text-gray-400 mb-6">
            {isGeneratingStep
              ? "Your weekly workout and diet plans are being generated."
              : isGeneratedStep
              ? "Your plans are generated and waiting for trainer review."
              : "Your plans have been reviewed and are awaiting final assignment."}
          </p>
          <div className="p-4 bg-background rounded-xl text-sm text-gray-400 text-left border border-border/50 space-y-3">
            <div className="flex items-center gap-2.5">
              {isGeneratingStep ? (
                <>
                  <Loader2 className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
                  <span className="text-primary font-medium">Generating AI Plan (Workout & Diet)...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-200">AI Generation Complete</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2.5">
              {isReviewedStep ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-gray-200">Trainer Review Complete</span>
                </>
              ) : isGeneratedStep ? (
                <>
                  <Clock className="w-4 h-4 text-amber-400 animate-pulse flex-shrink-0" />
                  <span className="text-amber-300 font-medium">Waiting for Trainer Review</span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-gray-600 flex-shrink-0" />
                  <span className="text-gray-500">Trainer Review</span>
                </>
              )}
            </div>
          </div>
          {isGeneratingStep && (
            <p className="text-xs text-gray-500 mt-4">
              Background generation in progress. You can safely browse other pages while this completes.
            </p>
          )}
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

        {/* No trainer assigned — prominent warning */}
        {bannerError && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-400" />
            <div className="flex-1">
              <p className="font-semibold text-amber-300">Cannot Generate Plan</p>
              <p className="text-sm mt-1 text-amber-300/80">{bannerError}</p>
            </div>
            <button
              type="button"
              onClick={() => setBannerError(null)}
              className="text-amber-400/60 hover:text-amber-300 transition-colors flex-shrink-0 text-lg leading-none"
              title="Dismiss"
            >✕</button>
          </div>
        )}

        {aiRequest && aiRequest.status === 'GENERATION_FAILED' && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-bold">Previous generation failed</p>
                {aiRequest.error_message && (
                  <p className="text-sm mt-1 text-red-300/80">{aiRequest.error_message}</p>
                )}
                <p className="text-xs mt-2 text-red-400/60">Fill in the form below and click "Generate My Plan" to try again.</p>
              </div>
              <button
                type="button"
                onClick={() => setAiRequest(null)}
                className="text-red-400/60 hover:text-red-300 transition-colors flex-shrink-0 text-lg leading-none"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
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

        <div className="flex justify-end pt-6 border-t border-border mt-8">
          <button 
            type="submit"
            disabled={isGenerating}
            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-background px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" /> Generate My Plan
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
