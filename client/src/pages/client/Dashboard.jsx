import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useClientStore } from '../../stores/clientStore';
import { clientManagementApi } from '../../services/clientManagementApi';
import { subscriptionApi } from '../../services/subscriptionApi';
import { Bell, Weight, Ruler, User, Flame, ArrowUpRight } from 'lucide-react';
import toast from 'react-hot-toast';
import Avatar from '../../components/ui/Avatar';

export default function Dashboard() {
  const { user } = useAuthStore();
  const { profile } = useClientStore();
  
  const [assignedTrainer, setAssignedTrainer] = useState(null);
  const [subscription, setSubscription] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch assigned trainer
      const trainerRes = await clientManagementApi.getMyAssignedTrainer();
      if (trainerRes?.success && trainerRes.data) {
        setAssignedTrainer(trainerRes.data);
      }
      
      // Fetch subscription to verify tier
      const subRes = await subscriptionApi.getCurrentSubscription();
      if (subRes.success && subRes.data) {
        setSubscription(subRes.data);
      }
    } catch (error) {
      console.error('Dashboard data fetch failed', error);
    }
  };

  // Mock progress data based on the design
  const weight = profile?.weight_kg || 75;
  const height = profile?.height_cm ? (profile.height_cm / 100).toFixed(1) : 2.5;
  const targetWeight = profile?.target_weight_kg || 60;
  
  // Calculate BMI
  const heightInMeters = profile?.height_cm ? profile.height_cm / 100 : 2.5;
  const bmi = heightInMeters ? (weight / (heightInMeters * heightInMeters)).toFixed(1) : 22.4;
  let bmiCategory = "Healthy";
  if (bmi < 18.5) bmiCategory = "Underweight";
  else if (bmi > 25) bmiCategory = "Overweight";

  // Calculate Progress (Assuming starting weight was higher)
  const startWeight = weight + 25; // Dummy logic for UI visualization
  const totalLossNeeded = startWeight - targetWeight;
  const currentLoss = startWeight - weight;
  const progressPct = totalLossNeeded > 0 ? Math.min(Math.round((currentLoss / totalLossNeeded) * 100), 100) : 60;

  return (
    <div className="bg-[#0b120f] min-h-[calc(100vh-80px)] text-gray-100 font-sans p-6 md:p-8">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Good Morning, {user?.first_name || 'Fitness'} {user?.last_name || 'Enthusiast'}</h1>
          <div className="inline-flex items-center space-x-2 bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-lg mt-3 border border-emerald-500/20">
            <span>WELCOME BACK</span>
            <span>👋</span>
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
              <div className="text-2xl font-bold text-white">{weight} <span className="text-xs text-gray-400 font-normal">kg</span></div>
            </div>
            
            <div className="bg-[#111c17] border border-emerald-900/30 p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <Ruler className="w-4 h-4" />
                <span className="text-xs font-bold">Height</span>
              </div>
              <div className="text-2xl font-bold text-white">{height} <span className="text-xs text-gray-400 font-normal">m</span></div>
            </div>

            <div className="bg-[#111c17] border border-emerald-900/30 p-5 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <User className="w-4 h-4" />
                <span className="text-xs font-bold">Age</span>
              </div>
              <div className="text-2xl font-bold text-white">25 <span className="text-xs text-gray-400 font-normal">yrs</span></div>
            </div>
          </div>

          {/* BMI Insights */}
          <div className="bg-[#111c17] border border-emerald-900/30 p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full border border-emerald-500/50 flex items-center justify-center text-emerald-400">i</div>
                <span className="font-bold text-white">BMI Insights</span>
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1 rounded-md">
                {bmiCategory}
              </div>
            </div>
            
            <p className="text-xs text-gray-400 mb-4">Based on height & weight metrics</p>
            
            <div className="mb-6">
              <span className="text-3xl font-extrabold text-white">{bmi}</span>
              <span className="text-xs text-gray-400 ml-1">kg/m²</span>
            </div>

            {/* Gradient Bar */}
            <div className="relative h-2 w-full rounded-full bg-gray-800 flex overflow-hidden mb-2">
              <div className="h-full w-1/3 bg-blue-500"></div>
              <div className="h-full w-1/3 bg-emerald-500"></div>
              <div className="h-full w-1/3 bg-red-500"></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 font-medium uppercase tracking-wider mb-6">
              <span>Under</span>
              <span>Normal</span>
              <span>Over</span>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="text-emerald-400 font-bold mr-1">Note:</span> 
              Your BMI indicates a healthy weight. Maintain your current calorie intake and activity levels.
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
              <div className="text-3xl font-extrabold text-white">{weight} <span className="text-xs text-gray-400 font-normal">kg</span></div>
              <div className="text-xs text-gray-500">Target: {targetWeight}kg</div>
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
                <p className="text-xs text-emerald-400 font-medium">80% achieved this month</p>
              </div>
              
              <div className="flex justify-between items-end h-32 mt-auto gap-2">
                {[
                  { day: 'Mon', h: '30%', active: false },
                  { day: 'Tue', h: '40%', active: false },
                  { day: 'Wed', h: '25%', active: false },
                  { day: 'Thu', h: '85%', active: true },
                  { day: 'Fri', h: '50%', active: false },
                  { day: 'Sat', h: '60%', active: false },
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
                  <>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-900/50 flex items-center justify-center text-emerald-400 text-xs font-bold">CW</div>
                        <div>
                          <div className="text-sm font-bold text-white">Cameron Williamson</div>
                          <div className="text-xs text-gray-400">Yoga Specialist</div>
                        </div>
                      </div>
                      <button className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-md hover:bg-emerald-500/20 transition-all border border-emerald-500/20">
                        Chat
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 text-xs font-bold">BF</div>
                        <div>
                          <div className="text-sm font-bold text-white">Blueberry Fitness</div>
                          <div className="text-xs text-gray-400">Meditation Coach</div>
                        </div>
                      </div>
                      <button className="bg-emerald-500/10 text-emerald-400 text-xs font-bold px-3 py-1.5 rounded-md hover:bg-emerald-500/20 transition-all border border-emerald-500/20">
                        Chat
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
