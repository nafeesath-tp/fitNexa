import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Plus, Dumbbell, Trash2, Eye, UserCheck, ChevronRight, Flame, Clock, Star } from "lucide-react";
import { workoutApi } from "../../services/workoutApi";
import { clientManagementApi } from "../../services/clientManagementApi";
import { useWorkoutStore } from "../../stores/workoutStore";
import { PageHeader } from "../../components/ui/LayoutComponents";
import Modal from "../../components/ui/Modal";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";

const DIFFICULTY_META = {
  BEGINNER:     { label: "Beginner",     color: "bg-green-500/20 text-green-300 border-green-500/30" },
  INTERMEDIATE: { label: "Intermediate", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30" },
  ADVANCED:     { label: "Advanced",     color: "bg-red-500/20 text-red-300 border-red-500/30" },
};

export default function WorkoutPlans() {
  const navigate = useNavigate();
  const { trainerPlans, setTrainerPlans, addTrainerPlan, removeTrainerPlan } = useWorkoutStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Plan Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", difficulty: "BEGINNER", duration_weeks: 4,
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
      const res = await workoutApi.getTrainerPlans();
      setTrainerPlans(res.data || []);
    } catch {
      toast.error("Failed to load workout plans.");
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
      const res = await workoutApi.createPlan(formData);
      addTrainerPlan(res.data);
      toast.success(`"${res.data.title}" created!`);
      setIsCreateOpen(false);
      setFormData({ title: "", description: "", difficulty: "BEGINNER", duration_weeks: 4 });
      // Navigate to builder
      navigate(`/trainer/workout-plans/${res.data.id}`);
    } catch {
      toast.error("Failed to create plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (plan) => {
    if (!window.confirm(`Delete "${plan.title}"? This cannot be undone.`)) return;
    try {
      await workoutApi.deletePlan(plan.id);
      removeTrainerPlan(plan.id);
      toast.success("Plan deactivated.");
    } catch {
      toast.error("Failed to delete plan.");
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
      await workoutApi.assignPlan(assigningPlan.id, Number(selectedAssignmentId));
      toast.success(`"${assigningPlan.title}" assigned to client!`);
      setIsAssignOpen(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-6 space-y-6">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Workout Plans"
          description="Create structured training templates, build week-by-week programs, and assign them to your clients."
        />
        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : trainerPlans.length === 0 ? (
        <div className="bg-[#163829] border border-[#23533d] border-dashed rounded-2xl p-16 text-center space-y-4">
          <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
            <Dumbbell className="w-8 h-8 text-emerald-500/50" />
          </div>
          <h3 className="text-lg font-bold text-white">No Workout Plans Yet</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            Start by creating your first workout template. You can then add weeks, days, and exercises to build a complete program.
          </p>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)} className="mx-auto flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create First Plan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {trainerPlans.map((plan) => {
            const diff = DIFFICULTY_META[plan.difficulty] || DIFFICULTY_META.BEGINNER;
            return (
              <div
                key={plan.id}
                className="bg-[#163829] border border-[#23533d] hover:border-emerald-500/40 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-xl hover:shadow-emerald-950/30 group"
              >
                {/* Card Header */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors line-clamp-2">
                      {plan.title}
                    </h3>
                    <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${diff.color}`}>
                      {diff.label}
                    </span>
                  </div>

                  {plan.description && (
                    <p className="text-xs text-gray-400 line-clamp-2">{plan.description}</p>
                  )}

                  {/* Stats Row */}
                  <div className="flex items-center gap-4 text-xs text-gray-400 border-t border-[#1e4633] pt-3">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-emerald-500/60" />
                      {plan.duration_weeks} weeks
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-500/60" />
                      {plan.total_exercises || 0} exercises
                    </span>
                    {plan.specialization_name && (
                      <span className="flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5 text-yellow-500/60" />
                        {plan.specialization_name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-[#1e4633]">
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => navigate(`/trainer/workout-plans/${plan.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-500"
                  >
                    <Eye className="w-3.5 h-3.5" /> View / Build
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => openAssignModal(plan)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs"
                  >
                    <UserCheck className="w-3.5 h-3.5" /> Assign
                  </Button>
                  <button
                    onClick={() => handleDelete(plan)}
                    className="p-2 rounded-lg bg-[#0f241a] border border-[#23533d] text-red-400 hover:border-red-500/30 transition-colors"
                    title="Delete plan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create New Workout Plan">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">
              Plan Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Weight Loss Beginner 4-Week"
              className="w-full bg-[#0f241a] border border-[#23533d] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-200 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief overview of this program..."
              rows={2}
              className="w-full bg-[#0f241a] border border-[#23533d] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full bg-[#0f241a] border border-[#23533d] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="BEGINNER">Beginner</option>
                <option value="INTERMEDIATE">Intermediate</option>
                <option value="ADVANCED">Advanced</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">Duration (weeks)</label>
              <input
                type="number"
                min={1}
                max={52}
                value={formData.duration_weeks}
                onChange={(e) => setFormData({ ...formData, duration_weeks: Number(e.target.value) })}
                className="w-full bg-[#0f241a] border border-[#23533d] rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-[#1e4633]">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreate} isLoading={isSubmitting}>
              Create & Build Plan →
            </Button>
          </div>
        </div>
      </Modal>

      {/* Assign Plan Modal */}
      {assigningPlan && (
        <Modal isOpen={isAssignOpen} onClose={() => setIsAssignOpen(false)} title="Assign Workout Plan to Client">
          <div className="space-y-4">
            <div className="bg-[#0f241a] p-3 rounded-xl border border-[#1e4633] flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Plan being assigned</div>
                <div className="font-bold text-white mt-0.5">{assigningPlan.title}</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${(DIFFICULTY_META[assigningPlan.difficulty] || DIFFICULTY_META.BEGINNER).color}`}>
                {(DIFFICULTY_META[assigningPlan.difficulty] || DIFFICULTY_META.BEGINNER).label}
              </span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-200 mb-1">
                Select Client <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="w-full bg-[#0f241a] border border-[#23533d] rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Select an assigned client --</option>
                {myClients.map((c) => {
                  const name = `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email;
                  return (
                    <option key={c.assignment_id} value={c.assignment_id}>
                      {name} ({c.subscription_plan || "FREE"})
                    </option>
                  );
                })}
              </select>
              {myClients.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">No assigned clients found.</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-[#1e4633]">
              <Button variant="ghost" onClick={() => setIsAssignOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleAssign} isLoading={isSubmitting} disabled={!selectedAssignmentId}>
                Assign Plan
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
