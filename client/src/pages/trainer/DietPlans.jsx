import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Utensils, Trash2, Eye, UserCheck, Flame, Clock, Star } from "lucide-react";
import { dietApi } from "../../services/dietApi";
import { clientManagementApi } from "../../services/clientManagementApi";
import { useDietStore } from "../../stores/dietStore";
import { PageHeader } from "../../components/ui/LayoutComponents";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";

const GOAL_META = {
  WEIGHT_LOSS:  { label: "Weight Loss",     color: "bg-green-500/20 text-green-300 border-green-500/30" },
  MUSCLE_GAIN:  { label: "Muscle Gain",     color: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
  MAINTENANCE:  { label: "Maintenance",     color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  ENDURANCE:    { label: "Endurance",       color: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  GENERAL:      { label: "General Fitness", color: "bg-gray-500/20 text-gray-300 border-gray-500/30" },
};

export default function DietPlans() {
  const navigate = useNavigate();
  const { trainerPlans, setTrainerPlans, addTrainerPlan, removeTrainerPlan } = useDietStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Plan Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", calories: 1800, goal: "WEIGHT_LOSS", duration_weeks: 4,
  });

  // Assign Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assigningPlan, setAssigningPlan] = useState(null);
  const [myClients, setMyClients] = useState([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState("");

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setIsLoading(true);
      const res = await dietApi.getTrainerPlans();
      setTrainerPlans(res.data || []);
    } catch {
      toast.error("Failed to load diet plans.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast.error("Plan title is required.");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await dietApi.createPlan({
        ...formData,
        calories: Number(formData.calories) || 1800,
        duration_weeks: Number(formData.duration_weeks) || 4,
      });
      addTrainerPlan(res.data);
      toast.success(`"${res.data.title}" created!`);
      setIsCreateOpen(false);
      setFormData({ title: "", description: "", calories: 1800, goal: "WEIGHT_LOSS", duration_weeks: 4 });
      navigate(`/trainer/diet-plans/${res.data.id}`);
    } catch {
      toast.error("Failed to create diet plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete "${plan.title}"? This cannot be undone.`)) return;
    try {
      await dietApi.deletePlan(plan.id);
      removeTrainerPlan(plan.id);
      toast.success("Diet plan deactivated.");
    } catch {
      toast.error("Failed to delete diet plan.");
    }
  };

  const openAssignModal = async (plan) => {
    setAssigningPlan(plan);
    setSelectedAssignmentId("");
    setIsAssignOpen(true);
    if (myClients.length === 0) {
      try {
        const res = await clientManagementApi.getTrainerMyClients();
        setMyClients(res.data || []);
      } catch {
        toast.error("Failed to load client list.");
      }
    }
  };

  const handleAssign = async () => {
    if (!selectedAssignmentId) {
      toast.error("Please select a client.");
      return;
    }
    try {
      setIsSubmitting(true);
      await dietApi.assignPlan(assigningPlan.id, Number(selectedAssignmentId));
      toast.success(`"${assigningPlan.title}" assigned to client!`);
      setIsAssignOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to assign diet plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Diet & Nutrition Library"
        description="Design multi-week calorie and macro targeted diet plans for your clients."
        action={
          <Button onClick={() => setIsCreateOpen(true)} className="flex items-center gap-2 shadow-lg shadow-green-500/20">
            <Plus className="w-4 h-4" /> New Diet Plan
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500" />
        </div>
      ) : trainerPlans.length === 0 ? (
        <div className="bg-gray-900/60 border border-gray-800/80 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto text-green-400">
            <Utensils className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white">No Diet Plans Yet</h3>
          <p className="text-gray-400 text-sm">
            Create structured meal templates with calories and macronutrient splits to assign to your personal training roster.
          </p>
          <Button onClick={() => setIsCreateOpen(true)} variant="secondary" className="mt-4">
            Create Your First Diet Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainerPlans.map((plan) => {
            const meta = GOAL_META[plan.goal] || GOAL_META.GENERAL;
            return (
              <div
                key={plan.id}
                className="bg-gray-900/70 border border-gray-800/80 rounded-2xl p-6 flex flex-col justify-between hover:border-green-500/50 transition-all duration-300 shadow-xl group"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-white group-hover:text-green-400 transition-colors">
                      {plan.title}
                    </h3>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium border whitespace-nowrap ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>

                  {plan.description && (
                    <p className="text-sm text-gray-400 line-clamp-2">{plan.description}</p>
                  )}

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800/60 text-xs">
                    <div className="bg-gray-800/40 p-2 rounded-xl border border-gray-700/30 flex flex-col items-center">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5 text-orange-400" /> Target
                      </span>
                      <span className="font-bold text-white mt-0.5">{plan.calories} kcal</span>
                    </div>
                    <div className="bg-gray-800/40 p-2 rounded-xl border border-gray-700/30 flex flex-col items-center">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-400" /> Duration
                      </span>
                      <span className="font-bold text-white mt-0.5">{plan.duration_weeks} Wks</span>
                    </div>
                    <div className="bg-gray-800/40 p-2 rounded-xl border border-gray-700/30 flex flex-col items-center">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Utensils className="w-3.5 h-3.5 text-green-400" /> Meals
                      </span>
                      <span className="font-bold text-white mt-0.5">{plan.meal_count || 0}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-6 mt-6 border-t border-gray-800/80 flex items-center justify-between gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigate(`/trainer/diet-plans/${plan.id}`)}
                      className="p-2 rounded-xl bg-gray-800/80 hover:bg-green-500/20 text-gray-300 hover:text-green-400 border border-gray-700/50 hover:border-green-500/40 transition-all flex items-center gap-1.5 text-xs font-semibold px-3"
                      title="Open Builder"
                    >
                      <Eye className="w-4 h-4" /> Build Meals
                    </button>
                    <button
                      onClick={() => openAssignModal(plan)}
                      className="p-2 rounded-xl bg-gray-800/80 hover:bg-blue-500/20 text-gray-300 hover:text-blue-400 border border-gray-700/50 hover:border-blue-500/40 transition-all flex items-center gap-1.5 text-xs font-semibold px-3"
                      title="Assign to Client"
                    >
                      <UserCheck className="w-4 h-4" /> Assign
                    </button>
                  </div>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="p-2 rounded-xl bg-gray-800/50 hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete Plan"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Diet Plan"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Plan Title *</label>
            <input
              type="text"
              placeholder="e.g. Weight Loss & Shred - 1800 kcal"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Description</label>
            <textarea
              placeholder="Brief overview of the diet strategy, meal timing, or water guidelines..."
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Daily Target Calories</label>
              <input
                type="number"
                min="500"
                max="6000"
                step="50"
                value={formData.calories}
                onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">Duration (Weeks)</label>
              <input
                type="number"
                min="1"
                max="52"
                value={formData.duration_weeks}
                onChange={(e) => setFormData({ ...formData, duration_weeks: e.target.value })}
                className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1">Goal Type</label>
            <select
              value={formData.goal}
              onChange={(e) => setFormData({ ...formData, goal: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-green-500"
            >
              <option value="WEIGHT_LOSS">Weight Loss</option>
              <option value="MUSCLE_GAIN">Muscle Gain</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="ENDURANCE">Endurance</option>
              <option value="GENERAL">General Fitness</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create & Build Meals"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Modal */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={`Assign "${assigningPlan?.title}"`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Select one of your active assigned clients. Assigning this diet will replace any previously active diet plan they have.
          </p>

          {myClients.length === 0 ? (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center text-yellow-300 text-sm">
              You currently have no active clients assigned to you by admin.
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-2">Select Client</label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {myClients.map((client) => {
                  const isSelected = String(selectedAssignmentId) === String(client.assignment_id);
                  return (
                    <div
                      key={client.assignment_id}
                      onClick={() => setSelectedAssignmentId(client.assignment_id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-green-500/10 border-green-500 text-white"
                          : "bg-gray-900/60 border-gray-800 text-gray-300 hover:border-gray-700"
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-sm">
                          {client.first_name || client.last_name
                            ? `${client.first_name || ""} ${client.last_name || ""}`.trim()
                            : client.email}
                        </div>
                        <div className="text-xs text-gray-400">{client.email} • {client.goal || "General Fitness"}</div>
                      </div>
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                        isSelected ? "border-green-500 bg-green-500 text-black font-bold text-xs" : "border-gray-600"
                      }`}>
                        {isSelected && "✓"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
            <Button variant="secondary" onClick={() => setIsAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssign} disabled={isSubmitting || !selectedAssignmentId}>
              {isSubmitting ? "Assigning..." : "Confirm Assignment"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
