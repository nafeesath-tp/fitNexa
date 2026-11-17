import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { confirmDialog } from "../../components/ui/CustomAlert";
import { Users, UserPlus, X, Trash2, Dumbbell, Utensils, ArrowLeft } from "lucide-react";
import { clientManagementApi } from "../../services/clientManagementApi";
import { workoutApi } from "../../services/workoutApi";
import { dietApi } from "../../services/dietApi";
import { PageHeader } from "../../components/ui/LayoutComponents";
import Button from "../../components/ui/Button";

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [eligibleClients, setEligibleClients] = useState([]);
  const [workoutPlans, setWorkoutPlans] = useState([]);
  const [dietPlans, setDietPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isAssignWorkoutModalOpen, setIsAssignWorkoutModalOpen] = useState(false);
  const [isAssignDietModalOpen, setIsAssignDietModalOpen] = useState(false);

  // Form states
  const [selectedClientTaId, setSelectedClientTaId] = useState("");
  const [selectedWorkoutPlanId, setSelectedWorkoutPlanId] = useState("");
  const [selectedDietPlanId, setSelectedDietPlanId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [groupRes, eligibleRes, workoutRes, dietRes] = await Promise.all([
        clientManagementApi.getTrainerGroupDetail(id),
        clientManagementApi.getEligibleGroupClients(id),
        workoutApi.getTrainerPlans(),
        dietApi.getTrainerPlans(),
      ]);
      setGroup(groupRes.data);
      setEligibleClients(eligibleRes.data || []);
      setWorkoutPlans(workoutRes.data || []);
      setDietPlans(dietRes.data || []);
    } catch (error) {
      toast.error("Failed to load batch details.");
      navigate("/trainer/groups");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, [id]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedClientTaId) return toast.error("Please select a client.");
    try {
      setIsSubmitting(true);
      await clientManagementApi.addGroupMember(id, { trainer_assignment_id: selectedClientTaId });
      toast.success("Member added successfully!");
      setIsAddMemberModalOpen(false);
      setSelectedClientTaId("");
      fetchAllData();
    } catch (error) {
      toast.error(error.response?.data?.detail || error.response?.data?.message || "Failed to add member.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (taId) => {
    const confirmed = await confirmDialog({
      title: "Remove Member",
      message: "Are you sure you want to remove this client from the batch?",
      confirmText: "Remove Client",
      variant: "danger",
    });
    if (!confirmed) return;
    try {
      await clientManagementApi.removeGroupMember(id, taId);
      toast.success("Member removed.");
      fetchAllData();
    } catch (error) {
      toast.error("Failed to remove member.");
    }
  };

  const handleAssignWorkout = async (e) => {
    e.preventDefault();
    if (!selectedWorkoutPlanId) return toast.error("Please select a plan.");
    try {
      setIsSubmitting(true);
      await clientManagementApi.assignWorkoutToGroup(id, { plan_id: selectedWorkoutPlanId });
      toast.success("Workout plan assigned to all members!");
      setIsAssignWorkoutModalOpen(false);
      setSelectedWorkoutPlanId("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAssignDiet = async (e) => {
    e.preventDefault();
    if (!selectedDietPlanId) return toast.error("Please select a plan.");
    try {
      setIsSubmitting(true);
      await clientManagementApi.assignDietToGroup(id, { plan_id: selectedDietPlanId });
      toast.success("Diet plan assigned to all members!");
      setIsAssignDietModalOpen(false);
      setSelectedDietPlanId("");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign plan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !group) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate("/trainer/groups")}
            className="flex items-center text-emerald-500 hover:text-emerald-400 font-medium mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Batches
          </button>
          <h1 className="text-3xl font-bold text-white">{group.name}</h1>
          <p className="text-gray-400 mt-1">{group.description || "No description provided."}</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => setIsAssignWorkoutModalOpen(true)} className="flex items-center gap-2 bg-[#163829] border border-emerald-500/30 hover:border-emerald-500 text-emerald-400">
            <Dumbbell className="w-4 h-4" /> Assign Workout
          </Button>
          <Button onClick={() => setIsAssignDietModalOpen(true)} className="flex items-center gap-2 bg-[#163829] border border-blue-500/30 hover:border-blue-500 text-blue-400">
            <Utensils className="w-4 h-4" /> Assign Diet
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#163829] p-5 rounded-2xl border border-[#23533d] flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{group.member_count} / {group.max_members}</div>
            <div className="text-xs text-gray-400">Capacity</div>
          </div>
        </div>
      </div>

      {/* Members Section */}
      <div className="bg-[#163829] rounded-2xl border border-[#23533d] overflow-hidden">
        <div className="p-6 border-b border-[#23533d] flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">Batch Members</h2>
          <Button 
            onClick={() => setIsAddMemberModalOpen(true)} 
            disabled={group.is_full}
            size="sm"
            className="flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" /> Add Member
          </Button>
        </div>

        {group.members.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400">No members in this batch yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#23533d]">
            {group.members.map((member) => (
              <div key={member.trainer_assignment_id} className="p-4 flex items-center justify-between hover:bg-[#1a4231] transition-colors">
                <div>
                  <div className="font-semibold text-white">
                    {member.first_name} {member.last_name}
                  </div>
                  <div className="text-sm text-gray-400">{member.email}</div>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.trainer_assignment_id)}
                  className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                  title="Remove from batch"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD MEMBER MODAL */}
      {isAddMemberModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f281e] w-full max-w-md rounded-3xl border border-[#23533d] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#23533d]">
              <h3 className="text-xl font-bold text-white">Add Member</h3>
              <button onClick={() => setIsAddMemberModalOpen(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Select Eligible Client</label>
                {eligibleClients.length === 0 ? (
                  <p className="text-sm text-amber-400 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                    No eligible clients found. Clients must be on a GROUP plan and not currently in any batch.
                  </p>
                ) : (
                  <select
                    required
                    value={selectedClientTaId}
                    onChange={(e) => setSelectedClientTaId(e.target.value)}
                    className="w-full bg-[#163829] border border-[#23533d] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Client --</option>
                    {eligibleClients.map(c => (
                      <option key={c.trainer_assignment_id} value={c.trainer_assignment_id}>
                        {c.first_name} {c.last_name} ({c.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAddMemberModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={eligibleClients.length === 0} isLoading={isSubmitting}>Add to Batch</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN WORKOUT MODAL */}
      {isAssignWorkoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f281e] w-full max-w-md rounded-3xl border border-[#23533d] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#23533d]">
              <h3 className="text-xl font-bold text-white">Assign Workout Plan</h3>
              <button onClick={() => setIsAssignWorkoutModalOpen(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignWorkout} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Select Workout Plan</label>
                {workoutPlans.length === 0 ? (
                  <p className="text-sm text-gray-400">You haven't created any workout plans yet.</p>
                ) : (
                  <select
                    required
                    value={selectedWorkoutPlanId}
                    onChange={(e) => setSelectedWorkoutPlanId(e.target.value)}
                    className="w-full bg-[#163829] border border-[#23533d] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Plan --</option>
                    {workoutPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAssignWorkoutModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={workoutPlans.length === 0} isLoading={isSubmitting}>Assign to Batch</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGN DIET MODAL */}
      {isAssignDietModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f281e] w-full max-w-md rounded-3xl border border-[#23533d] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#23533d]">
              <h3 className="text-xl font-bold text-white">Assign Diet Plan</h3>
              <button onClick={() => setIsAssignDietModalOpen(false)} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAssignDiet} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Select Diet Plan</label>
                {dietPlans.length === 0 ? (
                  <p className="text-sm text-gray-400">You haven't created any diet plans yet.</p>
                ) : (
                  <select
                    required
                    value={selectedDietPlanId}
                    onChange={(e) => setSelectedDietPlanId(e.target.value)}
                    className="w-full bg-[#163829] border border-[#23533d] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Plan --</option>
                    {dietPlans.map(p => (
                      <option key={p.id} value={p.id}>{p.title}</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="pt-4 flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsAssignDietModalOpen(false)}>Cancel</Button>
                <Button type="submit" className="flex-1" disabled={dietPlans.length === 0} isLoading={isSubmitting}>Assign to Batch</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;
