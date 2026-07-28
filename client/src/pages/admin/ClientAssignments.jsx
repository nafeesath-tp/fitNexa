import React, { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { UserCheck, RefreshCw, Search, ArrowRight, UserPlus } from "lucide-react";
import { clientManagementApi } from "../../services/clientManagementApi";
import { adminApi } from "../../services/admin/adminApi";
import { PageHeader } from "../../components/ui/LayoutComponents";
import DataTable from "../../components/admin/DataTable";
import Modal from "../../components/ui/Modal";
import Badge from "../../components/ui/Badge";
import Avatar from "../../components/ui/Avatar";
import Button from "../../components/ui/Button";

const ClientAssignments = () => {
  const [clients, setClients] = useState([]);
  const [approvedTrainers, setApprovedTrainers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedTrainerId, setSelectedTrainerId] = useState("");
  const [notes, setNotes] = useState("");

  const fetchAssignments = async () => {
    try {
      setIsLoading(true);
      const params = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await clientManagementApi.getAdminClientAssignments(params);
      setClients(res.data || []);
    } catch (error) {
      toast.error("Failed to load client assignments.");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTrainers = async () => {
    try {
      const res = await adminApi.getTrainers();
      const list = res.data || res || [];
      const approved = list.filter((t) => t.approval_status === "APPROVED");
      setApprovedTrainers(approved);
    } catch (error) {
      console.error("Failed to fetch trainers:", error);
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [statusFilter]);

  useEffect(() => {
    fetchTrainers();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchAssignments();
  };

  const openAssignModal = (client) => {
    setSelectedClient(client);
    setSelectedTrainerId(client.assigned_trainer ? client.assigned_trainer.id : "");
    setNotes("");
    setIsModalOpen(true);
  };

  const handleSaveAssignment = async () => {
    if (!selectedTrainerId) {
      toast.error("Please select a trainer.");
      return;
    }

    try {
      setIsSubmitting(true);
      if (selectedClient.is_assigned) {
        // Reassign
        await clientManagementApi.reassignTrainer(selectedClient.id, {
          trainer_id: Number(selectedTrainerId),
          notes,
        });
        toast.success(`Successfully reassigned trainer for ${selectedClient.first_name || selectedClient.email}.`);
      } else {
        // Assign
        await clientManagementApi.assignTrainer({
          client_id: selectedClient.id,
          trainer_id: Number(selectedTrainerId),
          notes,
        });
        toast.success(`Successfully assigned trainer to ${selectedClient.first_name || selectedClient.email}.`);
      }
      setIsModalOpen(false);
      fetchAssignments();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to assign trainer.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTierBadge = (plan) => {
    switch (plan) {
      case "PREMIUM":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">PREMIUM</span>;
      case "GROUP":
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">GROUP</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30">FREE</span>;
    }
  };

  const columns = [
    {
      header: "Client",
      accessor: "client",
      render: (row) => {
        const name = `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email.split("@")[0];
        return (
          <div className="flex items-center gap-3">
            <Avatar image={row.profile_picture} name={name} size="md" />
            <div>
              <div className="font-semibold text-white">{name}</div>
              <div className="text-xs text-gray-400">{row.email}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Subscription Tier",
      accessor: "subscription_plan",
      render: (row) => getTierBadge(row.subscription_plan),
    },
    {
      header: "Assigned Trainer",
      accessor: "assigned_trainer",
      render: (row) => {
        if (!row.is_assigned || !row.assigned_trainer) {
          return <span className="text-gray-500 italic text-sm">Unassigned</span>;
        }
        const t = row.assigned_trainer;
        const tName = `${t.first_name || ""} ${t.last_name || ""}`.trim() || t.email.split("@")[0];
        return (
          <div className="flex items-center gap-2.5 bg-[#163829] px-3 py-1.5 rounded-lg border border-[#23533d] w-fit">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-medium text-sm text-emerald-200">{tName}</span>
            {t.specialization && (
              <span className="text-xs bg-[#0f241a] px-2 py-0.5 rounded text-emerald-400 border border-emerald-500/20">
                {t.specialization}
              </span>
            )}
          </div>
        );
      },
    },
    {
      header: "Status",
      accessor: "is_assigned",
      render: (row) => (
        <Badge variant={row.is_assigned ? "success" : "warning"}>
          {row.is_assigned ? "Assigned" : "Pending Assignment"}
        </Badge>
      ),
    },
    {
      header: "Actions",
      accessor: "actions",
      render: (row) => (
        <Button
          variant={row.is_assigned ? "outline" : "primary"}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            openAssignModal(row);
          }}
          className="flex items-center gap-1.5 text-xs py-1.5"
        >
          {row.is_assigned ? (
            <>
              <RefreshCw className="w-3.5 h-3.5" /> Reassign
            </>
          ) : (
            <>
              <UserPlus className="w-3.5 h-3.5" /> Assign Trainer
            </>
          )}
        </Button>
      ),
    },
  ];

  return (
    <div className="py-6 space-y-6">
      <PageHeader
        title="Trainer Assignments"
        description="Pair active FitNexa subscribers with certified personal trainers for workout and nutrition guidance."
      />

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#163829] p-4 rounded-xl border border-[#23533d]">
        <div className="flex items-center gap-2 bg-[#0f241a] p-1 rounded-lg border border-[#1e4633]">
          {["all", "assigned", "unassigned"].map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-4 py-1.5 rounded-md text-xs font-semibold capitalize transition-all ${
                statusFilter === tab
                  ? "bg-emerald-500 text-white shadow-md shadow-emerald-900/40"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab === "all" ? "All Clients" : tab}
            </button>
          ))}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search client name or email..."
              className="w-full bg-[#0f241a] border border-[#23533d] rounded-lg pl-9 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <Button type="submit" size="sm" variant="secondary">
            Filter
          </Button>
        </form>
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={clients}
        loading={isLoading}
        emptyMessage="No clients found matching the selected filters."
      />

      {/* Assignment Modal */}
      {selectedClient && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={selectedClient.is_assigned ? "Reassign Personal Trainer" : "Assign Personal Trainer"}
        >
          <div className="space-y-5">
            {/* Client Summary Box */}
            <div className="bg-[#0f241a] p-4 rounded-xl border border-[#1e4633] flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-400">Target Client</div>
                <div className="font-semibold text-white text-base mt-0.5">
                  {selectedClient.first_name || selectedClient.email.split("@")[0]}
                </div>
                <div className="text-xs text-gray-400">{selectedClient.email}</div>
              </div>
              <div>{getTierBadge(selectedClient.subscription_plan)}</div>
            </div>

            {/* Current Assignment if Reassigning */}
            {selectedClient.is_assigned && selectedClient.assigned_trainer && (
              <div className="bg-amber-500/10 border border-amber-500/30 p-3 rounded-lg text-xs text-amber-300 flex items-center justify-between">
                <span>Current Trainer: <strong>{selectedClient.assigned_trainer.first_name || selectedClient.assigned_trainer.email}</strong></span>
                <span className="italic">Will be replaced</span>
              </div>
            )}

            {/* Trainer Selection Dropdown */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">
                Select Approved Trainer <span className="text-red-400">*</span>
              </label>
              <select
                value={selectedTrainerId}
                onChange={(e) => setSelectedTrainerId(e.target.value)}
                className="w-full bg-[#0f241a] border border-[#23533d] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500 text-sm"
              >
                <option value="">-- Choose an approved trainer --</option>
                {approvedTrainers.map((t) => {
                  const tName = `${t.name || t.first_name || ""} ${t.last_name || ""}`.trim() || t.email;
                  const spec = t.specialization || t.specialization_name || "General";
                  return (
                    <option key={t.id} value={t.id}>
                      {tName} ({spec}) - {t.experience || 0} yrs exp
                    </option>
                  );
                })}
              </select>
              {approvedTrainers.length === 0 && (
                <p className="text-xs text-amber-400 mt-1">No approved trainers found in the system.</p>
              )}
            </div>

            {/* Notes Textarea */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-200">
                Assignment Notes / Instructions <span className="text-xs text-gray-400">(Optional)</span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g., Assigned for personalized Yoga coaching and knee rehab support."
                rows={3}
                className="w-full bg-[#0f241a] border border-[#23533d] rounded-xl px-4 py-2 text-white text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-[#1e4633]">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveAssignment}
                disabled={isSubmitting || !selectedTrainerId}
                className="flex items-center gap-2"
              >
                {isSubmitting ? "Saving..." : selectedClient.is_assigned ? "Confirm Reassignment" : "Confirm Assignment"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ClientAssignments;
