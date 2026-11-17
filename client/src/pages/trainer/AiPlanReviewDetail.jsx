import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { aiPlansApi } from '../../services/aiPlansApi';
import { workoutApi } from '../../services/workoutApi';
import { dietApi } from '../../services/dietApi';
import { CheckCircle2, XCircle, ChevronLeft, Dumbbell, Utensils, RefreshCw, CalendarDays, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { cn } from '../../utils/cn';
import { confirmDialog } from '../../components/ui/CustomAlert';

export default function AiPlanReviewDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('workout');
  
  // Edit State
  const [editingExercise, setEditingExercise] = useState(null);
  const [editingMeal, setEditingMeal] = useState(null);

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
    const confirmed = await confirmDialog({
      title: "Discard and Regenerate Plan",
      message: "Are you sure you want to discard this plan and regenerate a new one? Current modifications will be lost.",
      confirmText: "Regenerate Plan",
      variant: "warning",
    });
    if (!confirmed) return;
    try {
      const res = await aiPlansApi.regeneratePlan(id);
      if (res.success) {
        toast.success(res.message || "New AI plan generation has started in the background.");
        navigate('/trainer/ai-plans');
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to regenerate");
    }
  };

  // ── Handlers for Exercises ───────────────────────────────────────────────
  const handleDeleteExercise = async (planId, exerciseId) => {
    const confirmed = await confirmDialog({
      title: "Remove Exercise",
      message: "Are you sure you want to remove this exercise?",
      confirmText: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const toastId = toast.loading("Removing exercise...");
      const res = await workoutApi.deleteExercise(planId, exerciseId);
      if (res.success) {
        toast.success("Exercise removed", { id: toastId });
        fetchPlanDetail();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove exercise");
    }
  };

  const handleUpdateExercise = async (e) => {
    e.preventDefault();
    try {
      const toastId = toast.loading("Saving exercise...");
      const res = await workoutApi.updateExercise(plan.workout_plan.id, editingExercise.id, editingExercise);
      if (res.success) {
        toast.success("Exercise updated", { id: toastId });
        setEditingExercise(null);
        fetchPlanDetail();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update exercise");
    }
  };

  // ── Handlers for Meals ───────────────────────────────────────────────────
  const handleDeleteMeal = async (planId, mealId) => {
    const confirmed = await confirmDialog({
      title: "Remove Meal",
      message: "Are you sure you want to remove this meal?",
      confirmText: "Remove",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      const toastId = toast.loading("Removing meal...");
      const res = await dietApi.deleteMeal(planId, mealId);
      if (res.success) {
        toast.success("Meal removed", { id: toastId });
        fetchPlanDetail();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to remove meal");
    }
  };

  const handleUpdateMeal = async (e) => {
    e.preventDefault();
    try {
      const toastId = toast.loading("Saving meal...");
      const res = await dietApi.updateMeal(plan.diet_plan.id, editingMeal.id, editingMeal);
      if (res.success) {
        toast.success("Meal updated", { id: toastId });
        setEditingMeal(null);
        fetchPlanDetail();
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update meal");
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
                          <th className="p-3 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {day.exercises?.map(ex => (
                          <tr key={ex.id} className="hover:bg-white/5">
                            <td className="p-3 text-white font-medium">{ex.exercise_name}</td>
                            <td className="p-3 text-primary">{ex.sets} × {ex.reps}</td>
                            <td className="p-3 text-gray-400">{ex.rest_seconds}s</td>
                            <td className="p-3 text-gray-400 text-xs">{ex.notes}</td>
                            <td className="p-3 text-right">
                              <button onClick={() => setEditingExercise(ex)} className="text-gray-400 hover:text-white mr-3"><Pencil className="w-4 h-4" /></button>
                              <button onClick={() => handleDeleteExercise(wPlan.id, ex.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                            </td>
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
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-primary text-sm uppercase">{meal.meal_type.replace('_', ' ')}</h5>
                          <button onClick={() => setEditingMeal(meal)} className="text-gray-400 hover:text-white ml-2"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteMeal(dPlan.id, meal.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
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

      {/* Exercise Edit Modal */}
      {editingExercise && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Edit Exercise</h3>
            <form onSubmit={handleUpdateExercise} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Exercise Name</label>
                <input required type="text" value={editingExercise.exercise_name} onChange={e => setEditingExercise({...editingExercise, exercise_name: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Sets</label>
                  <input required type="number" value={editingExercise.sets} onChange={e => setEditingExercise({...editingExercise, sets: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Reps</label>
                  <input required type="text" value={editingExercise.reps} onChange={e => setEditingExercise({...editingExercise, reps: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Rest (seconds)</label>
                <input required type="number" value={editingExercise.rest_seconds} onChange={e => setEditingExercise({...editingExercise, rest_seconds: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <textarea rows={3} value={editingExercise.notes} onChange={e => setEditingExercise({...editingExercise, notes: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white"></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingExercise(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-background rounded-lg text-sm font-bold transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Meal Edit Modal */}
      {editingMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-4">Edit Meal</h3>
            <form onSubmit={handleUpdateMeal} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input required type="text" value={editingMeal.items_description} onChange={e => setEditingMeal({...editingMeal, items_description: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Calories</label>
                  <input required type="number" value={editingMeal.calories} onChange={e => setEditingMeal({...editingMeal, calories: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Protein (g)</label>
                  <input type="number" value={editingMeal.protein_g} onChange={e => setEditingMeal({...editingMeal, protein_g: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Carbs (g)</label>
                  <input type="number" value={editingMeal.carbs_g} onChange={e => setEditingMeal({...editingMeal, carbs_g: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white" />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Fats (g)</label>
                  <input type="number" value={editingMeal.fats_g} onChange={e => setEditingMeal({...editingMeal, fats_g: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                <input type="text" value={editingMeal.notes || ''} onChange={e => setEditingMeal({...editingMeal, notes: e.target.value})} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-white" />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setEditingMeal(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary/90 text-background rounded-lg text-sm font-bold transition-all">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
