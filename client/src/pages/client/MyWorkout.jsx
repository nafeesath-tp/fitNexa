import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Dumbbell, CheckCircle2, Circle, ChevronDown, ChevronRight, TrendingUp, Coffee, PlayCircle } from "lucide-react";
import { workoutApi } from "../../services/workoutApi";
import { useWorkoutStore } from "../../stores/workoutStore";
import Button from "../../components/ui/Button";

const DIFF_COLOR = {
  BEGINNER: "text-green-400 bg-green-500/10 border-green-500/30",
  INTERMEDIATE: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  ADVANCED: "text-red-400 bg-red-500/10 border-red-500/30",
};

export default function MyWorkout() {
  const navigate = useNavigate();
  const { currentWorkout, setCurrentWorkout, markDayComplete } = useWorkoutStore();
  const [isLoading, setIsLoading] = useState(true);
  const [completingDayId, setCompletingDayId] = useState(null);
  const [openWeeks, setOpenWeeks] = useState({});
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchWorkout();
  }, []);

  const fetchWorkout = async () => {
    try {
      setIsLoading(true);
      const res = await workoutApi.getClientCurrentWorkout();
      setCurrentWorkout(res.data || null);
      // Auto-open first week
      if (res.data?.plan?.weeks?.[0]) {
        setOpenWeeks({ [res.data.plan.weeks[0].id]: true });
      }
    } catch {
      toast.error("Failed to load your workout plan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteDay = async (dayId, dayTitle) => {
    try {
      setCompletingDayId(dayId);
      const res = await workoutApi.completeDay(dayId, notes);
      markDayComplete(dayId);
      toast.success(res.data?.message || `${dayTitle} complete! 💪`);
      setNotes("");
    } catch (err) {
      toast.error(err.response?.data?.errors?.[0] || "Failed to mark day complete.");
    } finally {
      setCompletingDayId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!currentWorkout) {
    return (
      <div className="py-12 max-w-2xl mx-auto space-y-6">
        <div className="bg-[#163829] border border-[#23533d] border-dashed rounded-2xl p-16 text-center space-y-4">
          <Dumbbell className="w-12 h-12 text-gray-600 mx-auto" />
          <h3 className="text-xl font-bold text-white">No Workout Plan Assigned</h3>
          <p className="text-sm text-gray-400 max-w-sm mx-auto">
            Your personal trainer will create and assign a custom workout plan tailored to your goals. Check back soon!
          </p>
          <Button size="sm" variant="secondary" onClick={() => navigate("/client/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { plan, total_days, completed_days, progress_pct, completed_day_ids } = currentWorkout;
  const diffMeta = DIFF_COLOR[plan?.difficulty] || DIFF_COLOR.BEGINNER;

  return (
    <div className="py-6 space-y-6 max-w-4xl mx-auto">

      {/* Plan Banner */}
      <div className="bg-gradient-to-br from-[#163829] via-[#112a21] to-[#0b1a12] border border-[#23533d] rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell className="w-5 h-5 text-emerald-400" />
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">My Workout Plan</span>
            </div>
            <h1 className="text-2xl font-extrabold text-white">{plan.title}</h1>
            <p className="text-sm text-gray-400 mt-1">{plan.description}</p>
            <div className="flex items-center gap-3 mt-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${diffMeta}`}>
                {plan.difficulty}
              </span>
              <span className="text-xs text-gray-400">{plan.duration_weeks} weeks</span>
              {plan.specialization_name && <span className="text-xs text-gray-400">• {plan.specialization_name}</span>}
            </div>
          </div>

          {/* Progress Ring Area */}
          <div className="flex flex-col items-center justify-center bg-[#0f241a] border border-[#1e4633] rounded-2xl px-8 py-4 shrink-0">
            <div className="text-3xl font-extrabold text-emerald-400">{progress_pct}%</div>
            <div className="text-xs text-gray-400 mt-0.5">Completed</div>
            <div className="text-xs text-gray-500 mt-1">{completed_days}/{total_days} days</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="h-2 bg-[#0f241a] rounded-full overflow-hidden border border-[#1e4633]">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-700"
              style={{ width: `${progress_pct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-gray-500 mt-1">
            <span>Start</span>
            <span>{progress_pct}% Complete</span>
          </div>
        </div>
      </div>

      {/* Weeks → Days → Exercises */}
      <div className="space-y-4">
        {plan.weeks?.map((week) => (
          <div key={week.id} className="bg-[#163829] border border-[#23533d] rounded-2xl overflow-hidden">
            <button
              onClick={() => setOpenWeeks((p) => ({ ...p, [week.id]: !p[week.id] }))}
              className="w-full flex items-center justify-between p-4 hover:bg-[#1e4633]/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  {week.week_number}
                </div>
                <div className="text-left">
                  <div className="font-bold text-white">{week.title || `Week ${week.week_number}`}</div>
                  <div className="text-xs text-gray-400">
                    {week.days?.filter((d) => completed_day_ids?.includes(d.id)).length || 0}/{week.days?.length || 0} days done
                  </div>
                </div>
              </div>
              {openWeeks[week.id] ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
            </button>

            {openWeeks[week.id] && (
              <div className="px-4 pb-4 space-y-3 border-t border-[#1e4633] pt-3">
                {week.days?.map((day) => {
                  const isCompleted = completed_day_ids?.includes(day.id);
                  return (
                    <div
                      key={day.id}
                      className={`rounded-xl border overflow-hidden transition-all ${
                        isCompleted
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-[#1e4633] bg-[#0f241a]"
                      }`}
                    >
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-2">
                          {day.is_rest_day ? (
                            <Coffee className="w-4 h-4 text-blue-400" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-gray-500" />
                          )}
                          <span className={`font-semibold text-sm ${isCompleted ? "text-emerald-300" : "text-white"}`}>
                            {day.title}
                          </span>
                          {isCompleted && (
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-1.5 py-0.5 rounded">DONE ✅</span>
                          )}
                          {day.is_rest_day && (
                            <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0.5 rounded">REST</span>
                          )}
                        </div>

                        {!isCompleted && !day.is_rest_day && (
                          <Button
                            size="sm"
                            variant="primary"
                            isLoading={completingDayId === day.id}
                            onClick={() => handleCompleteDay(day.id, day.title)}
                            className="text-xs bg-emerald-600 hover:bg-emerald-500 flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Mark Complete
                          </Button>
                        )}
                      </div>

                      {/* Exercises inside day */}
                      {!day.is_rest_day && day.exercises?.length > 0 && (
                        <div className="px-3 pb-3 space-y-1.5 border-t border-[#1e4633]">
                          {day.exercises.map((ex) => (
                            <div key={ex.id} className="flex flex-col text-xs text-gray-300 py-2 border-b border-[#1e4633] last:border-0">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Dumbbell className="w-3 h-3 text-emerald-500/50 shrink-0" />
                                  <span className={isCompleted ? "line-through text-gray-500 font-medium" : "font-medium"}>{ex.exercise_name}</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-400 shrink-0">
                                  <span>{ex.sets}×{ex.reps}</span>
                                  {ex.demo_video_url && (
                                    <a href={ex.demo_video_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300">
                                      <PlayCircle className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </div>
                              {ex.notes && (
                                <div className="mt-1.5 ml-5 text-gray-400/80 italic leading-relaxed pr-2">
                                  {ex.notes}
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
        ))}
      </div>
    </div>
  );
}
