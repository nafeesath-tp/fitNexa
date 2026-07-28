import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { clientManagementApi } from '../../services/clientManagementApi';
import { subscriptionApi } from '../../services/subscriptionApi';
import { workoutApi } from '../../services/workoutApi';
import { useWorkoutStore } from '../../stores/workoutStore';
import { dietApi } from '../../services/dietApi';
import { useDietStore } from '../../stores/dietStore';
import toast from 'react-hot-toast';
import {
  Dumbbell, Utensils, Video, CreditCard, User,
  Activity, Crown, Users, Star, ChevronRight,
  TrendingUp, Calendar, Zap, Heart, UserCheck
} from 'lucide-react';

const PLAN_COLORS = {
  PREMIUM: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', icon: Crown },
  GROUP:   { bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   text: 'text-blue-400',   icon: Users },
  FREE:    { bg: 'bg-gray-500/10',   border: 'border-gray-500/30',   text: 'text-gray-400',   icon: Star  },
};

const StatCard = ({ icon: Icon, label, value, sub, colorClass = 'text-emerald-400', onClick }) => (
  <div
    onClick={onClick}
    className={`bg-[#163829] border border-[#23533d] rounded-2xl p-5 flex flex-col gap-3 ${onClick ? 'cursor-pointer hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-950/30 transition-all duration-200' : ''}`}
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[#0f241a] border border-[#1e4633] ${colorClass}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-sm font-medium text-gray-300">{label}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const QuickLink = ({ icon: Icon, label, desc, to, color = 'text-emerald-400' }) => (
  <Link
    to={to}
    className="group bg-[#163829] border border-[#23533d] hover:border-emerald-500/50 rounded-2xl p-4 flex items-center gap-4 transition-all duration-200 hover:shadow-lg hover:shadow-emerald-950/30"
  >
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-[#0f241a] border border-[#1e4633] ${color} group-hover:scale-110 transition-transform`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="font-semibold text-white text-sm">{label}</div>
      <div className="text-xs text-gray-400 truncate">{desc}</div>
    </div>
    <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-emerald-400 transition-colors" />
  </Link>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { currentSubscription, setCurrentSubscription } = useSubscriptionStore();
  const { currentWorkout, setCurrentWorkout } = useWorkoutStore();
  const { currentDiet, setCurrentDiet } = useDietStore();

  const [assignedTrainer, setAssignedTrainer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        setIsLoading(true);
        const [trainerRes, subRes, workoutRes, dietRes] = await Promise.allSettled([
          clientManagementApi.getMyAssignedTrainer(),
          !currentSubscription ? subscriptionApi.getCurrent() : Promise.resolve({ success: false }),
          workoutApi.getClientCurrentWorkout(),
          dietApi.getClientCurrentDiet(),
        ]);

        if (trainerRes.status === 'fulfilled' && trainerRes.value?.success) {
          setAssignedTrainer(trainerRes.value.data);
        }
        if (subRes.status === 'fulfilled' && subRes.value?.success) {
          setCurrentSubscription(subRes.value.data);
        }
        if (workoutRes.status === 'fulfilled' && workoutRes.value?.success) {
          setCurrentWorkout(workoutRes.value.data);
        }
        if (dietRes.status === 'fulfilled' && dietRes.value?.success) {
          setCurrentDiet(dietRes.value.data);
        }
      } catch (err) {
        toast.error('Failed to load dashboard.');
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const planName = currentSubscription?.plan?.name || 'FREE';
  const planMeta = PLAN_COLORS[planName] || PLAN_COLORS.FREE;
  const PlanIcon = planMeta.icon;

  const trainerName = assignedTrainer
    ? `${assignedTrainer.first_name || ''} ${assignedTrainer.last_name || ''}`.trim() || assignedTrainer.email
    : null;

  return (
    <div className="min-h-screen bg-[#0b1a12] text-white pb-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Welcome Banner ─────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#163829] via-[#112a21] to-[#0b1a12] border border-[#23533d] rounded-3xl p-7 shadow-2xl">
          {/* background decorative icon */}
          <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
            <Activity className="w-48 h-48 text-emerald-400" />
          </div>

          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-emerald-400 text-xs font-semibold tracking-widest uppercase">Active Dashboard</span>
              </div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight">
                Welcome back{user?.email ? `, ${user.email.split('@')[0]}` : ''}! 🌿
              </h1>
              <p className="text-gray-400 mt-1 text-sm">Your personalized fitness workspace is ready.</p>
            </div>

            {/* Plan Badge */}
            <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${planMeta.bg} ${planMeta.border} shrink-0`}>
              <PlanIcon className={`w-5 h-5 ${planMeta.text}`} />
              <div>
                <div className={`text-xs font-bold ${planMeta.text}`}>{planName} PLAN</div>
                <div className="text-[10px] text-gray-400">Active subscription</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Assigned Trainer card */}
          <StatCard
            icon={UserCheck}
            label="Personal Trainer"
            value={trainerName || (isLoading ? '...' : 'Unassigned')}
            sub={assignedTrainer?.specialization || (trainerName ? undefined : 'Admin assigns after subscription')}
            colorClass={assignedTrainer ? 'text-emerald-400' : 'text-gray-500'}
            onClick={assignedTrainer ? undefined : undefined}
          />

          {/* Workout Plan */}
          <StatCard
            icon={Dumbbell}
            label="Workout Plan"
            value={currentWorkout ? currentWorkout.plan.title : "Not Assigned"}
            sub={currentWorkout ? `${currentWorkout.plan.duration_weeks} weeks (${currentWorkout.completed_days}/${currentWorkout.total_days} days)` : "Waiting for trainer"}
            colorClass="text-orange-400"
            onClick={() => navigate(currentWorkout ? '/client/workout' : '/client/videos')}
          />

          {/* Diet Plan */}
          <StatCard
            icon={Utensils}
            label="Diet Plan"
            value={currentDiet ? currentDiet.plan.title : "Not Assigned"}
            sub={currentDiet ? `${currentDiet.plan.calories} kcal/day (${currentDiet.progress_text} meals)` : "Waiting for trainer"}
            colorClass="text-green-400"
            onClick={() => navigate(currentDiet ? '/client/diet' : '/client/dashboard')}
          />

          {/* Progress */}
          <StatCard
            icon={TrendingUp}
            label="Overall Progress"
            value={currentWorkout ? `${currentWorkout.progress_pct}%` : currentDiet ? `${currentDiet.progress_pct}%` : "0%"}
            sub={currentWorkout ? `${currentWorkout.completed_days} of ${currentWorkout.total_days} workouts done` : currentDiet ? `${currentDiet.progress_text} meals logged` : "Complete workouts/meals to track"}
            colorClass="text-purple-400"
          />
        </div>

        {/* ── Main Content ───────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Trainer Panel */}
          <div className="lg:col-span-1 bg-[#163829] border border-[#23533d] rounded-2xl p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-400" /> My Trainer
            </h2>

            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-500" />
              </div>
            ) : assignedTrainer ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {assignedTrainer.profile_image ? (
                    <img src={assignedTrainer.profile_image} alt={trainerName} className="w-14 h-14 rounded-2xl object-cover border border-[#23533d]" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xl">
                      {trainerName?.[0]?.toUpperCase() || 'T'}
                    </div>
                  )}
                  <div>
                    <div className="font-bold text-white">{trainerName}</div>
                    <div className="text-xs text-emerald-400">{assignedTrainer.specialization || 'General Fitness'}</div>
                    {assignedTrainer.experience && (
                      <div className="text-xs text-gray-400">{assignedTrainer.experience} yrs experience</div>
                    )}
                  </div>
                </div>
                {assignedTrainer.bio && (
                  <p className="text-xs text-gray-400 leading-relaxed border-t border-[#1e4633] pt-3">
                    "{assignedTrainer.bio.slice(0, 120)}{assignedTrainer.bio.length > 120 ? '…' : ''}"
                  </p>
                )}
                <div className="text-xs text-gray-500">
                  Assigned on {assignedTrainer.assigned_at ? new Date(assignedTrainer.assigned_at).toLocaleDateString() : '—'}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 space-y-2">
                <UserCheck className="w-10 h-10 text-gray-600 mx-auto" />
                <p className="text-sm text-gray-400">No trainer assigned yet.</p>
                <p className="text-xs text-gray-500">The admin will assign a certified trainer to your account.</p>
              </div>
            )}
          </div>

          {/* Today's Summary + Quick Links */}
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Summary */}
            <div className="bg-[#163829] border border-[#23533d] rounded-2xl p-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-emerald-400" /> Today's Plan
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Workout CTA */}
                <div 
                  onClick={() => navigate(currentWorkout ? '/client/workout' : '/client/videos')}
                  className="bg-[#0f241a] border border-[#1e4633] rounded-xl p-4 flex items-center justify-between cursor-pointer hover:border-emerald-500/40 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Dumbbell className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-semibold text-white">Workout Plan</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate max-w-[160px]">
                      {currentWorkout ? currentWorkout.plan.title : "No plan assigned yet"}
                    </p>
                  </div>
                  {currentWorkout ? (
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-1 rounded-lg font-bold shrink-0">
                      {currentWorkout.progress_pct}%
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-700/50 text-gray-400 border border-gray-600 px-2 py-1 rounded-lg shrink-0">
                      Waiting
                    </span>
                  )}
                </div>

                {/* Diet CTA */}
                <div
                  onClick={() => navigate(currentDiet ? '/client/diet' : '/client/dashboard')}
                  className={`bg-[#0f241a] border border-[#1e4633] rounded-xl p-4 flex items-center justify-between ${currentDiet ? 'cursor-pointer hover:border-green-500/50 transition-colors' : ''}`}
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Utensils className="w-4 h-4 text-green-400" />
                      <span className="text-sm font-semibold text-white">Diet Plan</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate max-w-[160px]">
                      {currentDiet ? currentDiet.plan.title : "No plan assigned yet"}
                    </p>
                  </div>
                  {currentDiet ? (
                    <span className="text-xs bg-green-500/20 text-green-300 border border-green-500/30 px-2.5 py-1 rounded-lg font-bold shrink-0">
                      {currentDiet.progress_text}
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-700/50 text-gray-400 border border-gray-600 px-2 py-1 rounded-lg shrink-0">
                      Waiting
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h2 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <Zap className="w-5 h-5 text-emerald-400" /> Quick Access
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <QuickLink icon={Utensils}    label="My Diet Plan"     desc="Track daily meals & macros"     to="/client/diet"         color="text-green-400" />
                <QuickLink icon={Video}       label="Training Videos"  desc="Browse your content library"    to="/client/videos"       color="text-blue-400" />
                <QuickLink icon={CreditCard}  label="Subscription"     desc={`${planName} plan — manage billing`} to="/client/plans"   color="text-yellow-400" />
                <QuickLink icon={User}        label="My Profile"       desc="Update personal details"        to="/client/profile"      color="text-pink-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Motivational Footer ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-emerald-900/20 to-[#0f241a] border border-emerald-500/20 rounded-2xl p-5 flex items-center gap-4">
          <Heart className="w-8 h-8 text-emerald-400 shrink-0" />
          <div>
            <div className="font-bold text-white text-sm">Your journey starts here.</div>
            <div className="text-xs text-gray-400 mt-0.5">
              Once your trainer assigns a workout and diet plan, this dashboard becomes your daily command center.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
