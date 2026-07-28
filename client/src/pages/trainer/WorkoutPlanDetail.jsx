import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight, Dumbbell, PlayCircle, Coffee } from "lucide-react";
import { workoutApi } from "../../services/workoutApi";
import { useWorkoutStore } from "../../stores/workoutStore";
import Button from "../../components/ui/Button";

const ExerciseRow = ({ exercise, planId, onDelete }) => (
  <div className="flex items-center justify-between bg-[#0b1a12] px-4 py-3 rounded-xl border border-[#1e4633] group hover:border-emerald-500/30 transition-colors">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <Dumbbell className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-semibold text-white text-sm truncate">{exercise.exercise_name}</span>
        {exercise.demo_video_url && (
          <a href={exercise.demo_video_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
            <PlayCircle className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      <div className="text-xs text-gray-400 mt-0.5 pl-5">
        {exercise.sets} sets × {exercise.reps} reps • {exercise.rest_seconds}s rest
        {exercise.notes && <span className="ml-2 italic">• {exercise.notes}</span>}
      </div>
    </div>
    <button
      onClick={() => onDelete(planId, exercise.id)}
      className="ml-3 p-1.5 rounded-lg text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  </div>
);

const AddExerciseForm = ({ planId, dayId, onAdded }) => {
  const [form, setForm] = useState({ exercise_name: "", sets: 3, reps: "10", rest_seconds: 60, notes: "", demo_video_url: "" });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.exercise_name.trim()) { toast.error("Exercise name required."); return; }
    try {
      setSaving(true);
      const res = await workoutApi.addExercise(planId, dayId, form);
      onAdded(res.data);
      setForm({ exercise_name: "", sets: 3, reps: "10", rest_seconds: 60, notes: "", demo_video_url: "" });
      toast.success("Exercise added!");
    } catch { toast.error("Failed to add exercise."); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-[#0b1a12] border border-dashed border-[#1e4633] rounded-xl p-3 space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <input
          className="col-span-2 sm:col-span-2 bg-[#112a21] border border-[#23533d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          placeholder="Exercise name *"
          value={form.exercise_name}
          onChange={(e) => setForm({ ...form, exercise_name: e.target.value })}
        />
        <input
          type="number" min={1}
          className="bg-[#112a21] border border-[#23533d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          placeholder="Sets"
          value={form.sets}
          onChange={(e) => setForm({ ...form, sets: Number(e.target.value) })}
        />
        <input
          className="bg-[#112a21] border border-[#23533d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          placeholder="Reps (e.g. 10-12 / AMRAP)"
          value={form.reps}
          onChange={(e) => setForm({ ...form, reps: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          className="bg-[#112a21] border border-[#23533d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          placeholder="Notes (optional)"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <input
          className="bg-[#112a21] border border-[#23533d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          placeholder="Demo video URL (optional)"
          value={form.demo_video_url}
          onChange={(e) => setForm({ ...form, demo_video_url: e.target.value })}
        />
      </div>
      <Button size="sm" variant="primary" onClick={handleSubmit} isLoading={saving} className="text-xs">
        <Plus className="w-3.5 h-3.5 mr-1" /> Add Exercise
      </Button>
    </div>
  );
};

export default function WorkoutPlanDetail() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const { activePlan, setActivePlan } = useWorkoutStore();

  const [isLoading, setIsLoading] = useState(true);
  const [openWeeks, setOpenWeeks] = useState({});
  const [openDays, setOpenDays] = useState({});
  const [addingExerciseDay, setAddingExerciseDay] = useState(null);
  const [isAddingWeek, setIsAddingWeek] = useState(false);
  const [addingDayWeek, setAddingDayWeek] = useState(null);
  const [newDayTitle, setNewDayTitle] = useState("");
  const [newDayNumber, setNewDayNumber] = useState(1);
  const [plan, setPlan] = useState(null);

  useEffect(() => {
    fetchPlan();
  }, [planId]);

  const fetchPlan = async () => {
    try {
      setIsLoading(true);
      const res = await workoutApi.getPlanDetail(planId);
      setPlan(res.data);
    } catch { toast.error("Failed to load plan."); navigate("/trainer/workout-plans"); }
    finally { setIsLoading(false); }
  };

  const handleAddWeek = async () => {
    const weekNum = (plan?.weeks?.length || 0) + 1;
    try {
      const res = await workoutApi.addWeek(planId, { week_number: weekNum, title: `Week ${weekNum}` });
      setPlan((prev) => ({
        ...prev,
        weeks: [...(prev.weeks || []), { ...res.data, days: [] }],
      }));
      setOpenWeeks((prev) => ({ ...prev, [res.data.id]: true }));
      toast.success(`Week ${weekNum} added!`);
    } catch { toast.error("Failed to add week."); }
    setIsAddingWeek(false);
  };

  const handleAddDay = async (weekId) => {
    if (!newDayTitle.trim()) { toast.error("Day title required."); return; }
    const week = plan.weeks.find((w) => w.id === weekId);
    const dayNum = newDayNumber || (week?.days?.length || 0) + 1;
    try {
      const res = await workoutApi.addDay(planId, weekId, { day_number: dayNum, title: newDayTitle });
      setPlan((prev) => ({
        ...prev,
        weeks: prev.weeks.map((w) =>
          w.id === weekId ? { ...w, days: [...(w.days || []), { ...res.data, exercises: [] }] } : w
        ),
      }));
      setOpenDays((prev) => ({ ...prev, [res.data.id]: true }));
      toast.success("Day added!");
    } catch { toast.error("Failed to add day."); }
    setNewDayTitle(""); setAddingDayWeek(null);
  };

  const handleExerciseAdded = (dayId, exercise) => {
    setPlan((prev) => ({
      ...prev,
      weeks: prev.weeks.map((w) => ({
        ...w,
        days: w.days.map((d) =>
          d.id === dayId ? { ...d, exercises: [...(d.exercises || []), exercise] } : d
        ),
      })),
    }));
    setAddingExerciseDay(null);
  };

  const handleDeleteExercise = async (planId, exerciseId) => {
    try {
      await workoutApi.deleteExercise(planId, exerciseId);
      setPlan((prev) => ({
        ...prev,
        weeks: prev.weeks.map((w) => ({
          ...w,
          days: w.days.map((d) => ({
            ...d,
            exercises: d.exercises.filter((e) => e.id !== exerciseId),
          })),
        })),
      }));
      toast.success("Exercise removed.");
    } catch { toast.error("Failed to remove exercise."); }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!plan) return null;

  const totalExercises = plan.weeks?.reduce((sum, w) =>
    sum + w.days?.reduce((ds, d) => ds + (d.exercises?.length || 0), 0), 0
  ) || 0;

  return (
    <div className="py-6 space-y-6 max-w-4xl mx-auto">
      {/* Back + Header */}
      <button
        onClick={() => navigate("/trainer/workout-plans")}
        className="flex items-center gap-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Plans
      </button>

      <div className="bg-gradient-to-br from-[#163829] to-[#0f241a] border border-[#23533d] rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white">{plan.title}</h1>
            <p className="text-sm text-gray-400 mt-1">{plan.description || "No description."}</p>
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
              <span>{plan.duration_weeks} weeks</span>
              <span>{plan.weeks?.length || 0} weeks built</span>
              <span>{totalExercises} total exercises</span>
            </div>
          </div>
          <Button
            size="sm"
            variant="primary"
            onClick={handleAddWeek}
            className="flex items-center gap-1.5 text-xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> Add Week
          </Button>
        </div>
      </div>

      {/* Weeks */}
      {(!plan.weeks || plan.weeks.length === 0) && (
        <div className="text-center py-10 text-gray-400">
          <p>No weeks yet. Click "Add Week" to start building your plan.</p>
        </div>
      )}

      {plan.weeks?.map((week) => (
        <div key={week.id} className="bg-[#163829] border border-[#23533d] rounded-2xl overflow-hidden">
          {/* Week Header */}
          <button
            onClick={() => setOpenWeeks((p) => ({ ...p, [week.id]: !p[week.id] }))}
            className="w-full flex items-center justify-between p-4 text-left hover:bg-[#1e4633]/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                {week.week_number}
              </div>
              <div>
                <div className="font-bold text-white">{week.title || `Week ${week.week_number}`}</div>
                <div className="text-xs text-gray-400">{week.days?.length || 0} days</div>
              </div>
            </div>
            {openWeeks[week.id] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
          </button>

          {openWeeks[week.id] && (
            <div className="px-4 pb-4 space-y-3 border-t border-[#1e4633]">
              {/* Days */}
              <div className="space-y-3 pt-3">
                {week.days?.map((day) => (
                  <div key={day.id} className="bg-[#0f241a] border border-[#1e4633] rounded-xl overflow-hidden">
                    {/* Day Header */}
                    <button
                      onClick={() => setOpenDays((p) => ({ ...p, [day.id]: !p[day.id] }))}
                      className="w-full flex items-center justify-between p-3 text-left hover:bg-[#163829] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        {day.is_rest_day ? (
                          <Coffee className="w-4 h-4 text-blue-400" />
                        ) : (
                          <Dumbbell className="w-4 h-4 text-emerald-400" />
                        )}
                        <span className="font-semibold text-white text-sm">{day.title || `Day ${day.day_number}`}</span>
                        {day.is_rest_day && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">REST</span>
                        )}
                        <span className="text-xs text-gray-500">({day.exercises?.length || 0} exercises)</span>
                      </div>
                      {openDays[day.id] ? <ChevronDown className="w-3.5 h-3.5 text-gray-500" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500" />}
                    </button>

                    {openDays[day.id] && (
                      <div className="px-3 pb-3 space-y-2 border-t border-[#1e4633]">
                        {day.exercises?.map((ex) => (
                          <ExerciseRow key={ex.id} exercise={ex} planId={planId} onDelete={handleDeleteExercise} />
                        ))}
                        {day.exercises?.length === 0 && !day.is_rest_day && (
                          <p className="text-xs text-gray-500 py-2 pl-2">No exercises yet.</p>
                        )}
                        {!day.is_rest_day && addingExerciseDay === day.id ? (
                          <AddExerciseForm
                            planId={planId}
                            dayId={day.id}
                            onAdded={(ex) => handleExerciseAdded(day.id, ex)}
                          />
                        ) : !day.is_rest_day ? (
                          <button
                            onClick={() => setAddingExerciseDay(day.id)}
                            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 mt-1 transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Exercise
                          </button>
                        ) : null}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Day */}
              {addingDayWeek === week.id ? (
                <div className="bg-[#0f241a] border border-dashed border-[#23533d] rounded-xl p-3 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      min={1}
                      value={newDayNumber}
                      onChange={(e) => setNewDayNumber(Number(e.target.value))}
                      placeholder="Day #"
                      className="bg-[#112a21] border border-[#23533d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      className="col-span-2 bg-[#112a21] border border-[#23533d] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                      placeholder="Day title (e.g. Day 1 – Chest)"
                      value={newDayTitle}
                      onChange={(e) => setNewDayTitle(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={() => handleAddDay(week.id)} className="text-xs">Add Day</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddingDayWeek(null)} className="text-xs">Cancel</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => { setAddingDayWeek(week.id); setNewDayNumber((week.days?.length || 0) + 1); setNewDayTitle(""); }}
                  className="flex items-center gap-1.5 text-sm text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
                >
                  <Plus className="w-4 h-4" /> Add Day to Week {week.week_number}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
