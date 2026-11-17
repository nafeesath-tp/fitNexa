import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Users, Search, Activity, Utensils, ArrowRight, ShieldCheck, MessageSquare, Dumbbell } from "lucide-react";
import { clientManagementApi } from "../../services/clientManagementApi";
import { chatApi } from "../../services/chatApi";
import { useChatStore } from "../../stores/chatStore";
import { PageHeader } from "../../components/ui/LayoutComponents";
import Avatar from "../../components/ui/Avatar";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";

const MyClients = () => {
  const [clients, setClients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  const fetchMyClients = async () => {
    try {
      setIsLoading(true);
      const res = await clientManagementApi.getTrainerMyClients();
      setClients(res.data || []);
    } catch (error) {
      toast.error("Failed to load your assigned clients.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMyClients();
  }, []);

  const filteredClients = clients.filter((c) => {
    const name = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
    const email = (c.email || "").toLowerCase();
    const q = searchTerm.toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  const getTierBadge = (plan) => {
    switch (plan) {
      case "PREMIUM":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">PREMIUM</span>;
      case "GROUP":
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">GROUP</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-500/20 text-gray-300 border border-gray-500/30">FREE</span>;
    }
  };

  return (
    <div className="py-6 space-y-6">
      <PageHeader
        title="My Assigned Clients"
        description="Monitor physical progress, review health stats, and design customized workout and nutrition programs."
      />

      {/* Top Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#163829] p-5 rounded-2xl border border-[#23533d] flex items-center gap-4">
          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">{clients.length}</div>
            <div className="text-xs text-gray-400">Total Assigned Clients</div>
          </div>
        </div>

        <div className="bg-[#163829] p-5 rounded-2xl border border-[#23533d] flex items-center gap-4">
          <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {clients.filter((c) => c.subscription_plan === "PREMIUM").length}
            </div>
            <div className="text-xs text-gray-400">Premium VIP Clients</div>
          </div>
        </div>

        <div className="bg-[#163829] p-5 rounded-2xl border border-[#23533d] flex items-center gap-4">
          <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white">
              {clients.filter((c) => c.subscription_plan === "GROUP").length}
            </div>
            <div className="text-xs text-gray-400">Group Tier Clients</div>
          </div>
        </div>
      </div>

      {/* Search Filter Bar */}
      <div className="flex items-center justify-between bg-[#163829] p-4 rounded-xl border border-[#23533d]">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search clients by name or email..."
            className="w-full bg-[#0f241a] border border-[#23533d] rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>
      </div>

      {/* Clients Grid */}
      {isLoading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-[#163829] border border-[#23533d] rounded-2xl p-12 text-center space-y-3">
          <Users className="w-12 h-12 text-gray-500 mx-auto" />
          <h3 className="text-lg font-semibold text-white">No Assigned Clients Found</h3>
          <p className="text-sm text-gray-400 max-w-md mx-auto">
            When an administrator assigns subscribing clients to your coaching roster, they will appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => {
            const name = `${client.first_name || ""} ${client.last_name || ""}`.trim() || client.email.split("@")[0];
            return (
              <div
                key={client.client_id}
                onClick={() => navigate(`/trainer/clients/${client.client_id}`)}
                className="bg-[#163829] border border-[#23533d] hover:border-emerald-500/50 rounded-2xl p-5 transition-all duration-200 hover:shadow-xl hover:shadow-emerald-950/30 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar image={client.profile_picture} name={name} size="lg" />
                      <div>
                        <h4 className="font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                          {name}
                        </h4>
                        <p className="text-xs text-gray-400 truncate max-w-[150px]">{client.email}</p>
                      </div>
                    </div>
                    {getTierBadge(client.subscription_plan)}
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-2 gap-2 bg-[#0f241a] p-3 rounded-xl border border-[#1e4633] mb-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 block">Fitness Goal</span>
                      <span className="text-xs font-semibold text-emerald-300 truncate block mt-0.5">
                        {client.goal || "General Fitness"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-gray-500 block">BMI Score</span>
                      <span className="text-xs font-semibold text-white block mt-0.5">
                        {client.bmi ? `${client.bmi} kg/m²` : "Not logged"}
                      </span>
                    </div>
                  </div>

                  {/* Plan Status Row */}
                  <div className="space-y-1.5 mb-4">
                    <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-[#0f241a] rounded-lg border border-[#1e4633]">
                      <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                        <Dumbbell className="w-3.5 h-3.5 text-emerald-400" /> Workout Plan
                      </span>
                      <span className={client.has_workout_plan ? "text-emerald-400 font-semibold" : "text-gray-500 font-medium"}>
                        {client.has_workout_plan ? "Assigned ✅" : "Not Assigned ❌"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-[#0f241a] rounded-lg border border-[#1e4633]">
                      <span className="flex items-center gap-1.5 text-gray-300 font-medium">
                        <Utensils className="w-3.5 h-3.5 text-emerald-400" /> Diet Plan
                      </span>
                      <span className={client.has_diet_plan ? "text-emerald-400 font-semibold" : "text-gray-500 font-medium"}>
                        {client.has_diet_plan ? "Assigned ✅" : "Not Assigned ❌"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="flex items-center gap-2 pt-3 border-t border-[#23533d]">
                  <Button
                    variant="primary"
                    size="sm"
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs py-2 bg-emerald-600 hover:bg-emerald-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/trainer/clients/${client.client_id}`);
                    }}
                  >
                    View Profile <ArrowRight className="w-3.5 h-3.5" />
                  </Button>

                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        const res = await chatApi.startChatWithClient(client.client_id);
                        if (res) {
                          useChatStore.getState().setActiveConversation(res.id);
                          navigate('/trainer/chat');
                        }
                      } catch (error) {
                        toast.error("Failed to start chat.");
                      }
                    }}
                    title="Chat with Client"
                    className="p-2 rounded-lg bg-[#0f241a] border border-[#23533d] hover:border-emerald-500/50 text-emerald-400 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyClients;
