import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Utensils, CheckCircle2, Circle, ChevronDown, ChevronRight, Flame, Droplets, PlayCircle, Sparkles } from "lucide-react";
import { dietApi } from "../../services/dietApi";
import { useDietStore } from "../../stores/dietStore";
import Button from "../../components/ui/Button";

const GOAL_COLOR = {
  WEIGHT_LOSS:  "text-green-400 bg-green-500/10 border-green-500/30",
  MUSCLE_GAIN:  "text-blue-400 bg-blue-500/10 border-blue-500/30",
  MAINTENANCE:  "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  ENDURANCE:    "text-purple-400 bg-purple-500/10 border-purple-500/30",
  GENERAL:      "text-gray-300 bg-gray-500/10 border-gray-500/30",
};

export default function MyDiet() {
  const navigate = useNavigate();
  const { currentDiet, setCurrentDiet, markMealComplete } = useDietStore();
  const [isLoading, setIsLoading] = useState(true);
  const [completingMealId, setCompletingMealId] = useState(null);
  const [openWeeks, setOpenWeeks] = useState({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchDiet();
  }, []);

  const fetchDiet = async () => {
    try {
      setIsLoading(true);
      const res = await dietApi.getClientCurrentDiet();
      setCurrentDiet(res.data || null);
      if (res.data?.plan?.weeks?.[0]) {
        setOpenWeeks({ [res.data.plan.weeks[0].id]: true });
      }
    } catch {
      toast.error("Failed to load your nutrition plan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteMeal = async (mealId, mealName) => {
    try {
      setCompletingMealId(mealId);
      const res = await dietApi.completeMeal(mealId, notes);
      markMealComplete(mealId);
      toast.success(res.data?.message || `${mealName} complete! 🥗`);
      setNotes("");
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0] || err?.response?.data?.message || "Failed to check in meal.");
    } finally {
      setCompletingMealId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
      </div>
    );
  }

  if (!currentDiet) {
    return (
      <div className="py-12 max-w-2xl mx-auto space-y-6">
        <div className="bg-gray-900/60 border border-gray-800 border-dashed rounded-2xl p-16 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto text-green-400">
            <Utensils className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Diet Plan Assigned</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Your personal trainer will create and assign a custom calorie and macronutrient targeted diet plan for your goals. Check back soon!
          </p>
          <Button size="sm" variant="secondary" onClick={() => navigate("/client/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { plan, total_meals, completed_meals, progress_pct, progress_text, completed_meal_ids } = currentDiet;
  const goalMeta = GOAL_COLOR[plan?.goal] || GOAL_COLOR.GENERAL;

  return (
    <div className="py-6 space-y-6 max-w-4xl mx-auto animate-fade-in pb-16">
      {/* Plan Banner */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-900/90 to-gray-950 border border-gray-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Utensils className="w-5 h-5 text-green-400" />
              <span className="text-xs text-green-400 font-bold uppercase tracking-wider">My Assigned Diet Plan</span>
            </div>
            <h1 className="text-2xl font-black text-white">{plan.title}</h1>
            {plan.description && <p className="text-sm text-gray-400 max-w-xl">{plan.description}</p>}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${goalMeta}`}>
                {plan.goal_display}
              </span>
              <span className="text-xs font-bold text-orange-400 bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/60 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> Target: {plan.calories} kcal/day
              </span>
              <span className="text-xs text-gray-400 bg-gray-800/80 px-3 py-1 rounded-full border border-gray-700/60">
                {plan.duration_weeks} Weeks
              </span>
            </div>
          </div>

          {/* Progress Box */}
          <div className="bg-gray-950/80 border border-gray-800 rounded-xl p-4 min-w-[200px] flex flex-col justify-center text-center">
            <div className="text-xs text-gray-400 font-medium mb-1">Meal Adherence</div>
            <div className="text-2xl font-black text-green-400">{progress_pct || 0}%</div>
            <div className="text-xs font-bold text-gray-300 mt-0.5">{progress_text || `${completed_meals} / ${total_meals}`} meals completed</div>
            <div className="w-full bg-gray-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress_pct || 0}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Week / Day / Meal Structure */}
      {(plan.weeks || []).length === 0 ? (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-12 text-center text-gray-400">
          <p className="font-medium text-white">Plan has no meal structure yet.</p>
          <p className="text-xs text-gray-500 mt-1">Your trainer is currently building your daily nutrition schedule.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {(plan.weeks || []).map((week) => {
            const isWeekOpen = openWeeks[week.id];
            return (
              <div key={week.id} className="bg-gray-900/70 border border-gray-800/80 rounded-2xl overflow-hidden shadow-xl">
                <div
                  onClick={() => setOpenWeeks({ ...openWeeks, [week.id]: !isWeekOpen })}
                  className="flex items-center justify-between px-6 py-4 bg-gray-900/90 cursor-pointer hover:bg-gray-800/60 transition-colors border-b border-gray-800/80"
                >
                  <div className="flex items-center gap-3">
                    {isWeekOpen ? <ChevronDown className="w-5 h-5 text-green-400" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                    <span className="font-bold text-base text-white">Week {week.week_number}</span>
                    {week.title && week.title !== `Week ${week.week_number}` && (
                      <span className="text-xs text-gray-400">— {week.title}</span>
                    )}
                  </div>
                  <span className="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded-full border border-gray-700 font-semibold">
                    {(week.days || []).length} Days
                  </span>
                </div>

                {isWeekOpen && (
                  <div className="p-6 space-y-6">
                    {(week.days || []).map((day) => (
                      <div key={day.id} className="bg-gray-950/60 border border-gray-800/90 rounded-xl p-5 space-y-4">
                        {/* Day Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-gray-800/80">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-white text-base">Day {day.day_number}</span>
                            {day.title && <span className="text-xs text-gray-400 font-medium">— {day.title}</span>}
                            {day.is_cheat_day && (
                              <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-bold flex items-center gap-1">
                                <Sparkles className="w-2.5 h-2.5" /> Cheat Day
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-xs font-bold">
                            <span className="text-orange-400 bg-gray-900 px-3 py-1 rounded-lg border border-gray-800 flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5" /> {day.day_calories || 0} kcal
                            </span>
                            <span className="text-blue-400 bg-gray-900 px-3 py-1 rounded-lg border border-gray-800 flex items-center gap-1">
                              <Droplets className="w-3.5 h-3.5" /> Water Target: {day.water_target_liters || 3.0} L
                            </span>
                          </div>
                        </div>

                        {/* Daily Macro Breakdown Banner */}
                        <div className="bg-gray-900/70 rounded-xl p-3 border border-gray-800/60 flex items-center justify-between text-xs">
                          <span className="text-gray-400 font-medium">Daily Macronutrient Splits:</span>
                          <div className="flex items-center gap-4 font-bold">
                            <span className="text-blue-300">Protein: {day.total_protein_g || 0}g</span>
                            <span className="text-yellow-300">Carbs: {day.total_carbs_g || 0}g</span>
                            <span className="text-red-300">Fats: {day.total_fats_g || 0}g</span>
                          </div>
                        </div>

                        {/* Meals List */}
                        {(day.meals || []).length === 0 ? (
                          <p className="text-xs text-gray-500 italic text-center py-2">No meals scheduled for this day.</p>
                        ) : (
                          <div className="space-y-3">
                            {(day.meals || []).map((meal) => {
                              const isCompleted = (completed_meal_ids || []).includes(meal.id);
                              const isCheckingIn = completingMealId === meal.id;
                              return (
                                <div
                                  key={meal.id}
                                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                                    isCompleted
                                      ? "bg-green-950/20 border-green-500/40 text-gray-200"
                                      : "bg-gray-900/60 border-gray-800 hover:border-gray-700 text-white"
                                  }`}
                                >
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs px-2.5 py-0.5 rounded font-bold border ${
                                        isCompleted ? "bg-green-500/20 text-green-300 border-green-500/40" : "bg-gray-800 text-green-400 border-gray-700"
                                      }`}>
                                        {meal.meal_type_display}
                                      </span>
                                      <span className={`font-bold text-sm ${isCompleted ? "line-through text-gray-400" : "text-white"}`}>
                                        {meal.items_description}
                                      </span>
                                      {meal.recipe_url && (
                                        <a href={meal.recipe_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 ml-1" title="View Recipe/Instructions">
                                          <PlayCircle className="w-4 h-4 inline" />
                                        </a>
                                      )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-medium">
                                      <span className="text-orange-400 font-bold">{meal.calories} kcal</span>
                                      <span className="text-blue-300">P: {meal.protein_g || 0}g</span>
                                      <span className="text-yellow-300">C: {meal.carbs_g || 0}g</span>
                                      <span className="text-red-300">F: {meal.fats_g || 0}g</span>
                                      {meal.notes && <span className="text-gray-400 italic">• {meal.notes}</span>}
                                    </div>
                                  </div>

                                  <div className="shrink-0 flex items-center gap-2">
                                    {isCompleted ? (
                                      <div className="flex items-center gap-1.5 text-xs font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-3.5 py-2 rounded-xl">
                                        <CheckCircle2 className="w-4 h-4" /> Completed ✓
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => handleCompleteMeal(meal.id, meal.meal_type_display)}
                                        disabled={isCheckingIn}
                                        className="w-full sm:w-auto bg-green-500 hover:bg-green-400 text-black font-extrabold text-xs px-4 py-2 rounded-xl shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                                      >
                                        {isCheckingIn ? (
                                          <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                        ) : (
                                          <Circle className="w-3.5 h-3.5" />
                                        )}
                                        Mark Complete ✓
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
