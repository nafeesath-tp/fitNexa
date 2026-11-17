import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { confirmDialog } from "../../components/ui/CustomAlert";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Utensils, PlayCircle, Flame, Droplets, Sparkles } from "lucide-react";
import { dietApi } from "../../services/dietApi";
import Button from "../../components/ui/Button";

const MealRow = ({ meal, planId, onDelete }) => (
  <div className="flex items-center justify-between bg-[#0b1a12] px-4 py-3 rounded-xl border border-[#1e4633] group hover:border-green-500/30 transition-colors">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded font-bold bg-green-500/20 text-green-400 border border-green-500/30">
          {meal.meal_type_display}
        </span>
        <span className="font-semibold text-white text-sm truncate">{meal.items_description}</span>
        {meal.recipe_url && (
          <a href={meal.recipe_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 ml-1" title="Recipe Link">
            <PlayCircle className="w-3.5 h-3.5 inline" />
          </a>
        )}
      </div>
      <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-3">
        <span className="text-orange-400 font-medium flex items-center gap-1">
          <Flame className="w-3 h-3 inline" /> {meal.calories} kcal
        </span>
        <span className="text-blue-300">P: {meal.protein_g || 0}g</span>
        <span className="text-yellow-300">C: {meal.carbs_g || 0}g</span>
        <span className="text-red-300">F: {meal.fats_g || 0}g</span>
        {meal.notes && <span className="text-gray-500 italic">• {meal.notes}</span>}
      </div>
    </div>
    <button
      onClick={() => onDelete(planId, meal.id)}
      className="ml-3 p-1.5 rounded-lg text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
      title="Delete Meal"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

const AddMealForm = ({ planId, dayId, onAdded }) => {
  const [form, setForm] = useState({
    meal_type: "BREAKFAST",
    order: 1,
    calories: 450,
    protein_g: 30,
    carbs_g: 50,
    fats_g: 15,
    items_description: "",
    notes: "",
    recipe_url: "",
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.items_description.trim()) {
      toast.error("Food items description is required.");
      return;
    }
    try {
      setSaving(true);
      const res = await dietApi.addMeal(planId, dayId, {
        ...form,
        order: Number(form.order) || 1,
        calories: Number(form.calories) || 0,
        protein_g: Number(form.protein_g) || 0,
        carbs_g: Number(form.carbs_g) || 0,
        fats_g: Number(form.fats_g) || 0,
      });
      onAdded(res.data);
      setForm({
        meal_type: "BREAKFAST",
        order: (Number(form.order) || 1) + 1,
        calories: 450,
        protein_g: 30,
        carbs_g: 50,
        fats_g: 15,
        items_description: "",
        notes: "",
        recipe_url: "",
      });
      toast.success("Meal added!");
    } catch {
      toast.error("Failed to add meal.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#0b1a12] border border-dashed border-[#1e4633] rounded-xl p-4 space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div>
          <label className="block text-[10px] text-gray-400 mb-1">Meal Type</label>
          <select
            className="w-full bg-[#112a21] border border-[#23533d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
            value={form.meal_type}
            onChange={(e) => setForm({ ...form, meal_type: e.target.value })}
          >
            <option value="BREAKFAST">Breakfast</option>
            <option value="MID_MORNING">Mid Morning</option>
            <option value="LUNCH">Lunch</option>
            <option value="EVENING_SNACK">Evening Snack</option>
            <option value="DINNER">Dinner</option>
            <option value="PRE_WORKOUT">Pre-Workout</option>
            <option value="POST_WORKOUT">Post-Workout</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-gray-400 mb-1">Order</label>
          <input
            type="number"
            min={1}
            className="w-full bg-[#112a21] border border-[#23533d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
            value={form.order}
            onChange={(e) => setForm({ ...form, order: e.target.value })}
          />
        </div>

        <div className="col-span-2">
          <label className="block text-[10px] text-gray-400 mb-1">Food Items Description *</label>
          <input
            className="w-full bg-[#112a21] border border-[#23533d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
            placeholder="e.g. 2 Eggs, 50g Oats, 1 Banana"
            value={form.items_description}
            onChange={(e) => setForm({ ...form, items_description: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <div>
          <label className="block text-[10px] text-orange-400 mb-1">Calories (kcal)</label>
          <input
            type="number"
            className="w-full bg-[#112a21] border border-[#23533d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
            value={form.calories}
            onChange={(e) => setForm({ ...form, calories: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-[10px] text-blue-400 mb-1">Protein (g)</label>
          <input
            type="number"
            className="w-full bg-[#112a21] border border-[#23533d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
            value={form.protein_g}
            onChange={(e) => setForm({ ...form, protein_g: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-[10px] text-yellow-400 mb-1">Carbs (g)</label>
          <input
            type="number"
            className="w-full bg-[#112a21] border border-[#23533d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
            value={form.carbs_g}
            onChange={(e) => setForm({ ...form, carbs_g: e.target.value })}
          />
        </div>
        <div>
          <label className="block text-[10px] text-red-400 mb-1">Fats (g)</label>
          <input
            type="number"
            className="w-full bg-[#112a21] border border-[#23533d] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
            value={form.fats_g}
            onChange={(e) => setForm({ ...form, fats_g: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <input
          className="bg-[#112a21] border border-[#23533d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
          placeholder="Notes (optional, e.g. Cook with coconut oil)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <input
          className="bg-[#112a21] border border-[#23533d] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
          placeholder="Recipe video/link URL (optional)"
          value={form.recipe_url}
          onChange={(e) => setForm({ ...form, recipe_url: e.target.value })}
        />
      </div>

      <Button size="sm" onClick={handleSubmit} isLoading={saving} className="text-xs">
        <Plus className="w-3.5 h-3.5 mr-1" /> Add Meal
      </Button>
    </div>
  );
};

export default function DietPlanDetail() {
  const { planId } = useParams();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [openWeeks, setOpenWeeks] = useState({});
  const [openDays, setOpenDays] = useState({});
  const [addingMealDay, setAddingMealDay] = useState(null);
  const [isAddingWeek, setIsAddingWeek] = useState(false);
  const [addingDayWeek, setAddingDayWeek] = useState(null);
  const [newDayTitle, setNewDayTitle] = useState("");
  const [newDayNumber, setNewDayNumber] = useState(1);
  const [newWaterTarget, setNewWaterTarget] = useState(3.0);
  const [isCheatDay, setIsCheatDay] = useState(false);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    try {
      setIsLoading(true);
      const res = await dietApi.getPlanDetail(planId);
      setPlan(res.data);
      const wMap = {};
      const dMap = {};
      (res.data.weeks || []).forEach((w, wi) => {
        if (wi === 0) wMap[w.id] = true;
        (w.days || []).forEach((d, di) => {
          if (wi === 0 && di === 0) dMap[d.id] = true;
        });
      });
      setOpenWeeks(wMap);
      setOpenDays(dMap);
    } catch {
      toast.error("Failed to load diet plan.");
      navigate("/trainer/diet-plans");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWeek = async () => {
    try {
      setIsAddingWeek(true);
      const weekNum = (plan?.weeks?.length || 0) + 1;
      await dietApi.addWeek(planId, { week_number: weekNum, title: `Week ${weekNum}` });
      toast.success(`Week ${weekNum} added!`);
      fetchPlan();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add week.");
    } finally {
      setIsAddingWeek(false);
    }
  };

  const handleDeleteWeek = async (weekId) => {
    const confirmed = await confirmDialog({
      title: "Delete Week",
      message: "Are you sure you want to delete this entire week and all its days? This cannot be undone.",
      confirmText: "Delete Week",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await dietApi.deleteWeek(planId, weekId);
      toast.success("Week removed.");
      fetchPlan();
    } catch {
      toast.error("Failed to remove week.");
    }
  };

  const handleAddDay = async (weekId) => {
    try {
      await dietApi.addDay(planId, weekId, {
        day_number: Number(newDayNumber) || 1,
        title: newDayTitle || `Day ${newDayNumber}`,
        is_cheat_day: isCheatDay,
        water_target_liters: Number(newWaterTarget) || 3.0,
      });
      toast.success("Day added!");
      setAddingDayWeek(null);
      setNewDayTitle("");
      setNewDayNumber(1);
      setNewWaterTarget(3.0);
      setIsCheatDay(false);
      fetchPlan();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to add day.");
    }
  };

  const handleDeleteDay = async (dayId) => {
    const confirmed = await confirmDialog({
      title: "Delete Day",
      message: "Are you sure you want to delete this day and all its meals? This cannot be undone.",
      confirmText: "Delete Day",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await dietApi.deleteDay(planId, dayId);
      toast.success("Day removed.");
      fetchPlan();
    } catch {
      toast.error("Failed to remove day.");
    }
  };

  const handleDeleteMeal = async (pid, mealId) => {
    try {
      await dietApi.deleteMeal(pid, mealId);
      toast.success("Meal removed.");
      fetchPlan();
    } catch {
      toast.error("Failed to remove meal.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500" />
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 bg-gray-900/80 border border-gray-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/trainer/diet-plans")}
            className="p-2.5 rounded-xl bg-gray-800/80 hover:bg-gray-700 text-gray-300 transition-colors border border-gray-700/60"
            title="Back to Library"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-white">{plan.title}</h1>
              <span className="text-xs px-3 py-1 rounded-full bg-green-500/20 text-green-300 border border-green-500/30 font-semibold">
                {plan.goal_display}
              </span>
            </div>
            {plan.description && <p className="text-sm text-gray-400 mt-1">{plan.description}</p>}
            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 font-medium">
              <span className="flex items-center gap-1 text-orange-400 font-bold">
                <Flame className="w-4 h-4" /> Target: {plan.calories} kcal/day
              </span>
              <span>•</span>
              <span>{plan.duration_weeks} Weeks</span>
              <span>•</span>
              <span>{plan.total_meals || 0} Total Meals</span>
            </div>
          </div>
        </div>
        <Button onClick={handleAddWeek} isLoading={isAddingWeek} className="flex items-center gap-1.5 shadow-lg shadow-green-500/20">
          <Plus className="w-4 h-4" /> Add Week
        </Button>
      </div>

      {/* Tree Builder */}
      {(plan.weeks || []).length === 0 ? (
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-12 text-center text-gray-400 space-y-3">
          <Utensils className="w-12 h-12 mx-auto text-gray-600" />
          <p className="text-base font-medium text-gray-300">No Weeks Added Yet</p>
          <p className="text-xs max-w-sm mx-auto text-gray-500">
            Click "Add Week" above to begin structuring daily meal templates and calorie targets.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {(plan.weeks || []).map((week) => {
            const isWeekOpen = openWeeks[week.id];
            return (
              <div key={week.id} className="bg-gray-900/70 border border-gray-800/80 rounded-2xl overflow-hidden shadow-xl">
                {/* Week Header */}
                <div
                  onClick={() => setOpenWeeks({ ...openWeeks, [week.id]: !isWeekOpen })}
                  className="flex items-center justify-between px-6 py-4 bg-gray-900/90 cursor-pointer hover:bg-gray-800/60 transition-colors border-b border-gray-800/80"
                >
                  <div className="flex items-center gap-3">
                    {isWeekOpen ? <ChevronDown className="w-5 h-5 text-green-400" /> : <ChevronRight className="w-5 h-5 text-gray-500" />}
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <span>Week {week.week_number}</span>
                      {week.title && week.title !== `Week ${week.week_number}` && (
                        <span className="text-sm font-normal text-gray-400">— {week.title}</span>
                      )}
                    </h2>
                    <span className="text-xs bg-gray-800 text-gray-400 px-2.5 py-0.5 rounded-full border border-gray-700">
                      {(week.days || []).length} days
                    </span>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => {
                        setAddingDayWeek(week.id);
                        setNewDayNumber((week.days?.length || 0) + 1);
                        setNewDayTitle(`Day ${(week.days?.length || 0) + 1}`);
                      }}
                      className="text-xs bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-xl font-semibold transition-all flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Day
                    </button>
                    <button
                      onClick={() => handleDeleteWeek(week.id)}
                      className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"
                      title="Delete Week"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Week Body */}
                {isWeekOpen && (
                  <div className="p-6 space-y-4">
                    {/* Add Day Form */}
                    {addingDayWeek === week.id && (
                      <div className="bg-gray-950/80 border border-green-500/30 rounded-xl p-4 space-y-3">
                        <div className="text-xs font-bold text-green-400 uppercase tracking-wider">New Day in Week {week.week_number}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-1">Day Number *</label>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
                              value={newDayNumber}
                              onChange={(e) => setNewDayNumber(e.target.value)}
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-[10px] text-gray-400 mb-1">Day Title</label>
                            <input
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
                              placeholder="e.g. High Carb Refeed Day / Low Carb Day"
                              value={newDayTitle}
                              onChange={(e) => setNewDayTitle(e.target.value)}
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-400 mb-1">Water Target (L)</label>
                            <input
                              type="number"
                              step="0.5"
                              min="1"
                              max="10"
                              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-green-500"
                              value={newWaterTarget}
                              onChange={(e) => setNewWaterTarget(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="cheatDayCheck"
                            checked={isCheatDay}
                            onChange={(e) => setIsCheatDay(e.target.checked)}
                            className="rounded border-gray-700 bg-gray-900 text-green-500 focus:ring-green-500"
                          />
                          <label htmlFor="cheatDayCheck" className="text-xs text-gray-300 font-medium cursor-pointer flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-yellow-400" /> Mark as Cheat Day / Refeed Day
                          </label>
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setAddingDayWeek(null)}>Cancel</Button>
                          <Button size="sm" onClick={() => handleAddDay(week.id)}>Save Day</Button>
                        </div>
                      </div>
                    )}

                    {(week.days || []).length === 0 ? (
                      <p className="text-xs text-gray-500 italic text-center py-4">No days added to Week {week.week_number} yet.</p>
                    ) : (
                      <div className="space-y-4 pl-2 md:pl-4 border-l-2 border-gray-800">
                        {(week.days || []).map((day) => {
                          const isDayOpen = openDays[day.id];
                          return (
                            <div key={day.id} className="bg-gray-900/50 border border-gray-800/90 rounded-xl overflow-hidden">
                              {/* Day Header */}
                              <div
                                onClick={() => setOpenDays({ ...openDays, [day.id]: !isDayOpen })}
                                className="flex items-center justify-between px-5 py-3 bg-gray-900/70 cursor-pointer hover:bg-gray-800/40 transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  {isDayOpen ? <ChevronDown className="w-4 h-4 text-green-400" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                                  <span className="font-bold text-sm text-white">Day {day.day_number}</span>
                                  {day.title && <span className="text-xs text-gray-400 font-normal">— {day.title}</span>}
                                  {day.is_cheat_day && (
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-bold flex items-center gap-1">
                                      <Sparkles className="w-2.5 h-2.5" /> Cheat Day
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-xs font-bold text-orange-400 flex items-center gap-1 bg-gray-800/80 px-2.5 py-1 rounded-lg border border-gray-700/50">
                                    <Flame className="w-3.5 h-3.5" /> {day.day_calories || 0} kcal
                                  </span>
                                  <span className="text-xs font-medium text-blue-300 flex items-center gap-1 bg-gray-800/80 px-2.5 py-1 rounded-lg border border-gray-700/50">
                                    <Droplets className="w-3.5 h-3.5 text-blue-400" /> {day.water_target_liters || 3.0} L
                                  </span>
                                  <button
                                    onClick={() => setAddingMealDay(addingMealDay === day.id ? null : day.id)}
                                    className="text-xs bg-gray-800 hover:bg-green-500/20 text-gray-300 hover:text-green-400 border border-gray-700 hover:border-green-500/40 px-2.5 py-1 rounded-lg font-semibold transition-all flex items-center gap-1"
                                  >
                                    <Plus className="w-3 h-3" /> Add Meal
                                  </button>
                                  <button
                                    onClick={() => handleDeleteDay(day.id)}
                                    className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                                    title="Delete Day"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {/* Day Body (Meals) */}
                              {isDayOpen && (
                                <div className="p-4 space-y-3 bg-gray-950/40 border-t border-gray-800/60">
                                  {/* Macro Summary Row for Day */}
                                  <div className="flex items-center justify-between text-xs px-3 py-2 bg-gray-900/80 rounded-lg border border-gray-800 text-gray-300">
                                    <span className="font-semibold text-gray-400">Daily Macros Split:</span>
                                    <div className="flex items-center gap-4 font-bold">
                                      <span className="text-blue-400">Protein: {day.total_protein_g || 0}g</span>
                                      <span className="text-yellow-400">Carbs: {day.total_carbs_g || 0}g</span>
                                      <span className="text-red-400">Fats: {day.total_fats_g || 0}g</span>
                                    </div>
                                  </div>

                                  {(day.meals || []).length === 0 ? (
                                    <p className="text-xs text-gray-500 italic text-center py-2">No meals assigned to this day yet.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {(day.meals || []).map((meal) => (
                                        <MealRow key={meal.id} meal={meal} planId={planId} onDelete={handleDeleteMeal} />
                                      ))}
                                    </div>
                                  )}

                                  {addingMealDay === day.id && (
                                    <AddMealForm
                                      planId={planId}
                                      dayId={day.id}
                                      onAdded={() => {
                                        setAddingMealDay(null);
                                        fetchPlan();
                                      }}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
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
