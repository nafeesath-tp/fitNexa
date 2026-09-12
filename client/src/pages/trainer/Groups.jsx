import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Users, Plus, X } from "lucide-react";
import { clientManagementApi } from "../../services/clientManagementApi";
import { PageHeader } from "../../components/ui/LayoutComponents";
import Button from "../../components/ui/Button";

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "", max_members: 10 });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      const res = await clientManagementApi.getTrainerGroups();
      setGroups(res.data || []);
    } catch (error) {
      toast.error("Failed to load batches.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return toast.error("Batch name is required");
    
    try {
      setIsSubmitting(true);
      await clientManagementApi.createTrainerGroup(formData);
      toast.success("Batch created successfully!");
      setIsModalOpen(false);
      setFormData({ name: "", description: "", max_members: 10 });
      fetchGroups();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create batch.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="My Batches"
          description="Create and manage client batches for group training."
        />
        <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Create New Batch
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-[#163829] border border-[#23533d] rounded-2xl p-12 text-center">
          <Users className="w-12 h-12 text-emerald-500 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">No Batches Yet</h3>
          <p className="text-gray-400 max-w-md mx-auto">
            Click <strong className="text-white">"Create New Batch"</strong> above to group your clients into batches and assign shared workout & diet plans to them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/trainer/groups/${group.id}`}
              className="group bg-[#163829] border border-[#23533d] rounded-2xl p-6 hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                  <Users className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 font-medium tracking-wider uppercase">Capacity</span>
                  <div className={`text-lg font-bold ${group.is_full ? 'text-red-400' : 'text-white'}`}>
                    {group.member_count} / {group.max_members}
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
                {group.name}
              </h3>
              <p className="text-sm text-gray-400 line-clamp-2">
                {group.description || "No description provided."}
              </p>
            </Link>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0f281e] w-full max-w-md rounded-3xl border border-[#23533d] overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b border-[#23533d]">
              <h3 className="text-xl font-bold text-white">Create New Batch</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Batch Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#163829] border border-[#23533d] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                  placeholder="e.g., Morning Warriors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Max Members</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.max_members}
                  onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) })}
                  className="w-full bg-[#163829] border border-[#23533d] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Description (Optional)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#163829] border border-[#23533d] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all min-h-[100px] resize-none"
                  placeholder="What is this batch focus?"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  isLoading={isSubmitting}
                >
                  Create Batch
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
