import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiPlansApi } from '../../services/aiPlansApi';
import { Sparkles, CheckCircle2, XCircle, ChevronLeft, Dumbbell, Utensils, RefreshCw, CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';

export default function AiPlanReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workout');

  useEffect(() => {
    fetchPlanDetail();
  }, [id]);

  const fetchPlanDetail = async () => {
    try {
      setLoading(true);
      const res = await aiPlansApi.getTrainerPlanDetail(id);
      if (res.success) {
        setPlan(res.data);
      }
    } catch (error) {
      toast.error("Failed to load plan details");
      navigate('/trainer/ai-plans');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      const toastId = toast.loading("Approving and Assigning plan...");
      const res = await aiPlansApi.approvePlan(id);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        fetchPlanDetail(); // Refresh status
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to approve plan");
    }
  };

  const handleRegenerate = async () => {
    if (!window.confirm("Are you sure you want to discard this plan and regenerate?")) return;
    try {
      const toastId = toast.loading("Requesting regeneration...");
      const res = await aiPlansApi.regeneratePlan(id);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        navigate('/trainer/ai-plans');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to regenerate");
    }
  };

  const handleNextWeek = async () => {
    try {
      const toastId = toast.loading("Generating Next Week's plan...");
      const res = await aiPlansApi.generateNextWeek(id);
      if (res.success) {
        toast.success(res.message, { id: toastId });
        navigate(`/trainer/ai-plans/${res.request_id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to generate next week");
    }
  };

  if (loading || !plan) {
    return <div className="flex justify-center items-center h-64"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  }

  const wPlan = plan.workout_plan;
  const dPlan = plan.diet_plan;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <button 
            onClick={() => navigate('/trainer/ai-plans')}
            className="flex items-center text-sm text-gray-400 hover:text-white mb-4 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to AI Plans
          </button>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            AI Plan: {plan.client_email}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
            <span className="flex items-center gap-1"><CalendarDays className="w-4 h-4"/> Week {plan.week_number}</span>
            <span className={cn(
              "px-2 py-0.5 rounded text-xs font-bold uppercase",
              plan.status === 'ASSIGNED' ? "bg-green-500/20 text-green-400" :
              plan.status === 'GENERATED' ? "bg-blue-500/20 text-blue-400" :
              "bg-gray-500/20 text-gray-400"
            )}>
              {plan.status}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3">
          {plan.status === 'GENERATED' && (
            <>
              <button 
                onClick={handleRegenerate}
                className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-white/5 border border-border rounded-lg text-sm font-medium transition-colors text-white"
              >
                <RefreshCw className="w-4 h-4" /> Discard & Regenerate
              </button>
              <button 
                onClick={handleApprove}
                className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-background rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20"
              >
                <CheckCircle2 className="w-5 h-5" /> Approve & Assign
              </button>
            </>
          )}

          {plan.status === 'ASSIGNED' && (
            <button 
              onClick={handleNextWeek}
              className="flex items-center gap-2 px-6 py-2 bg-primary hover:bg-primary/90 text-background rounded-lg text-sm font-bold transition-all shadow-lg shadow-primary/20"
            >
              <Sparkles className="w-5 h-5" /> Generate Week {plan.week_number + 1}
            </button>
          )}
        </div>
      </div>

      {/* Client Preferences Context */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">Client Context for Week {plan.week_number}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="block text-gray-500 mb-1">Workout Days</span>
            <span className="text-white font-medium">{plan.questionnaire?.workout_days_per_week || '-'} days/week</span>
          </div>
          <div>
            <span className="block text-gray-500 mb-1">Duration</span>
            <span className="text-white font-medium">{plan.questionnaire?.session_duration_minutes || '-'} mins</span>
          </div>
          <div>
            <span className="block text-gray-500 mb-1">Location</span>
            <span className="text-white font-medium">{plan.questionnaire?.workout_location || '-'}</span>
          </div>
          <div>
            <span className="block text-gray-500 mb-1">Equipment</span>
            <span className="text-white font-medium">{plan.questionnaire?.equipment?.join(', ') || 'None'}</span>
          </div>
          <div className="col-span-2">
            <span className="block text-gray-500 mb-1">Limitations</span>
            <span className="text-white font-medium">{plan.questionnaire?.physical_limitations || 'None'}</span>
          </div>
          <div className="col-span-2">
            <span className="block text-gray-500 mb-1">Diet Notes</span>
            <span className="text-white font-medium">Water: {plan.questionnaire?.water_target_liters}L | Meals: {plan.questionnaire?.meals_per_day} | Dislikes: {plan.questionnaire?.food_dislikes_allergies || 'None'}</span>
          </div>
        </div>
      </div>

      {/* Plan Tabs */}
      <div className="border-b border-border">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('workout')}
            className={cn(
              "flex items-center pb-3 text-sm font-medium transition-colors border-b-2",
              activeTab === 'workout' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <Dumbbell className="w-4 h-4 mr-2" />
            Generated Workout
          </button>
          <button
            onClick={() => setActiveTab('diet')}
            className={cn(
              "flex items-center pb-3 text-sm font-medium transition-colors border-b-2",
              activeTab === 'diet' ? "border-primary text-primary" : "border-transparent text-gray-400 hover:text-white"
            )}
          >
            <Utensils className="w-4 h-4 mr-2" />
            Generated Diet
          </button>
        </div>
      </div>

      {/* Plan Content */}
      <div className="bg-card border border-border rounded-xl p-6">
        {activeTab === 'workout' && wPlan && (
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-white">{wPlan.title}</h2>
              <p className="text-gray-400 text-sm">{wPlan.description}</p>
            </div>
            
            {wPlan.weeks?.[0]?.days?.map(day => (
              <div key={day.id} className="border border-border rounded-lg overflow-hidden">
                <div className="bg-background/50 px-4 py-3 flex justify-between items-center border-b border-border">
                  <h4 className="font-bold text-white">Day {day.day_number}: {day.title}</h4>
                  {day.is_rest_day && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Rest Day</span>}
                </div>
                {!day.is_rest_day && (
                  <div className="p-0">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-black/20 text-gray-400">
                        <tr>
                          <th className="p-3 font-medium">Exercise</th>
                          <th className="p-3 font-medium">Sets × Reps</th>
                          <th className="p-3 font-medium">Rest</th>
                          <th className="p-3 font-medium">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {day.exercises?.map(ex => (
                          <tr key={ex.id} className="hover:bg-white/5">
                            <td className="p-3 text-white font-medium">{ex.exercise_name}</td>
                            <td className="p-3 text-primary">{ex.sets} × {ex.reps}</td>
                            <td className="p-3 text-gray-400">{ex.rest_seconds}s</td>
                            <td className="p-3 text-gray-400 text-xs">{ex.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === 'diet' && dPlan && (
          <div className="space-y-6">
            <div className="mb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-white">{dPlan.title}</h2>
                <p className="text-gray-400 text-sm">{dPlan.description}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-primary">{dPlan.calories}</div>
                <div className="text-xs text-gray-400 uppercase">Daily kcal</div>
              </div>
            </div>

            {dPlan.weeks?.[0]?.days?.map(day => (
              <div key={day.id} className="border border-border rounded-lg overflow-hidden">
                <div className="bg-background/50 px-4 py-3 flex justify-between items-center border-b border-border">
                  <h4 className="font-bold text-white">Day {day.day_number}: {day.title}</h4>
                  <span className="text-xs text-blue-400">Water: {day.water_target_liters}L</span>
                </div>
                <div className="divide-y divide-border">
                  {day.meals?.map(meal => (
                    <div key={meal.id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <h5 className="font-bold text-primary text-sm uppercase">{meal.meal_type.replace('_', ' ')}</h5>
                        <div className="flex gap-3 text-xs">
                          <span className="text-gray-300"><span className="text-gray-500">P:</span> {meal.protein_g}g</span>
                          <span className="text-gray-300"><span className="text-gray-500">C:</span> {meal.carbs_g}g</span>
                          <span className="text-gray-300"><span className="text-gray-500">F:</span> {meal.fats_g}g</span>
                          <span className="font-bold text-white ml-2">{meal.calories} kcal</span>
                        </div>
                      </div>
                      <p className="text-sm text-white mb-1">{meal.items_description}</p>
                      {meal.notes && <p className="text-xs text-gray-400 italic">{meal.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
