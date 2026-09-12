import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useClientStore } from '../../stores/clientStore';
import { useNavigate } from 'react-router-dom';
import { clientManagementApi } from '../../services/clientManagementApi';
import { subscriptionApi } from '../../services/subscriptionApi';
import { workoutApi } from '../../services/workoutApi';
import { dietApi } from '../../services/dietApi';
import { useSubscriptionStore } from '../../stores/subscriptionStore';
import { Bell, Weight, Ruler, User, Flame, ArrowUpRight, Dumbbell, Utensils } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../../components/ui/Avatar';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { profile } = useClientStore();
  const { currentSubscription, setCurrentSubscription } = useSubscriptionStore();
  const navigate = useNavigate();
  
  const [assignedTrainer, setAssignedTrainer] = useState(null);
  const [assignedWorkout, setAssignedWorkout] = useState(null);
  const [assignedDiet, setAssignedDiet] = useState(null);

  useEffect(() => {
    // Protect the route
    const isFreePlan = !user?.subscription_plan_name || user?.subscription_plan_name === 'FREE';
    if (isFreePlan) {
      navigate('/client/home', { replace: true });
      return;
    }
    if (user?.is_profile_completed === false) {
      navigate('/client/setup', { replace: true });
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      // Fetch assigned trainer
      const trainerRes = await clientManagementApi.getMyAssignedTrainer();
      if (trainerRes?.success && trainerRes.data) {
        setAssignedTrainer(trainerRes.data);
      }
      
      // Fetch subscription to verify tier
      const subRes = await subscriptionApi.getCurrent();
      if (subRes.success && subRes.data) {
        setCurrentSubscription(subRes.data);
      }

      // Fetch assigned workout
      const wRes = await workoutApi.getClientCurrentWorkout().catch(() => null);
      if (wRes?.success && wRes.data) setAssignedWorkout(wRes.data);

      // Fetch assigned diet
      const dRes = await dietApi.getClientCurrentDiet().catch(() => null);
      if (dRes?.success && dRes.data) setAssignedDiet(dRes.data);
      
    } catch (error) {
      console.error('Dashboard data fetch failed', error);
    }
  };

  const weight = profile?.weight_kg ? Number(profile.weight_kg) : 0;
  const heightCm = profile?.height_cm ? Number(profile.height_cm) : 0;
  const height = heightCm ? (heightCm / 100).toFixed(2) : 0;
  const targetWeight = profile?.target_weight_kg ? Number(profile.target_weight_kg) : 0;
  
  // Calculate Age
  let age = 0;
  if (profile?.date_of_birth) {
    const dob = new Date(profile.date_of_birth);
    const diff_ms = Date.now() - dob.getTime();
    const age_dt = new Date(diff_ms); 
    age = Math.abs(age_dt.getUTCFullYear() - 1970);
  }

  // Calculate BMI
  const heightInMeters = heightCm ? heightCm / 100 : 0;
  const bmi = (heightInMeters > 0 && weight > 0) ? (weight / (heightInMeters * heightInMeters)).toFixed(1) : 0;
  
  let bmiCategory = "N/A";
  let bmiColor = "emerald";
  let bmiNote = "Please update your height and weight to see your BMI insights.";

  if (bmi > 0) {
    if (bmi < 18.5) {
      bmiCategory = "Underweight";
      bmiColor = "blue";
      bmiNote = "Your BMI indicates you are underweight. Consider consulting your trainer for a caloric surplus diet.";
    }
    else if (bmi < 25) {
      bmiCategory = "Healthy";
      bmiColor = "emerald";
      bmiNote = "Your BMI indicates a healthy weight. Maintain your current calorie intake and activity levels.";
    }
    else if (bmi < 30) {
      bmiCategory = "Overweight";
      bmiColor = "orange";
      bmiNote = "Your BMI indicates you are overweight. A caloric deficit and regular exercise are recommended.";
    }
    else {
      bmiCategory = "Obese";
      bmiColor = "red";
      bmiNote = "Your BMI indicates obesity. Please consult a healthcare provider and your trainer for a structured plan.";
    }
  }

  let bmiPosition = 0;
  if (bmi > 0) {
    if (bmi < 18.5) {
      bmiPosition = Math.max(0, ((bmi - 10) / 8.5) * 33.3);
    } else if (bmi < 25) {
      bmiPosition = 33.3 + ((bmi - 18.5) / 6.5) * 33.3;
    } else {
      bmiPosition = 66.6 + (Math.min((bmi - 25), 15) / 15) * 33.4;
    }
  }

  // Calculate Progress (No dummy logic)
  const startWeight = profile?.starting_weight_kg ? Number(profile.starting_weight_kg) : weight;
  const totalLossNeeded = startWeight > targetWeight && targetWeight > 0 ? startWeight - targetWeight : 0;
  const currentLoss = startWeight > weight ? startWeight - weight : 0;
  const progressPct = totalLossNeeded > 0 ? Math.min(Math.round((currentLoss / totalLossNeeded) * 100), 100) : 0;

  return (
    <div className="bg-[#0b120f] min-h-[calc(100vh-80px)] text-gray-100 font-sans p-6 md:p-8">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Good Morning, {user?.first_name || 'Fitness'} {user?.last_name || 'Enthusiast'}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-3">
            <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-emerald-500/20">
              <span>WELCOME BACK</span>
              <span>👋</span>
            </div>
            {currentSubscription && (
              <div className="inline-flex items-center space-x-2 bg-blue-500/10 text-blue-400 text-xs font-bold px-3 py-1.5 rounded-lg border border-blue-500/20 uppercase">
                <span>PLAN: {currentSubscription.plan?.name || 'FREE'}</span>
                {currentSubscription.expires_at && currentSubscription.plan?.name !== 'FREE' && (
                  <span className="opacity-80 ml-2 border-l border-blue-500/30 pl-2 normal-case">
                    Expires: {new Date(currentSubscription.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <button className="bg-emerald-500 hover:bg-emerald-400 text-[#0b120f] font-bold py-3 px-6 rounded-xl transition-all hidden md:block">
            Upcoming Sessions
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-[#111c17] border border-emerald-900/30 p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <Weight className="w-4 h-4" />
                <span className="text-xs font-bold">Weight</span>
              </div>
              <div className="text-2xl font-bold text-white">{weight || '-'} <span className="text-xs text-gray-400 font-normal">kg</span></div>
            </div>
            
            <div className="bg-[#111c17] border border-emerald-900/30 p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <Ruler className="w-4 h-4" />
                <span className="text-xs font-bold">Height</span>
              </div>
              <div className="text-2xl font-bold text-white">{height || '-'} <span className="text-xs text-gray-400 font-normal">m</span></div>
            </div>

            <div className="bg-[#111c17] border border-emerald-900/30 p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <User className="w-4 h-4" />
                <span className="text-xs font-bold">Age</span>
              </div>
              <div className="text-2xl font-bold text-white">{age || '-'} <span className="text-xs text-gray-400 font-normal">yrs</span></div>
            </div>
          </div>

          {/* BMI Insights */}
          <div className="bg-[#111c17] border border-emerald-900/30 p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-emerald-500/50 flex items-center justify-center text-emerald-400">i</div>
                <span className="font-bold text-white">BMI Insights</span>
              </div>
              <div className={`text-xs font-bold px-3 py-1 rounded-md ${
                bmiColor === 'blue' ? 'bg-blue-500/10 text-blue-400' :
                bmiColor === 'orange' ? 'bg-orange-500/10 text-orange-400' :
                bmiColor === 'red' ? 'bg-red-500/10 text-red-400' :
                'bg-emerald-500/10 text-emerald-400'
              }`}>
                {bmiCategory}
              </div>
            </div>
            
            <p className="text-xs text-gray-400 mb-4">Based on height & weight metrics</p>
            
            <div className="mb-6">
              <span className="text-3xl font-extrabold text-white">{bmi}</span>
              <span className="text-xs text-gray-400 ml-1">kg/m²</span>
            </div>

            {/* Gradient Bar with Indicator */}
            <div className="relative h-2 w-full flex items-center mb-2">
              <div className="h-full w-full rounded-full bg-gray-800 flex overflow-hidden">
                <div className="h-full w-1/3 bg-blue-500"></div>
                <div className="h-full w-1/3 bg-emerald-500"></div>
                <div className="h-full w-1/3 bg-red-500"></div>
              </div>
              {bmi > 0 && (
                <div 
                  className="absolute h-4 w-4 bg-white rounded-full border-[3px] border-[#111c17] shadow-md transition-all duration-1000 z-10"
                  style={{ left: `calc(${bmiPosition}% - 8px)` }}
                />
              )}
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-6">
              <span>Under</span>
              <span>Normal</span>
              <span>Over</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              <span className={`font-bold mr-1 ${
                bmiColor === 'blue' ? 'text-blue-400' :
                bmiColor === 'orange' ? 'text-orange-400' :
                bmiColor === 'red' ? 'text-red-400' :
                'text-emerald-400'
              }`}>Note:</span> 
              {bmiNote}
            </p>
          </div>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Weight Loss Progress */}
          <div className="bg-[#111c17] border border-emerald-900/30 p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2 text-red-400">
                <Flame className="w-5 h-5" />
                <span className="font-bold text-white">Weight Loss</span>
              </div>
              <div className="bg-red-500/10 text-red-400 text-xs font-bold px-3 py-1 rounded-md">
                {progressPct}%
              </div>
            </div>
            
            <div className="flex justify-between items-end mb-3">
              <div className="text-3xl font-extrabold text-white">{weight || '-'} <span className="text-xs text-gray-400 font-normal">kg</span></div>
              <div className="text-xs text-gray-500">
                Target: {targetWeight > 0 ? `${targetWeight}kg` : <span className="italic">Not Set</span>}
              </div>
            </div>
            
            <div className="h-2 w-full bg-[#0b120f] rounded-full overflow-hidden border border-emerald-900/20">
              <div className="h-full bg-red-500 rounded-full" style={{ width: `${progressPct}%` }}></div>
            </div>
          </div>

          {/* Bottom Grid: Monthly Progress & Trainers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Monthly Progress */}
            <div className="bg-[#111c17] border border-emerald-900/30 p-6 rounded-2xl flex flex-col justify-between h-[300px]">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-bold text-white">Monthly Progress</h3>
                  <span className="text-xs text-gray-500 flex items-center">This Week <ArrowUpRight className="w-3 h-3 ml-1" /></span>
                </div>
                <p className="text-xs text-gray-500 font-medium">No progress data yet.</p>
              </div>
              
              <div className="flex justify-between items-end h-32 mt-auto gap-2">
                {[
                  { day: 'Mon', h: '0%', active: false },
                  { day: 'Tue', h: '0%', active: false },
                  { day: 'Wed', h: '0%', active: false },
                  { day: 'Thu', h: '0%', active: false },
                  { day: 'Fri', h: '0%', active: false },
                  { day: 'Sat', h: '0%', active: false },
                ].map((bar, i) => (
                  <div key={i} className="flex flex-col items-center w-full gap-2">
                    <div className="w-full h-full bg-[#0b120f] rounded-t-sm flex items-end">
                      <div className={`w-full rounded-t-sm ${bar.active ? 'bg-emerald-500' : 'bg-emerald-900/40'}`} style={{ height: bar.h }}></div>
                    </div>
                    <span className="text-[10px] text-gray-500">{bar.day}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Assigned Workout Plan */}
            <div className="bg-[#111c17] border border-emerald-900/30 p-6 rounded-2xl h-[300px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Dumbbell className="w-5 h-5 text-emerald-400" />
                  Assigned Workout
                </h3>
              </div>
              
              {assignedWorkout ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
                    <Dumbbell className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{assignedWorkout.plan?.title || "Custom Workout"}</h4>
                  <p className="text-sm text-gray-400 mb-6">You have an active workout plan from your trainer.</p>
                  <button 
                    onClick={() => navigate('/client/my-workout')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-[#0b120f] font-bold py-2.5 px-6 rounded-xl transition-all w-full"
                  >
                    View Workout
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center">
                  <p className="text-sm text-gray-500 mb-4">No workout plan assigned yet.</p>
                  <p className="text-xs text-gray-600">Your trainer will assign one soon.</p>
                </div>
              )}
            </div>

            {/* Assigned Diet Plan */}
            <div className="bg-[#111c17] border border-emerald-900/30 p-6 rounded-2xl h-[300px] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white flex items-center gap-2">
                  <Utensils className="w-5 h-5 text-emerald-400" />
                  Assigned Diet
                </h3>
              </div>
              
              {assignedDiet ? (
                <div className="flex-1 flex flex-col justify-center items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4 border border-emerald-500/20">
                    <Utensils className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h4 className="text-lg font-bold text-white mb-2">{assignedDiet.plan?.title || "Custom Diet"}</h4>
                  <p className="text-sm text-gray-400 mb-6">Your personalized nutrition plan is ready.</p>
                  <button 
                    onClick={() => navigate('/client/my-diet')}
                    className="bg-emerald-500 hover:bg-emerald-400 text-[#0b120f] font-bold py-2.5 px-6 rounded-xl transition-all w-full"
                  >
                    View Diet Plan
                  </button>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center">
                  <p className="text-sm text-gray-500 mb-4">No diet plan assigned yet.</p>
                  <p className="text-xs text-gray-600">Your trainer will assign one soon.</p>
                </div>
              )}
            </div>

            {/* Trainers List */}
            <div className="bg-[#111c17] border border-emerald-900/30 p-6 rounded-2xl h-[300px]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-white">Trainers</h3>
                <span className="text-xs text-emerald-400 font-medium cursor-pointer">See All</span>
              </div>
              
              <div className="space-y-4">
                {assignedTrainer ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar image={assignedTrainer.profile_image} name={`${assignedTrainer.first_name} ${assignedTrainer.last_name}`} size="md" />
                      <div>
                        <div className="text-sm font-bold text-white">{assignedTrainer.first_name} {assignedTrainer.last_name}</div>
                        <div className="text-xs text-gray-400">{assignedTrainer.specialization || 'Personal Trainer'}</div>
                      </div>
                    </div>
                    <button className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-md hover:bg-emerald-500/20 transition-all border border-emerald-500/20">
                      Chat
                    </button>
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-500 text-sm">
                    No trainer assigned yet.
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
