import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { 
  ArrowLeft, Activity, Dumbbell, Utensils, HeartPulse, 
  Calendar, User, ShieldCheck, AlertCircle, TrendingUp 
} from "lucide-react";
import { clientManagementApi } from "../../services/clientManagementApi";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview"); // overview, workouts, diets

  const fetchClientDetail = async () => {
    try {
      setIsLoading(true);
      const res = await clientManagementApi.getTrainerClientDetail(id);
      setClient(res.data || null);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load client health details.");
      navigate("/trainer/clients");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchClientDetail();
  }, [id]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold text-white">Client not found or unassigned.</h3>
        <Button variant="secondary" size="sm" onClick={() => navigate("/trainer/clients")} className="mt-4">
          Back to Roster
        </Button>
      </div>
    );
  }

  const name = `${client.first_name || ""} ${client.last_name || ""}`.trim() || client.email.split("@")[0];

  const getTierBadge = (plan) => {
    switch (plan) {
      case "PREMIUM":
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">PREMIUM TIER</span>;
      case "GROUP":
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">GROUP TIER</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30">FREE TIER</span>;
    }
  };

  return (
    <div className="py-6 space-y-6 max-w-6xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate("/trainer/clients")}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Assigned Clients
      </button>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#163829] to-[#0f241a] border border-[#23533d] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <Avatar image={client.profile_picture} name={name} size="xl" />
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{name}</h1>
              {getTierBadge(client.subscription_plan)}
            </div>
            <p className="text-sm text-gray-400 mt-1">{client.email} • {client.phone_number || "No phone logged"}</p>
            <div className="flex items-center gap-2 mt-2 text-xs text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Assigned to you on{" "}
              {client.assigned_at ? new Date(client.assigned_at).toLocaleDateString() : "Recently"}
            </div>
            <div className="flex items-center gap-3 mt-2.5 text-xs">
              <span className={`px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${
                client.has_workout_plan 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                  : "bg-gray-800/50 text-gray-400 border-gray-700"
              }`}>
                <Dumbbell className="w-3 h-3" /> Workout: {client.has_workout_plan ? "Assigned ✅" : "Not Assigned ❌"}
              </span>
              <span className={`px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${
                client.has_diet_plan 
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" 
                  : "bg-gray-800/50 text-gray-400 border-gray-700"
              }`}>
                <Utensils className="w-3 h-3" /> Diet: {client.has_diet_plan ? "Assigned ✅" : "Not Assigned ❌"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button
            variant="secondary"
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 border border-emerald-500/30 hover:border-emerald-500"
            onClick={() => setActiveTab("workouts")}
          >
            <Dumbbell className="w-4 h-4 text-emerald-400" /> Workout Plans
          </Button>
          <Button
            variant="secondary"
            className="flex-1 md:flex-initial flex items-center justify-center gap-2 border border-emerald-500/30 hover:border-emerald-500"
            onClick={() => setActiveTab("diets")}
          >
            <Utensils className="w-4 h-4 text-emerald-400" /> Diet Plans
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-[#23533d] gap-6">
        {[
          { id: "overview", label: "Health Overview", icon: Activity },
          { id: "workouts", label: "Assigned Workouts", icon: Dumbbell },
          { id: "diets", label: "Nutrition & Diet", icon: Utensils },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-semibold transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-400"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Physical Stats Column */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-[#163829] border border-[#23533d] rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-emerald-400" /> Physical & Biometric Profile
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-[#0f241a] p-4 rounded-xl border border-[#1e4633]">
                  <span className="text-xs text-gray-400 block">Height</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {client.height_cm ? `${client.height_cm} cm` : "N/A"}
                  </span>
                </div>

                <div className="bg-[#0f241a] p-4 rounded-xl border border-[#1e4633]">
                  <span className="text-xs text-gray-400 block">Weight</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {client.weight_kg ? `${client.weight_kg} kg` : "N/A"}
                  </span>
                </div>

                <div className="bg-[#0f241a] p-4 rounded-xl border border-[#1e4633]">
                  <span className="text-xs text-gray-400 block">BMI Score</span>
                  <span className="text-lg font-bold text-emerald-400 mt-1 block">
                    {client.bmi ? `${client.bmi}` : "N/A"}
                  </span>
                </div>

                <div className="bg-[#0f241a] p-4 rounded-xl border border-[#1e4633]">
                  <span className="text-xs text-gray-400 block">Age / Gender</span>
                  <span className="text-lg font-bold text-white mt-1 block">
                    {client.age || "--"} yrs / {client.gender || "--"}
                  </span>
                </div>
              </div>
            </div>

            {/* Medical & Notes Section */}
            <div className="bg-[#163829] border border-[#23533d] rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" /> Medical Conditions & Coach Notes
              </h3>
              <div className="bg-[#0f241a] p-4 rounded-xl border border-[#1e4633]">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                  Reported Medical Conditions
                </h4>
                <p className="text-sm text-gray-200">
                  {client.medical_conditions || "No chronic medical conditions or allergies reported by client."}
                </p>
              </div>

              {client.notes && (
                <div className="bg-[#0f241a] p-4 rounded-xl border border-[#1e4633]">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                    Admin Assignment Notes
                  </h4>
                  <p className="text-sm text-gray-200 italic">"{client.notes}"</p>
                </div>
              )}
            </div>
          </div>

          {/* Fitness Goal & Readiness Column */}
          <div className="space-y-6">
            <div className="bg-[#163829] border border-[#23533d] rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" /> Fitness Goal & Activity
              </h3>

              <div className="space-y-3">
                <div>
                  <span className="text-xs text-gray-400">Primary Objective</span>
                  <div className="font-semibold text-emerald-300 text-base mt-0.5">
                    {client.fitness_goal || "General Health & Fitness"}
                  </div>
                </div>

                <div className="pt-2 border-t border-[#1e4633]">
                  <span className="text-xs text-gray-400">Baseline Activity Level</span>
                  <div className="font-semibold text-white text-sm mt-0.5">
                    {client.activity_level || "Moderate Activity"}
                  </div>
                </div>
              </div>
            </div>

            {/* Readiness Box */}
            <div className="bg-gradient-to-br from-[#163829] to-[#0f241a] border border-emerald-500/30 rounded-2xl p-6 space-y-3">
              <h4 className="font-bold text-white text-base">Ready for Action</h4>
              <p className="text-xs text-gray-300 leading-relaxed">
                With this client successfully assigned to you, you can now seamlessly construct custom workout routines and daily nutrition macros tailored to their BMI ({client.bmi || "N/A"}) and goal ({client.fitness_goal || "General Fitness"}).
              </p>
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate("/trainer/workout-plans")}
                  className="w-full justify-center text-xs"
                >
                  Create Workout Plan →
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate("/trainer/diet-plans")}
                  className="w-full justify-center text-xs border-emerald-500/30"
                >
                  Create Diet Plan →
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Workouts Tab (Module 8) */}
      {activeTab === "workouts" && (
        <div className="bg-[#163829] border border-[#23533d] rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400 border border-emerald-500/20">
            <Dumbbell className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Workout Plan Management (Module 8)</h3>
          <p className="text-sm text-gray-400 max-w-lg mx-auto">
            You can create, customize, and assign multi-week workout programs with exercises, sets, reps, and video tutorials directly to <strong>{name}</strong>.
          </p>
          <div className="pt-2 flex justify-center">
            <Button variant="primary" onClick={() => navigate("/trainer/workout-plans")} className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4" /> Go to Workout Plan Builder →
            </Button>
          </div>
        </div>
      )}

      {/* Diets Tab (Module 9) */}
      {activeTab === "diets" && (
        <div className="bg-[#163829] border border-[#23533d] rounded-2xl p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto text-emerald-400 border border-emerald-500/20">
            <Utensils className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">Diet & Nutrition Planning (Module 9)</h3>
          <p className="text-sm text-gray-400 max-w-lg mx-auto">
            You can create, customize, and assign multi-week calorie and macronutrient targeted diet programs with meal schedules directly to <strong>{name}</strong>.
          </p>
          <div className="pt-2 flex justify-center">
            <Button variant="primary" onClick={() => navigate("/trainer/diet-plans")} className="flex items-center gap-2">
              <Utensils className="w-4 h-4" /> Go to Diet Plan Builder →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDetail;
